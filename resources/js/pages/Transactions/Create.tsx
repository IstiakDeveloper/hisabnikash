import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import TransactionForm from '@/components/Forms/TransactionForm';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/hooks/useTranslation';

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

interface Props {
  accounts: Account[];
  categories: Category[];
  spaces: any[];
  budgets: any[];
}

export default function Create({ accounts, categories, spaces, budgets }: Props) {
  const { t } = useTranslation();

  const handleSubmit = (data: any) => {
    router.post('/transactions', data);
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center space-x-4">
          <Link
            href="/transactions"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {t('add_transaction_title', 'Add New Transaction')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('add_transaction_subtitle', 'Record your income or expense')}
            </p>
          </div>
        </div>
      }
    >
      <Head title={t('add_transaction_title', 'Add New Transaction')} />

      <div className="p-4 lg:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <TransactionForm
              accounts={accounts}
              categories={categories}
              spaces={spaces}
              budgets={budgets}
              onSubmit={handleSubmit}
              submitLabel={t('add_transaction_title', 'Add New Transaction')}
            />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
