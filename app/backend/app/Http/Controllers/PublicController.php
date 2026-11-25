<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Ticket;
use App\Support\Organization;
use App\Support\TicketCode;
use Illuminate\Support\Carbon;

/**
 * Unauthenticated endpoints for the public event and ticket pages.
 * Never expose guest names or internal data here.
 */
class PublicController extends Controller
{
    public function settings()
    {
        $org = Organization::get();

        return response()->json([
            'name' => $org['name'],
            'website_url' => $org['website_url'],
            'donation_url' => $org['donation_url'],
            'public_url' => $org['public_url'],
            'registration_enabled' => (bool) config('app.registration_enabled'),
        ]);
    }

    public function events()
    {
        $org = Organization::get();

        $events = Event::where('is_public', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '>=', Carbon::now()->subDays(60));
            })
            ->orderByRaw('starts_at is null')
            ->orderBy('starts_at')
            ->limit(50)
            ->get();

        return response()->json($events->map(fn (Event $e) => $e->publicPayload($org))->values());
    }

    public function event(string $slug)
    {
        $event = Event::where('slug', $slug)->where('is_public', true)->first();
        abort_if(! $event, 404, __('Event not found.'));

        return response()->json($event->publicPayload(Organization::get()));
    }

    /**
     * Ticket holder page (QR code on the invitation). Knowing the unguessable code is the
     * authorisation, so the event is shown even when it is not listed publicly.
     */
    public function ticket(string $code)
    {
        $normalized = TicketCode::normalize($code);
        // Only new-style random codes are resolvable publicly (legacy codes are sequential/guessable).
        abort_unless(preg_match('/^[2-9A-Z]{5}-[2-9A-Z]{5}$/', $normalized) === 1, 404, __('Ticket not found.'));

        $ticket = Ticket::with(['event', 'ticketType:id,name'])->where('ticket_code', $normalized)->first();
        abort_if(! $ticket || ! $ticket->event, 404, __('Ticket not found.'));

        return response()->json([
            'ticket_code' => $ticket->ticket_code,
            'ticket_number' => $ticket->ticket_number,
            'ticket_type' => $ticket->ticketType?->name,
            'status' => match (true) {
                (bool) $ticket->checkin => 'used',
                $ticket->isSold() => 'valid',
                default => 'not_assigned',
            },
            'event' => $ticket->event->publicPayload(Organization::get()),
        ]);
    }
}
