<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class BrandingController extends Controller
{
    public function show()
    {
        $defaults = [
            'primary' => '#ff5c8d',
            'secondary' => '#43d9ad',
            'background' => '#0b0c10',
            'logoUrl' => '',
        ];

        $branding = Setting::where('key', 'branding')->first();
        return response()->json($branding?->value ?: $defaults);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'primary' => ['nullable', 'string'],
            'secondary' => ['nullable', 'string'],
            'background' => ['nullable', 'string'],
            'logoUrl' => ['nullable', 'string'],
        ]);

        $branding = Setting::updateOrCreate(
            ['key' => 'branding'],
            ['value' => array_filter($data, fn ($v) => $v !== null)]
        );

        return response()->json($branding->value);
    }
}
