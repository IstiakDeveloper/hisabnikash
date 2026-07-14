<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Budget;
use App\Models\Category;
use App\Models\Space;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class AccountController extends Controller
{
    use AuthorizesRequests;

    public function index(): Response
    {
        $user = auth()->user();

        $accounts = Account::where('user_id', $user->id)
            ->with(['transactions' => function ($query) {
                $query->latest()->take(5);
            }])
            ->orderBy('name')
            ->get();

        $budgets = Budget::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('start_date', '<=', now()->toDateString())
            ->where('end_date', '>=', now()->toDateString())
            ->orderBy('name')
            ->get(['id', 'name', 'amount', 'category_id', 'space_id']);

        $categories = Category::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('type', 'expense')
            ->orderBy('name')
            ->get(['id', 'name', 'icon', 'space_id']);

        return Inertia::render('Accounts/Index', [
            'accounts' => $accounts,
            'budgets' => $budgets,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:bank,mobile_banking,cash,card',
            'balance' => 'required|numeric',
            'account_number' => 'nullable|string|max:255',
            'bank_branch' => 'nullable|string|max:255',
        ]);

        Account::create([
            ...$validated,
            'user_id' => auth()->id(),
            'is_active' => true
        ]);

        return redirect()->back()->with('success', "অ্যাকাউন্ট সফলভাবে যুক্ত হয়েছে।");
    }

    public function update(Request $request, Account $account): RedirectResponse
    {
        if ($account->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:bank,mobile_banking,cash,card',
            'balance' => 'required|numeric',
            'account_number' => 'nullable|string|max:255',
            'bank_branch' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $account->update($validated);

        return redirect()->back()->with('success', "অ্যাকাউন্ট সফলভাবে আপডেট হয়েছে।");
    }

    public function destroy(Account $account): RedirectResponse
    {
        if ($account->user_id !== auth()->id()) {
            abort(403);
        }

        if ($account->transactions()->count() > 0) {
            // Safe deactivation
            $account->update(['is_active' => false]);
            return redirect()->back()->with('warning', "অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে (যেহেতু লেনদেন বিদ্যমান)।");
        }

        $account->delete();
        return redirect()->back()->with('success', "অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে।");
    }

    /**
     * Transfer balance from one account to another, with optional fee logged as expense.
     */
    public function transfer(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'from_account_id' => 'required|exists:accounts,id',
            'to_account_id' => 'required|exists:accounts,id|different:from_account_id',
            'amount' => 'required|numeric|min:0.01',
            'fee' => 'nullable|numeric|min:0',
            'budget_id' => 'nullable|exists:budgets,id',
            'category_id' => 'nullable|exists:categories,id',
            'transaction_date' => 'required|date',
            'note' => 'nullable|string|max:1000',
        ]);

        $amount = (float) $validated['amount'];
        $fee = (float) ($validated['fee'] ?? 0);

        if ($fee > 0 && empty($validated['budget_id'])) {
            return redirect()->back()->withErrors([
                'budget_id' => 'ট্রান্সফার চার্জের জন্য একটি বাজেট নির্বাচন করুন।',
            ]);
        }

        $fromAccount = Account::where('id', $validated['from_account_id'])
            ->where('user_id', auth()->id())
            ->where('is_active', true)
            ->firstOrFail();

        $toAccount = Account::where('id', $validated['to_account_id'])
            ->where('user_id', auth()->id())
            ->where('is_active', true)
            ->firstOrFail();

        $totalDebit = $amount + $fee;
        if ($fromAccount->balance < $totalDebit) {
            return redirect()->back()->withErrors([
                'amount' => 'উৎস অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই।',
            ]);
        }

        DB::transaction(function () use ($fromAccount, $toAccount, $validated, $amount, $fee) {
            $fromAccount->decrement('balance', $amount);
            $toAccount->increment('balance', $amount);

            if ($fee > 0) {
                $budget = Budget::where('id', $validated['budget_id'])
                    ->where('user_id', auth()->id())
                    ->where('start_date', '<=', $validated['transaction_date'])
                    ->where('end_date', '>=', $validated['transaction_date'])
                    ->firstOrFail();

                $categoryId = $budget->category_id ?? $validated['category_id'];
                $spaceId = $budget->space_id;

                if (! $categoryId || ! $spaceId) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'category_id' => 'চার্জ রেকর্ড করতে ক্যাটাগরি ও স্পেস প্রয়োজন। বাজেট বা ক্যাটাগরি নির্বাচন করুন।',
                    ]);
                }

                Category::where('id', $categoryId)->where('user_id', auth()->id())->firstOrFail();
                Space::where('id', $spaceId)->where('user_id', auth()->id())->firstOrFail();

                Transaction::create([
                    'user_id' => auth()->id(),
                    'account_id' => $fromAccount->id,
                    'category_id' => $categoryId,
                    'space_id' => $spaceId,
                    'budget_id' => $budget->id,
                    'type' => 'expense',
                    'amount' => $fee,
                    'description' => "Transfer fee: {$fromAccount->name} → {$toAccount->name}",
                    'transaction_date' => $validated['transaction_date'],
                    'note' => $validated['note'] ?: 'Account transfer charge',
                    'is_fixed' => false,
                    'payment_method' => $this->paymentMethodForAccount($fromAccount),
                    'is_recurring' => false,
                ]);
            }
        });

        $message = $fee > 0
            ? 'ট্রান্সফার সম্পন্ন হয়েছে এবং চার্জ খরচ হিসেবে রেকর্ড হয়েছে।'
            : 'ট্রান্সফার সম্পন্ন হয়েছে।';

        return redirect()->back()->with('success', $message);
    }

    private function paymentMethodForAccount(Account $account): string
    {
        return match ($account->type) {
            'cash' => 'cash',
            'mobile_banking' => 'mobile_banking',
            'card' => 'credit_card',
            default => 'bank',
        };
    }
}
