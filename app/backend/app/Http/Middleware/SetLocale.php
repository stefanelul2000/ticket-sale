<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * API messages follow the UI language: X-Locale header (ro|en), else Accept-Language, else ro.
 */
class SetLocale
{
    private const SUPPORTED = ['ro', 'en'];

    public function handle(Request $request, Closure $next)
    {
        $locale = strtolower((string) $request->header('X-Locale'));
        if (! in_array($locale, self::SUPPORTED, true)) {
            $locale = $request->getPreferredLanguage(self::SUPPORTED) ?? config('app.locale', 'ro');
        }
        app()->setLocale(in_array($locale, self::SUPPORTED, true) ? $locale : 'ro');

        return $next($request);
    }
}
