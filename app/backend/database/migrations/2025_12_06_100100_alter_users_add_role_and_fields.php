<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // legacy app used "username" + "rank" + "cookie" + "revenue"
            $table->string('username')->unique()->after('name');
            $table->foreignId('role_id')->after('id')->constrained('roles');
            $table->integer('revenue')->default(0)->after('password');
            $table->string('cookie')->nullable()->after('revenue');

            // keep email but allow it to be nullable (legacy did not use email)
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
            $table->dropColumn(['username', 'revenue', 'cookie']);
            $table->string('email')->nullable(false)->change();
        });
    }
};
