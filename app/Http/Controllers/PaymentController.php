<?php

namespace App\Http\Controllers;

use App\Models\Engagement;
use App\Models\Payment;
use App\Models\Subscription;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    /** The payer lands here after the hosted checkout. */
    public function return(Request $request, Payment $payment): RedirectResponse
    {
        abort_unless($payment->user_id === $request->user()->id, 403);

        $payment = $this->payments->sync($payment);

        $redirect = redirect()->to($this->destination($payment));

        return match ($payment->status) {
            Payment::STATUS_PAID => $redirect->with('success', 'Payment received. Thank you.'),
            Payment::STATUS_FAILED => $redirect->with('error', 'The payment did not go through. Please try again.'),
            default => $redirect->with('success', 'Your payment is being confirmed. This page will update shortly.'),
        };
    }

    /** Server-to-server notification from the provider. */
    public function webhook(Request $request): JsonResponse
    {
        $reference = $request->input('id');
        if (is_string($reference) && $payment = Payment::where('provider_reference', $reference)->first()) {
            $this->payments->sync($payment);
        }

        return response()->json(['received' => true]);
    }

    public function fakeCheckout(Request $request, Payment $payment): Response
    {
        abort_unless(config('clerko.payments.driver') === 'fake' && ! app()->isProduction(), 404);
        abort_unless($payment->user_id === $request->user()->id, 403);

        return Inertia::render('payments/fake-checkout', [
            'payment' => $payment->only('uuid', 'amount', 'currency', 'description', 'status'),
        ]);
    }

    public function fakeComplete(Request $request, Payment $payment): RedirectResponse
    {
        abort_unless(config('clerko.payments.driver') === 'fake' && ! app()->isProduction(), 404);
        abort_unless($payment->user_id === $request->user()->id, 403);

        $outcome = $request->validate(['outcome' => ['required', 'in:paid,failed']])['outcome'];
        $payment->update(['provider_payload' => ['fake_outcome' => $outcome]]);

        return redirect()->route('payments.return', $payment);
    }

    private function destination(Payment $payment): string
    {
        $payable = $payment->payable;

        return match ($payment->purpose) {
            Payment::PURPOSE_LISTING_TIER => $payable instanceof Subscription
                ? route('seller.listings.show', $payable->listing_id)
                : route('seller.dashboard'),
            Payment::PURPOSE_PACK_UNLOCK => $payment->isPaid() && $payable instanceof Engagement
                ? route('engagements.pack', $payable)
                : route('engagements.unlock', $payable),
            default => route('buyer.dashboard'),
        };
    }
}
