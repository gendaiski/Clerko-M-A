<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\ComplianceFlag;
use App\Models\DealRoom;
use App\Models\KycSubmission;
use App\Models\Listing;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Renders every page with realistic demo data, as each role, and checks the
 * React page component exists.
 */
class PageSmokeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DemoSeeder::class);
    }

    public function test_public_pages(): void
    {
        $listing = Listing::live()->first();

        $this->get('/')->assertOk()->assertInertia(fn (Assert $p) => $p->component('welcome'));
        $this->get('/pricing')->assertOk()->assertInertia(fn (Assert $p) => $p->component('pricing'));
        $this->get('/marketplace?sector[]=technology&sort=price_desc')->assertOk()->assertInertia(fn (Assert $p) => $p->component('marketplace/index'));
        $this->get(route('marketplace.show', $listing))->assertOk()->assertInertia(fn (Assert $p) => $p->component('marketplace/show'));
    }

    public function test_seller_pages(): void
    {
        $seller = User::where('email', 'seller@clerko.test')->first();
        $listing = $seller->listings()->live()->first();
        $this->actingAs($seller);

        $pages = [
            route('seller.dashboard') => 'seller/dashboard',
            route('seller.companies.create') => 'seller/company/create',
            route('seller.companies.show', $listing->company_id) => 'seller/company/show',
            route('seller.listings.create') => 'seller/listings/form',
            route('seller.listings.show', $listing) => 'seller/listings/show',
            route('verification.show') => 'verification/show',
            route('notifications.index') => 'notifications',
            route('deal-rooms.show', DealRoom::first()) => 'deal-room/show',
        ];

        foreach ($pages as $url => $component) {
            $this->get($url)->assertOk()->assertInertia(fn (Assert $p) => $p->component($component));
        }

        $draft = Listing::factory()->create(['seller_id' => $seller->id, 'company_id' => $listing->company_id]);
        $this->get(route('seller.listings.edit', $draft))->assertOk()->assertInertia(fn (Assert $p) => $p->component('seller/listings/form'));
        $this->get(route('seller.listings.tier', $draft))->assertOk()->assertInertia(fn (Assert $p) => $p->component('seller/listings/tier'));
    }

    public function test_buyer_pages(): void
    {
        $buyer = User::where('email', 'buyer@clerko.test')->first();
        $engagement = $buyer->engagements()->first();
        $this->actingAs($buyer);

        $this->get(route('buyer.dashboard'))->assertOk()->assertInertia(fn (Assert $p) => $p->component('buyer/dashboard'));
        $this->get(route('buyer.preferences.edit'))->assertOk()->assertInertia(fn (Assert $p) => $p->component('buyer/preferences'));
        $this->get(route('engagements.pack', $engagement))->assertOk()->assertInertia(fn (Assert $p) => $p->component('buyer/pack'));
        $this->get(route('deal-rooms.show', DealRoom::first()))->assertOk()->assertInertia(fn (Assert $p) => $p->component('deal-room/show')->where('viewer.party', 'buyer'));

        // A fresh engagement shows the NDA, then the unlock page once signed.
        $other = Listing::live()->where('id', '!=', $engagement->listing_id)->first();
        $this->post(route('engagements.store', $other));
        $new = $buyer->engagements()->where('listing_id', $other->id)->first();
        $this->get(route('engagements.nda', $new))->assertOk()->assertInertia(fn (Assert $p) => $p->component('buyer/nda'));
        $new->update(['nda_signed_at' => now()]);
        $this->get(route('engagements.unlock', $new))->assertOk()->assertInertia(fn (Assert $p) => $p->component('buyer/unlock'));

        $this->post(route('engagements.unlock.pay', $new));
        $payment = \App\Models\Payment::latest('id')->first();
        $this->get(route('payments.fake-checkout', $payment))->assertOk()->assertInertia(fn (Assert $p) => $p->component('payments/fake-checkout'));
    }

    public function test_admin_pages(): void
    {
        $this->actingAs(User::where('email', 'admin@clerko.test')->first());

        ComplianceFlag::create(['deal_room_id' => DealRoom::first()->id, 'rule' => ComplianceFlag::RULE_OFF_PLATFORM_CONTACT, 'excerpt' => 'call me']);

        $pages = [
            route('admin.dashboard') => 'admin/dashboard',
            route('admin.listings.index') => 'admin/listings/index',
            route('admin.listings.index', ['status' => 'all']) => 'admin/listings/index',
            route('admin.listings.show', Listing::first()) => 'admin/listings/show',
            route('admin.companies.index') => 'admin/companies/index',
            route('admin.companies.show', Company::first()) => 'admin/companies/show',
            route('admin.kyc.index') => 'admin/kyc/index',
            route('admin.kyc.show', KycSubmission::first()) => 'admin/kyc/show',
            route('admin.compliance.index') => 'admin/compliance',
            route('admin.deals.index') => 'admin/deals',
            route('admin.audit.index', ['verify' => 1]) => 'admin/audit',
            route('deal-rooms.show', DealRoom::first()) => 'deal-room/show',
        ];

        foreach ($pages as $url => $component) {
            $this->get($url)->assertOk()->assertInertia(fn (Assert $p) => $p->component($component));
        }
    }
}
