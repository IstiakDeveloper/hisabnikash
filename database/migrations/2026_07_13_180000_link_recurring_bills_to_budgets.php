<?php

use App\Models\Budget;
use App\Models\RecurringBill;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recurring_bills', function (Blueprint $table) {
            $table->foreignId('budget_id')->nullable()->after('category_id')->constrained()->nullOnDelete();
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('budget_id')->nullable()->after('space_id')->constrained()->nullOnDelete();
            $table->foreignId('recurring_bill_id')->nullable()->after('budget_id')->constrained()->nullOnDelete();
        });

        // Backfill budget links for existing recurring bills
        RecurringBill::whereNull('budget_id')->each(function (RecurringBill $bill) {
            $budget = Budget::where('user_id', $bill->user_id)
                ->where('is_active', true)
                ->when($bill->category_id, fn ($q) => $q->where('category_id', $bill->category_id))
                ->when($bill->space_id, fn ($q) => $q->where('space_id', $bill->space_id))
                ->orderByDesc('start_date')
                ->first();

            if ($budget) {
                $bill->update(['budget_id' => $budget->id]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recurring_bill_id');
            $table->dropConstrainedForeignId('budget_id');
        });

        Schema::table('recurring_bills', function (Blueprint $table) {
            $table->dropConstrainedForeignId('budget_id');
        });
    }
};
