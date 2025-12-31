import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { formatCurrency } from '@/utils/formatters';
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
}

interface Props {
  accounts: Account[];
  cashAccount: Account | null;
}

export default function CashOut({ accounts, cashAccount }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    from_account_id: '',
    amount: '',
    note: '',
  });

  const selectedAccount = accounts.find(acc => acc.id === Number(data.from_account_id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/transfers/cash-out');
  };

  if (!cashAccount) {
    return (
      <AuthenticatedLayout
        header={
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Cash Out
              </h2>
            </div>
          </div>
        }
      >
        <Head title="Cash Out" />
        <div className="p-4 lg:p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
              <p className="text-yellow-800 dark:text-yellow-200">
                No cash account found. Please create a cash account first.
              </p>
              <Link
                href="/accounts/create"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Create Cash Account
              </Link>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Cash Out
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Transfer money to cash account
            </p>
          </div>
        </div>
      }
    >
      <Head title="Cash Out" />

      <div className="p-4 lg:p-6">
        <div className="max-w-2xl mx-auto">
          {/* Cash Account Balance Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 mb-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm mb-1">Cash Account Balance</p>
                <p className="text-3xl font-bold">{formatCurrency(cashAccount.balance)}</p>
              </div>
              <div className="p-4 bg-white/20 rounded-full">
                <ArrowDownTrayIcon className="h-8 w-8" />
              </div>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No other accounts available for cash out.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* From Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    From Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={data.from_account_id}
                    onChange={(e) => setData('from_account_id', e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  >
                    <option value="">Select Account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {formatCurrency(account.balance)}
                      </option>
                    ))}
                  </select>
                  {errors.from_account_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.from_account_id}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400">৳</span>
                    <input
                      type="number"
                      step="0.01"
                      value={data.amount}
                      onChange={(e) => setData('amount', e.target.value)}
                      max={selectedAccount?.balance || undefined}
                      className="w-full pl-8 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  {selectedAccount && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Available: {formatCurrency(selectedAccount.balance)}
                    </p>
                  )}
                  {errors.amount && (
                    <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
                  )}
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Note (Optional)
                  </label>
                  <textarea
                    value={data.note}
                    onChange={(e) => setData('note', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Add a note for this cash out..."
                  />
                  {errors.note && (
                    <p className="text-red-500 text-sm mt-1">{errors.note}</p>
                  )}
                </div>

                {/* Transfer Summary */}
                {selectedAccount && data.amount && Number(data.amount) > 0 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Transfer Summary
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700 dark:text-blue-300">From:</span>
                        <span className="font-medium text-blue-900 dark:text-blue-100">
                          {selectedAccount.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700 dark:text-blue-300">To:</span>
                        <span className="font-medium text-blue-900 dark:text-blue-100">
                          {cashAccount.name}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
                        <span className="text-blue-700 dark:text-blue-300">Amount:</span>
                        <span className="font-bold text-blue-900 dark:text-blue-100">
                          {formatCurrency(Number(data.amount))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3">
                  <Link
                    href="/dashboard"
                    className="flex-1 px-4 py-3 text-center border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Processing...' : 'Complete Cash Out'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
