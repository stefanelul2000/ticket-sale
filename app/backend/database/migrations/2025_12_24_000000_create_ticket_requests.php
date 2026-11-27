<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('ticket_requests')) {
            Schema::create('ticket_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('event_id')->constrained()->cascadeOnDelete();
                $table->string('email');
                $table->string('phone', 40)->nullable();
                $table->json('attendees');               // ["Name 1", "Name 2", ...] (1..4)
                $table->unsignedTinyInteger('quantity');
                $table->text('message')->nullable();
                $table->string('status', 16)->default('pending'); // pending|approved|rejected|cancelled
                $table->string('locale', 5)->default('ro');
                $table->string('ip_hash', 64)->nullable();
                $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('decided_at')->nullable();
                $table->string('decision_note', 500)->nullable();
                $table->dateTime('sent_at')->nullable();
                $table->unsignedSmallInteger('send_count')->default(0);
                $table->string('send_error', 500)->nullable();
                $table->timestamps();

                $table->index(['event_id', 'status']);
                $table->index(['event_id', 'email']);
            });
        }

        Schema::table('tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('tickets', 'request_id')) {
                $table->foreignId('request_id')->nullable()->after('is_walk_in')->constrained('ticket_requests')->nullOnDelete();
            }
        });

        Schema::table('events', function (Blueprint $table) {
            if (! Schema::hasColumn('events', 'requests_enabled')) {
                $table->boolean('requests_enabled')->default(false)->after('print_template');
                $table->unsignedInteger('eticket_from')->nullable()->after('requests_enabled');
                $table->unsignedInteger('eticket_to')->nullable()->after('eticket_from');
                $table->unsignedTinyInteger('request_max')->default(4)->after('eticket_to');
                $table->text('eticket_message')->nullable()->after('request_max');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('request_id');
        });
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['requests_enabled', 'eticket_from', 'eticket_to', 'request_max', 'eticket_message']);
        });
        Schema::dropIfExists('ticket_requests');
    }
};
