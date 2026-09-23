<?php

namespace App\Enums;

enum ListingStatus: string
{
    case Draft = 'draft';
    case AwaitingPayment = 'awaiting_payment';
    case PendingReview = 'pending_review';
    case RevisionRequested = 'revision_requested';
    case Live = 'live';
    case Rejected = 'rejected';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::AwaitingPayment => 'Awaiting payment',
            self::PendingReview => 'Under admin review',
            self::RevisionRequested => 'Revision requested',
            self::Live => 'Live',
            self::Rejected => 'Rejected',
            self::Closed => 'Closed',
        };
    }

    public function isEditableBySeller(): bool
    {
        return in_array($this, [self::Draft, self::AwaitingPayment, self::RevisionRequested], true);
    }
}
