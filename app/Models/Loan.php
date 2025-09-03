<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Loan extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'person_name',
        'person_phone',
        'amount',
        'remaining_amount',
        'loan_date',
        'due_date',
        'note',
        'interest_rate',
        'is_completed'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'loan_date' => 'date',
        'due_date' => 'date',
        'is_completed' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(LoanPayment::class);
    }

    // Calculate total paid amount
    public function getTotalPaidAttribute(): float
    {
        return $this->payments()->sum('amount');
    }

    // Check if loan is overdue
    public function getIsOverdueAttribute(): bool
    {
        return $this->due_date &&
               $this->due_date->isPast() &&
               !$this->is_completed;
    }

    // Make payment
    public function makePayment(float $amount, int $accountId, ?string $note = null): LoanPayment
    {
        $payment = $this->payments()->create([
            'account_id' => $accountId,
            'amount' => $amount,
            'payment_date' => now(),
            'note' => $note,
        ]);

        // Update remaining amount
        $this->decrement('remaining_amount', $amount);

        // Check if loan is completed
        if ($this->remaining_amount <= 0) {
            $this->update(['is_completed' => true]);
        }

        return $payment;
    }
}
