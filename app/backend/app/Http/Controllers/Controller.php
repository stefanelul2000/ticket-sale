<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

abstract class Controller
{
    protected function logAdminAction(?int $userId, string $action, array $details = []): void
    {
        DB::table('admin_logs')->insert([
            'user_id' => $userId,
            'action' => $action,
            'details' => json_encode($details),
            'created_at' => now(),
        ]);
    }
}
