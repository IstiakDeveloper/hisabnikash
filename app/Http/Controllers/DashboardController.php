<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\Loan;
use App\Models\LoanInstallment;
use App\Models\Category;
use App\Models\Budget;
use App\Models\SavingsGoal;
use App\Models\RecurringBill;
use App\Models\Space;
use App\Models\Notification;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = auth()->user();

        // 1. Determine Selected Space
        $spaceId = $request->query('space_id');
        $spaces = Space::where('user_id', $user->id)->orderBy('is_default', 'desc')->get();
        
        $activeSpace = null;
        if ($spaceId && $spaceId !== 'combined') {
            $activeSpace = $spaces->firstWhere('id', $spaceId);
        }
        
        // If no space selected, fall back to default space
        if (!$spaceId) {
            $defaultSpace = $spaces->firstWhere('is_default', true) ?: $spaces->first();
            $spaceId = $defaultSpace ? $defaultSpace->id : 'combined';
            $activeSpace = $defaultSpace;
        }

        // 2. Fetch Accounts
        $accounts = Account::where('user_id', $user->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
        $totalBalance = $accounts->sum('balance');

        // 3. Transactions Query
        $txQuery = Transaction::with(['account', 'category', 'space'])
            ->where('user_id', $user->id);
            
        if ($activeSpace) {
            $txQuery->where('space_id', $activeSpace->id);
        }
        
        $recentTransactions = (clone $txQuery)
            ->orderBy('transaction_date', 'desc')
            ->take(10)
            ->get();

        // 4. Monthly Cash Flow (Income vs Expenses)
        $currentMonthStart = Carbon::now()->startOfMonth();
        $currentMonthEnd = Carbon::now()->endOfMonth();

        $monthlyIncome = (clone $txQuery)
            ->where('type', 'income')
            ->whereBetween('transaction_date', [$currentMonthStart, $currentMonthEnd])
            ->sum('amount');

        $monthlyExpense = (clone $txQuery)
            ->where('type', 'expense')
            ->whereBetween('transaction_date', [$currentMonthStart, $currentMonthEnd])
            ->sum('amount');

        // Fixed vs Variable Expense Breakdown
        $fixedExpenses = (clone $txQuery)
            ->where('type', 'expense')
            ->where('is_fixed', true)
            ->whereBetween('transaction_date', [$currentMonthStart, $currentMonthEnd])
            ->sum('amount');

        $variableExpenses = (clone $txQuery)
            ->where('type', 'expense')
            ->where('is_fixed', false)
            ->whereBetween('transaction_date', [$currentMonthStart, $currentMonthEnd])
            ->sum('amount');

        // 5. Category-wise Expenses Breakdown (current month)
        $categoryExpenses = (clone $txQuery)
            ->where('type', 'expense')
            ->whereBetween('transaction_date', [$currentMonthStart, $currentMonthEnd])
            ->get()
            ->groupBy('category.name')
            ->map(function ($transactions) {
                $first = $transactions->first();
                return [
                    'name' => $first->category->name ?? 'Uncategorized',
                    'amount' => (float)$transactions->sum('amount'),
                    'color' => $first->category->color ?? '#6B7280',
                    'icon' => $first->category->icon ?? '📦',
                ];
            })
            ->values();

        // 6. Loans & EMIs Summary
        $loanQuery = Loan::where('user_id', $user->id);
        if ($activeSpace) {
            $loanQuery->where('space_id', $activeSpace->id);
        }

        $loansTaken = (clone $loanQuery)->where('type', 'taken')->where('is_completed', false)->sum('remaining_amount');
        $loansGiven = (clone $loanQuery)->where('type', 'given')->where('is_completed', false)->sum('remaining_amount');

        // Combined Net Worth (Balance + Loans Given - Loans Taken)
        $netWorth = $totalBalance + $loansGiven - $loansTaken;

        // Active EMIs obligations this month
        $upcomingEMIs = LoanInstallment::whereHas('loan', function($q) use ($user, $activeSpace) {
                $q->where('user_id', $user->id)->where('is_completed', false);
                if ($activeSpace) {
                    $q->where('space_id', $activeSpace->id);
                }
            })
            ->where('status', 'unpaid')
            ->whereBetween('due_date', [Carbon::now(), Carbon::now()->endOfMonth()])
            ->get();
        $monthlyEMIObligation = $upcomingEMIs->sum('amount');

        // Next EMI details
        $nextEMI = LoanInstallment::whereHas('loan', function($q) use ($user, $activeSpace) {
                $q->where('user_id', $user->id)->where('is_completed', false);
                if ($activeSpace) {
                    $q->where('space_id', $activeSpace->id);
                }
            })
            ->where('status', 'unpaid')
            ->orderBy('due_date', 'asc')
            ->first();

        // Debt-free date calculator
        $activeLoans = (clone $loanQuery)->where('type', 'taken')->where('is_completed', false)->get();
        $debtFreeDate = null;
        if ($activeLoans->count() > 0) {
            $maxTenureMonths = 0;
            foreach ($activeLoans as $l) {
                $unpaidCount = $l->installments()->where('status', 'unpaid')->count();
                if ($unpaidCount > $maxTenureMonths) {
                    $maxTenureMonths = $unpaidCount;
                }
            }
            if ($maxTenureMonths > 0) {
                $debtFreeDate = Carbon::now()->addMonths($maxTenureMonths)->format('F Y');
            } else {
                $debtFreeDate = 'Immediate';
            }
        } else {
            $debtFreeDate = 'Debt-Free';
        }

        // 7. Emergency Fund Progress
        $emergencyGoal = SavingsGoal::where('user_id', $user->id)
            ->where('name', 'like', '%Emergency%')
            ->first() ?: SavingsGoal::where('user_id', $user->id)->first();

        // 8. Upcoming Bills this week
        $billQuery = RecurringBill::where('user_id', $user->id)->where('status', 'active');
        if ($activeSpace) {
            $billQuery->where('space_id', $activeSpace->id);
        }
        $bills = $billQuery->get();
        
        $upcomingBills = [];
        $todayDay = Carbon::now()->day;
        foreach ($bills as $bill) {
            // Check if due this week
            $dueThisMonth = Carbon::now()->day($bill->due_day);
            // Has it been paid? Check if a transaction exists this month with similar category or description
            $alreadyPaid = (clone $txQuery)
                ->where('type', 'expense')
                ->where('category_id', $bill->category_id)
                ->whereMonth('transaction_date', Carbon::now()->month)
                ->exists();

            if (!$alreadyPaid) {
                $upcomingBills[] = [
                    'id' => $bill->id,
                    'name' => $bill->name,
                    'amount' => $bill->amount,
                    'due_date' => $dueThisMonth->format('Y-m-d'),
                    'due_in_days' => Carbon::now()->diffInDays($dueThisMonth, false),
                ];
            }
        }
        // Sort upcoming bills by due date
        usort($upcomingBills, function($a, $b) {
            return strcmp($a['due_date'], $b['due_date']);
        });

        // 9. Spending trend last 6 months
        $trendData = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $start = $month->copy()->startOfMonth();
            $end = $month->copy()->endOfMonth();

            $inc = (clone $txQuery)->where('type', 'income')->whereBetween('transaction_date', [$start, $end])->sum('amount');
            $exp = (clone $txQuery)->where('type', 'expense')->whereBetween('transaction_date', [$start, $end])->sum('amount');

            $trendData[] = [
                'month' => $month->format('M'),
                'income' => (float)$inc,
                'expense' => (float)$exp,
            ];
        }

        // 10. Budgets Tracker
        $budgetQuery = Budget::with('category')->where('user_id', $user->id)->where('is_active', true);
        if ($activeSpace) {
            $budgetQuery->where('space_id', $activeSpace->id);
        }
        $activeBudgets = $budgetQuery->get();
        $activeBudgets->each->updateSpentAmount();

        $budgetsList = $activeBudgets->map(function ($b) {
            return [
                'id' => $b->id,
                'name' => $b->name,
                'amount' => $b->amount,
                'spent_amount' => $b->spent_amount,
                'remaining' => $b->remaining,
                'spent_percentage' => $b->spent_percentage,
                'is_exceeded' => $b->isExceeded(),
                'should_alert' => $b->shouldAlert(),
                'status_color' => $b->status_color,
                'status_text' => $b->status_text,
                'category' => $b->category ? [
                    'name' => $b->category->name,
                    'color' => $b->category->color,
                    'icon' => $b->category->icon,
                ] : null,
            ];
        });

        // 11. Alerts Feed
        $alerts = [];
        // EMI due alerts (due in <= 3 days)
        $dueSoonEMIs = LoanInstallment::whereHas('loan', function($q) use ($user) {
                $q->where('user_id', $user->id)->where('is_completed', false);
            })
            ->where('status', 'unpaid')
            ->whereBetween('due_date', [Carbon::now(), Carbon::now()->addDays(3)])
            ->get();
        foreach ($dueSoonEMIs as $emi) {
            $alerts[] = [
                'id' => 'emi-' . $emi->id,
                'message' => "EMI Due: {$emi->loan->person_name} (৳" . number_format($emi->amount) . ") due on " . $emi->due_date->format('d M'),
                'type' => 'danger'
            ];
        }

        // Budget exceeded alerts
        foreach ($activeBudgets as $b) {
            if ($b->isExceeded()) {
                $alerts[] = [
                    'id' => 'budget-exc-' . $b->id,
                    'message' => "ਬাজেট অতিক্রম: '{$b->name}' বাজেট অতিক্রম করেছে ৳" . number_format($b->spent_amount - $b->amount) . " টাকা!",
                    'type' => 'danger'
                ];
            } elseif ($b->shouldAlert()) {
                $alerts[] = [
                    'id' => 'budget-warn-' . $b->id,
                    'message' => "বাজেট সতর্কতা: '{$b->name}' বাজেটের " . $b->spent_percentage . "% শেষ হয়েছে।",
                    'type' => 'warning'
                ];
            }
        }

        // Low balance prediction alert
        // Projected expense = remaining fixed expense + upcoming EMIs + upcoming bills
        $projectedExpense = $upcomingEMIs->sum('amount');
        foreach ($upcomingBills as $b) {
            $projectedExpense += $b['amount'];
        }
        if ($totalBalance < $projectedExpense && $projectedExpense > 0) {
            $alerts[] = [
                'id' => 'low-balance',
                'message' => "ব্যালেন্স সতর্কতা: এই মাসের আসন্ন খরচ মেটানোর জন্য পর্যাপ্ত ব্যালেন্স নেই (আসন্ন খরচ ৳" . number_format($projectedExpense) . ", ব্যালেন্স ৳" . number_format($totalBalance) . ")।",
                'type' => 'warning'
            ];
        }

        // In-app notifications
        $inAppNotifications = Notification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Dashboard', [
            'spaces' => $spaces,
            'spaceId' => $spaceId,
            'activeSpace' => $activeSpace,
            'accounts' => $accounts,
            'totalBalance' => (float)$totalBalance,
            'recentTransactions' => $recentTransactions,
            'loanSummary' => [
                'taken' => (float)$loansTaken,
                'given' => (float)$loansGiven,
                'monthlyEMIObligation' => (float)$monthlyEMIObligation,
                'nextEMIDate' => $nextEMI ? $nextEMI->due_date->format('Y-m-d') : null,
                'nextEMIAmount' => $nextEMI ? (float)$nextEMI->amount : 0,
                'debtFreeDate' => $debtFreeDate,
            ],
            'monthlySummary' => [
                'income' => (float)$monthlyIncome,
                'expense' => (float)$monthlyExpense,
                'balance' => (float)($monthlyIncome - $monthlyExpense),
                'fixed' => (float)$fixedExpenses,
                'variable' => (float)$variableExpenses,
            ],
            'categoryExpenses' => $categoryExpenses,
            'budgets' => $budgetsList,
            'emergencyFund' => $emergencyGoal ? [
                'id' => $emergencyGoal->id,
                'name' => $emergencyGoal->name,
                'target' => (float)$emergencyGoal->target_amount,
                'current' => (float)$emergencyGoal->current_amount,
                'percentage' => $emergencyGoal->progress_percentage,
                'suggested_monthly' => $emergencyGoal->suggested_monthly_contribution,
            ] : null,
            'upcomingBills' => $upcomingBills,
            'trendData' => $trendData,
            'alerts' => $alerts,
            'notifications' => $inAppNotifications,
            'financialSummary' => [
                'totalBalance' => (float)$totalBalance,
                'loansTaken' => (float)$loansTaken,
                'loansGiven' => (float)$loansGiven,
                'netWorth' => (float)$netWorth,
            ]
        ]);
    }
}
