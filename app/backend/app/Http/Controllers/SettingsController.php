<?php

namespace App\Http\Controllers;

use App\Support\Organization;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function show()
    {
        return response()->json(Organization::get());
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'website_url' => ['sometimes', ...Organization::URL_RULE],
            'donation_url' => ['sometimes', ...Organization::URL_RULE],
            'public_url' => ['sometimes', 'required', 'string', 'max:255', 'url:https,http', 'regex:#^https?://[^/?\#]+$#'],
        ]);

        $settings = Organization::save($data);
        $this->logAdminAction($request->user()?->id, 'settings.update', array_keys($data));

        return response()->json($settings);
    }
}
