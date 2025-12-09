<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index()
    {
        return Role::with('permissions')->orderBy('id')->get();
    }

    public function updatePermissions(Request $request, int $roleId)
    {
        $data = $request->validate([
            'permission_ids' => ['array'],
            'permission_ids.*' => ['integer', 'exists:permissions,id'],
        ]);

        $role = Role::findOrFail($roleId);
        $role->permissions()->sync($data['permission_ids'] ?? []);

        return $role->load('permissions');
    }
}
