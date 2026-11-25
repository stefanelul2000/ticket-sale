<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Ticket;
use App\Support\TicketCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventFeaturesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    private function generate(Event $event, int $typeId, int $count): array
    {
        return $this->actingAs($this->userWithRole(4))->postJson('/api/tickets/generate', [
            'event_id' => $event->id, 'ticket_type_id' => $typeId, 'count' => $count,
        ])->assertOk()->json('codes');
    }

    public function test_creating_event_adds_default_ticket_type_and_public_fields(): void
    {
        $res = $this->actingAs($this->userWithRole(4))->postJson('/api/events', [
            'name' => 'Acorduri de sărbătoare 2026',
            'starts_at' => '2026-12-20 17:00:00',
            'capacity' => 200,
            'is_public' => true,
            'description' => 'Concert de Crăciun',
            'photos_url' => 'https://cloud.ciubi.net/s/abc',
        ])->assertCreated();

        $event = Event::find($res->json('id'));
        $this->assertSame('acorduri-de-sarbatoare-2026', $event->slug);
        $this->assertCount(1, $event->ticketTypes);
        $this->assertTrue($event->is_public);
    }

    public function test_event_links_must_be_http_urls(): void
    {
        $this->actingAs($this->userWithRole(4))->postJson('/api/events', [
            'name' => 'X', 'photos_url' => 'javascript:alert(1)',
        ])->assertStatus(422);
    }

    public function test_door_refuses_ticket_from_another_event(): void
    {
        [$a, $typeA] = $this->eventWithType();
        [$b] = $this->eventWithType();
        $code = $this->generate($a, $typeA->id, 1)[0];
        $this->actingAs($this->userWithRole(3))->postJson("/api/tickets/{$code}/sell", ['event_id' => $this->eventOf($code), 'name' => 'Ana'])->assertOk();

        $door = $this->userWithRole(2);
        $this->actingAs($door)->postJson("/api/tickets/{$code}/checkin", ['event_id' => $b->id])
            ->assertStatus(409)->assertJson(['result' => 'wrong_event']);
        $this->actingAs($door)->postJson("/api/tickets/{$code}/checkin", ['event_id' => $a->id])
            ->assertOk()->assertJson(['result' => 'ok']);
    }

    public function test_qr_url_is_accepted_at_the_door(): void
    {
        [$event, $type] = $this->eventWithType();
        $code = $this->generate($event, $type->id, 1)[0];
        $this->actingAs($this->userWithRole(3))->postJson("/api/tickets/{$code}/sell", ['event_id' => $this->eventOf($code), 'name' => 'Ana', 'guest_category' => 'family'])->assertOk();

        $this->assertSame($code, TicketCode::normalize("https://ticket.example.org/t/{$code}"));
        $this->assertSame($code, TicketCode::normalize('https://ticket.example.org/t/'.strtolower(str_replace('-', '', $code)).'?x=1'));
    }

    public function test_invalid_guest_category_is_rejected(): void
    {
        [$event, $type] = $this->eventWithType();
        $code = $this->generate($event, $type->id, 1)[0];
        $this->actingAs($this->userWithRole(3))->postJson("/api/tickets/{$code}/sell", ['event_id' => $this->eventOf($code), 'name' => 'Ana', 'guest_category' => 'vip<script>'])
            ->assertStatus(422);
    }

    public function test_volunteer_can_fix_name_and_category(): void
    {
        [$event, $type] = $this->eventWithType();
        $code = $this->generate($event, $type->id, 1)[0];
        $vol = $this->userWithRole(3);
        $this->actingAs($vol)->postJson("/api/tickets/{$code}/sell", ['event_id' => $this->eventOf($code), 'name' => 'Ana Pp'])->assertOk();
        $this->actingAs($vol)->patchJson("/api/tickets/{$code}", ['name' => 'Ana Pop', 'guest_category' => 'parent'])
            ->assertOk()->assertJson(['name' => 'Ana Pop', 'guest_category' => 'parent']);
        $this->actingAs($this->userWithRole(2))->patchJson("/api/tickets/{$code}", ['name' => 'X'])->assertForbidden();
    }

    public function test_walk_in_creates_new_checked_in_ticket_and_respects_capacity(): void
    {
        [$event, $type] = $this->eventWithType(2);
        $printed = $this->generate($event, $type->id, 1)[0];
        $door = $this->userWithRole(2);

        $res = $this->actingAs($door)->postJson("/api/events/{$event->id}/walk-in", ['name' => 'Bunica', 'guest_category' => 'family'])
            ->assertCreated();
        $this->assertNotSame($printed, $res->json('ticket.ticket_code'));
        $this->assertTrue($res->json('ticket.checkin'));
        $this->assertTrue($res->json('ticket.is_walk_in'));
        $this->assertNull(Ticket::where('ticket_code', $printed)->value('sold_at'));

        $this->actingAs($door)->postJson("/api/events/{$event->id}/walk-in")->assertCreated();
        $this->actingAs($door)->postJson("/api/events/{$event->id}/walk-in")->assertStatus(409)->assertJson(['result' => 'full']);
    }

    public function test_guest_list_import_assigns_in_order_and_can_generate_missing(): void
    {
        [$event, $type] = $this->eventWithType(10);
        $codes = $this->generate($event, $type->id, 2);
        $manager = $this->userWithRole(4);

        $entries = [['name' => 'Ana'], ['name' => 'Bogdan', 'guest_category' => 'press'], ['name' => 'Cristina']];
        $this->actingAs($manager)->postJson("/api/events/{$event->id}/assign-list", ['ticket_type_id' => $type->id, 'entries' => $entries])
            ->assertStatus(422)->assertJson(['missing' => 1]);

        $res = $this->actingAs($manager)->postJson("/api/events/{$event->id}/assign-list", [
            'ticket_type_id' => $type->id, 'entries' => $entries, 'generate_missing' => true,
        ])->assertOk();

        $this->assertSame(3, $res->json('assigned'));
        $this->assertSame($codes[0], $res->json('tickets.0.ticket_code'));
        $this->assertSame('Bogdan', Ticket::where('ticket_code', $codes[1])->value('name'));
        $this->assertSame('press', Ticket::where('ticket_code', $codes[1])->value('guest_category'));
        $this->assertSame(3, Ticket::where('event_id', $event->id)->count());
    }

    public function test_duplicate_copies_settings_and_types_but_not_tickets(): void
    {
        [$event, $type] = $this->eventWithType(50);
        $this->generate($event, $type->id, 3);

        $res = $this->actingAs($this->userWithRole(4))->postJson("/api/events/{$event->id}/duplicate")->assertCreated();
        $copy = Event::find($res->json('id'));

        $this->assertSame(50, $copy->capacity);
        $this->assertFalse($copy->is_public);
        $this->assertCount(1, $copy->ticketTypes);
        $this->assertSame(0, $copy->tickets()->count());
    }

    public function test_event_report_numbers(): void
    {
        [$event, $type] = $this->eventWithType();
        $codes = $this->generate($event, $type->id, 4);
        $vol = $this->userWithRole(3);
        $door = $this->userWithRole(2);
        $this->actingAs($vol)->postJson("/api/tickets/{$codes[0]}/sell", ['event_id' => $this->eventOf($codes[0]), 'name' => 'A', 'guest_category' => 'parent']);
        $this->actingAs($vol)->postJson("/api/tickets/{$codes[1]}/sell", ['event_id' => $this->eventOf($codes[1]), 'name' => 'B', 'guest_category' => 'friend']);
        $this->actingAs($door)->postJson("/api/tickets/{$codes[0]}/checkin", ['event_id' => $this->eventOf($codes[0])]);
        $this->actingAs($door)->postJson("/api/events/{$event->id}/walk-in", ['name' => 'C']);

        $res = $this->actingAs($this->userWithRole(1))->getJson("/api/reports/events/{$event->id}")->assertOk();
        $res->assertJson(['totals' => [
            'generated' => 5, 'assigned' => 3, 'checked_in' => 2, 'walk_ins' => 1, 'not_arrived' => 1, 'attendance_rate' => 0.5,
        ]]);
        $this->assertCount(1, $res->json('arrivals'));
        $this->assertSame(2, collect($res->json('by_volunteer'))->firstWhere('name', $vol->name)['assigned']);

        $this->actingAs($this->userWithRole(1))->getJson('/api/reports/overview')->assertOk()->assertJson(['totals' => ['assigned' => 3]]);
        // Names stay with door staff and up; repeat guests only for managers.
        $this->actingAs($this->userWithRole(1))->getJson('/api/tickets')->assertForbidden();
        $this->actingAs($this->userWithRole(2))->getJson('/api/reports/repeat-guests')->assertForbidden();
    }

    public function test_repeat_guests_are_matched_case_insensitively(): void
    {
        [$a, $ta] = $this->eventWithType();
        [$b, $tb] = $this->eventWithType();
        $ca = $this->generate($a, $ta->id, 1)[0];
        $cb = $this->generate($b, $tb->id, 1)[0];
        $vol = $this->userWithRole(3);
        $this->actingAs($vol)->postJson("/api/tickets/{$ca}/sell", ['event_id' => $this->eventOf($ca), 'name' => 'Maria Ionescu']);
        $this->actingAs($vol)->postJson("/api/tickets/{$cb}/sell", ['event_id' => $this->eventOf($cb), 'name' => ' maria  ionescu ']);

        $this->actingAs($this->userWithRole(4))->getJson('/api/reports/repeat-guests')
            ->assertOk()->assertJsonCount(1)->assertJson([['events_count' => 2]]);
    }
}
