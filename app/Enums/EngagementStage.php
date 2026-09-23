<?php

namespace App\Enums;

enum EngagementStage: string
{
    case NdaRequested = 'nda_requested';
    case NdaSigned = 'nda_signed';
    case PackUnlocked = 'pack_unlocked';
    case DealRoom = 'deal_room';
    case Offer = 'offer';
    case HeadlineTerms = 'headline_terms';
    case Withdrawn = 'withdrawn';

    public function label(): string
    {
        return match ($this) {
            self::NdaRequested => 'NDA requested',
            self::NdaSigned => 'NDA signed',
            self::PackUnlocked => 'Pack unlocked',
            self::DealRoom => 'Deal room',
            self::Offer => 'Indicative offer',
            self::HeadlineTerms => 'Headline terms',
            self::Withdrawn => 'Withdrawn',
        };
    }

    /** Position in the funnel, used to only ever move an engagement forward. */
    public function rank(): int
    {
        return match ($this) {
            self::NdaRequested => 1,
            self::NdaSigned => 2,
            self::PackUnlocked => 3,
            self::DealRoom => 4,
            self::Offer => 5,
            self::HeadlineTerms => 6,
            self::Withdrawn => 0,
        };
    }
}
