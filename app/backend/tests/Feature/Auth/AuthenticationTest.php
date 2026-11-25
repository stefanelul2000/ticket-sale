<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    public function test_users_can_log_in_with_username(): void
    {
        $user = $this->userWithRole(2);

        $this->postJson('/api/login', ['username' => $user->username, 'password' => 'password'])
            ->assertNoContent();

        $this->assertAuthenticatedAs($user);
    }

    public function test_wrong_password_is_rejected(): void
    {
        $user = $this->userWithRole(2);

        $this->postJson('/api/login', ['username' => $user->username, 'password' => 'nope'])
            ->assertStatus(422);

        $this->assertGuest();
    }

    public function test_inactive_users_cannot_log_in(): void
    {
        $user = $this->userWithRole(2, ['active' => false]);

        $this->postJson('/api/login', ['username' => $user->username, 'password' => 'password'])
            ->assertForbidden();

        $this->assertGuest();
    }

    public function test_deactivated_user_loses_access_immediately(): void
    {
        $user = $this->userWithRole(2);
        $this->actingAs($user)->getJson('/api/me')->assertOk();

        $user->update(['active' => false]);

        $this->actingAs($user->fresh())->getJson('/api/me')->assertUnauthorized();
    }

    public function test_registration_creates_inactive_seller(): void
    {
        $this->postJson('/api/register', [
            'name' => 'New Person',
            'email' => 'new@example.com',
            'username' => 'newperson',
            'password' => 'Secret-Password-1',
            'password_confirmation' => 'Secret-Password-1',
        ])->assertNoContent();

        $this->assertDatabaseHas('users', ['username' => 'newperson', 'role_id' => 3, 'active' => false]);
        $this->assertGuest();
    }
}
