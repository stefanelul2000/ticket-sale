<?php

use App\Http\Controllers\BrandingController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ImpersonationController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SetupController;
use App\Http\Controllers\TicketActivityController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\TicketTypeController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
| Role levels: 1 Viewer, 2 Check-in, 3 Seller, 4 Event manager, 5 Admin, 6 Site owner.
| "role:N" = level N or higher; extra parameters are excluded levels ("role:2,3" = 2+ except sellers).
*/

// First-run setup (self-locking once an admin exists).
Route::get('/setup/status', [SetupController::class, 'status']);
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/setup', [SetupController::class, 'create']);
    Route::post('/setup/logo', [SetupController::class, 'uploadLogo']);
    Route::post('/setup/test-db', [SetupController::class, 'testDatabase']);
});

Route::middleware(['auth:sanctum', 'active', 'impersonate'])->group(function () {
    Route::get('/me', [ImpersonationController::class, 'me']);
    Route::delete('/impersonate', [ImpersonationController::class, 'stop']);

    // Admin / site owner
    Route::middleware('role:5')->group(function () {
        Route::get('/roles', [UserController::class, 'roles']);
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::patch('/users/{userId}', [UserController::class, 'update']);
        Route::patch('/users/{userId}/role', [UserController::class, 'updateRole']);
        Route::patch('/users/{userId}/status', [UserController::class, 'updateStatus']);
        Route::delete('/users/{userId}', [UserController::class, 'destroy']);

        Route::get('/permissions', [PermissionController::class, 'index']);
        Route::get('/roles/with-permissions', [RoleController::class, 'index']);
        Route::post('/roles/{roleId}/permissions', [RoleController::class, 'updatePermissions']);

        Route::post('/impersonate', [ImpersonationController::class, 'start'])->middleware('forbid.impersonation.targets');

        Route::post('/branding', [BrandingController::class, 'update']);
        Route::post('/branding/logo', [SetupController::class, 'uploadLogo']);
        Route::post('/setup/migrate', [SetupController::class, 'migrate']);
        Route::delete('/ticket-activity', [TicketActivityController::class, 'destroy']);
    });

    // Event manager: events, ticket types, generation/export, refunds
    Route::middleware('role:4')->group(function () {
        Route::get('/events', [EventController::class, 'index']);
        Route::post('/events', [EventController::class, 'store']);
        Route::patch('/events/{eventId}', [EventController::class, 'update']);
        Route::delete('/events/{eventId}', [EventController::class, 'destroy']);
        Route::get('/events/{event}/tickets', [TicketController::class, 'export']);

        Route::get('/ticket-types', [TicketTypeController::class, 'index']);
        Route::post('/ticket-types', [TicketTypeController::class, 'store']);
        Route::patch('/ticket-types/{ticketTypeId}', [TicketTypeController::class, 'update']);
        Route::delete('/ticket-types/{ticketTypeId}', [TicketTypeController::class, 'destroy']);

        Route::post('/tickets/generate', [TicketController::class, 'generate']);
        Route::post('/tickets/{ticketCode}/refund', [TicketController::class, 'refund']);
    });

    // Reporting (check-in staff and up)
    Route::middleware('role:2')->group(function () {
        Route::get('/events/summary', [EventController::class, 'summary']);
        Route::get('/tickets', [TicketController::class, 'index']);
        Route::get('/stats', [TicketController::class, 'stats']);
        Route::get('/ticket-activity', [TicketActivityController::class, 'index']);
    });

    // Door: verify / check-in (check-in staff, managers, admins — not sellers)
    Route::middleware('role:2,3')->group(function () {
        Route::get('/tickets/{ticketCode}/verify', [TicketController::class, 'verify']);
        Route::post('/tickets/{ticketCode}/checkin', [TicketController::class, 'checkin']);
    });

    // Sales (sellers and up)
    Route::middleware('role:3')->group(function () {
        Route::post('/tickets/{ticketCode}/sell', [TicketController::class, 'sell']);
    });
});

// Public branding (shared across all users)
Route::get('/branding', [BrandingController::class, 'show']);

Route::get('/health', function () {
    try {
        DB::connection()->getPdo();
        $db = 'ok';
    } catch (\Throwable $e) {
        $db = 'unreachable';
    }

    return response()->json([
        'status' => $db === 'ok' ? 'ok' : 'degraded',
        'database' => $db,
        'timestamp' => now(),
    ], $db === 'ok' ? 200 : 503);
});

require __DIR__.'/auth.php';
