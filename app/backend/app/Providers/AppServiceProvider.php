<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
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

        Mail::extend('microsoft-graph', function (array $config) {
            foreach (['tenant_id', 'client_id', 'sender'] as $key) {
                if (empty($config[$key])) {
                    throw new \RuntimeException("Microsoft Graph mailer: missing {$key}");
                }
            }
            $useCert = ! empty($config['cert_path']) && ! empty($config['key_path']);
            if (! $useCert && empty($config['client_secret'])) {
                throw new \RuntimeException('Microsoft Graph mailer: configure a certificate (cert_path + key_path) or a client secret');
            }

            return new \App\Mail\MicrosoftGraphTransport(
                $config['tenant_id'],
                $config['client_id'],
                $config['client_secret'] ?? null,
                $config['sender'],
                $useCert ? $config['cert_path'] : null,
                $useCert ? $config['key_path'] : null,
            );
        });

        // Public ticket requests: few per person, keyed by IP (anti-spam with a honeypot).
        RateLimiter::for('ticket-requests', fn (Request $request) => [
            Limit::perHour(10)->by('req:'.$request->ip()),
            Limit::perDay(300)->by('req-global'),
        ]);

        // Public pages: guests on one venue Wi-Fi share an IP, so keep it generous.
        // Enumerating codes is infeasible anyway (30^10 combinations).
        RateLimiter::for('public', fn (Request $request) => Limit::perMinute(300)->by($request->ip()));
    }
}
