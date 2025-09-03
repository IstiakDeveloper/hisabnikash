import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import AccountForm from '@/Components/Forms/AccountForm';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function Create() {
  const handleSubmit = (data: any) => {
    router.post('/accounts', data);
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center space-x-4">
          <Link
            href="/accounts"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Add Account
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create a new account to track your finances
            </p>
          </div>
        </div>
      }
    >
      <Head title="Add Account" />

      <div className="p-4 lg:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <AccountForm
              onSubmit={handleSubmit}
              submitLabel="Create Account"
            />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
