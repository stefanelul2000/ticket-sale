<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class RequireRole
{
    /**
     * Handle an incoming request.
     *
     * @param int $minRoleId minimum role_id required
     */
    public function handle(Request $request, Closure $next, int $minRoleId)
    {
        $user = $request->user();

        if (!$user || $user->role_id < $minRoleId) {
            throw new AccessDeniedHttpException('Insufficient role');
        }

        return $next($request);
    }
}
