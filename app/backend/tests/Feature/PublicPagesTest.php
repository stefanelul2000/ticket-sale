<?php

namespace Tests\Feature;

use App\Models\Event;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicPagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    public function test_only_public_events_are_listed(): void
    {
        [$public] = $this->eventWithType();
        $public->update(['is_public' => true, 'photos_url' => 'https://cloud.example/s/x']);
        [$hidden] = $this->eventWithType();

        $this->getJson('/api/public/events')->assertOk()->assertJsonCount(1)->assertJson([['slug' => $public->slug]]);
        $this->getJson("/api/public/events/{$public->slug}")->assertOk()
            ->assertJson(['photos_url' => 'https://cloud.example/s/x', 'donation_url' => 'https://atelier-sacelean.ro/donate']);
        $this->getJson("/api/public/events/{$hidden->slug}")->assertNotFound();
    }

    public function test_ticket_page_shows_status_but_never_the_guest_name(): void
    {
        [$event, $type] = $this->eventWithType();
        $code = $this->actingAs($this->userWithRole(4))->postJson('/api/tickets/generate', [
            'event_id' => $event->id, 'ticket_type_id' => $type->id, 'count' => 1,
        ])->json('codes.0');

        auth()->guard('web')->logout();
        $this->flushSession();
        $this->getJson("/api/public/tickets/{$code}")->assertOk()->assertJson(['status' => 'not_assigned']);

        $this->actingAs($this->userWithRole(3))->postJson("/api/tickets/{$code}/sell", ['event_id' => $this->eventOf($code), 'name' => 'Secret Person']);
        auth()->guard('web')->logout();
        $this->flushSession();

        $res = $this->getJson('/api/public/tickets/'.strtolower($code))->assertOk()->assertJson(['status' => 'valid']);
        $this->assertStringNotContainsString('Secret Person', $res->getContent());
        $this->assertSame($event->name, $res->json('event.name'));
    }

    public function test_legacy_sequential_codes_are_not_resolvable_publicly(): void
    {
        [$event] = $this->eventWithType();
        \App\Models\Ticket::create(['event_id' => $event->id, 'ticket_number' => 1, 'ticket_code' => $event->id.'_001']);

        $this->getJson("/api/public/tickets/{$event->id}_001")->assertNotFound();
        $this->getJson('/api/public/tickets/AAAAA-AAAAA')->assertNotFound();
    }

    public function test_settings_are_admin_only_and_validated(): void
    {
        $this->getJson('/api/public/settings')->assertOk()->assertJson(['donation_url' => 'https://atelier-sacelean.ro/donate']);

        $this->actingAs($this->userWithRole(4))->putJson('/api/settings', ['name' => 'X'])->assertForbidden();
        $admin = $this->userWithRole(5);
        $this->actingAs($admin)->putJson('/api/settings', ['donation_url' => 'javascript:alert(1)'])->assertStatus(422);
        $this->actingAs($admin)->putJson('/api/settings', ['public_url' => 'https://bilete.example.org/path'])->assertStatus(422);
        $this->actingAs($admin)->putJson('/api/settings', ['public_url' => 'https://bilete.example.org', 'name' => 'Org'])
            ->assertOk()->assertJson(['public_url' => 'https://bilete.example.org', 'name' => 'Org']);
    }

    public function test_api_messages_follow_the_ui_language(): void
    {
        [$event] = $this->eventWithType();
        $door = $this->userWithRole(2);
        $this->actingAs($door)->withHeader('X-Locale', 'ro')->postJson('/api/tickets/AAAAA-AAAAA/checkin', ['event_id' => $event->id])
            ->assertJson(['message' => 'Invitația nu a fost găsită.']);
        $this->actingAs($door)->withHeader('X-Locale', 'en')->postJson('/api/tickets/AAAAA-AAAAA/checkin', ['event_id' => $event->id])
            ->assertJson(['message' => 'Ticket not found.']);
    }

    public function test_api_docs_and_password_reset_are_not_exposed(): void
    {
        $this->get('/api/documentation')->assertNotFound();
        $this->postJson('/api/forgot-password', ['email' => 'a@b.c'])->assertNotFound();
    }
}
