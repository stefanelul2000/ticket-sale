<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            \Illuminate\Session\Middleware\StartSession::class,
        ]);

        $middleware->alias([
            'verified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
            'role' => \App\Http\Middleware\RequireRole::class,
            'impersonate' => \App\Http\Middleware\Impersonate::class,
            'forbid.impersonation.targets' => \App\Http\Middleware\ForbidImpersonationTargets::class,
            'request.log' => \App\Http\Middleware\RequestLogger::class,
        ]);

        $appEnv = $_ENV['APP_ENV'] ?? $_SERVER['APP_ENV'] ?? 'production';
        // Log requests in local/dev
        if ($appEnv === 'local') {
            $middleware->appendToGroup('api', \App\Http\Middleware\RequestLogger::class);
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->create();
