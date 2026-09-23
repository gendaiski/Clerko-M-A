<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ListingDocument extends Model
{
    public const VISIBILITY_PACK = 'pack';

    public const VISIBILITY_STAGED = 'staged';

    /**
     * Column defaults, mirrored so new instances have them before a refresh.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'visibility' => 'pack',
    ];

    protected $guarded = ['id'];

    protected $hidden = ['path'];

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    public function accessLogs(): HasMany
    {
        return $this->hasMany(DocumentAccessLog::class);
    }

    public function isPdf(): bool
    {
        return $this->mime_type === 'application/pdf';
    }
}
