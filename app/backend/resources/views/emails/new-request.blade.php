@component('emails.layout', ['org' => $org, 'message' => $message, 'title' => $event->name])
<h1 class="m-h1 d-head" style="margin:0 0 12px 0;font-size:20px;color:#0f204b;">{{ __('New ticket request') }} – {{ $event->name }}</h1>
<p style="margin:0 0 6px 0;"><strong>{{ __('Guests') }}:</strong></p>
<ul style="margin:0 0 10px 18px;padding:0;">
@foreach ($req->guestList() as $g)
<li>{{ $g['name'] }}@if ($g['guest_category']) — {{ \App\Support\GuestCategory::label($g['guest_category']) }}@endif</li>
@endforeach
</ul>
<p style="margin:0 0 6px 0;"><strong>Email:</strong> {{ $req->email }}@if ($req->phone) · {{ $req->phone }}@endif</p>
@if ($req->message)<p style="margin:0 0 12px 0;white-space:pre-line;">{{ $req->message }}</p>@endif
<p style="margin:16px 0 0 0;"><a href="{{ $link }}" style="display:inline-block;background:#0075a1;color:#ffffff;text-decoration:none;font-weight:700;padding:9px 14px;border-radius:9px;">{{ __('Review the request') }}</a></p>
@endcomponent
