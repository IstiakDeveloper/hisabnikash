import React from 'react';
import { useForm } from '@inertiajs/react';
import { cn } from '@/utils/cn';

interface Account {
    id?: number;
    name: string;
    type: string;
    balance: number;
    account_number?: string;
    bank_branch?: string;
}

interface Props {
    account?: Partial<Account>;
    onSubmit: (data: any) => void;
    submitLabel?: string;
    isEdit?: boolean; // New prop to determine if editing
}

const accountTypes = [
    { value: 'bank', label: 'Bank Account', icon: '🏦' },
    { value: 'mobile_banking', label: 'Mobile Banking', icon: '📱' },
    { value: 'cash', label: 'Cash', icon: '💵' },
    { value: 'card', label: 'Card', icon: '💳' },
];

export default function AccountForm({
    account,
    onSubmit,
    submitLabel = 'Save Account',
    isEdit = false
}: Props) {
    const { data, setData, processing, errors } = useForm({
        name: account?.name || '',
        type: account?.type || 'bank',
        balance: account?.balance || '',
        account_number: account?.account_number || '',
        bank_branch: account?.bank_branch || '',
        is_active: account?.is_active ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(data);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., Prime Bank Savings"
                    required
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Account Type */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Account Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {accountTypes.map((type) => (
                        <button
                            key={type.value}
                            type="button"
                            onClick={() => setData('type', type.value)}
                            className={cn(
                                "p-4 rounded-lg border-2 transition-all duration-200 text-center",
                                data.type === type.value
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                    : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600"
                            )}
                        >
                            <div className="text-2xl mb-1">{type.icon}</div>
                            <div className="font-medium text-sm">{type.label}</div>
                        </button>
                    ))}
                </div>
                {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
            </div>

            {/* Balance Field */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {isEdit ? 'Current Balance' : 'Initial Balance'} <span className="text-red-500">*</span>
                </label>
                {isEdit && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                        ⚠️ Warning: Changing the balance will not create a transaction record. This directly updates the account balance.
                    </p>
                )}
                <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400">৳</span>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={data.balance}
                        onChange={(e) => setData('balance', e.target.value)}
                        className="w-full pl-8 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="0.00"
                        required
                    />
                </div>
                {errors.balance && <p className="text-red-500 text-sm mt-1">{errors.balance}</p>}
            </div>

            {/* Account Number */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account Number (Optional)
                </label>
                <input
                    type="text"
                    value={data.account_number}
                    onChange={(e) => setData('account_number', e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Enter account number"
                />
                {errors.account_number && <p className="text-red-500 text-sm mt-1">{errors.account_number}</p>}
            </div>

            {/* Bank Branch */}
            {(data.type === 'bank' || data.type === 'card') && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bank Branch (Optional)
                    </label>
                    <input
                        type="text"
                        value={data.bank_branch}
                        onChange={(e) => setData('bank_branch', e.target.value)}
                        className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Enter bank branch"
                    />
                    {errors.bank_branch && <p className="text-red-500 text-sm mt-1">{errors.bank_branch}</p>}
                </div>
            )}

            {/* Active Status (Only for Edit) */}
            {isEdit && (
                <div>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={data.is_active}
                            onChange={(e) => setData('is_active', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Account is active
                        </span>
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Inactive accounts won't appear in transaction forms
                    </p>
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={processing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
                {processing ? 'Saving...' : submitLabel}
            </button>
        </form>
    );
}
