<?php

namespace App\Services\Extraction;

use App\Models\Company;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Extracta.ai: upload the PDF to the CR-profile extraction, then poll the batch
 * for the result. The extraction (template) is configured in Extracta itself.
 */
class ExtractaExtractor implements ProfileExtractor
{
    public function __construct(
        private readonly string $apiKey,
        private readonly string $baseUrl,
        private readonly string $extractionId,
    ) {}

    public function submit(Company $company): string
    {
        $disk = Storage::disk(config('clerko.documents.disk'));

        $response = $this->client()
            ->attach('files', $disk->get($company->cr_pdf_path), 'cr-profile-'.$company->id.'.pdf')
            ->post('/uploadFiles', ['extractionId' => $this->extractionId])
            ->throw()
            ->json();

        $batchId = $response['batchId'] ?? null;
        if (! $batchId) {
            throw new RuntimeException('Extracta did not return a batch id.');
        }

        return $batchId;
    }

    public function fetch(Company $company): ExtractionResult
    {
        $response = $this->client()
            ->asJson()
            ->post('/getBatchResults', [
                'extractionId' => $this->extractionId,
                'batchId' => $company->extraction_reference,
            ])
            ->throw()
            ->json();

        $file = $response['files'][0] ?? null;
        $status = strtolower((string) ($file['status'] ?? $response['status'] ?? ''));

        return match (true) {
            $file !== null && in_array($status, ['processed', 'completed', 'done'], true) => new ExtractionResult(
                ExtractionResult::COMPLETED,
                is_array($file['result'] ?? null) ? $file['result'] : [],
            ),
            in_array($status, ['failed', 'error'], true) => new ExtractionResult(
                ExtractionResult::FAILED,
                error: (string) ($file['error'] ?? $response['message'] ?? 'Extraction failed.'),
            ),
            default => new ExtractionResult(ExtractionResult::PROCESSING),
        };
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl($this->baseUrl)
            ->withToken($this->apiKey)
            ->acceptJson()
            ->timeout(60);
    }
}
