<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** Swagger UI / API description are hidden unless API_DOCS_ENABLED=true. */
class ApiDocsEnabled
{
    public function handle(Request $request, Closure $next)
    {
        abort_unless((bool) config('app.api_docs'), 404);

        return $next($request);
    }
}
