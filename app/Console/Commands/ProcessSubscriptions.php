<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Notifications\ClerkoNotification;
use App\Services\Audit\AuditLog;
use Illuminate\Console\Command;

/**
 * Expires lapsed subscriptions and reminds members a week before renewal is
 * due. Renewal itself is a new Tap charge from the tier page.
 */
class ProcessSubscriptions extends Command
{
    protected $signature = 'clerko:subscriptions';

    protected $description = 'Expire lapsed subscriptions and send renewal reminders';

    public function handle(AuditLog $audit): int
    {
        $expired = 0;
        Subscription::query()
            ->where('status', Subscription::STATUS_ACTIVE)
            ->where('ends_at', '<=', now())
            ->with(['user', 'listing'])
            ->each(function (Subscription $subscription) use ($audit, &$expired) {
                $subscription->update(['status' => Subscription::STATUS_EXPIRED]);
                $audit->record('subscription.expired', $subscription, $subscription->user, listingId: $subscription->listing_id);
                $subscription->user->notify(new ClerkoNotification(
                    'Your Clerko plan has expired',
                    $subscription->listing
                        ? "The plan for listing {$subscription->listing->reference} has expired. Renew it to keep your listing visible."
                        : 'Your Buyer Premium plan has expired.',
                    $subscription->listing ? route('seller.listings.show', $subscription->listing) : route('buyer.dashboard'),
                ));
                $expired++;
            });

        $reminded = 0;
        Subscription::query()
            ->where('status', Subscription::STATUS_ACTIVE)
            ->whereBetween('ends_at', [now()->addDays(7)->startOfDay(), now()->addDays(7)->endOfDay()])
            ->with(['user', 'listing'])
            ->each(function (Subscription $subscription) use (&$reminded) {
                $subscription->user->notify(new ClerkoNotification(
                    'Your Clerko plan renews in 7 days',
                    'Your plan ends on '.$subscription->ends_at->format('j M Y').'. Renew from your dashboard to avoid interruption.',
                    $subscription->listing ? route('seller.listings.show', $subscription->listing) : route('buyer.dashboard'),
                ));
                $reminded++;
            });

        $this->info("Expired {$expired}, reminded {$reminded}.");

        return self::SUCCESS;
    }
}
