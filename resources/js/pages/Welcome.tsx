import React from 'react';
import { Head, Link } from '@inertiajs/react';
import GuestLayout from '../layouts/GuestLayout';
import { ShieldCheck, PieChart, Sparkles } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function Welcome() {
    const { t } = useTranslation();

    return (
        <GuestLayout>
            <Head title={t('welcome_head_title', 'Welcome')} />
            
            <div className="space-y-8 py-4 flex flex-col items-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-emerald-500/20 border border-emerald-400/20 rotate-6 animate-pulse">
                    {t('app_logo_letter', 'H')}
                </div>

                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-black text-gray-900 dark:text-slate-100 tracking-tight">{t('welcome_headline', 'Finance Made Simple')}</h1>
                    <p className="text-xs text-gray-500 dark:text-slate-400 max-w-[240px] leading-relaxed">
                        {t('welcome_description', 'Track personal expenses, multiple businesses, and loan installments in one place.')}
                    </p>
                </div>

                <div className="w-full space-y-4">
                    <div className="flex items-start space-x-3.5 bg-gray-50/40 dark:bg-slate-950/40 border border-gray-200 dark:border-slate-800/80 p-3.5 rounded-2xl">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                            <PieChart className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200">{t('feature_spaces_title', 'Business & Personal Spaces')}</h4>
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-relaxed">{t('feature_spaces_desc', 'Rice Business, DesignFIC, and personal accounts in separate spaces.')}</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3.5 bg-gray-50/40 dark:bg-slate-950/40 border border-gray-200 dark:border-slate-800/80 p-3.5 rounded-2xl">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200">{t('feature_pin_lock_title', 'PIN Code Lock Security')}</h4>
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-relaxed">{t('feature_pin_lock_desc', 'PIN code lock and inactivity auto-logout protection.')}</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3.5 bg-gray-50/40 dark:bg-slate-950/40 border border-gray-200 dark:border-slate-800/80 p-3.5 rounded-2xl">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200">{t('feature_loans_title', 'Smart EMI & Installments')}</h4>
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-relaxed">{t('feature_loans_desc', 'Loan payment schedules and snowball & avalanche strategy tools.')}</p>
                        </div>
                    </div>
                </div>

                <div className="w-full pt-4 space-y-3">
                    <Link
                        href="/login"
                        className="block w-full text-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                    >
                        {t('welcome_cta_login', 'Log In')}
                    </Link>
                    
                    <Link
                        href="/register"
                        className="block w-full text-center bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98] border border-gray-300 dark:border-slate-700/60"
                    >
                        {t('welcome_new_account', 'New Account')}
                    </Link>
                </div>
            </div>
        </GuestLayout>
    );
}
