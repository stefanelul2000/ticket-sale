<?php

namespace App\Support;

/**
 * Random, non-sequential ticket codes, e.g. "K7M3P-9QXR2".
 *
 * Alphabet avoids look-alike characters (0/O, 1/I/L, U) so codes can be typed by
 * hand when a barcode is damaged. 30^10 ≈ 5.9e14 combinations: guessing a valid
 * code is not feasible.
 */
final class TicketCode
{
    public const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
    public const LENGTH = 10;
    public const GROUP = 5;

    public static function generate(): string
    {
        $max = strlen(self::ALPHABET) - 1;
        $raw = '';
        for ($i = 0; $i < self::LENGTH; $i++) {
            $raw .= self::ALPHABET[random_int(0, $max)];
        }

        return self::format($raw);
    }

    /**
     * Normalise scanner / keyboard input to the stored form.
     * Accepts lower case, missing or extra separators, surrounding whitespace and the
     * public ticket URL encoded in the QR code.
     * Input that does not look like a new-style code is returned trimmed (legacy codes).
     */
    public static function normalize(string $input): string
    {
        $trimmed = trim($input);

        // QR codes on invitations carry the public URL (https://host/t/CODE): keep only the code.
        if (preg_match('~/t/([A-Za-z0-9_-]{3,32})/?(?:[?#].*)?$~', $trimmed, $m)) {
            $trimmed = $m[1];
        }
        $compact = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $trimmed) ?? '');

        if (strlen($compact) === self::LENGTH && strspn($compact, self::ALPHABET) === self::LENGTH) {
            return self::format($compact);
        }

        return $trimmed;
    }

    private static function format(string $raw): string
    {
        return substr($raw, 0, self::GROUP).'-'.substr($raw, self::GROUP);
    }
}
