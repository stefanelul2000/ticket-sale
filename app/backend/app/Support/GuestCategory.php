<?php

namespace App\Support;

/**
 * Optional "who is this guest" tag recorded when an invitation is assigned.
 * Labels live in the frontend (ro/en); the API only stores these keys.
 */
final class GuestCategory
{
    public const ALL = ['parent', 'family', 'friend', 'guest', 'partner', 'press', 'other'];

    public static function rule(): string
    {
        return 'in:'.implode(',', self::ALL);
    }
}
