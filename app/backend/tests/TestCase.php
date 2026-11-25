<?php

namespace Tests;

use App\Models\Event;
use App\Models\Ticket;
use App\Support\TicketCode;
use App\Models\TicketType;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Behave like the SPA: Sanctum treats requests from this origin as stateful (session + CSRF).
        $this->withHeader('Origin', 'http://localhost');
    }

    /** Event id of a ticket (the door and assign screens always send it). */
    protected function eventOf(string $code): int
    {
        return (int) Ticket::where('ticket_code', TicketCode::normalize($code))->value('event_id');
    }

    protected function seedRoles(): void
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    protected function userWithRole(int $roleId, array $attributes = []): User
    {
        return User::factory()->role($roleId)->create($attributes);
    }

    /**
     * @return array{0: Event, 1: TicketType}
     */
    protected function eventWithType(?int $capacity = null, ?int $typeCapacity = null): array
    {
        $event = Event::create(['name' => 'Gala '.uniqid(), 'slug' => 'gala-'.uniqid(), 'capacity' => $capacity]);
        $type = TicketType::create([
            'event_id' => $event->id,
            'name' => 'Invitation',
            'kind' => 'free',
            'price' => 0,
            'capacity' => $typeCapacity,
        ]);

        return [$event, $type];
    }
}
