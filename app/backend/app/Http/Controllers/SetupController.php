<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class SetupController extends Controller
{
    public function status()
    {
        $adminExists = User::where('role_id', '>=', 5)->exists();
        if ($adminExists) {
            abort(404);
        }

        return response()->json([
            'needsSetup' => true,
            'adminExists' => false,
        ]);
    }

    public function create(Request $request)
    {
        $adminExists = User::where('role_id', '>=', 5)->exists();
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
            ['key' => 'manage.products', 'name' => 'Manage products', 'description' => 'Create/update add-ons and products'],
            ['key' => 'manage.promos', 'name' => 'Manage promo codes', 'description' => 'Create/update promo codes and access locks'],
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

        $this->writeEnv([
            'DB_HOST' => $data['db_host'],
            'DB_DATABASE' => $data['db_name'],
            'DB_USERNAME' => $data['db_user'],
            'DB_PASSWORD' => $data['db_password'],
            'MAIL_MAILER' => $data['mail_mailer'] ?? 'log',
            'MAIL_HOST' => $data['mail_host'] ?? '',
            'MAIL_PORT' => $data['mail_port'] ?? '',
            'MAIL_USERNAME' => $data['mail_username'] ?? '',
            'MAIL_PASSWORD' => $data['mail_password'] ?? '',
            'MAIL_FROM_ADDRESS' => $data['mail_from_address'] ?? '',
            'MAIL_FROM_NAME' => $data['mail_from_name'] ?? $data['name'],
        ]);

        return response()->json(['created' => true, 'user' => $user]);
    }

    public function migrate(Request $request)
    {
        // Allow only when an admin exists (setup completed) OR when explicitly requested right after setup.
        $adminExists = User::where('role_id', '>=', 5)->exists();
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

    public function uploadLogo(Request $request)
    {
        $adminExists = User::where('role_id', 5)->exists();
        if ($adminExists) {
            $user = $request->user();
            if (! $user || $user->role_id !== 5) {
                throw new AccessDeniedHttpException('Only admin can upload logo after setup.');
            }
        }

        $request->validate([
            'logo' => ['required', 'image', 'max:2048'],
        ]);

        $file = $request->file('logo');
        $dir = public_path('uploads/logos');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $name = uniqid('logo_', true) . '.' . $file->getClientOriginalExtension();
        $file->move($dir, $name);
        $url = url('uploads/logos/' . $name);

        return response()->json(['url' => $url]);
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
            $line = $key . '=' . $value;
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
    }
}
