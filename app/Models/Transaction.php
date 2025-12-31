<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'account_id',
        'category_id',
        'type',
        'amount',
        'description',
        'transaction_date',
        'note',
        'receipt_image'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    // Auto update account balance and budgets after creating transaction
    protected static function booted(): void
    {
        static::created(function (Transaction $transaction) {
            $transaction->account->updateBalance(
                $transaction->amount,
                $transaction->type
            );

            // Update relevant budgets if expense
            if ($transaction->type === 'expense') {
                static::updateRelatedBudgets($transaction);
            }
        });

        static::updated(function (Transaction $transaction) {
            if ($transaction->wasChanged(['amount', 'type', 'account_id'])) {
                // Reverse old transaction
                $original = $transaction->getOriginal();
                if ($original['type'] === 'income') {
                    $transaction->account->decrement('balance', $original['amount']);
                } else {
                    $transaction->account->increment('balance', $original['amount']);
                }

                // Apply new transaction
                $transaction->account->updateBalance(
                    $transaction->amount,
                    $transaction->type
                );
            }

            // Update budgets on any expense change
            if ($transaction->type === 'expense' || $transaction->wasChanged('type')) {
                static::updateRelatedBudgets($transaction);
            }
        });

        static::deleted(function (Transaction $transaction) {
            // Update budgets when transaction is deleted
            if ($transaction->type === 'expense') {
                static::updateRelatedBudgets($transaction);
            }
        });
    }

    /**
     * Update all budgets that might be affected by this transaction
     */
    protected static function updateRelatedBudgets(Transaction $transaction): void
    {
        $budgets = Budget::where('user_id', $transaction->user_id)
            ->where('is_active', true)
            ->where('start_date', '<=', $transaction->transaction_date)
            ->where('end_date', '>=', $transaction->transaction_date)
            ->get();

        foreach ($budgets as $budget) {
            // Update if budget has no category (all expenses) or matches transaction category
            if (!$budget->category_id || $budget->category_id === $transaction->category_id) {
                $budget->updateSpentAmount();
            }
        }
    }
}
