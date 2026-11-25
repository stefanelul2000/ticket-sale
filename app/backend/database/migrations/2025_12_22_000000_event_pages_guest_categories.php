<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            if (! Schema::hasColumn('events', 'description')) {
                $table->text('description')->nullable()->after('name');
            }
            if (! Schema::hasColumn('events', 'is_public')) {
                $table->boolean('is_public')->default(false)->after('is_online');
            }
            if (! Schema::hasColumn('events', 'donation_url')) {
                $table->string('donation_url', 2048)->nullable()->after('capacity');
            }
            if (! Schema::hasColumn('events', 'photos_url')) {
                $table->string('photos_url', 2048)->nullable()->after('donation_url');
            }
        });

        Schema::table('tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('tickets', 'guest_category')) {
                $table->string('guest_category', 32)->nullable()->after('name');
                $table->index('guest_category');
            }
            if (! Schema::hasColumn('tickets', 'is_walk_in')) {
                $table->boolean('is_walk_in')->default(false)->after('checked_in_by');
            }
        });

        Schema::table('ticket_activity_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('ticket_activity_logs', 'event_id')) {
                $table->unsignedBigInteger('event_id')->nullable()->after('user_id');
                $table->index(['event_id', 'created_at']);
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'last_login_at')) {
                $table->dateTime('last_login_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['description', 'is_public', 'donation_url', 'photos_url']);
        });
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex(['guest_category']);
            $table->dropColumn(['guest_category', 'is_walk_in']);
        });
        Schema::table('ticket_activity_logs', function (Blueprint $table) {
            $table->dropIndex(['event_id', 'created_at']);
            $table->dropColumn('event_id');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('last_login_at');
        });
    }
};
