<?php

namespace App\Http\Middleware;

use App\Models\Role;
use Closure;
use Illuminate\Http\Request;

class Impersonate
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        $impersonateRoleId = $request->session()->get('impersonate_role_id');

        if ($user && $impersonateRoleId) {
            $roleId = (int) $impersonateRoleId;
            $user->setAttribute('impersonating', true);
            $user->setAttribute('role_id', $roleId);
            if ($role = Role::find($roleId)) {
                $user->setRelation('role', $role);
            }
        }

        return $next($request);
    }
}
