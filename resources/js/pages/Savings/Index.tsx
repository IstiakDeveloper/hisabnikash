import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout, { number_format } from '../../layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { 
    Plus, 
    X, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Calculator
} from 'lucide-react';

export default function Index(props: any) {
    const {
        goals = [],
        accounts = [],
        spaces = [],
    } = props;

    const { t, locale } = useTranslation();

    const [viewWhatIfGoal, setViewWhatIfGoal] = useState<any>(null);
    const [whatIfContribution, setWhatIfContribution] = useState<number>(5000);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [spaceId, setSpaceId] = useState(spaces[0]?.id?.toString() || '');

    const [isContributeOpen, setIsContributeOpen] = useState(false);
    const [activeGoal, setActiveGoal] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('contribution');
    const [accountId, setAccountId] = useState(accounts[0]?.id?.toString() || '');
    const [note, setNote] = useState('');

    const submitGoal = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/savings-goals', {
            name,
            target_amount: Number(targetAmount),
            target_date: targetDate,
            space_id: spaceId,
        }, {
            onSuccess: () => {
                setIsAddOpen(false);
                resetGoalForm();
            }
        });
    };

    const resetGoalForm = () => {
        setName('');
        setTargetAmount('');
        setTargetDate('');
    };

    const openContributeModal = (goal: any, contributionType: 'contribution' | 'withdrawal') => {
        setActiveGoal(goal);
        setType(contributionType);
        setAmount('');
        setIsContributeOpen(true);
    };

    const submitContribution = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeGoal) return;

        router.post('/savings-goals/' + activeGoal.id + '/contribute', {
            amount: Number(amount),
            type: type,
            account_id: accountId || null,
            date: new Date().toISOString().split('T')[0],
            note: note,
        }, {
            onSuccess: () => {
                setIsContributeOpen(false);
                setActiveGoal(null);
                setNote('');
            }
        });
    };

    const calculateWhatIfDate = (goal: any) => {
        const remaining = Math.max(0, goal.target_amount - goal.current_amount);
        if (remaining <= 0) return t('already_achieved', 'Already achieved!');
        if (whatIfContribution <= 0) return t('infinite_time', 'Infinite time');
        
        const months = Math.ceil(remaining / whatIfContribution);
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        
        const dateLocale = locale === 'bn' ? 'bn-BD' : 'en-US';
        return date.toLocaleDateString(dateLocale, { year: 'numeric', month: 'long' }) + ` (${months} ${t('months_unit', 'months')})`;
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('savings_goals_title', 'Savings Goals')} />

            <div className="space-y-6">
                
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-slate-100 font-sans">{t('savings_goals_title', 'Savings Goals')}</h2>
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 py-2.5 px-4 rounded-2xl text-xs font-bold text-white transition-all active:scale-95 flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t('set_goal_btn', 'Set Goal')}</span>
                    </button>
                </div>

                <div className="space-y-4">
                    {goals.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl py-12 text-center text-xs text-gray-500 dark:text-slate-500">
                            {t('no_savings_goals', 'No savings goals set yet.')}
                        </div>
                    ) : (
                        goals.map((goal: any) => {
                            const remaining = Math.max(0, goal.target_amount - goal.current_amount);

                            return (
                                <div key={goal.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                                    
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center space-x-1.5">
                                                <span className="text-xl bg-gray-50 dark:bg-slate-950 p-1.5 rounded-xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">🎯</span>
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100 max-w-[200px] truncate">{goal.name}</h4>
                                                    <span className="text-[9px] text-gray-500 dark:text-slate-500 font-bold block mt-0.5 uppercase tracking-wider">
                                                        {goal.space?.name || t('general_space', 'General Space')} • {t('target_label', 'Target')}: {goal.target_date}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right space-y-0.5">
                                            <span className="text-[9px] text-gray-500 dark:text-slate-500 uppercase font-bold block">{t('target_budget', 'Target Budget')}</span>
                                            <span className="text-sm font-black text-gray-900 dark:text-slate-100 block">৳{number_format(goal.target_amount)}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="w-full h-3.5 bg-gray-50 dark:bg-slate-950 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                                                style={{ width: `${goal.progress_percentage}%` }}
                                            ></div>
                                        </div>
                                        
                                        <div className="flex justify-between text-[10px] font-bold text-gray-500 dark:text-slate-400">
                                            <span>{t('achieved', 'Achieved')}: ৳{number_format(goal.current_amount)} ({goal.progress_percentage}%)</span>
                                            <span>{t('remaining_goal', 'Remaining')}: ৳{number_format(remaining)}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-slate-400 bg-gray-50/60 dark:bg-slate-950/60 p-3 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">
                                        <div>
                                            <span className="text-[9px] uppercase text-gray-500 dark:text-slate-500 font-bold block">{t('suggested_monthly_saving', 'Suggested Monthly Saving Required')}</span>
                                            <span className="font-bold text-emerald-400 text-xs">৳{number_format(goal.suggested_monthly)} {t('per_month', '/ month')}</span>
                                        </div>
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => openContributeModal(goal, 'contribution')}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 flex items-center justify-center space-x-1"
                                        >
                                            <ArrowUpRight className="w-3.5 h-3.5" /> <span>{t('deposit', 'Deposit')}</span>
                                        </button>
                                        <button
                                            onClick={() => openContributeModal(goal, 'withdrawal')}
                                            className="bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center space-x-1"
                                        >
                                            <ArrowDownLeft className="w-3.5 h-3.5" /> <span>{t('withdraw', 'Withdraw')}</span>
                                        </button>
                                        
                                        <button
                                            onClick={() => setViewWhatIfGoal(viewWhatIfGoal?.id === goal.id ? null : goal)}
                                            className="bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-800 p-2.5 rounded-xl text-xs font-bold transition-all"
                                        >
                                            <Calculator className="w-4.5 h-4.5" />
                                        </button>
                                    </div>

                                    {viewWhatIfGoal?.id === goal.id && (
                                        <div className="border-t border-gray-200 dark:border-gray-200 dark:border-slate-800 pt-4 mt-2 space-y-4 animate-fadeIn">
                                            <h5 className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider flex items-center">
                                                <Calculator className="w-3.5 h-3.5 text-emerald-500 mr-1.5" />
                                                {t('what_if_calculator', 'What-If Projection Calculator')}
                                            </h5>
                                            
                                            <div className="space-y-3.5 bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">
                                                <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-slate-300">
                                                    <span>{t('extra_monthly_contribution', 'Extra Monthly Contribution (BDT)')}:</span>
                                                    <span className="text-emerald-400">৳{number_format(whatIfContribution)}</span>
                                                </div>
                                                
                                                <input
                                                    type="range"
                                                    min="500"
                                                    max="50000"
                                                    step="500"
                                                    value={whatIfContribution}
                                                    onChange={(e) => setWhatIfContribution(Number(e.target.value))}
                                                    className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                />
                                                
                                                <div className="pt-2 flex justify-between text-[11px] text-gray-500 dark:text-slate-400 border-t border-gray-200 dark:border-slate-900">
                                                    <span>{t('estimated_completion', 'Estimated Completion')}:</span>
                                                    <span className="font-extrabold text-gray-800 dark:text-slate-200">{calculateWhatIfDate(goal)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

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
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{t('set_new_savings_goal', 'Set New Savings Goal')}</h3>
                            <button onClick={() => setIsAddOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={submitGoal} className="space-y-4">
                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('goal_name', 'Goal Name')}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('goal_name_placeholder', 'e.g. Emergency fund (6 months expenses)...')}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('target_amount_bdt', 'Target Amount (BDT)')}</label>
                                <input
                                    type="number"
                                    value={targetAmount}
                                    onChange={(e) => setTargetAmount(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('target_completion_date', 'Target Completion Date')}</label>
                                <input
                                    type="date"
                                    value={targetDate}
                                    onChange={(e) => setTargetDate(e.target.value)}
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

                            <button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all"
                            >
                                {t('set_goal_submit', 'Set Goal')}
                            </button>
                        </form>
                    </div>
                </>
            )}

            {isContributeOpen && (
                <>
                    <div className="fixed inset-0 z-35 bg-black/60 backdrop-blur-xs" onClick={() => setIsContributeOpen(false)}></div>
                    <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 rounded-t-[32px] p-6 z-40 space-y-5 animate-slide-up">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                                {type === 'contribution'
                                    ? t('fund_deposit', 'Deposit to Goal')
                                    : t('fund_withdrawal', 'Withdraw from Goal')}
                            </h3>
                            <button onClick={() => setIsContributeOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={submitContribution} className="space-y-4">
                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('amount_bdt', 'Amount (BDT)')}</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-lg font-bold focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('linked_account_auto', 'Linked Account (Auto-Transaction)')}</label>
                                <select
                                    value={accountId}
                                    onChange={(e) => setAccountId(e.target.value)}
                                    className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                >
                                    <option value="">{t('no_account_link', "Don't link account (record only)")}</option>
                                    {accounts.map((a: any) => (
                                        <option key={a.id} value={a.id}>{a.name} (৳{number_format(a.balance)})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('note_comment', 'Note / Comment')}</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder={t('write_comment', 'Write a comment...')}
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all"
                            >
                                {t('confirm_record', 'Confirm Record')}
                            </button>
                        </form>
                    </div>
                </>
            )}

        </AuthenticatedLayout>
    );
}
