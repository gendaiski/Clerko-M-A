<?php

namespace Database\Seeders;

use App\Enums\EngagementStage;
use App\Enums\ListingStatus;
use App\Enums\VerificationStatus;
use App\Models\BuyerPreference;
use App\Models\Company;
use App\Models\Engagement;
use App\Models\KycSubmission;
use App\Models\Listing;
use App\Models\ListingDocument;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Buyer\PackUnlocker;
use App\Services\DealRoom\DealRoomService;
use App\Services\Nda\NdaSigner;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Seeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Demo data mirroring the interactive prototype, for local development and
 * walkthroughs. Never run in production.
 *
 *   php artisan db:seed --class=DemoSeeder
 *
 * Log in with any of these (password: "password"):
 *   admin@clerko.test   – admin console
 *   seller@clerko.test  – seller with live listings and an active deal room
 *   buyer@clerko.test   – verified buyer inside that deal room
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->error('DemoSeeder must not run in production.');

            return;
        }

        $admin = User::factory()->admin()->kycVerified()->create(['name' => 'Clerko Admin', 'email' => 'admin@clerko.test']);
        $seller = User::factory()->kycVerified()->create(['name' => 'Michael Rodriguez', 'email' => 'seller@clerko.test']);
        $buyer = User::factory()->kycVerified()->create(['name' => 'Aisha Khan', 'email' => 'buyer@clerko.test', 'buyer_type' => 'strategic']);

        BuyerPreference::create(['user_id' => $buyer->id, 'sectors' => ['technology', 'consulting'], 'alerts_enabled' => true]);

        $listings = collect([
            ['Meridian Cloud W.L.L.', 'Profitable GCC SaaS company with recurring revenue', 'technology', '11-50', 2018, 3200000, 640000, 25, 8500000, 'premium', ['Recurring revenue', 'Diversified clients', 'Proprietary platform']],
            ['Gulf Advisory Partners W.L.L.', 'High-growth digital transformation consultancy', 'consulting', '11-50', 2019, 950000, 260000, 35, 2800000, 'premium', ['Digital transformation', 'Blue-chip clients']],
            ['Sitra Precision Industries B.S.C. (c)', 'ISO-certified light manufacturer, export ready', 'manufacturing', '51-200', 2015, 4100000, 720000, 12, 5200000, 'standard', ['ISO certified', 'Export ready']],
            ['Bahrain Fresh Foods W.L.L.', 'Established fresh-food brand with retail network', 'food_beverage', '11-50', 2017, 720000, 150000, 18, 1400000, 'standard', ['Retail network', 'Brand recognition']],
            ['Marina Bay Hospitality W.L.L.', 'Prime-location hospitality business with loyal customers', 'hospitality', '51-200', 2016, 2600000, 540000, 22, 3900000, 'enterprise', ['Prime location', 'Loyal customers']],
            ['Pixel & Palm Media S.P.C.', 'Digital-first creative agency with recurring retainers', 'marketing', '11-50', 2020, 410000, 90000, 40, 680000, 'standard', ['Digital first', 'Recurring retainers']],
        ])->map(function (array $row, int $i) use ($seller) {
            [$name, $headline, $sector, $band, $year, $revenue, $ebitda, $growth, $price, $tier, $highlights] = $row;

            $company = Company::factory()->verified()->create([
                'owner_id' => $seller->id,
                'name_en' => $name,
                'cr_number' => (114231 + $i).'-1',
                'extracted_data' => ['commercial_name_en' => $name],
            ]);

            $listing = Listing::factory()->live()->create([
                'company_id' => $company->id,
                'seller_id' => $seller->id,
                'headline' => $headline,
                'teaser_summary' => 'An established Bahrain business with a strong track record. Full identity, financials and documents are released after the NDA.',
                'sector' => $sector,
                'employees_band' => $band,
                'established_year' => $year,
                'annual_revenue' => $revenue,
                'ebitda' => $ebitda,
                'growth_pct' => $growth,
                'asking_price' => $price,
                'valuation_low' => round($price * 0.93),
                'valuation_high' => round($price * 1.07),
                'valuation_summary' => 'Indicative range based on EBITDA and revenue multiples benchmarked against comparable GCC transactions.',
                'valuation_methods' => [
                    ['method' => 'EBITDA multiple', 'value' => round($price * 0.98)],
                    ['method' => 'Revenue multiple', 'value' => round($price * 1.04)],
                    ['method' => 'DCF (base case)', 'value' => round($price * 0.95)],
                ],
                'financial_history' => [
                    ['year' => 2023, 'revenue' => round($revenue / 1.56), 'ebitda' => round($ebitda / 1.64)],
                    ['year' => 2024, 'revenue' => round($revenue / 1.25), 'ebitda' => round($ebitda / 1.25)],
                    ['year' => 2025, 'revenue' => $revenue, 'ebitda' => $ebitda],
                ],
                'legal_findings' => [
                    ['status' => 'ok', 'text' => 'Clean corporate structure — no minority disputes'],
                    ['status' => 'ok', 'text' => 'IP assigned to the company; key contracts assignable'],
                    ['status' => 'warning', 'text' => 'Two client contracts contain change-of-control clauses'],
                ],
                'court_debt_checks' => [
                    ['status' => 'ok', 'text' => 'No active litigation on record'],
                    ['status' => 'ok', 'text' => 'No registered defaults'],
                ],
                'highlights' => $highlights,
                'tier' => $tier,
                'featured' => $tier !== 'standard',
                'views_count' => [245, 156, 189, 98, 210, 74][$i],
            ]);

            Subscription::create([
                'user_id' => $seller->id,
                'listing_id' => $listing->id,
                'plan' => $tier,
                'monthly_price' => config("clerko.seller_tiers.{$tier}.monthly_price"),
                'status' => Subscription::STATUS_ACTIVE,
                'starts_at' => now()->subDays(10),
                'ends_at' => now()->addDays(20),
            ]);

            return $listing;
        });

        $meridian = $listings->first();
        $this->addDocuments($meridian, $seller);

        // A listing awaiting review, for the admin console.
        $pendingCompany = Company::factory()->create(['owner_id' => $seller->id, 'name_en' => 'Seef Logistics W.L.L.']);
        Listing::factory()->create([
            'company_id' => $pendingCompany->id,
            'seller_id' => $seller->id,
            'headline' => 'Regional logistics operator with long-term contracts',
            'sector' => 'logistics',
            'status' => ListingStatus::PendingReview,
            'tier' => 'standard',
            'submitted_at' => now()->subHours(2),
        ]);

        $this->dealRoom($meridian, $seller, $buyer);

        // Other buyers at earlier stages of the funnel.
        foreach ([['PE / fund', 'pe_fund', EngagementStage::PackUnlocked], ['Family office', 'family_office', EngagementStage::NdaSigned], ['Individual', 'individual', EngagementStage::NdaRequested]] as [, $type, $stage]) {
            $other = User::factory()->kycVerified()->create(['buyer_type' => $type]);
            Engagement::create([
                'listing_id' => $meridian->id,
                'buyer_id' => $other->id,
                'stage' => $stage,
                'nda_signed_at' => $stage !== EngagementStage::NdaRequested ? now()->subDays(2) : null,
                'pack_unlocked_at' => $stage === EngagementStage::PackUnlocked ? now()->subDay() : null,
                'unlock_method' => $stage === EngagementStage::PackUnlocked ? 'per_company' : null,
                'last_activity_at' => now()->subDays(rand(1, 3)),
            ]);
        }

        // A KYC submission waiting for the admin.
        $applicant = User::factory()->create(['name' => 'Omar Haddad', 'email' => 'new.buyer@clerko.test']);
        $applicant->forceFill(['kyc_status' => VerificationStatus::Pending])->save();
        Storage::disk(config('clerko.documents.disk'))->put("kyc/{$applicant->id}/id.pdf", Pdf::loadHTML('<h1>Demo ID document</h1>')->output());
        Storage::disk(config('clerko.documents.disk'))->put("kyc/{$applicant->id}/selfie.png", base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='));
        KycSubmission::create([
            'user_id' => $applicant->id,
            'full_legal_name' => 'Omar Haddad',
            'nationality' => 'Bahraini',
            'id_type' => 'cpr',
            'id_number' => '900112345',
            'id_expiry' => now()->addYears(3),
            'id_document_path' => "kyc/{$applicant->id}/id.pdf",
            'selfie_path' => "kyc/{$applicant->id}/selfie.png",
            'status' => VerificationStatus::Pending,
        ]);

        $this->command?->info('Demo data ready: admin@clerko.test / seller@clerko.test / buyer@clerko.test (password: "password").');
    }

    private function addDocuments(Listing $listing, User $seller): void
    {
        $disk = Storage::disk(config('clerko.documents.disk'));

        foreach ([
            ['Audited financials 2023–2025', 'financials', 'pack'],
            ['Cap table & corporate structure', 'corporate', 'pack'],
            ['Key customer contracts (redacted)', 'contracts', 'pack'],
            ['Employment & key-person contracts', 'hr', 'staged'],
        ] as [$title, $category, $visibility]) {
            $pdf = Pdf::loadHTML("<h1>{$title}</h1><p>Demo document for listing {$listing->reference}.</p>")->output();
            $path = "listings/{$listing->id}/".str()->slug($title).'.pdf';
            $disk->put($path, $pdf);

            ListingDocument::create([
                'listing_id' => $listing->id,
                'uploaded_by' => $seller->id,
                'title' => $title,
                'category' => $category,
                'visibility' => $visibility,
                'path' => $path,
                'original_name' => str()->slug($title).'.pdf',
                'mime_type' => 'application/pdf',
                'size' => strlen($pdf),
                'sha256' => hash('sha256', $pdf),
            ]);
        }
    }

    private function dealRoom(Listing $listing, User $seller, User $buyer): void
    {
        $engagement = Engagement::create([
            'listing_id' => $listing->id,
            'buyer_id' => $buyer->id,
            'stage' => EngagementStage::NdaRequested,
            'last_activity_at' => now(),
        ]);

        // Go through the real NDA signer and unlocker so the signed PDF and the
        // audit trail exist exactly as they would for a real buyer.
        app(NdaSigner::class)->sign($engagement, $buyer->name, Request::create('/', 'POST', server: ['REMOTE_ADDR' => '127.0.0.1']));
        app(PackUnlocker::class)->unlock($engagement->fresh(), 'per_company');

        $rooms = app(DealRoomService::class);
        $room = $rooms->open($engagement->fresh(), $buyer);

        $q1 = $rooms->ask($room, $buyer, 'financial', 'Can you confirm the churn rate over the last 12 months and the concentration of the top 3 clients?');
        $rooms->answer($room, $q1, $seller, 'Gross churn was 6%. The top 3 clients represent 22% of revenue. I have released the cohort analysis under Documents.');
        $rooms->ask($room, $buyer, 'legal', 'Are the two change-of-control clauses waivable with consent?');

        $staged = $listing->documents()->where('visibility', 'staged')->first();
        $rooms->release($room, $staged, $seller);

        $rooms->makeOffer($room, $buyer, [
            'price' => 8000000,
            'structure' => 'full_acquisition',
            'stake_pct' => 100,
            'deposit_pct' => 50,
            'conditions' => 'Subject to due diligence and change-of-control consents',
        ]);
    }
}
