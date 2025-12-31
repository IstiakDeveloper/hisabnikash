<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\LoanController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\TransferController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');


    // Accounts
    Route::resource('accounts', AccountController::class);

    // Categories
    Route::resource('categories', CategoryController::class);

    // Transactions
    Route::resource('transactions', TransactionController::class);

    // Loans
    Route::resource('loans', LoanController::class);
    Route::post('loans/{loan}/payment', [LoanController::class, 'makePayment'])->name('loans.payment');

    // Budgets
    Route::resource('budgets', BudgetController::class);
    Route::post('budgets/refresh', [BudgetController::class, 'refresh'])->name('budgets.refresh');

    // Transfers
    Route::get('transfers/cash-out', [TransferController::class, 'showCashOut'])->name('transfers.cash-out');
    Route::post('transfers/cash-out', [TransferController::class, 'cashOut'])->name('transfers.cash-out.store');
    Route::get('transfers/balance-transfer', [TransferController::class, 'showBalanceTransfer'])->name('transfers.balance-transfer');
    Route::post('transfers/balance-transfer', [TransferController::class, 'balanceTransfer'])->name('transfers.balance-transfer.store');
});
require __DIR__.'/auth.php';
require __DIR__.'/settings.php';

