<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        $roles = [
            ['id' => 1, 'name' => 'Viewer (Reports)'],
            ['id' => 2, 'name' => 'Check-in'],
            ['id' => 3, 'name' => 'Seller'],
            ['id' => 4, 'name' => 'Event Manager'],
            ['id' => 5, 'name' => 'Admin'],
            ['id' => 6, 'name' => 'Site Owner'],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(
                ['id' => $role['id']],
                ['name' => $role['name'], 'created_at' => $now, 'updated_at' => $now]
            );
        }

        $allPerms = Permission::pluck('id', 'key');
        $assignments = [
            1 => array_values(array_filter([$allPerms['view.reports'] ?? null])), // viewer -> reports only
            2 => array_values(array_filter([$allPerms['view.reports'] ?? null, $allPerms['view.stats'] ?? null])), // check-in -> reports/stats
            3 => array_values(array_filter([$allPerms['view.reports'] ?? null, $allPerms['view.stats'] ?? null])), // seller -> reports/stats
            4 => $allPerms->values()->all(), // event manager -> all perms (routes limit user/role mgmt)
            5 => $allPerms->values()->all(), // admin
            6 => $allPerms->values()->all(), // owner
        ];

        foreach ($assignments as $roleId => $permIds) {
            if ($role = Role::find($roleId)) {
                $role->permissions()->sync($permIds);
            }
        }
    }
}
