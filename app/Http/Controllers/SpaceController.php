<?php

namespace App\Http\Controllers;

use App\Models\Space;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SpaceController extends Controller
{
    public function index(): \Illuminate\Http\RedirectResponse
    {
        return redirect()->route('settings.index', ['tab' => 'spaces']);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'type' => ['required', Rule::in(['personal', 'business', 'other'])],
        ]);

        $user = auth()->user();

        // If this is the first space, make it default
        $isFirst = Space::where('user_id', $user->id)->count() === 0;

        Space::create([
            'user_id' => $user->id,
            'name' => $request->name,
            'type' => $request->type,
            'is_default' => $isFirst,
        ]);

        return redirect()->back()->with('success', 'স্পেস সফলভাবে তৈরি হয়েছে।');
    }

    public function update(Request $request, Space $space)
    {
        if ($space->user_id !== auth()->id()) {
            abort(403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'type' => ['required', Rule::in(['personal', 'business', 'other'])],
            'is_default' => 'boolean',
        ]);

        // If setting this as default, unset other defaults
        if ($request->is_default && !$space->is_default) {
            Space::where('user_id', auth()->id())->update(['is_default' => false]);
            $space->is_default = true;
        }

        $space->update([
            'name' => $request->name,
            'type' => $request->type,
            'is_default' => $space->is_default
        ]);

        return redirect()->back()->with('success', 'স্পেস সফলভাবে আপডেট হয়েছে।');
    }

    public function destroy(Space $space)
    {
        if ($space->user_id !== auth()->id()) {
            abort(403);
        }

        if ($space->is_default) {
            return redirect()->back()->with('error', 'ডিফল্ট স্পেস ডিলেট করা যাবে না।');
        }

        $space->delete();
        return redirect()->back()->with('success', 'স্পেস সফলভাবে মুছে ফেলা হয়েছে।');
    }

    /**
     * Log an Owner's Draw transfer from Business to Personal space.
     */
    public function ownersDraw(Request $request)
    {
        $request->validate([
            'source_space_id' => 'required|exists:spaces,id',
            'dest_space_id' => 'required|exists:spaces,id',
            'account_id' => 'required|exists:accounts,id',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'note' => 'nullable|string',
        ]);

        $user = auth()->user();

        // 1. Log expense in source business space
        $sourceCategory = Category::firstOrCreate([
            'user_id' => $user->id,
            'space_id' => $request->source_space_id,
            'name' => 'Owner\'s Draw Outflow',
            'type' => 'expense',
        ], [
            'icon' => '📤',
            'color' => '#EF4444',
            'is_fixed' => false,
            'is_default' => false,
            'is_active' => true,
        ]);

        Transaction::create([
            'user_id' => $user->id,
            'account_id' => $request->account_id,
            'category_id' => $sourceCategory->id,
            'space_id' => $request->source_space_id,
            'type' => 'expense',
            'amount' => $request->amount,
            'description' => 'Owner\'s Draw (Outflow)',
            'transaction_date' => $request->date,
            'note' => $request->note ?: 'Transfer to Personal Space',
            'is_fixed' => false,
            'payment_method' => 'mobile_banking',
        ]);

        // 2. Log income in destination personal space
        $destCategory = Category::firstOrCreate([
            'user_id' => $user->id,
            'space_id' => $request->dest_space_id,
            'name' => 'Owner\'s Draw Income',
            'type' => 'income',
        ], [
            'icon' => '📥',
            'color' => '#10B981',
            'is_fixed' => false,
            'is_default' => false,
            'is_active' => true,
        ]);

        Transaction::create([
            'user_id' => $user->id,
            'account_id' => $request->account_id,
            'category_id' => $destCategory->id,
            'space_id' => $request->dest_space_id,
            'type' => 'income',
            'amount' => $request->amount,
            'description' => 'Owner\'s Draw (Inflow)',
            'transaction_date' => $request->date,
            'note' => $request->note ?: 'Received from Business Space',
            'is_fixed' => false,
            'payment_method' => 'mobile_banking',
        ]);

        return redirect()->back()->with('success', 'ওনার্স ড্র সফলভাবে রেকর্ড করা হয়েছে।');
    }
}
