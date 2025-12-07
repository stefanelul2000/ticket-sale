<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

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
