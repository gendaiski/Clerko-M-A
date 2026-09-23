<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuyerPreference extends Model
{
    /**
     * Column defaults, mirrored so new instances have them before a refresh.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'alerts_enabled' => true,
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'sectors' => 'array',
            'locations' => 'array',
            'min_deal_size' => 'decimal:3',
            'max_deal_size' => 'decimal:3',
            'alerts_enabled' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function matches(Listing $listing): bool
    {
        if ($this->sectors && ! in_array($listing->sector, $this->sectors, true)) {
            return false;
        }
        if ($this->locations && ! in_array($listing->location, $this->locations, true)) {
            return false;
        }
        if ($this->min_deal_size !== null && $listing->asking_price < $this->min_deal_size) {
            return false;
        }
        if ($this->max_deal_size !== null && $listing->asking_price > $this->max_deal_size) {
            return false;
        }

        return true;
    }
}
