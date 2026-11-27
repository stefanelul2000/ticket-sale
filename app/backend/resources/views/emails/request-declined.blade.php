@component('emails.layout', ['org' => $org, 'message' => $message, 'title' => $event->name])
<h1 style="margin:0 0 12px 0;font-size:22px;color:#0f204b;">{{ $event->name }}</h1>
<p style="margin:0 0 12px 0;">{{ __('Thank you for your interest. Unfortunately we cannot send you an e-ticket for this event.') }}</p>
@if ($note)
<p style="margin:0 0 12px 0;padding:12px 14px;background:#f4f7f9;border-radius:10px;white-space:pre-line;">{{ $note }}</p>
@endif
<p style="margin:0;">{{ __('We hope to see you at one of our next events!') }}</p>
@endcomponent
