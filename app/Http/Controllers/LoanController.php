<?php

namespace App\Http\Controllers;

use App\Models\Loan;
use App\Models\LoanInstallment;
use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\Space;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class LoanController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $user = auth()->user();
        $spaceId = $request->query('space_id');

        $query = Loan::with(['payments.account', 'installments', 'space'])
            ->where('user_id', $user->id);

        if ($spaceId && $spaceId !== 'combined') {
            $query->where('space_id', $spaceId);
        }

        $loans = $query->orderBy('loan_date', 'desc')->get();

        $accounts = Account::where('user_id', $user->id)
            ->where('is_active', true)
            ->get(['id', 'name', 'type', 'balance']);

        $spaces = Space::where('user_id', $user->id)->get(['id', 'name', 'type']);

        // Avalanche Strategy (Taken loans, sorted by interest rate descending, then principal descending)
        $avalancheLoans = Loan::where('user_id', $user->id)
            ->where('type', 'taken')
            ->where('is_completed', false)
            ->orderBy('interest_rate', 'desc')
            ->orderBy('remaining_amount', 'desc')
            ->get();

        // Snowball Strategy (Taken loans, sorted by remaining amount ascending, then interest rate descending)
        $snowballLoans = Loan::where('user_id', $user->id)
            ->where('type', 'taken')
            ->where('is_completed', false)
            ->orderBy('remaining_amount', 'asc')
            ->orderBy('interest_rate', 'desc')
            ->get();

        // Combined debt metrics
        $totalDebt = Loan::where('user_id', $user->id)->where('type', 'taken')->where('is_completed', false)->sum('remaining_amount');
        $totalMonthlyEMI = Loan::where('user_id', $user->id)->where('type', 'taken')->where('is_completed', false)->sum('monthly_installment');

        return Inertia::render('Loans/Index', [
            'loans' => $loans,
            'accounts' => $accounts,
            'spaces' => $spaces,
            'avalancheStrategy' => $avalancheLoans,
            'snowballStrategy' => $snowballLoans,
            'metrics' => [
                'totalDebt' => (float)$totalDebt,
                'totalMonthlyEMI' => (float)$totalMonthlyEMI,
            ],
            'selectedSpaceId' => $spaceId
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:taken,given',
            'loan_type' => 'required|in:personal_loan,credit_card_emi,microcredit,informal_family_loan',
            'person_name' => 'required|string|max:255',
            'person_phone' => 'nullable|string|max:20',
            'amount' => 'required|numeric|min:0.01',
            'loan_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:loan_date',
            'note' => 'nullable|string|max:1000',
            'interest_rate' => 'nullable|numeric|min:0|max:100',
            'monthly_installment' => 'required|numeric|min:0',
            'tenure_months' => 'required|integer|min:1',
            'space_id' => 'required|exists:spaces,id',
        ]);

        $user = auth()->user();

        DB::transaction(function () use ($validated, $user) {
            $loan = Loan::create([
                'user_id' => $user->id,
                'space_id' => $validated['space_id'],
                'type' => $validated['type'],
                'loan_type' => $validated['loan_type'],
                'person_name' => $validated['person_name'],
                'person_phone' => $validated['person_phone'],
                'amount' => $validated['amount'],
                'remaining_amount' => $validated['amount'],
                'loan_date' => $validated['loan_date'],
                'due_date' => $validated['due_date'],
                'note' => $validated['note'],
                'interest_rate' => $validated['interest_rate'] ?? 0,
                'monthly_installment' => $validated['monthly_installment'],
                'tenure_months' => $validated['tenure_months'],
                'is_completed' => false,
            ]);

            // Generate amortization schedule installments
            $startDate = Carbon::parse($validated['loan_date']);
            $instAmount = $validated['monthly_installment'] > 0 
                ? $validated['monthly_installment'] 
                : ($validated['amount'] / $validated['tenure_months']);

            for ($i = 1; $i <= $validated['tenure_months']; $i++) {
                LoanInstallment::create([
                    'loan_id' => $loan->id,
                    'due_date' => $startDate->copy()->addMonths($i)->day(10), // Default to 10th of the month
                    'amount' => $instAmount,
                    'status' => 'unpaid',
                ]);
            }
        });

        return redirect()->back()->with('message', 'ঋণ সফলভাবে যুক্ত হয়েছে এবং কিস্তির তালিকা তৈরি করা হয়েছে।');
    }

    public function update(Request $request, Loan $loan): RedirectResponse
    {
        if ($loan->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'person_name' => 'required|string|max:255',
            'person_phone' => 'nullable|string|max:20',
            'due_date' => 'nullable|date',
            'note' => 'nullable|string|max:1000',
            'interest_rate' => 'nullable|numeric|min:0|max:100',
            'monthly_installment' => 'required|numeric|min:0',
        ]);

        $loan->update($validated);

        return redirect()->back()->with('message', 'ঋণ সফলভাবে আপডেট হয়েছে।');
    }

    public function destroy(Loan $loan): RedirectResponse
    {
        if ($loan->user_id !== auth()->id()) {
            abort(403);
        }

        $loan->delete();

        return redirect()->back()->with('message', 'ঋণ সফলভাবে মুছে ফেলা হয়েছে।');
    }

    /**
     * Record a payment for an installment or direct reduction.
     */
    public function makePayment(Request $request, Loan $loan): RedirectResponse
    {
        if ($loan->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'amount' => 'required|numeric|min:0.01|max:' . $loan->remaining_amount,
            'installment_id' => 'nullable|exists:loan_installments,id',
            'note' => 'nullable|string|max:1000',
        ]);

        // Verify account ownership
        $account = Account::where('id', $validated['account_id'])->where('user_id', auth()->id())->firstOrFail();

        DB::transaction(function () use ($loan, $validated, $account) {
            // 1. Record the loan payment entry
            $payment = $loan->makePayment(
                $validated['amount'],
                $validated['account_id'],
                $validated['note'] ?? null
            );

            // 2. Mark corresponding installment(s) as paid
            if (isset($validated['installment_id'])) {
                $inst = LoanInstallment::find($validated['installment_id']);
                if ($inst && $inst->loan_id === $loan->id) {
                    $inst->update([
                        'status' => 'paid',
                        'payment_date' => now(),
                        'note' => $validated['note']
                    ]);
                }
            } else {
                // Auto pay oldest unpaid installment
                $oldestUnpaid = $loan->installments()->where('status', 'unpaid')->orderBy('due_date', 'asc')->first();
                if ($oldestUnpaid) {
                    $oldestUnpaid->update([
                        'status' => 'paid',
                        'payment_date' => now(),
                        'note' => 'Auto-assigned from direct payment'
                    ]);
                }
            }

            // 3. Create a transaction record to update the account balance
            // If loan is taken, paying it back is an EXPENSE
            // If loan is given, receiving payment is an INCOME
            $txType = $loan->type === 'taken' ? 'expense' : 'income';
            
            // Get or create Category for loan payment
            $categoryName = $loan->type === 'taken' ? 'Loan Repayment' : 'Loan Collection';
            $category = Category::firstOrCreate([
                'user_id' => auth()->id(),
                'space_id' => $loan->space_id,
                'name' => $categoryName,
                'type' => $txType,
            ], [
                'icon' => $loan->type === 'taken' ? '📤' : '📥',
                'color' => $loan->type === 'taken' ? '#EF4444' : '#10B981',
                'is_fixed' => true,
                'is_default' => false,
                'is_active' => true
            ]);

            Transaction::create([
                'user_id' => auth()->id(),
                'account_id' => $account->id,
                'category_id' => $category->id,
                'space_id' => $loan->space_id,
                'type' => $txType,
                'amount' => $validated['amount'],
                'description' => "Loan payment to/from {$loan->person_name}",
                'transaction_date' => now(),
                'note' => $validated['note'] ?: "Payment for loan #{$loan->id}",
                'is_fixed' => true,
                'payment_method' => $account->type === 'cash' ? 'cash' : ($account->type === 'mobile_banking' ? 'mobile_banking' : 'bank'),
            ]);
        });

        return redirect()->back()->with('message', 'ঋণ পরিশোধের তথ্য সফলভাবে রেকর্ড করা হয়েছে।');
    }
}
