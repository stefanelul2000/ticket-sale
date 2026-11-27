<?php

namespace Tests\Unit;

use App\Support\QrPng;
use PHPUnit\Framework\TestCase;

class QrPngTest extends TestCase
{
    public function test_it_returns_a_real_png(): void
    {
        $png = QrPng::make('https://ticket.example.org/t/K7M3P-9QXR2', 6);

        $this->assertSame("\x89PNG\r\n\x1a\n", substr($png, 0, 8));
        $info = getimagesizefromstring($png);
        $this->assertSame(IMAGETYPE_PNG, $info[2]);
        $this->assertGreaterThan(150, $info[0]);
    }
}
