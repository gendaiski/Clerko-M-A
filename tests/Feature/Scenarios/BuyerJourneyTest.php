<?php

namespace Tests\Feature\Scenarios;

use App\Enums\EngagementStage;
use App\Models\Engagement;
use App\Models\Listing;
use App\Models\ListingDocument;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Scenario 2: preferences → teaser → NDA → unlock → Company Details Pack.
 */
class BuyerJourneyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_buyer_signs_nda_unlocks_and_reads_the_pack(): void
    {
        $listing = Listing::factory()->live()->create();
        $seller = $listing->seller;
        $buyer = User::factory()->kycVerified()->create(['name' => 'Aisha Khan']);

        // Seller adds a pack document and a staged one.
        $this->actingAs($seller)->post(route('seller.listings.documents.store', $listing), [
            'title' => 'Audited financials 2023–2025',
            'category' => 'financials',
            'visibility' => 'pack',
            'file' => UploadedFile::fake()->create('financials.xlsx', 50),
        ])->assertRedirect();

        $this->actingAs($buyer)->put(route('buyer.preferences.update'), [
            'buyer_type' => 'strategic',
            'sectors' => ['technology'],
            'locations' => [],
            'alerts_enabled' => true,
        ])->assertRedirect(route('marketplace.index'));

        // Teaser page does not reveal the company.
        $this->get(route('marketplace.show', $listing))->assertOk()->assertDontSee($listing->company->name_en);

        // Request access → NDA.
        $this->post(route('engagements.store', $listing))->assertRedirect();
        $engagement = Engagement::sole();
        $this->assertSame(EngagementStage::NdaRequested, $engagement->stage);

        // The pack is locked before NDA + unlock.
        $this->get(route('engagements.pack', $engagement))->assertForbidden();

        // Name must match the verified legal name.
        $this->post(route('engagements.nda.sign', $engagement), ['signed_name' => 'Someone Else', 'agree' => '1'])
            ->assertSessionHasErrors('signed_name');
        $this->post(route('engagements.nda.sign', $engagement), ['signed_name' => 'Aisha Khan', 'agree' => '1'])
            ->assertRedirect(route('engagements.unlock', $engagement));

        $engagement->refresh();
        $this->assertTrue($engagement->hasSignedNda());
        Storage::disk('local')->assertExists($engagement->ndaSignature->pdf_path);
        $this->get(route('engagements.nda.pdf', $engagement))->assertOk();

        // Pay the per-company fee.
        $this->post(route('engagements.unlock.pay', $engagement))->assertRedirect();
        $payment = Payment::sole();
        $this->assertEquals(250, (float) $payment->amount);
        $this->post(route('payments.fake-complete', $payment), ['outcome' => 'paid']);
        $this->get(route('payments.return', $payment))->assertRedirect(route('engagements.pack', $engagement));

        $engagement->refresh();
        $this->assertSame(EngagementStage::PackUnlocked, $engagement->stage);

        $this->get(route('engagements.pack', $engagement))->assertOk();

        // Document access is logged.
        $document = ListingDocument::sole();
        $this->get(route('engagements.pack.document', [$engagement, $document]))->assertOk();
        $this->assertDatabaseHas('document_access_logs', [
            'user_id' => $buyer->id,
            'listing_document_id' => $document->id,
        ]);

        $this->get(route('buyer.dashboard'))->assertOk();
        $this->actingAs($seller)->get(route('seller.listings.show', $listing))->assertOk();
    }

    public function test_unverified_buyer_cannot_sign_the_nda(): void
    {
        $listing = Listing::factory()->live()->create();
        $buyer = User::factory()->create();

        $this->actingAs($buyer)->post(route('engagements.store', $listing));
        $engagement = Engagement::sole();

        $this->post(route('engagements.nda.sign', $engagement), ['signed_name' => $buyer->name, 'agree' => '1'])
            ->assertSessionHas('error');
        $this->assertFalse($engagement->fresh()->hasSignedNda());
    }

    public function test_failed_payment_does_not_unlock_the_pack(): void
    {
        $listing = Listing::factory()->live()->create();
        $buyer = User::factory()->kycVerified()->create();
        $engagement = Engagement::create([
            'listing_id' => $listing->id,
            'buyer_id' => $buyer->id,
            'stage' => EngagementStage::NdaSigned,
            'nda_signed_at' => now(),
        ]);

        $this->actingAs($buyer)->post(route('engagements.unlock.pay', $engagement));
        $payment = Payment::sole();
        $this->post(route('payments.fake-complete', $payment), ['outcome' => 'failed']);
        $this->get(route('payments.return', $payment))->assertSessionHas('error');

        $this->assertFalse($engagement->fresh()->hasUnlockedPack());
        $this->get(route('engagements.pack', $engagement))->assertForbidden();
    }
}
