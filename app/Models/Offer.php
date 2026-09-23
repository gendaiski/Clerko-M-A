<?php

namespace App\Models;

use App\Enums\OfferStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Offer extends Model
{
    public const STRUCTURES = [
        'full_acquisition' => 'Full acquisition',
        'majority' => 'Majority stake',
        'minority' => 'Minority stake',
    ];

    /**
     * Column defaults, mirrored so new instances have them before a refresh.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'open',
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:3',
            'stake_pct' => 'decimal:2',
            'deposit_pct' => 'decimal:2',
            'valid_until' => 'date',
            'status' => OfferStatus::class,
            'responded_at' => 'datetime',
        ];
    }

    public function dealRoom(): BelongsTo
    {
        return $this->belongsTo(DealRoom::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'made_by');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Offer::class, 'parent_offer_id');
    }
}
