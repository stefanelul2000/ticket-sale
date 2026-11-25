<?php

namespace App\Support;

use App\Models\Event;
use App\Models\Ticket;
use App\Models\TicketType;
use Illuminate\Support\Carbon;

/**
 * Creates tickets with sequential numbers and random codes.
 * Callers must run inside a DB transaction holding a lock on the event row
 * (Event::lockForUpdate()), so numbering and capacity checks are race-free.
 */
final class TicketIssuer
{
    /**
     * Remaining generation capacity for the event / ticket type, or null when unlimited.
     */
    public static function remaining(Event $event, TicketType $type): ?int
    {
        $limits = [];

        if (! is_null($event->capacity)) {
            $limits[] = $event->capacity - Ticket::withTrashed()->where('event_id', $event->id)->count();
        }
        if (! is_null($type->capacity)) {
            $limits[] = $type->capacity - Ticket::withTrashed()->where('ticket_type_id', $type->id)->count();
        }

        return $limits ? max(0, min($limits)) : null;
    }

    /**
     * @param  array<string, mixed>  $attributes  extra columns for every new ticket (name, sold_at, ...)
     * @return list<array{ticket_code: string, ticket_number: int}>
     */
    public static function issue(Event $event, TicketType $type, int $count, array $attributes = []): array
    {
        if ($count < 1) {
            return [];
        }

        $lastNumber = (int) (Ticket::withTrashed()->where('event_id', $event->id)->max('ticket_number') ?? 0);
        $codes = self::uniqueCodes($count);
        $now = Carbon::now();

        $rows = [];
        foreach ($codes as $i => $code) {
            $rows[] = array_merge([
                'event_id' => $event->id,
                'ticket_type_id' => $type->id,
                'ticket_number' => $lastNumber + $i + 1,
                'ticket_code' => $code,
                'checkin' => false,
                'is_walk_in' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ], $attributes);
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            Ticket::insert($chunk);
        }

        return array_map(fn ($r) => ['ticket_code' => $r['ticket_code'], 'ticket_number' => $r['ticket_number']], $rows);
    }

    /**
     * @return list<string>
     */
    private static function uniqueCodes(int $count): array
    {
        $codes = [];
        while (count($codes) < $count) {
            $batch = [];
            while (count($batch) < $count - count($codes)) {
                $code = TicketCode::generate();
                if (! isset($codes[$code])) {
                    $batch[$code] = true;
                }
            }
            $taken = Ticket::withTrashed()->whereIn('ticket_code', array_keys($batch))->pluck('ticket_code')->all();
            foreach ($taken as $dup) {
                unset($batch[$dup]);
            }
            $codes += $batch;
        }

        return array_keys($codes);
    }
}
