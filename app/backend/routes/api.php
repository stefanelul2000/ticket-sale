<?php

use App\Http\Controllers\EventController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SetupController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\TicketTypeController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\BrandingController;
use App\Http\Controllers\TicketActivityController;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/setup/status', [SetupController::class, 'status']);
Route::post('/setup', [SetupController::class, 'create']);
Route::post('/setup/logo', [SetupController::class, 'uploadLogo']);
Route::post('/setup/migrate', [SetupController::class, 'migrate']);
Route::post('/setup/test-db', [SetupController::class, 'testDatabase']);

Route::middleware(['auth:sanctum', 'impersonate'])->group(function () {
    Route::get('/me', function (Request $request) {
        $user = $request->user();
        if (! $user) {
            return null;
        }

        $user->loadMissing('role');
        $user->setAttribute('original_role_id', $user->role_id);
        if ($user->relationLoaded('role')) {
            $user->setRelation('original_role', $user->role);
        }

        $impersonatedRoleId = $request->session()->get('impersonate_role_id');
        if ($impersonatedRoleId) {
            $role = Role::find($impersonatedRoleId);
            if ($role) {
                $user->setAttribute('impersonating', true);
                $user->setAttribute('role_id', $role->id);
                $user->setRelation('role', $role);
            }
        }

        return $user;
    });

    // Roles and users (admin / owner only)
    Route::middleware('role:5')->group(function () {
        Route::get('/roles', [UserController::class, 'roles']);
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::patch('/users/{userId}', [UserController::class, 'update']);
        Route::patch('/users/{userId}/role', [UserController::class, 'updateRole']);
        Route::patch('/users/{userId}/status', [UserController::class, 'updateStatus']);
        Route::delete('/users/{userId}', [UserController::class, 'destroy']);

        // fine-grained permissions
        Route::get('/permissions', [PermissionController::class, 'index']);
        Route::get('/roles/with-permissions', [RoleController::class, 'index']);
        Route::post('/roles/{roleId}/permissions', [RoleController::class, 'updatePermissions']);

        // impersonation (admin only to start)
        Route::post('/impersonate', function (Request $request) {
            $data = $request->validate([
                'role_id' => ['required', 'integer', 'exists:roles,id'],
            ]);
            $request->session()->put('impersonate_role_id', $data['role_id']);
            \Illuminate\Support\Facades\DB::table('admin_logs')->insert([
                'user_id' => $request->user()?->id,
                'action' => 'impersonate.start',
                'details' => json_encode(['role_id' => $data['role_id']]),
                'created_at' => now(),
            ]);
            return response()->json(['impersonating' => $data['role_id']]);
        })->middleware('forbid.impersonation.targets');

        Route::post('/branding', [BrandingController::class, 'update']);
    });

    // Event manager (role >=4) can manage events, ticket types, and ticket generation/export
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
        Route::post('/tickets/{ticketNumber}/refund', [TicketController::class, 'refund']);
    });

    // Ticket flows
    Route::middleware('role:2')->group(function () {
        Route::get('/events/summary', [EventController::class, 'summary']);
        Route::get('/tickets', [TicketController::class, 'index']);
        Route::get('/tickets/{ticketNumber}/verify', [TicketController::class, 'verify']);
        Route::post('/tickets/{ticketNumber}/checkin', [TicketController::class, 'checkin']);
        Route::get('/ticket-activity', [TicketActivityController::class, 'index']);
        Route::delete('/ticket-activity', [TicketActivityController::class, 'destroy']);
    });

    Route::middleware('role:3')->group(function () {
        // Sellers can sell; they are blocked from verify/check-in by role:2 gate above
        Route::post('/tickets/{ticketNumber}/sell', [TicketController::class, 'sell']);
    });

    // Stats visible from check-in and up
    Route::middleware('role:2')->group(function () {
        Route::get('/stats', [TicketController::class, 'stats']);
    });

    // Stop impersonation: allow any authenticated user who is currently impersonating to stop, regardless of impersonated role.
    Route::delete('/impersonate', function (Request $request) {
        if (! $request->session()->has('impersonate_role_id')) {
            return response()->json(['impersonating' => null]);
        }
        $roleId = $request->session()->pull('impersonate_role_id');
        \Illuminate\Support\Facades\DB::table('admin_logs')->insert([
            'user_id' => $request->user()?->id,
            'action' => 'impersonate.stop',
            'details' => json_encode(['role_id' => $roleId]),
            'created_at' => now(),
        ]);
        return response()->json(['impersonating' => null]);
    });
});

// Public branding (shared across all users)
Route::get('/branding', [BrandingController::class, 'show']);

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now(),
    ]);
});

require __DIR__.'/auth.php';
