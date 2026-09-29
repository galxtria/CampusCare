<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    protected $fillable = [
        'user_id', 'location', 'category', 'description',
        'photo_path', 'status', 'urgency', 'admin_notes', 'duplicate_of', 'priority'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function supports(): HasMany
    {
        return $this->hasMany(TicketSupport::class);
    }

    public function duplicateOf(): BelongsTo
    {
        return $this->belongsTo(Ticket::class, 'duplicate_of');
    }

    public function duplicates(): HasMany
    {
        return $this->hasMany(Ticket::class, 'duplicate_of');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(TicketHistory::class)->orderBy('created_at');
    }
}
