<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        // Create demo user
        $user = User::firstOrCreate(
            ['username' => 'demo'],
            [
                'name' => 'Demo User',
                'email' => 'demo@example.com',
                'password' => Hash::make('password'),
            ]
        );

        // Create default categories if they don't exist
        if ($user->categories()->count() === 0) {
            $expenseCategories = [
                ['name' => 'Food & Dining', 'icon' => '🍽️', 'color' => '#EF4444', 'type' => 'expense'],
                ['name' => 'Transport', 'icon' => '🚗', 'color' => '#F97316', 'type' => 'expense'],
                ['name' => 'Health', 'icon' => '🏥', 'color' => '#10B981', 'type' => 'expense'],
                ['name' => 'Shopping', 'icon' => '🛒', 'color' => '#8B5CF6', 'type' => 'expense'],
                ['name' => 'Utility', 'icon' => '💡', 'color' => '#06B6D4', 'type' => 'expense'],
                ['name' => 'Entertainment', 'icon' => '🎬', 'color' => '#F59E0B', 'type' => 'expense'],
                ['name' => 'Education', 'icon' => '📚', 'color' => '#3B82F6', 'type' => 'expense'],
                ['name' => 'Others', 'icon' => '📦', 'color' => '#6B7280', 'type' => 'expense'],
            ];

            $incomeCategories = [
                ['name' => 'Salary', 'icon' => '💰', 'color' => '#10B981', 'type' => 'income'],
                ['name' => 'Business', 'icon' => '💼', 'color' => '#3B82F6', 'type' => 'income'],
                ['name' => 'Investment', 'icon' => '📈', 'color' => '#8B5CF6', 'type' => 'income'],
                ['name' => 'Freelance', 'icon' => '💻', 'color' => '#06B6D4', 'type' => 'income'],
                ['name' => 'Gift', 'icon' => '🎁', 'color' => '#F59E0B', 'type' => 'income'],
                ['name' => 'Other Income', 'icon' => '💵', 'color' => '#10B981', 'type' => 'income'],
            ];

            foreach (array_merge($expenseCategories, $incomeCategories) as $category) {
                Category::create([
                    ...$category,
                    'user_id' => $user->id,
                    'is_default' => true,
                ]);
            }
        }

        // Create demo accounts
        if ($user->accounts()->count() === 0) {
            $accounts = [
                ['name' => 'Prime Bank Savings', 'type' => 'bank', 'balance' => 50000],
                ['name' => 'Bkash', 'type' => 'mobile_banking', 'balance' => 5000],
                ['name' => 'Cash Wallet', 'type' => 'cash', 'balance' => 2000],
                ['name' => 'DBBL Credit Card', 'type' => 'card', 'balance' => 15000],
            ];

            foreach ($accounts as $account) {
                Account::create([
                    ...$account,
                    'user_id' => $user->id,
                ]);
            }
        }

        $this->command->info('Demo user created successfully!');
        $this->command->info('Username: demo');
        $this->command->info('Password: password');
    }
}
