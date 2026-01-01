import React from 'react';
import { Link } from '@inertiajs/react';
import { formatCurrency, formatRelativeDate } from '@/utils/formatters';
import { ArrowUpIcon, ArrowDownIcon, PencilIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface Account {
  id: number;
  name: string;
  type: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
}

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  transaction_date: string;
  account: Account;
  category: Category;
}

interface Props {
  transactions: Transaction[];
  showAccount?: boolean;
  showCategory?: boolean;
  limit?: number;
}

export default function TransactionList({
  transactions,
  showAccount = false,
  showCategory = true,
  limit
}: Props) {
  const displayTransactions = limit ? transactions.slice(0, limit) : transactions;

  if (displayTransactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No transactions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {displayTransactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Category Icon with colored background */}
            <div className={cn(
              "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0",
              transaction.type === 'income'
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-red-100 dark:bg-red-900/30"
            )}>
              <span className="text-lg sm:text-xl">{transaction.category.icon}</span>
            </div>

            {/* Transaction Details */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                {transaction.description}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {formatRelativeDate(transaction.transaction_date)}
              </p>
            </div>
          </div>

          {/* Amount and Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-3">
            <div className="text-right">
              <p className={cn(
                "font-bold text-sm sm:text-base",
                transaction.type === 'income'
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
              </p>
              {showAccount && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[100px]">
                  {transaction.account.name}
                </p>
              )}
            </div>

            {/* Edit Button */}
            <Link
              href={`/transactions/${transaction.id}/edit`}
              className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="Edit Transaction"
            >
              <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
