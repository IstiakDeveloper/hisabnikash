<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\LoanController;
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


    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');


    // Accounts
    Route::resource('accounts', AccountController::class);

    // Transactions
    Route::resource('transactions', TransactionController::class);

    // Loans
    Route::resource('loans', LoanController::class);
    Route::post('loans/{loan}/payment', [LoanController::class, 'makePayment'])->name('loans.payment');


require __DIR__.'/auth.php';
require __DIR__.'/settings.php';

