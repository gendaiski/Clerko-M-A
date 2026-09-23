<?php

namespace App\Services\Extraction;

final class ExtractionResult
{
    public const PROCESSING = 'processing';

    public const COMPLETED = 'completed';

    public const FAILED = 'failed';

    /**
     * @param  array<string, mixed>  $fields
     */
    public function __construct(
        public readonly string $status,
        public readonly array $fields = [],
        public readonly ?string $error = null,
    ) {}
}
