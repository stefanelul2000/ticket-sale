<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('events')) {
            Schema::create('events', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->boolean('is_online')->default(false);
                $table->string('venue')->nullable();
                $table->string('city')->nullable();
                $table->string('country')->nullable();
                $table->timestamp('starts_at')->nullable();
                $table->timestamp('ends_at')->nullable();
                $table->unsignedInteger('capacity')->nullable();
                $table->json('branding')->nullable();
                $table->json('seo')->nullable();
                $table->softDeletes();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('ticket_types')) {
            Schema::create('ticket_types', function (Blueprint $table) {
                $table->id();
                $table->foreignId('event_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('kind')->default('paid'); // paid, free, donation, tiered
                $table->decimal('price', 10, 2)->default(0);
                $table->string('currency', 8)->default('USD');
                $table->unsignedInteger('capacity')->nullable();
                $table->boolean('is_active')->default(true);
                $table->unsignedInteger('sort')->default(0);
                $table->json('metadata')->nullable();
                $table->softDeletes();
                $table->timestamps();
                $table->index('event_id');
            });
        }

        if (! Schema::hasTable('tickets')) {
            Schema::create('tickets', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ticket_number');
                $table->string('ticket_code');
                $table->foreignId('event_id')->constrained()->cascadeOnDelete();
                $table->foreignId('ticket_type_id')->nullable()->constrained('ticket_types')->nullOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('name')->nullable();
                $table->dateTime('sold_at')->nullable();
                $table->boolean('checkin')->default(false);
                $table->softDeletes();
                $table->timestamps();

                $table->unique(['event_id', 'ticket_number']);
                $table->unique(['event_id', 'ticket_code']);
                $table->unique('ticket_code');
                $table->index('event_id');
                $table->index('ticket_type_id');
                $table->index('user_id');
                $table->index('sold_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('ticket_types');
        Schema::dropIfExists('events');
    }
};
