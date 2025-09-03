<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\Loan;
use App\Models\Category;
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
        ])->with([
            'financialSummary' => $financialSummary
        ]);
    }
}
