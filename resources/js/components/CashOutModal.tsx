import React from 'react';
import { useForm } from '@inertiajs/react';
import { formatCurrency } from '@/utils/formatters';
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  cashAccount: Account | null;
}

export default function CashOutModal({ isOpen, onClose, accounts, cashAccount }: Props) {
  const { data, setData, post, processing, errors, reset } = useForm({
    from_account_id: '',
    amount: '',
    note: '',
  });

  const selectedAccount = accounts.find(acc => acc.id === Number(data.from_account_id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/transfers/cash-out', {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!cashAccount) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Cash Out</DialogTitle>
          <DialogDescription>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 my-4">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                No cash account found. Please create a cash account first.
              </p>
            </div>
          </DialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2 text-xl">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <ArrowDownTrayIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          Cash Out
        </DialogTitle>
        <DialogDescription>
          Transfer money from your account to cash
        </DialogDescription>

        {/* Cash Account Balance Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-md my-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-medium mb-1">Cash Account Balance</p>
              <p className="text-2xl font-bold">{formatCurrency(cashAccount.balance)}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <ArrowDownTrayIcon className="h-6 w-6" />
            </div>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              No other accounts available for cash out.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* From Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                From Account <span className="text-red-500">*</span>
              </label>
              <select
                value={data.from_account_id}
                onChange={(e) => setData('from_account_id', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                required
              >
                <option value="">Select Account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {formatCurrency(account.balance)}
                  </option>
                ))}
              </select>
              {selectedAccount && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Available: {formatCurrency(selectedAccount.balance)}
                </p>
              )}
              {errors.from_account_id && (
                <p className="text-red-500 text-xs mt-1">{errors.from_account_id}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400 text-sm">৳</span>
                <input
                  type="number"
                  step="0.01"
                  value={data.amount}
                  onChange={(e) => setData('amount', e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="0.00"
                  required
                  min="0.01"
                />
              </div>
              {errors.amount && (
                <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Note (Optional)
              </label>
              <textarea
                value={data.note}
                onChange={(e) => setData('note', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm resize-none"
                rows={3}
                placeholder="Add a note for this cash out..."
              />
              {errors.note && (
                <p className="text-red-500 text-xs mt-1">{errors.note}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Cash Out'}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
