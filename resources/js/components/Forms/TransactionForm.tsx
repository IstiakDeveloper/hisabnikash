import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { cn } from '@/utils/cn';
import { useTranslation } from '@/hooks/useTranslation';

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
  type: 'income' | 'expense';
}

interface Transaction {
  id?: number;
  account_id: number;
  category_id: number;
  space_id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  transaction_date: string;
  note?: string;
  is_fixed?: boolean;
  payment_method?: string;
  is_recurring?: boolean;
  recurrence_period?: string;
}

interface Props {
  accounts: Account[];
  categories: Category[];
  spaces?: any[];
  budgets?: any[];
  transaction?: Partial<Transaction>;
  onSubmit: (data: any) => void;
  submitLabel?: string;
}

export default function TransactionForm({
  accounts = [],
  categories = [],
  spaces = [],
  budgets = [],
  transaction,
  onSubmit,
  submitLabel
}: Props) {
  const { t } = useTranslation();
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | number>('');
  const [budgetError, setBudgetError] = useState('');

  const { data, setData, processing, errors } = useForm({
    account_id: transaction?.account_id || '',
    category_id: transaction?.category_id || '',
    space_id: transaction?.space_id || (spaces.find(s => s.is_default)?.id || spaces[0]?.id || ''),
    type: transaction?.type || 'expense',
    amount: transaction?.amount || '',
    description: transaction?.description || '',
    transaction_date: transaction?.transaction_date || new Date().toISOString().split('T')[0],
    note: transaction?.note || '',
    is_fixed: transaction?.is_fixed || false,
    payment_method: transaction?.payment_method || 'cash',
    is_recurring: transaction?.is_recurring || false,
    recurrence_period: transaction?.recurrence_period || '',
  });

  // Pre-select budget if category and space match
  useEffect(() => {
    if (data.type === 'expense' && data.category_id && data.space_id && budgets.length > 0 && !selectedBudgetId) {
      const matchedBudget = budgets.find(
        (b: any) => b.category_id == data.category_id && b.space_id == data.space_id
      );
      if (matchedBudget) {
        setSelectedBudgetId(matchedBudget.id.toString());
      }
    }
  }, [data.category_id, data.space_id, data.type, budgets]);

  const handleBudgetChange = (budgetIdStr: string) => {
    setSelectedBudgetId(budgetIdStr);
    if (!budgetIdStr) {
      return;
    }
    const budgetId = parseInt(budgetIdStr);
    const budget = budgets.find((b: any) => b.id === budgetId);
    if (budget) {
      // We can update both fields by calling setData with a callback
      setData((prevData: any) => ({
        ...prevData,
        space_id: budget.space_id,
        category_id: budget.category_id || prevData.category_id,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.type === 'expense' && !selectedBudgetId) {
      setBudgetError(t('budget_required_error', 'Selecting a budget is required for expenses.'));
      return;
    }
    onSubmit(data);
  };

  const filteredCategories = categories.filter(category => category.type === data.type);
  const isCategoryDisabled = !!selectedBudgetId && !!budgets.find((b: any) => b.id === parseInt(selectedBudgetId.toString()))?.category_id;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('transaction_type', 'Transaction Type')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setData('type', 'income');
              setSelectedBudgetId('');
            }}
            className={cn(
              "p-4 rounded-lg border-2 transition-all duration-200 text-center",
              data.type === 'income'
                ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                : "border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600"
            )}
          >
            <div className="text-2xl mb-1">💰</div>
            <div className="font-medium">{t('income', 'Income')}</div>
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
            <div className="font-medium">{t('expense', 'Expense')}</div>
          </button>
        </div>
        {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
      </div>

      {/* Budget Link Selector */}
      {data.type === 'expense' && (
        <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('link_to_budget', 'Link to Budget')} <span className="text-red-500">*</span>
          </label>
          {budgets && budgets.length > 0 ? (
            <>
              <select
                value={selectedBudgetId}
                onChange={(e) => {
                  handleBudgetChange(e.target.value);
                  setBudgetError('');
                }}
                required
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="">{t('select_budget', 'Select Budget')}</option>
                {budgets.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    🎯 {b.name} (Limit: ৳{b.amount})
                  </option>
                ))}
              </select>
              {budgetError && <p className="text-red-500 text-sm mt-1">{budgetError}</p>}
              {selectedBudgetId && (
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                  ✓ {t('budget_auto_filled_hint', 'Category & Space auto-populated and locked.')}
                </p>
              )}
            </>
          ) : (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium">
              ⚠️ {t('no_active_budgets_warning', 'No active budgets found for this month. Please create or clone a budget first before recording expenses.')}
            </div>
          )}
        </div>
      )}

      {/* Space Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('space', 'Space / Profile')} <span className="text-red-500">*</span>
        </label>
        <select
          value={data.space_id}
          onChange={(e) => setData('space_id', e.target.value)}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
          disabled={!!selectedBudgetId}
        >
          <option value="">{t('select_space', 'Select Space')}</option>
          {spaces.map((space: any) => (
            <option key={space.id} value={space.id}>
              {space.name} ({space.type})
            </option>
          ))}
        </select>
        {errors.space_id && <p className="text-red-500 text-sm mt-1">{errors.space_id}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('amount', 'Amount')} <span className="text-red-500">*</span>
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

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('account', 'Account')} <span className="text-red-500">*</span>
        </label>
        <select
          value={data.account_id}
          onChange={(e) => setData('account_id', e.target.value)}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
        >
          <option value="">{t('select_account', 'Select Account')}</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.type.replace('_', ' ')})
            </option>
          ))}
        </select>
        {errors.account_id && <p className="text-red-500 text-sm mt-1">{errors.account_id}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('category', 'Category')} <span className="text-red-500">*</span>
        </label>
        {isCategoryDisabled ? (
          <div className="p-3.5 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg text-sm border border-gray-200 dark:border-gray-700 flex items-center space-x-2">
            <span className="text-lg">
              {categories.find(c => c.id == data.category_id)?.icon || '📦'}
            </span>
            <span className="font-semibold">
              {categories.find(c => c.id == data.category_id)?.name || 'Default'}
            </span>
            <span className="text-xs text-gray-505">({t('locked_by_budget', 'Locked by budget selection')})</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredCategories.map((category) => (
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
        )}
        {errors.category_id && <p className="text-red-500 text-sm mt-1">{errors.category_id}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('description_optional', 'Description (Optional)')}
        </label>
        <input
          type="text"
          value={data.description}
          onChange={(e) => setData('description', e.target.value)}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder={t('enter_description', 'Enter description')}
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('date', 'Date')} <span className="text-red-500">*</span>
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

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('payment_method', 'Payment Method')} <span className="text-red-500">*</span>
        </label>
        <select
          value={data.payment_method}
          onChange={(e) => setData('payment_method', e.target.value)}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
        >
          <option value="cash">{t('payment_cash_option', '💵 Cash')}</option>
          <option value="mobile_banking">{t('payment_mobile_banking_option', '📱 Mobile Banking (bKash/Nagad)')}</option>
          <option value="bank">{t('payment_bank_option', '🏦 Bank')}</option>
          <option value="credit_card">{t('payment_credit_card_option', '💳 Credit Card')}</option>
        </select>
        {errors.payment_method && <p className="text-red-500 text-sm mt-1">{errors.payment_method}</p>}
      </div>

      {/* Fixed vs Recurring */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_fixed"
            checked={data.is_fixed}
            onChange={(e) => setData('is_fixed', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
          />
          <label htmlFor="is_fixed" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            {t('fixed_spending', 'Fixed Spending')}
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_recurring"
            checked={data.is_recurring}
            onChange={(e) => setData('is_recurring', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
          />
          <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            {t('recurring_transaction', 'Recurring Transaction')}
          </label>
        </div>
      </div>

      {data.is_recurring && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('recurrence_period', 'Recurrence Period')} <span className="text-red-500">*</span>
          </label>
          <select
            value={data.recurrence_period}
            onChange={(e) => setData('recurrence_period', e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required={data.is_recurring}
          >
            <option value="">{t('select_period', 'Select Period')}</option>
            <option value="daily">{t('daily', 'Daily')}</option>
            <option value="weekly">{t('weekly', 'Weekly')}</option>
            <option value="monthly">{t('monthly', 'Monthly')}</option>
            <option value="yearly">{t('yearly', 'Yearly')}</option>
          </select>
          {errors.recurrence_period && <p className="text-red-500 text-sm mt-1">{errors.recurrence_period}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('note_optional', 'Note (Optional)')}
        </label>
        <textarea
          value={data.note}
          onChange={(e) => setData('note', e.target.value)}
          rows={3}
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder={t('add_note_placeholder', 'Add a note (optional)')}
        />
        {errors.note && <p className="text-red-500 text-sm mt-1">{errors.note}</p>}
      </div>

      <button
        type="submit"
        disabled={processing}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
      >
        {processing ? t('saving', 'Saving...') : (submitLabel || t('save_transaction', 'Save Transaction'))}
      </button>
    </form>
  );
}
