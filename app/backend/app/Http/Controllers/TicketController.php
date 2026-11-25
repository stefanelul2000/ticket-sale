<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Ticket;
use App\Models\TicketActivityLog;
use App\Models\TicketType;
use App\Support\TicketCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TicketController extends Controller
{
    public function index(Request $request)
    {
        $query = Ticket::with(['event:id,name', 'ticketType:id,name,kind', 'seller:id,name,username'])
            ->when($request->filled('event_id'), fn ($q) => $q->where('event_id', $request->integer('event_id')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = trim((string) $request->get('search'));
                $code = TicketCode::normalize($term);
                $q->where(function ($inner) use ($term, $code) {
                    $inner->where('ticket_code', $code)
                        ->orWhere('name', 'like', '%'.addcslashes($term, '%_\\').'%');
                    if (ctype_digit($term)) {
                        $inner->orWhere('ticket_number', (int) $term);
                    }
                });
            })
            ->orderBy('event_id')
            ->orderBy('ticket_number');

        $perPage = max(1, min(2000, (int) $request->get('per_page', 50)));

        return $query->paginate($perPage);
    }

    public function generate(Request $request)
    {
        $data = $request->validate([
            'event_id' => ['nullable', 'integer', 'exists:events,id'],
            'ticket_type_id' => ['required', 'integer', 'exists:ticket_types,id'],
            'count' => ['required', 'integer', 'min:1', 'max:5000'],
        ]);

        $ticketType = TicketType::findOrFail($data['ticket_type_id']);
        $eventId = $data['event_id'] ?? $ticketType->event_id;
        if ((int) $ticketType->event_id !== (int) $eventId) {
            return response()->json(['message' => 'Ticket type does not belong to selected event.'], 422);
        }

        $count = (int) $data['count'];

        $result = DB::transaction(function () use ($eventId, $ticketType, $count) {
            // Serialise generation per event so numbering and capacity checks are race-free.
            $event = Event::whereKey($eventId)->lockForUpdate()->firstOrFail();

            $existing = Ticket::withTrashed()->where('event_id', $event->id);
            $generated = (clone $existing)->count();
            $lastNumber = (int) ((clone $existing)->max('ticket_number') ?? 0);

            if (! is_null($event->capacity) && $generated + $count > $event->capacity) {
                return response()->json([
                    'message' => 'Requested tickets exceed event capacity.',
                    'remaining' => max(0, $event->capacity - $generated),
                ], 422);
            }

            if (! is_null($ticketType->capacity)) {
                $typeGenerated = Ticket::withTrashed()->where('ticket_type_id', $ticketType->id)->count();
                if ($typeGenerated + $count > $ticketType->capacity) {
                    return response()->json([
                        'message' => 'Requested tickets exceed ticket type capacity.',
                        'remaining' => max(0, $ticketType->capacity - $typeGenerated),
                    ], 422);
                }
            }

            $codes = $this->uniqueCodes($count);
            $now = Carbon::now();
            $rows = [];
            foreach ($codes as $i => $code) {
                $rows[] = [
                    'event_id' => $event->id,
                    'ticket_type_id' => $ticketType->id,
                    'ticket_number' => $lastNumber + $i + 1,
                    'ticket_code' => $code,
                    'checkin' => false,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            foreach (array_chunk($rows, 500) as $chunk) {
                Ticket::insert($chunk);
            }

            return [
                'event' => $event,
                'start' => $lastNumber + 1,
                'end' => $lastNumber + $count,
                'codes' => $codes,
            ];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        $this->logAdminAction($request->user()?->id, 'ticket.generate', [
            'event_id' => $result['event']->id,
            'ticket_type_id' => $ticketType->id,
            'count' => $count,
            'start' => $result['start'],
            'end' => $result['end'],
        ]);

        return response()->json([
            'generated' => $count,
            'start' => $result['start'],
            'end' => $result['end'],
            'event_id' => $result['event']->id,
            'codes' => $result['codes'],
        ]);
    }

    public function export(Request $request, Event $event)
    {
        $data = $request->validate([
            'ticket_type_id' => ['nullable', 'integer', 'exists:ticket_types,id'],
        ]);

        $tickets = Ticket::with('ticketType:id,name')
            ->where('event_id', $event->id)
            ->when($data['ticket_type_id'] ?? null, fn ($q, $tt) => $q->where('ticket_type_id', $tt))
            ->orderBy('ticket_number')
            ->get(['id', 'ticket_code', 'ticket_number', 'ticket_type_id', 'name', 'sold_at', 'checkin']);

        return response()->json([
            'event' => $event->only(['id', 'name', 'starts_at', 'venue']),
            'count' => $tickets->count(),
            'codes' => $tickets->pluck('ticket_code'),
            'tickets' => $tickets->map(fn (Ticket $t) => [
                'ticket_code' => $t->ticket_code,
                'ticket_number' => $t->ticket_number,
                'ticket_type' => $t->ticketType?->name,
                'name' => $t->name,
                'sold' => $t->isSold(),
                'checkin' => $t->checkin,
            ])->values(),
        ]);
    }

    public function sell(Request $request, string $ticketCode)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);
        $name = trim($data['name']);

        $ticket = $this->findTicketByCode($ticketCode);
        if (! $ticket) {
            $this->recordActivity($request, 'sell', TicketCode::normalize($ticketCode), 'Ticket not found.', false);

            return response()->json(['message' => 'Ticket not found.'], 404);
        }

        // Atomic: only one seller can win the race for an unsold ticket.
        $updated = Ticket::whereKey($ticket->id)
            ->whereNull('sold_at')
            ->update([
                'name' => $name,
                'user_id' => $request->user()->id,
                'sold_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

        if ($updated === 0) {
            $ticket->refresh();
            $this->recordActivity($request, 'sell', $ticket->ticket_code, 'Ticket already sold.', false, $ticket->name);

            return response()->json(['message' => 'Ticket already sold'.($ticket->name ? " to {$ticket->name}" : '').'.'], 409);
        }

        $ticket->refresh();
        $this->recordActivity($request, 'sell', $ticket->ticket_code, 'Sold', true, $name);

        return response()->json($this->present($ticket));
    }

    public function refund(Request $request, string $ticketCode)
    {
        $ticket = $this->findTicketByCode($ticketCode);
        if (! $ticket) {
            return response()->json(['message' => 'Ticket not found.'], 404);
        }

        if (! $ticket->isSold()) {
            return response()->json(['message' => 'Ticket is not sold.'], 409);
        }

        if ($ticket->checkin) {
            return response()->json(['message' => 'Ticket was already used for check-in and cannot be refunded.'], 409);
        }

        $previousName = $ticket->name;
        $updated = Ticket::whereKey($ticket->id)
            ->whereNotNull('sold_at')
            ->where('checkin', false)
            ->update([
                'user_id' => null,
                'name' => null,
                'sold_at' => null,
                'updated_at' => Carbon::now(),
            ]);

        if ($updated === 0) {
            return response()->json(['message' => 'Ticket changed meanwhile; reload and try again.'], 409);
        }

        $this->recordActivity($request, 'refund', $ticket->ticket_code, 'Refunded', true, $previousName);
        $this->logAdminAction($request->user()?->id, 'ticket.refund', [
            'ticket_code' => $ticket->ticket_code,
            'name' => $previousName,
        ]);

        return response()->json(['refunded' => true]);
    }

    public function checkin(Request $request, string $ticketCode)
    {
        $ticket = $this->findTicketByCode($ticketCode);
        if (! $ticket) {
            $this->recordActivity($request, 'checkin', TicketCode::normalize($ticketCode), 'Ticket not found.', false);

            return response()->json(['message' => 'Ticket not found.', 'result' => 'not_found'], 404);
        }

        if (! $ticket->isSold()) {
            $this->recordActivity($request, 'checkin', $ticket->ticket_code, 'Not sold — entry refused.', false);

            return response()->json([
                'message' => 'Ticket is not sold. Entry refused.',
                'result' => 'not_sold',
                'ticket' => $this->present($ticket),
            ], 409);
        }

        // Atomic: two scanners scanning the same ticket at once cannot both succeed.
        $now = Carbon::now();
        $updated = Ticket::whereKey($ticket->id)
            ->whereNotNull('sold_at')
            ->where('checkin', false)
            ->update([
                'checkin' => true,
                'checked_in_at' => $now,
                'checked_in_by' => $request->user()->id,
                'updated_at' => $now,
            ]);

        $ticket->refresh();

        if ($updated === 0) {
            $when = $ticket->checked_in_at?->timezone(config('app.timezone'))->format('H:i');
            $this->recordActivity($request, 'checkin', $ticket->ticket_code, 'Already checked in'.($when ? " at {$when}" : '').'.', false, $ticket->name);

            return response()->json([
                'message' => 'Ticket already checked in'.($when ? " at {$when}" : '').'.',
                'result' => 'already_checked_in',
                'ticket' => $this->present($ticket),
            ], 409);
        }

        $this->recordActivity($request, 'checkin', $ticket->ticket_code, 'Checked in', true, $ticket->name);

        return response()->json([
            'checked_in' => true,
            'result' => 'ok',
            'ticket' => $this->present($ticket),
        ]);
    }

    public function verify(Request $request, string $ticketCode)
    {
        $ticket = $this->findTicketByCode($ticketCode);
        if (! $ticket) {
            $this->recordActivity($request, 'verify', TicketCode::normalize($ticketCode), 'Ticket not found.', false);

            return response()->json(['message' => 'Ticket not found.', 'result' => 'not_found'], 404);
        }

        $status = match (true) {
            ! $ticket->isSold() => 'Not sold',
            $ticket->checkin => 'Already checked in',
            default => 'Valid',
        };

        $this->recordActivity($request, 'verify', $ticket->ticket_code, $status, $ticket->isSold() && ! $ticket->checkin, $ticket->name);

        return response()->json($this->present($ticket));
    }

    public function stats(Request $request)
    {
        $base = Ticket::query()
            ->when($request->filled('event_id'), fn ($q) => $q->where('event_id', $request->integer('event_id')));

        $row = (clone $base)
            ->selectRaw('count(*) as total')
            ->selectRaw('sum(case when sold_at is not null then 1 else 0 end) as sold')
            ->selectRaw('sum(case when checkin = 1 then 1 else 0 end) as checked_in')
            ->first();

        $total = (int) ($row->total ?? 0);
        $sold = (int) ($row->sold ?? 0);

        return response()->json([
            'total' => $total,
            'sold' => $sold,
            'unsold' => $total - $sold,
            'checked_in' => (int) ($row->checked_in ?? 0),
        ]);
    }

    private function findTicketByCode(string $input): ?Ticket
    {
        $code = TicketCode::normalize($input);
        if ($code === '') {
            return null;
        }

        return Ticket::where('ticket_code', $code)->first();
    }

    /**
     * @return list<string>
     */
    private function uniqueCodes(int $count): array
    {
        $codes = [];
        while (count($codes) < $count) {
            $batch = [];
            while (count($batch) < $count - count($codes)) {
                $code = TicketCode::generate();
                if (! isset($codes[$code])) {
                    $batch[$code] = true;
                }
            }
            $taken = Ticket::withTrashed()->whereIn('ticket_code', array_keys($batch))->pluck('ticket_code')->all();
            foreach ($taken as $dup) {
                unset($batch[$dup]);
            }
            $codes += $batch;
        }

        return array_keys($codes);
    }

    private function present(Ticket $ticket): array
    {
        $ticket->loadMissing(['event:id,name', 'ticketType:id,name,kind', 'checkedInBy:id,name']);

        return [
            'id' => $ticket->id,
            'ticket_code' => $ticket->ticket_code,
            'ticket_number' => $ticket->ticket_number,
            'event' => $ticket->event?->only(['id', 'name']),
            'ticket_type' => $ticket->ticketType?->only(['id', 'name', 'kind']),
            'name' => $ticket->name,
            'sold' => $ticket->isSold(),
            'sold_at' => $ticket->sold_at,
            'checkin' => $ticket->checkin,
            'checked_in_at' => $ticket->checked_in_at,
            'checked_in_by' => $ticket->checkedInBy?->name,
        ];
    }

    private function recordActivity(Request $request, string $action, ?string $ticketCode, string $status, bool $success, ?string $name = null): void
    {
        TicketActivityLog::create([
            'user_id' => $request->user()?->id,
            'ticket_code' => $ticketCode !== null ? mb_substr($ticketCode, 0, 64) : null,
            'action' => $action,
            'status' => $status,
            'success' => $success,
            'attendee_name' => $name,
        ]);
    }
}
