<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SavingsGoal extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'space_id',
        'name',
        'target_amount',
        'target_date',
        'current_amount'
    ];

    protected $casts = [
        'target_date' => 'date',
        'target_amount' => 'decimal:2',
        'current_amount' => 'decimal:2'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function space(): BelongsTo
    {
        return $this->belongsTo(Space::class);
    }

    public function contributions(): HasMany
    {
        return $this->hasMany(SavingsContribution::class);
    }

    // Suggested monthly contribution to hit target date
    public function getSuggestedMonthlyContributionAttribute(): float
    {
        $monthsRemaining = now()->diffInMonths($this->target_date, false);
        if ($monthsRemaining <= 0) {
            $monthsRemaining = 1;
        }
        $remainingAmount = max(0, $this->target_amount - $this->current_amount);
        return round($remainingAmount / $monthsRemaining, 2);
    }

    // Get progress percentage
    public function getProgressPercentageAttribute(): float
    {
        if ($this->target_amount <= 0) {
            return 0;
        }
        return min(100, round(($this->current_amount / $this->target_amount) * 100, 2));
    }
}
