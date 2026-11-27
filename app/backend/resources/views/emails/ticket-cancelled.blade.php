@component('emails.layout', ['org' => $org, 'message' => $message, 'title' => $event->name])
<h1 class="m-h1 d-head" style="margin:0 0 12px 0;font-size:22px;color:#0f204b;">{{ $event->name }}</h1>
<p style="margin:0 0 12px 0;">{{ trans_choice('The following e-ticket has been cancelled and can no longer be used at the entrance:|The following e-tickets have been cancelled and can no longer be used at the entrance:', count($tickets)) }}</p>
<ul style="margin:0 0 14px 18px;padding:0;">
@foreach ($tickets as $t)
<li>{{ $t['name'] ?: '—' }} · #{{ str_pad((string) $t['number'], 3, '0', STR_PAD_LEFT) }} · <span class="nolink" style="white-space:nowrap;font-family:Consolas,Menlo,monospace;">{{ $t['code'] }}</span></li>
@endforeach
</ul>
<p style="margin:0;">{{ __('If this is a mistake, simply reply to this email.') }}</p>
@endcomponent
