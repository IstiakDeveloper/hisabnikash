<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Account;
use App\Models\Category;
use App\Models\Space;
use App\Models\Budget;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;

class TransactionController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $user = auth()->user();
        $query = Transaction::with(['account', 'category', 'space'])
            ->where('user_id', $user->id);

        // Apply filters
        if ($request->space_id && $request->space_id !== 'combined') {
            $query->where('space_id', $request->space_id);
        }

        if ($request->account_id) {
            $query->where('account_id', $request->account_id);
        }

        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->type) {
            $query->where('type', $request->type);
        }

        if ($request->is_fixed !== null && $request->is_fixed !== '') {
            $query->where('is_fixed', $request->is_fixed);
        }

        if ($request->date_from) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        $transactions = $query->orderBy('transaction_date', 'desc')
            ->paginate(30)
            ->withQueryString();

        $accounts = Account::where('user_id', $user->id)
            ->where('is_active', true)
            ->get(['id', 'name', 'type', 'balance']);

        $categories = Category::where('user_id', $user->id)
            ->where('is_active', true)
            ->orderBy('type')
            ->get(['id', 'name', 'icon', 'type', 'is_fixed', 'color', 'space_id']);

        $spaces = Space::where('user_id', $user->id)->get(['id', 'name', 'type']);

        return Inertia::render('Transactions/Index', [
            'transactions' => $transactions,
            'accounts' => $accounts,
            'categories' => $categories,
            'spaces' => $spaces,
            'filters' => $request->only(['space_id', 'account_id', 'category_id', 'type', 'is_fixed', 'date_from', 'date_to']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'category_id' => 'required|exists:categories,id',
            'space_id' => 'required|exists:spaces,id',
            'type' => 'required|in:income,expense',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:255',
            'transaction_date' => 'required|date',
            'note' => 'nullable|string|max:1000',
            'is_fixed' => 'required|boolean',
            'payment_method' => 'required|in:cash,bank,mobile_banking,credit_card',
            'is_recurring' => 'required|boolean',
            'recurrence_period' => 'nullable|required_if:is_recurring,true|string',
            'receipt' => 'nullable|image|max:2048', // 2MB Max
        ]);

        // Check ownerships
        $account = Account::where('id', $validated['account_id'])->where('user_id', auth()->id())->firstOrFail();
        Category::where('id', $validated['category_id'])->where('user_id', auth()->id())->firstOrFail();
        Space::where('id', $validated['space_id'])->where('user_id', auth()->id())->firstOrFail();

        // Enforce that at least one budget must be active for the month of the transaction_date
        $date = \Carbon\Carbon::parse($validated['transaction_date']);
        $hasBudget = Budget::where('user_id', auth()->id())
            ->where('start_date', '<=', $date->toDateString())
            ->where('end_date', '>=', $date->toDateString())
            ->exists();

        if (!$hasBudget) {
            return redirect()->back()->withErrors([
                'transaction_date' => 'এই মাসের জন্য কোনো বাজেট সক্রিয় নেই। লেনদেন এন্ট্রি করার আগে দয়া করে বাজেট তৈরি বা ক্লোন (Clone) করুন।'
            ])->withInput();
        }

        $receiptPath = null;
        if ($request->hasFile('receipt')) {
            $receiptPath = $request->file('receipt')->store('receipts', 'public');
        }

        Transaction::create([
            'user_id' => auth()->id(),
            'account_id' => $validated['account_id'],
            'category_id' => $validated['category_id'],
            'space_id' => $validated['space_id'],
            'type' => $validated['type'],
            'amount' => $validated['amount'],
            'description' => $validated['description'] ?? '',
            'transaction_date' => $validated['transaction_date'],
            'note' => $validated['note'],
            'is_fixed' => $validated['is_fixed'],
            'payment_method' => $validated['payment_method'],
            'is_recurring' => $validated['is_recurring'],
            'recurrence_period' => $validated['recurrence_period'],
            'receipt_image' => $receiptPath,
        ]);

        return redirect()->back()
            ->with('message', 'লেনদেন সফলভাবে যুক্ত হয়েছে।');
    }

    public function create(Request $request): \Inertia\Response
    {
        $user = auth()->user();
        
        $accounts = Account::where('user_id', $user->id)
            ->where('is_active', true)
            ->get(['id', 'name', 'type', 'balance']);

        $categories = Category::where('user_id', $user->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'icon', 'type', 'is_fixed', 'color', 'space_id']);

        $spaces = Space::where('user_id', $user->id)->get(['id', 'name', 'type']);

        $budgets = Budget::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->get(['id', 'name', 'category_id', 'space_id', 'amount', 'spent_amount']);

        return Inertia::render('Transactions/Create', [
            'accounts' => $accounts,
            'categories' => $categories,
            'spaces' => $spaces,
            'budgets' => $budgets,
            'selected_type' => $request->query('type', 'expense'),
            'selected_account_id' => $request->query('account_id'),
            'selected_category_id' => $request->query('category_id'),
        ]);
    }

    public function edit(Transaction $transaction): \Inertia\Response
    {
        if ($transaction->user_id !== auth()->id()) {
            abort(403);
        }

        $user = auth()->user();
        
        $accounts = Account::where('user_id', $user->id)
            ->where('is_active', true)
            ->get(['id', 'name', 'type', 'balance']);

        $categories = Category::where('user_id', $user->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'icon', 'type', 'is_fixed', 'color', 'space_id']);

        $spaces = Space::where('user_id', $user->id)->get(['id', 'name', 'type']);

        $budgets = Budget::where('user_id', $user->id)
            ->where('is_active', true)
            ->where('start_date', '<=', $transaction->transaction_date)
            ->where('end_date', '>=', $transaction->transaction_date)
            ->get(['id', 'name', 'category_id', 'space_id', 'amount', 'spent_amount']);

        return Inertia::render('Transactions/Edit', [
            'transaction' => $transaction,
            'accounts' => $accounts,
            'categories' => $categories,
            'spaces' => $spaces,
            'budgets' => $budgets,
        ]);
    }

    public function update(Request $request, Transaction $transaction): RedirectResponse
    {
        if ($transaction->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'category_id' => 'required|exists:categories,id',
            'space_id' => 'required|exists:spaces,id',
            'type' => 'required|in:income,expense',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:255',
            'transaction_date' => 'required|date',
            'note' => 'nullable|string|max:1000',
            'is_fixed' => 'required|boolean',
            'payment_method' => 'required|in:cash,bank,mobile_banking,credit_card',
            'is_recurring' => 'required|boolean',
            'recurrence_period' => 'nullable|required_if:is_recurring,true|string',
            'receipt' => 'nullable|image|max:2048',
        ]);

        // Check ownerships
        $account = Account::where('id', $validated['account_id'])->where('user_id', auth()->id())->firstOrFail();
        Category::where('id', $validated['category_id'])->where('user_id', auth()->id())->firstOrFail();
        Space::where('id', $validated['space_id'])->where('user_id', auth()->id())->firstOrFail();

        // Enforce that at least one budget must be active for the month of the transaction_date
        $date = \Carbon\Carbon::parse($validated['transaction_date']);
        $hasBudget = Budget::where('user_id', auth()->id())
            ->where('start_date', '<=', $date->toDateString())
            ->where('end_date', '>=', $date->toDateString())
            ->exists();

        if (!$hasBudget) {
            return redirect()->back()->withErrors([
                'transaction_date' => 'এই মাসের জন্য কোনো বাজেট সক্রিয় নেই। লেনদেন এন্ট্রি করার আগে দয়া করে বাজেট তৈরি বা ক্লোন (Clone) করুন।'
            ])->withInput();
        }

        $receiptPath = $transaction->receipt_image;
        if ($request->hasFile('receipt')) {
            if ($transaction->receipt_image) {
                Storage::disk('public')->delete($transaction->receipt_image);
            }
            $receiptPath = $request->file('receipt')->store('receipts', 'public');
        }

        $transaction->update([
            'account_id' => $validated['account_id'],
            'category_id' => $validated['category_id'],
            'space_id' => $validated['space_id'],
            'type' => $validated['type'],
            'amount' => $validated['amount'],
            'description' => $validated['description'] ?? '',
            'transaction_date' => $validated['transaction_date'],
            'note' => $validated['note'],
            'is_fixed' => $validated['is_fixed'],
            'payment_method' => $validated['payment_method'],
            'is_recurring' => $validated['is_recurring'],
            'recurrence_period' => $validated['recurrence_period'],
            'receipt_image' => $receiptPath,
        ]);

        return redirect()->back()
            ->with('message', 'লেনদেন সফলভাবে আপডেট হয়েছে।');
    }

    public function destroy(Transaction $transaction): RedirectResponse
    {
        if ($transaction->user_id !== auth()->id()) {
            abort(403);
        }

        // Reverse the balance change before deleting
        if ($transaction->type === 'income') {
            $transaction->account->decrement('balance', $transaction->amount);
        } else {
            $transaction->account->increment('balance', $transaction->amount);
        }

        if ($transaction->receipt_image) {
            Storage::disk('public')->delete($transaction->receipt_image);
        }

        $transaction->delete();

        return redirect()->back()
            ->with('message', 'লেনদেন সফলভাবে মুছে ফেলা হয়েছে।');
    }
}
