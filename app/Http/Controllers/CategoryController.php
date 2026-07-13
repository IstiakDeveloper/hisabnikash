<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Space;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    use AuthorizesRequests;

    public function index(): Response
    {
        $categories = Category::where('user_id', auth()->id())
            ->with(['space'])
            ->withCount('transactions')
            ->orderBy('type', 'asc')
            ->orderBy('is_active', 'desc')
            ->orderBy('name')
            ->get();

        $spaces = Space::where('user_id', auth()->id())->get(['id', 'name']);

        return Inertia::render('Categories/Index', [
            'categories' => $categories,
            'spaces' => $spaces
        ]);
    }

    public function create(): Response
    {
        $spaces = Space::where('user_id', auth()->id())->get(['id', 'name']);
        
        return Inertia::render('Categories/Create', [
            'spaces' => $spaces
        ]);
    }

    public function edit(Category $category): Response
    {
        if ($category->user_id !== auth()->id()) {
            abort(403);
        }
        
        $spaces = Space::where('user_id', auth()->id())->get(['id', 'name']);
        
        return Inertia::render('Categories/Edit', [
            'category' => $category,
            'spaces' => $spaces
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:income,expense',
            'name' => 'required|string|max:255',
            'icon' => 'required|string|max:10',
            'color' => 'required|string|max:7',
            'monthly_limit' => 'nullable|numeric|min:0',
            'is_fixed' => 'required|boolean',
            'space_id' => 'required|exists:spaces,id',
            'is_active' => 'boolean',
        ]);

        // Validate space ownership
        Space::where('id', $validated['space_id'])->where('user_id', auth()->id())->firstOrFail();

        Category::create([
            ...$validated,
            'user_id' => auth()->id(),
            'is_default' => false,
            'is_active' => $request->has('is_active') ? $validated['is_active'] : true
        ]);

        return redirect()->back()->with('message', 'ক্যাটাগরি সফলভাবে তৈরি হয়েছে।');
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        if ($category->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'type' => 'required|in:income,expense',
            'name' => 'required|string|max:255',
            'icon' => 'required|string|max:10',
            'color' => 'required|string|max:7',
            'monthly_limit' => 'nullable|numeric|min:0',
            'is_fixed' => 'required|boolean',
            'space_id' => 'required|exists:spaces,id',
            'is_active' => 'boolean',
        ]);

        // Validate space ownership
        Space::where('id', $validated['space_id'])->where('user_id', auth()->id())->firstOrFail();

        $category->update($validated);

        return redirect()->back()->with('message', 'ক্যাটাগরি সফলভাবে আপডেট হয়েছে।');
    }

    public function destroy(Category $category): RedirectResponse
    {
        if ($category->user_id !== auth()->id()) {
            abort(403);
        }

        if ($category->transactions()->count() > 0) {
            return back()->with('error', 'এই ক্যাটাগরির অধীনে লেনদেন রয়েছে। ডিলেট করা যাবে না।');
        }

        if ($category->budgets()->count() > 0) {
            return back()->with('error', 'এই ক্যাটাগরির অধীনে একটি বাজেট রয়েছে। ডিলেট করা যাবে না।');
        }

        $category->delete();

        return redirect()->back()->with('message', 'ক্যাটাগরি সফলভাবে মুছে ফেলা হয়েছে।');
    }
}
