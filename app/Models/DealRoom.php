<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DealRoom extends Model
{
    public const STATUS_OPEN = 'open';

    public const STATUS_TERMS_AGREED = 'terms_agreed';

    public const STATUS_CLOSED = 'closed';

    public const QUESTION_CATEGORIES = [
        'financial' => 'Financial',
        'commercial' => 'Commercial',
        'legal' => 'Legal',
        'operational' => 'Operational',
        'people' => 'People & HR',
        'document_request' => 'Document request',
        'other' => 'Other',
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
            'agent_opt_in_buyer_at' => 'datetime',
            'agent_opt_in_seller_at' => 'datetime',
        ];
    }

    public function engagement(): BelongsTo
    {
        return $this->belongsTo(Engagement::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(DealRoomQuestion::class);
    }

    public function releasedDocuments(): BelongsToMany
    {
        return $this->belongsToMany(ListingDocument::class, 'deal_room_document_releases')
            ->withPivot('released_by')
            ->withTimestamps();
    }

    public function offers(): HasMany
    {
        return $this->hasMany(Offer::class);
    }

    public function headlineTerms(): HasOne
    {
        return $this->hasOne(HeadlineTerms::class);
    }

    public function agentSummaries(): HasMany
    {
        return $this->hasMany(AgentSummary::class);
    }

    public function latestAgentSummary(): HasOne
    {
        return $this->hasOne(AgentSummary::class)->latestOfMany();
    }

    public function buyer(): User
    {
        return $this->engagement->buyer;
    }

    public function seller(): User
    {
        return $this->engagement->listing->seller;
    }

    /** "buyer", "seller" or null when the user is not a party to this room. */
    public function partyOf(User $user): ?string
    {
        return match (true) {
            $user->id === $this->engagement->buyer_id => 'buyer',
            $user->id === $this->engagement->listing->seller_id => 'seller',
            default => null,
        };
    }

    public function agentEnabled(): bool
    {
        return config('clerko.agent.enabled')
            && $this->agent_opt_in_buyer_at !== null
            && $this->agent_opt_in_seller_at !== null;
    }

    public function isOpen(): bool
    {
        return $this->status !== self::STATUS_CLOSED;
    }
}
