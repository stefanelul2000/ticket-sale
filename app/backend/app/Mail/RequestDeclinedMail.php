<?php

namespace App\Mail;

use App\Models\TicketRequest;
use App\Support\Organization;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class RequestDeclinedMail extends Mailable
{
    public function __construct(public TicketRequest $ticketRequest)
    {
        $this->locale($ticketRequest->locale ?: 'ro');
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: __('About your ticket request: :event', ['event' => $this->ticketRequest->event->name]));
    }

    public function content(): Content
    {
        return new Content(view: 'emails.request-declined', with: [
            'event' => $this->ticketRequest->event,
            'note' => $this->ticketRequest->decision_note,
            'org' => Organization::get(),
        ]);
    }
}
