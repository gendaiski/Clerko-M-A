<?php

namespace App\Models;

use App\Enums\ListingStatus;
use Database\Factories\ListingFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Listing extends Model
{
    /** @use HasFactory<ListingFactory> */
    use HasFactory;

    public const SECTORS = [
        'technology' => 'Technology',
        'manufacturing' => 'Manufacturing',
        'consulting' => 'Consulting',
        'food_beverage' => 'Food & Beverage',
        'hospitality' => 'Hospitality',
        'healthcare' => 'Healthcare',
        'retail' => 'Retail',
        'logistics' => 'Logistics',
        'marketing' => 'Marketing & Media',
        'real_estate' => 'Real Estate',
        'education' => 'Education',
        'other' => 'Other',
    ];

    public const EMPLOYEE_BANDS = [
        '1-10' => '1–10 employees',
        '11-50' => '11–50 employees',
        '51-200' => '51–200 employees',
        '200+' => '200+ employees',
    ];

    public const LOCATIONS = [
        'manama' => 'Manama, Bahrain',
        'riffa' => 'Riffa, Bahrain',
        'muharraq' => 'Muharraq, Bahrain',
        'sitra' => 'Sitra, Bahrain',
        'isa_town' => 'Isa Town, Bahrain',
        'hamad_town' => 'Hamad Town, Bahrain',
        'other_bahrain' => 'Elsewhere in Bahrain',
    ];

    public const DEAL_PREFERENCES = [
        'full_sale' => 'Full sale',
        'majority' => 'Majority stake',
        'minority' => 'Minority stake',
    ];

    public const DOCUMENT_CATEGORIES = [
        'financials' => 'Financials',
        'corporate' => 'Corporate & cap table',
        'legal' => 'Legal',
        'contracts' => 'Contracts',
        'operations' => 'Operations',
        'hr' => 'People & HR',
        'other' => 'Other',
    ];

    /**
     * Column defaults, mirrored so new instances have them before a refresh.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'draft',
        'featured' => false,
        'views_count' => 0,
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'status' => ListingStatus::class,
            'featured' => 'boolean',
            'annual_revenue' => 'decimal:3',
            'ebitda' => 'decimal:3',
            'growth_pct' => 'decimal:2',
            'asking_price' => 'decimal:3',
            'highlights' => 'array',
            'valuation_low' => 'decimal:3',
            'valuation_high' => 'decimal:3',
            'valuation_methods' => 'array',
            'financial_history' => 'array',
            'legal_findings' => 'array',
            'court_debt_checks' => 'array',
            'submitted_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Listing $listing) {
            $listing->reference ??= static::nextReference();
        });
    }

    public static function nextReference(): string
    {
        do {
            $reference = 'L-'.random_int(100, 99999);
        } while (static::where('reference', $reference)->exists());

        return $reference;
    }

    public function scopeLive(Builder $query): void
    {
        $query->where('status', ListingStatus::Live);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ListingReview::class)->latest();
    }

    public function latestReview(): HasOne
    {
        return $this->hasOne(ListingReview::class)->latestOfMany();
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ListingDocument::class);
    }

    public function engagements(): HasMany
    {
        return $this->hasMany(Engagement::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription(): ?Subscription
    {
        return $this->subscriptions()->active()->latest('ends_at')->first();
    }

    public function sectorLabel(): string
    {
        return self::SECTORS[$this->sector] ?? $this->sector;
    }

    /**
     * The anonymised teaser shown on the marketplace. Never includes the
     * company name, CR number or anything else that identifies the business.
     *
     * @return array<string, mixed>
     */
    public function toTeaser(): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'headline' => $this->headline,
            'teaser_summary' => $this->teaser_summary,
            'sector' => $this->sector,
            'sector_label' => $this->sectorLabel(),
            'employees_band' => $this->employees_band,
            'employees_label' => self::EMPLOYEE_BANDS[$this->employees_band] ?? $this->employees_band,
            'location' => $this->location,
            'location_label' => self::LOCATIONS[$this->location] ?? $this->location,
            'established_year' => $this->established_year,
            'annual_revenue' => (float) $this->annual_revenue,
            'growth_pct' => $this->growth_pct !== null ? (float) $this->growth_pct : null,
            'asking_price' => (float) $this->asking_price,
            'deal_preference' => $this->deal_preference,
            'deal_preference_label' => self::DEAL_PREFERENCES[$this->deal_preference] ?? $this->deal_preference,
            'highlights' => $this->highlights ?? [],
            'tier' => $this->tier,
            'featured' => $this->featured,
            'verified' => $this->company?->isVerified() ?? false,
            'views_count' => $this->views_count,
            'published_at' => $this->published_at?->toIso8601String(),
        ];
    }
}
