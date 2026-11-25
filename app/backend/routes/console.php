<?php

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/*
| Emergency / provisioning commands, e.g.:
|   docker exec -it ticket-sale-app s6-setuidgid www-data php artisan user:create-owner admin admin@example.com "Admin Name"
|   docker exec -it ticket-sale-app s6-setuidgid www-data php artisan user:reset-password door1
*/

Artisan::command('user:create-owner {username} {email} {name}', function (string $username, string $email, string $name) {
    if (User::where('username', $username)->orWhere('email', $email)->exists()) {
        $this->error('A user with that username or email already exists.');

        return 1;
    }

    $password = Str::password(20, symbols: false);
    User::create([
        'name' => $name,
        'email' => $email,
        'username' => $username,
        'password' => Hash::make($password),
        'role_id' => 6,
        'active' => true,
        'revenue' => 0,
        'cookie' => Str::random(64),
    ]);

    $this->info("Site owner '{$username}' created.");
    $this->line("Password: {$password}");
    $this->warn('Change it after the first login (Admin → Users → Edit).');

    return 0;
})->purpose('Create a site owner account with a random password');

Artisan::command('user:reset-password {username}', function (string $username) {
    $user = User::where('username', $username)->first();
    if (! $user) {
        $this->error('User not found.');

        return 1;
    }

    $password = Str::password(16, symbols: false);
    $user->forceFill(['password' => Hash::make($password), 'active' => true])->save();

    $this->info("Password for '{$username}' reset and account activated.");
    $this->line("Password: {$password}");

    return 0;
})->purpose('Reset a user password (and re-activate the account)');
