<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Str;

class Payment extends Model
{
    public const PURPOSE_LISTING_TIER = 'listing_tier';

    public const PURPOSE_PACK_UNLOCK = 'pack_unlock';

    public const PURPOSE_BUYER_PREMIUM = 'buyer_premium';

    public const STATUS_INITIATED = 'initiated';

    public const STATUS_PAID = 'paid';

    public const STATUS_FAILED = 'failed';

    /**
     * Column defaults, mirrored so new instances have them before a refresh.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'currency' => 'BHD',
        'status' => 'initiated',
    ];

    protected $guarded = ['id'];

    protected $hidden = ['provider_payload'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:3',
            'provider_payload' => 'array',
            'paid_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Payment $payment) {
            $payment->uuid ??= (string) Str::uuid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function payable(): MorphTo
    {
        return $this->morphTo();
    }

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }
}
