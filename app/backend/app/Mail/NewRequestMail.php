<?php

namespace App\Mail;

use App\Models\TicketRequest;
use App\Support\Organization;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Notification to the organisation: a new e-ticket request is waiting for approval. */
class NewRequestMail extends Mailable
{
    public function __construct(public TicketRequest $ticketRequest)
    {
        $this->locale('ro');
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: __('New ticket request (:n) – :event', ['n' => $this->ticketRequest->quantity, 'event' => $this->ticketRequest->event->name]));
    }

    public function content(): Content
    {
        $org = Organization::get();

        return new Content(view: 'emails.new-request', with: [
            'req' => $this->ticketRequest,
            'event' => $this->ticketRequest->event,
            'org' => $org,
            'link' => $org['public_url'].'/events/'.$this->ticketRequest->event_id.'?tab=requests',
        ]);
    }
}
