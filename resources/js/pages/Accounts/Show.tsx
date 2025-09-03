import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { formatCurrency, formatDate, getAccountTypeIcon } from '@/utils/formatters';
import TransactionList from '@/components/TransactionList';
import {
  ArrowLeftIcon,
  PencilIcon,
  PlusIcon,
  BanknotesIcon,
  CalendarIcon,
  BuildingLibraryIcon,
  CreditCardIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { cn } from '@/utils/cn';

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  transaction_date: string;
  note?: string;
  category: Category;
}

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  account_number?: string;
  bank_branch?: string;
  is_active: boolean;
  created_at: string;
  transactions: Transaction[];
}

interface Props {
  account: Account;
}

export default function Show({ account }: Props) {
  const [hideBalance, setHideBalance] = useState(false);

  const getAccountTypeDetails = (type: string) => {
    const types = {
      bank: {
        label: 'Bank Account',
        icon: BuildingLibraryIcon,
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800'
      },
      mobile_banking: {
        label: 'Mobile Banking',
        icon: CreditCardIcon,
        color: 'bg-green-500',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800'
      },
      cash: {
        label: 'Cash',
        icon: BanknotesIcon,
        color: 'bg-yellow-500',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800'
      },
      card: {
        label: 'Card',
        icon: CreditCardIcon,
        color: 'bg-purple-500',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800'
      },
    };
    return types[type as keyof typeof types] || types.bank;
  };

  const typeDetails = getAccountTypeDetails(account.type);
  const TypeIcon = typeDetails.icon;

  // Calculate transaction stats
  const totalIncome = account.transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = account.transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const thisMonthTransactions = account.transactions.filter(transaction => {
    const transactionDate = new Date(transaction.transaction_date);
    const now = new Date();
    return transactionDate.getMonth() === now.getMonth() &&
           transactionDate.getFullYear() === now.getFullYear();
  });

  const handleAddTransaction = () => {
    router.get(`/transactions/create?account_id=${account.id}`);
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/accounts"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </Link>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {account.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {typeDetails.label}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleAddTransaction}
              className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
              title="Add Transaction"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
            <Link
              href={`/accounts/${account.id}/edit`}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
              title="Edit Account"
            >
              <PencilIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      }
    >
      <Head title={`${account.name} - Account Details`} />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Account Overview Card */}
        <div className={cn(
          "rounded-2xl p-6 border",
          typeDetails.bgColor,
          typeDetails.borderColor
        )}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={cn("p-4 rounded-xl text-white", typeDetails.color)}>
                <TypeIcon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {account.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {typeDetails.label}
                </p>
                {account.account_number && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    •••• •••• •••• {account.account_number.slice(-4)}
                  </p>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-medium",
              account.is_active
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400"
            )}>
              {account.is_active ? '✓ Active' : '⚠ Inactive'}
            </div>
          </div>

          {/* Balance Display */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Current Balance
              </p>
              <button
                onClick={() => setHideBalance(!hideBalance)}
                className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-black/10 transition-colors"
                title={hideBalance ? 'Show Balance' : 'Hide Balance'}
              >
                {hideBalance ?
                  <EyeIcon className="h-4 w-4 text-gray-600" /> :
                  <EyeSlashIcon className="h-4 w-4 text-gray-600" />
                }
              </button>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {hideBalance ? '••••••' : formatCurrency(account.balance)}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalIncome)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Income</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalExpenses)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {account.transactions.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Transactions</p>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Account Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Account Type:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {typeDetails.label}
                </span>
              </div>

              {account.account_number && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Account Number:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {account.account_number}
                  </span>
                </div>
              )}

              {account.bank_branch && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Branch:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {account.bank_branch}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                <span className={cn(
                  "font-medium",
                  account.is_active
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-600 dark:text-gray-400"
                )}>
                  {account.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Created:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(account.created_at)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">This Month:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {thisMonthTransactions.length} transactions
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Recent Transactions
              </h3>
              <button
                onClick={handleAddTransaction}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Transaction
              </button>
            </div>
          </div>

          <div className="p-6">
            {account.transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No transactions yet
                </h4>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Start tracking your finances by adding your first transaction to this account.
                </p>
                <button
                  onClick={handleAddTransaction}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add First Transaction
                </button>
              </div>
            ) : (
              <>
                <TransactionList
                  transactions={account.transactions.slice(0, 10)}
                  showAccount={false}
                  showCategory={true}
                />

                {account.transactions.length > 10 && (
                  <div className="mt-6 text-center">
                    <Link
                      href={`/transactions?account_id=${account.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                      View all {account.transactions.length} transactions →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => router.get(`/transactions/create?account_id=${account.id}&type=income`)}
            className="bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center transition-colors"
          >
            <div className="text-green-600 dark:text-green-400 text-2xl mb-2">💰</div>
            <h4 className="font-medium text-green-700 dark:text-green-300">Add Income</h4>
            <p className="text-sm text-green-600 dark:text-green-400">Record money received</p>
          </button>

          <button
            onClick={() => router.get(`/transactions/create?account_id=${account.id}&type=expense`)}
            className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center transition-colors"
          >
            <div className="text-red-600 dark:text-red-400 text-2xl mb-2">💸</div>
            <h4 className="font-medium text-red-700 dark:text-red-300">Add Expense</h4>
            <p className="text-sm text-red-600 dark:text-red-400">Record money spent</p>
          </button>

          <Link
            href={`/accounts/${account.id}/edit`}
            className="bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center transition-colors"
          >
            <div className="text-blue-600 dark:text-blue-400 text-2xl mb-2">⚙️</div>
            <h4 className="font-medium text-blue-700 dark:text-blue-300">Edit Account</h4>
            <p className="text-sm text-blue-600 dark:text-blue-400">Update account details</p>
          </Link>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
