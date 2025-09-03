import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import TransactionList from '@/Components/TransactionList';
import {
    PlusIcon,
    FunnelIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface Account {
    id: number;
    name: string;
}

interface Category {
    id: number;
    name: string;
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

interface PaginationLink {
    url?: string;
    label: string;
    active: boolean;
}

interface PaginationMeta {
    current_page: number;
    from?: number;
    last_page: number;
    links: PaginationLink[];
    path: string;
    per_page: number;
    to?: number;
    total: number;
}

interface PaginatedTransactions {
    data: Transaction[];
    links?: PaginationLink[];
    meta?: PaginationMeta;
    // Laravel pagination sometimes sends these at root level
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
    from?: number;
    to?: number;
}

interface Props {
    transactions: PaginatedTransactions;
    accounts: Account[];
    categories: Category[];
    filters: {
        account_id?: string;
        category_id?: string;
        type?: string;
        date_from?: string;
        date_to?: string;
    };
}

export default function Index({ transactions, accounts, categories, filters }: Props) {
    const [showFilters, setShowFilters] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);

    // Safe access to pagination meta with fallbacks
    const totalTransactions = transactions.meta?.total || transactions.total || transactions.data.length;
    const currentPage = transactions.meta?.current_page || transactions.current_page || 1;
    const lastPage = transactions.meta?.last_page || transactions.last_page || 1;
    const perPage = transactions.meta?.per_page || transactions.per_page || 20;
    const fromItem = transactions.meta?.from || transactions.from || (transactions.data.length > 0 ? 1 : 0);
    const toItem = transactions.meta?.to || transactions.to || transactions.data.length;

    // Use meta.links if available, otherwise fall back to root level links
    const paginationLinks = transactions.meta?.links || transactions.links || [];

    const applyFilters = () => {
        router.get('/transactions', localFilters, {
            preserveState: true,
            replace: true,
        });
        setShowFilters(false);
    };

    const clearFilters = () => {
        const clearedFilters = {
            account_id: '',
            category_id: '',
            type: '',
            date_from: '',
            date_to: '',
        };
        setLocalFilters(clearedFilters);
        router.get('/transactions', {}, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                            Transactions
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {totalTransactions > 0 ? (
                                `Showing ${fromItem}-${toItem} of ${totalTransactions} transactions`
                            ) : (
                                'No transactions found'
                            )}
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "p-2 rounded-lg transition-colors",
                                showFilters
                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                            )}
                            title="Toggle Filters"
                        >
                            <FunnelIcon className="h-5 w-5" />
                        </button>
                        <Link
                            href="/transactions/create"
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                            title="Add Transaction"
                        >
                            <PlusIcon className="h-5 w-5" />
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Transactions" />

            <div className="p-4 lg:p-6 space-y-6">
                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in-up">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Filter Transactions</h3>
                            <button
                                onClick={() => setShowFilters(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Account Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Account
                                </label>
                                <select
                                    value={localFilters.account_id || ''}
                                    onChange={(e) => setLocalFilters({ ...localFilters, account_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Accounts</option>
                                    {accounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Category Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Category
                                </label>
                                <select
                                    value={localFilters.category_id || ''}
                                    onChange={(e) => setLocalFilters({ ...localFilters, category_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.icon} {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Type Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Type
                                </label>
                                <select
                                    value={localFilters.type || ''}
                                    onChange={(e) => setLocalFilters({ ...localFilters, type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Types</option>
                                    <option value="income">💰 Income</option>
                                    <option value="expense">💸 Expense</option>
                                </select>
                            </div>

                            {/* Date From */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={localFilters.date_from || ''}
                                    onChange={(e) => setLocalFilters({ ...localFilters, date_from: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Date To */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    value={localFilters.date_to || ''}
                                    onChange={(e) => setLocalFilters({ ...localFilters, date_to: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Filter Actions */}
                        <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200 dark:border-gray-600">
                            <button
                                onClick={applyFilters}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Apply Filters
                            </button>
                            <button
                                onClick={clearFilters}
                                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={() => setShowFilters(false)}
                                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2 text-sm font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Transactions List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    {transactions.data.length === 0 ? (
                        /* Empty State */
                        <div className="text-center py-16">
                            <div className="text-6xl mb-6">📊</div>
                            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-3">
                                No transactions found
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                                {Object.values(filters).some(filter => filter) ? (
                                    'No transactions match your current filters. Try adjusting your search criteria.'
                                ) : (
                                    'Start tracking your finances by adding your first transaction.'
                                )}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                {Object.values(filters).some(filter => filter) && (
                                    <button
                                        onClick={clearFilters}
                                        className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
                                    >
                                        Clear Filters
                                    </button>
                                )}
                                <Link
                                    href="/transactions/create"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center"
                                >
                                    <PlusIcon className="h-5 w-5 mr-2" />
                                    Add Transaction
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Transactions List */}
                            <div className="p-6">
                                <TransactionList
                                    transactions={transactions.data}
                                    showAccount={true}
                                    showCategory={true}
                                />
                            </div>

                            {/* Pagination */}
                            {paginationLinks.length > 3 && (
                                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                        {/* Page Info */}
                                        <div className="text-sm text-gray-700 dark:text-gray-300">
                                            Showing <span className="font-medium">{fromItem}</span> to{' '}
                                            <span className="font-medium">{toItem}</span> of{' '}
                                            <span className="font-medium">{totalTransactions}</span> results
                                        </div>

                                        {/* Pagination Links */}
                                        <div className="flex justify-center space-x-1">
                                            {paginationLinks.map((link, index) => {
                                                if (!link.url && !link.active) {
                                                    return (
                                                        <span
                                                            key={index}
                                                            className="px-3 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed"
                                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                                        />
                                                    );
                                                }

                                                if (link.active) {
                                                    return (
                                                        <span
                                                            key={index}
                                                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg"
                                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                                        />
                                                    );
                                                }

                                                return (
                                                    <Link
                                                        key={index}
                                                        href={link.url || '#'}
                                                        className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                        preserveState
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Quick Stats */}
                {transactions.data.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                            <div className="flex items-center">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                                    <span className="text-green-600 dark:text-green-400 text-lg">💰</span>
                                </div>
                                <div>
                                    <p className="text-green-600 dark:text-green-400 text-sm font-medium">Income</p>
                                    <p className="text-green-700 dark:text-green-300 font-bold">
                                        {transactions.data.filter(t => t.type === 'income').length} transactions
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                            <div className="flex items-center">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg mr-3">
                                    <span className="text-red-600 dark:text-red-400 text-lg">💸</span>
                                </div>
                                <div>
                                    <p className="text-red-600 dark:text-red-400 text-sm font-medium">Expenses</p>
                                    <p className="text-red-700 dark:text-red-300 font-bold">
                                        {transactions.data.filter(t => t.type === 'expense').length} transactions
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                                    <span className="text-blue-600 dark:text-blue-400 text-lg">📊</span>
                                </div>
                                <div>
                                    <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total</p>
                                    <p className="text-blue-700 dark:text-blue-300 font-bold">
                                        {transactions.data.length} transactions
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
