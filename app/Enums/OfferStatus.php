<?php

namespace App\Enums;

enum OfferStatus: string
{
    case Open = 'open';
    case Countered = 'countered';
    case Accepted = 'accepted';
    case Rejected = 'rejected';
    case Withdrawn = 'withdrawn';
}
