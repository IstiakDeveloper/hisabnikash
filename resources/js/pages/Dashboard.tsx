import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout, { number_format } from '../layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { 
    TrendingUp, 
    TrendingDown, 
    AlertCircle, 
    Clock, 
    PiggyBank, 
    ChevronRight,
    Bell
} from 'lucide-react';

const accountTypeKeys: Record<string, string> = {
    bank: 'bank',
    mobile_banking: 'mobile_banking',
    cash: 'cash',
    credit_card: 'credit_card',
};

export default function Dashboard(props: any) {
    const { t } = useTranslation();

    const {
        accounts = [],
        totalBalance = 0,
        recentTransactions = [],
        loanSummary = {},
        monthlySummary = {},
        upcomingBills = [],
        trendData = [],
        alerts = [],
        notifications = [],
        emergencyFund = null,
    } = props;

    const [showNotifications, setShowNotifications] = useState(false);

    const maxVal = Math.max(...trendData.map((d: any) => Math.max(d.income, d.expense)), 1000);
    
    const width = 360;
    const height = 120;
    const padding = 20;

    const getX = (index: number) => padding + (index * (width - padding * 2) / 5);
    const getY = (value: number) => height - padding - (value * (height - padding * 2) / maxVal);

    let incomePath = '';
    let expensePath = '';
    
    trendData.forEach((d: any, i: number) => {
        const x = getX(i);
        const yInc = getY(d.income);
        const yExp = getY(d.expense);
        
        if (i === 0) {
            incomePath = `M ${x} ${yInc}`;
            expensePath = `M ${x} ${yExp}`;
        } else {
            incomePath += ` L ${x} ${yInc}`;
            expensePath += ` L ${x} ${yExp}`;
        }
    });

    const getAccountTypeLabel = (type: string) => {
        const key = accountTypeKeys[type];
        if (key) {
            return t(key, type.replace('_', ' '));
        }
        return type.replace('_', ' ');
    };

    const triggerQuickBillPay = (billId: string, amount: number, accountId: number) => {
        if (!accountId) return;
        router.post('/recurring-bills/' + billId + '/pay', {
            account_id: accountId,
            amount: amount,
            date: new Date().toISOString().split('T')[0],
            note: t('paid_from_dashboard', 'Paid from dashboard quick action'),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('dashboard', 'Dashboard')} />

            <div className="space-y-6">
                
                {notifications.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-4 space-y-3">
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="w-full flex items-center justify-between text-xs font-bold text-gray-700 dark:text-slate-300"
                        >
                            <div className="flex items-center space-x-2">
                                <Bell className="w-4 h-4 text-emerald-500 animate-bounce" />
                                <span>{t('notifications', 'New Notifications')} ({notifications.length})</span>
                            </div>
                            <ChevronRight className={`w-4 h-4 transform transition-all ${showNotifications ? 'rotate-90' : ''}`} />
                        </button>

                        {showNotifications && (
                            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-slate-800">
                                {notifications.map((n: any) => (
                                    <div key={n.id} className="text-[11px] bg-gray-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 flex items-start space-x-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1"></div>
                                        <span className="text-gray-700 dark:text-slate-300 flex-1">{n.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {alerts.length > 0 && (
                    <div className="space-y-2.5">
                        {alerts.map((alert: any) => (
                            <div 
                                key={alert.id} 
                                className={`border px-4 py-3.5 rounded-2xl flex items-start space-x-3 text-xs animate-fadeIn ${
                                    alert.type === 'danger' 
                                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                }`}
                            >
                                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <span className="font-semibold block">{alert.message}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full pointer-events-none"></div>
                    <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">{t('current_month_balance', 'Current Month Balance (Available)')}</span>
                        <div className="text-4xl font-extrabold tracking-tight">
                            ৳{number_format(monthlySummary.balance)}
                        </div>
                        <div className="flex justify-between items-center pt-4 text-xs border-t border-white/10 mt-4">
                            <div className="flex items-center space-x-1.5">
                                <TrendingUp className="w-4 h-4 opacity-80" />
                                <div>
                                    <span className="block opacity-75 text-[9px] uppercase">{t('income_inflow', 'Inflow (Income)')}</span>
                                    <span className="font-bold">৳{number_format(monthlySummary.income)}</span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-1.5 text-right">
                                <TrendingDown className="w-4 h-4 opacity-80" />
                                <div>
                                    <span className="block opacity-75 text-[9px] uppercase">{t('expense_outflow', 'Outflow (Expense)')}</span>
                                    <span className="font-bold text-rose-200">৳{number_format(monthlySummary.expense)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">{t('my_accounts', 'My Accounts')}</h3>
                        <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{t('total', 'Total')}: ৳{number_format(totalBalance)}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {accounts.map((acc: any) => (
                            <div key={acc.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800/80 rounded-2xl p-3.5 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] bg-gray-50 dark:bg-slate-950 px-2 py-0.5 rounded-full text-gray-500 dark:text-slate-400 uppercase font-bold">{getAccountTypeLabel(acc.type)}</span>
                                    <span className="text-lg">
                                        {acc.type === 'bank' ? '🏦' : (acc.type === 'mobile_banking' ? '📱' : (acc.type === 'cash' ? '💵' : '💳'))}
                                    </span>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300 block truncate">{acc.name}</span>
                                    <span className="text-sm font-black text-gray-900 dark:text-slate-100 block">৳{number_format(acc.balance)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                    <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">{t('fixed_vs_variable', 'Fixed vs Variable Spending')}</h3>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-3.5">
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[11px] font-bold text-gray-700 dark:text-slate-300">
                                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2"></span>{t('fixed_spending', 'Fixed Spending (Rent, Loans, Bills)')}</span>
                                    <span>৳{number_format(monthlySummary.fixed)}</span>
                                </div>
                                <div className="w-full h-2.5 bg-gray-50 dark:bg-slate-950 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-rose-500 rounded-full" 
                                        style={{ width: `${monthlySummary.expense > 0 ? (monthlySummary.fixed / monthlySummary.expense) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[11px] font-bold text-gray-700 dark:text-slate-300">
                                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"></span>{t('variable_spending', 'Variable Spending (Food, Fun, others)')}</span>
                                    <span>৳{number_format(monthlySummary.variable)}</span>
                                </div>
                                <div className="w-full h-2.5 bg-gray-50 dark:bg-slate-950 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-amber-500 rounded-full" 
                                        style={{ width: `${monthlySummary.expense > 0 ? (monthlySummary.variable / monthlySummary.expense) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {loanSummary.monthlyEMIObligation > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">{t('active_loans_emi', 'Active Loans & EMIs')}</h3>
                            <Link href="/loans" className="text-[11px] text-emerald-500 font-bold hover:underline flex items-center">
                                {t('view_details', 'Details')} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border border-gray-200 dark:border-slate-800/60">
                                <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 block">{t('monthly_total_emi', 'Total EMI This Month')}</span>
                                <span className="text-lg font-black text-gray-900 dark:text-slate-100 block">৳{number_format(loanSummary.monthlyEMIObligation)}</span>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border border-gray-200 dark:border-slate-800/60">
                                <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 block">{t('debt_free_target_date', 'Debt-Free Target Date')}</span>
                                <span className="text-sm font-black text-emerald-400 block mt-1">{loanSummary.debtFreeDate}</span>
                            </div>
                        </div>

                        {loanSummary.nextEMIDate && (
                            <div className="text-[11px] text-gray-500 dark:text-slate-400 bg-gray-50/60 dark:bg-slate-950/60 p-3 rounded-2xl flex items-center justify-between">
                                <span className="flex items-center"><Clock className="w-3.5 h-3.5 text-amber-500 mr-1.5" /> {t('next_emi', 'Next EMI')}</span>
                                <span className="font-bold text-gray-800 dark:text-slate-200">৳{number_format(loanSummary.nextEMIAmount)} ({loanSummary.nextEMIDate})</span>
                            </div>
                        )}
                    </div>
                )}

                {emergencyFund && (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-3.5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400 flex items-center">
                                <PiggyBank className="w-4 h-4 text-emerald-500 mr-2" />
                                {t('emergency_fund', 'Emergency Fund')}
                            </h3>
                            <span className="text-[11px] font-bold text-emerald-500">{emergencyFund.percentage}%</span>
                        </div>

                        <div className="space-y-2">
                            <div className="w-full h-3 bg-gray-50 dark:bg-slate-950 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                                    style={{ width: `${emergencyFund.percentage}%` }}
                                ></div>
                            </div>
                            
                            <div className="flex justify-between text-[11px] text-gray-500 dark:text-slate-400 font-medium">
                                <span>৳{number_format(emergencyFund.current)}</span>
                                <span>{t('target_label', 'Target')}: ৳{number_format(emergencyFund.target)}</span>
                            </div>
                        </div>

                        <div className="text-[10px] text-gray-500 dark:text-slate-500 border-t border-gray-200 dark:border-gray-200 dark:border-slate-800 pt-2 bg-gray-50/40 dark:bg-slate-950/40 p-2.5 rounded-xl border border-gray-200 dark:border-slate-800/40">
                            {t('emergency_fund_suggestion', 'With regular monthly contributions, you should save ৳{amount}.').replace('{amount}', number_format(emergencyFund.suggested_monthly))}
                        </div>
                    </div>
                )}

                {upcomingBills.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">{t('upcoming_bills_this_week', 'Bills Due This Week')}</h3>
                            <Link href="/recurring-bills" className="text-[11px] text-emerald-500 font-bold hover:underline">
                                {t('manage', 'Manage')}
                            </Link>
                        </div>

                        <div className="space-y-2.5">
                            {upcomingBills.map((bill: any) => (
                                <div key={bill.id} className="bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-bold text-gray-800 dark:text-slate-200 block">{bill.name}</span>
                                        <span className="text-[10px] text-gray-500 dark:text-slate-500 block">
                                            {t('due_in_days', 'Due in {days} days ({date})')
                                                .replace('{days}', bill.due_in_days)
                                                .replace('{date}', bill.due_date)}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-sm font-black text-gray-800 dark:text-slate-200">৳{number_format(bill.amount)}</span>
                                        <button 
                                            onClick={() => triggerQuickBillPay(bill.id, bill.amount, accounts[0]?.id)}
                                            className="bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white px-3 py-1 rounded-full text-[10px] font-bold transition-all"
                                        >
                                            {t('pay', 'Pay')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                    <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">{t('trend_6_months', '6-Month Cash Flow Trend')}</h3>

                    <div className="relative">
                        <svg className="w-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                            <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#1e293b" strokeDasharray="4 4" />
                            
                            <path d={incomePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            {trendData.map((d: any, i: number) => (
                                <circle key={`inc-${i}`} cx={getX(i)} cy={getY(d.income)} r="4" fill="#10b981" />
                            ))}

                            <path d={expensePath} fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            {trendData.map((d: any, i: number) => (
                                <circle key={`exp-${i}`} cx={getX(i)} cy={getY(d.expense)} r="4" fill="#f43f5e" />
                            ))}
                        </svg>
                    </div>

                    <div className="flex justify-between px-3 text-[10px] font-bold text-gray-500 dark:text-slate-500">
                        {trendData.map((d: any, i: number) => (
                            <span key={i}>{d.month}</span>
                        ))}
                    </div>

                    <div className="flex justify-center space-x-6 text-[10px] font-bold pt-2 border-t border-gray-200 dark:border-slate-800">
                        <span className="flex items-center text-emerald-500">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5"></span>{t('income', 'Income')}
                        </span>
                        <span className="flex items-center text-rose-500">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5"></span>{t('expense', 'Expense')}
                        </span>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">{t('recent_transactions', 'Recent Transactions')}</h3>
                        <Link href="/transactions" className="text-[11px] text-emerald-500 font-bold hover:underline flex items-center">
                            {t('view_all', 'View All')} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </Link>
                    </div>

                    <div className="space-y-2">
                        {recentTransactions.length === 0 ? (
                            <div className="text-center py-6 text-xs text-gray-500 dark:text-slate-500">{t('no_transactions_recorded', 'No transactions recorded yet.')}</div>
                        ) : (
                            recentTransactions.map((tx: any) => (
                                <div key={tx.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-200 dark:border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-950 flex items-center justify-center text-lg border border-gray-200 dark:border-slate-800">
                                            {tx.category?.icon || '📦'}
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-xs font-bold text-gray-900 dark:text-slate-100 block truncate max-w-[180px]">{tx.description || tx.category?.name}</span>
                                            <span className="text-[9px] text-gray-500 dark:text-slate-500 block">{tx.account?.name} • {tx.transaction_date.substring(0, 10)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-0.5">
                                        <span className={`text-xs font-bold block ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {tx.type === 'income' ? '+' : '-'}৳{number_format(tx.amount)}
                                        </span>
                                        {tx.space && (
                                            <span className="text-[8px] bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full uppercase font-semibold">
                                                {tx.space.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
