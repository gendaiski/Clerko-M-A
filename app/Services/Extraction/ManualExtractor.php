<?php

namespace App\Services\Extraction;

use Illuminate\Support\Str;

/**
 * No automatic extraction: the CR PDF is queued for an admin, who enters the
 * company profile by hand. Lets the platform run before an extraction API is
 * connected, and is the fallback when extraction fails.
 */
class ManualExtractor implements ProfileExtractor
{
    public function name(): string
    {
        return 'manual';
    }

    public function submit(string $pdf, string $filename): string
    {
        return 'manual-'.Str::ulid();
    }

    public function fetch(string $reference): ExtractionResult
    {
        return new ExtractionResult(ExtractionResult::MANUAL);
    }
}
