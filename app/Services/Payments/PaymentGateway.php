<?php

namespace App\Services\Payments;

use App\Models\Payment;

interface PaymentGateway
{
    /**
     * Create a hosted checkout for the payment and return the URL the payer
     * should be redirected to.
     */
    public function createCheckout(Payment $payment, string $returnUrl, string $webhookUrl): string;

    /**
     * Ask the provider for the authoritative status of the payment. Never trust
     * redirect query strings or webhook bodies on their own.
     */
    public function fetchStatus(Payment $payment): GatewayStatus;
}
