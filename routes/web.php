<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\LoanController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\SpaceController;
use App\Http\Controllers\SavingsGoalController;
use App\Http\Controllers\RecurringBillController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect('/login');
});

Route::middleware(['auth', 'verified', 'pin.mutation'])->group(function () {
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Accounts
    Route::resource('accounts', AccountController::class);

    // Categories
    Route::resource('categories', CategoryController::class);

    // Transactions
    Route::resource('transactions', TransactionController::class);

    // Spaces/Profiles
    Route::resource('spaces', SpaceController::class);
    Route::post('spaces/owners-draw', [SpaceController::class, 'ownersDraw'])->name('spaces.owners-draw');

    // Loans
    Route::resource('loans', LoanController::class);
    Route::post('loans/{loan}/payment', [LoanController::class, 'makePayment'])->name('loans.payment');

    // Budgets
    Route::post('budgets/clone', [BudgetController::class, 'cloneLastMonth'])->name('budgets.clone');
    Route::resource('budgets', BudgetController::class);

    // Savings Goals
    Route::resource('savings-goals', SavingsGoalController::class);
    Route::post('savings-goals/{savings_goal}/contribute', [SavingsGoalController::class, 'contribute'])->name('savings-goals.contribute');

    // Recurring Bills
    Route::resource('recurring-bills', RecurringBillController::class);
    Route::post('recurring-bills/{recurring_bill}/pay', [RecurringBillController::class, 'pay'])->name('recurring-bills.pay');

    // Financial Notes
    Route::resource('notes', NoteController::class);

    // Reports
    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('reports/export-csv', [ReportController::class, 'exportCSV'])->name('reports.export-csv');

    // Settings
    Route::get('settings/app', [SettingController::class, 'index'])->name('settings.index');
    Route::post('settings/profile', [SettingController::class, 'updateProfile'])->name('settings.update-profile');
    Route::post('settings/pin', [SettingController::class, 'setPin'])->name('settings.pin');
    Route::post('settings/pin-verify', [SettingController::class, 'verifyPin'])->name('settings.pin-verify');
    Route::get('settings/backup', [SettingController::class, 'backupJson'])->name('settings.backup');
    Route::post('settings/restore', [SettingController::class, 'restoreBackup'])->name('settings.restore');
    Route::post('settings/reset', [SettingController::class, 'resetData'])->name('settings.reset');
});

Route::post('settings/language', [App\Http\Controllers\SettingController::class, 'updateLanguage'])->name('settings.language');

require __DIR__.'/auth.php';
require __DIR__.'/settings.php';
