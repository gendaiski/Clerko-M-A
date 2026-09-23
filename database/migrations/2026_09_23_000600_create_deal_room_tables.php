<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deal_rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('engagement_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('status')->default('open');
            // The Clerko Agent only reads a room when both parties have opted in.
            $table->timestamp('agent_opt_in_buyer_at')->nullable();
            $table->timestamp('agent_opt_in_seller_at')->nullable();
            $table->timestamps();
        });

        Schema::create('deal_room_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('asked_by')->constrained('users')->cascadeOnDelete();
            $table->string('category');
            $table->text('body');
            $table->string('status')->default('open');
            $table->timestamps();
        });

        Schema::create('deal_room_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_room_question_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('deal_room_document_releases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('listing_document_id')->constrained()->cascadeOnDelete();
            $table->foreignId('released_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['deal_room_id', 'listing_document_id'], 'deal_room_release_unique');
        });

        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('made_by')->constrained('users')->cascadeOnDelete();
            $table->string('party');
            $table->foreignId('parent_offer_id')->nullable()->constrained('offers')->nullOnDelete();
            $table->decimal('price', 18, 3);
            $table->string('structure');
            $table->decimal('stake_pct', 5, 2);
            $table->decimal('deposit_pct', 5, 2);
            $table->text('conditions')->nullable();
            $table->date('valid_until')->nullable();
            $table->string('status')->default('open');
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
        });

        Schema::create('headline_terms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_room_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('offer_id')->constrained()->cascadeOnDelete();
            $table->decimal('price', 18, 3);
            $table->string('structure');
            $table->decimal('stake_pct', 5, 2);
            $table->decimal('deposit_pct', 5, 2);
            $table->text('conditions')->nullable();
            $table->timestamp('buyer_acknowledged_at')->nullable();
            $table->timestamp('seller_acknowledged_at')->nullable();
            $table->timestamps();
        });

        Schema::create('agent_summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('model');
            $table->text('summary');
            $table->json('open_points');
            $table->json('buyer_focus');
            $table->json('seller_focus');
            $table->unsignedInteger('input_tokens')->nullable();
            $table->unsignedInteger('output_tokens')->nullable();
            $table->timestamps();
        });

        Schema::create('compliance_flags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_room_id')->nullable()->constrained()->cascadeOnDelete();
            $table->nullableMorphs('subject');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('rule');
            $table->text('excerpt');
            $table->string('status')->default('open');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compliance_flags');
        Schema::dropIfExists('agent_summaries');
        Schema::dropIfExists('headline_terms');
        Schema::dropIfExists('offers');
        Schema::dropIfExists('deal_room_document_releases');
        Schema::dropIfExists('deal_room_answers');
        Schema::dropIfExists('deal_room_questions');
        Schema::dropIfExists('deal_rooms');
    }
};
