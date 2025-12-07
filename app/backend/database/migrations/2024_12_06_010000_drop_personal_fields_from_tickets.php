<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (Schema::hasColumn('tickets', 'cnp')) {
                $table->dropColumn('cnp');
            }
            if (Schema::hasColumn('tickets', 'dob')) {
                $table->dropColumn('dob');
            }
            if (Schema::hasColumn('tickets', 'organization')) {
                $table->dropColumn('organization');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->string('cnp')->nullable();
            $table->date('dob')->nullable();
            $table->string('organization')->nullable();
        });
    }
};
