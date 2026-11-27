<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('tickets', 'email')) {
                // Optional guest email (asked when a printed invitation is handed out, or from an online request).
                $table->string('email')->nullable()->after('guest_category');
                $table->dateTime('emailed_at')->nullable()->after('email');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (Schema::hasColumn('tickets', 'email')) {
                $table->dropColumn(['email', 'emailed_at']);
            }
        });
    }
};
