<?php

namespace Database\Factories;

use App\Enums\VerificationStatus;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'owner_id' => User::factory(),
            'cr_pdf_path' => 'companies/fake-cr.pdf',
            'extraction_status' => Company::EXTRACTION_COMPLETED,
            'cr_number' => fake()->numerify('######-1'),
            'name_en' => fake()->company().' W.L.L.',
            'legal_form' => 'With Limited Liability Company',
            'cr_status' => 'ACTIVE',
            'registration_date' => now()->subYears(6),
            'expiry_date' => now()->addYear(),
            'capital' => 50000,
            'seller_capacity' => 'shareholder',
            'verification_status' => VerificationStatus::Pending,
        ];
    }

    public function verified(): static
    {
        return $this->state(fn () => [
            'verification_status' => VerificationStatus::Verified,
            'verified_at' => now(),
        ]);
    }
}
