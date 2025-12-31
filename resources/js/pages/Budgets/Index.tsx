import React, { useState } from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { formatCurrency } from '@/utils/formatters';
import {
  PlusIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalendarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

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
  spent_amount: number;
  remaining: number;
  spent_percentage: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  category: Category | null;
  is_active: boolean;
  is_exceeded: boolean;
  should_alert: boolean;
  status_color: string;
  status_text: string;
  note: string | null;
}

interface BudgetSummary {
  total_budget: number;
  total_spent: number;
  total_remaining: number;
  exceeded_count: number;
  alert_count: number;
}

interface Props {
  budgets: {
    data: Budget[];
    links: any;
    current_page: number;
    last_page: number;
  };
  summary: BudgetSummary;
  filters: {
    status?: string;
    period?: string;
  };
}

export default function Index({ budgets, summary, filters }: Props) {
  const [statusFilter, setStatusFilter] = useState(filters.status || '');
  const [periodFilter, setPeriodFilter] = useState(filters.period || '');

  const handleFilter = (status: string, period: string) => {
    router.get('/budgets', {
      status: status || undefined,
      period: period || undefined,
    }, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const handleRefresh = () => {
    router.post('/budgets/refresh', {}, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const handleDelete = (budgetId: number, budgetName: string) => {
    if (confirm(`Are you sure you want to delete "${budgetName}" budget?`)) {
      router.delete(`/budgets/${budgetId}`, {
        preserveScroll: true,
      });
    }
  };

  const getStatusBadge = (budget: Budget) => {
    if (budget.is_exceeded) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
          Exceeded
        </span>
      );
    }
    if (budget.should_alert) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
          Warning
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircleIcon className="w-3 h-3 mr-1" />
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

  const getProgressBarColor = (budget: Budget) => {
    if (budget.is_exceeded) return 'bg-red-500';
    if (budget.should_alert) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <AuthenticatedLayout
      showFAB={false}
      header={
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Budget Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and manage all your budgets
          </p>
        </div>
      }
    >
      <Head title="Budget Management" />

      <div className="py-6 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
                Budget Management
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                View and manage all your budgets
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowPathIcon className="h-5 w-5 mr-2" />
                Refresh
              </button>
              <Link
                href="/budgets/create"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Budget
              </Link>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5 mb-6">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg">
              <div className="p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Total Budget
                      </dt>
                      <dd className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(summary.total_budget)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg">
              <div className="p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Spent
                      </dt>
                      <dd className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(summary.total_spent)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg">
              <div className="p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Remaining
                      </dt>
                      <dd className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(summary.total_remaining)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg">
              <div className="p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Alerts
                      </dt>
                      <dd className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                        {summary.exceeded_count + summary.alert_count}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-4">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    handleFilter(e.target.value, periodFilter);
                  }}
                  className="block w-full px-4 py-2.5 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="exceeded">Exceeded</option>
                  <option value="completed">Completed</option>
                </select>

                <select
                  value={periodFilter}
                  onChange={(e) => {
                    setPeriodFilter(e.target.value);
                    handleFilter(statusFilter, e.target.value);
                  }}
                  className="block w-full px-4 py-2.5 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  <option value="">All Periods</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
          </div>

          {/* Budget List */}
          <div className="space-y-4">
            {budgets.data.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-12 text-center">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No budgets yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by creating a new budget
                </p>
                <div className="mt-6">
                  <Link
                    href="/budgets/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create New Budget
                  </Link>
                </div>
              </div>
            ) : (
              budgets.data.map((budget) => (
                <div
                  key={budget.id}
                  className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-4 lg:p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {budget.category && (
                            <span className="text-xl">{budget.category.icon}</span>
                          )}
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {budget.name}
                          </h3>
                        </div>
                        {budget.category && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {budget.category.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(budget)}
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {getPeriodLabel(budget.period)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatCurrency(budget.spent_amount)} / {formatCurrency(budget.amount)}
                        </span>
                        <span className={cn(
                          "text-sm font-bold",
                          budget.is_exceeded ? "text-red-600 dark:text-red-400" :
                          budget.should_alert ? "text-yellow-600 dark:text-yellow-400" :
                          "text-green-600 dark:text-green-400"
                        )}>
                          {budget.spent_percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div
                          className={cn(
                            "h-2.5 rounded-full transition-all",
                            getProgressBarColor(budget)
                          )}
                          style={{ width: `${Math.min(budget.spent_percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Budget Info */}
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>
                          {new Date(budget.start_date).toLocaleDateString('bn-BD')} - {new Date(budget.end_date).toLocaleDateString('bn-BD')}
                        </span>
                      </div>
                      <div className="font-medium">
                        Remaining: {formatCurrency(budget.remaining)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Link
                        href={`/budgets/${budget.id}`}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500"
                      >
                        View Details →
                      </Link>
                      <div className="flex space-x-2">
                        <Link
                          href={`/budgets/${budget.id}/edit`}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(budget.id, budget.name)}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-600 shadow-sm text-xs font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {budgets.last_page > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                পেজ {budgets.current_page} of {budgets.last_page}
              </div>
              <div className="flex space-x-2">
                {budgets.links.map((link: any, index: number) => (
                  <Link
                    key={index}
                    href={link.url || '#'}
                    className={cn(
                      "px-3 py-2 text-sm font-medium rounded-md",
                      link.active
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700",
                      !link.url && "opacity-50 cursor-not-allowed"
                    )}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
