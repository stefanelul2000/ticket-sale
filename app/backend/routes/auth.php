<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use Illuminate\Support\Facades\Route;

// Staff accounts are created by admins; password resets are done by an admin (or
// `php artisan user:reset-password`). No email-based reset/verification flows are exposed.

Route::post('/register', [RegisteredUserController::class, 'store'])
    ->middleware(['guest', 'throttle:5,1'])
    ->name('register');

Route::post('/login', [AuthenticatedSessionController::class, 'store'])
    ->middleware(['guest', 'throttle:20,1'])
    ->name('login');

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');
