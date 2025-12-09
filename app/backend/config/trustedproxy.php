<?php

use Illuminate\Http\Request;

return [
    /*
    |--------------------------------------------------------------------------
    | Trusted Proxies
    |--------------------------------------------------------------------------
    |
    | Configure trusted proxies for the application so that Laravel can read
    | X-Forwarded-* headers (for scheme, host, port) provided by a load
    | balancer or reverse proxy. By default this reads the env var
    | TRUSTED_PROXIES which can be a comma separated list of addresses, or
    | a wildcard `*` to trust the calling address.
    |
    */

    'proxies' => env('TRUSTED_PROXIES', null),

    /*
    |--------------------------------------------------------------------------
    | Trusted Headers
    |--------------------------------------------------------------------------
    |
    | These headers will be accepted from the trusted proxy and used to
    | derive the request scheme, host, port, and forwarded prefix.
    |
    */
    'headers' => Request::HEADER_X_FORWARDED_FOR |
        Request::HEADER_X_FORWARDED_HOST |
        Request::HEADER_X_FORWARDED_PORT |
        Request::HEADER_X_FORWARDED_PROTO |
        Request::HEADER_X_FORWARDED_PREFIX |
        Request::HEADER_X_FORWARDED_AWS_ELB,
];
