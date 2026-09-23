<?php

namespace App\Jobs;

use App\Models\Company;
use App\Services\Extraction\CompanyProfileExtraction;
use App\Services\Extraction\ExtractionResult;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/**
 * Submits the CR PDF to the extraction provider and polls until the profile
 * is ready, then fills in the company profile for an admin to verify.
 */
class ExtractCompanyProfile implements ShouldQueue
{
    use Queueable;

    /** Transient provider errors are retried by the queue; polling uses release(). */
    public int $tries = 0;

    public int $maxExceptions = 3;

    public function __construct(public Company $company) {}

    public function retryUntil(): \DateTimeInterface
    {
        return now()->addSeconds(config('clerko.extraction.poll_interval') * (config('clerko.extraction.max_polls') + 2) + 300);
    }

    public function backoff(): array
    {
        return [30, 120, 300];
    }

    public function handle(CompanyProfileExtraction $extraction): void
    {
        $company = $this->company->fresh();

        if (! $company || in_array($company->extraction_status, [Company::EXTRACTION_COMPLETED, Company::EXTRACTION_MANUAL, Company::EXTRACTION_FAILED], true)) {
            return;
        }

        if (! $company->extraction_reference) {
            $extraction->submit($company);
        }

        if ($extraction->poll($company) !== ExtractionResult::PROCESSING) {
            return;
        }

        if ($company->fresh()->extraction_attempts >= config('clerko.extraction.max_polls')) {
            $extraction->fail($company, 'The provider did not return a result in time.');

            return;
        }

        $this->release(config('clerko.extraction.poll_interval'));
    }

    public function failed(?Throwable $exception): void
    {
        $company = $this->company->fresh();
        if ($company && $company->extraction_status !== Company::EXTRACTION_COMPLETED) {
            app(CompanyProfileExtraction::class)->fail($company, $exception?->getMessage() ?? 'Extraction failed.');
        }
    }
}
