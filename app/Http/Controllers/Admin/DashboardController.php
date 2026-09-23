<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ListingStatus;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\ComplianceFlag;
use App\Models\DealRoom;
use App\Models\Engagement;
use App\Models\HeadlineTerms;
use App\Models\KycSubmission;
use App\Models\Listing;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $yearStart = now()->startOfYear();

        $revenueByMonth = collect(range(5, 0))->map(function (int $monthsAgo) {
            $start = now()->subMonths($monthsAgo)->startOfMonth();
            $paid = Payment::where('status', Payment::STATUS_PAID)
                ->whereBetween('paid_at', [$start, $start->copy()->endOfMonth()]);

            return [
                'month' => $start->format('M'),
                'subscriptions' => (float) (clone $paid)->whereIn('purpose', [Payment::PURPOSE_LISTING_TIER, Payment::PURPOSE_BUYER_PREMIUM])->sum('amount'),
                'unlocks' => (float) (clone $paid)->where('purpose', Payment::PURPOSE_PACK_UNLOCK)->sum('amount'),
            ];
        })->values();

        $stages = Engagement::query()->selectRaw('stage, count(*) as total')->groupBy('stage')->pluck('total', 'stage');

        return Inertia::render('admin/dashboard', [
            'kpis' => [
                'agreed_deal_value' => (float) HeadlineTerms::whereNotNull('buyer_acknowledged_at')->whereNotNull('seller_acknowledged_at')->sum('price'),
                'live_listings' => Listing::live()->count(),
                'pending_reviews' => Listing::where('status', ListingStatus::PendingReview)->count(),
                'verified_users' => User::where('kyc_status', VerificationStatus::Verified)->count(),
                'revenue_ytd' => (float) Payment::where('status', Payment::STATUS_PAID)->where('paid_at', '>=', $yearStart)->sum('amount'),
                'open_deal_rooms' => DealRoom::where('status', '!=', DealRoom::STATUS_CLOSED)->count(),
            ],
            'queues' => [
                'listings' => Listing::where('status', ListingStatus::PendingReview)->count(),
                'companies' => Company::where('verification_status', VerificationStatus::Pending)->where('extraction_status', Company::EXTRACTION_COMPLETED)->count(),
                'kyc' => KycSubmission::where('status', VerificationStatus::Pending)->count(),
                'compliance' => ComplianceFlag::where('status', ComplianceFlag::STATUS_OPEN)->count(),
                'cr_expiring' => Company::where('verification_status', VerificationStatus::Verified)
                    ->whereNotNull('expiry_date')->where('expiry_date', '<=', Carbon::now()->addDays(30))->count(),
            ],
            'revenueByMonth' => $revenueByMonth,
            'stages' => $stages,
            'recentListings' => Listing::where('status', ListingStatus::PendingReview)->with('company')->oldest('submitted_at')->limit(5)->get()
                ->map(fn (Listing $l) => ListingController::row($l)),
        ]);
    }
}
