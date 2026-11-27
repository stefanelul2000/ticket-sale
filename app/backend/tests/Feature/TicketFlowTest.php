<?php

namespace Tests\Feature;

use App\Models\Ticket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    private function generate(int $count, ?int $capacity = null, ?int $typeCapacity = null): array
    {
        [$event, $type] = $this->eventWithType($capacity, $typeCapacity);
        $manager = $this->userWithRole(4);

        $res = $this->actingAs($manager)->postJson('/api/tickets/generate', [
            'event_id' => $event->id,
            'ticket_type_id' => $type->id,
            'count' => $count,
        ])->assertOk();

        return [$event, $type, $res->json('codes')];
    }

    public function test_generation_creates_random_unique_codes_with_sequential_numbers(): void
    {
        [$event, , $codes] = $this->generate(300);

        $this->assertCount(300, $codes);
        $this->assertCount(300, array_unique($codes));
        foreach ($codes as $code) {
            $this->assertMatchesRegularExpression('/^[2-9A-Z]{5}-[2-9A-Z]{5}$/', $code);
        }
        $this->assertSame(range(1, 300), Ticket::where('event_id', $event->id)->orderBy('ticket_number')->pluck('ticket_number')->all());

        // A second batch continues the numbering.
        $manager = $this->userWithRole(4);
        $type = $event->ticketTypes()->first();
        $this->actingAs($manager)->postJson('/api/tickets/generate', [
            'event_id' => $event->id, 'ticket_type_id' => $type->id, 'count' => 5,
        ])->assertOk()->assertJson(['start' => 301, 'end' => 305]);
    }

    public function test_generation_respects_event_and_type_capacity(): void
    {
        [$event, $type] = $this->eventWithType(10, 4);
        $manager = $this->userWithRole(4);

        $this->actingAs($manager)->postJson('/api/tickets/generate', [
            'event_id' => $event->id, 'ticket_type_id' => $type->id, 'count' => 5,
        ])->assertStatus(422)->assertJson(['remaining' => 4]);

        $this->actingAs($manager)->postJson('/api/tickets/generate', [
            'event_id' => $event->id, 'ticket_type_id' => $type->id, 'count' => 11,
        ])->assertStatus(422);
    }

    public function test_export_returns_all_codes_for_printing(): void
    {
        [$event, , $codes] = $this->generate(25);
        $manager = $this->userWithRole(4);

        $res = $this->actingAs($manager)->getJson("/api/events/{$event->id}/tickets")->assertOk();
        $this->assertSame($codes, $res->json('codes'));
        $this->assertSame(1, $res->json('tickets.0.ticket_number'));
        $this->assertSame('Invitation', $res->json('tickets.0.ticket_type'));
    }

    public function test_unsold_ticket_cannot_check_in(): void
    {
        [, , $codes] = $this->generate(1);
        $door = $this->userWithRole(2);

        $this->actingAs($door)->postJson("/api/tickets/{$codes[0]}/checkin", ['event_id' => $this->eventOf($codes[0])])
            ->assertStatus(409)
            ->assertJson(['result' => 'not_sold']);

        $this->assertFalse(Ticket::where('ticket_code', $codes[0])->first()->checkin);
    }

    public function test_sold_ticket_checks_in_once(): void
    {
        [, , $codes] = $this->generate(1);
        $seller = $this->userWithRole(3);
        $door = $this->userWithRole(2);

        $this->actingAs($seller)->postJson("/api/tickets/{$codes[0]}/sell", ['event_id' => $this->eventOf($codes[0]), 'name' => 'Ana Pop'])->assertOk();

        // Scanner input variants (lower case, no dash) resolve to the same ticket.
        $scanned = strtolower(str_replace('-', '', $codes[0]));
        $this->actingAs($door)->postJson("/api/tickets/{$scanned}/checkin", ['event_id' => $this->eventOf($scanned)])
            ->assertOk()
            ->assertJson(['result' => 'ok', 'ticket' => ['name' => 'Ana Pop']]);

        $this->actingAs($door)->postJson("/api/tickets/{$codes[0]}/checkin", ['event_id' => $this->eventOf($codes[0])])
            ->assertStatus(409)
            ->assertJson(['result' => 'already_checked_in']);

        $ticket = Ticket::where('ticket_code', $codes[0])->first();
        $this->assertTrue($ticket->checkin);
        $this->assertNotNull($ticket->checked_in_at);
        $this->assertSame($door->id, $ticket->checked_in_by);
    }

    public function test_ticket_cannot_be_sold_twice(): void
    {
        [, , $codes] = $this->generate(1);
        $seller = $this->userWithRole(3);

        $this->actingAs($seller)->postJson("/api/tickets/{$codes[0]}/sell", ['event_id' => $this->eventOf($codes[0]), 'name' => 'First'])->assertOk();
        $this->actingAs($seller)->postJson("/api/tickets/{$codes[0]}/sell", ['event_id' => $this->eventOf($codes[0]), 'name' => 'Second'])->assertStatus(409);

        $this->assertSame('First', Ticket::where('ticket_code', $codes[0])->value('name'));
    }

    public function test_unknown_or_guessed_codes_are_rejected(): void
    {
        [$event] = $this->generate(3);
        $door = $this->userWithRole(2);

        $this->actingAs($door)->postJson('/api/tickets/1_001/checkin', ['event_id' => $event->id])->assertNotFound();
        $this->actingAs($door)->getJson('/api/tickets/AAAAA-AAAAA/verify?event_id='.$event->id)->assertNotFound();
        // The door must always say which event it is scanning for.
        $this->actingAs($door)->postJson('/api/tickets/AAAAA-AAAAA/checkin')->assertStatus(422);
    }

    public function test_volunteers_cannot_browse_guest_lists_or_rename_others_tickets(): void
    {
        [, , $codes] = $this->generate(2);
        $vol = $this->userWithRole(3);
        $other = $this->userWithRole(3);

        $this->actingAs($vol)->getJson('/api/tickets')->assertForbidden();
        $this->actingAs($vol)->getJson('/api/ticket-activity')->assertForbidden();

        $this->actingAs($other)->postJson("/api/tickets/{$codes[0]}/sell", ['event_id' => $this->eventOf($codes[0]), 'name' => 'Ana'])->assertOk();
        $this->actingAs($vol)->patchJson("/api/tickets/{$codes[0]}", ['name' => 'Hijack'])->assertForbidden();
        $this->actingAs($this->userWithRole(4))->patchJson("/api/tickets/{$codes[0]}", ['name' => 'Ana Pop'])->assertOk();
    }

    public function test_sellers_cannot_check_in_and_check_in_staff_cannot_sell(): void
    {
        [, , $codes] = $this->generate(1);

        $this->actingAs($this->userWithRole(3))->postJson("/api/tickets/{$codes[0]}/checkin", ['event_id' => $this->eventOf($codes[0])])->assertForbidden();
        $this->actingAs($this->userWithRole(2))->postJson("/api/tickets/{$codes[0]}/sell", ['event_id' => $this->eventOf($codes[0]), 'name' => 'X'])->assertForbidden();
        $this->actingAs($this->userWithRole(1))->getJson("/api/tickets/{$codes[0]}/verify?event_id=".$this->eventOf($codes[0]))->assertForbidden();
    }

    public function test_refund_rules(): void
    {
        [, , $codes] = $this->generate(2);
        $manager = $this->userWithRole(4);

        $this->actingAs($manager)->postJson("/api/tickets/{$codes[0]}/refund")->assertStatus(409); // not sold

        $this->actingAs($manager)->postJson("/api/tickets/{$codes[0]}/sell", ['event_id' => $this->eventOf($codes[0]), 'name' => 'A'])->assertOk();
        $this->actingAs($manager)->postJson("/api/tickets/{$codes[0]}/refund")->assertOk();
        $this->assertNull(Ticket::where('ticket_code', $codes[0])->value('sold_at'));

        $this->actingAs($manager)->postJson("/api/tickets/{$codes[1]}/sell", ['event_id' => $this->eventOf($codes[1]), 'name' => 'B'])->assertOk();
        $this->actingAs($manager)->postJson("/api/tickets/{$codes[1]}/checkin", ['event_id' => $this->eventOf($codes[1])])->assertOk();
        // Managers can refund even after check-in (e.g. a test ticket): everything is reset.
        $this->actingAs($manager)->postJson("/api/tickets/{$codes[1]}/refund")->assertOk()->assertJson(['was_checked_in' => true]);
        $t = Ticket::where('ticket_code', $codes[1])->first();
        $this->assertNull($t->sold_at);
        $this->assertFalse($t->checkin);
        $this->assertNull($t->checked_in_at);
        $this->assertNull($t->name);

        // Volunteers and door staff cannot refund.
        $this->actingAs($manager)->postJson("/api/tickets/{$codes[1]}/sell", ['event_id' => $this->eventOf($codes[1]), 'name' => 'C'])->assertOk();
        $this->actingAs($this->userWithRole(3))->postJson("/api/tickets/{$codes[1]}/refund")->assertForbidden();
        $this->actingAs($this->userWithRole(2))->postJson("/api/tickets/{$codes[1]}/refund")->assertForbidden();
    }

    public function test_stats_count_correctly(): void
    {
        [$event, , $codes] = $this->generate(4);
        $manager = $this->userWithRole(4);
        $this->actingAs($manager)->postJson("/api/tickets/{$codes[0]}/sell", ['event_id' => $this->eventOf($codes[0]), 'name' => 'A']);
        $this->actingAs($manager)->postJson("/api/tickets/{$codes[1]}/sell", ['event_id' => $this->eventOf($codes[1]), 'name' => 'B']);
        $this->actingAs($manager)->postJson("/api/tickets/{$codes[1]}/checkin", ['event_id' => $this->eventOf($codes[1])]);

        $this->actingAs($manager)->getJson('/api/stats?event_id='.$event->id)
            ->assertExactJson(['total' => 4, 'sold' => 2, 'unsold' => 2, 'checked_in' => 1, 'walk_ins' => 0, 'etickets' => 0, 'mail_configured' => true]);
    }

    public function test_event_with_sold_tickets_cannot_be_deleted(): void
    {
        [$event, , $codes] = $this->generate(1);
        $manager = $this->userWithRole(4);
        $this->actingAs($manager)->postJson("/api/tickets/{$codes[0]}/sell", ['event_id' => $this->eventOf($codes[0]), 'name' => 'A']);

        $this->actingAs($manager)->deleteJson("/api/events/{$event->id}")->assertStatus(409);
    }

    public function test_only_admins_can_clear_activity_log(): void
    {
        $this->actingAs($this->userWithRole(2))->deleteJson('/api/ticket-activity')->assertForbidden();
        $this->actingAs($this->userWithRole(5))->deleteJson('/api/ticket-activity')->assertOk();
    }

    public function test_ticket_type_with_sales_window_can_be_saved(): void
    {
        [$event] = $this->eventWithType();
        $this->actingAs($this->userWithRole(4))->postJson('/api/ticket-types', [
            'event_id' => $event->id,
            'name' => 'Early bird',
            'kind' => 'paid',
            'price' => 50,
            'sales_start' => '2026-12-01 10:00:00',
            'sales_end' => '2026-12-19 23:00:00',
            'shared_capacity_key' => 'main',
        ])->assertCreated();
    }
}
