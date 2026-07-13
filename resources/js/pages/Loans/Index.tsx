import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout, { number_format } from '../../layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { 
    Plus, 
    Coins, 
    Calendar, 
    AlertCircle, 
    CheckCircle, 
    ArrowUpRight, 
    ArrowDownLeft, 
    ChevronDown, 
    ChevronRight,
    X,
    TrendingUp,
    Bookmark
} from 'lucide-react';

export default function Index(props: any) {
    const { t } = useTranslation();

    const {
        loans = [],
        accounts = [],
        spaces = [],
        avalancheStrategy = [],
        snowballStrategy = [],
        metrics = {},
        selectedSpaceId = ''
    } = props;

    const getLoanTypeLabel = (loanType: string) => {
        const labels: Record<string, string> = {
            personal_loan: t('personal_loan', 'Personal Loan'),
            credit_card_emi: t('credit_card_emi', 'Credit Card EMI'),
            microcredit: t('microcredit', 'Microcredit'),
            informal_family_loan: t('family_loan', 'Family/Friends Loan'),
        };
        return labels[loanType] ?? loanType.replace('_', ' ');
    };

    // UI Tab toggle: 'loans' | 'payoff_helper'
    const [activeTab, setActiveTab] = useState<'loans' | 'payoff_helper'>('loans');
    const [payoffStrategy, setPayoffStrategy] = useState<'snowball' | 'avalanche'>('snowball');

    // Add Loan States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [type, setType] = useState('taken');
    const [loanType, setLoanType] = useState('personal_loan');
    const [personName, setPersonName] = useState('');
    const [personPhone, setPersonPhone] = useState('');
    const [amount, setAmount] = useState('');
    const [loanDate, setLoanDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [interestRate, setInterestRate] = useState('0');
    const [monthlyInstallment, setMonthlyInstallment] = useState('');
    const [tenureMonths, setTenureMonths] = useState('12');
    const [spaceId, setSpaceId] = useState(spaces[0]?.id?.toString() || '');

    // Record Payment States
    const [isPayOpen, setIsPayOpen] = useState(false);
    const [payLoan, setPayLoan] = useState<any>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payAccountId, setPayAccountId] = useState(accounts[0]?.id?.toString() || '');
    const [selectedInstId, setSelectedInstId] = useState('');
    const [payNote, setPayNote] = useState('');

    // Detailed schedule viewer state
    const [viewScheduleLoan, setViewScheduleLoan] = useState<any>(null);

    const submitAddLoan = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/loans', {
            type,
            loan_type: loanType,
            person_name: personName,
            person_phone: personPhone,
            amount: Number(amount),
            loan_date: loanDate,
            due_date: dueDate || null,
            interest_rate: Number(interestRate),
            monthly_installment: Number(monthlyInstallment) || (Number(amount) / Number(tenureMonths)),
            tenure_months: Number(tenureMonths),
            space_id: spaceId,
        }, {
            onSuccess: () => {
                setIsAddOpen(false);
                resetAddForm();
            }
        });
    };

    const resetAddForm = () => {
        setPersonName('');
        setPersonPhone('');
        setAmount('');
        setLoanDate('');
        setDueDate('');
        setInterestRate('0');
        setMonthlyInstallment('');
        setTenureMonths('12');
    };

    const openPayModal = (loan: any, installment: any = null) => {
        setPayLoan(loan);
        setPayAmount(installment ? installment.amount.toString() : loan.monthly_installment.toString());
        setSelectedInstId(installment ? installment.id.toString() : '');
        setIsPayOpen(true);
    };

    const submitPayLoan = (e: React.FormEvent) => {
        e.preventDefault();
        if (!payLoan) return;

        router.post('/loans/' + payLoan.id + '/payment', {
            amount: Number(payAmount),
            account_id: payAccountId,
            installment_id: selectedInstId || null,
            note: payNote,
        }, {
            onSuccess: () => {
                setIsPayOpen(false);
                setPayLoan(null);
                setPayNote('');
                setViewScheduleLoan(null);
            }
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('loans_title_full', 'Loans & Installments (Loans/EMIs)')} />

            <div className="space-y-6">
                
                {/* 1. Page Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-slate-100">{t('loans_title_full', 'Loans & Installments (Loans/EMIs)')}</h2>
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 py-2.5 px-4 rounded-2xl text-xs font-bold text-white transition-all active:scale-95 flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t('add_loan', 'Add Loan')}</span>
                    </button>
                </div>

                {/* 2. Strategy Toggle Tabs */}
                <div className="flex space-x-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('loans')}
                        className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all ${
                            activeTab === 'loans' 
                                ? 'bg-gray-50 dark:bg-slate-950 text-emerald-500 shadow-sm border border-gray-200 dark:border-slate-800' 
                                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                        }`}
                    >
                        {t('active_loans_tab', 'Active Loans')} ({loans.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('payoff_helper')}
                        className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all ${
                            activeTab === 'payoff_helper' 
                                ? 'bg-gray-50 dark:bg-slate-950 text-emerald-500 shadow-sm border border-gray-200 dark:border-slate-800' 
                                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                        }`}
                    >
                        {t('payoff_strategy_helper', 'Payoff Strategy Helper')}
                    </button>
                </div>

                {activeTab === 'loans' ? (
                    <>
                        {/* 3. Debt metrics cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-4.5 space-y-1">
                                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 block">{t('total_outstanding_debt', 'Total Outstanding Debt')}</span>
                                <span className="text-2xl font-black text-gray-900 dark:text-slate-100 block">৳{number_format(metrics.totalDebt)}</span>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-4.5 space-y-1">
                                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 block">{t('monthly_emi_obligation', 'Monthly EMI Obligation')}</span>
                                <span className="text-2xl font-black text-rose-400 block">৳{number_format(metrics.totalMonthlyEMI)}</span>
                            </div>
                        </div>

                        {/* 4. Active loans list */}
                        <div className="space-y-4">
                            {loans.length === 0 ? (
                                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl py-12 text-center text-xs text-gray-500 dark:text-slate-500">
                                    {t('no_loans_recorded', 'No loans recorded yet.')}
                                </div>
                            ) : (
                                loans.map((loan: any) => {
                                    const totalPaid = loan.amount - loan.remaining_amount;
                                    const progress = loan.amount > 0 ? Math.round((totalPaid / loan.amount) * 100) : 0;
                                    const unpaidCount = loan.installments.filter((i: any) => i.status === 'unpaid').length;
                                    const paidCount = loan.installments.length - unpaidCount;

                                    return (
                                        <div key={loan.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                                            
                                            {/* Lender Details */}
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`text-[8px] uppercase font-bold px-2 py-0.5 rounded-full ${loan.type === 'taken' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'}`}>
                                                            {loan.type === 'taken' ? t('taken_label', 'Taken (Debt)') : t('given_label', 'Given (Receivable)')}
                                                        </span>
                                                        <span className="text-[8px] bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full uppercase font-bold">
                                                            {getLoanTypeLabel(loan.loan_type)}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">{loan.person_name}</h4>
                                                    {loan.person_phone && <p className="text-[10px] text-gray-500 dark:text-slate-500">{loan.person_phone}</p>}
                                                </div>
                                                
                                                <div className="text-right space-y-0.5">
                                                    <span className="text-[9px] text-gray-500 dark:text-slate-500 uppercase font-bold block">{t('remaining_label_loan', 'Remaining')}</span>
                                                    <span className="text-base font-black text-gray-900 dark:text-slate-100 block">৳{number_format(loan.remaining_amount)}</span>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="space-y-1.5">
                                                <div className="w-full h-2 bg-gray-50 dark:bg-slate-950 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all ${loan.type === 'taken' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between text-[9px] text-gray-500 dark:text-slate-500 font-bold">
                                                    <span>৳{number_format(totalPaid)} {t('paid_suffix', 'paid')}</span>
                                                    <span>{t('total_label', 'Total')}: ৳{number_format(loan.amount)} ({progress}%)</span>
                                                </div>
                                            </div>

                                            {/* Installment obligations info */}
                                            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-slate-400 bg-gray-50/60 dark:bg-slate-950/60 p-3 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800">
                                                <div>
                                                    <span className="text-[9px] uppercase text-gray-500 dark:text-slate-500 font-bold block">{t('monthly_installment', 'Monthly Installment')}</span>
                                                    <span className="font-bold text-gray-800 dark:text-slate-200">৳{number_format(loan.monthly_installment)}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[9px] uppercase text-gray-500 dark:text-slate-500 font-bold block">{t('installment_payment', 'Installment Payment')}</span>
                                                    <span className="font-bold text-gray-800 dark:text-slate-200">{paidCount} {t('of_label', 'of')} {loan.installments.length} {t('paid_status', 'Paid')}</span>
                                                </div>
                                            </div>

                                            {/* Action triggers */}
                                            <div className="flex space-x-2 pt-1">
                                                <button
                                                    onClick={() => setViewScheduleLoan(viewScheduleLoan?.id === loan.id ? null : loan)}
                                                    className="flex-1 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-gray-300 dark:border-slate-700 py-2.5 rounded-xl text-[11px] font-bold text-gray-700 dark:text-slate-300 transition-all"
                                                >
                                                    {viewScheduleLoan?.id === loan.id
                                                        ? t('close_schedule', 'Close Schedule')
                                                        : `${t('installment_schedule', 'Installment Schedule')} (${unpaidCount} ${t('unpaid_count', 'unpaid')})`}
                                                </button>
                                                
                                                {!loan.is_completed && (
                                                    <button
                                                        onClick={() => openPayModal(loan)}
                                                        className="bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 rounded-xl text-[11px] font-bold text-white transition-all active:scale-95"
                                                    >
                                                        {t('make_payment', 'Make Payment')}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Schedule Amortization Month-by-month List */}
                                            {viewScheduleLoan?.id === loan.id && (
                                                <div className="border-t border-gray-200 dark:border-gray-200 dark:border-slate-800 pt-4 mt-2 space-y-2.5 animate-fadeIn">
                                                    <h5 className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider">{t('amortization_schedule', 'Amortization Schedule')}</h5>
                                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                                        {loan.installments.map((inst: any, idx: number) => (
                                                            <div key={inst.id} className="bg-gray-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-200 dark:border-gray-200 dark:border-slate-800 flex items-center justify-between text-xs">
                                                                <div className="space-y-0.5">
                                                                    <span className="font-bold text-gray-700 dark:text-slate-300 block">{t('installment_number', 'Installment')} #{idx + 1}</span>
                                                                    <span className="text-[9px] text-gray-500 dark:text-slate-500 block">{inst.due_date.substring(0, 10)}</span>
                                                                </div>
                                                                
                                                                <div className="flex items-center space-x-3">
                                                                    <span className="font-bold text-gray-800 dark:text-slate-200">৳{number_format(inst.amount)}</span>
                                                                    {inst.status === 'paid' ? (
                                                                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center font-bold">
                                                                            <CheckCircle className="w-3 h-3 mr-1" /> {t('paid_status', 'Paid')}
                                                                        </span>
                                                                    ) : (
                                                                        <button 
                                                                            onClick={() => openPayModal(loan, inst)}
                                                                            className="bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border border-amber-500/20 px-2.5 py-1 rounded-full text-[9px] font-bold transition-all"
                                                                        >
                                                                            {t('pay_due', 'Pay Due')}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                ) : (
                    /* Payoff strategies avalanche vs snowball */
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-5">
                        <div className="space-y-1.5">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center">
                                <TrendingUp className="w-4.5 h-4.5 text-emerald-500 mr-2" />
                                {t('pay_off_planner', 'Debt Payoff Planner (Payoff Strategy Helper)')}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                                {t('payoff_strategy_desc', 'Guidance on which loan to pay off first with extra money to become debt-free faster.')}
                            </p>
                        </div>

                        {/* Sub tab toggles */}
                        <div className="flex bg-gray-50 dark:bg-slate-950 p-1 rounded-xl text-xs">
                            <button
                                onClick={() => setPayoffStrategy('snowball')}
                                className={`flex-1 py-2 text-center font-bold rounded-lg transition-all ${payoffStrategy === 'snowball' ? 'bg-white dark:bg-slate-900 text-emerald-500' : 'text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:text-slate-300'}`}
                            >
                                {t('snowball_strategy', 'Snowball (Smallest Balance First)')}
                            </button>
                            <button
                                onClick={() => setPayoffStrategy('avalanche')}
                                className={`flex-1 py-2 text-center font-bold rounded-lg transition-all ${payoffStrategy === 'avalanche' ? 'bg-white dark:bg-slate-900 text-emerald-500' : 'text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:text-slate-300'}`}
                            >
                                {t('avalanche_strategy', 'Avalanche (Highest Interest First)')}
                            </button>
                        </div>

                        <div className="space-y-3 pt-2">
                            <h4 className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider">{t('recommended_payoff_order', 'Recommended Payoff Order')}</h4>
                            
                            {(payoffStrategy === 'snowball' ? snowballStrategy : avalancheStrategy).length === 0 ? (
                                <div className="text-center py-6 text-xs text-gray-500 dark:text-slate-500">{t('no_debt_to_pay', 'No debt found to pay off.')}</div>
                            ) : (
                                (payoffStrategy === 'snowball' ? snowballStrategy : avalancheStrategy).map((loan: any, idx: number) => (
                                    <div key={loan.id} className="bg-gray-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs font-bold text-emerald-500 flex items-center justify-center">
                                                #{idx + 1}
                                            </div>
                                            <div className="space-y-0.5">
                                                <span className="text-xs font-bold text-gray-800 dark:text-slate-200 block">{loan.person_name}</span>
                                                <span className="text-[9px] text-gray-500 dark:text-slate-500 block">{t('interest_rate_label', 'Interest Rate')}: {loan.interest_rate}% • {t('installment_label', 'Installment')}: ৳{number_format(loan.monthly_installment)}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-black text-gray-800 dark:text-slate-200 block">৳{number_format(loan.remaining_amount)}</span>
                                            <span className="text-[9px] text-emerald-500 font-bold block">{idx === 0 ? t('main_target', 'Main Target') : t('minimum_payment', 'Keep Minimum Payment')}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Add Loan Modal Bottom Sheet */}
            {isAddOpen && (
                <>
                    <div className="fixed inset-0 z-35 bg-black/60 backdrop-blur-xs" onClick={() => setIsAddOpen(false)}></div>
                    <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 rounded-t-[32px] p-6 z-40 space-y-5 animate-slide-up max-h-[85%] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{t('add_new_loan', 'Add New Loan')}</h3>
                            <button onClick={() => setIsAddOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={submitAddLoan} className="space-y-4">
                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('loan_type_field', 'Loan Type')}</label>
                                <select value={type} onChange={(e) => setType(e.target.value)} className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs">
                                    <option value="taken">{t('taken_option', 'Taken (Debt - what I borrowed)')}</option>
                                    <option value="given">{t('given_option', 'Given (Receivable - what I lent)')}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('category_type', 'Category Type')}</label>
                                <select value={loanType} onChange={(e) => setLoanType(e.target.value)} className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs">
                                    <option value="personal_loan">{t('personal_loan', 'Personal Loan')}</option>
                                    <option value="credit_card_emi">{t('credit_card_emi', 'Credit Card EMI')}</option>
                                    <option value="microcredit">{t('microcredit', 'Microcredit')}</option>
                                    <option value="informal_family_loan">{t('family_loan', 'Family/Friends Loan')}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('person_name', 'Person / Source Name')}</label>
                                <input type="text" value={personName} onChange={(e) => setPersonName(e.target.value)} required className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs" />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('mobile_optional', 'Mobile Number (Optional)')}</label>
                                <input type="text" value={personPhone} onChange={(e) => setPersonPhone(e.target.value)} className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs" />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('principal_amount', 'Principal Amount')}</label>
                                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs" />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('monthly_installment_amount', 'Monthly Installment Amount')}</label>
                                <input type="number" value={monthlyInstallment} onChange={(e) => setMonthlyInstallment(e.target.value)} placeholder="0.00" className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs" />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('tenure_months', 'Tenure (Months)')}</label>
                                <input type="number" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} required className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs" />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('interest_rate_annual', 'Interest Rate (% - Annual)')}</label>
                                <input type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs" />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('loan_start_date', 'Start Date')}</label>
                                <input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)} required className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs" />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('loan_end_date_optional', 'Payoff End Date (Optional)')}</label>
                                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs" />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('linked_space', 'Linked Space')}</label>
                                <select value={spaceId} onChange={(e) => setSpaceId(e.target.value)} required className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs">
                                    {spaces.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all">
                                {t('submit_loan', 'Add Loan to List')}
                            </button>
                        </form>
                    </div>
                </>
            )}

            {/* Record Payment Modal Bottom Sheet */}
            {isPayOpen && (
                <>
                    <div className="fixed inset-0 z-35 bg-black/60 backdrop-blur-xs" onClick={() => setIsPayOpen(false)}></div>
                    <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 rounded-t-[32px] p-6 z-40 space-y-5 animate-slide-up">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{t('record_loan_payment', 'Record Loan Payment')}</h3>
                            <button onClick={() => setIsPayOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={submitPayLoan} className="space-y-4">
                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('payment_amount', 'Payment Amount')}</label>
                                <input 
                                    type="number" 
                                    value={payAmount} 
                                    onChange={(e) => setPayAmount(e.target.value)} 
                                    required 
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-lg font-bold focus:outline-none" 
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('source_account', 'Source Account')}</label>
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
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('note_optional_short', 'Note (Optional)')}</label>
                                <input 
                                    type="text" 
                                    value={payNote} 
                                    onChange={(e) => setPayNote(e.target.value)} 
                                    placeholder={t('installment_note_placeholder', 'Installment name or comment...')} 
                                    className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none" 
                                />
                            </div>

                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all">
                                {t('confirm_transaction', 'Confirm Transaction')}
                            </button>
                        </form>
                    </div>
                </>
            )}

        </AuthenticatedLayout>
    );
}
