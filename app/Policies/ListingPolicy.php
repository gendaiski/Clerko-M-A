<?php

namespace App\Policies;

use App\Models\Listing;
use App\Models\User;

class ListingPolicy
{
    public function manage(User $user, Listing $listing): bool
    {
        return $listing->seller_id === $user->id;
    }

    public function update(User $user, Listing $listing): bool
    {
        return $this->manage($user, $listing) && $listing->status->isEditableBySeller();
    }
}
