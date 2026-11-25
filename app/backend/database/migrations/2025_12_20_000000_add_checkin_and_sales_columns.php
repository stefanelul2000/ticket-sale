<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('tickets', 'checked_in_at')) {
                $table->dateTime('checked_in_at')->nullable()->after('checkin');
            }
            if (! Schema::hasColumn('tickets', 'checked_in_by')) {
                $table->foreignId('checked_in_by')->nullable()->after('checked_in_at')->constrained('users')->nullOnDelete();
            }
        });

        Schema::table('ticket_types', function (Blueprint $table) {
            if (! Schema::hasColumn('ticket_types', 'shared_capacity_key')) {
                $table->string('shared_capacity_key')->nullable()->after('capacity');
            }
            if (! Schema::hasColumn('ticket_types', 'sales_start')) {
                $table->dateTime('sales_start')->nullable()->after('is_active');
            }
            if (! Schema::hasColumn('ticket_types', 'sales_end')) {
                $table->dateTime('sales_end')->nullable()->after('sales_start');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('checked_in_by');
            $table->dropColumn('checked_in_at');
        });

        Schema::table('ticket_types', function (Blueprint $table) {
            $table->dropColumn(['shared_capacity_key', 'sales_start', 'sales_end']);
        });
    }
};
