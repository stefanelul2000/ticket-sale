<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PromoCode extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'code',
        'type',
        'amount',
        'usage_limit',
        'usage_count',
        'starts_at',
        'ends_at',
        'applies_to',
        'lock_ticket',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'applies_to' => 'array',
        'lock_ticket' => 'boolean',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
