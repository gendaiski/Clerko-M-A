<?php

namespace App\Services\Payments;

use App\Enums\ListingStatus;
use App\Models\Engagement;
use App\Models\Listing;
use App\Models\Payment;
use App\Models\Subscription;
use App\Models\User;
use App\Notifications\ClerkoNotification;
use App\Services\Audit\AuditLog;
use App\Services\Buyer\PackUnlocker;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use LogicException;

class PaymentService
{
    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly AuditLog $audit,
    ) {}

    /**
     * Create a payment and return the checkout URL to redirect the payer to.
     */
    public function start(User $user, string $purpose, Model $payable, float $amount, string $description): string
    {
        $payment = Payment::create([
            'user_id' => $user->id,
            'purpose' => $purpose,
            'payable_type' => $payable->getMorphClass(),
            'payable_id' => $payable->getKey(),
            'amount' => $amount,
            'currency' => config('clerko.currency'),
            'description' => $description,
            'provider' => config('clerko.payments.driver'),
        ]);

        $this->audit->record('payment.initiated', $payment, $user, [
            'purpose' => $purpose,
            'amount' => $amount,
        ]);

        return $this->gateway->createCheckout(
            $payment,
            route('payments.return', $payment),
            route('payments.webhook'),
        );
    }

    /**
     * Confirm the payment with the provider and fulfil it. Safe to call more
     * than once (redirect and webhook can both arrive).
     */
    public function sync(Payment $payment): Payment
    {
        if ($payment->isPaid() || $payment->status === Payment::STATUS_FAILED) {
            return $payment;
        }

        $result = $this->gateway->fetchStatus($payment);

        if ($result->status === GatewayStatus::PENDING) {
            return $payment;
        }

        return DB::transaction(function () use ($payment, $result) {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            if ($payment->status !== Payment::STATUS_INITIATED) {
                return $payment;
            }

            $payload = array_merge($payment->provider_payload ?? [], ['confirmation' => $result->payload]);

            if ($result->status === GatewayStatus::FAILED) {
                $payment->update(['status' => Payment::STATUS_FAILED, 'provider_payload' => $payload]);
                $this->audit->record('payment.failed', $payment, $payment->user);

                return $payment;
            }

            $payment->update([
                'status' => Payment::STATUS_PAID,
                'paid_at' => now(),
                'provider_payload' => $payload,
            ]);
            $this->audit->record('payment.paid', $payment, $payment->user, [
                'purpose' => $payment->purpose,
                'amount' => (float) $payment->amount,
            ]);

            $this->fulfil($payment);

            return $payment;
        });
    }

    private function fulfil(Payment $payment): void
    {
        match ($payment->purpose) {
            Payment::PURPOSE_LISTING_TIER => $this->activateListingTier($payment),
            Payment::PURPOSE_PACK_UNLOCK => $this->unlockPack($payment),
            Payment::PURPOSE_BUYER_PREMIUM => $this->activateBuyerPremium($payment),
            default => throw new LogicException("Unknown payment purpose [{$payment->purpose}]."),
        };
    }

    private function activateListingTier(Payment $payment): void
    {
        /** @var Subscription $subscription */
        $subscription = $payment->payable;
        $subscription->update([
            'status' => Subscription::STATUS_ACTIVE,
            'starts_at' => now(),
            'ends_at' => now()->addMonth(),
        ]);

        /** @var Listing $listing */
        $listing = $subscription->listing;
        $listing->update([
            'tier' => $subscription->plan,
            'featured' => in_array($subscription->plan, ['premium', 'enterprise'], true),
            'status' => ListingStatus::PendingReview,
            'submitted_at' => now(),
        ]);

        $this->audit->record('listing.submitted', $listing, $payment->user, ['tier' => $subscription->plan], listingId: $listing->id);

        Notification::send(
            User::where('is_admin', true)->get(),
            new ClerkoNotification('New listing to review', "Listing {$listing->reference} is waiting for review.", route('admin.listings.show', $listing)),
        );
    }

    private function unlockPack(Payment $payment): void
    {
        /** @var Engagement $engagement */
        $engagement = $payment->payable;
        app(PackUnlocker::class)->unlock($engagement, 'per_company', $payment);
    }

    private function activateBuyerPremium(Payment $payment): void
    {
        /** @var Subscription $subscription */
        $subscription = $payment->payable;
        $subscription->update([
            'status' => Subscription::STATUS_ACTIVE,
            'starts_at' => now(),
            'ends_at' => now()->addMonth(),
        ]);
    }
}
