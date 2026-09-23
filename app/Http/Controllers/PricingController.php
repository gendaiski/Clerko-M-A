<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class PricingController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('pricing', [
            'sellerTiers' => config('clerko.seller_tiers'),
            'buyer' => config('clerko.buyer'),
        ]);
    }
}
