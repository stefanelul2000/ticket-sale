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
        $request->attributes->set('original_role_id', $user?->role_id);

        if (! $user || ! $request->hasSession()) {
            return $next($request);
        }

        $impersonateRoleId = (int) $request->session()->get('impersonate_role_id');
        if ($impersonateRoleId <= 0) {
            return $next($request);
        }

        $role = Role::find($impersonateRoleId);
        // Only roles strictly below the real role can be impersonated.
        if (! $role || $role->id >= $user->role_id) {
            $request->session()->forget('impersonate_role_id');

            return $next($request);
        }

        $user->setAttribute('role_id', $role->id);
        $user->setRelation('role', $role);
        // Never let the impersonated role be persisted by an accidental save().
        $user->syncOriginalAttribute('role_id');
        $request->attributes->set('impersonating', true);

        return $next($request);
    }
}
