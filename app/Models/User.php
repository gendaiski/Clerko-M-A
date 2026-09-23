<?php

namespace App\Models;

use App\Enums\VerificationStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Column defaults, mirrored so new instances have them before a refresh.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'is_admin' => false,
        'kyc_status' => 'unverified',
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'buyer_type',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'kyc_status' => VerificationStatus::class,
            'kyc_verified_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            $user->alias ??= static::generateAlias();
        });
    }

    public static function generateAlias(): string
    {
        do {
            $alias = Str::upper(Str::random(1)).random_int(1, 999);
        } while (! ctype_alpha($alias[0]) || static::where('alias', $alias)->exists());

        return $alias;
    }

    public function isKycVerified(): bool
    {
        return $this->kyc_status === VerificationStatus::Verified;
    }

    /** How the user appears to a counterparty before identities are shared. */
    public function buyerLabel(): string
    {
        return 'Buyer #'.$this->alias;
    }

    public function kycSubmissions(): HasMany
    {
        return $this->hasMany(KycSubmission::class);
    }

    public function latestKycSubmission(): HasOne
    {
        return $this->hasOne(KycSubmission::class)->latestOfMany();
    }

    public function companies(): HasMany
    {
        return $this->hasMany(Company::class, 'owner_id');
    }

    public function listings(): HasMany
    {
        return $this->hasMany(Listing::class, 'seller_id');
    }

    public function engagements(): HasMany
    {
        return $this->hasMany(Engagement::class, 'buyer_id');
    }

    public function buyerPreference(): HasOne
    {
        return $this->hasOne(BuyerPreference::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeBuyerPremium(): ?Subscription
    {
        return $this->subscriptions()
            ->where('plan', Subscription::PLAN_BUYER_PREMIUM)
            ->active()
            ->latest('ends_at')
            ->first();
    }
}
