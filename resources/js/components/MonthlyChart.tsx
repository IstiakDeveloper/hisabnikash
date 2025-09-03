import React from 'react';
import { formatCurrency } from '@/utils/formatters';

interface Props {
  data: {
    income: number;
    expense: number;
    balance: number;
  };
}

export default function MonthlyChart({ data }: Props) {
  const maxAmount = Math.max(data.income, data.expense);
  const incomeWidth = maxAmount > 0 ? (data.income / maxAmount) * 100 : 0;
  const expenseWidth = maxAmount > 0 ? (data.expense / maxAmount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Income Bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Income</span>
          <span className="text-sm font-bold text-green-600 dark:text-green-400">
            {formatCurrency(data.income)}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${incomeWidth}%` }}
          />
        </div>
      </div>

      {/* Expense Bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Expense</span>
          <span className="text-sm font-bold text-red-600 dark:text-red-400">
            {formatCurrency(data.expense)}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-red-500 h-3 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${expenseWidth}%` }}
          />
        </div>
      </div>

      {/* Net Balance */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Net Balance</span>
          <span className={`text-sm font-bold ${
            data.balance >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {data.balance >= 0 ? '+' : ''}{formatCurrency(data.balance)}
          </span>
        </div>
      </div>
    </div>
  );
}
