<?php

namespace App\Http\Controllers;

use App\Models\RecurringBill;
use App\Models\Category;
use App\Models\Space;
use App\Models\Account;
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

        $query = RecurringBill::with(['category', 'space'])
            ->where('user_id', $user->id);

        if ($spaceId && $spaceId !== 'combined') {
            $query->where('space_id', $spaceId);
        }

        $bills = $query->latest()->get()->map(function ($bill) use ($user) {
            // Check if paid this month
            $alreadyPaid = Transaction::where('user_id', $user->id)
                ->where('type', 'expense')
                ->where('category_id', $bill->category_id)
                ->whereMonth('transaction_date', now()->month)
                ->exists();

            return [
                'id' => $bill->id,
                'name' => $bill->name,
                'amount' => (float)$bill->amount,
                'due_day' => $bill->due_day,
                'frequency' => $bill->frequency,
                'status' => $bill->status,
                'is_paid_this_month' => $alreadyPaid,
                'category' => $bill->category ? ['id' => $bill->category->id, 'name' => $bill->category->name, 'icon' => $bill->category->icon] : null,
                'space' => $bill->space ? ['id' => $bill->space->id, 'name' => $bill->space->name] : null
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

        return Inertia::render('Bills/Index', [
            'bills' => $bills,
            'categories' => $categories,
            'accounts' => $accounts,
            'spaces' => $spaces,
            'selectedSpaceId' => $spaceId
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'due_day' => 'required|integer|min:1|max:31',
            'frequency' => 'required|in:monthly,custom',
            'category_id' => 'required|exists:categories,id',
            'space_id' => 'required|exists:spaces,id',
        ]);

        RecurringBill::create([
            'user_id' => auth()->id(),
            'space_id' => $validated['space_id'],
            'category_id' => $validated['category_id'],
            'name' => $validated['name'],
            'amount' => $validated['amount'],
            'due_day' => $validated['due_day'],
            'frequency' => $validated['frequency'],
            'status' => 'active'
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
            'category_id' => 'required|exists:categories,id',
            'space_id' => 'required|exists:spaces,id',
            'status' => 'required|in:active,paused',
        ]);

        $recurringBill->update($validated);

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
            'note' => 'nullable|string|max:1000'
        ]);

        $account = Account::find($validated['account_id']);

        DB::transaction(function () use ($recurringBill, $validated, $account) {
            Transaction::create([
                'user_id' => auth()->id(),
                'account_id' => $account->id,
                'category_id' => $recurringBill->category_id,
                'space_id' => $recurringBill->space_id,
                'type' => 'expense',
                'amount' => $validated['amount'],
                'description' => "Bill paid: {$recurringBill->name}",
                'transaction_date' => $validated['date'],
                'note' => $validated['note'] ?: "Paid via recurring reminder",
                'is_fixed' => true, // Recurring bills are typically Fixed expenses
                'payment_method' => $account->type === 'cash' ? 'cash' : ($account->type === 'mobile_banking' ? 'mobile_banking' : 'bank'),
            ]);
        });

        return redirect()->back()->with('success', 'বিল পরিশোধ রেকর্ড করা হয়েছে।');
    }
}
