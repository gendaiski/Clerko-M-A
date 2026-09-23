<?php

namespace App\Models;

use App\Enums\EngagementStage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Engagement extends Model
{
    /**
     * Column defaults, mirrored so new instances have them before a refresh.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'stage' => 'nda_requested',
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'stage' => EngagementStage::class,
            'nda_signed_at' => 'datetime',
            'pack_unlocked_at' => 'datetime',
            'last_activity_at' => 'datetime',
        ];
    }

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function ndaSignature(): HasOne
    {
        return $this->hasOne(NdaSignature::class);
    }

    public function dealRoom(): HasOne
    {
        return $this->hasOne(DealRoom::class);
    }

    public function hasSignedNda(): bool
    {
        return $this->nda_signed_at !== null;
    }

    public function hasUnlockedPack(): bool
    {
        return $this->pack_unlocked_at !== null;
    }

    /** Move forward in the funnel; never move backwards. */
    public function advanceTo(EngagementStage $stage): void
    {
        if ($stage->rank() > $this->stage->rank()) {
            $this->stage = $stage;
        }
        $this->last_activity_at = now();
        $this->save();
    }
}
