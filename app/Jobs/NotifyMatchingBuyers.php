<?php

namespace App\Jobs;

use App\Models\BuyerPreference;
use App\Models\Listing;
use App\Notifications\ClerkoNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** Alert buyers whose saved preferences match a newly published listing. */
class NotifyMatchingBuyers implements ShouldQueue
{
    use Queueable;

    public function __construct(public Listing $listing) {}

    public function handle(): void
    {
        BuyerPreference::query()
            ->where('alerts_enabled', true)
            ->where('user_id', '!=', $this->listing->seller_id)
            ->with('user')
            ->chunkById(200, function ($preferences) {
                foreach ($preferences as $preference) {
                    if ($preference->matches($this->listing)) {
                        $preference->user->notify(new ClerkoNotification(
                            'New business matching your preferences',
                            "{$this->listing->headline} ({$this->listing->sectorLabel()}) has just been listed.",
                            route('marketplace.show', $this->listing),
                        ));
                    }
                }
            });
    }
}
