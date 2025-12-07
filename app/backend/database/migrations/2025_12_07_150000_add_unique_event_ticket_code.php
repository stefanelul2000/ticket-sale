<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            // Ensure codes are unique per event (idempotent guard)
            $table->unique(['event_id', 'ticket_code'], 'tickets_event_code_unique');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropUnique('tickets_event_code_unique');
        });
    }
};
