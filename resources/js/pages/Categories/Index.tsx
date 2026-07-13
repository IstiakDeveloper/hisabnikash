import React from 'react';
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
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();

  const handleDelete = (categoryId: number, categoryName: string) => {
    if (confirm(t('delete_category_named_confirm', `Are you sure you want to delete "${categoryName}" category?`))) {
      router.delete(`/categories/${categoryId}`);
    }
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex justify-between items-center w-full">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {t('category_management', 'Category Management')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('manage_categories_desc', 'Manage your expense and income categories')}
            </p>
          </div>
          <Link
            href="/categories/create"
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors shadow-sm"
            title={t('new_category', 'New Category')}
          >
            <PlusIcon className="h-5 w-5" />
          </Link>
        </div>
      }
    >
      <Head title={t('categories', 'Categories')} />

      <div className="p-4 space-y-6">
        <div className="max-w-md mx-auto">
          <div className="grid grid-cols-1 gap-4">
            {categories.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">📁</div>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('no_categories_yet', 'No categories yet')}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('get_started_category', 'Get started by creating your first category')}
                </p>
                <div className="mt-6">
                  <Link
                    href="/categories/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    {t('create_category', 'Create Category')}
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
                            {category.type === 'income' ? `💰 ${t('income_label', 'Income')}` : `💸 ${t('expense_label', 'Expense')}`}
                          </span>
                          {category.is_default && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              {t('default_label', 'Default')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {category.is_active ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" title={t('active', 'Active')} />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-500" title={t('inactive', 'Inactive')} />
                      )}
                    </div>
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{t('transactions', 'Transactions')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {category.transactions_count}
                      </span>
                    </div>
                    {category.monthly_limit && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{t('monthly_limit', 'Monthly Limit')}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(category.monthly_limit)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      href={`/categories/${category.id}/edit`}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      {t('edit', 'Edit')}
                    </Link>
                    <button
                      onClick={() => handleDelete(category.id, category.name)}
                      disabled={category.transactions_count > 0}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 dark:border-red-600 shadow-sm text-sm font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={category.transactions_count > 0 ? t('cannot_delete_with_transactions', 'Cannot delete category with transactions') : t('delete', 'Delete')}
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      {t('delete', 'Delete')}
                    </button>
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
