<?php

namespace App\Mail;

use App\Models\Event;
use App\Support\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Collection;

class ETicketMail extends Mailable
{
    use Queueable;

    /**
     * @param  Collection<int, \App\Models\Ticket>  $tickets
     * @param  list<array{bytes: string, name: string, mime: string}>  $designs  designed e-ticket images rendered in the browser
     */
    public function __construct(
        public Event $event,
        public Collection $tickets,
        public array $designs = [],
        string $locale = 'ro',
    ) {
        $this->locale($locale ?: 'ro');
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: __('Your e-ticket: :event', ['event' => $this->event->name]));
    }

    public function content(): Content
    {
        $org = Organization::get();

        return new Content(view: 'emails.eticket', with: [
            'event' => $this->event,
            'tickets' => $this->tickets,
            'org' => $org,
            'publicUrl' => $org['public_url'],
            'donationUrl' => $this->event->donation_url ?: $org['donation_url'],
        ]);
    }

    public function attachments(): array
    {
        return array_map(
            fn (array $d) => Attachment::fromData(fn () => $d['bytes'], $d['name'])->withMime($d['mime']),
            $this->designs,
        );
    }
}
