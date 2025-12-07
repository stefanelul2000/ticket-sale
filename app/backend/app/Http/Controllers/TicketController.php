<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Ticket;
use App\Models\TicketType;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TicketController extends Controller
{
    public function index()
    {
        return Ticket::with('event')->orderByDesc('created_at')->paginate(50);
    }

    public function generate(Request $request)
    {
        $data = $request->validate([
            'event_id' => ['nullable', 'integer', 'exists:events,id'],
            'ticket_type_id' => ['required', 'integer', 'exists:ticket_types,id'],
            'count' => ['required', 'integer', 'min:1', 'max:5000'],
        ]);

        $ticketType = TicketType::findOrFail($data['ticket_type_id']);
        $event = $data['event_id'] ? Event::findOrFail($data['event_id']) : $ticketType->event;
        if ($ticketType->event_id !== $event->id) {
            return response()->json(['message' => 'Ticket type does not belong to selected event'], 422);
        }
        $lastNumber = Ticket::where('event_id', $event->id)->max('ticket_number') ?? 0;
        $start = $lastNumber + 1;

        if (! is_null($event->capacity) && ($lastNumber + $data['count'] > $event->capacity)) {
            return response()->json([
                'message' => 'Requested tickets exceed event capacity.',
                'remaining' => max(0, $event->capacity - $lastNumber),
            ], 422);
        }

        $numbers = range($start, $start + $data['count'] - 1);
        $width = $event->capacity ? max(3, strlen((string) $event->capacity)) : 3;
        $codes = [];

        DB::transaction(function () use ($numbers, $event, $ticketType, $width, &$codes) {
            foreach ($numbers as $number) {
                $code = $event->id . '_' . str_pad((string) $number, max(3, strlen((string) $number)), '0', STR_PAD_LEFT);
                Ticket::firstOrCreate([
                    'event_id' => $event->id,
                    'ticket_type_id' => $ticketType->id,
                    'ticket_number' => $number,
                    'ticket_code' => $code,
                ]);
                $codes[] = $code;
            }
        });

        $startCode = str_pad((string) $start, $width, '0', STR_PAD_LEFT);
        $endCode = str_pad((string) ($start + count($numbers) - 1), $width, '0', STR_PAD_LEFT);

        $this->logAdminAction($request->user()?->id, 'ticket.generate', [
            'event_id' => $event->id,
            'ticket_type_id' => $ticketType->id,
            'count' => count($numbers),
            'start' => $start,
            'end' => $start + count($numbers) - 1,
        ]);

        return response()->json([
            'generated' => count($numbers),
            'start' => $start,
            'end' => $start + count($numbers) - 1,
            'event_id' => $event->id,
            'start_code' => $event->id . '_' . $startCode,
            'end_code' => $event->id . '_' . $endCode,
            'codes' => $codes,
        ]);
    }

    public function export(Request $request, Event $event)
    {
        $data = $request->validate([
            'ticket_type_id' => ['nullable', 'integer', 'exists:ticket_types,id'],
        ]);

        $query = Ticket::where('event_id', $event->id)
            ->when($data['ticket_type_id'] ?? null, fn ($q, $tt) => $q->where('ticket_type_id', $tt))
            ->orderBy('ticket_number');

        $tickets = $query->get(['ticket_code', 'ticket_number', 'ticket_type_id', 'event_id', 'name', 'sold_at', 'checkin']);

        return response()->json([
            'event' => $event->only(['id', 'name']),
            'count' => $tickets->count(),
            'codes' => $tickets->pluck('ticket_code'),
        ]);
    }

    public function sell(Request $request, string $ticketCode)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $ticket = $this->findTicketByCode($ticketCode);
        if (! $ticket) {
            throw new NotFoundHttpException('Ticket not found');
        }

        if (! is_null($ticket->sold_at)) {
            return response()->json(['message' => 'Ticket already sold.'], 409);
        }

        $ticket->update(array_merge($data, [
            'user_id' => $request->user()->id,
            'sold_at' => Carbon::now(),
        ]));

        return response()->json($ticket);
    }

    public function refund(string $ticketCode)
    {
        $ticket = $this->findTicketByCode($ticketCode);
        if (! $ticket) {
            throw new NotFoundHttpException('Ticket not found');
        }

        $ticket->update([
            'user_id' => null,
            'name' => null,
            'sold_at' => null,
            'checkin' => false,
        ]);

        return response()->json(['refunded' => true]);
    }

    public function checkin(string $ticketCode)
    {
        $ticket = $this->findTicketByCode($ticketCode);
        if (! $ticket) {
            throw new NotFoundHttpException('Ticket not found');
        }

        if ($ticket->checkin) {
            return response()->json(['message' => 'Ticket already checked in.'], 409);
        }

        $ticket->update(['checkin' => true]);

        return response()->json(['checked_in' => true]);
    }

    public function verify(string $ticketCode)
    {
        $ticket = $this->findTicketByCode($ticketCode);
        if (! $ticket) {
            throw new NotFoundHttpException('Ticket not found');
        }

        return response()->json($ticket);
    }

    public function stats()
    {
        $total = Ticket::count();
        $sold = Ticket::whereNotNull('sold_at')->count();
        $unsold = $total - $sold;
        $checkedIn = Ticket::where('checkin', true)->count();

        return response()->json([
            'total' => $total,
            'sold' => $sold,
            'unsold' => $unsold,
            'checked_in' => $checkedIn,
        ]);
    }

    private function findTicketByCode(string $input): ?Ticket
    {
        return Ticket::where('ticket_code', $input)->first();
    }
}
