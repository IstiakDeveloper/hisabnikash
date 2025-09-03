<?php

namespace App\Http\Controllers;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class AccountController extends Controller
{
    use AuthorizesRequests;

    public function index(): Response
    {
        $accounts = Account::where('user_id', auth()->id())
            ->with(['transactions' => function ($query) {
                $query->latest()->take(5);
            }])
            ->orderBy('name')
            ->get();

        return Inertia::render('Accounts/Index', [
            'accounts' => $accounts,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Accounts/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:bank,mobile_banking,cash,card',
            'balance' => 'required|numeric|min:0',
            'account_number' => 'nullable|string|max:255',
            'bank_branch' => 'nullable|string|max:255',
        ]);

        Account::create([
            ...$validated,
            'user_id' => auth()->id(),
        ]);

        return redirect()->route('accounts.index')
            ->with('success', "Account '{$validated['name']}' created successfully! 🎉");
    }

    public function show(Account $account): Response
    {
        if ($account->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this account.');
        }

        $account->load([
            'transactions' => function ($query) {
                $query->with('category')->latest()->take(20);
            }
        ]);

        return Inertia::render('Accounts/Show', [
            'account' => $account,
        ]);
    }

    public function edit(Account $account): Response
    {
        if ($account->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this account.');
        }

        return Inertia::render('Accounts/Edit', [
            'account' => $account,
        ]);
    }

    public function update(Request $request, Account $account): RedirectResponse
    {
        if ($account->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this account.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:bank,mobile_banking,cash,card',
            'balance' => 'required|numeric|min:0',
            'account_number' => 'nullable|string|max:255',
            'bank_branch' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $oldBalance = $account->balance;
        $account->update($validated);

        $message = "Account '{$account->name}' updated successfully! ✅";
        if ($oldBalance != $validated['balance']) {
            $difference = $validated['balance'] - $oldBalance;
            $message .= " Balance " . ($difference > 0 ? 'increased' : 'decreased') . " by ৳" . number_format(abs($difference), 2);
        }

        return redirect()->route('accounts.show', $account)
            ->with('success', $message);
    }

    public function destroy(Account $account): RedirectResponse
    {
        if ($account->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this account.');
        }

        $accountName = $account->name;
        $account->update(['is_active' => false]);

        return redirect()->route('accounts.index')
            ->with('warning', "Account '{$accountName}' has been deactivated. ⚠️");
    }
}
