<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    title: 'Ciubi.NET Ticket API Documentation',
    description: 'API documentation for the Ciubi.NET Ticket application backend.'
)]
#[OA\Server(
    url: '/api',
    description: 'API Server'
)]
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
