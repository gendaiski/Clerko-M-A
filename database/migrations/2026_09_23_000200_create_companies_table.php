<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();

            // Source: the CR profile PDF the seller saved from Sijilat.
            $table->string('cr_pdf_path');
            $table->string('extraction_status')->default('pending');
            $table->string('extraction_reference')->nullable();
            $table->json('extracted_data')->nullable();
            $table->text('extraction_error')->nullable();

            // Company profile (filled from the extraction, corrected by admins).
            $table->string('cr_number')->nullable()->index();
            $table->string('name_en')->nullable();
            $table->string('name_ar')->nullable();
            $table->string('legal_form')->nullable();
            $table->string('cr_status')->nullable();
            $table->date('registration_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->decimal('capital', 18, 3)->nullable();
            $table->text('address')->nullable();
            $table->json('activities')->nullable();
            $table->json('shareholders')->nullable();
            $table->json('signatories')->nullable();

            // Authority to sell.
            $table->string('seller_capacity');
            $table->string('authority_document_path')->nullable();

            // KYB decision.
            $table->string('verification_status')->default('pending');
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('verification_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
