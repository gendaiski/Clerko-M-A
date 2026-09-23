<?php

namespace App\Models;

use App\Enums\VerificationStatus;
use Database\Factories\CompanyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    /** @use HasFactory<CompanyFactory> */
    use HasFactory;

    public const EXTRACTION_PENDING = 'pending';

    public const EXTRACTION_PROCESSING = 'processing';

    public const EXTRACTION_COMPLETED = 'completed';

    public const EXTRACTION_FAILED = 'failed';

    /** Waiting for an admin to enter the profile from the PDF. */
    public const EXTRACTION_MANUAL = 'manual';

    public const SELLER_CAPACITIES = [
        'shareholder' => 'Shareholder / partner',
        'authorised_signatory' => 'Authorised signatory',
        'attorney' => 'Holder of a power of attorney',
    ];

    /**
     * Column defaults, mirrored so new instances have them before a refresh.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'extraction_status' => 'pending',
        'extraction_attempts' => 0,
        'verification_status' => 'pending',
    ];

    protected $guarded = ['id'];

    protected $hidden = ['cr_pdf_path', 'authority_document_path', 'extracted_data'];

    protected function casts(): array
    {
        return [
            'extracted_data' => 'array',
            'registration_date' => 'date',
            'expiry_date' => 'date',
            'capital' => 'decimal:3',
            'activities' => 'array',
            'shareholders' => 'array',
            'signatories' => 'array',
            'verification_status' => VerificationStatus::class,
            'verified_at' => 'datetime',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function extractionRuns(): HasMany
    {
        return $this->hasMany(ExtractionRun::class)->latest('id');
    }

    public function listings(): HasMany
    {
        return $this->hasMany(Listing::class);
    }

    public function isVerified(): bool
    {
        return $this->verification_status === VerificationStatus::Verified;
    }

    public function crExpiresSoon(): bool
    {
        return $this->expiry_date !== null && $this->expiry_date->lte(now()->addDays(30));
    }
}
