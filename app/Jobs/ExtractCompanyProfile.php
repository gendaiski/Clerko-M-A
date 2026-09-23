<?php

namespace App\Jobs;

use App\Models\Company;
use App\Models\User;
use App\Notifications\ClerkoNotification;
use App\Services\Audit\AuditLog;
use App\Services\Extraction\ExtractionResult;
use App\Services\Extraction\ProfileExtractor;
use App\Services\Extraction\ProfileMapper;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Notification;
use Throwable;

/**
 * Submits the CR PDF to the extractor and polls until the profile is ready,
 * then fills in the company profile for an admin to verify.
 */
class ExtractCompanyProfile implements ShouldQueue
{
    use Queueable;

    public int $tries = 40;

    public function __construct(public Company $company) {}

    public function handle(ProfileExtractor $extractor, ProfileMapper $mapper, AuditLog $audit): void
    {
        $company = $this->company;

        if ($company->extraction_status === Company::EXTRACTION_COMPLETED) {
            return;
        }

        if (! $company->extraction_reference) {
            $company->update([
                'extraction_reference' => $extractor->submit($company),
                'extraction_status' => Company::EXTRACTION_PROCESSING,
            ]);
        }

        $result = $extractor->fetch($company);

        if ($result->status === ExtractionResult::PROCESSING) {
            $this->release(15);

            return;
        }

        if ($result->status === ExtractionResult::FAILED) {
            $this->markFailed($result->error ?? 'Extraction failed.');

            return;
        }

        $company->fill($mapper->map($result->fields));
        $company->extracted_data = $result->fields;
        $company->extraction_status = Company::EXTRACTION_COMPLETED;
        $company->extraction_error = null;
        $company->save();

        $audit->record('company.profile_extracted', $company, $company->owner);

        Notification::send(
            User::where('is_admin', true)->get(),
            new ClerkoNotification('Company to verify', "A company profile ({$company->name_en}) is ready for KYB verification.", route('admin.companies.show', $company)),
        );
    }

    public function failed(?Throwable $exception): void
    {
        $this->markFailed($exception?->getMessage() ?? 'Extraction failed.');
    }

    private function markFailed(string $error): void
    {
        $this->company->update([
            'extraction_status' => Company::EXTRACTION_FAILED,
            'extraction_error' => $error,
        ]);
    }
}
