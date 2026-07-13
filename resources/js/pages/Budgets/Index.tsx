import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout, { number_format } from '../../layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { 
    Plus, 
    Trash2, 
    X, 
    Info, 
    CheckCircle, 
    AlertTriangle,
    Wallet,
    Calendar,
    ArrowUpRight,
    Copy
} from 'lucide-react';

export default function Index(props: any) {
    const {
        budgets = [],
        categories = [],
        spaces = [],
        summary = {},
        filters = {}
    } = props;

    const { t } = useTranslation();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [spaceId, setSpaceId] = useState(spaces[0]?.id?.toString() || '');
    const [amount, setAmount] = useState('');
    const [period, setPeriod] = useState('monthly');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
    const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`);
    const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [alertPercentage, setAlertPercentage] = useState('80');
    const [notifyOnExceed, setNotifyOnExceed] = useState(true);

    const handleMonthChange = (monthStr: string) => {
        setSelectedMonth(monthStr);
        if (!monthStr) return;
        const [year, month] = monthStr.split('-').map(Number);
        const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
        setStartDate(firstDay);
        setEndDate(lastDay);
    };

    const submitAddBudget = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/budgets', {
            name,
            category_id: categoryId || null,
            space_id: spaceId,
            amount: Number(amount),
            period,
            start_date: startDate,
            end_date: endDate,
            note,
            alert_percentage: Number(alertPercentage),
            notify_on_exceed: notifyOnExceed,
        }, {
            onSuccess: () => {
                setIsAddOpen(false);
                resetAddForm();
            }
        });
    };

    const resetAddForm = () => {
        setName('');
        setCategoryId('');
        setAmount('');
        setNote('');
    };

    const handleCloneBudget = () => {
        if (confirm(t('confirm_clone_budget', "Are you sure you want to clone last month's budgets into the selected month?"))) {
            router.post('/budgets/clone', {
                target_month: selectedMonth
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm(t('delete_budget_confirm', 'Are you sure you want to delete this budget limit?'))) {
            router.delete('/budgets/' + id);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('budget_planner_head', 'Budget Planner')} />

            <div className="space-y-6">
                
                {/* 1. Header */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">{t('budget_planner_title', 'Budget Planner (Zero-Based Budget)')}</h2>
                    <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:space-x-3.5">
                        <button
                            onClick={handleCloneBudget}
                            className="bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/60 py-3 px-4 rounded-2xl text-xs font-bold text-slate-200 transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-md hover:border-slate-600"
                        >
                            <Copy className="w-4 h-4 text-slate-400" />
                            <span>{t('clone_last_month_budget', "Clone Last Month's Budget")}</span>
                        </button>
                        <button
                            onClick={() => setIsAddOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 py-3 px-4 rounded-2xl text-xs font-bold text-white transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/20"
                        >
                            <Plus className="w-4 h-4 text-emerald-100" />
                            <span>{t('create_budget', 'Create Budget Limit')}</span>
                        </button>
                    </div>
                </div>

                {/* 2. Budget summary stats */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-500 dark:text-slate-400">
                        <Wallet className="w-4 h-4 text-emerald-500" />
                        <span>{t('monthly_budget_summary', 'Current Month Overall Budget Summary')}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">
                            <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 block">{t('total_allocated', 'Total Allocated')}</span>
                            <span className="text-sm font-black text-gray-800 dark:text-slate-200 block">৳{number_format(summary.total_budget)}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">
                            <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 block">{t('total_spent_label', 'Total Spent')}</span>
                            <span className="text-sm font-black text-rose-400 block">৳{number_format(summary.total_spent)}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">
                            <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 block">{t('remaining_balance', 'Remaining Balance')}</span>
                            <span className="text-sm font-black text-emerald-400 block font-bold">৳{number_format(summary.total_remaining)}</span>
                        </div>
                    </div>
                </div>

                {/* 3. Budgets list */}
                <div className="space-y-4">
                    {budgets.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl py-12 text-center text-xs text-gray-500 dark:text-slate-500">
                            {t('no_budget_plans', 'No budget plans created yet.')}
                        </div>
                    ) : (
                        budgets.map((b: any) => {
                            const barColor = b.is_exceeded 
                                ? 'bg-rose-500' 
                                : (b.should_alert ? 'bg-amber-500' : 'bg-emerald-500');

                            const textColor = b.is_exceeded 
                                ? 'text-rose-400' 
                                : (b.should_alert ? 'text-amber-400' : 'text-emerald-400');

                            return (
                                <div key={b.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2">
                                                {b.category?.icon && (
                                                    <span className="text-lg bg-gray-50 dark:bg-slate-950 p-1.5 rounded-xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">{b.category.icon}</span>
                                                )}
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">{b.name}</h4>
                                                    <span className="text-[9px] text-gray-500 dark:text-slate-500 uppercase font-bold tracking-wider block mt-0.5">
                                                        {b.period} • {b.space?.name || t('general', 'General')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="text-right space-y-0.5">
                                            <span className="text-[9px] text-gray-500 dark:text-slate-500 uppercase font-bold block">{t('allocated_limit', 'Allocated Limit')}</span>
                                            <span className="text-sm font-black text-gray-900 dark:text-slate-100 block">৳{number_format(b.amount)}</span>
                                        </div>
                                    </div>

                                    {/* Real-time bar tracker */}
                                    <div className="space-y-2">
                                        <div className="w-full h-3 bg-gray-50 dark:bg-slate-950 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all ${barColor}`}
                                                style={{ width: `${Math.min(100, b.spent_percentage)}%` }}
                                            ></div>
                                        </div>
                                        
                                        <div className="flex justify-between text-[10px] font-bold text-gray-500 dark:text-slate-400">
                                            <span>{t('spent_colon', 'Spent')}: ৳{number_format(b.spent_amount)} ({b.spent_percentage}%)</span>
                                            <span>{t('remaining_colon', 'Remaining')}: ৳{number_format(b.remaining)}</span>
                                        </div>
                                    </div>

                                    {/* Warning logs */}
                                    <div className="flex items-center justify-between text-[10px] bg-gray-50/50 dark:bg-slate-950/50 p-3 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">
                                        <span className={`font-bold flex items-center ${textColor}`}>
                                            {b.is_exceeded ? (
                                                <><AlertTriangle className="w-3.5 h-3.5 mr-1" /> {t('budget_exceeded_alert', 'Budget exceeded!')}</>
                                            ) : (
                                                b.should_alert 
                                                    ? <><AlertTriangle className="w-3.5 h-3.5 mr-1" /> {t('alert_threshold_reached', 'Alert threshold reached')}</>
                                                    : <><CheckCircle className="w-3.5 h-3.5 mr-1" /> {t('within_safe_limit', 'Within safe limits')}</>
                                            )}
                                        </span>
                                        
                                        <button
                                            onClick={() => handleDelete(b.id)}
                                            className="text-gray-500 dark:text-slate-500 hover:text-rose-500 p-1 rounded transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Add Budget Modal Bottom Sheet */}
            {isAddOpen && (
                <>
                    <div className="fixed inset-0 z-35 bg-black/60 backdrop-blur-xs" onClick={() => setIsAddOpen(false)}></div>
                    <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 rounded-t-[32px] p-6 z-40 space-y-5 animate-slide-up max-h-[85%] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{t('create_budget_plan', 'Create Budget Plan')}</h3>
                            <button onClick={() => setIsAddOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={submitAddBudget} className="space-y-4">
                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('budget_name', 'Budget Name')}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('budget_name_placeholder', 'e.g. Weekly grocery budget...')}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('linked_space', 'Linked Space')}</label>
                                <select
                                    value={spaceId}
                                    onChange={(e) => setSpaceId(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                >
                                    {spaces.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('category_optional', 'Category (Optional)')}</label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                >
                                    <option value="">{t('all_categories_budget', 'All Categories (Overall Budget)')}</option>
                                    {categories.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('allocated_amount_bdt', 'Allocated Amount (BDT)')}</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">{t('budget_month', 'Budget Month')}</label>
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => handleMonthChange(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-350"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('alert_trigger_threshold', 'Alert Trigger Threshold (%)')}</label>
                                <input
                                    type="number"
                                    value={alertPercentage}
                                    onChange={(e) => setAlertPercentage(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl">
                                <span className="text-xs font-bold">{t('notify_on_exceed_question', 'Send notification when limit is exceeded?')}</span>
                                <input
                                    type="checkbox"
                                    checked={notifyOnExceed}
                                    onChange={(e) => setNotifyOnExceed(e.target.checked)}
                                    className="w-5 h-5 rounded-md border-gray-200 dark:border-slate-800 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('note_label', 'Note')}</label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    rows={2}
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none"
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all"
                            >
                                {t('submit_budget', 'Add to Budget List')}
                            </button>
                        </form>
                    </div>
                </>
            )}

        </AuthenticatedLayout>
    );
}
