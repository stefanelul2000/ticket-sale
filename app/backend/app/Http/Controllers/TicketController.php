<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Ticket;
use App\Mail\ETicketMail;
use App\Mail\TicketCancelledMail;
use App\Models\TicketActivityLog;
use App\Models\TicketRequest;
use App\Models\TicketType;
use App\Support\GuestCategory;
use App\Support\TicketCode;
use App\Support\TicketIssuer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class TicketController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'event_id' => ['nullable', 'integer'],
            'status' => ['nullable', 'in:assigned,unassigned,checked_in,not_checked_in,walk_in,eticket'],
            'category' => ['nullable', 'string', 'max:32'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:2000'],
            'sort' => ['nullable', 'in:number,name,assigned,checked_in'],
        ]);

        $query = Ticket::with(['event:id,name', 'ticketType:id,name,kind', 'seller:id,name,username', 'checkedInBy:id,name'])
            ->when($request->filled('event_id'), fn ($q) => $q->where('event_id', $request->integer('event_id')))
            ->when($request->filled('category'), fn ($q) => $request->get('category') === 'none'
                ? $q->whereNotNull('sold_at')->whereNull('guest_category')
                : $q->where('guest_category', $request->get('category')))
            ->when($request->get('status'), function ($q, $status) {
                match ($status) {
                    'assigned' => $q->whereNotNull('sold_at'),
                    'unassigned' => $q->whereNull('sold_at'),
                    'checked_in' => $q->where('checkin', true),
                    'not_checked_in' => $q->whereNotNull('sold_at')->where('checkin', false),
                    'walk_in' => $q->where('is_walk_in', true),
                    'eticket' => $q->whereNotNull('request_id'),
                };
            })
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = trim((string) $request->get('search'));
                $code = TicketCode::normalize($term);
                $q->where(function ($inner) use ($term, $code) {
                    $like = '%'.addcslashes($term, '%_\\').'%';
                    $inner->where('ticket_code', $code)
                        ->orWhere('name', 'like', $like)
                        ->orWhere('email', 'like', $like);
                    if (ctype_digit($term)) {
                        $inner->orWhere('ticket_number', (int) $term);
                    }
                });
            })
            ->orderBy('event_id');

        match ($request->get('sort', 'number')) {
            'name' => $query->orderByRaw('name is null')->orderBy('name')->orderBy('ticket_number'),
            'assigned' => $query->orderByRaw('sold_at is null')->orderByDesc('sold_at')->orderBy('ticket_number'),
            'checked_in' => $query->orderByRaw('checked_in_at is null')->orderByDesc('checked_in_at')->orderBy('ticket_number'),
            default => $query->orderBy('ticket_number'),
        };

        return $query->paginate((int) $request->get('per_page', 50));
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
            return response()->json(['message' => __('Ticket type does not belong to selected event.')], 422);
        }

        $count = (int) $data['count'];

        $result = DB::transaction(function () use ($eventId, $ticketType, $count) {
            $event = Event::whereKey($eventId)->lockForUpdate()->firstOrFail();

            $remaining = TicketIssuer::remaining($event, $ticketType);
            if (! is_null($remaining) && $count > $remaining) {
                return response()->json([
                    'message' => __('Only :n more tickets fit within the capacity.', ['n' => $remaining]),
                    'remaining' => $remaining,
                ], 422);
            }

            return ['event' => $event, 'tickets' => TicketIssuer::issue($event, $ticketType, $count)];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        $tickets = $result['tickets'];
        $start = $tickets[0]['ticket_number'];
        $end = $tickets[count($tickets) - 1]['ticket_number'];

        $this->logAdminAction($request->user()?->id, 'ticket.generate', [
            'event_id' => $result['event']->id,
            'ticket_type_id' => $ticketType->id,
            'count' => $count,
            'start' => $start,
            'end' => $end,
        ]);

        return response()->json([
            'generated' => $count,
            'start' => $start,
            'end' => $end,
            'event_id' => $result['event']->id,
            'codes' => array_column($tickets, 'ticket_code'),
        ]);
    }

    /**
     * Assign a list of guest names to invitations (for personalised printing).
     * Uses unassigned tickets of the type in number order; optionally issues missing ones.
     */
    public function assignList(Request $request, int $eventId)
    {
        $data = $request->validate([
            'ticket_type_id' => ['required', 'integer', 'exists:ticket_types,id'],
            'generate_missing' => ['boolean'],
            'entries' => ['required', 'array', 'min:1', 'max:2000'],
            'entries.*.name' => ['required', 'string', 'max:255'],
            'entries.*.guest_category' => ['nullable', GuestCategory::rule()],
        ]);

        $type = TicketType::findOrFail($data['ticket_type_id']);
        if ((int) $type->event_id !== $eventId) {
            return response()->json(['message' => __('Ticket type does not belong to selected event.')], 422);
        }

        $entries = array_values($data['entries']);
        $userId = $request->user()->id;

        $result = DB::transaction(function () use ($eventId, $type, $entries, $data, $userId) {
            $event = Event::whereKey($eventId)->lockForUpdate()->firstOrFail();

            $free = Ticket::where('ticket_type_id', $type->id)
                ->whereNull('sold_at')
                ->where('checkin', false)
                ->orderBy('ticket_number')
                ->limit(count($entries))
                ->lockForUpdate()
                ->get(['id', 'ticket_code', 'ticket_number']);

            $missing = count($entries) - $free->count();
            if ($missing > 0) {
                if (! ($data['generate_missing'] ?? false)) {
                    return response()->json([
                        'message' => __('Not enough unassigned tickets: :n missing.', ['n' => $missing]),
                        'missing' => $missing,
                    ], 422);
                }
                $remaining = TicketIssuer::remaining($event, $type);
                if (! is_null($remaining) && $missing > $remaining) {
                    return response()->json([
                        'message' => __('Only :n more tickets fit within the capacity.', ['n' => $remaining]),
                        'remaining' => $remaining,
                    ], 422);
                }
                TicketIssuer::issue($event, $type, $missing);
                $free = Ticket::where('ticket_type_id', $type->id)
                    ->whereNull('sold_at')
                    ->where('checkin', false)
                    ->orderBy('ticket_number')
                    ->limit(count($entries))
                    ->lockForUpdate()
                    ->get(['id', 'ticket_code', 'ticket_number']);
            }

            $now = Carbon::now();
            $assigned = [];
            foreach ($entries as $i => $entry) {
                $ticket = $free[$i];
                Ticket::whereKey($ticket->id)->update([
                    'name' => trim($entry['name']),
                    'guest_category' => $entry['guest_category'] ?? null,
                    'user_id' => $userId,
                    'sold_at' => $now,
                    'updated_at' => $now,
                ]);
                $assigned[] = [
                    'ticket_code' => $ticket->ticket_code,
                    'ticket_number' => $ticket->ticket_number,
                    'name' => trim($entry['name']),
                    'guest_category' => $entry['guest_category'] ?? null,
                ];
            }

            return $assigned;
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        $this->logAdminAction($userId, 'ticket.assign_list', [
            'event_id' => $eventId,
            'ticket_type_id' => $type->id,
            'count' => count($result),
        ]);

        return response()->json(['assigned' => count($result), 'tickets' => $result]);
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
            ->get(['id', 'ticket_code', 'ticket_number', 'ticket_type_id', 'name', 'guest_category', 'email', 'emailed_at', 'request_id', 'sold_at', 'checkin', 'checked_in_at', 'is_walk_in']);

        return response()->json([
            'event' => $event->only(['id', 'name', 'slug', 'starts_at', 'venue', 'city']),
            'count' => $tickets->count(),
            'codes' => $tickets->pluck('ticket_code'),
            'tickets' => $tickets->map(fn (Ticket $t) => [
                'ticket_code' => $t->ticket_code,
                'ticket_number' => $t->ticket_number,
                'ticket_type' => $t->ticketType?->name,
                'name' => $t->name,
                'guest_category' => $t->guest_category,
                'email' => $t->email,
                'emailed_at' => $t->emailed_at,
                'is_eticket' => $t->request_id !== null,
                'sold' => $t->isSold(),
                'sold_at' => $t->sold_at,
                'checkin' => $t->checkin,
                'checked_in_at' => $t->checked_in_at,
                'is_walk_in' => $t->is_walk_in,
            ])->values(),
        ]);
    }

    public function sell(Request $request, string $ticketCode)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'guest_category' => ['nullable', GuestCategory::rule()],
            'email' => self::EMAIL_RULE,
            'event_id' => ['required', 'integer'],
        ]);
        $name = trim($data['name']);
        $email = self::cleanEmail($data['email'] ?? null);

        $ticket = $this->findTicketByCode($ticketCode);
        if (! $ticket) {
            $this->recordActivity($request, 'sell', TicketCode::normalize($ticketCode), 'Ticket not found.', false);

            return response()->json(['message' => __('Ticket not found.'), 'result' => 'not_found'], 404);
        }

        if ($wrong = $this->wrongEvent($ticket, (int) $data['event_id'])) {
            $this->recordActivity($request, 'sell', $ticket->ticket_code, 'Wrong event.', false);

            return $wrong;
        }

        // Atomic: only one volunteer can win the race for an unassigned ticket.
        $updated = Ticket::whereKey($ticket->id)
            ->whereNull('sold_at')
            ->update([
                'name' => $name,
                'guest_category' => $data['guest_category'] ?? null,
                'email' => $email,
                'emailed_at' => null,
                'user_id' => $request->user()->id,
                'sold_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

        if ($updated === 0) {
            $ticket->refresh();
            $this->recordActivity($request, 'sell', $ticket->ticket_code, 'Ticket already sold.', false, $ticket->name);

            return response()->json([
                'message' => $ticket->name
                    ? __('Ticket already assigned to :name.', ['name' => $ticket->name])
                    : __('Ticket already assigned.'),
                'result' => 'already_assigned',
            ], 409);
        }

        $ticket->refresh();
        $this->recordActivity($request, 'sell', $ticket->ticket_code, 'Sold', true, $name);

        return response()->json($this->present($ticket));
    }

    /**
     * Fix the guest name / category of an assigned ticket.
     */
    public function update(Request $request, string $ticketCode)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'guest_category' => ['sometimes', 'nullable', GuestCategory::rule()],
            'email' => ['sometimes', ...self::EMAIL_RULE],
        ]);

        $ticket = $this->findTicketByCode($ticketCode);
        if (! $ticket) {
            return response()->json(['message' => __('Ticket not found.')], 404);
        }
        if (! $ticket->isSold()) {
            return response()->json(['message' => __('Ticket is not assigned yet.')], 409);
        }

        $actor = $request->user();
        if ((int) $actor->role_id < 4) {
            // Volunteers fix only their own, not-yet-used assignments.
            if ((int) $ticket->user_id !== (int) $actor->id || $ticket->checkin) {
                return response()->json(['message' => __('Only the volunteer who assigned this invitation (or a manager) can change it.')], 403);
            }
        }

        $before = $ticket->only(['name', 'guest_category', 'email']);
        if (array_key_exists('name', $data)) {
            $data['name'] = trim($data['name']);
        }
        if (array_key_exists('email', $data)) {
            $data['email'] = self::cleanEmail($data['email']);
            if ($data['email'] !== $ticket->email) {
                $data['emailed_at'] = null; // a new address has not received it yet
            }
        }
        $data['updated_at'] = Carbon::now();
        // Atomic: never write a name onto a ticket that was released meanwhile.
        $updated = Ticket::whereKey($ticket->id)->whereNotNull('sold_at')->update($data);
        if ($updated === 0) {
            return response()->json(['message' => __('Ticket changed meanwhile; reload and try again.')], 409);
        }
        $ticket->refresh();

        $this->logAdminAction($actor->id, 'ticket.update', [
            'ticket_code' => $ticket->ticket_code,
            'before' => $before,
            'after' => $ticket->only(['name', 'guest_category']),
            'event_id' => $ticket->event_id,
        ]);

        return response()->json($this->present($ticket));
    }

    /**
     * Refund / cancel an assigned ticket (managers and admins): the ticket becomes free again.
     * Also works after check-in (e.g. removing a test ticket); the check-in is undone.
     */
    public function refund(Request $request, string $ticketCode)
    {
        $notify = (bool) ($request->validate(['notify' => ['nullable', 'boolean']])['notify'] ?? false);
        $ticket = $this->findTicketByCode($ticketCode);
        if (! $ticket) {
            return response()->json(['message' => __('Ticket not found.')], 404);
        }

        if (! $ticket->isSold()) {
            return response()->json(['message' => __('Ticket is not assigned yet.')], 409);
        }

        $previous = $ticket->only(['name', 'checkin', 'checked_in_at', 'request_id', 'is_walk_in', 'email', 'emailed_at']);
        $updated = Ticket::whereKey($ticket->id)
            ->whereNotNull('sold_at')
            ->update([
                'user_id' => null,
                'name' => null,
                'guest_category' => null,
                'sold_at' => null,
                'checkin' => false,
                'checked_in_at' => null,
                'checked_in_by' => null,
                'is_walk_in' => false,
                'request_id' => null,
                'email' => null,
                'emailed_at' => null,
                'updated_at' => Carbon::now(),
            ]);

        if ($updated === 0) {
            return response()->json(['message' => __('Ticket changed meanwhile; reload and try again.')], 409);
        }

        // An online request whose last ticket was just refunded is cancelled as a whole.
        if ($previous['request_id'] && ! Ticket::where('request_id', $previous['request_id'])->exists()) {
            TicketRequest::whereKey($previous['request_id'])->where('status', 'approved')->update(['status' => 'cancelled', 'updated_at' => Carbon::now()]);
        }

        // Tickets that went out by email: optionally tell the holder.
        $notified = false;
        $req = $previous['request_id'] ? TicketRequest::find($previous['request_id']) : null;
        $to = $req?->email ?? ($previous['emailed_at'] ? $previous['email'] : null);
        if ($notify && $to && TicketRequestController::mailConfigured()) {
            try {
                Mail::to($to)->send(new TicketCancelledMail(
                    $ticket->event,
                    [['name' => $previous['name'], 'number' => $ticket->ticket_number, 'code' => $ticket->ticket_code]],
                    $req?->locale ?? 'ro',
                ));
                $notified = true;
            } catch (\Throwable $e) {
                report($e);
            }
        }

        $status = $previous['checkin'] ? 'Refunded (check-in undone)' : 'Released';
        $this->recordActivity($request, 'refund', $ticket->ticket_code, $status, true, $previous['name']);
        $this->logAdminAction($request->user()?->id, 'ticket.refund', [
            'ticket_code' => $ticket->ticket_code,
            'name' => $previous['name'],
            'was_checked_in' => (bool) $previous['checkin'],
            'checked_in_at' => $previous['checked_in_at']?->toIso8601String(),
            'request_id' => $previous['request_id'],
        ]);

        return response()->json(['refunded' => true, 'was_checked_in' => (bool) $previous['checkin'], 'notified' => $notified]);
    }

    public function checkin(Request $request, string $ticketCode)
    {
        // The door is always bound to one event: a ticket for another event never gets in.
        $eventId = (int) $request->validate(['event_id' => ['required', 'integer']])['event_id'];

        $ticket = $this->findTicketByCode($ticketCode);
        if (! $ticket) {
            $this->recordActivity($request, 'checkin', TicketCode::normalize($ticketCode), 'Ticket not found.', false);

            return response()->json(['message' => __('Ticket not found.'), 'result' => 'not_found'], 404);
        }

        if ($wrong = $this->wrongEvent($ticket, $eventId)) {
            $this->recordActivity($request, 'checkin', $ticket->ticket_code, 'Wrong event.', false, $ticket->name);

            return $wrong;
        }

        if (! $ticket->isSold()) {
            $this->recordActivity($request, 'checkin', $ticket->ticket_code, 'Not sold — entry refused.', false);

            return response()->json([
                'message' => __('Invitation not assigned to anyone. Entry refused.'),
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
                'message' => $when
                    ? __('Ticket already checked in at :time.', ['time' => $when])
                    : __('Ticket already checked in.'),
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
        $eventId = (int) $request->validate(['event_id' => ['required', 'integer']])['event_id'];

        $ticket = $this->findTicketByCode($ticketCode);
        if (! $ticket) {
            $this->recordActivity($request, 'verify', TicketCode::normalize($ticketCode), 'Ticket not found.', false);

            return response()->json(['message' => __('Ticket not found.'), 'result' => 'not_found'], 404);
        }

        if ($wrong = $this->wrongEvent($ticket, $eventId)) {
            $this->recordActivity($request, 'verify', $ticket->ticket_code, 'Wrong event.', false, $ticket->name);

            return $wrong;
        }

        $status = match (true) {
            ! $ticket->isSold() => 'Not sold',
            $ticket->checkin => 'Already checked in',
            default => 'Valid',
        };

        $this->recordActivity($request, 'verify', $ticket->ticket_code, $status, $ticket->isSold() && ! $ticket->checkin, $ticket->name);

        return response()->json($this->present($ticket));
    }

    /**
     * Guest without an invitation admitted at the door: issue a new ticket, assign and check in.
     * Never consumes printed invitations.
     */
    public function walkIn(Request $request, int $eventId)
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'guest_category' => ['nullable', GuestCategory::rule()],
            'ticket_type_id' => ['nullable', 'integer', 'exists:ticket_types,id'],
        ]);

        $userId = $request->user()->id;

        $result = DB::transaction(function () use ($eventId, $data, $userId) {
            $event = Event::whereKey($eventId)->lockForUpdate()->firstOrFail();

            $type = isset($data['ticket_type_id'])
                ? TicketType::where('event_id', $event->id)->find($data['ticket_type_id'])
                : TicketType::where('event_id', $event->id)->orderBy('sort')->orderBy('id')->first();
            if (! $type) {
                return response()->json(['message' => __('This event has no ticket type yet.')], 422);
            }

            if (! is_null($event->capacity)) {
                $present = Ticket::where('event_id', $event->id)->whereNotNull('sold_at')->count();
                if ($present >= $event->capacity) {
                    return response()->json(['message' => __('The event is full (capacity reached).'), 'result' => 'full'], 409);
                }
            }

            $now = Carbon::now();
            $issued = TicketIssuer::issue($event, $type, 1, [
                'name' => isset($data['name']) && trim($data['name']) !== '' ? trim($data['name']) : null,
                'guest_category' => $data['guest_category'] ?? null,
                'user_id' => $userId,
                'sold_at' => $now,
                'checkin' => true,
                'checked_in_at' => $now,
                'checked_in_by' => $userId,
                'is_walk_in' => true,
            ]);

            return Ticket::where('ticket_code', $issued[0]['ticket_code'])->firstOrFail();
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        $this->recordActivity($request, 'checkin', $result->ticket_code, 'Walk-in', true, $result->name);

        return response()->json(['result' => 'ok', 'ticket' => $this->present($result)], 201);
    }

    public function stats(Request $request)
    {
        $base = Ticket::query()
            ->when($request->filled('event_id'), fn ($q) => $q->where('event_id', $request->integer('event_id')));

        $row = (clone $base)
            ->selectRaw('count(*) as total')
            ->selectRaw('sum(case when sold_at is not null then 1 else 0 end) as sold')
            ->selectRaw('sum(case when checkin = 1 then 1 else 0 end) as checked_in')
            ->selectRaw('sum(case when is_walk_in = 1 then 1 else 0 end) as walk_ins')
            ->selectRaw('sum(case when request_id is not null then 1 else 0 end) as etickets')
            ->first();

        $total = (int) ($row->total ?? 0);
        $sold = (int) ($row->sold ?? 0);

        return response()->json([
            'total' => $total,
            'sold' => $sold,
            'unsold' => $total - $sold,
            'checked_in' => (int) ($row->checked_in ?? 0),
            'walk_ins' => (int) ($row->walk_ins ?? 0),
            'etickets' => (int) ($row->etickets ?? 0),
            'mail_configured' => TicketRequestController::mailConfigured(),
        ]);
    }

    private function wrongEvent(Ticket $ticket, ?int $eventId): ?JsonResponse
    {
        if (! $eventId || (int) $ticket->event_id === $eventId) {
            return null;
        }

        $ticket->loadMissing('event:id,name');

        return response()->json([
            'message' => __('This ticket is for another event: :event.', ['event' => $ticket->event?->name ?? '?']),
            'result' => 'wrong_event',
            'ticket' => $this->present($ticket),
        ], 409);
    }

    private const EMAIL_RULE = ['nullable', 'string', 'email:rfc', 'max:255'];

    private static function cleanEmail(?string $email): ?string
    {
        $email = $email !== null ? mb_strtolower(trim($email)) : null;

        return $email === '' ? null : $email;
    }

    /**
     * Email an assigned ticket (e.g. a printed invitation) to the guest's address as an e-ticket too.
     * Optional designs[] = the event's designed invitation rendered in the browser.
     */
    public function email(Request $request, string $ticketCode)
    {
        $request->validate([
            'designs' => ['nullable', 'array', 'max:1'],
            'designs.*' => ['file', 'mimes:jpg,jpeg,png', 'max:1024'],
        ]);

        $ticket = $this->findTicketByCode($ticketCode);
        if (! $ticket) {
            return response()->json(['message' => __('Ticket not found.')], 404);
        }
        if (! $ticket->isSold()) {
            return response()->json(['message' => __('Ticket is not assigned yet.')], 409);
        }
        if (! $ticket->email) {
            return response()->json(['message' => __('This invitation has no email address.')], 422);
        }
        $actor = $request->user();
        if ((int) $actor->role_id < 4 && (int) $ticket->user_id !== (int) $actor->id) {
            return response()->json(['message' => __('Only the volunteer who assigned this invitation (or a manager) can change it.')], 403);
        }
        if (! TicketRequestController::mailConfigured()) {
            return response()->json(['message' => __('Email sending is not configured yet.'), 'result' => 'mail_not_configured'], 409);
        }

        $designs = [];
        foreach ($request->file('designs', []) as $file) {
            $info = @getimagesize($file->getRealPath());
            if (! $info || ! in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG], true)) {
                return response()->json(['message' => __('The file is not a valid image.')], 422);
            }
            $isPng = $info[2] === IMAGETYPE_PNG;
            $designs[] = [
                'bytes' => (string) file_get_contents($file->getRealPath()),
                'name' => sprintf('invitatie-%03d.%s', $ticket->ticket_number, $isPng ? 'png' : 'jpg'),
                'mime' => $isPng ? 'image/png' : 'image/jpeg',
            ];
        }

        try {
            Mail::to($ticket->email)->send(new ETicketMail($ticket->event, collect([$ticket]), $designs, app()->getLocale()));
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => __('The email could not be sent: :error', ['error' => mb_substr($e->getMessage(), 0, 200)])], 502);
        }

        $ticket->forceFill(['emailed_at' => Carbon::now()])->save();
        $this->recordActivity($request, 'email', $ticket->ticket_code, 'E-ticket emailed', true, $ticket->name);

        return response()->json($this->present($ticket->refresh()));
    }

    private function findTicketByCode(string $input): ?Ticket
    {
        $code = TicketCode::normalize($input);
        if ($code === '') {
            return null;
        }

        return Ticket::where('ticket_code', $code)->first();
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
            'guest_category' => $ticket->guest_category,
            'email' => $ticket->email,
            'emailed_at' => $ticket->emailed_at,
            'sold' => $ticket->isSold(),
            'sold_at' => $ticket->sold_at,
            'checkin' => $ticket->checkin,
            'checked_in_at' => $ticket->checked_in_at,
            'checked_in_by' => $ticket->checkedInBy?->name,
            'is_walk_in' => (bool) $ticket->is_walk_in,
            'is_eticket' => $ticket->request_id !== null,
        ];
    }

    private function recordActivity(Request $request, string $action, ?string $ticketCode, string $status, bool $success, ?string $name = null): void
    {
        TicketActivityLog::create([
            'user_id' => $request->user()?->id,
            'event_id' => $ticketCode !== null ? Ticket::where('ticket_code', $ticketCode)->value('event_id') : null,
            'ticket_code' => $ticketCode !== null ? mb_substr($ticketCode, 0, 64) : null,
            'action' => $action,
            'status' => $status,
            'success' => $success,
            'attendee_name' => $name,
        ]);
    }
}
