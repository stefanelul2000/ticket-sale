<?php

namespace App\Support;

use App\Models\Setting;

/**
 * Organisation-wide settings (stored in settings.key = "organization").
 */
final class Organization
{
    public const URL_RULE = ['nullable', 'string', 'max:2048', 'url:http,https'];

    public static function defaults(): array
    {
        return [
            'name' => 'Asociația Atelier Săcelean',
            'website_url' => 'https://atelier-sacelean.ro',
            'donation_url' => 'https://atelier-sacelean.ro/donate',
            // Base URL printed in invitation QR codes (https://host/t/CODE).
            'public_url' => rtrim((string) config('app.url'), '/'),
        ];
    }

    public static function get(): array
    {
        try {
            $stored = Setting::where('key', 'organization')->first()?->value;
        } catch (\Throwable $e) {
            $stored = null;
        }

        $values = array_merge(self::defaults(), is_array($stored) ? array_filter($stored, fn ($v) => $v !== null && $v !== '') : []);
        $values['public_url'] = rtrim($values['public_url'], '/');

        return $values;
    }

    public static function save(array $changes): array
    {
        $setting = Setting::firstOrNew(['key' => 'organization']);
        $value = is_array($setting->value) ? $setting->value : [];
        foreach ($changes as $key => $val) {
            $value[$key] = $val;
        }
        $setting->value = $value;
        $setting->save();

        return self::get();
    }
}
