<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TicketType extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'event_id',
        'name',
        'kind',
        'price',
        'currency',
        'capacity',
        'shared_capacity_key',
        'is_active',
        'sales_start',
        'sales_end',
        'sort',
        'metadata',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sales_start' => 'datetime',
        'sales_end' => 'datetime',
        'metadata' => 'array',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
