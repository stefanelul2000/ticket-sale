<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class SetupController extends Controller
{
    public function status()
    {
        if (! $this->isSetupEnabled()) {
            try {
                $adminExists = User::where('role_id', '>=', 5)->exists();
            } catch (\Throwable $e) {
                $adminExists = true;
            }

            return response()->json([
                'needsSetup' => false,
                'adminExists' => $adminExists,
            ]);
        }

        try {
            $adminExists = User::where('role_id', '>=', 5)->exists();
            return response()->json([
                'needsSetup' => ! $adminExists,
                'adminExists' => $adminExists,
            ]);
        } catch (\Throwable $e) {
            // If DB is not configured or unreachable, still surface setup.
            return response()->json([
                'needsSetup' => true,
                'adminExists' => false,
                'dbError' => 'Database not reachable yet; setup required.',
            ]);
        }
    }

    public function create(Request $request)
    {
        if (! $this->isSetupEnabled()) {
            throw new AccessDeniedHttpException('Setup is disabled.');
        }

        $adminExists = false;
        try {
            $adminExists = User::where('role_id', '>=', 5)->exists();
        } catch (\Throwable $e) {
            $adminExists = false;
        }
        if ($adminExists) {
            throw new AccessDeniedHttpException('Setup already completed.');
        }

        $data = $request->validate([
            'db_host' => ['required', 'string'],
            'db_name' => ['required', 'string'],
            'db_user' => ['required', 'string'],
            'db_password' => ['required', 'string'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],
            'mail_mailer' => ['nullable', 'string'],
            'mail_host' => ['nullable', 'string'],
            'mail_port' => ['nullable', 'numeric'],
            'mail_username' => ['nullable', 'string'],
            'mail_password' => ['nullable', 'string'],
            'mail_from_address' => ['nullable', 'email'],
            'mail_from_name' => ['nullable', 'string'],
        ]);

        $config = config('database.connections.mysql');
        $config['host'] = $data['db_host'];
        $config['database'] = $data['db_name'];
        $config['username'] = $data['db_user'];
        $config['password'] = $data['db_password'];

        config(['database.connections.setup' => $config]);
        try {
            DB::connection('setup')->getPdo();
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Could not connect with provided database settings.',
                'error' => $e->getMessage(),
            ], 422);
        }

        config(['database.default' => 'setup']);
        DB::purge('mysql');
        DB::setDefaultConnection('setup');

        try {
            Artisan::call('migrate', ['--force' => true]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Database migrations failed during setup.',
                'error' => $e->getMessage(),
            ], 500);
        }

        $roles = [
            ['id' => 1, 'name' => 'Viewer (Reports)'],
            ['id' => 2, 'name' => 'Check-in'],
            ['id' => 3, 'name' => 'Seller'],
            ['id' => 4, 'name' => 'Manager'],
            ['id' => 5, 'name' => 'Admin'],
            ['id' => 6, 'name' => 'Site Owner'],
        ];
        foreach ($roles as $role) {
            Role::updateOrCreate(['id' => $role['id']], ['name' => $role['name']]);
        }

        $permissions = [
            ['key' => 'manage.users', 'name' => 'Manage users', 'description' => 'Create and update users and roles'],
            ['key' => 'manage.roles', 'name' => 'Manage roles', 'description' => 'Edit roles and permissions'],
            ['key' => 'manage.events', 'name' => 'Manage events', 'description' => 'Create/update event settings'],
            ['key' => 'manage.ticket_types', 'name' => 'Manage ticket types', 'description' => 'Create/update ticket types'],
            ['key' => 'view.stats', 'name' => 'View stats', 'description' => 'Access ticket stats'],
            ['key' => 'view.reports', 'name' => 'View reports', 'description' => 'Access sales and analytics'],
        ];
        foreach ($permissions as $perm) {
            Permission::updateOrCreate(['key' => $perm['key']], $perm);
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'username' => $data['username'],
            'password' => Hash::make($data['password']),
            'role_id' => 6,
            'revenue' => 0,
            'cookie' => Str::random(64),
        ]);

        $allPerms = Permission::pluck('id')->toArray();
        if ($ownerRole = Role::find(6)) {
            $ownerRole->permissions()->sync($allPerms);
        }
        if ($adminRole = Role::find(5)) {
            $adminRole->permissions()->sync($allPerms);
        }

        $appUrl = rtrim($request->getSchemeAndHttpHost(), '/');
        $this->writeEnv([
            'DB_HOST' => $data['db_host'],
            'DB_DATABASE' => $data['db_name'],
            'DB_USERNAME' => $data['db_user'],
            'DB_PASSWORD' => $data['db_password'],
            'APP_URL' => $appUrl,
            'FRONTEND_URL' => $appUrl,
            'MAIL_MAILER' => $data['mail_mailer'] ?? 'log',
            'MAIL_HOST' => $data['mail_host'] ?? '',
            'MAIL_PORT' => $data['mail_port'] ?? '',
            'MAIL_USERNAME' => $data['mail_username'] ?? '',
            'MAIL_PASSWORD' => $data['mail_password'] ?? '',
            'MAIL_FROM_ADDRESS' => $data['mail_from_address'] ?? '',
            'MAIL_FROM_NAME' => $data['mail_from_name'] ?? $data['name'],
            'SETUP_ENABLED' => 'false',
        ]);

        return response()->json(['created' => true, 'user' => $user]);
    }

    public function migrate(Request $request)
    {
        $adminExists = false;
        try {
            $adminExists = User::where('role_id', '>=', 5)->exists();
        } catch (\Throwable $e) {
            $adminExists = false;
        }
        if (! $adminExists) {
            throw new AccessDeniedHttpException('Setup not completed.');
        }

        try {
            // Ensure current connection works before migrating.
            DB::connection()->getPdo();
            Artisan::call('migrate', ['--force' => true]);
            Artisan::call('db:seed', ['--force' => true]);
            return response()->json(['migrated' => true]);
        } catch (\Throwable $e) {
            return response()->json([
                'migrated' => false,
                'message' => 'Migration failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function testDatabase(Request $request)
    {
        if (! $this->isSetupEnabled()) {
            throw new AccessDeniedHttpException('Setup is disabled.');
        }

        $data = $request->validate([
            'db_host' => ['required', 'string'],
            'db_name' => ['required', 'string'],
            'db_user' => ['required', 'string'],
            'db_password' => ['required', 'string'],
        ]);

        // Build a temporary connection config
        $config = config('database.connections.mysql');
        $config['host'] = $data['db_host'];
        $config['database'] = $data['db_name'];
        $config['username'] = $data['db_user'];
        $config['password'] = $data['db_password'];

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

        $previous = DB::getDefaultConnection();
        DB::setDefaultConnection('setup');
        DB::purge($previous);

        try {
            Artisan::call('migrate', ['--force' => true]);
        } catch (\Throwable $e) {
            DB::setDefaultConnection($previous);
            return response()->json([
                'ok' => false,
                'message' => 'Connection OK but migrations failed.',
                'error' => $e->getMessage(),
            ], 500);
        }

        DB::setDefaultConnection($previous);

        return response()->json(['ok' => true, 'migrated' => true]);
    }

    public function uploadLogo(Request $request)
    {
        $adminExists = false;
        try {
            $adminExists = User::where('role_id', '>=', 5)->exists();
        } catch (\Throwable $e) {
            $adminExists = false;
        }
        if ($adminExists) {
            $user = $request->user();
            if (! $user || $user->role_id < 5) {
                throw new AccessDeniedHttpException('Only admin can upload logo after setup.');
            }
        }

        $request->validate([
            'logo' => ['required', 'image', 'max:2048'],
        ]);

        $file = $request->file('logo');
        $name = uniqid('logo_', true) . '.' . $file->getClientOriginalExtension();

        $path = $file->storeAs('logos', $name, ['disk' => 'public']);
        $relative = 'storage/' . ltrim($path, '/');
        $host = $request->getSchemeAndHttpHost() ?: config('app.url');
        $url = rtrim($host, '/') . '/' . ltrim($relative, '/');

        try {
            $source = Storage::disk('public')->path($path);
            @copy($source, public_path('favicon.png'));
        } catch (\Throwable $e) {
        }

        Setting::updateOrCreate(
            ['key' => 'branding'],
            ['value' => ['logoUrl' => $url]]
        );

        return response()->json(['url' => $url], 201);
    }

    private function isSetupEnabled(): bool
    {
        $value = strtolower((string) env('SETUP_ENABLED', 'true'));

        return in_array($value, ['1', 'true', 'yes', 'on'], true);
    }

    private function writeEnv(array $pairs): void
    {
        $path = base_path('.env');
        $dir = dirname($path);

        $fileExists = file_exists($path);
        $canWriteFile = $fileExists && is_writable($path);
        $canCreateFile = ! $fileExists && is_writable($dir);

        if (! $canWriteFile && ! $canCreateFile) {
            throw new UnprocessableEntityHttpException('Cannot write .env. Please update DB settings manually.');
        }

        $env = file_exists($path) ? file_get_contents($path) : '';
        foreach ($pairs as $key => $value) {
            $pattern = "/^{$key}=.*$/m";
            $line = $key . '=' . self::formatEnvValue((string) $value);
            if (preg_match($pattern, $env)) {
                $env = preg_replace($pattern, $line, $env);
            } else {
                $env .= PHP_EOL . $line;
            }
        }
        file_put_contents($path, $env, LOCK_EX);

        // Best-effort lock-down after writing.
        @chmod($path, 0640);
        @chown($path, 'www-data');

        // Copy to external env store if configured (for container persistence)
        $store = env('ENV_STORE_PATH', '/config/app.env');
        if ($store) {
            if (! is_dir(dirname($store))) {
                @mkdir(dirname($store), 0755, true);
            }
            @copy($path, $store);
        }
    }

    private static function formatEnvValue(string $value): string
    {
        $escaped = str_replace(['\\', '"'], ['\\\\', '\\"'], $value);
        if ($escaped === '') {
            return '""';
        }
        return "\"{$escaped}\"";
    }
}
