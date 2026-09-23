<?php

namespace App\Http\Controllers\Seller;

use App\Models\Engagement;

/** A buyer engagement as the seller sees it: anonymised. */
final class PipelineRow
{
    /**
     * @return array<string, mixed>
     */
    public static function from(Engagement $e): array
    {
        return [
            'id' => $e->id,
            'buyer' => $e->buyer->buyerLabel(),
            'buyer_type' => $e->buyer->buyer_type,
            'buyer_verified' => $e->buyer->isKycVerified(),
            'listing_reference' => $e->listing->reference,
            'stage' => $e->stage->value,
            'stage_label' => $e->stage->label(),
            'last_activity_at' => $e->last_activity_at?->toIso8601String(),
            'deal_room_id' => $e->dealRoom?->id,
        ];
    }
}
