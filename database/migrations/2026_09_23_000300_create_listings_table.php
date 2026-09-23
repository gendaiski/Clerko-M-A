<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listings', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 16)->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('draft');
            $table->string('tier')->nullable();
            $table->boolean('featured')->default(false);

            // Anonymised teaser (public).
            $table->string('headline');
            $table->text('teaser_summary');
            $table->string('sector');
            $table->string('employees_band');
            $table->string('location');
            $table->unsignedSmallInteger('established_year')->nullable();
            $table->decimal('annual_revenue', 18, 3);
            $table->decimal('ebitda', 18, 3)->nullable();
            $table->decimal('growth_pct', 6, 2)->nullable();
            $table->decimal('asking_price', 18, 3);
            $table->string('deal_preference');
            $table->json('highlights')->nullable();

            // Company Details Pack (released after NDA + unlock).
            $table->text('company_overview')->nullable();
            $table->text('financial_summary')->nullable();
            $table->decimal('valuation_low', 18, 3)->nullable();
            $table->decimal('valuation_high', 18, 3)->nullable();
            $table->text('valuation_summary')->nullable();
            $table->json('valuation_methods')->nullable();
            $table->json('financial_history')->nullable();
            $table->json('legal_findings')->nullable();
            $table->json('court_debt_checks')->nullable();

            $table->unsignedInteger('views_count')->default(0);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'sector']);
        });

        Schema::create('listing_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listing_id')->constrained()->cascadeOnDelete();
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->string('decision');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('listing_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listing_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->string('category');
            // "pack": part of the Company Details Pack once unlocked.
            // "staged": held back; released per deal room by the seller.
            $table->string('visibility')->default('pack');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            $table->string('sha256', 64);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listing_documents');
        Schema::dropIfExists('listing_reviews');
        Schema::dropIfExists('listings');
    }
};
