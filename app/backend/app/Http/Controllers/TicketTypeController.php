<?php

namespace App\Http\Controllers;

use App\Models\TicketType;
use Illuminate\Http\Request;

class TicketTypeController extends Controller
{
    public function index(Request $request)
    {
        $query = TicketType::query()->with('event');
        if ($request->has('event_id')) {
            $query->where('event_id', $request->integer('event_id'));
        }
        return $query->orderBy('sort')->orderBy('id')->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $ticket = TicketType::create($data);
        return response()->json($ticket, 201);
    }

    public function update(Request $request, int $ticketTypeId)
    {
        $ticket = TicketType::findOrFail($ticketTypeId);
        $data = $this->validated($request, $ticketTypeId);
        $ticket->update($data);
        return $ticket->fresh();
    }

    public function destroy(int $ticketTypeId)
    {
        $ticket = TicketType::findOrFail($ticketTypeId);
        $ticket->delete();
        return response()->json(['deleted' => true]);
    }

    private function validated(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'event_id' => ['required', 'exists:events,id'],
            'name' => ['required', 'string', 'max:255'],
            'kind' => ['in:paid,free,donation,tiered'],
            'price' => ['numeric', 'min:0'],
            'currency' => ['string', 'max:8'],
            'capacity' => ['nullable', 'integer', 'min:0'],
            'shared_capacity_key' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
            'sales_start' => ['nullable', 'date'],
            'sales_end' => ['nullable', 'date'],
            'sort' => ['nullable', 'integer', 'min:0'],
            'metadata' => ['nullable', 'array'],
        ]);
    }
}
