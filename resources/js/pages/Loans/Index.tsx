import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { formatCurrency, formatDate, formatRelativeDate } from '@/utils/formatters';
import {
  PlusIcon,
  CalendarDaysIcon,
  UserIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowDownLeftIcon,
  ClockIcon,
  PencilIcon
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
  is_overdue?: boolean;
  total_paid?: number;
  payments: LoanPayment[];
}

interface Props {
  loans: Loan[];
}

export default function Index({ loans }: Props) {
  const activeLoansTaken = loans.filter(loan => loan.type === 'taken' && !loan.is_completed);
  const activeLoansGiven = loans.filter(loan => loan.type === 'given' && !loan.is_completed);
  const completedLoans = loans.filter(loan => loan.is_completed);

  const totalTaken = activeLoansTaken.reduce((sum, loan) => sum + Number(loan.remaining_amount), 0);
  const totalGiven = activeLoansGiven.reduce((sum, loan) => sum + Number(loan.remaining_amount), 0);

  const handleMakePayment = (loanId: number) => {
    router.get(`/loans/${loanId}`);
  };

  const LoanCard = ({ loan }: { loan: Loan }) => {
    const isOverdue = loan.due_date && new Date(loan.due_date) < new Date() && !loan.is_completed;
    const progressPercent = ((loan.amount - loan.remaining_amount) / loan.amount) * 100;

    return (
      <div className={cn(
        "bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border transition-all duration-200 hover:shadow-md",
        isOverdue
          ? "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10"
          : loan.is_completed
          ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10"
          : "border-gray-200 dark:border-gray-700"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "p-3 rounded-full",
              loan.type === 'taken'
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-green-100 dark:bg-green-900/30"
            )}>
              {loan.type === 'taken' ? (
                <ArrowDownLeftIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              ) : (
                <ArrowTopRightOnSquareIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {loan.person_name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {loan.type === 'taken' ? 'Borrowed from' : 'Lent to'}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center space-x-2">
            {isOverdue && (
              <div className="flex items-center px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                Overdue
              </div>
            )}
            {loan.is_completed && (
              <div className="flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Completed
              </div>
            )}
          </div>
        </div>

        {/* Amount Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Original Amount</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(loan.amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {loan.is_completed ? 'Total Paid' : 'Remaining'}
            </p>
            <p className={cn(
              "text-lg font-bold",
              loan.is_completed
                ? "text-green-600 dark:text-green-400"
                : loan.type === 'taken'
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
            )}>
              {loan.is_completed
                ? formatCurrency(loan.amount)
                : formatCurrency(loan.remaining_amount)
              }
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {!loan.is_completed && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span>{progressPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  loan.type === 'taken' ? "bg-red-500" : "bg-green-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <CalendarDaysIcon className="h-4 w-4 mr-2" />
            <span>Loan Date: {formatDate(loan.loan_date)}</span>
          </div>

          {loan.due_date && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <ClockIcon className="h-4 w-4 mr-2" />
              <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                Due: {formatDate(loan.due_date)} ({formatRelativeDate(loan.due_date)})
              </span>
            </div>
          )}

          {loan.person_phone && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <PhoneIcon className="h-4 w-4 mr-2" />
              <a
                href={`tel:${loan.person_phone}`}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {loan.person_phone}
              </a>
            </div>
          )}

          {loan.interest_rate && loan.interest_rate > 0 && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <CurrencyDollarIcon className="h-4 w-4 mr-2" />
              <span>Interest: {loan.interest_rate}%</span>
            </div>
          )}

          {loan.note && (
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
              {loan.note}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        {loan.payments && loan.payments.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recent Payments ({loan.payments.length})
            </p>
            <div className="space-y-1">
              {loan.payments.slice(0, 2).map((payment) => (
                <div key={payment.id} className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatDate(payment.payment_date)}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
              {loan.payments.length > 2 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  +{loan.payments.length - 2} more payments
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <Link
            href={`/loans/${loan.id}/edit`}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          >
            <PencilIcon className="h-4 w-4 inline mr-1" />
            Edit
          </Link>

          <Link
            href={`/loans/${loan.id}`}
            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-center py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          >
            View Details
          </Link>

          {!loan.is_completed && (
            <button
              onClick={() => handleMakePayment(loan.id)}
              className={cn(
                "flex-1 text-white text-center py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                loan.type === 'taken'
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              )}
            >
              {loan.type === 'taken' ? 'Make Payment' : 'Record Payment'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Loans
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {loans.length} total loan records
            </p>
          </div>
          <Link
            href="/loans/create"
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
          </Link>
        </div>
      }
    >
      <Head title="Loans" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">Loans Taken</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {formatCurrency(totalTaken)}
                </p>
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  {activeLoansTaken.length} active
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <ArrowDownLeftIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">Loans Given</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(totalGiven)}
                </p>
                <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                  {activeLoansGiven.length} active
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <ArrowTopRightOnSquareIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Net Position</p>
                <p className={cn(
                  "text-2xl font-bold",
                  (totalGiven - totalTaken) >= 0
                    ? "text-green-700 dark:text-green-300"
                    : "text-red-700 dark:text-red-300"
                )}>
                  {formatCurrency(totalGiven - totalTaken)}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                  {completedLoans.length} completed
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {loans.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">💸</div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-3">
              No loan records yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Keep track of money you've borrowed or lent to others.
              Create your first loan record to get started.
            </p>
            <Link
              href="/loans/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Your First Loan
            </Link>
          </div>
        ) : (
          <>
            {/* Active Loans Taken */}
            {activeLoansTaken.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <ArrowDownLeftIcon className="h-5 w-5 mr-2 text-red-500" />
                  Loans Taken ({activeLoansTaken.length})
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {activeLoansTaken.map((loan) => (
                    <LoanCard key={loan.id} loan={loan} />
                  ))}
                </div>
              </div>
            )}

            {/* Active Loans Given */}
            {activeLoansGiven.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <ArrowTopRightOnSquareIcon className="h-5 w-5 mr-2 text-green-500" />
                  Loans Given ({activeLoansGiven.length})
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {activeLoansGiven.map((loan) => (
                    <LoanCard key={loan.id} loan={loan} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Loans */}
            {completedLoans.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
                  Completed Loans ({completedLoans.length})
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {completedLoans.slice(0, 6).map((loan) => (
                    <LoanCard key={loan.id} loan={loan} />
                  ))}
                  {completedLoans.length > 6 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400 mb-2">
                          +{completedLoans.length - 6} more completed loans
                        </p>
                        <Link
                          href="/loans?filter=completed"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm"
                        >
                          View All
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
