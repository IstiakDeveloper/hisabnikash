import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout, { number_format } from '../../layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { 
    Download, 
    Printer, 
    Building,
} from 'lucide-react';

export default function Index(props: any) {
    const { t } = useTranslation();
    const {
        totalIncome = 0,
        totalExpense = 0,
        netSavings = 0,
        categoryBreakdown = [],
        fixedExpenses = 0,
        variableExpenses = 0,
        profitability = [],
        debts = [],
        spaces = [],
        selectedSpaceId = 'combined',
        dateFrom = '',
        dateTo = ''
    } = props;

    const [spaceId, setSpaceId] = useState(selectedSpaceId);
    const [dFrom, setDFrom] = useState(dateFrom);
    const [dTo, setDTo] = useState(dateTo);

    const handleApply = () => {
        router.get('/reports', {
            space_id: spaceId,
            date_from: dFrom,
            date_to: dTo
        }, { preserveState: true });
    };

    const handleCSVExport = () => {
        window.open('/reports/export-csv' + `?space_id=${spaceId}&date_from=${dFrom}&date_to=${dTo}`);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('reports_title', 'Financial Analysis & Reports')} />

            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body {
                        background: white !important;
                        color: black !important;
                    }
                    nav, header, button, .print-hide, .sm\\:border-\\[8px\\] {
                        display: none !important;
                    }
                    .relative, .sm\\:rounded-\\[40px\\], .bg-white dark:bg-slate-900 {
                        box-shadow: none !important;
                        border: none !important;
                        background: transparent !important;
                        color: black !important;
                        max-width: 100% !important;
                        height: auto !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    text, span, h2, h3, h4, h5, td, th {
                        color: black !important;
                    }
                }
            `}} />

            <div className="space-y-6 print-container">
                <div className="flex items-center justify-between print-hide">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-slate-100">{t('financial_reports_analytics', 'Financial Reports & Analytics')}</h2>
                    <div className="flex space-x-1">
                        <button
                            onClick={handlePrint}
                            className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 p-2 rounded-xl text-gray-700 dark:text-slate-300 transition-all"
                            title={t('print', 'Print')}
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleCSVExport}
                            className="bg-emerald-600 hover:bg-emerald-700 py-2 px-3 rounded-xl text-xs font-bold text-white transition-all flex items-center space-x-1"
                            title={t('export_csv', 'Export CSV Data')}
                        >
                            <Download className="w-3.5 h-3.5" /> <span>CSV</span>
                        </button>
                    </div>
                </div>

                <div className="hidden print:block text-center space-y-2 mb-6">
                    <h1 className="text-3xl font-black">{t('print_report_title', 'HisabNikash Financial Report')}</h1>
                    <p className="text-sm text-gray-600">{t('date_range_from_to', 'Period')}: {dFrom} — {dTo}</p>
                    <p className="text-xs text-gray-500">{t('space_colon', 'Space')}: {spaceId === 'combined' ? t('all_spaces', 'All Spaces') : spaces.find((s: any) => s.id == spaceId)?.name}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-4.5 space-y-4 print-hide">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                            <label className="block text-[8px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('space', 'Space / Profile')}</label>
                            <select
                                value={spaceId}
                                onChange={(e) => setSpaceId(e.target.value)}
                                className="block w-full px-2.5 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-[11px] text-gray-700 dark:text-slate-300"
                            >
                                <option value="combined">{t('all_spaces', 'All Spaces')}</option>
                                {spaces.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[8px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('date_from_label', 'From')}</label>
                            <input
                                type="date"
                                value={dFrom}
                                onChange={(e) => setDFrom(e.target.value)}
                                className="block w-full px-2 py-1.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-[10px] text-gray-700 dark:text-slate-300"
                            />
                        </div>
                        <div>
                            <label className="block text-[8px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('date_to_label', 'To')}</label>
                            <input
                                type="date"
                                value={dTo}
                                onChange={(e) => setDTo(e.target.value)}
                                className="block w-full px-2 py-1.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-[10px] text-gray-700 dark:text-slate-300"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleApply}
                        className="w-full bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-800 py-2 rounded-xl text-[11px] font-bold text-gray-700 dark:text-slate-300 transition-all"
                    >
                        {t('generate_report', 'Generate Report')}
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                    <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">{t('summary', 'Summary')}</h3>
                    
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">
                            <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 block">{t('total_income_received', 'Total Income')}</span>
                            <span className="text-sm font-black text-emerald-400 block">৳{number_format(totalIncome)}</span>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">
                            <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 block">{t('total_expense_spent', 'Total Expense')}</span>
                            <span className="text-sm font-black text-rose-400 block">৳{number_format(totalExpense)}</span>
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">
                            <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 block">{t('net_balance', 'Net Balance')}</span>
                            <span className={`text-sm font-black block ${netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ৳{number_format(netSavings)}
                            </span>
                        </div>
                    </div>
                </div>

                {spaceId === 'combined' && profitability.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                        <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400 flex items-center">
                            <Building className="w-4 h-4 text-emerald-500 mr-2" />
                            {t('business_profitability', 'Business Profitability')}
                        </h3>

                        <div className="space-y-3.5">
                            {profitability.map((p: any, idx: number) => (
                                <div key={idx} className="bg-gray-50 dark:bg-slate-950 p-4 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black text-gray-900 dark:text-slate-100">{p.space_name}</span>
                                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${p.net_profit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            {t('profit', 'Profit')}: ৳{number_format(p.net_profit)}
                                        </span>
                                    </div>
                                    
                                    <div className="flex justify-between text-[10px] text-gray-500 dark:text-slate-400 font-bold border-t border-gray-200 dark:border-slate-900 pt-2">
                                        <span>{t('revenue', 'Revenue')}: ৳{number_format(p.income)}</span>
                                        <span>{t('expenses_label', 'Expenses')}: ৳{number_format(p.expense)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                    <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">{t('category_spending_breakdown', 'Category-wise Spending Breakdown')}</h3>
                    
                    <div className="space-y-3">
                        {categoryBreakdown.length === 0 ? (
                            <p className="text-xs text-gray-500 dark:text-slate-500 text-center py-6">{t('no_expense_records', 'No expense records found.')}</p>
                        ) : (
                            categoryBreakdown.map((cat: any, idx: number) => (
                                <div key={idx} className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs font-bold text-gray-700 dark:text-slate-300">
                                        <span className="flex items-center">
                                            <span className="mr-2">{cat.icon}</span> {cat.name} ({cat.percentage}%)
                                        </span>
                                        <span>৳{number_format(cat.amount)}</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-50 dark:bg-slate-950 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full rounded-full transition-all"
                                            style={{ 
                                                width: `${cat.percentage}%`,
                                                backgroundColor: cat.color 
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {totalExpense > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                        <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">{t('spending_ratio_fixed_variable', 'Fixed vs Variable Spending Ratio')}</h3>
                        
                        <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-slate-300">
                            <span>{t('fixed_expense_colon', 'Fixed Expenses')}: ৳{number_format(fixedExpenses)} ({Math.round(fixedExpenses / totalExpense * 100)}%)</span>
                            <span>{t('variable_expense_colon', 'Variable Expenses')}: ৳{number_format(variableExpenses)} ({Math.round(variableExpenses / totalExpense * 100)}%)</span>
                        </div>
                        
                        <div className="w-full h-3 bg-gray-50 dark:bg-slate-950 rounded-full overflow-hidden flex">
                            <div 
                                className="h-full bg-rose-500" 
                                style={{ width: `${(fixedExpenses / totalExpense) * 100}%` }}
                                title={t('fixed', 'Fixed')}
                            ></div>
                            <div 
                                className="h-full bg-amber-500" 
                                style={{ width: `${(variableExpenses / totalExpense) * 100}%` }}
                                title={t('variable', 'Variable')}
                            ></div>
                        </div>
                    </div>
                )}

                {debts.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                        <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">{t('debt_amortization', 'Debt Amortization Progress')}</h3>
                        
                        <div className="space-y-3">
                            {debts.map((d: any, idx: number) => {
                                const progress = d.principal > 0 ? Math.round((d.paid / d.principal) * 100) : 0;
                                return (
                                    <div key={idx} className="space-y-1.5 bg-gray-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">
                                        <div className="flex justify-between text-xs font-bold text-gray-800 dark:text-slate-200">
                                            <span>{d.lender}</span>
                                            <span>৳{number_format(d.remaining)} {t('remaining_debt', 'remaining')}</span>
                                        </div>
                                        
                                        <div className="w-full h-2.5 bg-white dark:bg-slate-900 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-rose-500 rounded-full" 
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                        
                                        <div className="flex justify-between text-[9px] text-gray-500 dark:text-slate-500 font-bold pt-1">
                                            <span>৳{number_format(d.paid)} {t('paid_label', 'Paid')}</span>
                                            <span>{t('total_debt_amount', 'Total Debt')}: ৳{number_format(d.principal)} ({progress}%)</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>
        </AuthenticatedLayout>
    );
}
