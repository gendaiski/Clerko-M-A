<?php

namespace App\Services\Payments;

final class GatewayStatus
{
    public const PAID = 'paid';

    public const FAILED = 'failed';

    public const PENDING = 'pending';

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public readonly string $status,
        public readonly array $payload = [],
    ) {}
}
