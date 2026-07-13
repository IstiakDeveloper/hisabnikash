<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Models\Account;
use App\Models\Category;
use App\Models\Loan;
use App\Models\Space;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'username' => $request->user()->username,
                    'currency' => $request->user()->currency,
                    'timezone' => $request->user()->timezone,
                    'language' => $request->user()->language,
                    'auto_logout_minutes' => $request->user()->auto_logout_minutes,
                    'has_pin' => ! empty($request->user()->pin_code),
                    'has_biometric' => ! empty($request->user()->biometric_credential_id),
                    'two_factor_enabled' => ! empty($request->user()->two_factor_confirmed_at),
                ] : null,
            ],
            'locale' => app()->getLocale(),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',

            // Flash Messages (one-time session alerts)
            'flash' => [
                'message' => fn () => $request->session()->get('message'),
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
            ],

            // Auth status (e.g. password reset link sent)
            'status' => fn () => $request->session()->get('status'),

            // Financial Summary (only for authenticated users)
            'financialSummary' => $request->user() ? $this->getFinancialSummary($request->user()->id) : null,

            // Active Budgets for the current month
            'activeBudgets' => $request->user() ? \App\Models\Budget::where('user_id', $request->user()->id)
                ->where('is_active', true)
                ->where('start_date', '<=', now()->toDateString())
                ->where('end_date', '>=', now()->toDateString())
                ->get(['id', 'name', 'category_id', 'space_id', 'amount', 'spent_amount']) : [],

            // FAB quick-entry data (available on every authenticated page)
            'fabData' => fn () => $request->user() ? $this->getFabData($request->user()->id) : null,
        ];
    }

    /**
     * Data for the global FAB quick-entry sheet in AuthenticatedLayout.
     */
    private function getFabData(int $userId): array
    {
        return [
            'accounts' => Account::where('user_id', $userId)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'type', 'balance']),
            'categories' => Category::where('user_id', $userId)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'icon', 'type', 'is_fixed', 'color', 'space_id']),
            'spaces' => Space::where('user_id', $userId)
                ->orderBy('is_default', 'desc')
                ->get(['id', 'name', 'type', 'is_default']),
            'loans' => Loan::where('user_id', $userId)
                ->where('is_completed', false)
                ->orderBy('person_name')
                ->get(['id', 'person_name', 'remaining_amount', 'monthly_installment', 'is_completed']),
        ];
    }

    /**
     * Get financial summary for authenticated user
     */
    private function getFinancialSummary(int $userId): array
    {
        try {
            // Get total balance from active accounts
            $totalBalance = Account::where('user_id', $userId)
                ->where('is_active', true)
                ->sum('balance') ?? 0;

            // Get active loans taken (money I owe)
            $loansTaken = Loan::where('user_id', $userId)
                ->where('type', 'taken')
                ->where('is_completed', false)
                ->sum('remaining_amount') ?? 0;

            // Get active loans given (money others owe me)
            $loansGiven = Loan::where('user_id', $userId)
                ->where('type', 'given')
                ->where('is_completed', false)
                ->sum('remaining_amount') ?? 0;

            // Calculate net worth
            $netWorth = $totalBalance + $loansGiven - $loansTaken;

            return [
                'totalBalance' => (float) $totalBalance,
                'loansTaken' => (float) $loansTaken,
                'loansGiven' => (float) $loansGiven,
                'netWorth' => (float) $netWorth,
            ];
        } catch (\Exception $e) {
            // Return default values if there's an error
            return [
                'totalBalance' => 0.0,
                'loansTaken' => 0.0,
                'loansGiven' => 0.0,
                'netWorth' => 0.0,
            ];
        }
    }
}
