<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Cookie/session auth for the SPA only (Sanctum decides by Origin/Referer and
        // adds CSRF protection to those requests). Other callers get no session.
        $middleware->statefulApi();
        $middleware->prependToGroup('api', \App\Http\Middleware\SetLocale::class);

        // Behind SWAG / Cloudflare: honour X-Forwarded-* from private-network proxies.
        $proxies = env('TRUSTED_PROXIES', '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.1');
        $middleware->trustProxies(
            at: $proxies === '*' ? '*' : array_map('trim', explode(',', $proxies)),
            headers: Request::HEADER_X_FORWARDED_FOR
                | Request::HEADER_X_FORWARDED_HOST
                | Request::HEADER_X_FORWARDED_PORT
                | Request::HEADER_X_FORWARDED_PROTO,
        );

        $middleware->alias([
            'verified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
            'role' => \App\Http\Middleware\RequireRole::class,
            'active' => \App\Http\Middleware\EnsureUserIsActive::class,
            'impersonate' => \App\Http\Middleware\Impersonate::class,
            'forbid.impersonation.targets' => \App\Http\Middleware\ForbidImpersonationTargets::class,
            'request.log' => \App\Http\Middleware\RequestLogger::class,
        ]);

        $appEnv = $_ENV['APP_ENV'] ?? $_SERVER['APP_ENV'] ?? getenv('APP_ENV') ?: 'production';
        if ($appEnv === 'local') {
            $middleware->appendToGroup('api', \App\Http\Middleware\RequestLogger::class);
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API callers always get JSON errors.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );
    })
    ->create();
