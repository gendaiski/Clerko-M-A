<?php

namespace App\Services\Extraction;

use App\Models\Company;
use App\Models\ExtractionRun;
use App\Models\User;
use App\Notifications\ClerkoNotification;
use App\Services\Audit\AuditLog;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Runs the company-profile extraction for a company: submit the CR PDF to the
 * configured provider, poll or receive its result, and apply it to the
 * profile. Every provider call is written to extraction_runs.
 */
class CompanyProfileExtraction
{
    public function __construct(
        private readonly ProfileExtractor $extractor,
        private readonly ProfileMapper $mapper,
        private readonly AuditLog $audit,
    ) {}

    public function provider(): string
    {
        return $this->extractor->name();
    }

    /** Send the CR PDF to the provider. */
    public function submit(Company $company): void
    {
        $pdf = Storage::disk(config('clerko.documents.disk'))->get($company->cr_pdf_path);

        $reference = $this->call($company, 'submit', function () use ($pdf, $company) {
            return $this->extractor->submit($pdf, "cr-profile-{$company->id}.pdf");
        }, fn (string $ref) => ['status' => 'submitted', 'reference' => $ref]);

        $company->update([
            'extraction_provider' => $this->extractor->name(),
            'extraction_reference' => $reference,
            'extraction_status' => Company::EXTRACTION_PROCESSING,
            'extraction_error' => null,
        ]);
    }

    /** Ask the provider for the result and apply it. Returns the result status. */
    public function poll(Company $company): string
    {
        $company->increment('extraction_attempts');

        $result = $this->call($company, 'poll', fn () => $this->extractor->fetch((string) $company->extraction_reference),
            fn (ExtractionResult $r) => ['status' => $r->status, 'reference' => $company->extraction_reference, 'error' => $r->error, 'response' => $r->raw]);

        $this->apply($company, $result);

        return $result->status;
    }

    /** Apply a result (from polling or a webhook). Safe to call twice. */
    public function apply(Company $company, ExtractionResult $result): void
    {
        if ($company->extraction_status === Company::EXTRACTION_COMPLETED) {
            return;
        }

        match ($result->status) {
            ExtractionResult::COMPLETED => $this->complete($company, $result),
            ExtractionResult::FAILED => $this->fail($company, $result->error ?? 'Extraction failed.'),
            ExtractionResult::MANUAL => $this->markManual($company, 'Waiting for an admin to enter the profile from the CR PDF.'),
            default => null,
        };
    }

    /** Reset and run again (admin or seller "retry"). */
    public function restart(Company $company): void
    {
        $company->update([
            'extraction_status' => Company::EXTRACTION_PENDING,
            'extraction_reference' => null,
            'extraction_error' => null,
            'extraction_attempts' => 0,
        ]);
    }

    public function fail(Company $company, string $error): void
    {
        $company->update(['extraction_status' => Company::EXTRACTION_FAILED, 'extraction_error' => $error]);
        $this->audit->record('company.extraction_failed', $company, $company->owner, ['error' => mb_substr($error, 0, 300)]);
        $this->notifyAdmins($company, 'Company profile extraction failed', 'We could not read the CR profile automatically. Retry, or enter the profile from the PDF.');
    }

    public function markManual(Company $company, string $reason): void
    {
        $company->update(['extraction_status' => Company::EXTRACTION_MANUAL, 'extraction_error' => $reason]);
        $this->notifyAdmins($company, 'Company profile to enter', 'A CR profile PDF is waiting to be entered and verified.');
    }

    /**
     * @param  array<string, mixed>  $fields
     */
    public function preview(array|string $fields): array
    {
        return [
            'mapped' => $this->mapper->map($fields),
            'unmapped_keys' => $this->mapper->unmappedKeys($fields),
        ];
    }

    private function complete(Company $company, ExtractionResult $result): void
    {
        $company->fill($this->mapper->map($result->fields));
        $company->extracted_data = $result->fields;
        $company->extraction_status = Company::EXTRACTION_COMPLETED;
        $company->extraction_error = null;
        $company->save();

        $this->audit->record('company.profile_extracted', $company, $company->owner, ['provider' => $company->extraction_provider]);
        $this->notifyAdmins($company, 'Company to verify', 'A company profile ('.($company->name_en ?? 'unnamed').') is ready for KYB verification.');
    }

    /**
     * Run a provider call and record it, successful or not.
     *
     * @template T
     *
     * @param  callable(): T  $call
     * @param  callable(T): array<string, mixed>  $describe
     * @return T
     */
    private function call(Company $company, string $action, callable $call, callable $describe): mixed
    {
        $started = hrtime(true);

        try {
            $value = $call();
        } catch (Throwable $e) {
            $this->record($company, $action, ['status' => 'error', 'error' => $e->getMessage()], $started);

            throw $e;
        }

        $this->record($company, $action, $describe($value), $started);

        return $value;
    }

    /**
     * @param  array<string, mixed>  $details
     */
    private function record(Company $company, string $action, array $details, int $started): void
    {
        ExtractionRun::create([
            'company_id' => $company->id,
            'provider' => $this->extractor->name(),
            'action' => $action,
            'status' => $details['status'],
            'reference' => $details['reference'] ?? null,
            'error' => isset($details['error']) ? mb_substr((string) $details['error'], 0, 2000) : null,
            'response' => Payload::excerpt($details['response'] ?? null),
            'duration_ms' => (int) ((hrtime(true) - $started) / 1_000_000),
            'created_at' => now(),
        ]);
    }

    private function notifyAdmins(Company $company, string $title, string $body): void
    {
        Notification::send(User::where('is_admin', true)->get(), new ClerkoNotification($title, $body, route('admin.companies.show', $company)));
    }

    /** Record a pushed (webhook) result in the run log, then apply it. */
    public function receive(Company $company, ExtractionResult $result): void
    {
        ExtractionRun::create([
            'company_id' => $company->id,
            'provider' => $this->extractor->name(),
            'action' => 'webhook',
            'status' => $result->status,
            'reference' => $company->extraction_reference,
            'error' => $result->error,
            'response' => Payload::excerpt($result->raw),
            'created_at' => now(),
        ]);

        $this->apply($company, $result);
    }
}
