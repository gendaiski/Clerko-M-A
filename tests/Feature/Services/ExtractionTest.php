<?php

namespace Tests\Feature\Services;

use App\Jobs\ExtractCompanyProfile;
use App\Models\Company;
use App\Models\ExtractionRun;
use App\Models\User;
use App\Services\Extraction\CompanyProfileExtraction;
use App\Services\Extraction\ExtractaExtractor;
use App\Services\Extraction\ExtractionResult;
use App\Services\Extraction\FieldNormaliser;
use App\Services\Extraction\Payload;
use App\Services\Extraction\ProfileMapper;
use App\Services\Extraction\XtractaExtractor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ExtractionTest extends TestCase
{
    use RefreshDatabase;

    private const XTRACTA_DONE = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<documents_response>
  <status>200</status>
  <document revision="2">
    <document_id>987654</document_id>
    <document_status>output</document_status>
    <field_data>
      <field><field_id>1</field_id><field_name>CR No.</field_name><field_value>114231-1</field_value></field>
      <field><field_id>2</field_id><field_name>Commercial Name (EN)</field_name><field_value>Meridian Cloud W.L.L.</field_value></field>
      <field><field_id>3</field_id><field_name>Registration Date</field_name><field_value>14/03/2018</field_value></field>
      <field><field_id>4</field_id><field_name>Issued Capital</field_name><field_value>50,000.000</field_value></field>
      <field><field_id>5</field_id><field_name>Town</field_name><field_value>Manama</field_value></field>
      <field><field_id>6</field_id><field_name>Block</field_name><field_value>317</field_value></field>
      <field><field_id>7</field_id><field_name>Website</field_name><field_value>meridian.example</field_value></field>
    </field_data>
  </document>
</documents_response>
XML;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    private function xtracta(): XtractaExtractor
    {
        return new XtractaExtractor(array_merge(config('clerko.extraction.xtracta'), ['api_key' => 'xk', 'workflow_id' => 'wf-1']));
    }

    public function test_normaliser_handles_the_shapes_providers_return(): void
    {
        $n = new FieldNormaliser;

        // Nested object with Sijilat labels.
        $this->assertSame('114231-1', $n->normalise(['CR No.' => ' 114231-1 '])['cr_no']);

        // List of name/value pairs, wrapped in a container.
        $this->assertSame(
            ['commercial_name_en' => 'Meridian', 'status' => 'ACTIVE'],
            $n->normalise(['fields' => [['name' => 'Commercial Name (EN)', 'value' => 'Meridian'], ['name' => 'Status', 'value' => 'ACTIVE']]]),
        );

        // Tables keep their rows, with row keys normalised.
        $table = $n->normalise(['Partners and Shareholders' => [['English Name' => 'Sara', 'Ownership (%)' => '40']]]);
        $this->assertSame([['english_name' => 'Sara', 'ownership' => '40']], $table['partners_and_shareholders']);

        // XML, including a single <field>.
        $xml = $n->normalise('<r><field_data><field><field_name>CR No.</field_name><field_value>1-1</field_value></field></field_data></r>');
        $this->assertSame('1-1', $xml['cr_no']);
    }

    public function test_mapper_uses_candidate_names_and_builds_the_address(): void
    {
        // Drivers hand the mapper the field data only (not the response envelope,
        // whose "status" would collide with the CR "Status" field).
        $fields = Payload::find(FieldNormaliser::decode(self::XTRACTA_DONE), 'field_data');
        $mapped = app(ProfileMapper::class)->map($fields);

        $this->assertSame('114231-1', $mapped['cr_number']);
        $this->assertSame('Meridian Cloud W.L.L.', $mapped['name_en']);
        $this->assertSame('2018-03-14', $mapped['registration_date']);
        $this->assertSame('50000.000', $mapped['capital']);
        $this->assertSame('Block 317, Manama', $mapped['address']);
        $this->assertContains('website', app(ProfileMapper::class)->unmappedKeys($fields));
    }

    public function test_xtracta_upload_and_status_over_xml(): void
    {
        Http::fake([
            'api-app.xtracta.com/v1/documents/upload' => Http::response('<xml><status>200</status><document_id>987654</document_id></xml>'),
            'api-app.xtracta.com/v1/documents' => Http::sequence()
                ->push('<documents_response><document><document_id>987654</document_id><document_status>indexing</document_status></document></documents_response>')
                ->push(self::XTRACTA_DONE)
                ->push('<documents_response><document><document_id>987654</document_id><document_status>reject</document_status></document></documents_response>'),
        ]);

        $xtracta = $this->xtracta();

        $this->assertSame('987654', $xtracta->submit('%PDF-1.4', 'cr.pdf'));
        $this->assertSame(ExtractionResult::PROCESSING, $xtracta->fetch('987654')->status);

        $done = $xtracta->fetch('987654');
        $this->assertSame(ExtractionResult::COMPLETED, $done->status);
        $this->assertSame('114231-1', app(ProfileMapper::class)->map($done->fields)['cr_number']);

        $this->assertSame(ExtractionResult::FAILED, $xtracta->fetch('987654')->status);

        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/documents/upload') && $r->isMultipart());
        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/documents') && $r['api_key'] === 'xk' && $r['document_id'] === '987654');
    }

    public function test_extracta_upload_and_batch_results(): void
    {
        Http::fake([
            'api.extracta.ai/api/v1/uploadFiles' => Http::response(['batchId' => 'batch-1']),
            'api.extracta.ai/api/v1/getBatchResults' => Http::response(['files' => [['status' => 'processed', 'result' => ['CR No.' => '114231-1']]]]),
        ]);

        $extracta = new ExtractaExtractor(array_merge(config('clerko.extraction.extracta'), ['api_key' => 'k', 'extraction_id' => 'e']));

        $this->assertSame('batch-1', $extracta->submit('%PDF', 'cr.pdf'));
        $this->assertSame('114231-1', app(ProfileMapper::class)->map($extracta->fetch('batch-1')->fields)['cr_number']);
    }

    public function test_seller_upload_runs_through_the_configured_provider_and_is_logged(): void
    {
        config(['clerko.extraction.driver' => 'xtracta', 'clerko.extraction.xtracta.api_key' => 'xk', 'clerko.extraction.xtracta.workflow_id' => 'wf']);
        Http::fake([
            'api-app.xtracta.com/v1/documents/upload' => Http::response('<xml><document_id>987654</document_id></xml>'),
            'api-app.xtracta.com/v1/documents' => Http::response(self::XTRACTA_DONE),
        ]);

        $this->actingAs(User::factory()->create())->post(route('seller.companies.store'), [
            'cr_pdf' => UploadedFile::fake()->create('cr.pdf', 100, 'application/pdf'),
            'seller_capacity' => 'shareholder',
            'confirm_authority' => '1',
        ]);

        $company = Company::sole();
        $this->assertSame(Company::EXTRACTION_COMPLETED, $company->extraction_status);
        $this->assertSame('xtracta', $company->extraction_provider);
        $this->assertSame('Meridian Cloud W.L.L.', $company->name_en);
        $this->assertSame(['submit', 'poll'], ExtractionRun::orderBy('id')->pluck('action')->all());
    }

    public function test_manual_driver_queues_the_profile_for_an_admin(): void
    {
        config(['clerko.extraction.driver' => 'manual']);
        $admin = User::factory()->admin()->create();

        $this->actingAs(User::factory()->create())->post(route('seller.companies.store'), [
            'cr_pdf' => UploadedFile::fake()->create('cr.pdf', 100, 'application/pdf'),
            'seller_capacity' => 'shareholder',
            'confirm_authority' => '1',
        ]);

        $company = Company::sole();
        $this->assertSame(Company::EXTRACTION_MANUAL, $company->extraction_status);

        // The admin enters the profile from the PDF and verifies it.
        $this->actingAs($admin)->put(route('admin.companies.update', $company), ['cr_number' => '114231-1', 'name_en' => 'Meridian Cloud W.L.L.'])->assertRedirect();
        $this->post(route('admin.companies.verify', $company), ['decision' => 'verified'])->assertRedirect();
        $this->assertTrue($company->fresh()->isVerified());
    }

    public function test_provider_errors_are_logged_and_can_be_retried_by_an_admin(): void
    {
        config(['clerko.extraction.driver' => 'xtracta']);
        Http::fake(['api-app.xtracta.com/v1/documents/upload' => Http::response('Unauthorised', 401)]);

        $company = Company::factory()->create(['extraction_status' => Company::EXTRACTION_PENDING, 'extraction_reference' => null]);
        Storage::disk('local')->put($company->cr_pdf_path, '%PDF');

        try {
            (new ExtractCompanyProfile($company))->handle(app(CompanyProfileExtraction::class));
            $this->fail('Expected the provider error to surface.');
        } catch (RequestException) {
        }

        $run = ExtractionRun::sole();
        $this->assertSame('error', $run->status);
        $this->assertStringContainsString('401', $run->error);

        config(['clerko.extraction.driver' => 'fake']);
        $this->actingAs(User::factory()->admin()->create())
            ->post(route('admin.companies.extraction.retry', $company))
            ->assertRedirect();
        $this->assertSame(Company::EXTRACTION_COMPLETED, $company->fresh()->extraction_status);
    }

    public function test_webhook_applies_a_pushed_result_and_rejects_bad_tokens(): void
    {
        config(['clerko.extraction.driver' => 'xtracta', 'clerko.extraction.webhook_token' => 'secret-token']);
        $company = Company::factory()->create([
            'extraction_status' => Company::EXTRACTION_PROCESSING,
            'extraction_provider' => 'xtracta',
            'extraction_reference' => '987654',
            'name_en' => null,
        ]);

        $this->call('POST', '/webhooks/extraction/wrong', content: self::XTRACTA_DONE)->assertNotFound();

        $this->call('POST', '/webhooks/extraction/secret-token', server: ['CONTENT_TYPE' => 'application/xml'], content: self::XTRACTA_DONE)
            ->assertOk()->assertJson(['received' => true]);

        $company->refresh();
        $this->assertSame(Company::EXTRACTION_COMPLETED, $company->extraction_status);
        $this->assertSame('Meridian Cloud W.L.L.', $company->name_en);
        $this->assertSame('webhook', ExtractionRun::sole()->action);
    }

    public function test_the_integration_command_shows_how_a_result_maps(): void
    {
        $pdf = tempnam(sys_get_temp_dir(), 'cr');
        file_put_contents($pdf, '%PDF-1.4');

        $this->artisan('clerko:extraction:test', ['pdf' => $pdf, '--driver' => 'fake'])
            ->expectsOutputToContain('Normalised fields')
            ->expectsOutputToContain('commercial_name_en')
            ->assertSuccessful();
    }
}
