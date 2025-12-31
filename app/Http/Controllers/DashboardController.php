<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\Loan;
use App\Models\Category;
use App\Models\Budget;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $user = auth()->user();

        // Get all active accounts with balances
        $accounts = Account::where('user_id', $user->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        // Calculate total balance (fixed formatting)
        $totalBalance = $accounts->sum('balance');

        // Get recent transactions
        $recentTransactions = Transaction::with(['account', 'category'])
            ->where('user_id', $user->id)
            ->orderBy('transaction_date', 'desc')
            ->take(10)
            ->get();

        // Get loan summary (fixed calculation)
        $loansTaken = Loan::where('user_id', $user->id)
            ->where('type', 'taken')
            ->where('is_completed', false)
            ->sum('remaining_amount');

        $loansGiven = Loan::where('user_id', $user->id)
            ->where('type', 'given')
            ->where('is_completed', false)
            ->sum('remaining_amount');

        // Calculate net worth (Balance + Loans Given - Loans Taken)
        $netWorth = $totalBalance + $loansGiven - $loansTaken;

        // Monthly income vs expense (current month)
        $currentMonth = now()->startOfMonth();
        $monthlyIncome = Transaction::where('user_id', $user->id)
            ->where('type', 'income')
            ->where('transaction_date', '>=', $currentMonth)
            ->sum('amount');

        $monthlyExpense = Transaction::where('user_id', $user->id)
            ->where('type', 'expense')
            ->where('transaction_date', '>=', $currentMonth)
            ->sum('amount');

        // Category wise expense (current month)
        $categoryExpenses = Transaction::with('category')
            ->where('user_id', $user->id)
            ->where('type', 'expense')
            ->where('transaction_date', '>=', $currentMonth)
            ->get()
            ->groupBy('category.name')
            ->map(function ($transactions) {
                return [
                    'name' => $transactions->first()->category->name,
                    'amount' => $transactions->sum('amount'),
                    'color' => $transactions->first()->category->color,
                    'icon' => $transactions->first()->category->icon,
                ];
            })
            ->values();

        // Get active budgets and their status
        $activeBudgets = Budget::with('category')
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->get();

        // Update spent amounts and prepare budget data
        $activeBudgets->each->updateSpentAmount();

        $budgets = $activeBudgets->map(function ($budget) {
            return [
                'id' => $budget->id,
                'name' => $budget->name,
                'amount' => $budget->amount,
                'spent_amount' => $budget->spent_amount,
                'remaining' => $budget->remaining,
                'spent_percentage' => $budget->spent_percentage,
                'is_exceeded' => $budget->isExceeded(),
                'should_alert' => $budget->shouldAlert(),
                'status_color' => $budget->status_color,
                'status_text' => $budget->status_text,
                'category' => $budget->category ? [
                    'name' => $budget->category->name,
                    'color' => $budget->category->color,
                    'icon' => $budget->category->icon,
                ] : null,
            ];
        });

        // Budget alerts (exceeded or reaching limit)
        $budgetAlerts = $activeBudgets->filter(function ($budget) {
            return $budget->isExceeded() || $budget->shouldAlert();
        })->map(function ($budget) {
            return [
                'id' => $budget->id,
                'name' => $budget->name,
                'message' => $budget->isExceeded()
                    ? "বাজেট ৳" . number_format($budget->spent_amount - $budget->amount, 2) . " টাকা অতিক্রম করেছে!"
                    : "বাজেট " . $budget->spent_percentage . "% ব্যবহৃত হয়েছে!",
                'type' => $budget->isExceeded() ? 'danger' : 'warning',
                'spent_percentage' => $budget->spent_percentage,
            ];
        })->values();

        // Budget summary
        $budgetSummary = [
            'total_budget' => $activeBudgets->sum('amount'),
            'total_spent' => $activeBudgets->sum('spent_amount'),
            'total_remaining' => $activeBudgets->sum('remaining'),
            'exceeded_count' => $activeBudgets->filter->isExceeded()->count(),
        ];

        // Prepare financial summary for layout
        $financialSummary = [
            'totalBalance' => (float) $totalBalance,
            'loansTaken' => (float) $loansTaken,
            'loansGiven' => (float) $loansGiven,
            'netWorth' => (float) $netWorth,
        ];

        return Inertia::render('Dashboard', [
            'accounts' => $accounts,
            'totalBalance' => $totalBalance,
            'recentTransactions' => $recentTransactions,
            'loanSummary' => [
                'taken' => $loansTaken,
                'given' => $loansGiven,
            ],
            'monthlySummary' => [
                'income' => $monthlyIncome,
                'expense' => $monthlyExpense,
                'balance' => $monthlyIncome - $monthlyExpense,
            ],
            'categoryExpenses' => $categoryExpenses,
            'budgets' => $budgets,
            'budgetAlerts' => $budgetAlerts,
            'budgetSummary' => $budgetSummary,
        ])->with([
            'financialSummary' => $financialSummary
        ]);
    }
}
