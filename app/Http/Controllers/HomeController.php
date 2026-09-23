<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(): Response
    {
        $featured = Listing::live()
            ->with('company')
            ->orderByDesc('featured')
            ->latest('published_at')
            ->limit(3)
            ->get()
            ->map->toTeaser();

        return Inertia::render('welcome', [
            'featured' => $featured,
            'stats' => [
                'live_listings' => Listing::live()->count(),
                'sectors' => Listing::live()->distinct('sector')->count('sector'),
            ],
        ]);
    }
}
