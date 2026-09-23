<?php

namespace App\Policies;

use App\Models\DealRoom;
use App\Models\User;

class DealRoomPolicy
{
    /** Parties see the room; admins may read it for compliance. */
    public function view(User $user, DealRoom $room): bool
    {
        return $room->partyOf($user) !== null || $user->is_admin;
    }

    /** Only the two parties can act in the room. */
    public function participate(User $user, DealRoom $room): bool
    {
        return $room->partyOf($user) !== null;
    }

    public function releaseDocuments(User $user, DealRoom $room): bool
    {
        return $room->partyOf($user) === 'seller';
    }
}
