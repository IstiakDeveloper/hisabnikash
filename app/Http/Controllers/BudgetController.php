<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;

class BudgetController extends Controller
{
    use AuthorizesRequests;
    /**
     * Display a listing of budgets
     */
    public function index(Request $request): Response
    {
        $query = Budget::with(['category'])
            ->where('user_id', auth()->id());

        // Filter by status
        if ($request->has('status')) {
            if ($request->status === 'active') {
                $query->where('is_active', true)
                    ->where('start_date', '<=', now())
                    ->where('end_date', '>=', now());
            } elseif ($request->status === 'exceeded') {
                $query->whereRaw('spent_amount > amount');
            } elseif ($request->status === 'completed') {
                $query->where('end_date', '<', now());
            }
        }

        // Filter by period
        if ($request->has('period') && $request->period) {
            $query->where('period', $request->period);
        }

        $budgets = $query->latest()->paginate(15)->through(function ($budget) {
            // Update spent amount before displaying
            $budget->updateSpentAmount();

            return [
                'id' => $budget->id,
                'name' => $budget->name,
                'amount' => $budget->amount,
                'spent_amount' => $budget->spent_amount,
                'remaining' => $budget->remaining,
                'spent_percentage' => $budget->spent_percentage,
                'period' => $budget->period,
                'start_date' => $budget->start_date->format('Y-m-d'),
                'end_date' => $budget->end_date->format('Y-m-d'),
                'category' => $budget->category ? [
                    'id' => $budget->category->id,
                    'name' => $budget->category->name,
                    'color' => $budget->category->color,
                    'icon' => $budget->category->icon,
                ] : null,
                'is_active' => $budget->is_active,
                'is_exceeded' => $budget->isExceeded(),
                'should_alert' => $budget->shouldAlert(),
                'status_color' => $budget->status_color,
                'status_text' => $budget->status_text,
                'note' => $budget->note,
            ];
        });

        // Get summary statistics
        $activeBudgets = Budget::where('user_id', auth()->id())
            ->where('is_active', true)
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->get();

        $activeBudgets->each->updateSpentAmount();

        $summary = [
            'total_budget' => $activeBudgets->sum('amount'),
            'total_spent' => $activeBudgets->sum('spent_amount'),
            'total_remaining' => $activeBudgets->sum('remaining'),
            'exceeded_count' => $activeBudgets->filter->isExceeded()->count(),
            'alert_count' => $activeBudgets->filter->shouldAlert()->count(),
        ];

        return Inertia::render('Budgets/Index', [
            'budgets' => $budgets,
            'summary' => $summary,
            'filters' => $request->only(['status', 'period'])
        ]);
    }

    /**
     * Show the form for creating a new budget
     */
    public function create(): Response
    {
        $categories = Category::where('user_id', auth()->id())
            ->where('is_active', true)
            ->where('type', 'expense')
            ->orderBy('name')
            ->get(['id', 'name', 'color', 'icon', 'type']);

        return Inertia::render('Budgets/Create', [
            'categories' => $categories
        ]);
    }

    /**
     * Store a newly created budget
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'amount' => 'required|numeric|min:0',
            'period' => 'required|in:daily,weekly,monthly,yearly',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'note' => 'nullable|string',
            'alert_percentage' => 'nullable|integer|min:0|max:100',
            'notify_on_exceed' => 'boolean',
        ]);

        $validated['user_id'] = auth()->id();
        $validated['alert_percentage'] = $validated['alert_percentage'] ?? 80;
        $validated['notify_on_exceed'] = $validated['notify_on_exceed'] ?? true;

        // Verify category belongs to user if provided
        if (isset($validated['category_id'])) {
            $category = Category::where('id', $validated['category_id'])
                ->where('user_id', auth()->id())
                ->firstOrFail();
        }

        $budget = Budget::create($validated);
        $budget->updateSpentAmount();

        return redirect()->route('budgets.index')
            ->with('success', 'বাজেট সফলভাবে তৈরি হয়েছে!');
    }

    /**
     * Display the specified budget
     */
    public function show(Budget $budget): Response
    {
        $this->authorize('view', $budget);

        $budget->load('category');
        $budget->updateSpentAmount();

        // Get transactions related to this budget
        $transactionsQuery = $budget->user->transactions()
            ->with(['account', 'category'])
            ->where('type', 'expense')
            ->whereBetween('transaction_date', [$budget->start_date, $budget->end_date]);

        if ($budget->category_id) {
            $transactionsQuery->where('category_id', $budget->category_id);
        }

        $transactions = $transactionsQuery->latest('transaction_date')->get()->map(function ($transaction) {
            return [
                'id' => $transaction->id,
                'description' => $transaction->description,
                'amount' => $transaction->amount,
                'transaction_date' => $transaction->transaction_date->format('Y-m-d'),
                'category' => [
                    'name' => $transaction->category->name,
                    'color' => $transaction->category->color,
                    'icon' => $transaction->category->icon,
                ],
                'account' => [
                    'name' => $transaction->account->name,
                    'type' => $transaction->account->type,
                ],
            ];
        });

        return Inertia::render('Budgets/Show', [
            'budget' => [
                'id' => $budget->id,
                'name' => $budget->name,
                'amount' => $budget->amount,
                'spent_amount' => $budget->spent_amount,
                'remaining' => $budget->remaining,
                'spent_percentage' => $budget->spent_percentage,
                'period' => $budget->period,
                'start_date' => $budget->start_date->format('Y-m-d'),
                'end_date' => $budget->end_date->format('Y-m-d'),
                'category' => $budget->category ? [
                    'id' => $budget->category->id,
                    'name' => $budget->category->name,
                    'color' => $budget->category->color,
                    'icon' => $budget->category->icon,
                ] : null,
                'is_active' => $budget->is_active,
                'is_exceeded' => $budget->isExceeded(),
                'should_alert' => $budget->shouldAlert(),
                'status_color' => $budget->status_color,
                'status_text' => $budget->status_text,
                'note' => $budget->note,
                'alert_percentage' => $budget->alert_percentage,
                'notify_on_exceed' => $budget->notify_on_exceed,
            ],
            'transactions' => $transactions
        ]);
    }

    /**
     * Show the form for editing budget
     */
    public function edit(Budget $budget): Response
    {
        $this->authorize('update', $budget);

        $categories = Category::where('user_id', auth()->id())
            ->where('is_active', true)
            ->where('type', 'expense')
            ->orderBy('name')
            ->get(['id', 'name', 'color', 'icon', 'type']);

        $budget->load('category');

        return Inertia::render('Budgets/Edit', [
            'budget' => [
                'id' => $budget->id,
                'name' => $budget->name,
                'amount' => $budget->amount,
                'category_id' => $budget->category_id,
                'period' => $budget->period,
                'start_date' => $budget->start_date->format('Y-m-d'),
                'end_date' => $budget->end_date->format('Y-m-d'),
                'note' => $budget->note,
                'alert_percentage' => $budget->alert_percentage,
                'notify_on_exceed' => $budget->notify_on_exceed,
                'is_active' => $budget->is_active,
            ],
            'categories' => $categories
        ]);
    }

    /**
     * Update the specified budget
     */
    public function update(Request $request, Budget $budget): RedirectResponse
    {
        $this->authorize('update', $budget);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'amount' => 'required|numeric|min:0',
            'period' => 'required|in:daily,weekly,monthly,yearly',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'note' => 'nullable|string',
            'alert_percentage' => 'nullable|integer|min:0|max:100',
            'notify_on_exceed' => 'boolean',
            'is_active' => 'boolean',
        ]);

        // Verify category belongs to user if provided
        if (isset($validated['category_id'])) {
            $category = Category::where('id', $validated['category_id'])
                ->where('user_id', auth()->id())
                ->firstOrFail();
        }

        $budget->update($validated);
        $budget->updateSpentAmount();

        return redirect()->route('budgets.index')
            ->with('success', 'বাজেট সফলভাবে আপডেট হয়েছে!');
    }

    /**
     * Remove the specified budget
     */
    public function destroy(Budget $budget): RedirectResponse
    {
        $this->authorize('delete', $budget);

        $budget->delete();

        return redirect()->route('budgets.index')
            ->with('success', 'বাজেট সফলভাবে মুছে ফেলা হয়েছে!');
    }

    /**
     * Refresh/recalculate all budgets spent amounts
     */
    public function refresh(): RedirectResponse
    {
        $budgets = Budget::where('user_id', auth()->id())->get();

        foreach ($budgets as $budget) {
            $budget->updateSpentAmount();
        }

        return redirect()->back()
            ->with('success', 'সব বাজেট আপডেট হয়েছে!');
    }
}
