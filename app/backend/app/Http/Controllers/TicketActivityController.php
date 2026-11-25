<?php

namespace App\Http\Controllers;

use App\Models\TicketActivityLog;
use Illuminate\Http\Request;

class TicketActivityController extends Controller
{
    public function index(Request $request)
    {
        $limit = max(1, min(200, (int) $request->get('limit', 50)));

        $logs = TicketActivityLog::with('user:id,name,username')
            ->when($request->filled('event_id'), fn ($q) => $q->where('event_id', $request->integer('event_id')))
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(function (TicketActivityLog $log) {
                return [
                    'id' => $log->id,
                    'event_id' => $log->event_id,
                    'ticket_code' => $log->ticket_code,
                    'action' => $log->action,
                    'status' => $log->status,
                    'success' => $log->success,
                    'name' => $log->attendee_name,
                    'context' => $log->context,
                    'created_at' => $log->created_at,
                    'user' => $log->user ? [
                        'id' => $log->user->id,
                        'name' => $log->user->name,
                        'username' => $log->user->username,
                    ] : null,
                ];
            });

        return response()->json($logs);
    }

    public function destroy(Request $request)
    {
        $count = TicketActivityLog::count();
        TicketActivityLog::query()->delete();
        $this->logAdminAction($request->user()?->id, 'ticket_activity.clear', ['entries' => $count]);

        return response()->json(['cleared' => true]);
    }
}
