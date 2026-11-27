<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TicketRequest extends Model
{
    public const STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

    protected $fillable = [
        'event_id', 'email', 'phone', 'attendees', 'quantity', 'message', 'status', 'locale', 'ip_hash',
        'decided_by', 'decided_at', 'decision_note', 'sent_at', 'send_count', 'send_error',
    ];

    protected $casts = [
        'attendees' => 'array',
        'decided_at' => 'datetime',
        'sent_at' => 'datetime',
    ];

    protected $hidden = ['ip_hash'];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class, 'request_id');
    }

    public function decider()
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
