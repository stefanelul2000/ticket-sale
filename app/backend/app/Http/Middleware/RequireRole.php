<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class RequireRole
{
    /**
     * Usage: role:<min>[,<excluded>...] e.g. "role:2,3" = role 2 or higher, but not role 3 (seller).
     */
    public function handle(Request $request, Closure $next, string $minRoleId, string ...$excluded)
    {
        $user = $request->user();
        $roleId = (int) ($user?->role_id ?? 0);

        if (! $user || $roleId < (int) $minRoleId || in_array((string) $roleId, $excluded, true)) {
            throw new AccessDeniedHttpException(__('Your role is not allowed to do this.'));
        }

        return $next($request);
    }
}
