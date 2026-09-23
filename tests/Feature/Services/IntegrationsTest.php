<?php

namespace Tests\Feature\Services;

use App\Models\Payment;
use App\Models\User;
use App\Services\Payments\GatewayStatus;
use App\Services\Payments\TapGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IntegrationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_tap_only_counts_a_captured_charge_for_the_right_amount_as_paid(): void
    {
        $payment = Payment::create([
            'user_id' => User::factory()->create()->id,
            'purpose' => Payment::PURPOSE_PACK_UNLOCK,
            'amount' => 250,
            'description' => 'Pack',
            'provider' => 'tap',
            'provider_reference' => 'chg_1',
        ]);

        $gateway = new TapGateway('sk_test', 'https://api.tap.company/v2');

        Http::fake(['api.tap.company/v2/charges/chg_1' => Http::sequence()
            ->push(['id' => 'chg_1', 'status' => 'CAPTURED', 'amount' => 250, 'currency' => 'BHD'])
            ->push(['id' => 'chg_1', 'status' => 'CAPTURED', 'amount' => 1, 'currency' => 'BHD'])
            ->push(['id' => 'chg_1', 'status' => 'INITIATED', 'amount' => 250, 'currency' => 'BHD'])
            ->push(['id' => 'chg_1', 'status' => 'DECLINED', 'amount' => 250, 'currency' => 'BHD']),
        ]);

        $this->assertSame(GatewayStatus::PAID, $gateway->fetchStatus($payment)->status);
        $this->assertSame(GatewayStatus::FAILED, $gateway->fetchStatus($payment)->status);
        $this->assertSame(GatewayStatus::PENDING, $gateway->fetchStatus($payment)->status);
        $this->assertSame(GatewayStatus::FAILED, $gateway->fetchStatus($payment)->status);
    }

    public function test_tap_checkout_returns_the_hosted_payment_url(): void
    {
        $payment = Payment::create([
            'user_id' => User::factory()->create(['name' => 'Aisha Khan'])->id,
            'purpose' => Payment::PURPOSE_PACK_UNLOCK,
            'amount' => 250,
            'description' => 'Pack',
            'provider' => 'tap',
        ]);

        Http::fake(['api.tap.company/v2/charges' => Http::response([
            'id' => 'chg_9', 'status' => 'INITIATED', 'transaction' => ['url' => 'https://checkout.tap.company/x'],
        ])]);

        $url = (new TapGateway('sk_test', 'https://api.tap.company/v2'))->createCheckout($payment, 'https://app/return', 'https://app/hook');

        $this->assertSame('https://checkout.tap.company/x', $url);
        $this->assertSame('chg_9', $payment->fresh()->provider_reference);
        Http::assertSent(fn (Request $r) => $r['currency'] === 'BHD' && $r['source']['id'] === 'src_all' && $r['customer']['first_name'] === 'Aisha');
    }
}
