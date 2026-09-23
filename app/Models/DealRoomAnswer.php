<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DealRoomAnswer extends Model
{
    protected $guarded = ['id'];

    public function question(): BelongsTo
    {
        return $this->belongsTo(DealRoomQuestion::class, 'deal_room_question_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
