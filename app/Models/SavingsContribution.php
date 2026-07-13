<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavingsContribution extends Model
{
    use HasFactory;

    protected $fillable = [
        'savings_goal_id',
        'amount',
        'type', // contribution, withdrawal
        'date',
        'note'
    ];

    protected $casts = [
        'date' => 'date',
        'amount' => 'decimal:2'
    ];

    public function goal(): BelongsTo
    {
        return $this->belongsTo(SavingsGoal::class, 'savings_goal_id');
    }

    protected static function booted(): void
    {
        static::created(function (SavingsContribution $contribution) {
            $goal = $contribution->goal;
            if ($contribution->type === 'contribution') {
                $goal->increment('current_amount', $contribution->amount);
            } else {
                $goal->decrement('current_amount', $contribution->amount);
            }
        });

        static::deleted(function (SavingsContribution $contribution) {
            $goal = $contribution->goal;
            if ($contribution->type === 'contribution') {
                $goal->decrement('current_amount', $contribution->amount);
            } else {
                $goal->increment('current_amount', $contribution->amount);
            }
        });
    }
}
