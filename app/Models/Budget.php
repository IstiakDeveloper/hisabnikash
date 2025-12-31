<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Budget extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'category_id',
        'name',
        'amount',
        'period',
        'start_date',
        'end_date',
        'spent_amount',
        'note',
        'is_active',
        'notify_on_exceed',
        'alert_percentage'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'spent_amount' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'notify_on_exceed' => 'boolean',
        'alert_percentage' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Calculate remaining budget
     */
    public function getRemainingAttribute(): float
    {
        return max(0, $this->amount - $this->spent_amount);
    }

    /**
     * Calculate spent percentage
     */
    public function getSpentPercentageAttribute(): float
    {
        if ($this->amount == 0) {
            return 0;
        }
        return round(($this->spent_amount / $this->amount) * 100, 2);
    }

    /**
     * Check if budget is exceeded
     */
    public function isExceeded(): bool
    {
        return $this->spent_amount > $this->amount;
    }

    /**
     * Check if budget has reached alert threshold
     */
    public function shouldAlert(): bool
    {
        if (!$this->notify_on_exceed) {
            return false;
        }

        $threshold = ($this->amount * $this->alert_percentage) / 100;
        return $this->spent_amount >= $threshold;
    }

    /**
     * Check if budget is currently active
     */
    public function isCurrentlyActive(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $now = now();
        return $now->between($this->start_date, $this->end_date);
    }

    /**
     * Update spent amount based on transactions
     */
    public function updateSpentAmount(): void
    {
        $query = Transaction::where('user_id', $this->user_id)
            ->where('type', 'expense')
            ->whereBetween('transaction_date', [$this->start_date, $this->end_date]);

        // If budget is category-specific, filter by category
        if ($this->category_id) {
            $query->where('category_id', $this->category_id);
        }

        $this->spent_amount = $query->sum('amount');
        $this->save();
    }

    /**
     * Get status color for UI
     */
    public function getStatusColorAttribute(): string
    {
        if ($this->isExceeded()) {
            return 'red';
        } elseif ($this->shouldAlert()) {
            return 'yellow';
        }
        return 'green';
    }

    /**
     * Get status text
     */
    public function getStatusTextAttribute(): string
    {
        if ($this->isExceeded()) {
            return 'বাজেট অতিক্রম করেছে';
        } elseif ($this->shouldAlert()) {
            return 'সতর্কতা: বাজেট শেষ হতে চলেছে';
        }
        return 'স্বাভাবিক';
    }
}
