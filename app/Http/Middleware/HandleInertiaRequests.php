<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Models\Account;
use App\Models\Loan;

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
                'user' => $request->user(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',

            // Flash Messages
            'flash' => [
                'message' => fn() => $request->session()->get('message'),
                'success' => fn() => $request->session()->get('success'),
                'error' => fn() => $request->session()->get('error'),
                'warning' => fn() => $request->session()->get('warning'),
                'info' => fn() => $request->session()->get('info'),
            ],

            // Financial Summary (only for authenticated users)
            'financialSummary' => $request->user() ? $this->getFinancialSummary($request->user()->id) : null,
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
