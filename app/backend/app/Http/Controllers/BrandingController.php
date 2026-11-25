<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class BrandingController extends Controller
{
    public const COLOR_REGEX = '/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/';

    public const DEFAULTS = [
        'primary' => '#ff5c8d',
        'secondary' => '#43d9ad',
        'background' => '#0b0c10',
        'logoUrl' => '',
    ];

    public function show()
    {
        try {
            $value = Setting::where('key', 'branding')->first()?->value ?? [];
        } catch (\Throwable $e) {
            $value = [];
        }

        return response()->json(array_merge(self::DEFAULTS, is_array($value) ? $value : []));
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'primary' => ['nullable', 'string', 'regex:'.self::COLOR_REGEX],
            'secondary' => ['nullable', 'string', 'regex:'.self::COLOR_REGEX],
            'background' => ['nullable', 'string', 'regex:'.self::COLOR_REGEX],
            // Uploaded logos are served from /storage; external logos must be https.
            'logoUrl' => ['nullable', 'string', 'max:2048', 'regex:#^(/storage/[A-Za-z0-9._/-]+|https://\S+)$#'],
        ]);

        $branding = self::merge($data, removeEmpty: ['logoUrl']);
        $this->logAdminAction($request->user()?->id, 'branding.update', array_keys($data));

        return response()->json($branding);
    }

    /**
     * Merge keys into the stored branding instead of replacing the whole setting.
     *
     * @param  list<string>  $removeEmpty  keys that are cleared when sent as null/empty
     */
    public static function merge(array $changes, array $removeEmpty = []): array
    {
        $setting = Setting::firstOrNew(['key' => 'branding']);
        $value = is_array($setting->value) ? $setting->value : [];

        foreach ($changes as $key => $val) {
            if ($val === null || $val === '') {
                if (in_array($key, $removeEmpty, true)) {
                    unset($value[$key]);
                }
                continue;
            }
            $value[$key] = $val;
        }

        $setting->value = $value;
        $setting->save();

        return array_merge(self::DEFAULTS, $value);
    }
}
