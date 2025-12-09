<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

class EventController extends Controller
{
    #[OA\Get(
        path: '/events',
        summary: 'Get a list of all events with ticket counts',
        security: [['sanctum' => []]],
        tags: ['Events'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Successful operation',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/Event')
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized (requires role:4)'),
        ]
    )]
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

    #[OA\Post(
        path: '/events',
        summary: 'Create a new event',
        security: [['sanctum' => []]],
        tags: ['Events'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Summer Festival', minLength: 1, maxLength: 255),
                    new OA\Property(property: 'slug', type: 'string', example: 'summer-festival', nullable: true, maxLength: 255),
                    new OA\Property(property: 'is_online', type: 'boolean', example: false),
                    new OA\Property(property: 'venue', type: 'string', nullable: true, example: 'Central Park', maxLength: 255),
                    new OA\Property(property: 'city', type: 'string', nullable: true, example: 'New York', maxLength: 255),
                    new OA\Property(property: 'country', type: 'string', nullable: true, example: 'USA', maxLength: 255),
                    new OA\Property(property: 'starts_at', type: 'string', format: 'date-time', nullable: true, example: '2025-07-01T10:00:00Z'),
                    new OA\Property(property: 'ends_at', type: 'string', format: 'date-time', nullable: true, example: '2025-07-03T22:00:00Z'),
                    new OA\Property(property: 'capacity', type: 'integer', nullable: true, example: 5000, minimum: 0),
                    new OA\Property(property: 'branding', type: 'object', nullable: true, description: 'JSON object for branding details'),
                    new OA\Property(property: 'seo', type: 'object', nullable: true, description: 'JSON object for SEO details'),
                ],
                required: ['name']
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Event created successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/Event')
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized (requires role:4)'),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
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

    #[OA\Patch(
        path: '/events/{eventId}',
        summary: 'Update an existing event',
        security: [['sanctum' => []]],
        tags: ['Events'],
        parameters: [
            new OA\Parameter(
                name: 'eventId',
                in: 'path',
                description: 'ID of the event to update',
                required: true,
                schema: new OA\Schema(type: 'integer', format: 'int64', example: 1)
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Updated Festival Name', minLength: 1, maxLength: 255),
                    new OA\Property(property: 'slug', type: 'string', example: 'updated-festival-name', nullable: true, maxLength: 255),
                    new OA\Property(property: 'is_online', type: 'boolean', example: false),
                    new OA\Property(property: 'venue', type: 'string', nullable: true, example: 'New Central Park', maxLength: 255),
                    new OA\Property(property: 'city', type: 'string', nullable: true, example: 'New York', maxLength: 255),
                    new OA\Property(property: 'country', type: 'string', nullable: true, example: 'USA', maxLength: 255),
                    new OA\Property(property: 'starts_at', type: 'string', format: 'date-time', nullable: true, example: '2025-07-01T10:00:00Z'),
                    new OA\Property(property: 'ends_at', type: 'string', format: 'date-time', nullable: true, example: '2025-07-03T22:00:00Z'),
                    new OA\Property(property: 'capacity', type: 'integer', nullable: true, example: 6000, minimum: 0),
                    new OA\Property(property: 'branding', type: 'object', nullable: true, description: 'JSON object for branding details'),
                    new OA\Property(property: 'seo', type: 'object', nullable: true, description: 'JSON object for SEO details'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Event updated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/Event')
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized (requires role:4)'),
            new OA\Response(response: 404, description: 'Event not found'),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
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

    #[OA\Delete(
        path: '/events/{eventId}',
        summary: 'Delete an event',
        security: [['sanctum' => []]],
        tags: ['Events'],
        parameters: [
            new OA\Parameter(
                name: 'eventId',
                in: 'path',
                description: 'ID of the event to delete',
                required: true,
                schema: new OA\Schema(type: 'integer', format: 'int64', example: 1)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Event deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'deleted', type: 'boolean', example: true),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized (requires role:4)'),
            new OA\Response(response: 404, description: 'Event not found'),
        ]
    )]
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
