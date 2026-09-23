<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('extraction_provider')->nullable()->after('extraction_status');
            $table->unsignedSmallInteger('extraction_attempts')->default(0)->after('extraction_reference');
        });

        // Every call to the extraction provider, so an integration can be
        // debugged from the admin console without server access.
        Schema::create('extraction_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('provider');
            $table->string('action');
            $table->string('status');
            $table->string('reference')->nullable();
            $table->text('error')->nullable();
            $table->longText('response')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('extraction_runs');
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['extraction_provider', 'extraction_attempts']);
        });
    }
};
