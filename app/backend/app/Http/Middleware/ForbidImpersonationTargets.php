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
        $realRoleId = (int) ($request->attributes->get('original_role_id') ?? $user?->role_id ?? 0);
        $targetId = (int) $request->input('role_id');
        $target = $targetId ? Role::find($targetId) : null;

        if (! $user || $realRoleId < 5) {
            abort(403, 'Not allowed to impersonate.');
        }

        if (! $target || $target->id >= $realRoleId) {
            abort(403, 'Cannot impersonate this role.');
        }

        return $next($request);
    }
}
