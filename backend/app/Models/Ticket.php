<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    protected $fillable = [
        'user_id', 'location', 'category', 'description',
        'photo_path', 'status', 'urgency', 'admin_notes', 'priority'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function supports(): HasMany
    {
        return $this->hasMany(TicketSupport::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(TicketHistory::class)->orderBy('created_at');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TicketComment::class)->orderBy('created_at');
    }
}
