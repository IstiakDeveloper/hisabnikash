import React from 'react';
import { useForm } from '@inertiajs/react';
import { cn } from '@/utils/cn';

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
}

interface Transaction {
  id?: number;
  account_id: number;
  category_id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  transaction_date: string;
  note?: string;
}

interface Props {
  accounts: Account[];
  categories: Category[];
  transaction?: Partial<Transaction>;
  onSubmit: (data: any) => void;
  submitLabel?: string;
}

export default function TransactionForm({
  accounts,
  categories,
  transaction,
  onSubmit,
  submitLabel = 'Save Transaction'
}: Props) {
  const { data, setData, processing, errors } = useForm({
    account_id: transaction?.account_id || '',
    category_id: transaction?.category_id || '',
    type: transaction?.type || 'expense',
    amount: transaction?.amount || '',
    description: transaction?.description || '',
    transaction_date: transaction?.transaction_date || new Date().toISOString().split('T')[0],
    note: transaction?.note || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Transaction Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Transaction Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setData('type', 'income')}
            className={cn(
              "p-4 rounded-lg border-2 transition-all duration-200 text-center",
              data.type === 'income'
                ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                : "border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600"
            )}
          >
            <div className="text-2xl mb-1">💰</div>
            <div className="font-medium">Income</div>
          </button>
          <button
            type="button"
            onClick={() => setData('type', 'expense')}
            className={cn(
              "p-4 rounded-lg border-2 transition-all duration-200 text-center",
              data.type === 'expense'
                ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                : "border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-600"
            )}
          >
            <div className="text-2xl mb-1">💸</div>
            <div className="font-medium">Expense</div>
          </button>
        </div>
        {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Amount <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400">৳</span>
          <input
            type="number"
            step="0.01"
            value={data.amount}
            onChange={(e) => setData('amount', e.target.value)}
            className="w-full pl-8 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="0.00"
            required
          />
        </div>
        {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
      </div>

      {/* Account */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Account <span className="text-red-500">*</span>
        </label>
        <select
          value={data.account_id}
          onChange={(e) => setData('account_id', e.target.value)}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
        >
          <option value="">Select Account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.type.replace('_', ' ')})
            </option>
          ))}
        </select>
        {errors.account_id && <p className="text-red-500 text-sm mt-1">{errors.account_id}</p>}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Category <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setData('category_id', category.id)}
              className={cn(
                "p-3 rounded-lg border-2 transition-all duration-200 text-center",
                data.category_id == category.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600"
              )}
            >
              <div className="text-xl mb-1">{category.icon}</div>
              <div className="text-xs font-medium">{category.name}</div>
            </button>
          ))}
        </div>
        {errors.category_id && <p className="text-red-500 text-sm mt-1">{errors.category_id}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.description}
          onChange={(e) => setData('description', e.target.value)}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Enter description"
          required
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={data.transaction_date}
          onChange={(e) => setData('transaction_date', e.target.value)}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
        />
        {errors.transaction_date && <p className="text-red-500 text-sm mt-1">{errors.transaction_date}</p>}
      </div>

      {/* Note */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Note (Optional)
        </label>
        <textarea
          value={data.note}
          onChange={(e) => setData('note', e.target.value)}
          rows={3}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder="Add a note (optional)"
        />
        {errors.note && <p className="text-red-500 text-sm mt-1">{errors.note}</p>}
      </div>

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
