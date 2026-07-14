<?php

namespace App\Http\Controllers;

use App\Models\RecurringBill;
use App\Models\Category;
use App\Models\Space;
use App\Models\Account;
use App\Models\Budget;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;

class RecurringBillController extends Controller
{
    public function index(Request $request): Response
    {
        $user = auth()->user();
        $spaceId = $request->query('space_id');

        $query = RecurringBill::with(['category', 'space', 'budget'])
            ->where('user_id', $user->id);

        if ($spaceId && $spaceId !== 'combined') {
            $query->where('space_id', $spaceId);
        }

        $bills = $query->latest()->get()->map(function ($bill) use ($user) {
            $alreadyPaid = Transaction::where('user_id', $user->id)
                ->where('recurring_bill_id', $bill->id)
                ->whereYear('transaction_date', now()->year)
                ->whereMonth('transaction_date', now()->month)
                ->exists();

            return [
                'id' => $bill->id,
                'name' => $bill->name,
                'amount' => (float) $bill->amount,
                'due_day' => $bill->due_day,
                'frequency' => $bill->frequency,
                'status' => $bill->status,
                'is_paid_this_month' => $alreadyPaid,
                'budget_id' => $bill->budget_id,
                'category' => $bill->category ? ['id' => $bill->category->id, 'name' => $bill->category->name, 'icon' => $bill->category->icon] : null,
                'space' => $bill->space ? ['id' => $bill->space->id, 'name' => $bill->space->name] : null,
                'budget' => $bill->budget ? [
                    'id' => $bill->budget->id,
                    'name' => $bill->budget->name,
                    'amount' => (float) $bill->budget->amount,
                    'spent_amount' => (float) $bill->budget->spent_amount,
                ] : null,
            ];
        });

        $categories = Category::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('type', 'expense')
            ->orderBy('name')
            ->get(['id', 'name', 'color', 'icon', 'space_id']);

        $accounts = Account::where('user_id', $user->id)
            ->where('is_active', true)
            ->get(['id', 'name', 'type', 'balance']);

        $spaces = Space::where('user_id', $user->id)->get(['id', 'name', 'type']);

        $budgets = Budget::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('start_date', '<=', now()->toDateString())
            ->where('end_date', '>=', now()->toDateString())
            ->orderBy('name')
            ->get(['id', 'name', 'amount', 'spent_amount', 'category_id', 'space_id']);

        return Inertia::render('Bills/Index', [
            'bills' => $bills,
            'categories' => $categories,
            'accounts' => $accounts,
            'spaces' => $spaces,
            'budgets' => $budgets,
            'selectedSpaceId' => $spaceId,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'due_day' => 'required|integer|min:1|max:31',
            'frequency' => 'required|in:monthly,custom',
            'budget_id' => 'required|exists:budgets,id',
            'category_id' => 'nullable|exists:categories,id',
            'space_id' => 'nullable|exists:spaces,id',
        ]);

        $budget = $this->resolveOwnedBudget((int) $validated['budget_id']);

        $categoryId = $budget->category_id ?? $validated['category_id'];
        $spaceId = $budget->space_id ?? $validated['space_id'];

        if (! $categoryId || ! $spaceId) {
            return redirect()->back()->withErrors([
                'budget_id' => 'নির্বাচিত বাজেটে ক্যাটাগরি ও স্পেস নির্ধারিত নেই। অন্য বাজেট বেছে নিন বা ক্যাটাগরি/স্পেস নির্বাচন করুন।',
            ])->withInput();
        }

        RecurringBill::create([
            'user_id' => auth()->id(),
            'budget_id' => $budget->id,
            'space_id' => $spaceId,
            'category_id' => $categoryId,
            'name' => $validated['name'],
            'amount' => $validated['amount'],
            'due_day' => $validated['due_day'],
            'frequency' => $validated['frequency'],
            'status' => 'active',
        ]);

        return redirect()->back()->with('success', 'পুনরাবৃত্ত বিল সফলভাবে তৈরি হয়েছে।');
    }

    public function update(Request $request, RecurringBill $recurringBill): RedirectResponse
    {
        if ($recurringBill->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'due_day' => 'required|integer|min:1|max:31',
            'frequency' => 'required|in:monthly,custom',
            'budget_id' => 'required|exists:budgets,id',
            'category_id' => 'nullable|exists:categories,id',
            'space_id' => 'nullable|exists:spaces,id',
            'status' => 'required|in:active,paused',
        ]);

        $budget = $this->resolveOwnedBudget((int) $validated['budget_id']);

        $categoryId = $budget->category_id ?? $validated['category_id'];
        $spaceId = $budget->space_id ?? $validated['space_id'];

        if (! $categoryId || ! $spaceId) {
            return redirect()->back()->withErrors([
                'budget_id' => 'নির্বাচিত বাজেটে ক্যাটাগরি ও স্পেস নির্ধারিত নেই। অন্য বাজেট বেছে নিন বা ক্যাটাগরি/স্পেস নির্বাচন করুন।',
            ])->withInput();
        }

        $recurringBill->update([
            'name' => $validated['name'],
            'amount' => $validated['amount'],
            'due_day' => $validated['due_day'],
            'frequency' => $validated['frequency'],
            'status' => $validated['status'],
            'budget_id' => $budget->id,
            'space_id' => $spaceId,
            'category_id' => $categoryId,
        ]);

        return redirect()->back()->with('success', 'পুনরাবৃত্ত বিল সফলভাবে আপডেট হয়েছে।');
    }

    public function destroy(RecurringBill $recurringBill): RedirectResponse
    {
        if ($recurringBill->user_id !== auth()->id()) {
            abort(403);
        }

        $recurringBill->delete();

        return redirect()->back()->with('success', 'পুনরাবৃত্ত বিল সফলভাবে মুছে ফেলা হয়েছে।');
    }

    /**
     * Mark a recurring bill as Paid by logging a transaction expense.
     */
    public function pay(Request $request, RecurringBill $recurringBill): RedirectResponse
    {
        if ($recurringBill->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'note' => 'nullable|string|max:1000',
        ]);

        if (! $recurringBill->budget_id) {
            return redirect()->back()->withErrors([
                'budget' => 'এই বিলটি কোনো বাজেটের সাথে যুক্ত নেই। দয়া করে বিল সম্পাদনা করে একটি বাজেট নির্বাচন করুন।',
            ]);
        }

        $budget = Budget::where('id', $recurringBill->budget_id)
            ->where('user_id', auth()->id())
            ->where('start_date', '<=', $validated['date'])
            ->where('end_date', '>=', $validated['date'])
            ->first();

        if (! $budget) {
            return redirect()->back()->withErrors([
                'date' => 'পরিশোধের তারিখে এই বিলের বাজেট সক্রিয় নেই। দয়া করে বাজেট তৈরি বা ক্লোন করুন।',
            ]);
        }

        $account = Account::where('id', $validated['account_id'])
            ->where('user_id', auth()->id())
            ->firstOrFail();

        DB::transaction(function () use ($recurringBill, $validated, $account, $budget) {
            Transaction::create([
                'user_id' => auth()->id(),
                'account_id' => $account->id,
                'category_id' => $recurringBill->category_id ?? $budget->category_id,
                'space_id' => $recurringBill->space_id ?? $budget->space_id,
                'budget_id' => $budget->id,
                'recurring_bill_id' => $recurringBill->id,
                'type' => 'expense',
                'amount' => $validated['amount'],
                'description' => "Bill paid: {$recurringBill->name}",
                'transaction_date' => $validated['date'],
                'note' => $validated['note'] ?: 'Paid via recurring reminder',
                'is_fixed' => true,
                'payment_method' => $account->type === 'cash' ? 'cash' : ($account->type === 'mobile_banking' ? 'mobile_banking' : 'bank'),
            ]);
        });

        return redirect()->back()->with('success', 'বিল পরিশোধ রেকর্ড করা হয়েছে এবং বাজেট থেকে কাটা হয়েছে।');
    }

    private function resolveOwnedBudget(int $budgetId): Budget
    {
        return Budget::where('id', $budgetId)
            ->where('user_id', auth()->id())
            ->where('is_active', true)
            ->firstOrFail();
    }
}
