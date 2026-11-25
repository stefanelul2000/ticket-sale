<?php

namespace Tests\Unit;

use App\Support\TicketCode;
use PHPUnit\Framework\TestCase;

class TicketCodeTest extends TestCase
{
    public function test_generated_codes_have_expected_shape(): void
    {
        for ($i = 0; $i < 200; $i++) {
            $code = TicketCode::generate();
            $this->assertMatchesRegularExpression('/^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{5}-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{5}$/', $code);
        }
    }

    public function test_codes_are_not_repeated(): void
    {
        $codes = [];
        for ($i = 0; $i < 5000; $i++) {
            $codes[] = TicketCode::generate();
        }
        $this->assertCount(5000, array_unique($codes));
    }

    public function test_normalize_accepts_scanner_and_keyboard_variants(): void
    {
        $this->assertSame('K7M3P-9QXR2', TicketCode::normalize('k7m3p9qxr2'));
        $this->assertSame('K7M3P-9QXR2', TicketCode::normalize("  K7M3P-9QXR2\r\n"));
        $this->assertSame('K7M3P-9QXR2', TicketCode::normalize('K7M3P 9QXR2'));
        $this->assertSame('5_001', TicketCode::normalize(' 5_001 '));
    }
}
