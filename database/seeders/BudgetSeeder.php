<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Account;
use App\Models\Transaction;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\Budget;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class BudgetSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get first user
        $user = User::first();

        if (!$user) {
            $this->command->warn('No users found. Please run UserSeeder first.');
            return;
        }

        // Get user's categories
        $categories = Category::where('user_id', $user->id)->get();

        if ($categories->isEmpty()) {
            $this->command->warn('No categories found. Please run CategorySeeder first.');
            return;
        }

        // Current month budget
        $currentMonthStart = now()->startOfMonth();
        $currentMonthEnd = now()->endOfMonth();

        // 1. Overall Monthly Budget (all expenses)
        $overallBudget = Budget::create([
            'user_id' => $user->id,
            'category_id' => null, // All categories
            'name' => 'মাসিক সম্পূর্ণ বাজেট',
            'amount' => 50000.00,
            'period' => 'monthly',
            'start_date' => $currentMonthStart,
            'end_date' => $currentMonthEnd,
            'note' => 'এই মাসের সব ধরনের খরচের জন্য সর্বমোট বাজেট',
            'alert_percentage' => 80,
            'notify_on_exceed' => true,
            'is_active' => true,
        ]);

        // 2. Food Budget
        $foodCategory = $categories->where('name', 'খাবার')->first()
                     ?? $categories->where('name', 'Food')->first();

        if ($foodCategory) {
            Budget::create([
                'user_id' => $user->id,
                'category_id' => $foodCategory->id,
                'name' => 'মাসিক খাবার বাজেট',
                'amount' => 15000.00,
                'period' => 'monthly',
                'start_date' => $currentMonthStart,
                'end_date' => $currentMonthEnd,
                'note' => 'খাবার এবং গ্রোসারির জন্য বাজেট',
                'alert_percentage' => 75,
                'notify_on_exceed' => true,
                'is_active' => true,
            ]);
        }

        // 3. Transport Budget
        $transportCategory = $categories->where('name', 'যাতায়াত')->first()
                          ?? $categories->where('name', 'Transport')->first();

        if ($transportCategory) {
            Budget::create([
                'user_id' => $user->id,
                'category_id' => $transportCategory->id,
                'name' => 'মাসিক যাতায়াত বাজেট',
                'amount' => 5000.00,
                'period' => 'monthly',
                'start_date' => $currentMonthStart,
                'end_date' => $currentMonthEnd,
                'note' => 'বাস, রিকশা, উবার ইত্যাদির জন্য',
                'alert_percentage' => 85,
                'notify_on_exceed' => true,
                'is_active' => true,
            ]);
        }

        // 4. Development/Learning Budget
        $developmentCategory = $categories->where('name', 'উন্নয়ন')->first()
                            ?? $categories->where('name', 'Development')->first()
                            ?? $categories->where('name', 'Education')->first();

        if ($developmentCategory) {
            Budget::create([
                'user_id' => $user->id,
                'category_id' => $developmentCategory->id,
                'name' => 'উন্নয়ন ও শিক্ষা বাজেট',
                'amount' => 8000.00,
                'period' => 'monthly',
                'start_date' => $currentMonthStart,
                'end_date' => $currentMonthEnd,
                'note' => 'কোর্স, বই, সফটওয়্যার, ট্রেনিং ইত্যাদি',
                'alert_percentage' => 90,
                'notify_on_exceed' => true,
                'is_active' => true,
            ]);
        }

        // 5. Entertainment Budget
        $entertainmentCategory = $categories->where('name', 'বিনোদন')->first()
                              ?? $categories->where('name', 'Entertainment')->first();

        if ($entertainmentCategory) {
            Budget::create([
                'user_id' => $user->id,
                'category_id' => $entertainmentCategory->id,
                'name' => 'মাসিক বিনোদন বাজেট',
                'amount' => 3000.00,
                'period' => 'monthly',
                'start_date' => $currentMonthStart,
                'end_date' => $currentMonthEnd,
                'note' => 'সিনেমা, গেম, Netflix ইত্যাদি',
                'alert_percentage' => 80,
                'notify_on_exceed' => false,
                'is_active' => true,
            ]);
        }

        // 6. Quarterly Budget for Special Occasions
        $quarterStart = now()->startOfQuarter();
        $quarterEnd = now()->endOfQuarter();

        Budget::create([
            'user_id' => $user->id,
            'category_id' => null,
            'name' => 'ত্রৈমাসিক বিশেষ বাজেট',
            'amount' => 30000.00,
            'period' => 'monthly', // Using monthly but with 3-month date range
            'start_date' => $quarterStart,
            'end_date' => $quarterEnd,
            'note' => 'ঈদ, পূজা, বিশেষ অনুষ্ঠান ইত্যাদির জন্য',
            'alert_percentage' => 80,
            'notify_on_exceed' => true,
            'is_active' => true,
        ]);

        // 7. Yearly Savings Goal
        Budget::create([
            'user_id' => $user->id,
            'category_id' => null,
            'name' => 'বার্ষিক সঞ্চয় লক্ষ্য',
            'amount' => 200000.00,
            'period' => 'yearly',
            'start_date' => now()->startOfYear(),
            'end_date' => now()->endOfYear(),
            'note' => 'এই বছর ২ লক্ষ টাকা সঞ্চয়ের লক্ষ্য',
            'alert_percentage' => 50,
            'notify_on_exceed' => false,
            'is_active' => true,
        ]);

        // Update all budgets with actual spent amounts
        Budget::where('user_id', $user->id)->get()->each->updateSpentAmount();

        $this->command->info('Budgets seeded successfully!');
    }
}
