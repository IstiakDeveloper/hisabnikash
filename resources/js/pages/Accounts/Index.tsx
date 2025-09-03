
import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import AccountCard from '@/components/AccountCard';
import { PlusIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { formatCurrencySimple } from '@/utils/formatters'; // Use the simple formatter
import { useState } from 'react';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  account_number?: string;
  is_active: boolean;
  transactions?: any[];
}

interface Props {
  accounts: Account[];
}

export default function Index({ accounts }: Props) {
  const [hideBalance, setHideBalance] = useState(false);

  // Calculate totals properly
  const activeAccounts = accounts.filter(account => account.is_active);
  const totalBalance = activeAccounts.reduce((sum, account) => {
    const balance = typeof account.balance === 'string' ? parseFloat(account.balance) : account.balance;
    return sum + (isNaN(balance) ? 0 : balance);
  }, 0);

  const accountStats = {
    total: accounts.length,
    active: activeAccounts.length,
    inactive: accounts.length - activeAccounts.length,
    totalBalance: totalBalance
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Accounts
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Balance: {hideBalance ? '••••••' : formatCurrencySimple(totalBalance)}
              </p>
              <button
                onClick={() => setHideBalance(!hideBalance)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title={hideBalance ? 'Show balance' : 'Hide balance'}
              >
                {hideBalance ?
                  <EyeIcon className="h-4 w-4" /> :
                  <EyeSlashIcon className="h-4 w-4" />
                }
              </button>
            </div>
          </div>
          <Link
            href="/accounts/create"
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors shadow-lg hover:shadow-xl"
            title="Add New Account"
          >
            <PlusIcon className="h-5 w-5" />
          </Link>
        </div>
      }
    >
      <Head title="Accounts" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Account Statistics */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">🏦</span>
                </div>
                <div>
                  <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total Accounts</p>
                  <p className="text-blue-700 dark:text-blue-300 font-bold text-xl">{accountStats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                  <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
                </div>
                <div>
                  <p className="text-green-600 dark:text-green-400 text-sm font-medium">Active</p>
                  <p className="text-green-700 dark:text-green-300 font-bold text-xl">{accountStats.active}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 dark:bg-gray-900/30 rounded-lg mr-3">
                  <span className="text-gray-600 dark:text-gray-400 text-lg">⏸️</span>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Inactive</p>
                  <p className="text-gray-700 dark:text-gray-300 font-bold text-xl">{accountStats.inactive}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                  <span className="text-purple-600 dark:text-purple-400 text-lg">💰</span>
                </div>
                <div>
                  <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Total Value</p>
                  <p className="text-purple-700 dark:text-purple-300 font-bold text-lg">
                    {hideBalance ? '••••••' : formatCurrencySimple(totalBalance)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Accounts Grid or Empty State */}
        {accounts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">🏦</div>
            <h3 className="text-2xl font-medium text-gray-900 dark:text-gray-100 mb-3">
              No accounts yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Create your first account to start tracking your finances.
              You can add bank accounts, mobile banking, cash, or cards.
            </p>
            <Link
              href="/accounts/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Your First Account
            </Link>
          </div>
        ) : (
          <div>
            {/* Active Accounts */}
            {activeAccounts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Active Accounts ({activeAccounts.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                  {activeAccounts.map((account) => (
                    <AccountCard key={account.id} account={account} hideBalance={hideBalance} />
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Accounts */}
            {accountStats.inactive > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-4">
                  Inactive Accounts ({accountStats.inactive})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {accounts.filter(account => !account.is_active).map((account) => (
                    <div key={account.id} className="opacity-60">
                      <AccountCard account={account} hideBalance={hideBalance} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        {accounts.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/accounts/create"
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">➕</div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Add Account</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Create new account</p>
                </div>
              </Link>

              <Link
                href="/transactions/create"
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">💸</div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Add Transaction</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Record income/expense</p>
                </div>
              </Link>

              <Link
                href="/transactions"
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">View Transactions</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">See all activities</p>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
