import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { formatCurrency } from '@/utils/formatters';
import { ArrowLeftIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
}

interface Props {
  accounts: Account[];
}

export default function BalanceTransfer({ accounts }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    note: '',
  });

  const fromAccount = accounts.find(acc => acc.id === Number(data.from_account_id));
  const toAccount = accounts.find(acc => acc.id === Number(data.to_account_id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/transfers/balance-transfer');
  };

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
              Balance Transfer
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Transfer money between accounts
            </p>
          </div>
        </div>
      }
    >
      <Head title="Balance Transfer" />

      <div className="p-4 lg:p-6">
        <div className="max-w-2xl mx-auto">
          {accounts.length < 2 ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
              <p className="text-yellow-800 dark:text-yellow-200 mb-4">
                You need at least 2 accounts to perform a balance transfer.
              </p>
              <Link
                href="/accounts/create"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Create New Account
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-center mb-6">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                  <ArrowsRightLeftIcon className="h-8 w-8 text-white" />
                </div>
              </div>

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
                    <option value="">Select Source Account</option>
                    {accounts
                      .filter(acc => acc.id !== Number(data.to_account_id))
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.type.replace('_', ' ')}) - {formatCurrency(account.balance)}
                        </option>
                      ))}
                  </select>
                  {fromAccount && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Available: {formatCurrency(fromAccount.balance)}
                    </p>
                  )}
                  {errors.from_account_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.from_account_id}</p>
                  )}
                </div>

                {/* To Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    To Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={data.to_account_id}
                    onChange={(e) => setData('to_account_id', e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  >
                    <option value="">Select Destination Account</option>
                    {accounts
                      .filter(acc => acc.id !== Number(data.from_account_id))
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.type.replace('_', ' ')}) - {formatCurrency(account.balance)}
                        </option>
                      ))}
                  </select>
                  {toAccount && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Current balance: {formatCurrency(toAccount.balance)}
                    </p>
                  )}
                  {errors.to_account_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.to_account_id}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Transfer Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400">৳</span>
                    <input
                      type="number"
                      step="0.01"
                      value={data.amount}
                      onChange={(e) => setData('amount', e.target.value)}
                      max={fromAccount?.balance || undefined}
                      className="w-full pl-8 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  {fromAccount && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Maximum: {formatCurrency(fromAccount.balance)}
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
                    placeholder="Add a note for this transfer..."
                  />
                  {errors.note && (
                    <p className="text-red-500 text-sm mt-1">{errors.note}</p>
                  )}
                </div>

                {/* Transfer Summary */}
                {fromAccount && toAccount && data.amount && Number(data.amount) > 0 && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Transfer Summary
                    </p>

                    <div className="space-y-3">
                      {/* From */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">From</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {fromAccount.name}
                        </p>
                        <div className="flex justify-between mt-1 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Current:</span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {formatCurrency(fromAccount.balance)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">After:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            {formatCurrency(fromAccount.balance - Number(data.amount))}
                          </span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-center">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                          <ArrowsRightLeftIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>

                      {/* To */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">To</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {toAccount.name}
                        </p>
                        <div className="flex justify-between mt-1 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Current:</span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {formatCurrency(toAccount.balance)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">After:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(toAccount.balance + Number(data.amount))}
                          </span>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Transfer Amount:</span>
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(Number(data.amount))}
                          </span>
                        </div>
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
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Processing...' : 'Complete Transfer'}
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
