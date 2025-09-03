import React from 'react';
import { Link } from '@inertiajs/react';
import { formatCurrency, formatRelativeDate } from '@/utils/formatters';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
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
    <div className="space-y-3">
      {displayTransactions.map((transaction) => (
        <Link
          key={transaction.id}
          href={`/transactions/${transaction.id}`}
          className="block bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-4 transition-colors duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Transaction Type Icon */}
              <div className={cn(
                "p-2 rounded-full",
                transaction.type === 'income'
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-red-100 dark:bg-red-900/30"
              )}>
                {transaction.type === 'income' ? (
                  <ArrowUpIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
              </div>

              {/* Transaction Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  {showCategory && (
                    <span className="text-sm">{transaction.category.icon}</span>
                  )}
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                    {transaction.description}
                  </h4>
                </div>

                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  {showAccount && (
                    <>
                      <span>{transaction.account.name}</span>
                      <span>•</span>
                    </>
                  )}
                  {showCategory && (
                    <>
                      <span>{transaction.category.name}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{formatRelativeDate(transaction.transaction_date)}</span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="text-right">
              <p className={cn(
                "font-semibold text-sm",
                transaction.type === 'income'
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </p>
            </div>
          </div>
        </Link>
      ))}

      {limit && transactions.length > limit && (
        <Link
          href="/transactions"
          className="block text-center py-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
        >
          View all transactions
        </Link>
      )}
    </div>
  );
}
