<?php

namespace App\Services\Payments;

use App\Models\Payment;

/**
 * Local stand-in for Tap: redirects to an in-app checkout page where the
 * developer chooses to pay or fail. Never enabled in production.
 */
class FakeGateway implements PaymentGateway
{
    public function createCheckout(Payment $payment, string $returnUrl, string $webhookUrl): string
    {
        $payment->update(['provider_reference' => 'fake_'.$payment->uuid]);

        return route('payments.fake-checkout', $payment);
    }

    public function fetchStatus(Payment $payment): GatewayStatus
    {
        return new GatewayStatus(match ($payment->provider_payload['fake_outcome'] ?? null) {
            'paid' => GatewayStatus::PAID,
            'failed' => GatewayStatus::FAILED,
            default => GatewayStatus::PENDING,
        });
    }
}
