<?php

namespace App\Http\Controllers;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class TransferController extends Controller
{
    use AuthorizesRequests;

    // Show cash out form
    public function showCashOut(): Response
    {
        $accounts = Account::where('user_id', auth()->id())
            ->where('is_active', true)
            ->where('type', '!=', 'cash')
            ->where('balance', '>', 0)
            ->get(['id', 'name', 'type', 'balance']);

        $cashAccount = Account::where('user_id', auth()->id())
            ->where('type', 'cash')
            ->first(['id', 'name', 'balance']);

        return Inertia::render('Transfers/CashOut', [
            'accounts' => $accounts,
            'cashAccount' => $cashAccount,
        ]);
    }

    // Process cash out
    public function cashOut(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'from_account_id' => 'required|exists:accounts,id',
            'amount' => 'required|numeric|min:0.01',
            'note' => 'nullable|string|max:1000',
        ]);

        $fromAccount = Account::where('id', $validated['from_account_id'])
            ->where('user_id', auth()->id())
            ->where('type', '!=', 'cash')
            ->firstOrFail();

        $cashAccount = Account::where('user_id', auth()->id())
            ->where('type', 'cash')
            ->firstOrFail();

        // Check if source account has enough balance
        if ($fromAccount->balance < $validated['amount']) {
            return back()->withErrors(['amount' => 'Insufficient balance in source account.']);
        }

        DB::transaction(function () use ($fromAccount, $cashAccount, $validated) {
            // Deduct from source account
            $fromAccount->decrement('balance', $validated['amount']);

            // Add to cash account
            $cashAccount->increment('balance', $validated['amount']);

            // Optional: Log this transfer in transactions table as internal transfer
            // You can create a special transaction type for this if needed
        });

        return redirect()->route('dashboard')
            ->with('message', 'Cash out completed successfully!');
    }

    // Show balance transfer form
    public function showBalanceTransfer(): Response
    {
        $accounts = Account::where('user_id', auth()->id())
            ->where('is_active', true)
            ->get(['id', 'name', 'type', 'balance']);

        return Inertia::render('Transfers/BalanceTransfer', [
            'accounts' => $accounts,
        ]);
    }

    // Process balance transfer
    public function balanceTransfer(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'from_account_id' => 'required|exists:accounts,id',
            'to_account_id' => 'required|exists:accounts,id|different:from_account_id',
            'amount' => 'required|numeric|min:0.01',
            'note' => 'nullable|string|max:1000',
        ]);

        $fromAccount = Account::where('id', $validated['from_account_id'])
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $toAccount = Account::where('id', $validated['to_account_id'])
            ->where('user_id', auth()->id())
            ->firstOrFail();

        // Check if source account has enough balance
        if ($fromAccount->balance < $validated['amount']) {
            return back()->withErrors(['amount' => 'Insufficient balance in source account.']);
        }

        DB::transaction(function () use ($fromAccount, $toAccount, $validated) {
            // Deduct from source account
            $fromAccount->decrement('balance', $validated['amount']);

            // Add to destination account
            $toAccount->increment('balance', $validated['amount']);

            // Optional: Log this transfer
        });

        return redirect()->route('dashboard')
            ->with('message', 'Balance transfer completed successfully!');
    }
}
