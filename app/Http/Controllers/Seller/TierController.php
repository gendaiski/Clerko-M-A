<?php

namespace App\Http\Controllers\Seller;

use App\Enums\ListingStatus;
use App\Http\Controllers\Controller;
use App\Models\Listing;
use App\Models\Payment;
use App\Models\Subscription;
use App\Services\Payments\PaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class TierController extends Controller
{
    public function show(Listing $listing): Response
    {
        Gate::authorize('update', $listing);

        return Inertia::render('seller/listings/tier', [
            'listing' => ['id' => $listing->id, 'reference' => $listing->reference, 'headline' => $listing->headline],
            'tiers' => config('clerko.seller_tiers'),
        ]);
    }

    public function store(Request $request, Listing $listing, PaymentService $payments): HttpResponse|RedirectResponse
    {
        Gate::authorize('update', $listing);

        $tier = $request->validate([
            'tier' => ['required', Rule::in(array_keys(config('clerko.seller_tiers')))],
        ])['tier'];

        $user = $request->user();
        if ($user->latestKycSubmission === null) {
            return redirect()->route('verification.show', ['redirect' => route('seller.listings.tier', $listing, false)])
                ->with('error', 'Please verify your identity before submitting a listing.');
        }

        $price = config("clerko.seller_tiers.{$tier}.monthly_price");

        $subscription = Subscription::create([
            'user_id' => $user->id,
            'listing_id' => $listing->id,
            'plan' => $tier,
            'monthly_price' => $price,
            'status' => Subscription::STATUS_PENDING,
        ]);

        $listing->update(['status' => ListingStatus::AwaitingPayment]);

        $checkoutUrl = $payments->start(
            $user,
            Payment::PURPOSE_LISTING_TIER,
            $subscription,
            $price,
            config("clerko.seller_tiers.{$tier}.name")." listing — {$listing->reference} (1 month)",
        );

        return Inertia::location($checkoutUrl);
    }
}
