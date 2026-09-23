<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentSummary extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'open_points' => 'array',
            'buyer_focus' => 'array',
            'seller_focus' => 'array',
        ];
    }

    public function dealRoom(): BelongsTo
    {
        return $this->belongsTo(DealRoom::class);
    }
}
