<?php

namespace App\Http\Controllers;

use App\Mail\ETicketMail;
use App\Mail\NewRequestMail;
use App\Mail\RequestDeclinedMail;
use App\Mail\TicketCancelledMail;
use App\Models\Event;
use App\Models\Ticket;
use App\Models\TicketActivityLog;
use App\Models\TicketRequest;
use App\Support\GuestCategory;
use App\Support\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * Online e-ticket requests: the public asks (up to N named guests), staff approve or decline,
 * approved tickets are assigned from the event's e-ticket pool and emailed.
 */
class TicketRequestController extends Controller
{
    private const NAME_RULE = ['required', 'string', 'max:120', 'not_regex:/[\r\n<>]/'];

    public static function mailConfigured(): bool
    {
        return ! in_array(config('mail.default'), ['log', null, ''], true);
    }

    // ---------------------------------------------------------------- public

    public function store(Request $request, string $slug)
    {
        $event = Event::where('slug', $slug)->first();
        abort_if(! $event || ! $event->requests_enabled, 404, __('Event not found.'));

        $max = max(1, min(10, (int) ($event->request_max ?: 4)));
        $data = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:190'],
            'phone' => ['nullable', 'string', 'max:25', 'regex:/^[0-9 +().\/-]{6,25}$/'],
            'attendees' => ['required', 'array', 'min:1', "max:{$max}"],
            'attendees.*.name' => self::NAME_RULE,
            'attendees.*.guest_category' => ['required', GuestCategory::rule()],
            'message' => ['nullable', 'string', 'max:500'],
            'consent' => ['accepted'],
            'locale' => ['nullable', 'in:ro,en'],
            'website' => ['nullable', 'string', 'max:200'], // honeypot: real people never fill it
        ], [
            'consent.accepted' => __('Tick the consent box to send your request.'),
            'consent.required' => __('Tick the consent box to send your request.'),
        ]);

        // Bots fill every field: pretend success, store nothing.
        if (! empty($data['website'])) {
            return response()->json(['status' => 'received'], 201);
        }

        $attendees = array_values(array_map(fn ($a) => [
            'name' => trim(preg_replace('/\s+/u', ' ', $a['name'])),
            'guest_category' => $a['guest_category'],
        ], $data['attendees']));
        $email = mb_strtolower(trim($data['email']));

        $result = DB::transaction(function () use ($event, $data, $attendees, $email, $request) {
            Event::whereKey($event->id)->lockForUpdate()->first();

            if (TicketRequest::where('event_id', $event->id)->where('email', $email)->where('status', 'pending')->exists()) {
                return response()->json(['message' => __('You already have a request waiting for approval. We will email you soon.'), 'result' => 'duplicate'], 409);
            }
            $open = $event->eticketsOpen();
            if ($open < count($attendees)) {
                return response()->json([
                    'message' => $open > 0
                        ? __('Only :n e-tickets are still available.', ['n' => $open])
                        : __('All e-tickets have been reserved.'),
                    'result' => 'full',
                    'available' => $open,
                ], 409);
            }

            return TicketRequest::create([
                'event_id' => $event->id,
                'email' => $email,
                'phone' => isset($data['phone']) ? trim($data['phone']) : null,
                'attendees' => $attendees,
                'quantity' => count($attendees),
                'message' => isset($data['message']) ? trim($data['message']) : null,
                'locale' => $data['locale'] ?? app()->getLocale(),
                'ip_hash' => hash_hmac('sha256', (string) $request->ip(), (string) config('app.key')),
            ]);
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        $notify = Organization::get()['request_notify_email'] ?? null;
        if ($notify && self::mailConfigured()) {
            try {
                Mail::to($notify)->send(new NewRequestMail($result->load('event')));
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return response()->json(['status' => 'received'], 201);
    }

    // ---------------------------------------------------------------- staff

    public function index(Request $request, int $eventId)
    {
        $event = Event::findOrFail($eventId);
        $status = $request->validate(['status' => ['nullable', 'in:pending,approved,rejected,cancelled,all']])['status'] ?? 'pending';

        $requests = TicketRequest::with(['tickets:id,request_id,ticket_code,ticket_number,name,checkin,checked_in_at', 'decider:id,name'])
            ->where('event_id', $event->id)
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderByRaw("case status when 'pending' then 0 else 1 end")
            ->orderByDesc('id')
            ->limit(500)
            ->get();

        $counts = TicketRequest::where('event_id', $event->id)->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');

        return response()->json([
            'requests' => $requests,
            'counts' => [
                'pending' => (int) ($counts['pending'] ?? 0),
                'approved' => (int) ($counts['approved'] ?? 0),
                'rejected' => (int) ($counts['rejected'] ?? 0),
                'cancelled' => (int) ($counts['cancelled'] ?? 0),
            ],
            'pool' => [
                'from' => $event->eticket_from,
                'to' => $event->eticket_to,
                'free' => $event->eticketPool()->count(),
                'open' => $event->eticketsOpen(),
            ],
            'mail_configured' => self::mailConfigured(),
        ]);
    }

    public function approve(Request $request, int $requestId)
    {
        $data = $request->validate([
            'attendees' => ['required', 'array', 'min:1', 'max:10'],
            'attendees.*.name' => self::NAME_RULE,
            'attendees.*.guest_category' => ['nullable', GuestCategory::rule()],
        ]);
        $guests = array_values(array_map(fn ($a) => [
            'name' => trim($a['name']),
            'guest_category' => $a['guest_category'] ?? null,
        ], $data['attendees']));
        $names = array_column($guests, 'name');
        $userId = $request->user()->id;

        $result = DB::transaction(function () use ($requestId, $names, $guests, $userId) {
            $req = TicketRequest::whereKey($requestId)->lockForUpdate()->firstOrFail();
            if ($req->status !== 'pending') {
                return response()->json(['message' => __('This request was already handled.')], 409);
            }
            if (count($names) > $req->quantity) {
                return response()->json(['message' => __('You can approve at most :n tickets for this request.', ['n' => $req->quantity])], 422);
            }

            $event = Event::whereKey($req->event_id)->lockForUpdate()->firstOrFail();
            if (! $event->hasEticketRange()) {
                return response()->json(['message' => __('Set the e-ticket number range (e.g. 101–150) in the event settings first.')], 422);
            }
            $free = $event->eticketPool()->orderBy('ticket_number')->limit(count($names))->lockForUpdate()->get();
            if ($free->count() < count($names)) {
                return response()->json(['message' => __('Only :n e-tickets are still available.', ['n' => $free->count()])], 422);
            }

            $now = Carbon::now();
            foreach ($free->values() as $i => $ticket) {
                Ticket::whereKey($ticket->id)->update([
                    'name' => $guests[$i]['name'],
                    'guest_category' => $guests[$i]['guest_category'],
                    'user_id' => $userId,
                    'sold_at' => $now,
                    'request_id' => $req->id,
                    'updated_at' => $now,
                ]);
                TicketActivityLog::create([
                    'user_id' => $userId,
                    'event_id' => $event->id,
                    'ticket_code' => $ticket->ticket_code,
                    'action' => 'sell',
                    'status' => 'E-ticket approved',
                    'success' => true,
                    'attendee_name' => $names[$i],
                ]);
            }

            $req->update([
                'status' => 'approved',
                'attendees' => $guests,
                'decided_by' => $userId,
                'decided_at' => $now,
            ]);

            return $req;
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        $this->logAdminAction($userId, 'request.approve', ['request_id' => $result->id, 'tickets' => count($names)]);

        return response()->json($result->load(['tickets:id,request_id,ticket_code,ticket_number,name,checkin', 'decider:id,name']));
    }

    /**
     * Email the e-tickets. Optional "designs[]": the event's designed e-ticket images rendered
     * in the browser (JPEG/PNG, small), attached to the email.
     */
    public function send(Request $request, int $requestId)
    {
        $req = TicketRequest::with('event')->findOrFail($requestId);
        if ($req->status !== 'approved') {
            return response()->json(['message' => __('Approve the request first.')], 409);
        }
        if (! self::mailConfigured()) {
            return response()->json(['message' => __('Email sending is not configured yet.'), 'result' => 'mail_not_configured'], 409);
        }

        $request->validate([
            'designs' => ['nullable', 'array', 'max:10'],
            'designs.*' => ['file', 'mimes:jpg,jpeg,png', 'max:1024'],
        ]);

        $tickets = $req->tickets()->orderBy('ticket_number')->get();
        if ($tickets->isEmpty()) {
            return response()->json(['message' => __('This request has no tickets anymore.')], 409);
        }

        $designs = [];
        foreach ($request->file('designs', []) as $i => $file) {
            $info = @getimagesize($file->getRealPath());
            if (! $info || ! in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG], true)) {
                return response()->json(['message' => __('The file is not a valid image.')], 422);
            }
            $isPng = $info[2] === IMAGETYPE_PNG;
            $designs[] = [
                'bytes' => (string) file_get_contents($file->getRealPath()),
                'name' => sprintf('e-bilet-%d.%s', $i + 1, $isPng ? 'png' : 'jpg'),
                'mime' => $isPng ? 'image/png' : 'image/jpeg',
            ];
        }

        try {
            Mail::to($req->email)->send(new ETicketMail($req, $tickets, $designs));
        } catch (\Throwable $e) {
            report($e);
            $req->update(['send_error' => mb_substr($e->getMessage(), 0, 500)]);

            return response()->json(['message' => __('The email could not be sent: :error', ['error' => mb_substr($e->getMessage(), 0, 200)])], 502);
        }

        $req->update(['sent_at' => Carbon::now(), 'send_count' => $req->send_count + 1, 'send_error' => null]);
        $this->logAdminAction($request->user()?->id, 'request.send', ['request_id' => $req->id, 'tickets' => $tickets->count()]);

        return response()->json($req->fresh()->load(['tickets:id,request_id,ticket_code,ticket_number,name,checkin', 'decider:id,name']));
    }

    public function reject(Request $request, int $requestId)
    {
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
            'notify' => ['boolean'],
        ]);

        $req = TicketRequest::with('event')->findOrFail($requestId);
        if ($req->status !== 'pending') {
            return response()->json(['message' => __('This request was already handled.')], 409);
        }
        $req->update([
            'status' => 'rejected',
            'decision_note' => $data['note'] ?? null,
            'decided_by' => $request->user()->id,
            'decided_at' => Carbon::now(),
        ]);

        $mailed = false;
        if (($data['notify'] ?? false) && self::mailConfigured()) {
            try {
                Mail::to($req->email)->send(new RequestDeclinedMail($req));
                $mailed = true;
            } catch (\Throwable $e) {
                report($e);
            }
        }
        $this->logAdminAction($request->user()->id, 'request.reject', ['request_id' => $req->id, 'notified' => $mailed]);

        return response()->json(['rejected' => true, 'notified' => $mailed]);
    }

    /** Withdraw an approved request: its unused tickets go back to the e-ticket pool. */
    public function cancel(Request $request, int $requestId)
    {
        $notify = (bool) ($request->validate(['notify' => ['nullable', 'boolean']])['notify'] ?? false);
        $req = TicketRequest::with('event')->findOrFail($requestId);
        if ($req->status !== 'approved') {
            return response()->json(['message' => __('Only approved requests can be cancelled.')], 409);
        }
        $cancelledTickets = $req->tickets()->where('checkin', false)->orderBy('ticket_number')->get()
            ->map(fn (Ticket $t) => ['name' => $t->name, 'number' => $t->ticket_number, 'code' => $t->ticket_code])->all();

        $released = DB::transaction(function () use ($req) {
            $n = Ticket::where('request_id', $req->id)->where('checkin', false)->update([
                'name' => null,
                'guest_category' => null,
                'user_id' => null,
                'sold_at' => null,
                'request_id' => null,
                'updated_at' => Carbon::now(),
            ]);
            $req->update(['status' => 'cancelled']);

            return $n;
        });
        $notified = false;
        if ($notify && $cancelledTickets && self::mailConfigured()) {
            try {
                Mail::to($req->email)->send(new TicketCancelledMail($req->event, $cancelledTickets, $req->locale));
                $notified = true;
            } catch (\Throwable $e) {
                report($e);
            }
        }
        $this->logAdminAction($request->user()->id, 'request.cancel', ['request_id' => $req->id, 'released' => $released, 'notified' => $notified]);

        return response()->json(['cancelled' => true, 'released' => $released, 'notified' => $notified]);
    }
}
