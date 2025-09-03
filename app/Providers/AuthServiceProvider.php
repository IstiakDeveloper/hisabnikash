<?php

namespace App\Providers;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\Loan;
use App\Policies\AccountPolicy;
use App\Policies\TransactionPolicy;
use App\Policies\LoanPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Account::class => AccountPolicy::class,
        Transaction::class => TransactionPolicy::class,
        Loan::class => LoanPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
