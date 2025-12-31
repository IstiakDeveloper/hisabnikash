import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import LoanForm from '@/components/Forms/LoanForm';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Loan {
  id: number;
  type: 'taken' | 'given';
  person_name: string;
  person_phone?: string;
  amount: number;
  loan_date: string;
  due_date?: string;
  note?: string;
  interest_rate?: number;
}

interface Props {
  loan: Loan;
}

export default function Edit({ loan }: Props) {
  const handleSubmit = (data: any) => {
    router.put(`/loans/${loan.id}`, data);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this loan?')) {
      router.delete(`/loans/${loan.id}`);
    }
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/loans"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Edit Loan
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update loan details
              </p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete Loan"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      }
    >
      <Head title="Edit Loan" />

      <div className="p-4 lg:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <LoanForm
              loan={loan}
              onSubmit={handleSubmit}
              submitLabel="Update Loan"
            />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
