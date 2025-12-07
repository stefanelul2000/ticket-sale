<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
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
            $table->timestamps();
        });

        Schema::create('ticket_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('kind')->default('paid'); // paid, free, donation, tiered
            $table->decimal('price', 10, 2)->default(0);
            $table->string('currency', 8)->default('USD');
            $table->unsignedInteger('capacity')->nullable();
            $table->string('shared_capacity_key')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('sales_start')->nullable();
            $table->timestamp('sales_end')->nullable();
            $table->unsignedInteger('sort')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('category')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->string('currency', 8)->default('USD');
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('fee_flat', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('promo_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('code');
            $table->string('type')->default('percent'); // percent, fixed, access
            $table->decimal('amount', 10, 2)->default(0);
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('usage_count')->default(0);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->json('applies_to')->nullable(); // ticket_type ids or categories
            $table->boolean('lock_ticket')->default(false);
            $table->timestamps();
            $table->unique(['event_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_codes');
        Schema::dropIfExists('products');
        Schema::dropIfExists('ticket_types');
        Schema::dropIfExists('events');
    }
};
