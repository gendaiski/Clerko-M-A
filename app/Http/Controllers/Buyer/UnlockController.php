<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Models\Engagement;
use App\Models\Payment;
use App\Models\Subscription;
use App\Services\Buyer\PackUnlocker;
use App\Services\Payments\PaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class UnlockController extends Controller
{
    public function __construct(
        private readonly PaymentService $payments,
        private readonly PackUnlocker $unlocker,
    ) {}

    public function show(Request $request, Engagement $engagement): Response|RedirectResponse
    {
        Gate::authorize('view', $engagement);

        if (! $engagement->hasSignedNda()) {
            return redirect()->route('engagements.nda', $engagement);
        }
        if ($engagement->hasUnlockedPack()) {
            return redirect()->route('engagements.pack', $engagement);
        }

        $premium = $request->user()->activeBuyerPremium();
        $listing = $engagement->listing->load('company');

        return Inertia::render('buyer/unlock', [
            'engagement' => ['id' => $engagement->id],
            'listing' => $listing->toTeaser(),
            'companyName' => $listing->company->name_en,
            'prices' => config('clerko.buyer'),
            'premium' => $premium ? [
                'unlocks_used' => $this->unlocker->premiumUnlocksUsed($premium),
                'unlocks_included' => config('clerko.buyer.premium_monthly_unlocks'),
                'ends_at' => $premium->ends_at->toIso8601String(),
            ] : null,
        ]);
    }

    public function pay(Request $request, Engagement $engagement): HttpResponse
    {
        Gate::authorize('view', $engagement);
        abort_unless($engagement->hasSignedNda() && ! $engagement->hasUnlockedPack(), 409);

        $url = $this->payments->start(
            $request->user(),
            Payment::PURPOSE_PACK_UNLOCK,
            $engagement,
            config('clerko.buyer.pack_unlock_price'),
            "Company Details Pack — listing {$engagement->listing->reference}",
        );

        return Inertia::location($url);
    }

    /** Unlock using an allowance from an active premium plan. */
    public function usePremium(Request $request, Engagement $engagement): RedirectResponse
    {
        Gate::authorize('view', $engagement);
        abort_unless($engagement->hasSignedNda() && ! $engagement->hasUnlockedPack(), 409);

        $premium = $request->user()->activeBuyerPremium();
        if (! $premium) {
            return back()->with('error', 'You do not have an active premium plan.');
        }
        if ($this->unlocker->premiumUnlocksUsed($premium) >= config('clerko.buyer.premium_monthly_unlocks')) {
            return back()->with('error', 'You have used all the pack unlocks included in your plan this month.');
        }

        $this->unlocker->unlock($engagement, 'premium_plan');

        return redirect()->route('engagements.pack', $engagement)->with('success', 'Company Details Pack unlocked.');
    }

    /** Buy the buyer premium plan (BD 699 / month). */
    public function subscribe(Request $request): HttpResponse|RedirectResponse
    {
        $user = $request->user();
        if ($user->activeBuyerPremium()) {
            return back()->with('success', 'Your premium plan is already active.');
        }

        $price = config('clerko.buyer.premium_monthly_price');
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan' => Subscription::PLAN_BUYER_PREMIUM,
            'monthly_price' => $price,
            'status' => Subscription::STATUS_PENDING,
        ]);

        $url = $this->payments->start($user, Payment::PURPOSE_BUYER_PREMIUM, $subscription, $price, 'Clerko Buyer Premium (1 month)');

        return Inertia::location($url);
    }
}
