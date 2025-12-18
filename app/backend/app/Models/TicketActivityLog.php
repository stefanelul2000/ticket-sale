<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketActivityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'ticket_code',
        'action',
        'status',
        'success',
        'attendee_name',
        'context',
    ];

    protected $casts = [
        'success' => 'boolean',
        'context' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
