<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Space;
use App\Models\Category;
use App\Models\Account;
use App\Models\Transaction;
use App\Models\Loan;
use App\Models\LoanInstallment;
use App\Models\SavingsGoal;
use App\Models\SavingsContribution;
use App\Models\RecurringBill;
use App\Models\Note;
use App\Models\Notification;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create demo user
        $user = User::firstOrCreate(
            ['username' => 'demo'],
            [
                'name' => 'Demo User',
                'email' => 'demo@example.com',
                'password' => Hash::make('1234'),
                'currency' => 'BDT',
                'timezone' => 'Asia/Dhaka',
                'pin_code' => '1234',
                'auto_logout_minutes' => 15,
            ]
        );

        // Ensure we don't duplicate data
        $user->spaces()->delete();
        $user->categories()->delete();
        $user->accounts()->delete();
        $user->loans()->delete();
        $user->savingsGoals()->delete();
        $user->recurringBills()->delete();
        $user->notes()->delete();
        $user->notifications()->delete();

        // 2. Create Spaces
        $spacesData = [
            ['name' => 'Personal Space', 'type' => 'personal', 'is_default' => true],
            ['name' => 'Rice Business', 'type' => 'business', 'is_default' => false],
            ['name' => 'DesignFIC Agency', 'type' => 'business', 'is_default' => false],
            ['name' => 'Mousumi Digital Window', 'type' => 'business', 'is_default' => false],
            ['name' => 'General / Other', 'type' => 'other', 'is_default' => false],
        ];

        $spaces = [];
        foreach ($spacesData as $data) {
            $spaces[$data['name']] = Space::create([
                ...$data,
                'user_id' => $user->id,
            ]);
        }

        $personalSpace = $spaces['Personal Space'];
        $riceSpace = $spaces['Rice Business'];
        $designSpace = $spaces['DesignFIC Agency'];

        // 3. Create Accounts
        $accountsData = [
            ['name' => 'Cash Wallet', 'type' => 'cash', 'balance' => 15500],
            ['name' => 'bKash Personal', 'type' => 'mobile_banking', 'balance' => 45000],
            ['name' => 'DBBL Account', 'type' => 'bank', 'balance' => 250000],
            ['name' => 'bKash Agent (Business)', 'type' => 'mobile_banking', 'balance' => 120000],
            ['name' => 'Eastern Bank Credit Card', 'type' => 'card', 'balance' => -12500],
        ];

        $accounts = [];
        foreach ($accountsData as $data) {
            $accounts[$data['name']] = Account::create([
                ...$data,
                'user_id' => $user->id,
            ]);
        }

        $cash = $accounts['Cash Wallet'];
        $bkash = $accounts['bKash Personal'];
        $dbbl = $accounts['DBBL Account'];
        $bkashBiz = $accounts['bKash Agent (Business)'];

        // 4. Create Categories
        $categoriesData = [
            // Personal Expenses
            ['name' => 'Home Rent', 'icon' => '🏠', 'color' => '#EF4444', 'type' => 'expense', 'is_fixed' => true, 'space_name' => 'Personal Space'],
            ['name' => 'Groceries & Food', 'icon' => '🛒', 'color' => '#F59E0B', 'type' => 'expense', 'is_fixed' => false, 'space_name' => 'Personal Space'],
            ['name' => 'Utility Bills', 'icon' => '💡', 'color' => '#3B82F6', 'type' => 'expense', 'is_fixed' => true, 'space_name' => 'Personal Space'],
            ['name' => 'Medical & Care', 'icon' => '🏥', 'color' => '#10B981', 'type' => 'expense', 'is_fixed' => false, 'space_name' => 'Personal Space'],
            ['name' => 'Family Support', 'icon' => '❤️', 'color' => '#EC4899', 'type' => 'expense', 'is_fixed' => false, 'space_name' => 'Personal Space'],
            ['name' => 'Entertainment', 'icon' => '🎬', 'color' => '#8B5CF6', 'type' => 'expense', 'is_fixed' => false, 'space_name' => 'Personal Space'],

            // Rice Business Expenses & Incomes
            ['name' => 'Rice Supply Stock', 'icon' => '🌾', 'color' => '#F59E0B', 'type' => 'expense', 'is_fixed' => false, 'space_name' => 'Rice Business'],
            ['name' => 'Store Rent & Labour', 'icon' => '🏢', 'color' => '#EF4444', 'type' => 'expense', 'is_fixed' => true, 'space_name' => 'Rice Business'],
            ['name' => 'Rice Sales Revenue', 'icon' => '📈', 'color' => '#10B981', 'type' => 'income', 'is_fixed' => false, 'space_name' => 'Rice Business'],

            // DesignFIC Expenses & Incomes
            ['name' => 'Software & Subscriptions', 'icon' => '💻', 'color' => '#8B5CF6', 'type' => 'expense', 'is_fixed' => true, 'space_name' => 'DesignFIC Agency'],
            ['name' => 'Contractor Payouts', 'icon' => '👥', 'color' => '#F59E0B', 'type' => 'expense', 'is_fixed' => false, 'space_name' => 'DesignFIC Agency'],
            ['name' => 'Client Project Payment', 'icon' => '💰', 'color' => '#10B981', 'type' => 'income', 'is_fixed' => false, 'space_name' => 'DesignFIC Agency'],

            // Personal Incomes
            ['name' => 'Salary', 'icon' => '💵', 'color' => '#10B981', 'type' => 'income', 'is_fixed' => true, 'space_name' => 'Personal Space'],
            ['name' => 'Freelance Projects', 'icon' => '🚀', 'color' => '#06B6D4', 'type' => 'income', 'is_fixed' => false, 'space_name' => 'Personal Space'],
            ['name' => 'Owner\'s Draw', 'icon' => '📤', 'color' => '#EC4899', 'type' => 'income', 'is_fixed' => false, 'space_name' => 'Personal Space'],
        ];

        $categories = [];
        foreach ($categoriesData as $data) {
            $space = $spaces[$data['space_name']];
            $categories[$data['name']] = Category::create([
                'user_id' => $user->id,
                'space_id' => $space->id,
                'name' => $data['name'],
                'icon' => $data['icon'],
                'color' => $data['color'],
                'type' => $data['type'],
                'is_fixed' => $data['is_fixed'],
                'is_default' => true,
                'is_active' => true
            ]);
        }

        // 5. Create budgets for Personal
        $user->budgets()->create([
            'space_id' => $personalSpace->id,
            'category_id' => $categories['Groceries & Food']->id,
            'name' => 'Food Budget',
            'amount' => 15000,
            'period' => 'monthly',
            'start_date' => Carbon::now()->startOfMonth(),
            'end_date' => Carbon::now()->endOfMonth(),
            'spent_amount' => 0,
            'is_active' => true,
            'notify_on_exceed' => true,
            'alert_percentage' => 80
        ]);

        $user->budgets()->create([
            'space_id' => $personalSpace->id,
            'category_id' => $categories['Entertainment']->id,
            'name' => 'Discretionary Limit',
            'amount' => 5000,
            'period' => 'monthly',
            'start_date' => Carbon::now()->startOfMonth(),
            'end_date' => Carbon::now()->endOfMonth(),
            'spent_amount' => 0,
            'is_active' => true,
            'notify_on_exceed' => true,
            'alert_percentage' => 90
        ]);

        // 6. Create Loans & Installment schedule
        // Loan 1: Credit Card EMI (Taken)
        $loan1 = Loan::create([
            'user_id' => $user->id,
            'space_id' => $personalSpace->id,
            'type' => 'taken',
            'person_name' => 'Eastern Bank PLC',
            'person_phone' => '16230',
            'amount' => 60000,
            'remaining_amount' => 40000,
            'loan_date' => Carbon::now()->subMonths(2),
            'due_date' => Carbon::now()->addMonths(4),
            'interest_rate' => 0,
            'loan_type' => 'credit_card_emi',
            'monthly_installment' => 10000,
            'tenure_months' => 6,
            'interest_paid_so_far' => 0,
            'is_completed' => false,
        ]);

        // Generate Installments
        for ($i = 1; $i <= 6; $i++) {
            $dueDate = Carbon::now()->subMonths(2)->addMonths($i)->day(10);
            $status = 'unpaid';
            $paymentDate = null;
            if ($dueDate->isPast()) {
                $status = 'paid';
                $paymentDate = $dueDate->copy()->addDay();
            }
            LoanInstallment::create([
                'loan_id' => $loan1->id,
                'due_date' => $dueDate,
                'amount' => 10000,
                'status' => $status,
                'payment_date' => $paymentDate,
            ]);
        }

        // Loan 2: Personal Loan from Uncle (Taken - Interest Free)
        $loan2 = Loan::create([
            'user_id' => $user->id,
            'space_id' => $personalSpace->id,
            'type' => 'taken',
            'person_name' => 'Uncle Abdur Rahman',
            'person_phone' => '01712345678',
            'amount' => 50000,
            'remaining_amount' => 50000,
            'loan_date' => Carbon::now(),
            'due_date' => Carbon::now()->addMonths(10),
            'interest_rate' => 0,
            'loan_type' => 'informal_family_loan',
            'monthly_installment' => 5000,
            'tenure_months' => 10,
            'is_completed' => false,
        ]);

        for ($i = 1; $i <= 10; $i++) {
            $dueDate = Carbon::now()->addMonths($i)->day(5);
            LoanInstallment::create([
                'loan_id' => $loan2->id,
                'due_date' => $dueDate,
                'amount' => 5000,
                'status' => 'unpaid',
            ]);
        }

        // 7. Create Savings Goals
        $goal1 = SavingsGoal::create([
            'user_id' => $user->id,
            'space_id' => $personalSpace->id,
            'name' => 'Emergency Fund (6 Months Expenses)',
            'target_amount' => 150000,
            'target_date' => Carbon::now()->addMonths(6),
            'current_amount' => 0,
        ]);

        // Add default contributions to Emergency Fund
        SavingsContribution::create([
            'savings_goal_id' => $goal1->id,
            'amount' => 30000,
            'type' => 'contribution',
            'date' => Carbon::now()->subMonth(),
            'note' => 'Initial allocation from savings account',
        ]);
        SavingsContribution::create([
            'savings_goal_id' => $goal1->id,
            'amount' => 15000,
            'type' => 'contribution',
            'date' => Carbon::now(),
            'note' => 'Monthly savings contribution',
        ]);

        // 8. Create Recurring Bills
        RecurringBill::create([
            'user_id' => $user->id,
            'space_id' => $personalSpace->id,
            'category_id' => $categories['Home Rent']->id,
            'name' => 'Monthly House Rent',
            'amount' => 18000,
            'due_day' => 5,
            'frequency' => 'monthly',
            'status' => 'active',
        ]);

        RecurringBill::create([
            'user_id' => $user->id,
            'space_id' => $personalSpace->id,
            'category_id' => $categories['Utility Bills']->id,
            'name' => 'Internet Bill',
            'amount' => 1000,
            'due_day' => 10,
            'frequency' => 'monthly',
            'status' => 'active',
        ]);

        // 9. Add Notes/Financial Journal entries
        Note::create([
            'user_id' => $user->id,
            'space_id' => $personalSpace->id,
            'content' => 'Borrowed BDT 50,000 from Uncle Abdur Rahman interest-free. To be paid back in 10 installments of BDT 5,000 starting from next month.',
            'linked_type' => 'loan',
            'linked_id' => $loan2->id,
            'tags' => 'uncle,family,loan'
        ]);

        Note::create([
            'user_id' => $user->id,
            'space_id' => $personalSpace->id,
            'content' => 'Emergency fund target calculated based on BDT 25,000 monthly essential expense multiplied by 6 months.',
            'linked_type' => 'savings_goal',
            'linked_id' => $goal1->id,
            'tags' => 'emergency,savings'
        ]);

        // 10. Seed notifications
        Notification::create([
            'user_id' => $user->id,
            'type' => 'alert',
            'message' => 'Credit Card EMI BDT 10,000 will be auto-debited in 3 days.',
            'read_at' => null,
        ]);

        Notification::create([
            'user_id' => $user->id,
            'type' => 'milestone',
            'message' => 'Congratulations! You reached 30% of your Emergency Fund goal.',
            'read_at' => Carbon::now()->subDays(2),
        ]);

        // 11. Seed transactions
        // Personal Salary
        $t1 = Transaction::create([
            'user_id' => $user->id,
            'account_id' => $dbbl->id,
            'category_id' => $categories['Salary']->id,
            'space_id' => $personalSpace->id,
            'type' => 'income',
            'amount' => 85000,
            'description' => 'Monthly Salary Payment',
            'transaction_date' => Carbon::now()->startOfMonth(),
            'note' => 'Received from office',
            'is_fixed' => true,
            'payment_method' => 'bank',
        ]);

        // Food Expense
        $t2 = Transaction::create([
            'user_id' => $user->id,
            'account_id' => $cash->id,
            'category_id' => $categories['Groceries & Food']->id,
            'space_id' => $personalSpace->id,
            'type' => 'expense',
            'amount' => 4500,
            'description' => 'Weekly grocery shopping at Shwapno',
            'transaction_date' => Carbon::now()->subDays(5),
            'note' => 'Vegetables, rice, oil and fish',
            'is_fixed' => false,
            'payment_method' => 'cash',
        ]);

        // Entertainment Expense
        $t3 = Transaction::create([
            'user_id' => $user->id,
            'account_id' => $bkash->id,
            'category_id' => $categories['Entertainment']->id,
            'space_id' => $personalSpace->id,
            'type' => 'expense',
            'amount' => 1200,
            'description' => 'Star Cineplex Movie tickets & Snacks',
            'transaction_date' => Carbon::now()->subDays(2),
            'note' => 'Watched new film with friends',
            'is_fixed' => false,
            'payment_method' => 'mobile_banking',
        ]);

        // Rice Business Income
        $t4 = Transaction::create([
            'user_id' => $user->id,
            'account_id' => $bkashBiz->id,
            'category_id' => $categories['Rice Sales Revenue']->id,
            'space_id' => $riceSpace->id,
            'type' => 'income',
            'amount' => 45000,
            'description' => 'Bulk sales to local merchant',
            'transaction_date' => Carbon::now()->subDays(4),
            'note' => '10 bags of Miniket rice',
            'is_fixed' => false,
            'payment_method' => 'mobile_banking',
        ]);

        // Rice Business Expense
        $t5 = Transaction::create([
            'user_id' => $user->id,
            'account_id' => $dbbl->id,
            'category_id' => $categories['Rice Supply Stock']->id,
            'space_id' => $riceSpace->id,
            'type' => 'expense',
            'amount' => 30000,
            'description' => 'Supplier payment for new stock',
            'transaction_date' => Carbon::now()->subDays(3),
            'note' => 'Purchased from Dinajpur mill',
            'is_fixed' => false,
            'payment_method' => 'bank',
        ]);

        // DesignFIC Freelance Payment
        $t6 = Transaction::create([
            'user_id' => $user->id,
            'account_id' => $dbbl->id,
            'category_id' => $categories['Client Project Payment']->id,
            'space_id' => $designSpace->id,
            'type' => 'income',
            'amount' => 150000,
            'description' => 'US Client website design project',
            'transaction_date' => Carbon::now()->subDays(10),
            'note' => 'Milestone 2 payment',
            'is_fixed' => false,
            'payment_method' => 'bank',
        ]);

        // Owner's Draw - Business to Personal Transfer
        // Step A: Expense in Business space
        Transaction::create([
            'user_id' => $user->id,
            'account_id' => $bkashBiz->id,
            'category_id' => $categories['Contractor Payouts']->id, // log as payout/transfer
            'space_id' => $riceSpace->id,
            'type' => 'expense',
            'amount' => 20000,
            'description' => 'Transfer to Personal BKash (Owner Draw)',
            'transaction_date' => Carbon::now()->subDays(1),
            'note' => 'Owner\'s draw from rice business profits',
            'is_fixed' => false,
            'payment_method' => 'mobile_banking',
        ]);
        
        // Step B: Income in Personal space
        Transaction::create([
            'user_id' => $user->id,
            'account_id' => $bkash->id,
            'category_id' => $categories['Owner\'s Draw']->id,
            'space_id' => $personalSpace->id,
            'type' => 'income',
            'amount' => 20000,
            'description' => 'Received from Rice Business (Owner Draw)',
            'transaction_date' => Carbon::now()->subDays(1),
            'note' => 'Received owner\'s draw',
            'is_fixed' => false,
            'payment_method' => 'mobile_banking',
        ]);

        $this->command->info('Full guidelines database demo seeded successfully!');
        $this->command->info('Username: demo');
        $this->command->info('Password: password');
        $this->command->info('PIN: 1234');
    }
}
