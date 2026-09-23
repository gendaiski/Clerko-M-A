<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Append-only. Each row stores the hash of the previous row, so any
        // edit or deletion breaks the chain and is detectable.
        Schema::create('audit_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event');
            $table->nullableMorphs('subject');
            $table->foreignId('listing_id')->nullable()->index();
            $table->foreignId('deal_room_id')->nullable()->index();
            $table->json('properties')->nullable();
            $table->string('ip_address', 45)->nullable();
            // Unique: two events can never claim the same predecessor, so concurrent
            // writers cannot fork the chain (the loser retries).
            $table->string('previous_hash', 64)->nullable()->unique();
            $table->string('hash', 64);
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_events');
    }
};
