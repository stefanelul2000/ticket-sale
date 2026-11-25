<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\TicketType;
use App\Support\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

class EventController extends Controller
{
    #[OA\Get(
        path: '/events',
        summary: 'List events with ticket counts',
        security: [['sanctum' => []]],
        tags: ['Events'],
        responses: [
            new OA\Response(response: 200, description: 'Successful operation', content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/Event'))),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Requires role:4'),
        ]
    )]
    public function index()
    {
        return $this->withCounts(Event::query())
            ->orderByRaw('starts_at is null')
            ->orderByDesc('starts_at')
            ->orderByDesc('id')
            ->get();
    }

    public function show(int $eventId)
    {
        $event = $this->withCounts(Event::query())->findOrFail($eventId);
        $event->setRelation('ticketTypes', $event->ticketTypes()->orderBy('sort')->orderBy('id')->get());

        return response()->json($event->toArray() + [
            'public_link' => Organization::get()['public_url'].'/e/'.$event->slug,
        ]);
    }

    /**
     * Lightweight list for pickers (door, assigning, reports).
     */
    public function summary()
    {
        return $this->withCounts(Event::query())
            ->orderByRaw('starts_at is null')
            ->orderByDesc('starts_at')
            ->orderByDesc('id')
            ->get(['id', 'name', 'slug', 'starts_at', 'ends_at', 'venue', 'capacity', 'is_public']);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['name']);
        $event = Event::create($data);

        // Every event needs at least one ticket type; start with a sensible default.
        TicketType::create([
            'event_id' => $event->id,
            'name' => $request->input('default_ticket_type', __('Invitation')),
            'kind' => 'free',
            'price' => 0,
        ]);

        $this->logAdminAction($request->user()?->id, 'event.create', ['event_id' => $event->id, 'name' => $event->name]);

        return response()->json($this->withCounts(Event::query())->find($event->id), 201);
    }

    public function update(Request $request, int $eventId)
    {
        $event = Event::findOrFail($eventId);
        $data = $this->validated($request, $eventId, partial: true);

        if (array_key_exists('capacity', $data) && $data['capacity'] !== null) {
            $generated = $event->tickets()->withTrashed()->count();
            $assigned = $event->tickets()->whereNotNull('sold_at')->count();
            if ($data['capacity'] < $assigned) {
                return response()->json([
                    'message' => __('Capacity cannot be lower than the :n tickets already assigned.', ['n' => $assigned]),
                    'generated' => $generated,
                    'sold' => $assigned,
                ], 422);
            }
        }

        if (! empty($data['slug'])) {
            $data['slug'] = $this->uniqueSlug($data['slug'], $eventId);
        } else {
            unset($data['slug']);
        }

        $event->update($data);
        $this->logAdminAction($request->user()?->id, 'event.update', ['event_id' => $eventId, 'fields' => array_keys($data)]);

        return $this->withCounts(Event::query())->find($eventId);
    }

    /**
     * Copy an event (settings + ticket types, no tickets) — e.g. for next year's edition.
     */
    public function duplicate(Request $request, int $eventId)
    {
        $source = Event::with('ticketTypes')->findOrFail($eventId);

        $copy = DB::transaction(function () use ($source) {
            $copy = $source->replicate(['slug', 'starts_at', 'ends_at', 'is_public']);
            $copy->name = mb_substr($source->name.' ('.__('copy').')', 0, 255);
            $copy->slug = $this->uniqueSlug($copy->name);
            $copy->is_public = false;
            $copy->save();

            foreach ($source->ticketTypes as $type) {
                $newType = $type->replicate(['event_id']);
                $newType->event_id = $copy->id;
                $newType->save();
            }

            return $copy;
        });

        $this->logAdminAction($request->user()?->id, 'event.duplicate', ['from' => $source->id, 'event_id' => $copy->id]);

        return response()->json($this->withCounts(Event::query())->find($copy->id), 201);
    }

    public function destroy(Request $request, int $eventId)
    {
        $event = Event::findOrFail($eventId);

        $sold = $event->tickets()->whereNotNull('sold_at')->count();
        if ($sold > 0) {
            return response()->json([
                'message' => __('This event has :n assigned ticket(s) and cannot be deleted.', ['n' => $sold]),
            ], 409);
        }

        $templateImage = $event->print_template['image_path'] ?? null;

        DB::transaction(function () use ($event) {
            $event->tickets()->withTrashed()->forceDelete();
            $event->ticketTypes()->withTrashed()->forceDelete();
            $event->forceDelete();
        });
        if ($templateImage && str_starts_with($templateImage, 'templates/')) {
            $stillUsed = Event::withTrashed()->whereNotNull('print_template')->get(['id', 'print_template'])
                ->contains(fn (Event $e) => ($e->print_template['image_path'] ?? null) === $templateImage);
            if (! $stillUsed) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($templateImage);
            }
        }
        $this->logAdminAction($request->user()?->id, 'event.delete', ['event_id' => $eventId, 'name' => $event->name]);

        return response()->json(['deleted' => true]);
    }

    private function withCounts($query)
    {
        return $query->withCount([
            'ticketTypes',
            'tickets as tickets_generated',
            'tickets as tickets_sold' => fn ($q) => $q->whereNotNull('sold_at'),
            'tickets as tickets_checked_in' => fn ($q) => $q->where('checkin', true),
            'tickets as tickets_walk_in' => fn ($q) => $q->where('is_walk_in', true),
        ]);
    }

    private function uniqueSlug(string $base, ?int $ignoreId = null): string
    {
        $slugBase = Str::slug($base) ?: Str::lower(Str::random(6));
        $slugBase = mb_substr($slugBase, 0, 180);
        $slug = $slugBase;
        $i = 1;
        while (
            Event::withTrashed()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $slugBase.'-'.$i;
            $i++;
        }

        return $slug;
    }

    private function validated(Request $request, ?int $id = null, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$req, 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'slug' => ['nullable', 'string', 'max:180', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'is_online' => ['boolean'],
            'is_public' => ['boolean'],
            'venue' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'donation_url' => Organization::URL_RULE,
            'photos_url' => Organization::URL_RULE,
        ]);
    }
}
