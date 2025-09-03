<?php

namespace App\Http\Controllers;

use App\Models\Loan;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class LoanController extends Controller
{
    use AuthorizesRequests;

    public function index(): Response
    {
        $loans = Loan::with(['payments.account'])
            ->where('user_id', auth()->id())
            ->orderBy('loan_date', 'desc')
            ->get();

        return Inertia::render('Loans/Index', [
            'loans' => $loans,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Loans/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:taken,given',
            'person_name' => 'required|string|max:255',
            'person_phone' => 'nullable|string|max:20',
            'amount' => 'required|numeric|min:0.01',
            'loan_date' => 'required|date',
            'due_date' => 'nullable|date|after:loan_date',
            'note' => 'nullable|string|max:1000',
            'interest_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        Loan::create([
            ...$validated,
            'user_id' => auth()->id(),
            'remaining_amount' => $validated['amount'],
        ]);

        return redirect()->route('loans.index')
            ->with('message', 'Loan record created successfully!');
    }

    public function show(Loan $loan): Response
    {
        // Check if loan belongs to current user
        if ($loan->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this loan.');
        }

        $loan->load(['payments.account']);

        $accounts = Account::where('user_id', auth()->id())
            ->where('is_active', true)
            ->get(['id', 'name', 'type']);

        return Inertia::render('Loans/Show', [
            'loan' => $loan,
            'accounts' => $accounts,
        ]);
    }

    public function edit(Loan $loan): Response
    {
        // Check if loan belongs to current user
        if ($loan->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this loan.');
        }

        return Inertia::render('Loans/Edit', [
            'loan' => $loan,
        ]);
    }

    public function update(Request $request, Loan $loan): RedirectResponse
    {
        // Check if loan belongs to current user
        if ($loan->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this loan.');
        }

        $validated = $request->validate([
            'person_name' => 'required|string|max:255',
            'person_phone' => 'nullable|string|max:20',
            'due_date' => 'nullable|date',
            'note' => 'nullable|string|max:1000',
            'interest_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        $loan->update($validated);

        return redirect()->route('loans.index')
            ->with('message', 'Loan updated successfully!');
    }

    public function destroy(Loan $loan): RedirectResponse
    {
        // Check if loan belongs to current user
        if ($loan->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this loan.');
        }

        $loan->delete();

        return redirect()->route('loans.index')
            ->with('message', 'Loan deleted successfully!');
    }

    // Make payment for a loan
    public function makePayment(Request $request, Loan $loan): RedirectResponse
    {
        // Check if loan belongs to current user
        if ($loan->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this loan.');
        }

        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'amount' => 'required|numeric|min:0.01|max:' . $loan->remaining_amount,
            'note' => 'nullable|string|max:1000',
        ]);

        // Verify account belongs to user
        $account = Account::where('id', $validated['account_id'])
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $loan->makePayment(
            $validated['amount'],
            $validated['account_id'],
            $validated['note'] ?? null
        );

        return redirect()->route('loans.show', $loan)
            ->with('message', 'Payment recorded successfully!');
    }
}
