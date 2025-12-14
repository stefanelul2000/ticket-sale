<?php

use Illuminate\Support\Facades\Route;

Route::get('/{any}', function () {
    $indexPath = public_path('index.html');
    abort_if(! file_exists($indexPath), 404, 'SPA build not found');
    return response()->file($indexPath);
})->where('any', '.*');

require __DIR__.'/auth.php';
