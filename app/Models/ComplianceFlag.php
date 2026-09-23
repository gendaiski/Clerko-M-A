<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ComplianceFlag extends Model
{
    public const RULE_OFF_PLATFORM_CONTACT = 'off_platform_contact';

    public const STATUS_OPEN = 'open';

    public const STATUS_CLEARED = 'cleared';

    public const STATUS_ACTIONED = 'actioned';

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
        return ['reviewed_at' => 'datetime'];
    }

    public function dealRoom(): BelongsTo
    {
        return $this->belongsTo(DealRoom::class);
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
