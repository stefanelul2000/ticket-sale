<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('tickets', 'ticket_code')) {
                $table->string('ticket_code')->nullable()->unique()->after('ticket_number');
            }
        });

        // Backfill existing tickets with a simple eventId_prefix + padded number
        if (Schema::hasColumn('tickets', 'ticket_code') && Schema::hasColumn('tickets', 'event_id')) {
            $tickets = DB::table('tickets')->whereNull('ticket_code')->get(['id', 'event_id', 'ticket_number']);
            foreach ($tickets as $t) {
                $width = max(3, strlen((string) $t->ticket_number));
                $code = $t->event_id . '_' . str_pad((string) $t->ticket_number, $width, '0', STR_PAD_LEFT);
                DB::table('tickets')->where('id', $t->id)->update(['ticket_code' => $code]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (Schema::hasColumn('tickets', 'ticket_code')) {
                $table->dropUnique(['ticket_code']);
                $table->dropColumn('ticket_code');
            }
        });
    }
};
