import React, { useState } from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  UserIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowDownLeftIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface Account {
  id: number;
  name: string;
  type: string;
}

interface LoanPayment {
  id: number;
  amount: number;
  payment_date: string;
  note?: string;
  account: Account;
}

interface Loan {
  id: number;
  type: 'taken' | 'given';
  person_name: string;
  person_phone?: string;
  amount: number;
  remaining_amount: number;
  loan_date: string;
  due_date?: string;
  note?: string;
  interest_rate?: number;
  is_completed: boolean;
  payments: LoanPayment[];
}

interface Props {
  loan: Loan;
  accounts: Account[];
}

export default function Show({ loan, accounts }: Props) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { data, setData, post, processing, errors, reset } = useForm({
    account_id: '',
    amount: '',
    note: '',
  });

  const isOverdue = loan.due_date && new Date(loan.due_date) < new Date() && !loan.is_completed;
  const progressPercent = ((loan.amount - loan.remaining_amount) / loan.amount) * 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/loans/${loan.id}/payment`, {
      onSuccess: () => {
        reset();
        setShowPaymentForm(false);
      },
    });
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
              Loan Details
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {loan.person_name}
            </p>
          </div>
        </div>
      }
    >
      <Head title={`Loan - ${loan.person_name}`} />

      <div className="p-4 lg:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Loan Summary Card */}
          <div className={cn(
            "bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border",
            isOverdue
              ? "border-red-200 dark:border-red-800"
              : loan.is_completed
              ? "border-green-200 dark:border-green-800"
              : "border-gray-200 dark:border-gray-700"
          )}>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className={cn(
                  "p-4 rounded-full",
                  loan.type === 'taken'
                    ? "bg-red-100 dark:bg-red-900/30"
                    : "bg-green-100 dark:bg-green-900/30"
                )}>
                  {loan.type === 'taken' ? (
                    <ArrowDownLeftIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
                  ) : (
                    <ArrowTopRightOnSquareIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {loan.person_name}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {loan.type === 'taken' ? 'Borrowed from' : 'Lent to'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Link
                  href={`/loans/${loan.id}/edit`}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <PencilIcon className="h-5 w-5" />
                </Link>
                {isOverdue && (
                  <div className="flex items-center px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    Overdue
                  </div>
                )}
                {loan.is_completed && (
                  <div className="flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Completed
                  </div>
                )}
              </div>
            </div>

            {/* Amount Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Original Amount</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(loan.amount)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Paid Amount</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(loan.amount - loan.remaining_amount)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Remaining</p>
                <p className={cn(
                  "text-2xl font-bold",
                  loan.is_completed
                    ? "text-green-600 dark:text-green-400"
                    : loan.type === 'taken'
                    ? "text-red-600 dark:text-red-400"
                    : "text-orange-600 dark:text-orange-400"
                )}>
                  {formatCurrency(loan.remaining_amount)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            {!loan.is_completed && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Payment Progress</span>
                  <span className="font-medium">{progressPercent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={cn(
                      "h-3 rounded-full transition-all duration-500",
                      loan.type === 'taken' ? "bg-red-500" : "bg-green-500"
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-start space-x-3">
                <CalendarDaysIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Loan Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(loan.loan_date)}
                  </p>
                </div>
              </div>

              {loan.due_date && (
                <div className="flex items-start space-x-3">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
                    <p className={cn(
                      "text-sm font-medium",
                      isOverdue ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"
                    )}>
                      {formatDate(loan.due_date)}
                    </p>
                  </div>
                </div>
              )}

              {loan.person_phone && (
                <div className="flex items-start space-x-3">
                  <PhoneIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                    <a
                      href={`tel:${loan.person_phone}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {loan.person_phone}
                    </a>
                  </div>
                </div>
              )}

              {loan.interest_rate && loan.interest_rate > 0 && (
                <div className="flex items-start space-x-3">
                  <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Interest Rate</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {loan.interest_rate}%
                    </p>
                  </div>
                </div>
              )}
            </div>

            {loan.note && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Note</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{loan.note}</p>
              </div>
            )}
          </div>

          {/* Make Payment Section */}
          {!loan.is_completed && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Make Payment
                </h3>
                {!showPaymentForm && (
                  <button
                    onClick={() => setShowPaymentForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <PlusIcon className="h-4 w-4 inline mr-1" />
                    Add Payment
                  </button>
                )}
              </div>

              {showPaymentForm && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Account <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={data.account_id}
                      onChange={(e) => setData('account_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      required
                    >
                      <option value="">Select Account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.type.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                    {errors.account_id && (
                      <p className="text-red-500 text-sm mt-1">{errors.account_id}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400">৳</span>
                      <input
                        type="number"
                        step="0.01"
                        max={loan.remaining_amount}
                        value={data.amount}
                        onChange={(e) => setData('amount', e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Maximum: {formatCurrency(loan.remaining_amount)}
                    </p>
                    {errors.amount && (
                      <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Note (Optional)
                    </label>
                    <textarea
                      value={data.note}
                      onChange={(e) => setData('note', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Payment note..."
                    />
                    {errors.note && (
                      <p className="text-red-500 text-sm mt-1">{errors.note}</p>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPaymentForm(false);
                        reset();
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? 'Recording...' : 'Record Payment'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Payment History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Payment History
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {loan.payments.length} {loan.payments.length === 1 ? 'payment' : 'payments'} recorded
              </p>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {loan.payments.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    No payments recorded yet
                  </p>
                </div>
              ) : (
                loan.payments.map((payment) => (
                  <div key={payment.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(payment.payment_date)}
                            </p>
                          </div>
                        </div>
                        <div className="ml-11">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            From: {payment.account.name}
                          </p>
                          {payment.note && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {payment.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
