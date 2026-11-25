<?php

namespace Tests\Feature;

use App\Models\Event;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PrintTemplateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
        Storage::fake('public');
    }

    private function layout(): array
    {
        return [
            'width_mm' => 210,
            'elements' => [
                ['id' => 'qr1', 'type' => 'qr', 'x' => 0.6, 'y' => 0.6, 'w' => 0.08, 'h' => 0.25, 'background' => 'white', 'qr_content' => 'photos'],
                ['id' => 'bc1', 'type' => 'barcode', 'x' => 0.76, 'y' => 0.12, 'w' => 0.22, 'h' => 0.07, 'show_text' => true],
                ['id' => 'nr', 'type' => 'number', 'x' => 0.76, 'y' => 0.08, 'w' => 0.22, 'h' => 0.05, 'prefix' => 'Nr. ', 'digits' => 3, 'color' => '#0f204b', 'align' => 'center', 'font' => 'display', 'bold' => true],
                ['id' => 'nm', 'type' => 'name', 'x' => 0.76, 'y' => 0.21, 'w' => 0.22, 'h' => 0.05],
            ],
        ];
    }

    public function test_manager_uploads_design_and_saves_layout(): void
    {
        [$event] = $this->eventWithType();
        $manager = $this->userWithRole(4);

        $res = $this->actingAs($manager)->post("/api/events/{$event->id}/template", [
            'image' => UploadedFile::fake()->image('design.png', 1568, 540),
        ], ['Accept' => 'application/json'])->assertCreated();

        $path = $res->json('image_path');
        Storage::disk('public')->assertExists($path);
        $this->assertSame(1568, $res->json('width_px'));
        $this->assertStringStartsWith('/storage/templates/', $res->json('image_url'));

        $this->actingAs($manager)->putJson("/api/events/{$event->id}/template", $this->layout())
            ->assertOk()->assertJsonCount(4, 'elements');

        $stored = Event::find($event->id)->print_template;
        $this->assertSame('photos', $stored['elements'][0]['qr_content']);
        $this->assertSame('Nr. ', $stored['elements'][2]['prefix']);
        $this->actingAs($manager)->getJson("/api/events/{$event->id}")->assertJsonPath('print_template.width_px', 1568);
    }

    public function test_layout_is_validated_and_unknown_keys_dropped(): void
    {
        [$event] = $this->eventWithType();
        $manager = $this->userWithRole(4);
        $this->actingAs($manager)->post("/api/events/{$event->id}/template", ['image' => UploadedFile::fake()->image('d.jpg', 800, 400)], ['Accept' => 'application/json'])->assertCreated();

        $bad = $this->layout();
        $bad['elements'][0]['type'] = 'script';
        $this->actingAs($manager)->putJson("/api/events/{$event->id}/template", $bad)->assertStatus(422);

        $bad = $this->layout();
        $bad['elements'][0]['x'] = 1.5;
        $this->actingAs($manager)->putJson("/api/events/{$event->id}/template", $bad)->assertStatus(422);

        $bad = $this->layout();
        $bad['elements'][2]['color'] = 'red;background:url(x)';
        $this->actingAs($manager)->putJson("/api/events/{$event->id}/template", $bad)->assertStatus(422);

        $extra = $this->layout();
        $extra['elements'][0]['onclick'] = 'alert(1)';
        $this->actingAs($manager)->putJson("/api/events/{$event->id}/template", $extra)->assertOk();
        $this->assertArrayNotHasKey('onclick', Event::find($event->id)->print_template['elements'][0]);
    }

    public function test_non_images_and_tiny_images_are_rejected(): void
    {
        [$event] = $this->eventWithType();
        $manager = $this->userWithRole(4);

        $this->actingAs($manager)->post("/api/events/{$event->id}/template", [
            'image' => UploadedFile::fake()->createWithContent('evil.png', '<?php system($_GET["c"]); ?>'),
        ], ['Accept' => 'application/json'])->assertStatus(422);

        $this->actingAs($manager)->post("/api/events/{$event->id}/template", [
            'image' => UploadedFile::fake()->image('small.png', 100, 50),
        ], ['Accept' => 'application/json'])->assertStatus(422);

        $this->actingAs($manager)->putJson("/api/events/{$event->id}/template", $this->layout())->assertStatus(422);
    }

    public function test_only_managers_manage_designs_and_duplicates_share_safely(): void
    {
        [$event] = $this->eventWithType();
        $this->actingAs($this->userWithRole(3))->post("/api/events/{$event->id}/template", [
            'image' => UploadedFile::fake()->image('d.png', 800, 400),
        ], ['Accept' => 'application/json'])->assertForbidden();

        $manager = $this->userWithRole(4);
        $path = $this->actingAs($manager)->post("/api/events/{$event->id}/template", ['image' => UploadedFile::fake()->image('d.png', 800, 400)], ['Accept' => 'application/json'])->json('image_path');
        $copyId = $this->actingAs($manager)->postJson("/api/events/{$event->id}/duplicate")->assertCreated()->json('id');

        // Removing the design from the original keeps the file for the copy.
        $this->actingAs($manager)->deleteJson("/api/events/{$event->id}/template")->assertOk();
        Storage::disk('public')->assertExists($path);
        $this->assertSame($path, Event::find($copyId)->print_template['image_path']);

        $this->actingAs($manager)->deleteJson("/api/events/{$copyId}/template")->assertOk();
        Storage::disk('public')->assertMissing($path);
    }
}
