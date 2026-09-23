<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('buyer_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->json('sectors')->nullable();
            $table->decimal('min_deal_size', 18, 3)->nullable();
            $table->decimal('max_deal_size', 18, 3)->nullable();
            $table->json('locations')->nullable();
            $table->boolean('alerts_enabled')->default(true);
            $table->timestamps();
        });

        // One buyer's interest in one listing, from NDA request to agreed terms.
        Schema::create('engagements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listing_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->string('stage')->default('nda_requested');
            $table->timestamp('nda_signed_at')->nullable();
            $table->timestamp('pack_unlocked_at')->nullable();
            $table->string('unlock_method')->nullable();
            $table->foreignId('unlock_payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamps();

            $table->unique(['listing_id', 'buyer_id']);
        });

        Schema::create('nda_signatures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('engagement_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('signed_name');
            $table->string('nda_version');
            $table->string('text_sha256', 64);
            $table->string('pdf_path');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('signed_at');
            $table->timestamps();
        });

        Schema::create('document_access_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('listing_document_id')->constrained()->cascadeOnDelete();
            $table->foreignId('engagement_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');
            $table->boolean('watermarked');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_access_logs');
        Schema::dropIfExists('nda_signatures');
        Schema::dropIfExists('engagements');
        Schema::dropIfExists('buyer_preferences');
    }
};
