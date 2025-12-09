<?php

namespace App\Http\Controllers;

use App\Models\PromoCode;
use Illuminate\Http\Request;

class PromoCodeController extends Controller
{
    public function index(Request $request)
    {
        $query = PromoCode::query()->with('event');
        if ($request->has('event_id')) {
            $query->where('event_id', $request->integer('event_id'));
        }
        return $query->orderBy('code')->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $promo = PromoCode::create($data);
        return response()->json($promo, 201);
    }

    public function update(Request $request, int $promoId)
    {
        $promo = PromoCode::findOrFail($promoId);
        $data = $this->validated($request, $promoId);
        $promo->update($data);
        return $promo->fresh();
    }

    public function destroy(int $promoId)
    {
        $promo = PromoCode::findOrFail($promoId);
        $promo->delete();
        return response()->json(['deleted' => true]);
    }

    private function validated(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'event_id' => ['required', 'exists:events,id'],
            'code' => ['required', 'string', 'max:255', 'unique:promo_codes,code,' . ($id ?? 'NULL') . ',id,event_id,' . $request->input('event_id')],
            'type' => ['in:percent,fixed,access'],
            'amount' => ['numeric'],
            'usage_limit' => ['nullable', 'integer', 'min:0'],
            'usage_count' => ['nullable', 'integer', 'min:0'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
            'applies_to' => ['nullable', 'array'],
            'lock_ticket' => ['boolean'],
        ]);
    }
}
