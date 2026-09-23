<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\Engagement;
use App\Models\Listing;
use App\Services\Buyer\PackUnlocker;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, PackUnlocker $unlocker): Response
    {
        $user = $request->user();
        $preference = $user->buyerPreference;
        $premium = $user->activeBuyerPremium();

        $engagements = $user->engagements()->with(['listing.company', 'dealRoom'])->latest('last_activity_at')->get();
        $engagedIds = $engagements->pluck('listing_id');

        $matches = $preference
            ? Listing::live()->with('company')->whereNotIn('id', $engagedIds)->latest('published_at')->limit(50)->get()
                ->filter(fn (Listing $l) => $preference->matches($l))->take(6)->values()->map->toTeaser()
            : collect();

        return Inertia::render('buyer/dashboard', [
            'engagements' => $engagements->map(fn (Engagement $e) => [
                'id' => $e->id,
                'stage' => $e->stage->value,
                'stage_label' => $e->stage->label(),
                'listing' => $e->listing->toTeaser(),
                // The company name is only shown once the NDA is signed.
                'company_name' => $e->hasSignedNda() ? $e->listing->company->name_en : null,
                'nda_signed' => $e->hasSignedNda(),
                'pack_unlocked' => $e->hasUnlockedPack(),
                'deal_room_id' => $e->dealRoom?->id,
                'last_activity_at' => $e->last_activity_at?->toIso8601String(),
            ]),
            'matches' => $matches,
            'hasPreferences' => $preference !== null,
            'premium' => $premium ? [
                'ends_at' => $premium->ends_at->toIso8601String(),
                'unlocks_used' => $unlocker->premiumUnlocksUsed($premium),
                'unlocks_included' => config('clerko.buyer.premium_monthly_unlocks'),
            ] : null,
            'kycStatus' => $user->kyc_status->value,
        ]);
    }
}
