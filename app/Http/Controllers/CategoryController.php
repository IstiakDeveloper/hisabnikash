<?php

namespace App\Http\Controllers;

use App\Models\Category;
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
            ->withCount('transactions')
            ->orderBy('type', 'asc')
            ->orderBy('is_active', 'desc')
            ->orderBy('name')
            ->get();

        return Inertia::render('Categories/Index', [
            'categories' => $categories,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Categories/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:income,expense',
            'name' => 'required|string|max:255',
            'icon' => 'required|string|max:10',
            'color' => 'required|string|max:7',
            'monthly_limit' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        Category::create([
            ...$validated,
            'user_id' => auth()->id(),
            'is_default' => false,
        ]);

        return redirect()->route('categories.index')
            ->with('message', 'Category created successfully!');
    }

    public function edit(Category $category): Response
    {
        // Check if category belongs to current user
        if ($category->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this category.');
        }

        return Inertia::render('Categories/Edit', [
            'category' => $category,
        ]);
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        // Check if category belongs to current user
        if ($category->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this category.');
        }

        $validated = $request->validate([
            'type' => 'required|in:income,expense',
            'name' => 'required|string|max:255',
            'icon' => 'required|string|max:10',
            'color' => 'required|string|max:7',
            'monthly_limit' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $category->update($validated);

        return redirect()->route('categories.index')
            ->with('message', 'Category updated successfully!');
    }

    public function destroy(Category $category): RedirectResponse
    {
        // Check if category belongs to current user
        if ($category->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access to this category.');
        }

        // Check if category is being used
        if ($category->transactions()->count() > 0) {
            return back()->with('error', 'Cannot delete category with existing transactions.');
        }

        if ($category->budgets()->count() > 0) {
            return back()->with('error', 'Cannot delete category with existing budgets.');
        }

        $category->delete();

        return redirect()->route('categories.index')
            ->with('message', 'Category deleted successfully!');
    }
}
