<?php

use App\Http\Controllers\EventController;
use App\Http\Controllers\ImpersonationController;
use App\Http\Controllers\PrintTemplateController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SetupController;
use App\Http\Controllers\TicketActivityController;
use App\Http\Controllers\TicketRequestController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\TicketTypeController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
| Role levels: 1 Viewer (reports), 2 Door (check-in), 3 Volunteer (assigns invitations),
| 4 Event manager, 5 Admin, 6 Site owner.
| "role:N" = level N or higher; extra parameters are excluded levels ("role:2,3" = 2+ except volunteers).
*/

// ---------- Public (no login, no session/cookies: unaffected by staff login state) ----------
Route::middleware('throttle:public')
    ->withoutMiddleware([\Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class])
    ->prefix('public')
    ->group(function () {
    Route::get('/settings', [PublicController::class, 'settings']);
    Route::get('/events', [PublicController::class, 'events']);
    Route::get('/events/{slug}', [PublicController::class, 'event'])->where('slug', '[a-z0-9-]{1,190}');
    Route::get('/tickets/{code}', [PublicController::class, 'ticket'])->where('code', '[A-Za-z0-9_-]{1,32}');
    Route::post('/events/{slug}/requests', [TicketRequestController::class, 'store'])
        ->where('slug', '[a-z0-9-]{1,190}')
        ->middleware('throttle:ticket-requests');
});

// First-run setup (self-locking once an admin exists).
Route::get('/setup/status', [SetupController::class, 'status']);
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/setup', [SetupController::class, 'create']);
    Route::post('/setup/test-db', [SetupController::class, 'testDatabase']);
});

// ---------- Staff ----------
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

        Route::post('/impersonate', [ImpersonationController::class, 'start'])->middleware('forbid.impersonation.targets');

        Route::get('/settings', [SettingsController::class, 'show']);
        Route::put('/settings', [SettingsController::class, 'update']);
        Route::get('/settings/mail', [SettingsController::class, 'mailStatus']);
        Route::post('/settings/mail/test', [SettingsController::class, 'testMail'])->middleware('throttle:5,1');
        Route::post('/setup/migrate', [SetupController::class, 'migrate']);
        Route::delete('/ticket-activity', [TicketActivityController::class, 'destroy']);
    });

    // Event manager: events, ticket types, generation, guest lists, exports, releasing tickets
    Route::middleware('role:4')->group(function () {
        Route::get('/events', [EventController::class, 'index']);
        Route::post('/events', [EventController::class, 'store']);
        Route::get('/events/{eventId}', [EventController::class, 'show'])->whereNumber('eventId');
        Route::patch('/events/{eventId}', [EventController::class, 'update'])->whereNumber('eventId');
        Route::delete('/events/{eventId}', [EventController::class, 'destroy'])->whereNumber('eventId');
        Route::post('/events/{eventId}/duplicate', [EventController::class, 'duplicate'])->whereNumber('eventId');
        Route::get('/events/{event}/tickets', [TicketController::class, 'export'])->whereNumber('event');
        Route::post('/events/{eventId}/assign-list', [TicketController::class, 'assignList'])->whereNumber('eventId');
        Route::post('/events/{eventId}/template', [PrintTemplateController::class, 'upload'])->whereNumber('eventId');
        Route::put('/events/{eventId}/template', [PrintTemplateController::class, 'update'])->whereNumber('eventId');
        Route::delete('/events/{eventId}/template', [PrintTemplateController::class, 'destroy'])->whereNumber('eventId');
        Route::get('/events/{eventId}/requests', [TicketRequestController::class, 'index'])->whereNumber('eventId');
        Route::post('/requests/{requestId}/approve', [TicketRequestController::class, 'approve'])->whereNumber('requestId');
        Route::post('/requests/{requestId}/send', [TicketRequestController::class, 'send'])->whereNumber('requestId');
        Route::post('/requests/{requestId}/reject', [TicketRequestController::class, 'reject'])->whereNumber('requestId');
        Route::post('/requests/{requestId}/cancel', [TicketRequestController::class, 'cancel'])->whereNumber('requestId');

        Route::get('/ticket-types', [TicketTypeController::class, 'index']);
        Route::post('/ticket-types', [TicketTypeController::class, 'store']);
        Route::patch('/ticket-types/{ticketTypeId}', [TicketTypeController::class, 'update']);
        Route::delete('/ticket-types/{ticketTypeId}', [TicketTypeController::class, 'destroy']);

        Route::post('/tickets/generate', [TicketController::class, 'generate']);
        Route::post('/tickets/{ticketCode}/refund', [TicketController::class, 'refund']);

        Route::get('/reports/repeat-guests', [ReportController::class, 'repeatGuests']);
    });

    // Reports (aggregates only): every staff role
    Route::middleware('role:1')->group(function () {
        Route::get('/events/summary', [EventController::class, 'summary']);
        Route::get('/reports/overview', [ReportController::class, 'overview']);
        Route::get('/reports/events/{eventId}', [ReportController::class, 'event'])->whereNumber('eventId');
        Route::get('/stats', [TicketController::class, 'stats']);
    });

    // Guest lists and live activity (door staff, managers, admins — not volunteers)
    Route::middleware('role:2,3')->group(function () {
        Route::get('/tickets', [TicketController::class, 'index']);
        Route::get('/ticket-activity', [TicketActivityController::class, 'index']);
    });

    // Door: verify / check-in / walk-ins (door staff, managers, admins — not volunteers)
    Route::middleware('role:2,3')->group(function () {
        Route::get('/tickets/{ticketCode}/verify', [TicketController::class, 'verify']);
        Route::post('/tickets/{ticketCode}/checkin', [TicketController::class, 'checkin']);
        Route::post('/events/{eventId}/walk-in', [TicketController::class, 'walkIn'])->whereNumber('eventId');
    });

    // Assigning invitations (volunteers and up)
    Route::middleware('role:3')->group(function () {
        Route::post('/tickets/{ticketCode}/sell', [TicketController::class, 'sell']);
        Route::patch('/tickets/{ticketCode}', [TicketController::class, 'update']);
    });
});

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
