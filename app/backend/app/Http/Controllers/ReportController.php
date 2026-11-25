<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Aggregated numbers for one event (no guest names).
     */
    public function event(int $eventId)
    {
        $event = Event::findOrFail($eventId);
        $tz = config('app.timezone');

        $totals = Ticket::where('event_id', $event->id)
            ->selectRaw('count(*) as generated_count')
            ->selectRaw('sum(case when sold_at is not null then 1 else 0 end) as assigned_count')
            ->selectRaw('sum(case when checkin = 1 then 1 else 0 end) as checked_in_count')
            ->selectRaw('sum(case when is_walk_in = 1 then 1 else 0 end) as walk_in_count')
            ->first();

        $generated = (int) $totals->generated_count;
        $assigned = (int) $totals->assigned_count;
        $checkedIn = (int) $totals->checked_in_count;
        $walkIns = (int) $totals->walk_in_count;
        $invitedAssigned = $assigned - $walkIns;
        $invitedCheckedIn = $checkedIn - $walkIns;

        $byType = DB::table('tickets')
            ->leftJoin('ticket_types', 'ticket_types.id', '=', 'tickets.ticket_type_id')
            ->where('tickets.event_id', $event->id)
            ->whereNull('tickets.deleted_at')
            ->groupBy('tickets.ticket_type_id', 'ticket_types.name')
            ->orderBy('ticket_types.name')
            ->get([
                'ticket_types.name as name',
                DB::raw('count(*) as generated_count'),
                DB::raw('sum(case when tickets.sold_at is not null then 1 else 0 end) as assigned_count'),
                DB::raw('sum(case when tickets.checkin = 1 then 1 else 0 end) as checked_in_count'),
            ])
            ->map(fn ($r) => ['name' => $r->name, 'generated' => (int) $r->generated_count, 'assigned' => (int) $r->assigned_count, 'checked_in' => (int) $r->checked_in_count]);

        $byCategory = Ticket::where('event_id', $event->id)
            ->whereNotNull('sold_at')
            ->groupBy('guest_category')
            ->get([
                'guest_category',
                DB::raw('count(*) as assigned_count'),
                DB::raw('sum(case when checkin = 1 then 1 else 0 end) as checked_in_count'),
            ])
            ->map(fn ($r) => ['category' => $r->guest_category ?? 'none', 'assigned' => (int) $r->assigned_count, 'checked_in' => (int) $r->checked_in_count])
            ->sortByDesc('assigned')
            ->values();

        $assignedBy = Ticket::where('event_id', $event->id)->whereNotNull('sold_at')->whereNotNull('user_id')
            ->selectRaw('user_id, count(*) as c')->groupBy('user_id')->pluck('c', 'user_id');
        $checkedBy = Ticket::where('event_id', $event->id)->where('checkin', true)->whereNotNull('checked_in_by')
            ->selectRaw('checked_in_by, count(*) as c')->groupBy('checked_in_by')->pluck('c', 'checked_in_by');
        $names = User::whereIn('id', $assignedBy->keys()->merge($checkedBy->keys())->unique())->pluck('name', 'id');
        $byVolunteer = $names->map(fn ($name, $id) => [
            'name' => $name,
            'assigned' => (int) ($assignedBy[$id] ?? 0),
            'checked_in' => (int) ($checkedBy[$id] ?? 0),
        ])->sortByDesc(fn ($r) => $r['assigned'] + $r['checked_in'])->values();

        // Arrivals per 15 minutes (computed in PHP: DB-agnostic and timezone-correct).
        $arrivals = Ticket::where('event_id', $event->id)->whereNotNull('checked_in_at')->orderBy('checked_in_at')
            ->pluck('checked_in_at')
            ->map(fn ($t) => Carbon::parse($t)->timezone($tz))
            ->groupBy(fn (Carbon $t) => $t->copy()->setTime($t->hour, intdiv($t->minute, 15) * 15)->format('Y-m-d\TH:i:sP'))
            ->map(fn ($g, $slot) => ['slot' => $slot, 'count' => $g->count()])
            ->values();

        // Invitations handed out per day.
        $distribution = Ticket::where('event_id', $event->id)->whereNotNull('sold_at')->where('is_walk_in', false)
            ->orderBy('sold_at')->pluck('sold_at')
            ->map(fn ($t) => Carbon::parse($t)->timezone($tz)->toDateString())
            ->countBy()
            ->map(fn ($count, $day) => ['day' => $day, 'count' => $count])
            ->values();

        return response()->json([
            'event' => $event->only(['id', 'name', 'starts_at', 'ends_at', 'capacity', 'venue']),
            'totals' => [
                'capacity' => $event->capacity,
                'generated' => $generated,
                'assigned' => $assigned,
                'checked_in' => $checkedIn,
                'walk_ins' => $walkIns,
                'not_arrived' => max(0, $assigned - $checkedIn),
                // Share of assigned invitations that were actually used (walk-ins excluded).
                'attendance_rate' => $invitedAssigned > 0 ? round($invitedCheckedIn / $invitedAssigned, 3) : null,
                'fill_rate' => $event->capacity ? round($assigned / $event->capacity, 3) : null,
                'named' => Ticket::where('event_id', $event->id)->whereNotNull('sold_at')->whereNotNull('name')->where('name', '!=', '')->count(),
            ],
            'by_type' => $byType->values(),
            'by_category' => $byCategory,
            'by_volunteer' => $byVolunteer,
            'arrivals' => $arrivals,
            'distribution' => $distribution,
        ]);
    }

    /**
     * All events side by side.
     */
    public function overview()
    {
        $events = Event::withCount([
            'tickets as generated',
            'tickets as assigned' => fn ($q) => $q->whereNotNull('sold_at'),
            'tickets as checked_in' => fn ($q) => $q->where('checkin', true),
            'tickets as walk_ins' => fn ($q) => $q->where('is_walk_in', true),
        ])->orderByRaw('starts_at is null')->orderByDesc('starts_at')->orderByDesc('id')->get();

        $rows = $events->map(function (Event $e) {
            $invitedAssigned = $e->assigned - $e->walk_ins;

            return [
                'id' => $e->id,
                'name' => $e->name,
                'starts_at' => $e->starts_at,
                'capacity' => $e->capacity,
                'generated' => (int) $e->generated,
                'assigned' => (int) $e->assigned,
                'checked_in' => (int) $e->checked_in,
                'walk_ins' => (int) $e->walk_ins,
                'attendance_rate' => $invitedAssigned > 0 ? round(($e->checked_in - $e->walk_ins) / $invitedAssigned, 3) : null,
            ];
        });

        return response()->json([
            'events' => $rows->values(),
            'totals' => [
                'events' => $rows->count(),
                'assigned' => $rows->sum('assigned'),
                'checked_in' => $rows->sum('checked_in'),
                'walk_ins' => $rows->sum('walk_ins'),
            ],
        ]);
    }

    /**
     * Guests (by name) who attended or were invited to more than one event.
     */
    public function repeatGuests()
    {
        $rows = Ticket::with('event:id,name,starts_at')
            ->whereNotNull('sold_at')
            ->whereNotNull('name')
            ->get(['id', 'event_id', 'name', 'guest_category', 'checkin']);

        $guests = $rows
            ->groupBy(fn (Ticket $t) => mb_strtolower(preg_replace('/\s+/u', ' ', trim($t->name))))
            ->map(function ($tickets) {
                $events = $tickets->groupBy('event_id')->map(fn ($g) => [
                    'id' => $g->first()->event_id,
                    'name' => $g->first()->event?->name,
                    'tickets' => $g->count(),
                    'checked_in' => $g->where('checkin', true)->count(),
                ])->values();

                return [
                    'name' => trim($tickets->first()->name),
                    'category' => $tickets->pluck('guest_category')->filter()->countBy()->sortDesc()->keys()->first(),
                    'events_count' => $events->count(),
                    'attended_count' => $events->where('checked_in', '>', 0)->count(),
                    'events' => $events,
                ];
            })
            ->filter(fn ($g) => $g['events_count'] > 1)
            ->sortByDesc('events_count')
            ->take(200)
            ->values();

        return response()->json($guests);
    }
}
