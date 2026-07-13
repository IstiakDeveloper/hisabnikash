import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import LoanForm from '@/components/Forms/LoanForm';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/hooks/useTranslation';

export default function Create() {
  const { t } = useTranslation();

  const handleSubmit = (data: any) => {
    router.post('/loans', data);
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center space-x-4">
          <Link
            href="/loans"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {t('add_loan_title', 'Add Loan')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('add_loan_desc', 'Record a loan taken or given')}
            </p>
          </div>
        </div>
      }
    >
      <Head title={t('add_loan_title', 'Add Loan')} />

      <div className="p-4 lg:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <LoanForm
              onSubmit={handleSubmit}
              submitLabel={t('create_loan_record', 'Create Loan Record')}
            />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
