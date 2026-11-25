<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class SetupController extends Controller
{
    public function status()
    {
        [$adminExists, $dbError] = $this->adminState();

        if ($dbError) {
            return response()->json([
                'needsSetup' => ! $this->isSetupEnabled() ? false : true,
                'adminExists' => false,
                'dbError' => 'Database not reachable.',
                'setupDisabled' => ! $this->isSetupEnabled(),
            ], $this->isSetupEnabled() ? 200 : 503);
        }

        return response()->json([
            'needsSetup' => ! $adminExists,
            'adminExists' => $adminExists,
            'setupDisabled' => ! $this->isSetupEnabled(),
        ]);
    }

    public function create(Request $request)
    {
        $this->assertSetupOpen();

        $dbRequired = $this->isSetupEnabled();
        $dbRules = $dbRequired ? ['required', 'string'] : ['prohibited'];

        $data = $request->validate([
            'db_host' => $dbRules,
            'db_name' => $dbRules,
            'db_user' => $dbRules,
            'db_password' => $dbRequired ? ['nullable', 'string'] : ['prohibited'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'alpha_dash'],
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],
            'mail_mailer' => ['nullable', 'string', 'in:log,smtp,sendmail,array'],
            'mail_host' => ['nullable', 'string', 'max:255'],
            'mail_port' => ['nullable', 'numeric'],
            'mail_username' => ['nullable', 'string', 'max:255'],
            'mail_password' => ['nullable', 'string', 'max:255'],
            'mail_from_address' => ['nullable', 'email'],
            'mail_from_name' => ['nullable', 'string', 'max:255'],
            'branding_primary' => ['nullable', 'string', 'regex:'.BrandingController::COLOR_REGEX],
            'branding_secondary' => ['nullable', 'string', 'regex:'.BrandingController::COLOR_REGEX],
            'branding_background' => ['nullable', 'string', 'regex:'.BrandingController::COLOR_REGEX],
        ]);

        $lock = Cache::lock('setup:create', 60);
        if (! $lock->get()) {
            return response()->json(['message' => 'Setup is already running.'], 409);
        }

        try {
            if ($dbRequired) {
                $config = config('database.connections.mysql');
                $config['host'] = $data['db_host'];
                $config['database'] = $data['db_name'];
                $config['username'] = $data['db_user'];
                $config['password'] = $data['db_password'] ?? '';
                config(['database.connections.setup' => $config]);

                try {
                    DB::connection('setup')->getPdo();
                } catch (\Throwable $e) {
                    return response()->json([
                        'message' => 'Could not connect with provided database settings.',
                        'error' => $e->getMessage(),
                    ], 422);
                }

                DB::purge(config('database.default'));
                config(['database.default' => 'setup']);
                DB::setDefaultConnection('setup');
            }

            try {
                Artisan::call('migrate', ['--force' => true]);
                (new PermissionSeeder())->run();
                (new RoleSeeder())->run();
            } catch (\Throwable $e) {
                report($e);

                return response()->json([
                    'message' => 'Database migrations failed during setup.',
                    'error' => $e->getMessage(),
                ], 500);
            }

            // Re-check under the lock: another request may have finished setup meanwhile.
            if (User::where('role_id', '>=', 5)->exists()) {
                throw new AccessDeniedHttpException('Setup already completed.');
            }

            if (User::where('username', $data['username'])->orWhere('email', $data['email'])->exists()) {
                return response()->json([
                    'message' => 'Username or email already exists in this database.',
                    'errors' => ['username' => ['Username or email already exists.']],
                ], 422);
            }

            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'username' => $data['username'],
                'password' => Hash::make($data['password']),
                'role_id' => 6,
                'active' => true,
                'revenue' => 0,
                'cookie' => Str::random(64),
            ]);

            $env = [
                'MAIL_MAILER' => $data['mail_mailer'] ?? 'log',
                'MAIL_HOST' => $data['mail_host'] ?? '',
                'MAIL_PORT' => $data['mail_port'] ?? '',
                'MAIL_USERNAME' => $data['mail_username'] ?? '',
                'MAIL_PASSWORD' => $data['mail_password'] ?? '',
                'MAIL_FROM_ADDRESS' => $data['mail_from_address'] ?? '',
                'MAIL_FROM_NAME' => $data['mail_from_name'] ?? $data['name'],
                'SETUP_ENABLED' => 'false',
            ];
            if ($dbRequired) {
                $env += [
                    'DB_HOST' => $data['db_host'],
                    'DB_DATABASE' => $data['db_name'],
                    'DB_USERNAME' => $data['db_user'],
                    'DB_PASSWORD' => $data['db_password'] ?? '',
                ];
            }
            $this->writeEnv($env);

            $brandingInput = array_filter([
                'primary' => $data['branding_primary'] ?? null,
                'secondary' => $data['branding_secondary'] ?? null,
                'background' => $data['branding_background'] ?? null,
            ]);
            if ($brandingInput) {
                BrandingController::merge($brandingInput);
            }

            $this->logAdminAction($user->id, 'setup.completed', ['username' => $user->username]);

            // Sign the new owner in (SPA session) so the wizard can continue (e.g. logo upload).
            if ($request->hasSession()) {
                Auth::guard('web')->login($user);
                $request->session()->regenerate();
            }

            return response()->json(['created' => true, 'user' => $user]);
        } finally {
            $lock->release();
        }
    }

    public function migrate()
    {
        try {
            DB::connection()->getPdo();
            Artisan::call('migrate', ['--force' => true]);

            return response()->json(['migrated' => true, 'output' => Artisan::output()]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'migrated' => false,
                'message' => 'Migration failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function testDatabase(Request $request)
    {
        // Only meaningful while the wizard is collecting DB credentials.
        $this->assertSetupOpen();
        if (! $this->isSetupEnabled()) {
            throw new AccessDeniedHttpException('Database settings come from the environment.');
        }

        $data = $request->validate([
            'db_host' => ['required', 'string'],
            'db_name' => ['required', 'string'],
            'db_user' => ['required', 'string'],
            'db_password' => ['nullable', 'string'],
        ]);

        $config = config('database.connections.mysql');
        $config['host'] = $data['db_host'];
        $config['database'] = $data['db_name'];
        $config['username'] = $data['db_user'];
        $config['password'] = $data['db_password'] ?? '';
        config(['database.connections.setup' => $config]);

        try {
            DB::connection('setup')->getPdo();
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'message' => 'Could not connect with provided database settings.',
                'error' => $e->getMessage(),
            ], 422);
        }

        return response()->json(['ok' => true]);
    }

    public function uploadLogo(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user && (int) $user->role_id >= 5;

        if (! $isAdmin) {
            // Anonymous upload is only possible while setup is genuinely open.
            $this->assertSetupOpen();
        }

        $request->validate([
            'logo' => ['required', 'file', 'mimes:png,jpg,jpeg,webp,gif', 'max:2048'],
        ]);

        $file = $request->file('logo');
        $extension = $file->guessExtension() ?: 'png';
        $name = 'logo_'.Str::lower(Str::random(16)).'.'.$extension;
        $path = $file->storeAs('logos', $name, ['disk' => 'public']);

        // Relative URL: works behind any host/proxy.
        $url = '/storage/'.ltrim($path, '/');

        try {
            @copy(Storage::disk('public')->path($path), public_path('favicon.png'));
        } catch (\Throwable $e) {
            // favicon is best effort
        }

        $branding = BrandingController::merge(['logoUrl' => $url]);
        if ($user) {
            $this->logAdminAction($user->id, 'branding.logo', ['url' => $url]);
        }

        return response()->json(['url' => $url, 'branding' => $branding], 201);
    }

    private function isSetupEnabled(): bool
    {
        return (bool) config('app.setup_enabled', true);
    }

    /**
     * Setup is open only when we positively know no admin exists.
     * A database error is NOT treated as "no admin" unless the wizard is collecting DB credentials.
     */
    private function assertSetupOpen(): void
    {
        [$adminExists, $dbError] = $this->adminState();

        if ($adminExists) {
            throw new AccessDeniedHttpException('Setup already completed.');
        }

        if ($dbError && ! $this->isSetupEnabled()) {
            abort(503, 'Database not reachable.');
        }
    }

    private function adminState(): array
    {
        try {
            return [User::where('role_id', '>=', 5)->exists(), null];
        } catch (\Throwable $e) {
            return [false, $e->getMessage()];
        }
    }

    private function writeEnv(array $pairs): void
    {
        $path = base_path('.env');
        $target = is_link($path) ? (readlink($path) ?: $path) : $path;

        if (! (file_exists($target) ? is_writable($target) : is_writable(dirname($target)))) {
            report(new \RuntimeException('Cannot write .env; settings were applied for this session only.'));

            return;
        }

        $env = file_exists($target) ? file_get_contents($target) : '';
        foreach ($pairs as $key => $value) {
            $line = $key.'='.self::formatEnvValue((string) $value);
            $pattern = '/^'.preg_quote($key, '/').'=.*$/m';
            if (preg_match($pattern, $env)) {
                $env = preg_replace_callback($pattern, fn () => $line, $env);
            } else {
                $env = rtrim($env, "\n").PHP_EOL.$line.PHP_EOL;
            }
        }
        file_put_contents($target, $env, LOCK_EX);
        @chmod($target, 0640);

        $store = config('app.env_store_path');
        if ($store && realpath($store) !== realpath($target)) {
            if (! is_dir(dirname($store))) {
                @mkdir(dirname($store), 0750, true);
            }
            @copy($target, $store);
        }
    }

    private static function formatEnvValue(string $value): string
    {
        if ($value === '') {
            return '""';
        }
        // phpdotenv: double-quoted values expand ${VAR}; escape \, " and $.
        $escaped = str_replace(['\\', '"', '$'], ['\\\\', '\\"', '\\$'], $value);

        return "\"{$escaped}\"";
    }
}
