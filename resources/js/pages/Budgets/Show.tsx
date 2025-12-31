import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { formatCurrency } from '@/utils/formatters';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BellIcon,
  BellSlashIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
}

interface Account {
  name: string;
  type: string;
}

interface Transaction {
  id: number;
  description: string;
  amount: number;
  transaction_date: string;
  category: Category;
  account: Account;
}

interface Budget {
  id: number;
  name: string;
  amount: number;
  spent_amount: number;
  remaining: number;
  spent_percentage: number;
  period: string;
  start_date: string;
  end_date: string;
  category: Category | null;
  is_active: boolean;
  is_exceeded: boolean;
  should_alert: boolean;
  status_color: string;
  status_text: string;
  note: string | null;
  alert_percentage: number;
  notify_on_exceed: boolean;
}

interface Props {
  budget: Budget;
  transactions: Transaction[];
}

export default function Show({ budget, transactions }: Props) {
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this budget?')) {
      router.delete(`/budgets/${budget.id}`);
    }
  };

  const getStatusBadge = () => {
    if (budget.is_exceeded) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
          Budget Exceeded
        </span>
      );
    }
    if (budget.should_alert) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
          Warning: {budget.spent_percentage.toFixed(1)}% used
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircleIcon className="w-4 h-4 mr-1" />
        Normal
      </span>
    );
  };

  const getPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    };
    return labels[period] || period;
  };

  const getProgressBarColor = () => {
    if (budget.is_exceeded) return 'bg-red-500';
    if (budget.should_alert) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const daysRemaining = Math.ceil(
    (new Date(budget.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <AuthenticatedLayout showFAB={false}>
      <Head title={`${budget.name} - Budget Details`} />

      <div className="py-6 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/budgets"
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to budget list
            </Link>
            <div className="md:flex md:items-center md:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  {budget.category && (
                    <span className="text-3xl">{budget.category.icon}</span>
                  )}
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {budget.name}
                  </h2>
                </div>
                {budget.category && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Category: {budget.category.name}
                  </p>
                )}
              </div>
              <div className="mt-4 md:mt-0 flex items-center space-x-3">
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg shadow-sm text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </button>
                <Link
                  href={`/budgets/${budget.id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Budget Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Budget Overview Card */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Budget Summary
                  </h3>
                  {getStatusBadge()}
                </div>

                {/* Progress Circle or Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Spending Progress
                    </span>
                    <span className={cn(
                      "text-2xl font-bold",
                      budget.is_exceeded ? "text-red-600 dark:text-red-400" :
                      budget.should_alert ? "text-yellow-600 dark:text-yellow-400" :
                      "text-green-600 dark:text-green-400"
                    )}>
                      {budget.spent_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div
                      className={cn(
                        "h-4 rounded-full transition-all",
                        getProgressBarColor()
                      )}
                      style={{ width: `${Math.min(budget.spent_percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Budget Numbers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Budget</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(budget.amount)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Spent</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(budget.spent_amount)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remaining</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(budget.remaining)}
                    </p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Period</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getPeriodLabel(budget.period)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Start Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(budget.start_date).toLocaleDateString('bn-BD')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">End Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(budget.end_date).toLocaleDateString('bn-BD')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">বাকি দিন</span>
                    <span className={cn(
                      "font-medium",
                      daysRemaining < 0 ? "text-red-600 dark:text-red-400" :
                      daysRemaining < 7 ? "text-yellow-600 dark:text-yellow-400" :
                      "text-gray-900 dark:text-white"
                    )}>
                      {daysRemaining < 0 ? 'সময় শেষ' : `${daysRemaining} দিন`}
                    </span>
                  </div>
                </div>

                {/* Note */}
                {budget.note && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">নোট:</span> {budget.note}
                    </p>
                  </div>
                )}
              </div>

              {/* Transactions List */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Related Transactions ({transactions.length})
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    All expenses under this budget
                  </p>
                </div>

                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.length === 0 ? (
                    <div className="p-12 text-center">
                      <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        এখনো কোন লেনদেন নেই
                      </p>
                    </div>
                  ) : (
                    transactions.map((transaction) => (
                      <div key={transaction.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <span className="text-2xl">{transaction.category.icon}</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {transaction.description}
                              </p>
                              <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>{transaction.category.name}</span>
                                <span>•</span>
                                <span>{transaction.account.name}</span>
                                <span>•</span>
                                <span>{new Date(transaction.transaction_date).toLocaleDateString('bn-BD')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                              -{formatCurrency(transaction.amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Settings & Info */}
            <div className="space-y-6">
              {/* Alert Settings */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  সতর্কতা সেটিংস
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {budget.notify_on_exceed ? (
                        <BellIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <BellSlashIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {budget.notify_on_exceed ? 'নোটিফিকেশন চালু' : 'নোটিফিকেশন বন্ধ'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        বাজেট অতিক্রম হলে সতর্কবার্তা
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {budget.alert_percentage}% এ সতর্কতা
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        বাজেট এই শতাংশে পৌঁছালে সতর্ক করবে
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className={cn(
                        "w-3 h-3 rounded-full mt-1",
                        budget.is_active ? "bg-green-500" : "bg-gray-400"
                      )}></div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {budget.is_active ? 'সক্রিয় বাজেট' : 'নিষ্ক্রিয় বাজেট'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {budget.is_active ? 'এই বাজেট বর্তমানে ট্র্যাক হচ্ছে' : 'এই বাজেট ট্র্যাক হচ্ছে না'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 shadow-sm rounded-lg p-6 text-white">
                <h3 className="text-lg font-semibold mb-4">Quick Statistics</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-90">Daily Spending Rate</span>
                    <span className="font-semibold">
                      {formatCurrency(budget.spent_amount / Math.max(1, Math.ceil((new Date().getTime() - new Date(budget.start_date).getTime()) / (1000 * 60 * 60 * 24))))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-90">Daily Budget Remaining</span>
                    <span className="font-semibold">
                      {daysRemaining > 0 ? formatCurrency(budget.remaining / daysRemaining) : '৳0'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-90">Total Transactions</span>
                    <span className="font-semibold">{transactions.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
