<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products')) {
            Schema::drop('products');
        }
        if (Schema::hasTable('promo_codes')) {
            Schema::drop('promo_codes');
        }

        Schema::table('tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('tickets', 'ticket_type_id')) {
                $table->foreignId('ticket_type_id')->nullable()->after('event_id')->constrained('ticket_types')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (Schema::hasColumn('tickets', 'ticket_type_id')) {
                $table->dropConstrainedForeignId('ticket_type_id');
            }
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->decimal('price', 10, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('promo_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('code');
            $table->string('type')->default('percent');
            $table->decimal('amount', 10, 2)->default(0);
            $table->timestamps();
        });
    }
};
