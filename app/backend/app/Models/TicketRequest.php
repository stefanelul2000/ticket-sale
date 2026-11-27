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

    /**
     * Guests as [{name, guest_category}] (older rows stored plain names).
     *
     * @return list<array{name: string, guest_category: ?string}>
     */
    public function guestList(): array
    {
        return array_values(array_map(
            fn ($a) => is_array($a)
                ? ['name' => (string) ($a['name'] ?? ''), 'guest_category' => $a['guest_category'] ?? null]
                : ['name' => (string) $a, 'guest_category' => null],
            $this->attendees ?? [],
        ));
    }

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
