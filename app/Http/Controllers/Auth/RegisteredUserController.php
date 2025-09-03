<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Category;
use App\Providers\RouteServiceProvider;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
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
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ], [
            'username.regex' => 'Username can only contain letters, numbers, and underscores.',
            'username.unique' => 'This username is already taken.',
        ]);

        $user = User::create([
            'name' => $request->name,
            'username' => $request->username,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // Create default categories for new user
        $this->createDefaultCategories($user);

        event(new Registered($user));

        Auth::login($user);

        return redirect(RouteServiceProvider::HOME);
    }

    private function createDefaultCategories(User $user): void
    {
        $categories = [
            ['name' => 'Food & Dining', 'icon' => '🍽️', 'color' => '#EF4444'],
            ['name' => 'Transport', 'icon' => '🚗', 'color' => '#F97316'],
            ['name' => 'Health', 'icon' => '🏥', 'color' => '#10B981'],
            ['name' => 'Shopping', 'icon' => '🛒', 'color' => '#8B5CF6'],
            ['name' => 'Utility', 'icon' => '💡', 'color' => '#06B6D4'],
            ['name' => 'Entertainment', 'icon' => '🎬', 'color' => '#F59E0B'],
            ['name' => 'Education', 'icon' => '📚', 'color' => '#3B82F6'],
            ['name' => 'Others', 'icon' => '📦', 'color' => '#6B7280'],
        ];

        foreach ($categories as $category) {
            Category::create([
                ...$category,
                'user_id' => $user->id,
                'is_default' => true,
            ]);
        }
    }
}
