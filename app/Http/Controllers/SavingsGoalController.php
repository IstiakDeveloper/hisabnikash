<?php

namespace App\Http\Controllers;

use App\Models\SavingsGoal;
use App\Models\SavingsContribution;
use App\Models\Space;
use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;

class SavingsGoalController extends Controller
{
    public function index(Request $request): Response
    {
        $user = auth()->user();
        $spaceId = $request->query('space_id');

        $query = SavingsGoal::with(['space', 'contributions'])
            ->where('user_id', $user->id);

        if ($spaceId && $spaceId !== 'combined') {
            $query->where('space_id', $spaceId);
        }

        $goals = $query->latest()->get()->map(function ($goal) {
            return [
                'id' => $goal->id,
                'name' => $goal->name,
                'target_amount' => (float)$goal->target_amount,
                'current_amount' => (float)$goal->current_amount,
                'target_date' => $goal->target_date->format('Y-m-d'),
                'progress_percentage' => $goal->progress_percentage,
                'suggested_monthly' => $goal->suggested_monthly_contribution,
                'space' => $goal->space ? ['id' => $goal->space->id, 'name' => $goal->space->name] : null,
                'contributions' => $goal->contributions()->latest('date')->get()
            ];
        });

        $accounts = Account::where('user_id', $user->id)
            ->where('is_active', true)
            ->get(['id', 'name', 'type', 'balance']);

        $spaces = Space::where('user_id', $user->id)->get(['id', 'name', 'type']);

        return Inertia::render('Savings/Index', [
            'goals' => $goals,
            'accounts' => $accounts,
            'spaces' => $spaces,
            'selectedSpaceId' => $spaceId
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'target_amount' => 'required|numeric|min:0.01',
            'target_date' => 'required|date|after:today',
            'space_id' => 'required|exists:spaces,id',
        ]);

        SavingsGoal::create([
            'user_id' => auth()->id(),
            'space_id' => $validated['space_id'],
            'name' => $validated['name'],
            'target_amount' => $validated['target_amount'],
            'target_date' => $validated['target_date'],
            'current_amount' => 0,
        ]);

        return redirect()->back()->with('success', 'সঞ্চয় লক্ষ্য সফলভাবে তৈরি হয়েছে।');
    }

    public function update(Request $request, SavingsGoal $savingsGoal): RedirectResponse
    {
        if ($savingsGoal->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'target_amount' => 'required|numeric|min:0.01',
            'target_date' => 'required|date',
            'space_id' => 'required|exists:spaces,id',
        ]);

        $savingsGoal->update([
            'name' => $validated['name'],
            'target_amount' => $validated['target_amount'],
            'target_date' => $validated['target_date'],
            'space_id' => $validated['space_id']
        ]);

        return redirect()->back()->with('success', 'সঞ্চয় লক্ষ্য সফলভাবে আপডেট হয়েছে।');
    }

    public function destroy(SavingsGoal $savingsGoal): RedirectResponse
    {
        if ($savingsGoal->user_id !== auth()->id()) {
            abort(403);
        }

        $savingsGoal->delete();

        return redirect()->back()->with('success', 'সঞ্চয় লক্ষ্য সফলভাবে মুছে ফেলা হয়েছে।');
    }

    /**
     * Add contribution or log a withdrawal.
     */
    public function contribute(Request $request, SavingsGoal $savingsGoal): RedirectResponse
    {
        if ($savingsGoal->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'type' => 'required|in:contribution,withdrawal',
            'date' => 'required|date',
            'account_id' => 'nullable|exists:accounts,id', // Optional: link to account transaction
            'note' => 'nullable|string|max:1000',
        ]);

        DB::transaction(function () use ($savingsGoal, $validated) {
            // Create contribution log (auto updates goal current_amount via boot method)
            SavingsContribution::create([
                'savings_goal_id' => $savingsGoal->id,
                'amount' => $validated['amount'],
                'type' => $validated['type'],
                'date' => $validated['date'],
                'note' => $validated['note']
            ]);

            // If account_id is provided, create corresponding transaction
            if ($validated['account_id']) {
                $account = Account::find($validated['account_id']);
                $txType = $validated['type'] === 'contribution' ? 'expense' : 'income'; // Savings contribution is money leaving account balance

                // Find or create Category for Savings
                $category = Category::firstOrCreate([
                    'user_id' => auth()->id(),
                    'space_id' => $savingsGoal->space_id,
                    'name' => 'Savings & Deposits',
                    'type' => $txType,
                ], [
                    'icon' => '🐷',
                    'color' => '#10B981',
                    'is_fixed' => false,
                    'is_default' => false,
                    'is_active' => true,
                ]);

                Transaction::create([
                    'user_id' => auth()->id(),
                    'account_id' => $account->id,
                    'category_id' => $category->id,
                    'space_id' => $savingsGoal->space_id,
                    'type' => $txType,
                    'amount' => $validated['amount'],
                    'description' => $validated['type'] === 'contribution' 
                        ? "Deposit to goal: {$savingsGoal->name}" 
                        : "Withdrawal from goal: {$savingsGoal->name}",
                    'transaction_date' => $validated['date'],
                    'note' => $validated['note'] ?: 'Linked savings transaction',
                    'is_fixed' => false,
                    'payment_method' => $account->type === 'cash' ? 'cash' : ($account->type === 'mobile_banking' ? 'mobile_banking' : 'bank'),
                ]);
            }
        });

        return redirect()->back()->with('success', 'সঞ্চয় লেনদেন সফলভাবে সম্পন্ন হয়েছে।');
    }
}
