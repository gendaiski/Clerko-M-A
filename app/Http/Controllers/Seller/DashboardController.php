<?php

namespace App\Http\Controllers\Seller;

use App\Enums\EngagementStage;
use App\Http\Controllers\Controller;
use App\Models\Engagement;
use App\Models\Listing;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $listingIds = $user->listings()->pluck('id');

        $engagements = Engagement::query()
            ->whereIn('listing_id', $listingIds)
            ->with(['buyer', 'listing', 'dealRoom'])
            ->latest('last_activity_at')
            ->get();

        $count = fn (EngagementStage $min) => $engagements->filter(fn ($e) => $e->stage->rank() >= $min->rank())->count();

        return Inertia::render('seller/dashboard', [
            'companies' => $user->companies()->latest()->get()->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name_en,
                'extraction_status' => $c->extraction_status,
                'verification_status' => $c->verification_status->value,
            ]),
            'listings' => $user->listings()->latest()->get()->map(fn (Listing $l) => [
                'id' => $l->id,
                'reference' => $l->reference,
                'headline' => $l->headline,
                'status' => $l->status->value,
                'status_label' => $l->status->label(),
                'tier' => $l->tier,
                'views_count' => $l->views_count,
                'asking_price' => (float) $l->asking_price,
            ]),
            'kpis' => [
                'views' => (int) $user->listings()->sum('views_count'),
                'nda_requests' => $engagements->count(),
                'ndas_signed' => $count(EngagementStage::NdaSigned),
                'packs_unlocked' => $count(EngagementStage::PackUnlocked),
                'offers' => $count(EngagementStage::Offer),
            ],
            'pipeline' => $engagements->map(fn (Engagement $e) => PipelineRow::from($e)),
            'kycStatus' => $user->kyc_status->value,
        ]);
    }
}
