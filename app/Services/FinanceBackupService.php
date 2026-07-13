<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Budget;
use App\Models\Category;
use App\Models\Loan;
use App\Models\LoanInstallment;
use App\Models\LoanPayment;
use App\Models\Note;
use App\Models\Notification;
use App\Models\RecurringBill;
use App\Models\SavingsContribution;
use App\Models\SavingsGoal;
use App\Models\Space;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class FinanceBackupService
{
    public function buildExportPayload(User $user): array
    {
        return [
            'metadata' => [
                'user_id' => $user->id,
                'email' => $user->email,
                'currency' => $user->currency,
                'backup_date' => now()->toIso8601String(),
                'app_name' => config('app.name'),
                'version' => 1,
            ],
            'spaces' => Space::where('user_id', $user->id)->get()->toArray(),
            'accounts' => Account::where('user_id', $user->id)->get()->toArray(),
            'categories' => Category::where('user_id', $user->id)->get()->toArray(),
            'budgets' => Budget::where('user_id', $user->id)->get()->toArray(),
            'transactions' => Transaction::where('user_id', $user->id)->get()->toArray(),
            'loans' => Loan::where('user_id', $user->id)->with('installments')->get()->toArray(),
            'savings_goals' => SavingsGoal::where('user_id', $user->id)->with('contributions')->get()->toArray(),
            'recurring_bills' => RecurringBill::where('user_id', $user->id)->get()->toArray(),
            'notes' => Note::where('user_id', $user->id)->get()->toArray(),
        ];
    }

    public function restoreForUser(User $user, array $data): void
    {
        if (! isset($data['metadata'], $data['spaces'])) {
            throw new \InvalidArgumentException('Invalid backup file structure.');
        }

        $ownerMatch = (isset($data['metadata']['user_id']) && (int) $data['metadata']['user_id'] === $user->id)
            || (isset($data['metadata']['email']) && $data['metadata']['email'] === $user->email);

        if (! $ownerMatch) {
            throw new \InvalidArgumentException('This backup file belongs to another account.');
        }

        Model::withoutEvents(function () use ($user, $data) {
            Model::unguarded(function () use ($user, $data) {
                DB::transaction(function () use ($user, $data) {
                    $this->deleteUserFinancialData($user->id);
                    $this->insertUserFinancialData($user->id, $data);
                    $this->syncAutoIncrementSequences();
                });
            });
        });
    }

    private function deleteUserFinancialData(int $userId): void
    {
        $loanIds = Loan::where('user_id', $userId)->pluck('id');
        LoanInstallment::whereIn('loan_id', $loanIds)->delete();
        LoanPayment::whereIn('loan_id', $loanIds)->delete();
        Loan::where('user_id', $userId)->delete();

        $goalIds = SavingsGoal::where('user_id', $userId)->pluck('id');
        SavingsContribution::whereIn('savings_goal_id', $goalIds)->delete();
        SavingsGoal::where('user_id', $userId)->delete();

        Transaction::where('user_id', $userId)->delete();
        RecurringBill::where('user_id', $userId)->delete();
        Note::where('user_id', $userId)->delete();
        Notification::where('user_id', $userId)->delete();
        Budget::where('user_id', $userId)->delete();
        Category::where('user_id', $userId)->delete();
        Account::where('user_id', $userId)->delete();
        Space::where('user_id', $userId)->delete();
    }

    private function insertUserFinancialData(int $userId, array $data): void
    {
        foreach ($data['spaces'] ?? [] as $row) {
            Space::create($this->prepareRow($row, $userId));
        }

        foreach ($data['accounts'] ?? [] as $row) {
            Account::create($this->prepareRow($row, $userId));
        }

        foreach ($data['categories'] ?? [] as $row) {
            Category::create($this->prepareRow($row, $userId));
        }

        foreach ($data['budgets'] ?? [] as $row) {
            Budget::create($this->prepareRow($row, $userId));
        }

        foreach ($data['loans'] ?? [] as $row) {
            $installments = $row['installments'] ?? [];
            $loanData = $this->prepareRow($row, $userId, ['installments', 'payments']);
            $loan = Loan::create($loanData);

            foreach ($installments as $installment) {
                LoanInstallment::create($this->prepareRow($installment, $userId, [], false, [
                    'loan_id' => $loan->id,
                ]));
            }
        }

        foreach ($data['savings_goals'] ?? [] as $row) {
            $contributions = $row['contributions'] ?? [];
            $goalData = $this->prepareRow($row, $userId, ['contributions']);
            $goal = SavingsGoal::create($goalData);

            foreach ($contributions as $contribution) {
                SavingsContribution::create($this->prepareRow($contribution, $userId, [], false, [
                    'savings_goal_id' => $goal->id,
                ]));
            }
        }

        foreach ($data['recurring_bills'] ?? [] as $row) {
            RecurringBill::create($this->prepareRow($row, $userId));
        }

        foreach ($data['notes'] ?? [] as $row) {
            Note::create($this->prepareRow($row, $userId));
        }

        foreach ($data['transactions'] ?? [] as $row) {
            Transaction::create($this->prepareRow($row, $userId));
        }
    }

    private function prepareRow(
        array $row,
        int $userId,
        array $except = [],
        bool $assignUserId = true,
        array $overrides = []
    ): array {
        $record = collect($row)
            ->except(array_merge(['created_at', 'updated_at'], $except))
            ->toArray();

        if ($assignUserId) {
            $record['user_id'] = $userId;
        }

        return array_merge($record, $overrides);
    }

    private function syncAutoIncrementSequences(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        $tables = [
            'spaces',
            'accounts',
            'categories',
            'budgets',
            'transactions',
            'loans',
            'loan_installments',
            'loan_payments',
            'savings_goals',
            'savings_contributions',
            'recurring_bills',
            'notes',
            'notifications',
        ];

        foreach ($tables as $table) {
            $maxId = DB::table($table)->max('id');

            if ($maxId === null) {
                continue;
            }

            DB::table('sqlite_sequence')
                ->where('name', $table)
                ->update(['seq' => $maxId]);
        }
    }
}
