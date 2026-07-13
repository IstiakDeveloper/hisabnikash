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
}
