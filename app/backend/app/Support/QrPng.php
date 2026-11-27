<?php

namespace App\Support;

use chillerlan\QRCode\Common\EccLevel;
use chillerlan\QRCode\Output\QROutputInterface;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;

final class QrPng
{
    /** PNG bytes of a QR code (black on white, quiet zone included). */
    public static function make(string $data, int $scale = 8): string
    {
        $options = new QROptions([
            'outputType' => QROutputInterface::GDIMAGE_PNG,
            'outputBase64' => false,
            'eccLevel' => EccLevel::M,
            'scale' => $scale,
            'addQuietzone' => true,
            'quietzoneSize' => 2,
        ]);

        return (new QRCode($options))->render($data);
    }
}
