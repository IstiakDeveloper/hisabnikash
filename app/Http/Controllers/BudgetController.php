<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\Category;
use App\Models\Space;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;

class BudgetController extends Controller
{
    public function index(Request $request): Response
    {
        $user = auth()->user();
        $spaceId = $request->query('space_id');
        $month = $request->query('month', now()->format('Y-m'));

        try {
            $monthDate = Carbon::createFromFormat('Y-m', $month);
        } catch (\Exception $e) {
            $monthDate = now();
            $month = $monthDate->format('Y-m');
        }

        $monthStart = $monthDate->copy()->startOfMonth()->toDateString();
        $monthEnd = $monthDate->copy()->endOfMonth()->toDateString();

        $query = Budget::with(['category', 'space'])
            ->where('user_id', $user->id)
            ->where('start_date', '<=', $monthEnd)
            ->where('end_date', '>=', $monthStart);

        if ($spaceId && $spaceId !== 'combined') {
            $query->where('space_id', $spaceId);
        }

        // Apply filters
        if ($request->has('status')) {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } elseif ($request->status === 'exceeded') {
                $query->whereRaw('spent_amount > amount');
            } elseif ($request->status === 'completed') {
                $query->where('end_date', '<', now());
            }
        }

        $budgets = $query->orderBy('name')->get();

        // Recalculate spent amounts live from transactions
        foreach ($budgets as $budget) {
            $budget->updateSpentAmount();
        }

        $budgets = $budgets->fresh()->load(['category', 'space']);

        $categories = Category::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('type', 'expense')
            ->orderBy('name')
            ->get(['id', 'name', 'color', 'icon', 'space_id']);

        $spaces = Space::where('user_id', $user->id)->get(['id', 'name', 'type']);

        $activeBudgets = $budgets->filter(function (Budget $budget) use ($monthStart, $monthEnd) {
            return $budget->is_active
                && $budget->start_date->toDateString() <= $monthEnd
                && $budget->end_date->toDateString() >= $monthStart;
        });

        $summary = [
            'total_budget' => (float) $activeBudgets->sum('amount'),
            'total_spent' => (float) $activeBudgets->sum('spent_amount'),
            'total_remaining' => (float) $activeBudgets->sum(fn (Budget $b) => $b->remaining),
            'exceeded_count' => $activeBudgets->filter->isExceeded()->count(),
        ];

        return Inertia::render('Budgets/Index', [
            'budgets' => $budgets->values(),
            'categories' => $categories,
            'spaces' => $spaces,
            'summary' => $summary,
            'filters' => $request->only(['status', 'space_id']),
            'selectedMonth' => $month,
        ]);
    }

    public function create(): \Inertia\Response
    {
        $user = auth()->user();
        $categories = Category::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('type', 'expense')
            ->orderBy('name')
            ->get(['id', 'name', 'color', 'icon', 'space_id']);

        $spaces = Space::where('user_id', $user->id)->get(['id', 'name', 'type']);

        return Inertia::render('Budgets/Create', [
            'categories' => $categories,
            'spaces' => $spaces,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'space_id' => 'required|exists:spaces,id',
            'amount' => 'required|numeric|min:0.01',
            'period' => 'nullable|in:daily,weekly,monthly,yearly',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'note' => 'nullable|string',
            'alert_percentage' => 'nullable|integer|min:0|max:100',
            'notify_on_exceed' => 'boolean',
        ]);

        // Validate space and category ownership
        Space::where('id', $validated['space_id'])->where('user_id', auth()->id())->firstOrFail();
        if ($validated['category_id']) {
            Category::where('id', $validated['category_id'])->where('user_id', auth()->id())->firstOrFail();
        }

        $budget = Budget::create([
            'user_id' => auth()->id(),
            'space_id' => $validated['space_id'],
            'category_id' => $validated['category_id'],
            'name' => $validated['name'],
            'amount' => $validated['amount'],
            'period' => 'monthly',
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'note' => $validated['note'],
            'alert_percentage' => $validated['alert_percentage'] ?? 80,
            'notify_on_exceed' => $request->has('notify_on_exceed') ? $validated['notify_on_exceed'] : true,
            'is_active' => true,
            'spent_amount' => 0
        ]);

        $budget->updateSpentAmount();

        return redirect()->back()->with('success', 'বাজেট সফলভাবে তৈরি হয়েছে!');
    }

    public function edit(Budget $budget): \Inertia\Response
    {
        if ($budget->user_id !== auth()->id()) {
            abort(403);
        }

        $budget->updateSpentAmount();

        $user = auth()->user();
        $categories = Category::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('type', 'expense')
            ->orderBy('name')
            ->get(['id', 'name', 'color', 'icon', 'space_id']);

        $spaces = Space::where('user_id', $user->id)->get(['id', 'name', 'type']);

        return Inertia::render('Budgets/Edit', [
            'budget' => $budget,
            'categories' => $categories,
            'spaces' => $spaces,
        ]);
    }

    public function update(Request $request, Budget $budget): RedirectResponse
    {
        if ($budget->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'space_id' => 'required|exists:spaces,id',
            'amount' => 'required|numeric|min:0.01',
            'period' => 'nullable|in:daily,weekly,monthly,yearly',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'note' => 'nullable|string',
            'alert_percentage' => 'nullable|integer|min:0|max:100',
            'notify_on_exceed' => 'boolean',
            'is_active' => 'boolean',
        ]);

        // Validate space and category ownership
        Space::where('id', $validated['space_id'])->where('user_id', auth()->id())->firstOrFail();
        if ($validated['category_id']) {
            Category::where('id', $validated['category_id'])->where('user_id', auth()->id())->firstOrFail();
        }

        $validated['period'] = 'monthly';
        $budget->update($validated);
        $budget->updateSpentAmount();

        return redirect()->back()->with('success', 'বাজেট সফলভাবে আপডেট হয়েছে!');
    }

    public function destroy(Budget $budget): RedirectResponse
    {
        if ($budget->user_id !== auth()->id()) {
            abort(403);
        }

        $budget->delete();

        return redirect()->back()->with('success', 'বাজেট সফলভাবে মুছে ফেলা হয়েছে!');
    }

    public function cloneLastMonth(Request $request): RedirectResponse
    {
        $user = auth()->user();
        
        // Target month is passed (e.g. '2026-07') or defaults to current month
        $targetMonthStr = $request->input('target_month', now()->format('Y-m'));
        
        try {
            $targetDate = \Carbon\Carbon::createFromFormat('Y-m', $targetMonthStr);
        } catch (\Exception $e) {
            $targetDate = now();
        }
        
        $targetMonthStart = $targetDate->copy()->startOfMonth()->toDateString();
        $targetMonthEnd = $targetDate->copy()->endOfMonth()->toDateString();
        
        $sourceDate = $targetDate->copy()->subMonth();
        $sourceMonthStart = $sourceDate->copy()->startOfMonth()->toDateString();
        $sourceMonthEnd = $sourceDate->copy()->endOfMonth()->toDateString();
        
        // Find last month's budgets
        $oldBudgets = Budget::where('user_id', $user->id)
            ->whereBetween('start_date', [$sourceMonthStart, $sourceMonthEnd])
            ->get();
            
        if ($oldBudgets->isEmpty()) {
            return redirect()->back()->with('error', 'গত মাসে কোনো বাজেট পাওয়া যায়নি। দয়া করে ম্যানুয়ালি বাজেট তৈরি করুন।');
        }
        
        $clonedCount = 0;
        foreach ($oldBudgets as $oldBudget) {
            // Avoid duplicate copy by checking if a budget with same space/category/name exists in target month
            $exists = Budget::where('user_id', $user->id)
                ->where('space_id', $oldBudget->space_id)
                ->where('category_id', $oldBudget->category_id)
                ->where('name', $oldBudget->name)
                ->where('start_date', $targetMonthStart)
                ->exists();
                
            if (!$exists) {
                $newBudget = Budget::create([
                    'user_id' => $user->id,
                    'space_id' => $oldBudget->space_id,
                    'category_id' => $oldBudget->category_id,
                    'name' => $oldBudget->name,
                    'amount' => $oldBudget->amount,
                    'period' => 'monthly',
                    'start_date' => $targetMonthStart,
                    'end_date' => $targetMonthEnd,
                    'note' => $oldBudget->note,
                    'alert_percentage' => $oldBudget->alert_percentage,
                    'notify_on_exceed' => $oldBudget->notify_on_exceed,
                    'is_active' => true,
                    'spent_amount' => 0
                ]);
                $newBudget->updateSpentAmount();
                $clonedCount++;
            }
        }
        
        if ($clonedCount === 0) {
            return redirect()->back()->with('warning', 'গত মাসের সমস্ত বাজেট ইতিমধ্যে এই মাসে ক্লোন করা আছে।');
        }
        
        return redirect()->back()->with('success', "গত মাসের {$clonedCount}টি বাজেট সফলভাবে ক্লোন করা হয়েছে।");
    }
}
