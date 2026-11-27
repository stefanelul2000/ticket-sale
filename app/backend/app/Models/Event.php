<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'Event',
    title: 'Event',
    description: 'Event model',
    properties: [
        new OA\Property(property: 'id', type: 'integer', format: 'int64', example: 1),
        new OA\Property(property: 'name', type: 'string', example: 'Concert A'),
        new OA\Property(property: 'slug', type: 'string', example: 'concert-a'),
        new OA\Property(property: 'is_online', type: 'boolean', example: false),
        new OA\Property(property: 'venue', type: 'string', nullable: true, example: 'City Arena'),
        new OA\Property(property: 'city', type: 'string', nullable: true, example: 'New York'),
        new OA\Property(property: 'country', type: 'string', nullable: true, example: 'USA'),
        new OA\Property(property: 'starts_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'ends_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'capacity', type: 'integer', nullable: true, example: 1000),
        new OA\Property(property: 'branding', type: 'object', nullable: true, description: 'JSON object for branding details'),
        new OA\Property(property: 'seo', type: 'object', nullable: true, description: 'JSON object for SEO details'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'deleted_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'ticket_types_count', type: 'integer', readOnly: true, description: 'Number of ticket types associated with this event'),
        new OA\Property(property: 'tickets_generated', type: 'integer', readOnly: true, description: 'Number of tickets generated for this event'),
        new OA\Property(property: 'tickets_sold', type: 'integer', readOnly: true, description: 'Number of tickets sold for this event'),
    ],
    required: ['id', 'name', 'slug']
)]
class Event extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'slug',
        'is_online',
        'is_public',
        'venue',
        'city',
        'country',
        'starts_at',
        'ends_at',
        'capacity',
        'donation_url',
        'photos_url',
        'print_template',
        'requests_enabled',
        'eticket_from',
        'eticket_to',
        'request_max',
        'eticket_message',
        'branding',
        'seo',
    ];

    protected $casts = [
        'is_online' => 'boolean',
        'is_public' => 'boolean',
        'print_template' => 'array',
        'requests_enabled' => 'boolean',
        'eticket_from' => 'integer',
        'eticket_to' => 'integer',
        'request_max' => 'integer',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'branding' => 'array',
        'seo' => 'array',
    ];

    public function ticketTypes()
    {
        return $this->hasMany(TicketType::class);
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class);
    }

    public function ticketRequests()
    {
        return $this->hasMany(TicketRequest::class);
    }

    /** Unassigned tickets available for e-tickets (the reserved number range, if set). */
    public function eticketPool()
    {
        return Ticket::where('event_id', $this->id)
            ->whereNull('sold_at')
            ->where('checkin', false)
            ->when($this->eticket_from, fn ($q) => $q->where('ticket_number', '>=', $this->eticket_from))
            ->when($this->eticket_to, fn ($q) => $q->where('ticket_number', '<=', $this->eticket_to));
    }

    /** Free e-tickets minus tickets already asked for in pending requests. */
    public function eticketsOpen(): int
    {
        $free = $this->eticketPool()->count();
        $pending = (int) $this->ticketRequests()->where('status', 'pending')->sum('quantity');

        return max(0, $free - $pending);
    }

    /**
     * Fields shown on the public event page / ticket page (no internal data).
     */
    public function publicPayload(array $organization): array
    {
        return [
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description,
            'starts_at' => $this->starts_at,
            'ends_at' => $this->ends_at,
            'venue' => $this->venue,
            'city' => $this->city,
            'is_public' => $this->is_public,
            'donation_url' => $this->donation_url ?: ($organization['donation_url'] ?? null),
            'photos_url' => $this->photos_url,
            'requests_open' => (bool) $this->requests_enabled && $this->eticketsOpen() > 0,
            'requests_enabled' => (bool) $this->requests_enabled,
            'request_max' => (int) ($this->request_max ?: 4),
        ];
    }
}
