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
        'guest_category',
        'sold_at',
        'checkin',
        'checked_in_at',
        'checked_in_by',
        'is_walk_in',
        'request_id',
    ];

    protected $casts = [
        'sold_at' => 'datetime',
        'checkin' => 'boolean',
        'checked_in_at' => 'datetime',
        'is_walk_in' => 'boolean',
    ];

    public function seller()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function checkedInBy()
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }

    public function request()
    {
        return $this->belongsTo(TicketRequest::class, 'request_id');
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function ticketType()
    {
        return $this->belongsTo(TicketType::class)->withTrashed();
    }

    public function isSold(): bool
    {
        return $this->sold_at !== null;
    }
}
