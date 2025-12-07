<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            // Legacy used an auto-increment "serial" and a user-supplied "id" for ticket number.
            $table->id(); // acts as serial / QR range identifier
            $table->unsignedBigInteger('ticket_number')->unique(); // legacy "id"
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('cnp', 32)->nullable();
            $table->string('name')->nullable();
            $table->date('dob')->nullable();
            $table->string('organization')->nullable(); // generic affiliation
            $table->dateTime('sold_at')->nullable();
            $table->boolean('checkin')->default(false);
            $table->timestamps();

            $table->index('sold_at');
            $table->index('ticket_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
