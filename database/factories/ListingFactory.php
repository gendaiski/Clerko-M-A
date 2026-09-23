<?php

namespace Database\Factories;

use App\Enums\ListingStatus;
use App\Models\Company;
use App\Models\Listing;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Listing>
 */
class ListingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id' => Company::factory()->verified(),
            'seller_id' => fn (array $attributes) => Company::find($attributes['company_id'])->owner_id,
            'status' => ListingStatus::Draft,
            'headline' => 'Profitable GCC technology company',
            'teaser_summary' => 'A recurring-revenue SaaS business with a diversified client base and strong growth.',
            'sector' => 'technology',
            'employees_band' => '11-50',
            'location' => 'manama',
            'established_year' => 2018,
            'annual_revenue' => 3200000,
            'ebitda' => 640000,
            'growth_pct' => 25,
            'asking_price' => 8500000,
            'deal_preference' => 'full_sale',
            'highlights' => ['Recurring revenue', 'Diversified clients'],
            'company_overview' => 'Bahrain-registered SaaS provider serving mid-market clients across the GCC.',
            'valuation_low' => 7900000,
            'valuation_high' => 9100000,
            'valuation_methods' => [['method' => 'EBITDA multiple', 'value' => 8300000]],
            'financial_history' => [['year' => 2025, 'revenue' => 3200000, 'ebitda' => 640000]],
            'legal_findings' => [['status' => 'ok', 'text' => 'Clean corporate structure']],
            'court_debt_checks' => [['status' => 'ok', 'text' => 'No active litigation on record']],
        ];
    }

    public function live(): static
    {
        return $this->state(fn () => [
            'status' => ListingStatus::Live,
            'tier' => 'premium',
            'published_at' => now(),
        ]);
    }
}
