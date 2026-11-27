<?php

namespace App\Http\Controllers;

use App\Mail\TestMail;
use App\Support\Organization;
use Illuminate\Support\Facades\Mail;
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
            'request_notify_email' => ['sometimes', 'nullable', 'email:rfc', 'max:190'],
        ]);

        $settings = Organization::save($data);
        $this->logAdminAction($request->user()?->id, 'settings.update', array_keys($data));

        return response()->json($settings);
    }

    /** Which mailer is active (never exposes secrets). */
    public function mailStatus()
    {
        $mailer = (string) config('mail.default');

        return response()->json([
            'mailer' => $mailer,
            'configured' => TicketRequestController::mailConfigured(),
            'from' => config('mail.from.address'),
            'sender' => $mailer === 'microsoft-graph' ? config('mail.mailers.microsoft-graph.sender') : null,
        ]);
    }

    public function testMail(Request $request)
    {
        $data = $request->validate(['to' => ['required', 'email:rfc', 'max:190']]);
        if (! TicketRequestController::mailConfigured()) {
            return response()->json(['message' => __('Email sending is not configured yet.')], 409);
        }
        try {
            Mail::to($data['to'])->send(new TestMail());
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => __('The email could not be sent: :error', ['error' => mb_substr($e->getMessage(), 0, 200)])], 502);
        }

        return response()->json(['sent' => true]);
    }
}
