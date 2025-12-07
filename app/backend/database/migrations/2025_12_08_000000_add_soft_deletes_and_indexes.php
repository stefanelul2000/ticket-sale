<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            if (! Schema::hasColumn('events', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('ticket_types', function (Blueprint $table) {
            if (! Schema::hasColumn('ticket_types', 'deleted_at')) {
                $table->softDeletes();
            }
            $table->index('event_id');
        });

        Schema::table('tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('tickets', 'deleted_at')) {
                $table->softDeletes();
            }
            $table->index('event_id');
            $table->index('ticket_type_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            if (Schema::hasColumn('events', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
        Schema::table('ticket_types', function (Blueprint $table) {
            if (Schema::hasColumn('ticket_types', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
            $table->dropIndex(['event_id']);
        });
        Schema::table('tickets', function (Blueprint $table) {
            if (Schema::hasColumn('tickets', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
            $table->dropIndex(['event_id']);
            $table->dropIndex(['ticket_type_id']);
            $table->dropIndex(['user_id']);
        });
    }
};
