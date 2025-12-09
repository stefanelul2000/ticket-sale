<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class RequestLogger
{
    public function handle(Request $request, Closure $next)
    {
        // Only log verbose request info in local/dev
        if (! app()->isLocal()) {
            return $next($request);
        }

        $start = microtime(true);
        $response = $next($request);
        $duration = (microtime(true) - $start) * 1000;

        Log::channel('stack')->info('http_request', [
            'method' => $request->method(),
            'path' => $request->path(),
            'status' => $response->getStatusCode(),
            'ip' => $request->ip(),
            'duration_ms' => round($duration, 1),
            'user_id' => optional($request->user())->id,
        ]);

        return $response;
    }
}
