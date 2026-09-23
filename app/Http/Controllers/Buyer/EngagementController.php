<?php

namespace App\Http\Controllers\Buyer;

use App\Enums\EngagementStage;
use App\Enums\ListingStatus;
use App\Http\Controllers\Controller;
use App\Models\Engagement;
use App\Models\Listing;
use App\Notifications\ClerkoNotification;
use App\Services\Audit\AuditLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EngagementController extends Controller
{
    /** "Request access": start an engagement and go to the NDA. */
    public function store(Request $request, Listing $listing, AuditLog $audit): RedirectResponse
    {
        $user = $request->user();

        abort_unless($listing->status === ListingStatus::Live, 404);
        abort_if($listing->seller_id === $user->id, 403, 'You cannot request access to your own listing.');

        $engagement = Engagement::firstOrCreate(
            ['listing_id' => $listing->id, 'buyer_id' => $user->id],
            ['stage' => EngagementStage::NdaRequested, 'last_activity_at' => now()],
        );

        if ($engagement->wasRecentlyCreated) {
            $audit->record('engagement.requested', $engagement, $user, listingId: $listing->id);
            $listing->seller->notify(new ClerkoNotification(
                'New buyer interest',
                "{$user->buyerLabel()} requested access to listing {$listing->reference}.",
                route('seller.listings.show', $listing),
            ));
        }

        return redirect()->route('engagements.nda', $engagement);
    }
}
