<?php

namespace App\Services\Extraction;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Xtracta (xtracta.com): upload the PDF into a workflow, then read the
 * document's status and field data.
 *
 * Endpoints, parameter names and status values are all configuration
 * (clerko.extraction.xtracta), so they can be aligned with Xtracta's API
 * documentation without code changes. Responses may be XML or JSON; both are
 * handled. Verify against your Xtracta account with:
 *
 *   php artisan clerko:extraction:test path/to/cr.pdf --driver=xtracta
 */
class XtractaExtractor implements ProfileExtractor, ReceivesWebhooks
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private readonly array $config) {}

    public function name(): string
    {
        return 'xtracta';
    }

    public function submit(string $pdf, string $filename): string
    {
        $response = $this->client()
            ->attach($this->config['file_field'], $pdf, $filename)
            ->post($this->config['upload_path'], [
                'api_key' => $this->config['api_key'],
                'workflow_id' => $this->config['workflow_id'],
            ])
            ->throw();

        $data = FieldNormaliser::decode($response->body());
        $reference = Payload::find($data, $this->config['reference_key']);

        if (! is_scalar($reference) || (string) $reference === '') {
            throw new RuntimeException('Xtracta did not return a document id: '.Payload::excerpt($response->body(), 500));
        }

        return (string) $reference;
    }

    public function fetch(string $reference): ExtractionResult
    {
        $response = $this->client()
            ->asForm()
            ->post($this->config['status_path'], [
                'api_key' => $this->config['api_key'],
                $this->config['reference_key'] => $reference,
            ])
            ->throw();

        return $this->interpret(FieldNormaliser::decode($response->body()), $response->body());
    }

    public function parseWebhook(Request $request): ?array
    {
        $raw = $request->getContent();
        $data = FieldNormaliser::decode($raw) ?: $request->all();
        $reference = Payload::find($data, $this->config['reference_key']);

        if (! is_scalar($reference) || (string) $reference === '') {
            return null;
        }

        return ['reference' => (string) $reference, 'result' => $this->interpret($data, $raw)];
    }

    /**
     * @param  array<mixed>  $data
     */
    private function interpret(array $data, string $raw): ExtractionResult
    {
        $status = strtolower((string) Payload::find($data, $this->config['status_key']));

        if (in_array($status, $this->config['completed_statuses'], true)) {
            $fields = Payload::find($data, $this->config['fields_key']);

            return new ExtractionResult(ExtractionResult::COMPLETED, is_array($fields) ? $fields : $data, raw: $raw);
        }

        if (in_array($status, $this->config['failed_statuses'], true)) {
            return new ExtractionResult(ExtractionResult::FAILED, error: "Xtracta reported status \"{$status}\".", raw: $raw);
        }

        return new ExtractionResult(ExtractionResult::PROCESSING, raw: $raw);
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl($this->config['base_url'])->timeout(60)->retry(2, 1000, throw: false);
    }
}
