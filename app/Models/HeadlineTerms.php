<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HeadlineTerms extends Model
{
    protected $table = 'headline_terms';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:3',
            'stake_pct' => 'decimal:2',
            'deposit_pct' => 'decimal:2',
            'buyer_acknowledged_at' => 'datetime',
            'seller_acknowledged_at' => 'datetime',
        ];
    }

    public function dealRoom(): BelongsTo
    {
        return $this->belongsTo(DealRoom::class);
    }

    public function offer(): BelongsTo
    {
        return $this->belongsTo(Offer::class);
    }

    public function isAgreed(): bool
    {
        return $this->buyer_acknowledged_at !== null && $this->seller_acknowledged_at !== null;
    }
}
