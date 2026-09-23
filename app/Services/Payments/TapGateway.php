<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Tap Payments hosted checkout (cards, BENEFIT, Apple Pay) via the Charges API.
 */
class TapGateway implements PaymentGateway
{
    public function __construct(
        private readonly string $secretKey,
        private readonly string $baseUrl,
    ) {}

    public function createCheckout(Payment $payment, string $returnUrl, string $webhookUrl): string
    {
        $user = $payment->user;
        [$firstName, $lastName] = array_pad(explode(' ', $user->name, 2), 2, '');

        $response = $this->client()->post('/charges', [
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency,
            'description' => $payment->description,
            'customer' => [
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $user->email,
            ],
            'source' => ['id' => 'src_all'],
            'reference' => ['transaction' => $payment->uuid, 'order' => $payment->uuid],
            'metadata' => ['payment_uuid' => $payment->uuid, 'purpose' => $payment->purpose],
            'redirect' => ['url' => $returnUrl],
            'post' => ['url' => $webhookUrl],
        ])->throw()->json();

        $payment->update([
            'provider_reference' => $response['id'] ?? null,
            'provider_payload' => $response,
        ]);

        $url = $response['transaction']['url'] ?? null;
        if (! $url) {
            throw new RuntimeException('Tap did not return a checkout URL.');
        }

        return $url;
    }

    public function fetchStatus(Payment $payment): GatewayStatus
    {
        if (! $payment->provider_reference) {
            return new GatewayStatus(GatewayStatus::PENDING);
        }

        $charge = $this->client()->get('/charges/'.$payment->provider_reference)->throw()->json();

        $amountMatches = abs((float) ($charge['amount'] ?? 0) - (float) $payment->amount) < 0.0005
            && ($charge['currency'] ?? null) === $payment->currency;

        $status = match (true) {
            ($charge['status'] ?? null) === 'CAPTURED' && $amountMatches => GatewayStatus::PAID,
            in_array($charge['status'] ?? null, ['INITIATED', 'IN_PROGRESS'], true) => GatewayStatus::PENDING,
            default => GatewayStatus::FAILED,
        };

        return new GatewayStatus($status, $charge);
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl($this->baseUrl)
            ->withToken($this->secretKey)
            ->acceptJson()
            ->timeout(20);
    }
}
