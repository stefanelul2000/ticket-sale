<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    public function test_admin_cannot_promote_self_or_create_owners_or_admins(): void
    {
        $admin = $this->userWithRole(5);

        $this->actingAs($admin)->patchJson("/api/users/{$admin->id}/role", ['role_id' => 6])->assertForbidden();
        $this->actingAs($admin)->postJson('/api/users', [
            'name' => 'Evil', 'username' => 'evil', 'password' => 'password123', 'role_id' => 6,
        ])->assertForbidden();
        $this->actingAs($admin)->postJson('/api/users', [
            'name' => 'Peer', 'username' => 'peer', 'password' => 'password123', 'role_id' => 5,
        ])->assertForbidden();

        $this->assertSame(5, $admin->fresh()->role_id);
    }

    public function test_admin_cannot_touch_the_site_owner(): void
    {
        $owner = $this->userWithRole(6);
        $admin = $this->userWithRole(5);

        $this->actingAs($admin)->patchJson("/api/users/{$owner->id}", ['password' => 'hijacked123'])->assertForbidden();
        $this->actingAs($admin)->patchJson("/api/users/{$owner->id}/status", ['active' => false])->assertForbidden();
        $this->actingAs($admin)->patchJson("/api/users/{$owner->id}/role", ['role_id' => 1])->assertForbidden();
        $this->actingAs($admin)->deleteJson("/api/users/{$owner->id}")->assertForbidden();

        $this->assertTrue($owner->fresh()->active);
    }

    public function test_admin_manages_lower_roles(): void
    {
        $admin = $this->userWithRole(5);
        $staff = $this->userWithRole(2);

        $this->actingAs($admin)->patchJson("/api/users/{$staff->id}/role", ['role_id' => 3])->assertOk();
        $this->actingAs($admin)->patchJson("/api/users/{$staff->id}/status", ['active' => false])->assertOk();
        $this->actingAs($admin)->patchJson("/api/users/{$admin->id}", ['name' => 'Me Myself'])->assertOk();
        $this->actingAs($admin)->deleteJson("/api/users/{$staff->id}")->assertOk();
    }

    public function test_owner_can_appoint_admins_but_not_remove_last_owner(): void
    {
        $owner = $this->userWithRole(6);
        $staff = $this->userWithRole(2);

        $this->actingAs($owner)->patchJson("/api/users/{$staff->id}/role", ['role_id' => 5])->assertOk();
        $this->actingAs($owner)->patchJson("/api/users/{$owner->id}/role", ['role_id' => 5])->assertForbidden();
        $this->actingAs($owner)->deleteJson("/api/users/{$owner->id}")->assertForbidden();
    }

    public function test_impersonation_cannot_escalate_and_me_reports_real_role(): void
    {
        $admin = $this->userWithRole(5);

        $this->actingAs($admin)->postJson('/api/impersonate', ['role_id' => 6])->assertForbidden();
        $this->actingAs($admin)->postJson('/api/impersonate', ['role_id' => 2])->assertOk();

        $this->actingAs($admin)->getJson('/api/me')
            ->assertOk()
            ->assertJson(['role_id' => 2, 'original_role_id' => 5, 'impersonating' => true]);

        // While impersonating, admin routes are closed and the real role is never persisted.
        $this->actingAs($admin)->getJson('/api/users')->assertForbidden();
        $this->assertSame(5, $admin->fresh()->role_id);

        $this->actingAs($admin->fresh())->deleteJson('/api/impersonate')->assertOk();
        $this->actingAs($admin->fresh())->getJson('/api/users')->assertOk();
    }

    public function test_lower_roles_cannot_reach_admin_endpoints(): void
    {
        $this->actingAs($this->userWithRole(4))->getJson('/api/users')->assertForbidden();
    }

    public function test_guests_are_unauthorized(): void
    {
        $this->getJson('/api/users')->assertUnauthorized();
        $this->getJson('/api/tickets')->assertUnauthorized();
        $this->postJson('/api/tickets/ABCDE-FGHJK/checkin')->assertUnauthorized();
    }
}
