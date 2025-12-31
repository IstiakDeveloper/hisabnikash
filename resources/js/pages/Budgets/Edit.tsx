import React, { FormEvent } from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
}

interface Budget {
  id: number;
  name: string;
  amount: number;
  category_id: number | null;
  period: string;
  start_date: string;
  end_date: string;
  note: string | null;
  alert_percentage: number;
  notify_on_exceed: boolean;
  is_active: boolean;
}

interface Props {
  budget: Budget;
  categories: Category[];
}

export default function Edit({ budget, categories }: Props) {
  const { data, setData, put, processing, errors } = useForm({
    name: budget.name,
    category_id: budget.category_id?.toString() || '',
    amount: budget.amount.toString(),
    period: budget.period,
    start_date: budget.start_date,
    end_date: budget.end_date,
    note: budget.note || '',
    alert_percentage: budget.alert_percentage.toString(),
    notify_on_exceed: budget.notify_on_exceed,
    is_active: budget.is_active,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    put(`/budgets/${budget.id}`);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this budget?')) {
      router.delete(`/budgets/${budget.id}`);
    }
  };

  return (
    <AuthenticatedLayout showFAB={false}>
      <Head title="Edit Budget" />

      <div className="py-6 lg:py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/budgets"
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to budgets
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Edit Budget
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {budget.name}
                </p>
              </div>
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
            <div className="p-6 space-y-6">
              {/* Budget Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category (Optional)
                </label>
                <select
                  id="category_id"
                  value={data.category_id}
                  onChange={(e) => setData('category_id', e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All Categories (Overall Budget)</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category_id}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget Amount (৳) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  value={data.amount}
                  onChange={(e) => setData('amount', e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  step="0.01"
                  min="0"
                  required
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount}</p>
                )}
              </div>

              {/* Period */}
              <div>
                <label htmlFor="period" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget Period <span className="text-red-500">*</span>
                </label>
                <select
                  id="period"
                  value={data.period}
                  onChange={(e) => setData('period', e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                {errors.period && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.period}</p>
                )}
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    value={data.start_date}
                    onChange={(e) => setData('start_date', e.target.value)}
                    className="mt-1 block w-full px-4 py-2.5 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.start_date}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    value={data.end_date}
                    onChange={(e) => setData('end_date', e.target.value)}
                    className="mt-1 block w-full px-4 py-2.5 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                  {errors.end_date && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.end_date}</p>
                  )}
                </div>
              </div>

              {/* Alert Settings */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Alert Settings
                </h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="alert_percentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Alert Percentage (%)
                    </label>
                    <input
                      type="number"
                      id="alert_percentage"
                      value={data.alert_percentage}
                      onChange={(e) => setData('alert_percentage', e.target.value)}
                      className="mt-1 block w-full px-4 py-2.5 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      min="0"
                      max="100"
                    />
                    {errors.alert_percentage && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.alert_percentage}</p>
                    )}
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="notify_on_exceed"
                      checked={data.notify_on_exceed}
                      onChange={(e) => setData('notify_on_exceed', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="notify_on_exceed" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Send notification when budget is exceeded
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={data.is_active}
                      onChange={(e) => setData('is_active', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Keep budget active
                    </label>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Note (Optional)
                </label>
                <textarea
                  id="note"
                  value={data.note}
                  onChange={(e) => setData('note', e.target.value)}
                  rows={3}
                  className="mt-1 block w-full px-4 py-2.5 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {errors.note && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.note}</p>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3">
              <Link
                href="/budgets"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={processing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
