<?php

namespace Tests\Feature\Scenarios;

use App\Enums\ListingStatus;
use App\Enums\VerificationStatus;
use App\Models\Company;
use App\Models\Listing;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Scenario 1: verify → company (CR PDF + extraction) → listing → tier & pay →
 * admin review → live teaser.
 */
class SellerJourneyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_seller_goes_from_cr_upload_to_a_live_listing(): void
    {
        $seller = User::factory()->create(['name' => 'Michael Rodriguez']);
        $admin = User::factory()->admin()->create();

        // KYC submission.
        $this->actingAs($seller)->post(route('verification.store'), [
            'full_legal_name' => 'Michael Rodriguez',
            'nationality' => 'Bahraini',
            'id_type' => 'cpr',
            'id_number' => '850101234',
            'id_expiry' => now()->addYears(2)->toDateString(),
            'id_document' => UploadedFile::fake()->create('cpr.pdf', 100, 'application/pdf'),
            'selfie' => UploadedFile::fake()->image('selfie.jpg'),
        ])->assertRedirect();
        $this->assertSame(VerificationStatus::Pending, $seller->fresh()->kyc_status);

        // Upload the Sijilat CR profile; the (fake) extractor fills the profile.
        $this->post(route('seller.companies.store'), [
            'cr_pdf' => UploadedFile::fake()->create('cr.pdf', 200, 'application/pdf'),
            'seller_capacity' => 'shareholder',
            'confirm_authority' => '1',
        ])->assertRedirect();

        $company = Company::sole();
        $this->assertSame(Company::EXTRACTION_COMPLETED, $company->extraction_status);
        $this->assertSame('Meridian Cloud W.L.L.', $company->name_en);
        $this->assertSame('114231-1', $company->cr_number);
        $this->assertCount(2, $company->shareholders);

        // The public teaser may not name the company.
        $listingData = [
            'company_id' => $company->id,
            'headline' => 'Meridian Cloud is for sale',
            'teaser_summary' => 'Recurring-revenue SaaS business.',
            'sector' => 'technology',
            'employees_band' => '11-50',
            'location' => 'manama',
            'annual_revenue' => 3200000,
            'asking_price' => 8500000,
            'deal_preference' => 'full_sale',
        ];
        $this->post(route('seller.listings.store'), $listingData)->assertSessionHasErrors('headline');

        $this->post(route('seller.listings.store'), [...$listingData, 'headline' => 'Profitable GCC SaaS company'])
            ->assertRedirect();
        $listing = Listing::sole();
        $this->assertSame(ListingStatus::Draft, $listing->status);

        // Choose the Premium tier and pay through the (fake) checkout.
        $this->post(route('seller.listings.tier.store', $listing), ['tier' => 'premium'])->assertRedirect();
        $payment = Payment::sole();
        $this->assertEquals(699, (float) $payment->amount);

        $this->post(route('payments.fake-complete', $payment), ['outcome' => 'paid'])
            ->assertRedirect(route('payments.return', $payment));
        $this->get(route('payments.return', $payment))->assertRedirect(route('seller.listings.show', $listing));

        $listing->refresh();
        $this->assertSame(ListingStatus::PendingReview, $listing->status);
        $this->assertSame('premium', $listing->tier);

        // Admin cannot approve before KYC and KYB are verified.
        $this->actingAs($admin)->post(route('admin.listings.review', $listing), ['decision' => 'approve'])
            ->assertSessionHasErrors('decision');

        $this->post(route('admin.kyc.decide', $seller->latestKycSubmission), ['decision' => 'verified'])->assertRedirect();
        $this->post(route('admin.companies.verify', $company), ['decision' => 'verified'])->assertRedirect();

        // Revision round-trip, then approval.
        $this->post(route('admin.listings.review', $listing), ['decision' => 'revise', 'notes' => 'Add audited financials.'])
            ->assertRedirect();
        $this->assertSame(ListingStatus::RevisionRequested, $listing->fresh()->status);

        $this->actingAs($seller)->post(route('seller.listings.submit', $listing))->assertRedirect(route('seller.listings.show', $listing));
        $this->assertSame(ListingStatus::PendingReview, $listing->fresh()->status);

        $this->actingAs($admin)->post(route('admin.listings.review', $listing), ['decision' => 'approve'])->assertRedirect();
        $this->assertSame(ListingStatus::Live, $listing->fresh()->status);

        // The teaser is public and anonymised.
        $this->get(route('marketplace.show', $listing))->assertOk()->assertDontSee('Meridian Cloud');
        $this->actingAs($seller)->get(route('seller.dashboard'))->assertOk();
    }

    public function test_seller_cannot_see_another_sellers_listing(): void
    {
        $listing = Listing::factory()->create();

        $this->actingAs(User::factory()->create())
            ->get(route('seller.listings.show', $listing))
            ->assertForbidden();
    }
}
