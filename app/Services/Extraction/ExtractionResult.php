<?php

namespace App\Services\Extraction;

final class ExtractionResult
{
    public const PROCESSING = 'processing';

    public const COMPLETED = 'completed';

    public const FAILED = 'failed';

    /** No automatic extraction: an admin enters the profile from the PDF. */
    public const MANUAL = 'manual';

    /**
     * @param  array<string, mixed>  $fields  Extracted values, in whatever shape the provider returns.
     * @param  mixed  $raw  The provider's full response, kept for the run log.
     */
    public function __construct(
        public readonly string $status,
        public readonly array $fields = [],
        public readonly ?string $error = null,
        public readonly mixed $raw = null,
    ) {}
}
