<?php

namespace Database\Factories;

use App\Enums\VerificationStatus;
use App\Models\KycSubmission;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn () => ['is_admin' => true]);
    }

    /**
     * A user whose identity has been verified, with the KYC record behind it.
     */
    public function kycVerified(): static
    {
        return $this->state(fn () => [
            'kyc_status' => VerificationStatus::Verified,
            'kyc_verified_at' => now(),
        ])->afterCreating(function (User $user) {
            KycSubmission::create([
                'user_id' => $user->id,
                'full_legal_name' => $user->name,
                'nationality' => 'Bahraini',
                'id_type' => 'cpr',
                'id_number' => (string) fake()->numerify('#########'),
                'id_expiry' => now()->addYears(3),
                'id_document_path' => 'kyc/fake-id.pdf',
                'selfie_path' => 'kyc/fake-selfie.jpg',
                'status' => VerificationStatus::Verified,
                'reviewed_at' => now(),
            ]);
        });
    }
}
