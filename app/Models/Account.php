<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'type',
        'balance',
        'account_number',
        'bank_branch',
        'is_active'
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function loanPayments(): HasMany
    {
        return $this->hasMany(LoanPayment::class);
    }

    // Auto update balance after transaction
    public function updateBalance(float $amount, string $type): void
    {
        if ($type === 'income') {
            $this->increment('balance', $amount);
        } else {
            $this->decrement('balance', $amount);
        }
    }

    // Get account type icon
    public function getTypeIconAttribute(): string
    {
        return match($this->type) {
            'bank' => '🏦',
            'mobile_banking' => '📱',
            'cash' => '💵',
            'card' => '💳',
            default => '💰'
        };
    }
}
