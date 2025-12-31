import React from 'react';
import { Link } from '@inertiajs/react';
import { formatCurrency } from '@/utils/formatters';
import { ExclamationTriangleIcon, CheckCircleIcon, CalendarIcon } from '@heroicons/react/24/outline';
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
  period: string;
  start_date: string;
  end_date: string;
  category: Category | null;
  is_exceeded: boolean;
  should_alert: boolean;
  status_color: string;
  status_text: string;
}

interface Props {
  budget: Budget;
  compact?: boolean;
}

export default function BudgetCard({ budget, compact = false }: Props) {
  const getStatusBadge = () => {
    if (budget.is_exceeded) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
          অতিক্রম
        </span>
      );
    }
    if (budget.should_alert) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
          সতর্কতা
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircleIcon className="w-3 h-3 mr-1" />
        OK
      </span>
    );
  };

  const getPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      daily: 'দৈনিক',
      weekly: 'সাপ্তাহিক',
      monthly: 'মাসিক',
      yearly: 'বার্ষিক',
    };
    return labels[period] || period;
  };

  const getProgressBarColor = () => {
    if (budget.is_exceeded) return 'bg-red-500';
    if (budget.should_alert) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (compact) {
    return (
      <Link
        href={`/budgets/${budget.id}`}
        className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {budget.category && (
              <span className="text-lg">{budget.category.icon}</span>
            )}
            <span className="font-medium text-gray-900 dark:text-white text-sm">
              {budget.name}
            </span>
          </div>
          <span className={cn(
            "text-xs font-semibold",
            budget.is_exceeded ? 'text-red-600 dark:text-red-400' :
            budget.should_alert ? 'text-yellow-600 dark:text-yellow-400' :
            'text-green-600 dark:text-green-400'
          )}>
            {budget.spent_percentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={cn("h-2 rounded-full transition-all", getProgressBarColor())}
            style={{ width: `${Math.min(budget.spent_percentage, 100)}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span>
            {formatCurrency(budget.spent_amount)} / {formatCurrency(budget.amount)}
          </span>
          <span>বাকি: {formatCurrency(budget.remaining)}</span>
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-shadow">
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
            {getStatusBadge()}
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
              className={cn("h-2.5 rounded-full transition-all", getProgressBarColor())}
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
            বাকি: {formatCurrency(budget.remaining)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <Link
            href={`/budgets/${budget.id}`}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500"
          >
            বিস্তারিত দেখুন →
          </Link>
          <div className="flex space-x-2">
            <Link
              href={`/budgets/${budget.id}/edit`}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              সম্পাদনা
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
