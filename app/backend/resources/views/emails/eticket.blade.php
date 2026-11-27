@php
    $when = $event->starts_at?->timezone(config('app.timezone'))->locale(app()->getLocale())->translatedFormat('l, j F Y, H:i');
    $place = collect([$event->venue, $event->city])->filter()->implode(', ');
@endphp
@component('emails.layout', ['org' => $org, 'message' => $message, 'title' => $event->name])
<h1 style="margin:0 0 6px 0;font-size:24px;line-height:1.25;color:#0f204b;">{{ $event->name }}</h1>
@if ($when)<p style="margin:0;color:#55656f;">{{ ucfirst($when) }}</p>@endif
@if ($place)<p style="margin:0 0 14px 0;color:#55656f;">{{ $place }}</p>@endif

<p style="margin:18px 0 6px 0;">{{ trans_choice('Here is your e-ticket.|Here are your :n e-tickets.', $tickets->count(), ['n' => $tickets->count()]) }}</p>
<p style="margin:0 0 18px 0;">{{ __('Show the QR code at the entrance, on your phone or printed. Each code is valid for one person, once.') }}</p>

@if ($event->eticket_message)
<p style="margin:0 0 18px 0;padding:12px 14px;background:#f0f9ff;border-radius:10px;white-space:pre-line;">{{ $event->eticket_message }}</p>
@endif

@foreach ($tickets as $ticket)
@php($url = $publicUrl.'/t/'.$ticket->ticket_code)
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 14px 0;border:1px solid #d5e0e6;border-radius:12px;">
<tr>
<td width="168" style="padding:12px;" valign="top">
<img src="{{ $message->embedData(\App\Support\QrPng::make($url, 6), 'qr-'.$ticket->ticket_code.'.png', 'image/png') }}" width="150" height="150" alt="QR {{ $ticket->ticket_code }}" style="display:block;border:0;width:150px;height:150px;">
</td>
<td style="padding:14px 14px 14px 4px;" valign="middle">
<div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#00aeef;font-weight:700;">{{ __('Guest') }}</div>
<div style="font-size:19px;font-weight:800;color:#24313a;">{{ $ticket->name }}</div>
<div style="margin-top:6px;font-family:Consolas,Menlo,monospace;font-size:15px;letter-spacing:.06em;">{{ $ticket->ticket_code }}</div>
<div style="font-size:12px;color:#55656f;">#{{ str_pad((string) $ticket->ticket_number, 3, '0', STR_PAD_LEFT) }}</div>
<div style="margin-top:10px;"><a href="{{ $url }}" style="display:inline-block;background:#0075a1;color:#ffffff;text-decoration:none;font-weight:700;padding:9px 14px;border-radius:9px;">{{ __('Open e-ticket') }}</a></div>
</td>
</tr>
</table>
@endforeach

<p style="margin:18px 0 0 0;color:#55656f;font-size:13px;">{{ __('Tip: save this email or take a screenshot of the QR codes, in case there is no signal at the venue.') }}</p>
@if ($event->photos_url || $donationUrl)
<p style="margin:14px 0 0 0;font-size:14px;">
@if ($event->photos_url)<a href="{{ $event->photos_url }}" style="color:#0075a1;font-weight:700;">{{ __('Event photos') }}</a>@endif
@if ($event->photos_url && $donationUrl) &nbsp;·&nbsp; @endif
@if ($donationUrl)<a href="{{ $donationUrl }}" style="color:#0075a1;font-weight:700;">{{ __('Support us with a donation') }}</a>@endif
</p>
@endif
@endcomponent
