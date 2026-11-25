<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Custom invitation design per event: a background image (the organisation's own design)
 * plus positioned elements (QR, barcode, number, name, code) in relative coordinates.
 * Rendering happens in the browser; the server only stores and validates.
 */
class PrintTemplateController extends Controller
{
    public const TYPES = ['qr', 'barcode', 'number', 'name', 'code'];

    private const MAX_SIDE = 6000;
    private const MIN_SIDE = 300;
    private const MAX_PIXELS = 30_000_000;

    public function upload(Request $request, int $eventId)
    {
        $event = Event::findOrFail($eventId);
        $request->validate([
            'image' => ['required', 'file', 'mimes:png,jpg,jpeg,webp', 'max:10240'],
        ]);

        $file = $request->file('image');
        $info = @getimagesize($file->getRealPath());
        if (! $info || ! in_array($info[2], [IMAGETYPE_PNG, IMAGETYPE_JPEG, IMAGETYPE_WEBP], true)) {
            return response()->json(['message' => __('The file is not a valid image.')], 422);
        }
        [$w, $h] = $info;
        if ($w < self::MIN_SIDE || $h < self::MIN_SIDE || $w > self::MAX_SIDE || $h > self::MAX_SIDE || $w * $h > self::MAX_PIXELS) {
            return response()->json(['message' => __('Image size must be between :min and :max pixels per side.', ['min' => self::MIN_SIDE, 'max' => self::MAX_SIDE])], 422);
        }

        // Re-encode with GD: strips metadata and anything that is not pixels.
        $src = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
        if (! $src) {
            return response()->json(['message' => __('The file is not a valid image.')], 422);
        }
        $isJpeg = $info[2] === IMAGETYPE_JPEG;
        $name = 'templates/'.Str::lower(Str::random(24)).($isJpeg ? '.jpg' : '.png');
        ob_start();
        if ($isJpeg) {
            imagejpeg($src, null, 92);
        } else {
            imagesavealpha($src, true);
            imagepng($src, null, 6);
        }
        $bytes = (string) ob_get_clean();
        imagedestroy($src);
        Storage::disk('public')->put($name, $bytes);

        $previous = $event->print_template ?? [];
        $template = [
            'image_path' => $name,
            'image_url' => '/storage/'.$name,
            'width_px' => $w,
            'height_px' => $h,
            'width_mm' => $previous['width_mm'] ?? 210,
            'elements' => $previous['elements'] ?? [],
        ];
        $this->deleteImageIfUnused($previous['image_path'] ?? null, $event->id);
        $event->update(['print_template' => $template]);
        $this->logAdminAction($request->user()?->id, 'event.template.upload', ['event_id' => $event->id, 'size' => "{$w}x{$h}"]);

        return response()->json($template, 201);
    }

    public function update(Request $request, int $eventId)
    {
        $event = Event::findOrFail($eventId);
        $template = $event->print_template;
        if (! $template || empty($template['image_path'])) {
            return response()->json(['message' => __('Upload the invitation design first.')], 422);
        }

        $hex = 'regex:/^#[0-9a-fA-F]{6}$/';
        $data = $request->validate([
            'width_mm' => ['required', 'numeric', 'min:30', 'max:600'],
            'elements' => ['present', 'array', 'max:20'],
            'elements.*.id' => ['required', 'string', 'max:40', 'regex:/^[A-Za-z0-9_-]+$/'],
            'elements.*.type' => ['required', 'in:'.implode(',', self::TYPES)],
            'elements.*.x' => ['required', 'numeric', 'min:0', 'max:1'],
            'elements.*.y' => ['required', 'numeric', 'min:0', 'max:1'],
            'elements.*.w' => ['required', 'numeric', 'min:0.005', 'max:1'],
            'elements.*.h' => ['required', 'numeric', 'min:0.005', 'max:1'],
            'elements.*.color' => ['nullable', $hex],
            'elements.*.background' => ['nullable', 'in:none,white'],
            'elements.*.align' => ['nullable', 'in:left,center,right'],
            'elements.*.font' => ['nullable', 'in:sans,display,mono'],
            'elements.*.bold' => ['nullable', 'boolean'],
            'elements.*.uppercase' => ['nullable', 'boolean'],
            'elements.*.prefix' => ['nullable', 'string', 'max:40'],
            'elements.*.digits' => ['nullable', 'integer', 'min:1', 'max:6'],
            'elements.*.qr_content' => ['nullable', 'in:ticket,photos,event'],
            'elements.*.show_text' => ['nullable', 'boolean'],
        ]);

        $allowed = ['id', 'type', 'x', 'y', 'w', 'h', 'color', 'background', 'align', 'font', 'bold', 'uppercase', 'prefix', 'digits', 'qr_content', 'show_text'];
        $elements = array_map(fn ($el) => array_intersect_key($el, array_flip($allowed)), $data['elements']);

        $template['width_mm'] = (float) $data['width_mm'];
        $template['elements'] = array_values($elements);
        $event->update(['print_template' => $template]);
        $this->logAdminAction($request->user()?->id, 'event.template.layout', ['event_id' => $event->id, 'elements' => count($elements)]);

        return response()->json($template);
    }

    public function destroy(Request $request, int $eventId)
    {
        $event = Event::findOrFail($eventId);
        $this->deleteImageIfUnused($event->print_template['image_path'] ?? null, $event->id);
        $event->update(['print_template' => null]);
        $this->logAdminAction($request->user()?->id, 'event.template.delete', ['event_id' => $event->id]);

        return response()->json(['deleted' => true]);
    }

    /** Duplicated events may share an image: only delete it when no other event uses it. */
    private function deleteImageIfUnused(?string $path, int $exceptEventId): void
    {
        if (! $path || ! str_starts_with($path, 'templates/')) {
            return;
        }
        $usedElsewhere = Event::withTrashed()
            ->where('id', '!=', $exceptEventId)
            ->whereNotNull('print_template')
            ->get(['id', 'print_template'])
            ->contains(fn (Event $e) => ($e->print_template['image_path'] ?? null) === $path);
        if (! $usedElsewhere) {
            Storage::disk('public')->delete($path);
        }
    }
}
