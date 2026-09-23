<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Services\Extraction\CompanyProfileExtraction;
use App\Services\Extraction\ProfileExtractor;
use App\Services\Extraction\ReceivesWebhooks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Receives extraction results pushed by the provider. The URL carries a shared
 * secret (CLERKO_EXTRACTION_WEBHOOK_TOKEN): configure the provider to call
 * https://<domain>/webhooks/extraction/<token>.
 */
class ExtractionWebhookController extends Controller
{
    public function __invoke(Request $request, string $token, ProfileExtractor $extractor, CompanyProfileExtraction $extraction): JsonResponse
    {
        $expected = (string) config('clerko.extraction.webhook_token');
        abort_if($expected === '' || ! hash_equals($expected, $token), 404);
        abort_unless($extractor instanceof ReceivesWebhooks, 404);

        $parsed = $extractor->parseWebhook($request);
        if ($parsed === null) {
            return response()->json(['received' => false, 'reason' => 'unrecognised payload'], 422);
        }

        $company = Company::query()
            ->where('extraction_reference', $parsed['reference'])
            ->where('extraction_provider', $extractor->name())
            ->first();

        if (! $company) {
            return response()->json(['received' => false, 'reason' => 'unknown reference'], 404);
        }

        $extraction->receive($company, $parsed['result']);

        return response()->json(['received' => true]);
    }
}
