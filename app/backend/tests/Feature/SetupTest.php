<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SetupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.setup_enabled' => false, 'app.env_store_path' => null]);
        // Never touch a real .env from tests.
        $this->app->setBasePath(sys_get_temp_dir());
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Owner',
            'email' => 'owner@example.com',
            'username' => 'owner',
            'password' => 'Very-Strong-Pass-1',
            'password_confirmation' => 'Very-Strong-Pass-1',
        ], $overrides);
    }

    public function test_setup_creates_owner_once_and_locks(): void
    {
        $this->getJson('/api/setup/status')->assertJson(['needsSetup' => true]);

        $this->postJson('/api/setup', $this->payload())->assertOk();
        $owner = User::where('username', 'owner')->first();
        $this->assertSame(6, $owner->role_id);
        $this->assertAuthenticatedAs($owner);

        $this->getJson('/api/setup/status')->assertJson(['needsSetup' => false, 'adminExists' => true]);

        auth()->guard('web')->logout();
        $this->flushSession();
        $this->postJson('/api/setup', $this->payload(['username' => 'attacker', 'email' => 'a@example.com']))->assertForbidden();
        $this->assertDatabaseMissing('users', ['username' => 'attacker']);
    }

    public function test_setup_rejects_db_overrides_when_db_comes_from_env(): void
    {
        $this->postJson('/api/setup', $this->payload(['db_host' => 'evil.example.com']))->assertStatus(422);
    }

    public function test_migrate_requires_admin_after_setup(): void
    {
        $this->seedRoles();
        $this->userWithRole(6);

        $this->postJson('/api/setup/migrate')->assertUnauthorized();
        $this->postJson('/api/setup/test-db', [])->assertForbidden();
        $this->actingAs($this->userWithRole(4))->postJson('/api/setup/migrate')->assertForbidden();
    }
}
