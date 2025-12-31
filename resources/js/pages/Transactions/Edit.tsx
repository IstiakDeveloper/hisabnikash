import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import TransactionForm from '@/components/Forms/TransactionForm';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Account {
  id: number;
  name: string;
  type: string;
}

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
}

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  transaction_date: string;
  account_id: number;
  category_id: number;
}

interface Props {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
}

export default function Edit({ transaction, accounts, categories }: Props) {
  const handleSubmit = (data: any) => {
    router.put(`/transactions/${transaction.id}`, data);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      router.delete(`/transactions/${transaction.id}`);
    }
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/transactions"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Edit Transaction
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update transaction details
              </p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete Transaction"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      }
    >
      <Head title="Edit Transaction" />

      <div className="p-4 lg:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <TransactionForm
              transaction={transaction}
              accounts={accounts}
              categories={categories}
              onSubmit={handleSubmit}
              submitLabel="Update Transaction"
            />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
