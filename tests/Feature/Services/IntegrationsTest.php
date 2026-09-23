<?php

namespace Tests\Feature\Services;

use App\Models\Company;
use App\Models\Payment;
use App\Models\User;
use App\Services\Extraction\ExtractaExtractor;
use App\Services\Extraction\ExtractionResult;
use App\Services\Extraction\ProfileMapper;
use App\Services\Payments\GatewayStatus;
use App\Services\Payments\TapGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class IntegrationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_extracta_uploads_the_pdf_and_reads_batch_results(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('companies/cr.pdf', '%PDF-1.4 fake');
        $company = Company::factory()->create(['cr_pdf_path' => 'companies/cr.pdf', 'extraction_reference' => null]);

        Http::fake([
            'api.extracta.ai/api/v1/uploadFiles' => Http::response(['status' => 'uploaded', 'batchId' => 'batch-1']),
            'api.extracta.ai/api/v1/getBatchResults' => Http::sequence()
                ->push(['files' => [['status' => 'processing']]])
                ->push(['files' => [['status' => 'processed', 'result' => ['cr_no' => '114231-1']]]]),
        ]);

        $extractor = new ExtractaExtractor('key', 'https://api.extracta.ai/api/v1', 'ext-1');

        $this->assertSame('batch-1', $extractor->submit($company));
        $company->extraction_reference = 'batch-1';

        $this->assertSame(ExtractionResult::PROCESSING, $extractor->fetch($company)->status);
        $done = $extractor->fetch($company);
        $this->assertSame(ExtractionResult::COMPLETED, $done->status);
        $this->assertSame('114231-1', $done->fields['cr_no']);

        Http::assertSent(fn (Request $r) => $r->url() === 'https://api.extracta.ai/api/v1/getBatchResults'
            && $r['extractionId'] === 'ext-1' && $r['batchId'] === 'batch-1'
            && $r->hasHeader('Authorization', 'Bearer key'));
    }

    public function test_profile_mapper_normalises_extracted_fields(): void
    {
        $mapped = app(ProfileMapper::class)->map([
            'cr_no' => ' 114231-1 ',
            'registration_date' => '14/03/2018',
            'expiration_date' => 'not a date',
            'issued_capital' => 'BHD 50,000.000',
            'partners_and_shareholders' => "Michael Rodriguez\nSara Al Khalifa",
        ]);

        $this->assertSame('114231-1', $mapped['cr_number']);
        $this->assertSame('2018-03-14', $mapped['registration_date']);
        $this->assertArrayNotHasKey('expiry_date', $mapped);
        $this->assertSame('50000.000', $mapped['capital']);
        $this->assertSame(['Michael Rodriguez', 'Sara Al Khalifa'], $mapped['shareholders']);
    }

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
