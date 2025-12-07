<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EventController extends Controller
{
    public function index()
    {
        return Event::withCount([
            'ticketTypes',
            'tickets as tickets_generated',
            'tickets as tickets_sold' => function ($q) {
                $q->whereNotNull('sold_at');
            },
        ])->orderBy('starts_at')->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['name']);
        $event = Event::create($data);
        return response()->json(
            $event->loadCount([
                'ticketTypes',
                'tickets as tickets_generated',
                'tickets as tickets_sold' => function ($q) {
                    $q->whereNotNull('sold_at');
                },
            ]),
            201
        );
    }

    public function update(Request $request, int $eventId)
    {
        $event = Event::findOrFail($eventId);
        $data = $this->validated($request, $eventId);

        // Enforce capacity not below generated/sold counts
        if (array_key_exists('capacity', $data) && $data['capacity'] !== null) {
            $counts = $event->tickets()
                ->selectRaw('count(*) as generated_count, sum(case when sold_at is not null then 1 else 0 end) as sold_count')
                ->first();
            $generated = (int) ($counts->generated_count ?? 0);
            $sold = (int) ($counts->sold_count ?? 0);
            if ($data['capacity'] < $generated || $data['capacity'] < $sold) {
                return response()->json([
                    'message' => 'Capacity cannot be less than tickets already generated or sold.',
                    'generated' => $generated,
                    'sold' => $sold,
                ], 422);
            }
        }

        if (! isset($data['slug']) && isset($data['name'])) {
            $data['slug'] = $this->uniqueSlug($data['name'], $eventId);
        }
        $event->update($data);
        return $event->fresh()->loadCount([
            'ticketTypes',
            'tickets as tickets_generated',
            'tickets as tickets_sold' => function ($q) {
                $q->whereNotNull('sold_at');
            },
        ]);
    }

    public function destroy(int $eventId)
    {
        $event = Event::findOrFail($eventId);
        DB::transaction(function () use ($event) {
            // Hard delete everything related to this event.
            $event->tickets()->withTrashed()->forceDelete();
            $event->ticketTypes()->withTrashed()->forceDelete();
            $event->forceDelete();
        });
        return response()->json(['deleted' => true]);
    }

    private function uniqueSlug(string $base, ?int $ignoreId = null): string
    {
        $slugBase = Str::slug($base) ?: Str::random(6);
        $slug = $slugBase;
        $i = 1;
        while (
            Event::withTrashed()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $slugBase . '-' . $i;
            $i++;
        }
        return $slug;
    }

    private function validated(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:events,slug,' . ($id ?? 'NULL') . ',id'],
            'is_online' => ['boolean'],
            'venue' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'capacity' => ['nullable', 'integer', 'min:0'],
            'branding' => ['nullable', 'array'],
            'seo' => ['nullable', 'array'],
        ]);
    }
}
