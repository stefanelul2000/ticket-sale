<?php

namespace App\Mail;

use App\Models\Event;
use App\Support\Organization;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Tells an e-ticket holder that their e-ticket(s) were cancelled. */
class TicketCancelledMail extends Mailable
{
    /**
     * @param  list<array{name: ?string, number: int, code: string}>  $tickets
     */
    public function __construct(public Event $event, public array $tickets, string $locale = 'ro')
    {
        $this->locale($locale ?: 'ro');
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: __('Your e-ticket was cancelled: :event', ['event' => $this->event->name]));
    }

    public function content(): Content
    {
        return new Content(view: 'emails.ticket-cancelled', with: [
            'event' => $this->event,
            'tickets' => $this->tickets,
            'org' => Organization::get(),
        ]);
    }
}
