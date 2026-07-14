<?php

use App\Models\Budget;
use App\Models\Transaction;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Transaction::where('type', 'expense')
            ->whereNull('budget_id')
            ->each(function (Transaction $transaction) {
                $budgetQuery = Budget::where('user_id', $transaction->user_id)
                    ->where('is_active', true)
                    ->where('start_date', '<=', $transaction->transaction_date)
                    ->where('end_date', '>=', $transaction->transaction_date)
                    ->when($transaction->space_id, fn ($q) => $q->where('space_id', $transaction->space_id));

                if ($transaction->category_id) {
                    $budget = (clone $budgetQuery)
                        ->where('category_id', $transaction->category_id)
                        ->orderByDesc('start_date')
                        ->first();
                } else {
                    $budget = null;
                }

                if ($budget) {
                    $transaction->update(['budget_id' => $budget->id]);
                }
            });

        Budget::all()->each->updateSpentAmount();
    }

    public function down(): void
    {
        // No rollback needed for data backfill
    }
};
