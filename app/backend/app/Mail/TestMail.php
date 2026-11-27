<?php

namespace App\Mail;

use App\Support\Organization;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class TestMail extends Mailable
{
    public function envelope(): Envelope
    {
        return new Envelope(subject: __('Test email from the ticket platform'));
    }

    public function content(): Content
    {
        return new Content(htmlString: '<p>'.e(__('Email sending works.')).'</p><p>'.e(Organization::get()['name']).'</p>');
    }
}
