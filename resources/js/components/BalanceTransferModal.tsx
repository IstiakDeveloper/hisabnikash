import React from 'react';
import { useForm } from '@inertiajs/react';
import { formatCurrency } from '@/utils/formatters';
import { ArrowsRightLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
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
}

export default function BalanceTransferModal({ isOpen, onClose, accounts }: Props) {
  const { data, setData, post, processing, errors, reset } = useForm({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    note: '',
  });

  const fromAccount = accounts.find(acc => acc.id === Number(data.from_account_id));
  const toAccount = accounts.find(acc => acc.id === Number(data.to_account_id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/transfers/balance-transfer', {
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

  if (accounts.length < 2) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Balance Transfer</DialogTitle>
          <DialogDescription>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 my-4">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                You need at least 2 accounts to perform a balance transfer.
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
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <ArrowsRightLeftIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          Balance Transfer
        </DialogTitle>
        <DialogDescription>
          Move money between your accounts instantly
        </DialogDescription>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* From Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From Account <span className="text-red-500">*</span>
            </label>
            <select
              value={data.from_account_id}
              onChange={(e) => setData('from_account_id', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              required
            >
              <option value="">Select Source Account</option>
              {accounts
                .filter(acc => acc.id !== Number(data.to_account_id))
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {formatCurrency(account.balance)}
                  </option>
                ))}
            </select>
            {fromAccount && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Available: {formatCurrency(fromAccount.balance)}
              </p>
            )}
            {errors.from_account_id && (
              <p className="text-red-500 text-xs mt-1">{errors.from_account_id}</p>
            )}
          </div>

          {/* Visual Transfer Indicator */}
          {fromAccount && toAccount && (
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 px-4 py-3 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">From</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[100px]">
                    {fromAccount.name}
                  </p>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <div className="text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">To</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[100px]">
                    {toAccount.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* To Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To Account <span className="text-red-500">*</span>
            </label>
            <select
              value={data.to_account_id}
              onChange={(e) => setData('to_account_id', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              required
            >
              <option value="">Select Destination Account</option>
              {accounts
                .filter(acc => acc.id !== Number(data.from_account_id))
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {formatCurrency(account.balance)}
                  </option>
                ))}
            </select>
            {toAccount && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Current balance: {formatCurrency(toAccount.balance)}
              </p>
            )}
            {errors.to_account_id && (
              <p className="text-red-500 text-xs mt-1">{errors.to_account_id}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Transfer Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400 text-sm">৳</span>
              <input
                type="number"
                step="0.01"
                value={data.amount}
                onChange={(e) => setData('amount', e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                placeholder="0.00"
                required
                min="0.01"
              />
            </div>
            {fromAccount && data.amount && Number(data.amount) > fromAccount.balance && (
              <p className="text-red-500 text-xs mt-1">
                Insufficient balance
              </p>
            )}
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
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm resize-none"
              rows={3}
              placeholder="Add a note for this transfer..."
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
              className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Transfer'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
