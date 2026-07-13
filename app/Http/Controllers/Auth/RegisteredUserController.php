<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Category;
use App\Providers\RouteServiceProvider;
use App\Rules\PinCode;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users|regex:/^[a-zA-Z0-9_]+$/',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => PinCode::rule(),
        ], array_merge([
            'username.regex' => 'Username can only contain letters, numbers, and underscores.',
            'username.unique' => 'This username is already taken.',
        ], PinCode::messages()));

        $user = User::create([
            'name' => $request->name,
            'username' => $request->username,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'pin_code' => $request->password,
        ]);

        // Create default categories for new user
        $this->createDefaultCategories($user);

        // Create default spaces and accounts for new user
        $this->createDefaultSpacesAndAccounts($user);

        event(new Registered($user));

        Auth::login($user, true);

        return redirect(RouteServiceProvider::HOME);
    }

    private function createDefaultCategories(User $user): void
    {
        $categories = [
            ['name' => 'Food & Dining', 'icon' => '🍽️', 'color' => '#EF4444', 'type' => 'expense'],
            ['name' => 'Transport', 'icon' => '🚗', 'color' => '#F97316', 'type' => 'expense'],
            ['name' => 'Health', 'icon' => '🏥', 'color' => '#10B981', 'type' => 'expense'],
            ['name' => 'Shopping', 'icon' => '🛒', 'color' => '#8B5CF6', 'type' => 'expense'],
            ['name' => 'Utility', 'icon' => '💡', 'color' => '#06B6D4', 'type' => 'expense'],
            ['name' => 'Entertainment', 'icon' => '🎬', 'color' => '#F59E0B', 'type' => 'expense'],
            ['name' => 'Education', 'icon' => '📚', 'color' => '#3B82F6', 'type' => 'expense'],
            ['name' => 'Others', 'icon' => '📦', 'color' => '#6B7280', 'type' => 'expense'],

            ['name' => 'Salary', 'icon' => '💵', 'color' => '#10B981', 'type' => 'income'],
            ['name' => 'Business', 'icon' => '📈', 'color' => '#3B82F6', 'type' => 'income'],
            ['name' => 'Freelance', 'icon' => '🚀', 'color' => '#06B6D4', 'type' => 'income'],
            ['name' => 'Others (Income)', 'icon' => '💰', 'color' => '#6B7280', 'type' => 'income'],
        ];

        foreach ($categories as $category) {
            Category::create([
                ...$category,
                'user_id' => $user->id,
                'is_default' => true,
            ]);
        }
    }

    private function createDefaultSpacesAndAccounts(User $user): void
    {
        // Create default space
        \App\Models\Space::create([
            'user_id' => $user->id,
            'name' => 'Personal Space',
            'type' => 'personal',
            'is_default' => true,
        ]);

        // Create default accounts
        \App\Models\Account::create([
            'user_id' => $user->id,
            'name' => 'Cash Wallet',
            'type' => 'cash',
            'balance' => 0.00,
            'is_active' => true,
        ]);

        \App\Models\Account::create([
            'user_id' => $user->id,
            'name' => 'Bank Account',
            'type' => 'bank',
            'balance' => 0.00,
            'is_active' => true,
        ]);
    }
}
