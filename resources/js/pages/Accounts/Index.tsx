
import React, { useState } from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import AccountCard from '@/components/AccountCard';
import { PlusIcon, EyeIcon, EyeSlashIcon, ArrowsRightLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatCurrencySimple } from '@/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  account_number?: string;
  is_active: boolean;
  transactions?: any[];
}

interface Props {
  accounts: Account[];
  budgets?: any[];
  categories?: any[];
}

export default function Index({ accounts, budgets = [], categories = [] }: Props) {
  const { t } = useTranslation();
  const [hideBalance, setHideBalance] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFee, setTransferFee] = useState('');
  const [budgetId, setBudgetId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferNote, setTransferNote] = useState('');

  const activeAccounts = accounts.filter(account => account.is_active);
  const totalBalance = activeAccounts.reduce((sum, account) => {
    const balance = typeof account.balance === 'string' ? parseFloat(account.balance) : account.balance;
    return sum + (isNaN(balance) ? 0 : balance);
  }, 0);

  const accountStats = {
    total: accounts.length,
    active: activeAccounts.length,
    inactive: accounts.length - activeAccounts.length,
    totalBalance: totalBalance
  };

  const fromAccount = activeAccounts.find(a => a.id.toString() === fromAccountId);
  const toAccount = activeAccounts.find(a => a.id.toString() === toAccountId);
  const selectedBudget = budgets.find(b => b.id.toString() === budgetId);
  const feeAmount = Number(transferFee) || 0;
  const amountValue = Number(transferAmount) || 0;
  const showCategoryPicker = feeAmount > 0 && selectedBudget && !selectedBudget.category_id;

  const openTransferModal = () => {
    setFromAccountId(activeAccounts[0]?.id?.toString() || '');
    setToAccountId(activeAccounts[1]?.id?.toString() || '');
    setTransferAmount('');
    setTransferFee('');
    setBudgetId(budgets[0]?.id?.toString() || '');
    setCategoryId(categories[0]?.id?.toString() || '');
    setTransferNote('');
    setIsTransferOpen(true);
  };

  const handleBudgetChange = (id: string) => {
    setBudgetId(id);
    const budget = budgets.find(b => b.id.toString() === id);
    if (budget?.category_id) {
      setCategoryId(budget.category_id.toString());
    }
  };

  const submitTransfer = (e: React.FormEvent) => {
    e.preventDefault();

    if (feeAmount > 0 && !budgetId) {
      alert(t('budget_required_for_fee', 'Please select a budget for the transfer fee.'));
      return;
    }

    if (showCategoryPicker && !categoryId) {
      alert(t('category_required_for_fee', 'Please select a category for the transfer fee.'));
      return;
    }

    router.post('/accounts/transfer', {
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount: amountValue,
      fee: feeAmount,
      budget_id: feeAmount > 0 ? budgetId : null,
      category_id: showCategoryPicker ? categoryId : null,
      transaction_date: transferDate,
      note: transferNote,
    }, {
      onSuccess: () => setIsTransferOpen(false),
    });
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {t('accounts', 'Accounts')}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('total_balance_label', 'Total Balance')}: {hideBalance ? '••••••' : formatCurrencySimple(totalBalance)}
              </p>
              <button
                onClick={() => setHideBalance(!hideBalance)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title={hideBalance ? t('show_balance', 'Show balance') : t('hide_balance', 'Hide balance')}
              >
                {hideBalance ?
                  <EyeIcon className="h-4 w-4" /> :
                  <EyeSlashIcon className="h-4 w-4" />
                }
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {activeAccounts.length >= 2 && (
              <button
                onClick={openTransferModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors shadow-lg"
                title={t('balance_transfer', 'Balance Transfer')}
              >
                <ArrowsRightLeftIcon className="h-5 w-5" />
              </button>
            )}
            <Link
              href="/accounts/create"
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors shadow-lg hover:shadow-xl"
              title={t('add_new_account', 'Add New Account')}
            >
              <PlusIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      }
    >
      <Head title={t('accounts', 'Accounts')} />

      <div className="p-4 lg:p-6 space-y-6">
        {accounts.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-2">
                  <span className="text-blue-600 dark:text-blue-400 text-sm">🏦</span>
                </div>
                <div>
                  <p className="text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase">{t('total_accounts', 'Total Accounts')}</p>
                  <p className="text-blue-700 dark:text-blue-300 font-extrabold text-base">{accountStats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-2">
                  <span className="text-green-600 dark:text-green-400 text-sm">✅</span>
                </div>
                <div>
                  <p className="text-green-600 dark:text-green-400 text-[10px] font-bold uppercase">{t('active', 'Active')}</p>
                  <p className="text-green-700 dark:text-green-300 font-extrabold text-base">{accountStats.active}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 dark:bg-gray-900/30 rounded-lg mr-2">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">⏸️</span>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-[10px] font-bold uppercase">{t('inactive', 'Inactive')}</p>
                  <p className="text-gray-700 dark:text-gray-300 font-extrabold text-base">{accountStats.inactive}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-2">
                  <span className="text-purple-600 dark:text-purple-400 text-sm">💰</span>
                </div>
                <div>
                  <p className="text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase">{t('total_value', 'Total Value')}</p>
                  <p className="text-purple-700 dark:text-purple-300 font-extrabold text-sm truncate">
                    {hideBalance ? '••••••' : formatCurrencySimple(totalBalance)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">🏦</div>
            <h3 className="text-2xl font-medium text-gray-900 dark:text-gray-100 mb-3">
              {t('no_accounts_yet', 'No accounts yet')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {t('no_accounts_desc', 'Create your first account to start tracking your finances. You can add bank accounts, mobile banking, cash, or cards.')}
            </p>
            <Link
              href="/accounts/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              {t('add_first_account', 'Add Your First Account')}
            </Link>
          </div>
        ) : (
          <div>
            {activeAccounts.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                  {t('active_accounts', 'Active Accounts')} ({activeAccounts.length})
                </h3>
                <div className="grid grid-cols-1 gap-4 mb-6">
                  {activeAccounts.map((account) => (
                    <AccountCard key={account.id} account={account} hideBalance={hideBalance} />
                  ))}
                </div>
              </div>
            )}

            {accountStats.inactive > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-500 dark:text-slate-500 mb-3">
                  {t('inactive_accounts', 'Inactive Accounts')} ({accountStats.inactive})
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {accounts.filter(account => !account.is_active).map((account) => (
                    <div key={account.id} className="opacity-60">
                      <AccountCard account={account} hideBalance={hideBalance} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {accounts.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-800/10 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/20">
            <h3 className="text-xs font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wider mb-3">
              {t('quick_actions', 'Quick Actions')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Link
                href="/accounts/create"
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors flex flex-col items-center justify-center text-center shadow-xs"
              >
                <div className="text-lg mb-1">➕</div>
                <h4 className="text-[10px] font-bold text-gray-900 dark:text-gray-100 truncate w-full">{t('add_account', 'Add Account')}</h4>
              </Link>

              {activeAccounts.length >= 2 && (
                <button
                  onClick={openTransferModal}
                  className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors flex flex-col items-center justify-center text-center shadow-xs"
                >
                  <div className="text-lg mb-1">↔️</div>
                  <h4 className="text-[10px] font-bold text-gray-900 dark:text-gray-100 truncate w-full">{t('balance_transfer', 'Balance Transfer')}</h4>
                </button>
              )}

              <Link
                href="/transactions/create"
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors flex flex-col items-center justify-center text-center shadow-xs"
              >
                <div className="text-lg mb-1">💸</div>
                <h4 className="text-[10px] font-bold text-gray-900 dark:text-gray-100 truncate w-full">{t('add_transaction', 'Transaction')}</h4>
              </Link>

              <Link
                href="/transactions"
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors flex flex-col items-center justify-center text-center shadow-xs"
              >
                <div className="text-lg mb-1">📊</div>
                <h4 className="text-[10px] font-bold text-gray-900 dark:text-gray-100 truncate w-full">{t('view_transactions', 'History')}</h4>
              </Link>
            </div>
          </div>
        )}
      </div>

      {isTransferOpen && (
        <>
          <div className="fixed inset-0 z-35 bg-black/60 backdrop-blur-xs" onClick={() => setIsTransferOpen(false)} />
          <div className="fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 rounded-t-[32px] p-6 z-40 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{t('balance_transfer_title', 'Balance Transfer')}</h3>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">{t('transfer_between_accounts', 'Transfer money between accounts')}</p>
              </div>
              <button onClick={() => setIsTransferOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitTransfer} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('from_account', 'From Account')}</label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  required
                  className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                >
                  {activeAccounts.filter(a => a.id.toString() !== toAccountId).map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({formatCurrencySimple(a.balance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('to_account', 'To Account')}</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                  className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                >
                  {activeAccounts.filter(a => a.id.toString() !== fromAccountId).map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({formatCurrencySimple(a.balance)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('transfer_amount', 'Transfer Amount')}</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  required
                  className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm font-bold"
                />
                {fromAccount && (
                  <p className="text-[10px] text-gray-500 mt-1">{t('available', 'Available')}: {formatCurrencySimple(fromAccount.balance)}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('transfer_fee', 'Transfer Fee')} ({t('optional', 'Optional')})</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={transferFee}
                  onChange={(e) => setTransferFee(e.target.value)}
                  placeholder="0"
                  className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm"
                />
                {feeAmount > 0 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                    {t('fee_goes_to_expense', 'Fee will be recorded as an expense automatically.')}
                  </p>
                )}
              </div>

              {feeAmount > 0 && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('link_to_budget', 'Link to Budget')} *</label>
                    <select
                      value={budgetId}
                      onChange={(e) => handleBudgetChange(e.target.value)}
                      required
                      className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                    >
                      <option value="">{t('select_budget', 'Select Budget')}</option>
                      {budgets.map(b => (
                        <option key={b.id} value={b.id}>🎯 {b.name}</option>
                      ))}
                    </select>
                  </div>

                  {showCategoryPicker && (
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('category', 'Category')} *</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        required
                        className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('date', 'Date')}</label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  required
                  className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('note_optional', 'Note (Optional)')}</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder={t('transfer_note_placeholder', 'Add a note for this transfer...')}
                  className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                />
              </div>

              {fromAccount && toAccount && amountValue > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/30 rounded-2xl p-4 text-xs space-y-2">
                  <p className="font-bold text-indigo-700 dark:text-indigo-300">{t('transfer_summary', 'Transfer Summary')}</p>
                  <p>{fromAccount.name} → {toAccount.name}</p>
                  <p>{t('transfer_amount_colon', 'Transfer Amount')}: {formatCurrencySimple(amountValue)}</p>
                  {feeAmount > 0 && <p>{t('transfer_fee', 'Transfer Fee')}: {formatCurrencySimple(feeAmount)}</p>}
                  <p className="font-bold">
                    {t('total_debit', 'Total Debit')}: {formatCurrencySimple(amountValue + feeAmount)}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all"
              >
                {t('complete_transfer', 'Complete Transfer')}
              </button>
            </form>
          </div>
        </>
      )}
    </AuthenticatedLayout>
  );
}
