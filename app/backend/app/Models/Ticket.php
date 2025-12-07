<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ticket extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'event_id',
        'ticket_type_id',
        'ticket_number',
        'ticket_code',
        'user_id',
        'name',
        'sold_at',
        'checkin',
    ];

    protected $casts = [
        'sold_at' => 'datetime',
        'checkin' => 'boolean',
    ];

    protected $appends = ['code'];

    public function seller()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function ticketType()
    {
        return $this->belongsTo(TicketType::class);
    }

    public function getCodeAttribute(): string
    {
        $capacity = $this->event->capacity ?? null;
        $width = $capacity ? max(3, strlen((string) $capacity)) : max(3, strlen((string) $this->ticket_number));
        return str_pad((string) $this->ticket_number, $width, '0', STR_PAD_LEFT);
    }
}
