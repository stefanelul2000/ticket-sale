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
        'slug',
        'is_online',
        'venue',
        'city',
        'country',
        'starts_at',
        'ends_at',
        'capacity',
        'branding',
        'seo',
    ];

    protected $casts = [
        'is_online' => 'boolean',
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
}
