<!doctype html>
<html lang="{{ app()->getLocale() }}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ $title ?? '' }}</title>
</head>
<body style="margin:0;padding:0;background:#f6f9fa;font-family:Manrope,Segoe UI,Helvetica,Arial,sans-serif;color:#24313a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f9fa;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4ebef;">
<tr><td style="height:6px;background:#00aeef;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:22px 28px 8px 28px;">
<table role="presentation" cellspacing="0" cellpadding="0"><tr>
@php($logo = public_path('brand/as-mark-192.png'))
@if (file_exists($logo))
<td style="padding-right:12px;"><img src="{{ $message->embed($logo) }}" width="44" height="44" alt="" style="display:block;border:0;"></td>
@endif
<td style="font-size:18px;font-weight:800;color:#0f204b;">{{ $org['name'] }}</td>
</tr></table>
</td></tr>
<tr><td style="padding:8px 28px 28px 28px;font-size:15px;line-height:1.55;">
{!! $slot !!}
</td></tr>
<tr><td style="padding:16px 28px;background:#f4f7f9;font-size:12px;color:#55656f;border-top:1px solid #e4ebef;">
{{ $org['name'] }} · <a href="{{ $org['website_url'] }}" style="color:#0075a1;">{{ preg_replace('#^https?://#', '', $org['website_url']) }}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
