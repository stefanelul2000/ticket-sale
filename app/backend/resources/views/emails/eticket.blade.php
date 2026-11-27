@php
    $when = $event->starts_at?->timezone(config('app.timezone'))->locale(app()->getLocale())->translatedFormat('l, j F Y, H:i');
    $place = collect([$event->venue, $event->city])->filter()->implode(', ');
@endphp
@component('emails.layout', ['org' => $org, 'message' => $message, 'title' => $event->name])
<h1 class="m-h1 d-head" style="margin:0 0 14px 0;font-size:26px;line-height:1.2;color:#0f204b;">{{ $event->name }}</h1>

@if ($when || $place)
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="nolink" style="margin:0 0 18px 0;font-size:15px;">
@if ($when)
<tr>
<td width="64" valign="top" class="d-muted" style="padding:2px 0;color:#55656f;font-size:13px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">{{ __('When') }}</td>
<td valign="top" class="d-text" style="padding:2px 0;color:#24313a;font-weight:600;">{{ ucfirst($when) }}</td>
</tr>
@endif
@if ($place)
<tr>
<td width="64" valign="top" class="d-muted" style="padding:2px 0;color:#55656f;font-size:13px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">{{ __('Where') }}</td>
<td valign="top" class="d-text" style="padding:2px 0;color:#24313a;font-weight:600;">{{ $place }}</td>
</tr>
@endif
</table>
@endif

<p style="margin:0 0 6px 0;font-size:17px;font-weight:700;" class="d-head">{{ trans_choice('Here is your e-ticket.|Here are your :n e-tickets.', $tickets->count(), ['n' => $tickets->count()]) }}</p>
<p class="d-muted" style="margin:0 0 18px 0;color:#55656f;">{{ __('Show the QR code at the entrance, on your phone or printed. Each code is valid for one person, once.') }}</p>

@if ($event->eticket_message)
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px 0;"><tr>
<td class="d-soft d-text nolink" style="padding:14px 16px;background:#eef8fd;border-left:4px solid #00aeef;border-radius:10px;white-space:pre-line;color:#24313a;">{{ $event->eticket_message }}</td>
</tr></table>
@endif

@foreach ($tickets as $ticket)
@php($url = $publicUrl.'/t/'.$ticket->ticket_code)
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="d-soft" style="margin:0 0 16px 0;border:1px solid #d5e0e6;border-radius:16px;background:#f8fbfc;">
<tr><td align="center" style="padding:20px 16px 4px 16px;">
<div class="d-accent" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#0090c6;font-weight:800;">{{ __('Guest') }}</div>
<div class="d-head" style="margin-top:4px;font-size:22px;line-height:1.25;font-weight:800;color:#24313a;">{{ $ticket->name }}</div>
</td></tr>
<tr><td align="center" style="padding:12px 16px 6px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;"><tr><td style="padding:12px;background:#ffffff;border-radius:12px;">
<img src="{{ $message->embedData(\App\Support\QrPng::make($url, 8), 'qr-'.$ticket->ticket_code.'.png', 'image/png') }}" width="210" height="210" alt="QR {{ $ticket->ticket_code }}" style="display:block;border:0;width:210px;height:210px;">
</td></tr></table>
</td></tr>
<tr><td align="center" class="nolink" style="padding:8px 16px 0 16px;">
<span class="d-head" style="font-family:Consolas,Menlo,'Courier New',monospace;font-size:19px;font-weight:700;letter-spacing:.08em;white-space:nowrap;color:#24313a;">{{ $ticket->ticket_code }}</span>
<span class="d-muted" style="white-space:nowrap;font-size:14px;color:#55656f;">&nbsp;·&nbsp;#{{ str_pad((string) $ticket->ticket_number, 3, '0', STR_PAD_LEFT) }}</span>
</td></tr>
<tr><td align="center" style="padding:16px 16px 20px 16px;">
<a href="{{ $url }}" style="display:inline-block;background:#0075a1;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:12px 26px;border-radius:10px;white-space:nowrap;">{{ __('Open e-ticket') }}</a>
</td></tr>
</table>
@endforeach

<p class="d-muted" style="margin:18px 0 0 0;color:#55656f;font-size:13px;">{{ __('Tip: save this email or take a screenshot of the QR codes, in case there is no signal at the venue.') }}</p>
@if ($event->photos_url || $donationUrl)
<p style="margin:16px 0 0 0;font-size:14px;line-height:2;">
@if ($event->photos_url)<a href="{{ $event->photos_url }}" class="d-accent" style="color:#0075a1;font-weight:700;white-space:nowrap;">{{ __('Event photos') }}</a>@endif
@if ($event->photos_url && $donationUrl) &nbsp;·&nbsp; @endif
@if ($donationUrl)<a href="{{ $donationUrl }}" class="d-accent" style="color:#0075a1;font-weight:700;white-space:nowrap;">{{ __('Support us with a donation') }}</a>@endif
</p>
@endif
@endcomponent
