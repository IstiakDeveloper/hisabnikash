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
