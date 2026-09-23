<?php

namespace App\Services\Buyer;

use App\Enums\EngagementStage;
use App\Models\Engagement;
use App\Models\Payment;
use App\Models\Subscription;
use App\Notifications\ClerkoNotification;
use App\Services\Audit\AuditLog;

class PackUnlocker
{
    public function __construct(private readonly AuditLog $audit) {}

    public function unlock(Engagement $engagement, string $method, ?Payment $payment = null): void
    {
        if ($engagement->hasUnlockedPack()) {
            return;
        }

        $engagement->pack_unlocked_at = now();
        $engagement->unlock_method = $method;
        $engagement->unlock_payment_id = $payment?->id;
        $engagement->advanceTo(EngagementStage::PackUnlocked);

        $listing = $engagement->listing;
        $buyer = $engagement->buyer;

        $this->audit->record('pack.unlocked', $engagement, $buyer, ['method' => $method], listingId: $listing->id);

        $listing->seller->notify(new ClerkoNotification(
            'Company Details Pack unlocked',
            "A qualified, NDA-bound buyer ({$buyer->buyerLabel()}) unlocked the Details Pack for listing {$listing->reference}.",
            route('seller.listings.show', $listing),
        ));
    }

    /**
     * Number of packs a buyer has unlocked with their premium plan in the
     * current subscription period.
     */
    public function premiumUnlocksUsed(Subscription $subscription): int
    {
        return Engagement::query()
            ->where('buyer_id', $subscription->user_id)
            ->where('unlock_method', 'premium_plan')
            ->where('pack_unlocked_at', '>=', $subscription->starts_at)
            ->count();
    }
}
