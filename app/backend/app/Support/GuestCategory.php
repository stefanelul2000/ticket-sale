<?php

namespace App\Support;

/**
 * Optional "who is this guest" tag recorded when an invitation is assigned.
 * Labels live in the frontend (ro/en); the API only stores these keys.
 */
final class GuestCategory
{
    public const ALL = ['parent', 'family', 'friend', 'guest', 'partner', 'press', 'other'];

    public const LABELS = [
        'ro' => ['parent' => 'Părinte', 'family' => 'Familie', 'friend' => 'Prieten', 'guest' => 'Invitat oficial', 'partner' => 'Partener / sponsor', 'press' => 'Presă', 'other' => 'Altul'],
        'en' => ['parent' => 'Parent', 'family' => 'Family', 'friend' => 'Friend', 'guest' => 'Official guest', 'partner' => 'Partner / sponsor', 'press' => 'Press', 'other' => 'Other'],
    ];

    public static function rule(): string
    {
        return 'in:'.implode(',', self::ALL);
    }

    public static function label(?string $key, ?string $locale = null): string
    {
        $locale = $locale ?: app()->getLocale();

        return self::LABELS[$locale][$key] ?? self::LABELS['ro'][$key] ?? '—';
    }
}
