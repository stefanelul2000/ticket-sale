<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('event_id')->after('id')->constrained()->cascadeOnDelete();
            $table->unique(['event_id', 'ticket_number']);
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'ticket_number']);
            $table->dropConstrainedForeignId('event_id');
        });
    }
};
