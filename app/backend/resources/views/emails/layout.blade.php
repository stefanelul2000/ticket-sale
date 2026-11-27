<!doctype html>
<html lang="{{ app()->getLocale() }}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
{{-- Stop mail apps from turning dates, times and addresses into blue links. --}}
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{ $title ?? '' }}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  a[x-apple-data-detectors], .nolink a, u + #body a.nolink { color: inherit !important; text-decoration: none !important; font: inherit !important; }
  @media only screen and (max-width: 480px) {
    .m-pad { padding-left: 18px !important; padding-right: 18px !important; }
    .m-outer { padding: 12px 6px !important; }
    .m-h1 { font-size: 23px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .d-bg { background: #0e1418 !important; }
    .d-card { background: #161e23 !important; border-color: #2a363e !important; }
    .d-soft { background: #1d272d !important; border-color: #2a363e !important; }
    .d-text { color: #e3eaee !important; }
    .d-muted { color: #9fb0ba !important; }
    .d-head { color: #ffffff !important; }
    .d-accent { color: #4fc8f5 !important; }
  }
  [data-ogsc] .d-bg { background: #0e1418 !important; }
  [data-ogsc] .d-card { background: #161e23 !important; border-color: #2a363e !important; }
  [data-ogsc] .d-soft { background: #1d272d !important; border-color: #2a363e !important; }
  [data-ogsc] .d-text { color: #e3eaee !important; }
  [data-ogsc] .d-muted { color: #9fb0ba !important; }
  [data-ogsc] .d-head { color: #ffffff !important; }
  [data-ogsc] .d-accent { color: #4fc8f5 !important; }
</style>
</head>
<body id="body" class="d-bg" style="margin:0;padding:0;background:#f2f6f8;font-family:Manrope,'Segoe UI',Helvetica,Arial,sans-serif;color:#24313a;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="d-bg" style="background:#f2f6f8;">
<tr><td align="center" class="m-outer" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="d-card" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e1e9ee;">
<tr><td style="height:6px;background:#00aeef;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td class="m-pad" style="padding:22px 28px 6px 28px;">
<table role="presentation" cellspacing="0" cellpadding="0"><tr>
@php($logo = public_path('brand/as-mark-192.png'))
@if (file_exists($logo))
<td style="padding-right:12px;" valign="middle"><img src="{{ $message->embed($logo) }}" width="40" height="40" alt="" style="display:block;border:0;border-radius:50%;"></td>
@endif
<td valign="middle" class="d-head" style="font-size:16px;font-weight:800;color:#0f204b;">{{ $org['name'] }}</td>
</tr></table>
</td></tr>
<tr><td class="m-pad d-text" style="padding:10px 28px 28px 28px;font-size:15px;line-height:1.55;color:#24313a;">
{!! $slot !!}
</td></tr>
<tr><td class="m-pad d-soft d-muted" style="padding:16px 28px;background:#f4f7f9;font-size:12px;color:#55656f;border-top:1px solid #e1e9ee;">
{{ $org['name'] }} · <a href="{{ $org['website_url'] }}" class="d-accent" style="color:#0075a1;">{{ preg_replace('#^https?://#', '', $org['website_url']) }}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
