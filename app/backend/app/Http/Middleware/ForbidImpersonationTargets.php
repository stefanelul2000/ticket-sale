<?php

namespace App\Http\Middleware;

use App\Models\Role;
use Closure;
use Illuminate\Http\Request;

class ForbidImpersonationTargets
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        $targetId = $request->input('role_id');
        $target = $targetId ? Role::find($targetId) : null;

        // Must be logged in and admin/site-owner to impersonate
        if (! $user || $user->role_id < 5) {
            abort(403, 'Not allowed to impersonate.');
        }

        // Must target an existing role strictly below current
        if (! $target || $target->id >= $user->role_id) {
            abort(403, 'Cannot impersonate this role.');
        }

        return $next($request);
    }
}
