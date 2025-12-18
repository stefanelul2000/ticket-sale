<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ticket_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ticket_code')->nullable();
            $table->string('action');
            $table->string('status')->nullable();
            $table->boolean('success')->default(true);
            $table->string('attendee_name')->nullable();
            $table->json('context')->nullable();
            $table->timestamps();

            $table->index('ticket_code');
            $table->index('action');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_activity_logs');
    }
};
