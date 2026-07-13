<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Category;
use App\Models\Space;
use App\Models\Loan;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        $user = auth()->user();
        $spaceId = $request->query('space_id');
        $dateFrom = $request->query('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $dateTo = $request->query('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));

        $query = Transaction::with(['category', 'space', 'account'])
            ->where('user_id', $user->id)
            ->whereBetween('transaction_date', [$dateFrom, $dateTo]);

        if ($spaceId && $spaceId !== 'combined') {
            $query->where('space_id', $spaceId);
        }

        $transactions = $query->orderBy('transaction_date', 'asc')->get();

        $totalIncome = $transactions->where('type', 'income')->sum('amount');
        $totalExpense = $transactions->where('type', 'expense')->sum('amount');

        // Category breakdown
        $categoryBreakdown = $transactions->where('type', 'expense')
            ->groupBy('category.name')
            ->map(function ($txs) use ($totalExpense) {
                $amount = $txs->sum('amount');
                return [
                    'name' => $txs->first()->category->name ?? 'Uncategorized',
                    'amount' => (float)$amount,
                    'percentage' => $totalExpense > 0 ? round(($amount / $totalExpense) * 100, 2) : 0,
                    'color' => $txs->first()->category->color ?? '#6B7280',
                    'icon' => $txs->first()->category->icon ?? '📦',
                ];
            })
            ->values()
            ->sortByDesc('amount')
            ->values();

        // Fixed vs Variable Ratio
        $fixedAmount = $transactions->where('type', 'expense')->where('is_fixed', true)->sum('amount');
        $variableAmount = $transactions->where('type', 'expense')->where('is_fixed', false)->sum('amount');

        // Business Profitability (For each Business space, compute Revenue vs Expenses)
        $businessSpaces = Space::where('user_id', $user->id)->where('type', 'business')->get();
        $profitability = $businessSpaces->map(function ($space) use ($dateFrom, $dateTo, $user) {
            $inc = Transaction::where('user_id', $user->id)
                ->where('space_id', $space->id)
                ->where('type', 'income')
                ->whereBetween('transaction_date', [$dateFrom, $dateTo])
                ->sum('amount');

            $exp = Transaction::where('user_id', $user->id)
                ->where('space_id', $space->id)
                ->where('type', 'expense')
                ->whereBetween('transaction_date', [$dateFrom, $dateTo])
                ->sum('amount');

            return [
                'space_name' => $space->name,
                'income' => (float)$inc,
                'expense' => (float)$exp,
                'net_profit' => (float)($inc - $exp),
            ];
        });

        // Debt Reduction Summary
        $debtQuery = Loan::where('user_id', $user->id)->where('type', 'taken');
        if ($spaceId && $spaceId !== 'combined') {
            $debtQuery->where('space_id', $spaceId);
        }
        $debts = $debtQuery->get()->map(function ($loan) {
            return [
                'lender' => $loan->person_name,
                'principal' => (float)$loan->amount,
                'remaining' => (float)$loan->remaining_amount,
                'paid' => (float)($loan->amount - $loan->remaining_amount),
            ];
        });

        $spaces = Space::where('user_id', $user->id)->get(['id', 'name', 'type']);

        return Inertia::render('Reports/Index', [
            'totalIncome' => (float)$totalIncome,
            'totalExpense' => (float)$totalExpense,
            'netSavings' => (float)($totalIncome - $totalExpense),
            'categoryBreakdown' => $categoryBreakdown,
            'fixedExpenses' => (float)$fixedAmount,
            'variableExpenses' => (float)$variableAmount,
            'profitability' => $profitability,
            'debts' => $debts,
            'spaces' => $spaces,
            'selectedSpaceId' => $spaceId,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
        ]);
    }

    /**
     * Download transactions report as CSV.
     */
    public function exportCSV(Request $request): StreamedResponse
    {
        $user = auth()->user();
        $spaceId = $request->query('space_id');
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');

        $query = Transaction::with(['category', 'space', 'account'])
            ->where('user_id', $user->id);

        if ($dateFrom && $dateTo) {
            $query->whereBetween('transaction_date', [$dateFrom, $dateTo]);
        }

        if ($spaceId && $spaceId !== 'combined') {
            $query->where('space_id', $spaceId);
        }

        $transactions = $query->orderBy('transaction_date', 'asc')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="transactions_report_' . date('Ymd_His') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($transactions) {
            $file = fopen('php://output', 'w');
            
            // Add UTF-8 BOM for Excel Bengali compatibility
            fputs($file, "\xEF\xBB\xBF");

            // CSV Header
            fputcsv($file, ['ID', 'Date', 'Space/Profile', 'Account', 'Category', 'Type', 'Amount (BDT)', 'Classification', 'Payment Method', 'Description', 'Note']);

            foreach ($transactions as $tx) {
                fputcsv($file, [
                    $tx->id,
                    $tx->transaction_date->format('Y-m-d'),
                    $tx->space->name ?? 'General',
                    $tx->account->name,
                    $tx->category->name ?? 'Uncategorized',
                    ucfirst($tx->type),
                    $tx->amount,
                    $tx->is_fixed ? 'Fixed' : 'Variable',
                    ucfirst(str_replace('_', ' ', $tx->payment_method)),
                    $tx->description,
                    $tx->note,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
