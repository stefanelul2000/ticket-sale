<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['key' => 'manage.users', 'name' => 'Manage users', 'description' => 'Create and update users and roles'],
            ['key' => 'manage.roles', 'name' => 'Manage roles', 'description' => 'Edit roles and permissions'],
            ['key' => 'manage.events', 'name' => 'Manage events', 'description' => 'Create/update event settings'],
            ['key' => 'manage.ticket_types', 'name' => 'Manage ticket types', 'description' => 'Create/update ticket types'],
            ['key' => 'view.stats', 'name' => 'View stats', 'description' => 'Access ticket stats'],
            ['key' => 'view.reports', 'name' => 'View reports', 'description' => 'Access sales and analytics'],
        ];

        $keys = array_column($permissions, 'key');

        Permission::whereNotIn('key', $keys)->delete();

        foreach ($permissions as $perm) {
            Permission::updateOrCreate(['key' => $perm['key']], $perm);
        }
    }
}
