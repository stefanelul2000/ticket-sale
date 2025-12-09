<?php

namespace Database\Seeders;

use App\Models\Event;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class EventSeeder extends Seeder
{
    public function run(): void
    {
        if (Event::count() === 0) {
            Event::create([
                'name' => 'Demo Event',
                'slug' => Str::slug('Demo Event'),
                'is_online' => false,
                'venue' => 'Main Hall',
                'city' => 'Your City',
                'country' => 'Your Country',
                'capacity' => 1000,
            ]);
        }
    }
}
