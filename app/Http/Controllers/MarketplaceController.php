<?php

namespace App\Http\Controllers;

use App\Enums\ListingStatus;
use App\Models\Listing;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MarketplaceController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'sector' => ['nullable', 'array'],
            'sector.*' => ['string'],
            'location' => ['nullable', 'array'],
            'location.*' => ['string'],
            'featured' => ['nullable', 'boolean'],
            'max_price' => ['nullable', 'numeric', 'min:0'],
            'sort' => ['nullable', 'in:featured,newest,price_asc,price_desc,revenue_desc'],
        ]);

        $query = Listing::live()->with('company');

        if ($q = $filters['q'] ?? null) {
            $query->where(fn ($w) => $w->where('headline', 'like', "%{$q}%")->orWhere('teaser_summary', 'like', "%{$q}%"));
        }
        if ($sectors = $filters['sector'] ?? null) {
            $query->whereIn('sector', $sectors);
        }
        if ($locations = $filters['location'] ?? null) {
            $query->whereIn('location', $locations);
        }
        if ($request->boolean('featured')) {
            $query->where('featured', true);
        }
        if ($max = $filters['max_price'] ?? null) {
            $query->where('asking_price', '<=', $max);
        }

        match ($filters['sort'] ?? 'featured') {
            'newest' => $query->latest('published_at'),
            'price_asc' => $query->orderBy('asking_price'),
            'price_desc' => $query->orderByDesc('asking_price'),
            'revenue_desc' => $query->orderByDesc('annual_revenue'),
            default => $query->orderByDesc('featured')->latest('published_at'),
        };

        $listings = $query->paginate(12)->withQueryString()->through(fn (Listing $l) => $l->toTeaser());

        return Inertia::render('marketplace/index', [
            'listings' => $listings,
            'filters' => $filters,
            'options' => [
                'sectors' => Listing::SECTORS,
                'locations' => Listing::LOCATIONS,
            ],
        ]);
    }

    public function show(Request $request, Listing $listing): Response
    {
        $user = $request->user();
        $isOwner = $user && $listing->seller_id === $user->id;

        abort_unless($listing->status === ListingStatus::Live || $isOwner || $user?->is_admin, 404);

        if (! $isOwner) {
            $listing->increment('views_count');
        }

        $engagement = $user ? $listing->engagements()->where('buyer_id', $user->id)->first() : null;

        return Inertia::render('marketplace/show', [
            'listing' => $listing->load('company')->toTeaser(),
            'isOwner' => $isOwner,
            'engagement' => $engagement ? [
                'id' => $engagement->id,
                'stage' => $engagement->stage->value,
                'nda_signed' => $engagement->hasSignedNda(),
                'pack_unlocked' => $engagement->hasUnlockedPack(),
            ] : null,
        ]);
    }
}
