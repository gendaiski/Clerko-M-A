<?php

namespace App\Services\Extraction;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Extracta.ai: upload the PDF to an extraction, then poll the batch for the
 * result. Endpoints are configuration (clerko.extraction.extracta).
 */
class ExtractaExtractor implements ProfileExtractor, ReceivesWebhooks
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private readonly array $config) {}

    public function name(): string
    {
        return 'extracta';
    }

    public function submit(string $pdf, string $filename): string
    {
        $response = $this->client()
            ->attach('files', $pdf, $filename)
            ->post($this->config['upload_path'], ['extractionId' => $this->config['extraction_id']])
            ->throw()
            ->json();

        $batchId = $response['batchId'] ?? null;
        if (! $batchId) {
            throw new RuntimeException('Extracta did not return a batch id.');
        }

        return (string) $batchId;
    }

    public function fetch(string $reference): ExtractionResult
    {
        $response = $this->client()
            ->asJson()
            ->post($this->config['results_path'], [
                'extractionId' => $this->config['extraction_id'],
                'batchId' => $reference,
            ])
            ->throw()
            ->json();

        return $this->interpret(is_array($response) ? $response : []);
    }

    public function parseWebhook(Request $request): ?array
    {
        $data = $request->all();
        $reference = $data['batchId'] ?? Payload::find($data, 'batchId');

        return is_scalar($reference) && $reference !== ''
            ? ['reference' => (string) $reference, 'result' => $this->interpret($data)]
            : null;
    }

    /**
     * @param  array<mixed>  $response
     */
    private function interpret(array $response): ExtractionResult
    {
        $file = $response['files'][0] ?? null;
        $status = strtolower((string) ($file['status'] ?? $response['status'] ?? ''));

        return match (true) {
            $file !== null && in_array($status, ['processed', 'completed', 'done'], true) => new ExtractionResult(
                ExtractionResult::COMPLETED,
                is_array($file['result'] ?? null) ? $file['result'] : [],
                raw: $response,
            ),
            in_array($status, ['failed', 'error'], true) => new ExtractionResult(
                ExtractionResult::FAILED,
                error: (string) ($file['error'] ?? $response['message'] ?? 'Extraction failed.'),
                raw: $response,
            ),
            default => new ExtractionResult(ExtractionResult::PROCESSING, raw: $response),
        };
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl($this->config['base_url'])
            ->withToken((string) $this->config['api_key'])
            ->acceptJson()
            ->timeout(60);
    }
}
