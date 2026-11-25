<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\Request;

class ImpersonationController extends Controller
{
    public function me(Request $request)
    {
        $user = $request->user();
        $user->loadMissing('role');

        $originalRoleId = (int) ($request->attributes->get('original_role_id') ?? $user->role_id);
        $payload = $user->toArray();
        $payload['original_role_id'] = $originalRoleId;
        $payload['original_role'] = Role::find($originalRoleId)?->only(['id', 'name']);
        $payload['impersonating'] = (bool) $request->attributes->get('impersonating', false);

        return response()->json($payload);
    }

    public function start(Request $request)
    {
        $data = $request->validate([
            'role_id' => ['required', 'integer', 'exists:roles,id'],
        ]);

        $request->session()->put('impersonate_role_id', $data['role_id']);
        $this->logAdminAction($request->user()?->id, 'impersonate.start', ['role_id' => $data['role_id']]);

        return response()->json(['impersonating' => $data['role_id']]);
    }

    public function stop(Request $request)
    {
        if (! $request->session()->has('impersonate_role_id')) {
            return response()->json(['impersonating' => null]);
        }

        $roleId = $request->session()->pull('impersonate_role_id');
        $this->logAdminAction($request->user()?->id, 'impersonate.stop', ['role_id' => $roleId]);

        return response()->json(['impersonating' => null]);
    }
}
