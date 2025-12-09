<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query()->with('event');
        if ($request->has('event_id')) {
            $query->where('event_id', $request->integer('event_id'));
        }
        return $query->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $product = Product::create($data);
        return response()->json($product, 201);
    }

    public function update(Request $request, int $productId)
    {
        $product = Product::findOrFail($productId);
        $data = $this->validated($request, $productId);
        $product->update($data);
        return $product->fresh();
    }

    public function destroy(int $productId)
    {
        $product = Product::findOrFail($productId);
        $product->delete();
        return response()->json(['deleted' => true]);
    }

    private function validated(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'event_id' => ['required', 'exists:events,id'],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'price' => ['numeric', 'min:0'],
            'currency' => ['string', 'max:8'],
            'tax_rate' => ['numeric', 'min:0'],
            'fee_flat' => ['numeric', 'min:0'],
            'is_active' => ['boolean'],
            'metadata' => ['nullable', 'array'],
        ]);
    }
}
