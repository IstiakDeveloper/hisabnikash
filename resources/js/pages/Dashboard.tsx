import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { formatCurrency, formatRelativeDate } from '@/utils/formatters';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import AccountCard from '@/components/AccountCard';
import TransactionList from '@/components/TransactionList';
import MonthlyChart from '@/components/MonthlyChart';
import CategoryExpenseChart from '@/components/CategoryExpenseChart';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  account_number?: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
}

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  transaction_date: string;
  account: Account;
  category: Category;
}

interface CategoryExpense {
  name: string;
  amount: number;
  color: string;
  icon: string;
}

interface Props {
  accounts: Account[];
  totalBalance: number;
  recentTransactions: Transaction[];
  loanSummary: {
    taken: number;
    given: number;
  };
  monthlySummary: {
    income: number;
    expense: number;
    balance: number;
  };
  categoryExpenses: CategoryExpense[];
}

export default function Dashboard({
  accounts,
  totalBalance,
  recentTransactions,
  loanSummary,
  monthlySummary,
  categoryExpenses
}: Props) {
  const [hideBalance, setHideBalance] = useState(false);

  return (
    <AuthenticatedLayout
      header={
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg lg:text-xl font-semibold text-gray-800 dark:text-gray-200">
              Dashboard
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Welcome back! Here's your financial overview
            </p>
          </div>
        </div>
      }
    >
      <Head title="Dashboard" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Balance Overview */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Balance</p>
              <div className="flex items-center mt-1">
                <p className="text-2xl lg:text-3xl font-bold">
                  {hideBalance ? '••••••' : formatCurrency(totalBalance)}
                </p>
                <button
                  onClick={() => setHideBalance(!hideBalance)}
                  className="ml-3 p-2 rounded-full bg-blue-600/30 hover:bg-blue-600/50 transition-colors"
                >
                  {hideBalance ?
                    <EyeIcon className="h-4 w-4" /> :
                    <EyeSlashIcon className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>
            <BanknotesIcon className="h-12 w-12 text-blue-200 opacity-80" />
          </div>

          {/* Monthly Summary Mini Cards */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center">
                <ArrowTrendingUpIcon className="h-5 w-5 text-green-300 mr-2" />
                <div>
                  <p className="text-xs text-blue-100">This Month Income</p>
                  <p className="text-lg font-semibold text-green-300">
                    {formatCurrency(monthlySummary.income)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center">
                <ArrowTrendingDownIcon className="h-5 w-5 text-red-300 mr-2" />
                <div>
                  <p className="text-xs text-blue-100">This Month Expense</p>
                  <p className="text-lg font-semibold text-red-300">
                    {formatCurrency(monthlySummary.expense)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Accounts Grid */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Your Accounts
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} hideBalance={hideBalance} />
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Monthly Overview
            </h3>
            <MonthlyChart data={monthlySummary} />
          </div>

          {/* Category Expenses */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Category Expenses
            </h3>
            <CategoryExpenseChart data={categoryExpenses} />
          </div>
        </div>

        {/* Loan Summary */}
        {(loanSummary.taken > 0 || loanSummary.given > 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Loan Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">Loans Taken</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-300">
                  {formatCurrency(loanSummary.taken)}
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Loans Given</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(loanSummary.given)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Recent Transactions
          </h3>
          <TransactionList transactions={recentTransactions} showAccount={true} />
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
