<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DealRoom;
use Inertia\Inertia;
use Inertia\Response;

class DealController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/deals', [
            'rooms' => DealRoom::query()
                ->with(['engagement.listing.company', 'engagement.buyer', 'headlineTerms'])
                ->latest('updated_at')
                ->paginate(25)
                ->through(fn (DealRoom $r) => [
                    'id' => $r->id,
                    'company' => $r->engagement->listing->company->name_en,
                    'listing_reference' => $r->engagement->listing->reference,
                    'buyer' => $r->engagement->buyer->buyerLabel(),
                    'stage_label' => $r->engagement->stage->label(),
                    'status' => $r->status,
                    'agreed_price' => $r->headlineTerms?->isAgreed() ? (float) $r->headlineTerms->price : null,
                    'updated_at' => $r->updated_at->toIso8601String(),
                ]),
        ]);
    }
}
