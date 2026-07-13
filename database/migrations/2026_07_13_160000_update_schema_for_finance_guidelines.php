<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create Spaces table
        Schema::create('spaces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('type')->default('business'); // personal, business, other
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        // 2. Alter Users table
        Schema::table('users', function (Blueprint $table) {
            $table->string('currency')->default('BDT');
            $table->string('timezone')->default('Asia/Dhaka');
            $table->string('pin_code')->nullable();
            $table->integer('auto_logout_minutes')->default(15);
            $table->text('two_factor_secret')->nullable();
            $table->text('two_factor_recovery_codes')->nullable();
            $table->timestamp('two_factor_confirmed_at')->nullable();
        });

        // 3. Alter Categories table
        Schema::table('categories', function (Blueprint $table) {
            $table->foreignId('space_id')->nullable()->constrained()->onDelete('cascade');
            $table->boolean('is_fixed')->default(false);
        });

        // 4. Alter Transactions table
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('space_id')->nullable()->constrained()->onDelete('cascade');
            $table->boolean('is_fixed')->default(false);
            $table->string('payment_method')->default('cash'); // cash, bank, mobile_banking, credit_card
            $table->boolean('is_recurring')->default(false);
            $table->string('recurrence_period')->nullable(); // monthly, custom
        });

        // 5. Alter Loans table
        Schema::table('loans', function (Blueprint $table) {
            $table->foreignId('space_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('loan_type')->default('personal_loan'); // personal_loan, credit_card_emi, microcredit, informal_family_loan
            $table->decimal('monthly_installment', 15, 2)->default(0);
            $table->integer('tenure_months')->default(12);
            $table->decimal('interest_paid_so_far', 15, 2)->default(0);
        });

        // 5b. Alter Budgets table
        Schema::table('budgets', function (Blueprint $table) {
            $table->foreignId('space_id')->nullable()->constrained()->onDelete('cascade');
        });

        // 6. Create Loan Installments schedule table
        Schema::create('loan_installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_id')->constrained()->onDelete('cascade');
            $table->date('due_date');
            $table->decimal('amount', 15, 2);
            $table->string('status')->default('unpaid'); // paid, unpaid, late
            $table->date('payment_date')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        // 7. Create Savings Goals table
        Schema::create('savings_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('space_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('name');
            $table->decimal('target_amount', 15, 2);
            $table->date('target_date');
            $table->decimal('current_amount', 15, 2)->default(0);
            $table->timestamps();
        });

        // 8. Create Savings Contributions table
        Schema::create('savings_contributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('savings_goal_id')->constrained()->onDelete('cascade');
            $table->decimal('amount', 15, 2);
            $table->string('type')->default('contribution'); // contribution, withdrawal
            $table->date('date');
            $table->text('note')->nullable();
            $table->timestamps();
        });

        // 9. Create Recurring Bills table
        Schema::create('recurring_bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('space_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('category_id')->nullable()->constrained()->onDelete('set null');
            $table->string('name');
            $table->decimal('amount', 15, 2);
            $table->integer('due_day'); // Day of the month: 1 - 31
            $table->string('frequency')->default('monthly'); // monthly, custom
            $table->string('status')->default('active'); // active, paused
            $table->timestamps();
        });

        // 10. Create Notifications table
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('type'); // alert, reminder, milestone, recap
            $table->text('message');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        // 11. Create Notes/Journal table
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('space_id')->nullable()->constrained()->onDelete('cascade');
            $table->text('content');
            $table->string('linked_type')->nullable(); // transaction, loan, savings_goal, month
            $table->unsignedBigInteger('linked_id')->nullable();
            $table->string('tags')->nullable(); // JSON or comma separated
            $table->timestamps();
        });

        // 12. Create Login Activities table
        Schema::create('login_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('logged_in_at')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('login_activities');
        Schema::dropIfExists('notes');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('recurring_bills');
        Schema::dropIfExists('savings_contributions');
        Schema::dropIfExists('savings_goals');
        Schema::dropIfExists('loan_installments');

        Schema::table('loans', function (Blueprint $table) {
            $table->dropForeign(['space_id']);
            $table->dropColumn(['space_id', 'loan_type', 'monthly_installment', 'tenure_months', 'interest_paid_so_far']);
        });

        Schema::table('budgets', function (Blueprint $table) {
            $table->dropForeign(['space_id']);
            $table->dropColumn(['space_id']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['space_id']);
            $table->dropColumn(['space_id', 'is_fixed', 'payment_method', 'is_recurring', 'recurrence_period']);
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropForeign(['space_id']);
            $table->dropColumn(['space_id', 'is_fixed']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['currency', 'timezone', 'pin_code', 'auto_logout_minutes', 'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at']);
        });

        Schema::dropIfExists('spaces');
    }
};
