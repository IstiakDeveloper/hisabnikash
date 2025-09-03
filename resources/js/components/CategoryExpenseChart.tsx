import React from 'react';
import { formatCurrency } from '@/utils/formatters';

interface CategoryExpense {
  name: string;
  amount: number;
  color: string;
  icon: string;
}

interface Props {
  data: CategoryExpense[];
}

export default function CategoryExpenseChart({ data }: Props) {
  const totalAmount = data.reduce((sum, category) => sum + category.amount, 0);

  if (totalAmount === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No expenses this month</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((category, index) => {
        const percentage = (category.amount / totalAmount) * 100;
        return (
          <div key={category.name} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{category.icon}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {category.name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(category.amount)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: category.color
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
