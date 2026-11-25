<?php

use Illuminate\Support\Facades\Route;

// SPA shell: every non-API GET serves the built frontend.
$spa = function () {
    $indexPath = public_path('index.html');
    abort_if(! file_exists($indexPath), 404, 'SPA build not found');

    return response()->file($indexPath, [
        'Cache-Control' => 'no-cache, no-store, must-revalidate',
    ]);
};

Route::get('/', $spa);
Route::get('/{any}', $spa)->where('any', '(?!api(/|$)|storage/|assets/).*');
