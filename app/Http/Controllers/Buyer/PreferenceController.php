<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\BuyerPreference;
use App\Models\Listing;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PreferenceController extends Controller
{
    public const BUYER_TYPES = [
        'strategic' => 'Strategic acquirer',
        'pe_fund' => 'PE / fund',
        'family_office' => 'Family office',
        'individual' => 'Individual investor',
    ];

    public function edit(Request $request): Response
    {
        $user = $request->user();
        $preference = $user->buyerPreference;

        return Inertia::render('buyer/preferences', [
            'preference' => $preference ? [
                'sectors' => $preference->sectors ?? [],
                'locations' => $preference->locations ?? [],
                'min_deal_size' => $preference->min_deal_size !== null ? (float) $preference->min_deal_size : null,
                'max_deal_size' => $preference->max_deal_size !== null ? (float) $preference->max_deal_size : null,
                'alerts_enabled' => $preference->alerts_enabled,
            ] : null,
            'buyerType' => $user->buyer_type,
            'options' => [
                'sectors' => Listing::SECTORS,
                'locations' => Listing::LOCATIONS,
                'buyer_types' => self::BUYER_TYPES,
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'buyer_type' => ['required', Rule::in(array_keys(self::BUYER_TYPES))],
            'sectors' => ['nullable', 'array'],
            'sectors.*' => [Rule::in(array_keys(Listing::SECTORS))],
            'locations' => ['nullable', 'array'],
            'locations.*' => [Rule::in(array_keys(Listing::LOCATIONS))],
            'min_deal_size' => ['nullable', 'numeric', 'min:0'],
            'max_deal_size' => ['nullable', 'numeric', 'min:0', 'gte:min_deal_size'],
            'alerts_enabled' => ['boolean'],
        ]);

        $user = $request->user();
        $user->update(['buyer_type' => $data['buyer_type']]);

        BuyerPreference::updateOrCreate(['user_id' => $user->id], [
            'sectors' => $data['sectors'] ?: null,
            'locations' => $data['locations'] ?: null,
            'min_deal_size' => $data['min_deal_size'] ?? null,
            'max_deal_size' => $data['max_deal_size'] ?? null,
            'alerts_enabled' => $data['alerts_enabled'] ?? true,
        ]);

        return redirect()->route('marketplace.index')->with('success', 'Preferences saved. We\'ll alert you when matching businesses are listed.');
    }
}
