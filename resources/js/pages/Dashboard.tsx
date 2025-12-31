import React from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { formatCurrency, formatRelativeDate } from '@/utils/formatters';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  EyeSlashIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import AccountCard from '@/components/AccountCard';
import TransactionList from '@/components/TransactionList';
import MonthlyChart from '@/components/MonthlyChart';
import CategoryExpenseChart from '@/components/CategoryExpenseChart';
import NotificationSettings from '@/components/NotificationSettings';
import NotificationTestButton from '@/components/NotificationTestButton';
import PWAInstallButton from '@/components/PWAInstallButton';
import CashOutModal from '@/components/CashOutModal';
import BalanceTransferModal from '@/components/BalanceTransferModal';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  account_number?: string;
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

interface CategoryExpense {
  name: string;
  amount: number;
  color: string;
  icon: string;
}

interface BudgetItem {
  id: number;
  name: string;
  amount: number;
  spent_amount: number;
  remaining: number;
  spent_percentage: number;
  is_exceeded: boolean;
  should_alert: boolean;
  status_color: string;
  status_text: string;
  category: Category | null;
}

interface BudgetAlert {
  id: number;
  name: string;
  message: string;
  type: 'danger' | 'warning';
  spent_percentage: number;
}

interface BudgetSummary {
  total_budget: number;
  total_spent: number;
  total_remaining: number;
  exceeded_count: number;
}

interface Props {
  accounts: Account[];
  totalBalance: number;
  recentTransactions: Transaction[];
  loanSummary: {
    taken: number;
    given: number;
  };
  monthlySummary: {
    income: number;
    expense: number;
    balance: number;
  };
  categoryExpenses: CategoryExpense[];
  budgets?: BudgetItem[];
  budgetAlerts?: BudgetAlert[];
  budgetSummary?: BudgetSummary;
}

export default function Dashboard({
  accounts,
  totalBalance,
  recentTransactions,
  loanSummary,
  monthlySummary,
  categoryExpenses,
  budgets,
  budgetAlerts,
  budgetSummary
}: Props) {
  const [hideBalance, setHideBalance] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  // Calculate savings rate and net balance
  const savingsRate = monthlySummary.income > 0
    ? ((monthlySummary.income - monthlySummary.expense) / monthlySummary.income * 100)
    : 0;

  const monthlyBalance = monthlySummary.income - monthlySummary.expense;

  // Get cash account and non-cash accounts for modals
  const cashAccount = accounts.find(acc => acc.type === 'cash') || null;
  const nonCashAccounts = accounts.filter(acc => acc.type !== 'cash');

  return (
    <AuthenticatedLayout
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              Personal Finance
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Income & Expense Manager
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Test Notification Button - Only shows when notifications enabled */}
            <div className="hidden sm:block">
              <NotificationTestButton variant="button" />
            </div>
            {/* PWA Install Button - Always available if not installed */}
            <div className="hidden sm:block">
              <PWAInstallButton variant="icon" />
            </div>
            <button
              onClick={() => setHideBalance(!hideBalance)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
            >
              {hideBalance ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      }
    >
      <Head title="Dashboard" />

      <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto pb-24 sm:pb-6">
        {/* Notification Settings Banner - Hidden on mobile */}
        <div className="hidden sm:block">
          <NotificationSettings />
        </div>

        {/* PWA Install Card - Show on mobile when not installed */}
        <div className="block sm:hidden mb-4">
          <PWAInstallButton variant="card" />
        </div>

        {/* Main Balance Card - Mobile First Design */}
        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-lg mb-4 sm:mb-6">
          <div className="mb-4">
            <p className="text-white/90 text-sm font-medium mb-1">Total Balance</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              {hideBalance ? '৳ ••••••' : formatCurrency(totalBalance)}
            </h1>
          </div>

          {/* Income & Expense Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4">
              <p className="text-white/90 text-xs font-medium mb-1">Income</p>
              <p className="text-xl sm:text-2xl font-bold">
                {hideBalance ? '৳ ••••••' : formatCurrency(monthlySummary.income)}
              </p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4">
              <p className="text-white/90 text-xs font-medium mb-1">Expense</p>
              <p className="text-xl sm:text-2xl font-bold">
                {hideBalance ? '৳ ••••••' : formatCurrency(monthlySummary.expense)}
              </p>
            </div>
          </div>
        </div>

        {/* Desktop: Additional Stats & Quick Actions */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-4 mb-6">

          {/* Desktop Stats Cards */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Net Balance</h3>
            <p className={`text-2xl font-bold ${monthlyBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(monthlyBalance)}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Savings Rate</h3>
            <p className={`text-2xl font-bold ${savingsRate > 20 ? 'text-green-600' : savingsRate > 10 ? 'text-yellow-600' : 'text-orange-600'}`}>
              {savingsRate.toFixed(1)}%
            </p>
          </div>

          {/* Desktop Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href="/transactions/create?type=income"
                className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all group border border-green-200 dark:border-green-800"
              >
                <div className="p-2 bg-green-500 rounded-lg group-hover:scale-110 transition-transform">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">Add Income</p>
                  <p className="text-xs text-green-700 dark:text-green-300">Record money received</p>
                </div>
              </Link>

              <Link
                href="/transactions/create?type=expense"
                className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all group border border-red-200 dark:border-red-800"
              >
                <div className="p-2 bg-red-500 rounded-lg group-hover:scale-110 transition-transform">
                  <ArrowTrendingDownIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100">Add Expense</p>
                  <p className="text-xs text-red-700 dark:text-red-300">Record money spent</p>
                </div>
              </Link>

              <button
                onClick={() => setShowTransferModal(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all group border border-purple-200 dark:border-purple-800"
              >
                <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                  <ArrowsRightLeftIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">Transfer</p>
                  <p className="text-xs text-purple-700 dark:text-purple-300">Move between accounts</p>
                </div>
              </button>

              <button
                onClick={() => setShowCashOutModal(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all group border border-emerald-200 dark:border-emerald-800"
              >
                <div className="p-2 bg-emerald-500 rounded-lg group-hover:scale-110 transition-transform">
                  <ArrowDownTrayIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Cash Out</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">Withdraw to cash</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Budget Alerts - Critical */}
        {budgetAlerts && budgetAlerts.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 rounded-xl p-4 sm:p-5 border-l-4 border-orange-500 shadow-md">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-500 rounded-lg flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                  Budget Alerts ({budgetAlerts.length})
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">You have budget warnings that need attention</p>
                <div className="space-y-2">
                  {budgetAlerts.slice(0, 2).map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        alert.type === 'danger'
                          ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700'
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className={`font-semibold text-sm ${alert.type === 'danger' ? 'text-red-900 dark:text-red-200' : 'text-yellow-900 dark:text-yellow-200'}`}>
                          {alert.name}
                        </p>
                        <p className={`text-xs mt-0.5 ${alert.type === 'danger' ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                          {alert.message}
                        </p>
                      </div>
                      <Link
                        href="/budgets"
                        className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-600 whitespace-nowrap transition-colors"
                      >
                        Fix
                      </Link>
                    </div>
                  ))}
                  {budgetAlerts.length > 2 && (
                    <Link
                      href="/budgets"
                      className="block text-center text-sm text-orange-700 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-medium mt-2"
                    >
                      View {budgetAlerts.length - 2} more alerts →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Accounts Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BanknotesIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Your Accounts
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({accounts.length})</span>
            </h3>
            <Link
              href="/accounts"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 font-medium flex items-center gap-1"
            >
              Manage
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {accounts.slice(0, 4).map((account) => (
              <AccountCard key={account.id} account={account} hideBalance={hideBalance} />
            ))}
          </div>
          {accounts.length > 4 && (
            <div className="mt-3 text-center">
              <Link
                href="/accounts"
                className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                <span>Show {accounts.length - 4} more accounts</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
            </div>
          )}
        </div>

        {/* Budget Overview - Modern Design */}
        {budgets && budgets.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ChartBarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Active Budgets</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Track your spending limits</p>
                </div>
              </div>
              <Link
                href="/budgets"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 font-medium"
              >
                View All →
              </Link>
            </div>

            {budgetSummary && (
              <div className="grid grid-cols-3 gap-3 mb-5 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl border border-blue-100 dark:border-blue-800">
                <div className="text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Budget</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(budgetSummary.total_budget)}
                  </p>
                </div>
                <div className="text-center border-x border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Spent</p>
                  <p className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(budgetSummary.total_spent)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Remaining</p>
                  <p className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(budgetSummary.total_remaining)}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {budgets.slice(0, 4).map((budget) => (
                <Link
                  key={budget.id}
                  href={`/budgets/${budget.id}`}
                  className="block p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {budget.category && (
                        <span className="text-xl flex-shrink-0">{budget.category.icon}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {budget.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(budget.spent_amount)} of {formatCurrency(budget.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        budget.is_exceeded
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : budget.should_alert
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {budget.spent_percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all ${
                        budget.is_exceeded
                          ? 'bg-gradient-to-r from-red-500 to-red-600'
                          : budget.should_alert
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gradient-to-r from-green-500 to-emerald-500'
                      }`}
                      style={{ width: `${Math.min(budget.spent_percentage, 100)}%` }}
                    ></div>
                  </div>
                </Link>
              ))}
            </div>

            {budgets.length > 4 && (
              <div className="mt-4 text-center">
                <Link
                  href="/budgets"
                  className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                >
                  <span>View {budgets.length - 4} more budgets</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Monthly Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Monthly Overview</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Income vs Expense trends</p>
              </div>
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <MonthlyChart data={monthlySummary} />
          </div>

          {/* Category Expenses */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Top Categories</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Spending breakdown</p>
              </div>
              <Link
                href="/reports"
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 font-medium"
              >
                Details →
              </Link>
            </div>
            <CategoryExpenseChart data={categoryExpenses} />
          </div>
        </div>

        {/* Loan Summary - Modern Card */}
        {(loanSummary.taken > 0 || loanSummary.given > 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <BanknotesIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Loan Summary</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Active loans overview</p>
                </div>
              </div>
              <Link
                href="/loans"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 font-medium"
              >
                Manage →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative p-5 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl border border-red-200 dark:border-red-800 overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-200 dark:bg-red-800 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowTrendingDownIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-700 dark:text-red-300 font-semibold">Loans Taken</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-red-700 dark:text-red-300">
                    {hideBalance ? '••••••' : formatCurrency(loanSummary.taken)}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">Amount you need to repay</p>
                </div>
              </div>

              <div className="relative p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-200 dark:bg-green-800 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-green-700 dark:text-green-300 font-semibold">Loans Given</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-300">
                    {hideBalance ? '••••••' : formatCurrency(loanSummary.given)}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">Amount to be received</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Transactions - Mobile Optimized */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm sm:shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Recent Transactions
            </h3>
            <Link
              href="/transactions"
              className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-500 font-medium"
            >
              View All →
            </Link>
          </div>
          <TransactionList transactions={recentTransactions} showAccount={true} />
        </div>
      </div>

      {/* Mobile Floating Action Button */}
      <div className="fixed bottom-20 right-4 sm:hidden z-40">
        <div className="relative">
          <button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-200 active:scale-95"
          >
            {showQuickMenu ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>

          {/* Quick Menu */}
          {showQuickMenu && (
            <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-2 w-48 border border-gray-200 dark:border-gray-700">
              <Link
                href="/transactions/create?type=income"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                onClick={() => setShowQuickMenu(false)}
              >
                <div className="p-2 bg-green-500 rounded-lg">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Add Income</span>
              </Link>

              <Link
                href="/transactions/create?type=expense"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                onClick={() => setShowQuickMenu(false)}
              >
                <div className="p-2 bg-red-500 rounded-lg">
                  <ArrowTrendingDownIcon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Add Expense</span>
              </Link>

              <button
                onClick={() => {
                  setShowTransferModal(true);
                  setShowQuickMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                <div className="p-2 bg-purple-500 rounded-lg">
                  <ArrowsRightLeftIcon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Transfer</span>
              </button>

              <button
                onClick={() => {
                  setShowCashOutModal(true);
                  setShowQuickMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
              >
                <div className="p-2 bg-emerald-500 rounded-lg">
                  <ArrowDownTrayIcon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Cash Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CashOutModal
        isOpen={showCashOutModal}
        onClose={() => setShowCashOutModal(false)}
        accounts={nonCashAccounts}
        cashAccount={cashAccount}
      />

      <BalanceTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        accounts={accounts}
      />    </AuthenticatedLayout>
  );
}
