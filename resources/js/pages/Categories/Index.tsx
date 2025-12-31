import React, { useState } from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/utils/cn';

interface Category {
  id: number;
  type: 'income' | 'expense';
  name: string;
  icon: string;
  color: string;
  monthly_limit: number | null;
  is_active: boolean;
  is_default: boolean;
  transactions_count: number;
}

interface Props {
  categories: Category[];
}

export default function Index({ categories }: Props) {
  const handleDelete = (categoryId: number, categoryName: string) => {
    if (confirm(`Are you sure you want to delete "${categoryName}" category?`)) {
      router.delete(`/categories/${categoryId}`);
    }
  };

  return (
    <AuthenticatedLayout
      showFAB={false}
      header={
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Category Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your expense and income categories
          </p>
        </div>
      }
    >
      <Head title="Categories" />

      <div className="py-6 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
                Category Management
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage your expense and income categories
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Link
                href="/categories/create"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Category
              </Link>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-gray-800 shadow-sm rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">📁</div>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No categories yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by creating your first category
                </p>
                <div className="mt-6">
                  <Link
                    href="/categories/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create Category
                  </Link>
                </div>
              </div>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className={cn(
                    "bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-2 transition-all",
                    category.is_active
                      ? "border-transparent hover:border-blue-300 dark:hover:border-blue-600"
                      : "border-gray-300 dark:border-gray-600 opacity-60"
                  )}
                >
                  {/* Category Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className="text-4xl p-3 rounded-lg"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        {category.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {category.name}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            category.type === 'income'
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          )}>
                            {category.type === 'income' ? '💰 Income' : '💸 Expense'}
                          </span>
                          {category.is_default && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {category.is_active ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" title="Active" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-500" title="Inactive" />
                      )}
                    </div>
                  </div>

                  {/* Category Stats */}
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Transactions</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {category.transactions_count}
                      </span>
                    </div>
                    {category.monthly_limit && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Monthly Limit</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(category.monthly_limit)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      href={`/categories/${category.id}/edit`}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                    {!category.is_default && (
                      <button
                        onClick={() => handleDelete(category.id, category.name)}
                        disabled={category.transactions_count > 0}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 dark:border-red-600 shadow-sm text-sm font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={category.transactions_count > 0 ? "Cannot delete category with transactions" : "Delete category"}
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
