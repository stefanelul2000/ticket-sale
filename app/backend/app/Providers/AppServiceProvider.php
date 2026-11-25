<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->isLocal()) {
            DB::listen(function ($query) {
                Log::channel('stack')->debug('sql', [
                    'sql' => $query->sql,
                    'bindings' => $query->bindings,
                    'time_ms' => $query->time,
                ]);
            });
        }

        // Public pages: guests on one venue Wi-Fi share an IP, so keep it generous.
        // Enumerating codes is infeasible anyway (30^10 combinations).
        RateLimiter::for('public', fn (Request $request) => Limit::perMinute(300)->by($request->ip()));
    }
}
