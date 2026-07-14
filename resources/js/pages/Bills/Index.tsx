import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout, { number_format } from '../../layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { 
    Plus, 
    Trash2, 
    X, 
    CheckCircle, 
    AlertCircle,
    Clock
} from 'lucide-react';

export default function Index(props: any) {
    const {
        bills = [],
        categories = [],
        accounts = [],
        spaces = [],
        budgets = [],
    } = props;

    const { t } = useTranslation();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDay, setDueDay] = useState('5');
    const [frequency, setFrequency] = useState('monthly');
    const [budgetId, setBudgetId] = useState(budgets[0]?.id?.toString() || '');
    const [categoryId, setCategoryId] = useState(categories[0]?.id?.toString() || '');
    const [spaceId, setSpaceId] = useState(spaces[0]?.id?.toString() || '');
    const [budgetError, setBudgetError] = useState('');

    const [isPayOpen, setIsPayOpen] = useState(false);
    const [payBill, setPayBill] = useState<any>(null);
    const [payAccountId, setPayAccountId] = useState(accounts[0]?.id?.toString() || '');
    const [payAmount, setPayAmount] = useState('');
    const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
    const [payNote, setPayNote] = useState('');

    const selectedBudget = budgets.find((b: any) => b.id.toString() === budgetId);
    const isCategoryLocked = !!selectedBudget?.category_id;
    const isSpaceLocked = !!selectedBudget?.space_id;

    const handleBudgetChange = (nextBudgetId: string) => {
        setBudgetId(nextBudgetId);
        setBudgetError('');

        const budget = budgets.find((b: any) => b.id.toString() === nextBudgetId);
        if (budget) {
            if (budget.space_id) {
                setSpaceId(budget.space_id.toString());
            }
            if (budget.category_id) {
                setCategoryId(budget.category_id.toString());
            }
        }
    };

    const submitAddBill = (e: React.FormEvent) => {
        e.preventDefault();

        if (!budgetId) {
            setBudgetError(t('budget_required_error', 'Selecting a budget is required for expenses.'));
            return;
        }

        router.post('/recurring-bills', {
            name,
            amount: Number(amount),
            due_day: Number(dueDay),
            frequency,
            budget_id: budgetId,
            category_id: categoryId || null,
            space_id: spaceId || null,
        }, {
            onSuccess: () => {
                setIsAddOpen(false);
                resetAddForm();
            }
        });
    };

    const resetAddForm = () => {
        setName('');
        setAmount('');
        setDueDay('5');
        setBudgetId(budgets[0]?.id?.toString() || '');
        setCategoryId(categories[0]?.id?.toString() || '');
        setSpaceId(spaces[0]?.id?.toString() || '');
        setBudgetError('');
    };

    const openPayModal = (bill: any) => {
        setPayBill(bill);
        setPayAmount(bill.amount.toString());
        setIsPayOpen(true);
    };

    const submitPayBill = (e: React.FormEvent) => {
        e.preventDefault();
        if (!payBill) return;

        router.post('/recurring-bills/' + payBill.id + '/pay', {
            account_id: payAccountId,
            amount: Number(payAmount),
            date: payDate,
            note: payNote,
        }, {
            onSuccess: () => {
                setIsPayOpen(false);
                setPayBill(null);
                setPayNote('');
            }
        });
    };

    const handleDelete = (id: number) => {
        if (confirm(t('delete_bill_confirm', 'Are you sure you want to delete this recurring bill?'))) {
            router.delete('/recurring-bills/' + id);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('recurring_bills_title', 'Recurring Bills')} />

            <div className="space-y-6">
                
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-slate-100">{t('recurring_bills_title', 'Recurring Bills')}</h2>
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 py-2.5 px-4 rounded-2xl text-xs font-bold text-white transition-all active:scale-95 flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t('add_bill_btn', 'Add Bill')}</span>
                    </button>
                </div>

                <div className="space-y-4">
                    {bills.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl py-12 text-center text-xs text-gray-500 dark:text-slate-500">
                            {t('no_recurring_bills', 'No recurring bills created yet.')}
                        </div>
                    ) : (
                        bills.map((bill: any) => {
                            const isOverdue = !bill.is_paid_this_month && nowDay() > bill.due_day;

                            return (
                                <div key={bill.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-lg bg-gray-50 dark:bg-slate-950 p-1.5 rounded-xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">
                                                    {bill.category?.icon || '💡'}
                                                </span>
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">{bill.name}</h4>
                                                    <span className="text-[9px] text-gray-500 dark:text-slate-500 font-bold block mt-0.5 uppercase tracking-wider">
                                                        {bill.space?.name || t('general_space', 'General Space')} • {t('due_on_day', 'Due on day')} {bill.due_day} {t('each_month', 'each month')}
                                                    </span>
                                                    {bill.budget && (
                                                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                                                            🎯 {bill.budget.name} (৳{number_format(bill.budget.spent_amount)} / ৳{number_format(bill.budget.amount)})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right space-y-0.5">
                                            <span className="text-[9px] text-gray-500 dark:text-slate-500 uppercase font-bold block">{t('amount_bdt', 'Amount (BDT)')}</span>
                                            <span className="text-sm font-black text-gray-900 dark:text-slate-100 block">৳{number_format(bill.amount)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs bg-gray-50/60 dark:bg-slate-950/60 p-3 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">
                                        <span className="font-bold flex items-center">
                                            {bill.is_paid_this_month ? (
                                                <span className="text-emerald-400 flex items-center"><CheckCircle className="w-3.5 h-3.5 mr-1" /> {t('paid_this_month', 'Paid this month')}</span>
                                            ) : (
                                                isOverdue 
                                                    ? <span className="text-rose-400 flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-1" /> {t('bill_overdue', 'Bill is overdue')}</span>
                                                    : <span className="text-amber-400 flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> {t('outstanding_this_month', 'Outstanding this month')}</span>
                                            )}
                                        </span>

                                        <div className="flex items-center space-x-2">
                                            {!bill.is_paid_this_month && bill.budget && (
                                                <button
                                                    onClick={() => openPayModal(bill)}
                                                    className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95"
                                                >
                                                    {t('pay_btn', 'Pay')}
                                                </button>
                                            )}
                                            {!bill.is_paid_this_month && !bill.budget && (
                                                <span className="text-[10px] text-rose-400 font-bold px-2">
                                                    {t('bill_missing_budget', 'No budget linked')}
                                                </span>
                                            )}
                                            
                                            <button
                                                onClick={() => handleDelete(bill.id)}
                                                className="text-gray-500 dark:text-slate-500 hover:text-rose-500 p-1.5 rounded transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {isAddOpen && (
                <>
                    <div className="fixed inset-0 z-35 bg-black/60 backdrop-blur-xs" onClick={() => setIsAddOpen(false)}></div>
                    <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 rounded-t-[32px] p-6 z-40 space-y-5 animate-slide-up">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{t('add_new_recurring_bill', 'Add New Recurring Bill')}</h3>
                            <button onClick={() => setIsAddOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={submitAddBill} className="space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-2">
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500">
                                    {t('link_to_budget', 'Link to Budget')} <span className="text-red-500">*</span>
                                </label>
                                {budgets.length > 0 ? (
                                    <>
                                        <select
                                            value={budgetId}
                                            onChange={(e) => handleBudgetChange(e.target.value)}
                                            required
                                            className="block w-full px-4 py-3.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                        >
                                            <option value="">{t('select_budget', 'Select Budget')}</option>
                                            {budgets.map((b: any) => (
                                                <option key={b.id} value={b.id}>
                                                    🎯 {b.name} (Limit: ৳{number_format(b.amount)})
                                                </option>
                                            ))}
                                        </select>
                                        {budgetError && <p className="text-red-500 text-[10px]">{budgetError}</p>}
                                        {budgetId && (
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                ✓ {t('budget_auto_filled_hint', 'Category & Space auto-populated and locked.')}
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-medium">
                                        ⚠️ {t('no_active_budgets_warning', 'No active budgets found for this month. Please create or clone a budget first before recording expenses.')}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('bill_name', 'Bill Name / Description')}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('bill_name_placeholder', 'e.g. DPS installment, Internet bill...')}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('amount_bdt', 'Amount (BDT)')}</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('due_day_label', 'Due Day (1-31 each month)')}</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={dueDay}
                                    onChange={(e) => setDueDay(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('category', 'Category')}</label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    required
                                    disabled={isCategoryLocked}
                                    className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs disabled:opacity-60"
                                >
                                    {categories.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('linked_space', 'Linked Space')}</label>
                                <select
                                    value={spaceId}
                                    onChange={(e) => setSpaceId(e.target.value)}
                                    required
                                    disabled={isSpaceLocked}
                                    className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs disabled:opacity-60"
                                >
                                    {spaces.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={budgets.length === 0}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all"
                            >
                                {t('save_bill', 'Save Bill')}
                            </button>
                        </form>
                    </div>
                </>
            )}

            {isPayOpen && payBill && (
                <>
                    <div className="fixed inset-0 z-35 bg-black/60 backdrop-blur-xs" onClick={() => setIsPayOpen(false)}></div>
                    <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 rounded-t-[32px] p-6 z-40 space-y-5 animate-slide-up">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{t('bill_payment_info', 'Bill Payment Info')}</h3>
                            <button onClick={() => setIsPayOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {payBill.budget && (
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-3 text-xs">
                                <p className="font-bold text-emerald-700 dark:text-emerald-300">
                                    🎯 {t('deduct_from_budget', 'Will deduct from budget')}: {payBill.budget.name}
                                </p>
                                <p className="text-emerald-600 dark:text-emerald-400 mt-1">
                                    {t('budget_remaining', 'Remaining')}: ৳{number_format(Math.max(0, payBill.budget.amount - payBill.budget.spent_amount))}
                                </p>
                            </div>
                        )}

                        <form onSubmit={submitPayBill} className="space-y-4">
                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('payment_amount_taka', 'Amount (Taka)')}</label>
                                <input
                                    type="number"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-lg font-bold focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('source_account_payment', 'Source Account (Payment Method)')}</label>
                                <select
                                    value={payAccountId}
                                    onChange={(e) => setPayAccountId(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                >
                                    {accounts.map((a: any) => (
                                        <option key={a.id} value={a.id}>{a.name} (৳{number_format(a.balance)})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('date', 'Date')}</label>
                                <input
                                    type="date"
                                    value={payDate}
                                    onChange={(e) => setPayDate(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('comment_optional', 'Comment (Optional)')}</label>
                                <input
                                    type="text"
                                    value={payNote}
                                    onChange={(e) => setPayNote(e.target.value)}
                                    placeholder={t('bill_reference_placeholder', 'Bill slip number or reference...')}
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all"
                            >
                                {t('complete_payment', 'Complete Payment')}
                            </button>
                        </form>
                    </div>
                </>
            )}

        </AuthenticatedLayout>
    );
}

function nowDay() {
    return new Date().getDate();
}
