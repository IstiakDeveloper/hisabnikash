import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import AccountForm from '@/Components/Forms/AccountForm';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '@/utils/formatters';

interface Account {
    id: number;
    name: string;
    type: string;
    balance: number;
    account_number?: string;
    bank_branch?: string;
    is_active: boolean;
}

interface Props {
    account: Account;
}

export default function Edit({ account }: Props) {
    const handleSubmit = (data: any) => {
        router.put(`/accounts/${account.id}`, data, {
            onSuccess: () => {
                // Show success message or redirect
            },
            onError: (errors) => {
                console.error('Update failed:', errors);
            }
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center space-x-4">
                    <Link
                        href={`/accounts/${account.id}`}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                            Edit Account
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Update {account.name} details
                        </p>
                    </div>
                </div>
            }
        >
            <Head title={`Edit ${account.name}`} />

            <div className="p-4 lg:p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Current Balance Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-blue-900 dark:text-blue-100">Current Balance</h3>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                    {formatCurrency(account.balance)}
                                </p>
                            </div>
                            <div className="text-blue-600 dark:text-blue-400 text-3xl">
                                💰
                            </div>
                        </div>
                    </div>

                    {/* Edit Form */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <AccountForm
                            account={account}
                            onSubmit={handleSubmit}
                            submitLabel="Update Account"
                            isEdit={true}
                        />
                    </div>

                    {/* Important Notice */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                            💡 Important Notes
                        </h4>
                        <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                            <li>• Changing the balance directly updates the account without creating a transaction</li>
                            <li>• If you want to record the balance change as a transaction, use "Add Income" or "Add Expense" instead</li>
                            <li>• Deactivating an account will hide it from transaction forms</li>
                        </ul>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
