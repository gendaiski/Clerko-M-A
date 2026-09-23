<?php

namespace App\Policies;

use App\Models\Engagement;
use App\Models\User;

class EngagementPolicy
{
    public function view(User $user, Engagement $engagement): bool
    {
        return $engagement->buyer_id === $user->id;
    }

    /** The Company Details Pack needs a signed NDA and an unlock. */
    public function viewPack(User $user, Engagement $engagement): bool
    {
        return $this->view($user, $engagement)
            && $engagement->hasSignedNda()
            && $engagement->hasUnlockedPack();
    }
}
