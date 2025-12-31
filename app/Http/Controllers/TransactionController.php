<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Account;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class TransactionController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $query = Transaction::with(['account', 'category'])
            ->where('user_id', auth()->id());

        // Apply filters
        if ($request->account_id) {
            $query->where('account_id', $request->account_id);
        }

        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->type) {
            $query->where('type', $request->type);
        }

        if ($request->date_from) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        $transactions = $query->orderBy('transaction_date', 'desc')
            ->paginate(20)
            ->withQueryString();

        $accounts = Account::where('user_id', auth()->id())
            ->where('is_active', true)
            ->get(['id', 'name']);

        $categories = Category::where('user_id', auth()->id())
            ->where('is_active', true)
            ->orderBy('type')
            ->get(['id', 'name', 'icon', 'type']);

        return Inertia::render('Transactions/Index', [
            'transactions' => $transactions,
            'accounts' => $accounts,
            'categories' => $categories,
            'filters' => $request->only(['account_id', 'category_id', 'type', 'date_from', 'date_to']),
        ]);
    }

    public function create(): Response
    {
        $accounts = Account::where('user_id', auth()->id())
            ->where('is_active', true)
            ->get(['id', 'name', 'type']);

        $categories = Category::where('user_id', auth()->id())
            ->where('is_active', true)
            ->orderBy('type')
            ->get(['id', 'name', 'icon', 'color', 'type']);

        return Inertia::render('Transactions/Create', [
            'accounts' => $accounts,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'category_id' => 'required|exists:categories,id',
            'type' => 'required|in:income,expense',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:255',
            'transaction_date' => 'required|date',
            'note' => 'nullable|string|max:1000',
        ]);

        // Check if account belongs to user
        $account = Account::where('id', $validated['account_id'])
            ->where('user_id', auth()->id())
            ->firstOrFail();

        // Check if category belongs to user
        $category = Category::where('id', $validated['category_id'])
            ->where('user_id', auth()->id())
            ->firstOrFail();

        Transaction::create([
            ...$validated,
            'user_id' => auth()->id(),
        ]);

        return redirect()->route('transactions.index')
            ->with('message', 'Transaction added successfully!');
    }

    public function show(Transaction $transaction): Response
    {
        // Check if transaction belongs to current user
        if ($transaction->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this transaction.');
        }

        $transaction->load(['account', 'category']);

        return Inertia::render('Transactions/Show', [
            'transaction' => $transaction,
        ]);
    }

    public function edit(Transaction $transaction): Response
    {
        // Check if transaction belongs to current user
        if ($transaction->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this transaction.');
        }

        $accounts = Account::where('user_id', auth()->id())
            ->where('is_active', true)
            ->get(['id', 'name', 'type']);

        $categories = Category::where('user_id', auth()->id())
            ->where('is_active', true)
            ->orderBy('type')
            ->get(['id', 'name', 'icon', 'color', 'type']);

        return Inertia::render('Transactions/Edit', [
            'transaction' => [
                'id' => $transaction->id,
                'type' => $transaction->type,
                'amount' => $transaction->amount,
                'description' => $transaction->description,
                'transaction_date' => $transaction->transaction_date instanceof \DateTime
                    ? $transaction->transaction_date->format('Y-m-d')
                    : (is_string($transaction->transaction_date)
                        ? date('Y-m-d', strtotime($transaction->transaction_date))
                        : $transaction->transaction_date),
                'account_id' => $transaction->account_id,
                'category_id' => $transaction->category_id,
                'note' => $transaction->note,
            ],
            'accounts' => $accounts,
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, Transaction $transaction): RedirectResponse
    {
        // Check if transaction belongs to current user
        if ($transaction->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this transaction.');
        }

        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'category_id' => 'required|exists:categories,id',
            'type' => 'required|in:income,expense',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:255',
            'transaction_date' => 'required|date',
            'note' => 'nullable|string|max:1000',
        ]);

        // Check if account belongs to user
        $account = Account::where('id', $validated['account_id'])
            ->where('user_id', auth()->id())
            ->firstOrFail();

        // Check if category belongs to user
        $category = Category::where('id', $validated['category_id'])
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $transaction->update($validated);

        return redirect()->route('transactions.index')
            ->with('message', 'Transaction updated successfully!');
    }

    public function destroy(Transaction $transaction): RedirectResponse
    {
        // Check if transaction belongs to current user
        if ($transaction->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this transaction.');
        }

        // Reverse the balance change before deleting
        if ($transaction->type === 'income') {
            $transaction->account->decrement('balance', $transaction->amount);
        } else {
            $transaction->account->increment('balance', $transaction->amount);
        }

        $transaction->delete();

        return redirect()->route('transactions.index')
            ->with('message', 'Transaction deleted successfully!');
    }
}
