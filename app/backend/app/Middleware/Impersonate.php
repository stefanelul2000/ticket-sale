<?php

namespace App\Middleware;

use Closure;
use Illuminate\Http\Request;

class Impersonate
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        $impersonateRoleId = $request->session()->get('impersonate_role_id');

        if ($user && $impersonateRoleId) {
            $user->setAttribute('impersonating', true);
            $user->setAttribute('role_id', (int) $impersonateRoleId);
        }

        return $next($request);
    }
}
