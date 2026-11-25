<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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
            'branding_primary' => '#123456',
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
        $this->getJson('/api/branding')->assertJson(['primary' => '#123456']);

        auth()->guard('web')->logout();
        $this->postJson('/api/setup', $this->payload(['username' => 'attacker', 'email' => 'a@example.com']))->assertForbidden();
        $this->assertDatabaseMissing('users', ['username' => 'attacker']);
    }

    public function test_setup_rejects_db_overrides_when_db_comes_from_env(): void
    {
        $this->postJson('/api/setup', $this->payload(['db_host' => 'evil.example.com']))->assertStatus(422);
    }

    public function test_migrate_and_logo_require_admin_after_setup(): void
    {
        $this->seedRoles();
        $this->userWithRole(6);

        $this->postJson('/api/setup/migrate')->assertUnauthorized();
        $this->postJson('/api/setup/test-db', [])->assertForbidden();

        Storage::fake('public');
        $this->postJson('/api/setup/logo', ['logo' => UploadedFile::fake()->image('logo.png')])->assertForbidden();
    }

    public function test_logo_upload_keeps_colors_and_uses_relative_url(): void
    {
        $this->seedRoles();
        $admin = $this->userWithRole(5);
        Storage::fake('public');

        $this->actingAs($admin)->postJson('/api/branding', ['primary' => '#abcdef'])->assertOk();
        $res = $this->actingAs($admin)->postJson('/api/setup/logo', ['logo' => UploadedFile::fake()->image('logo.png')])
            ->assertCreated();

        $this->assertStringStartsWith('/storage/logos/', $res->json('url'));
        $this->getJson('/api/branding')->assertJson(['primary' => '#abcdef', 'logoUrl' => $res->json('url')]);
    }

    public function test_branding_rejects_non_color_values(): void
    {
        $this->seedRoles();
        $admin = $this->userWithRole(5);

        $this->actingAs($admin)->postJson('/api/branding', ['primary' => 'red;}body{display:none'])->assertStatus(422);
        $this->actingAs($admin)->postJson('/api/branding', ['logoUrl' => 'javascript:alert(1)'])->assertStatus(422);
    }
}
