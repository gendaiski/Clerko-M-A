<?php

namespace App\Services\Extraction;

use Illuminate\Http\Request;

/**
 * Implemented by providers that can push results to
 * POST /webhooks/extraction/{token} instead of (or as well as) being polled.
 */
interface ReceivesWebhooks
{
    /**
     * Read the provider's reference and result from a pushed request, or null
     * when the request is not a result this provider understands.
     *
     * @return array{reference: string, result: ExtractionResult}|null
     */
    public function parseWebhook(Request $request): ?array;
}
