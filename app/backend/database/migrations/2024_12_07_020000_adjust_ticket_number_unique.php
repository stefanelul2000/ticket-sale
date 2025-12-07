<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            // drop legacy unique on ticket_number if it exists
            try {
                $table->dropUnique('tickets_ticket_number_unique');
            } catch (Throwable $e) {
                // ignore if not present
            }
            // add composite unique per event
            $table->unique(['event_id', 'ticket_number'], 'tickets_event_ticket_unique');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropUnique('tickets_event_ticket_unique');
            $table->unique('ticket_number');
        });
    }
};
