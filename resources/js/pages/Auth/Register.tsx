import React, { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '../../layouts/GuestLayout';
import { User, Mail, Lock } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function Register() {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/register');
    };

    const handlePinInput = (field: 'password' | 'password_confirmation', value: string) => {
        setData(field, value.replace(/\D/g, '').slice(0, 4));
    };

    return (
        <GuestLayout>
            <Head title={t('register', 'Register')} />

            <div className="space-y-5">
                <div className="text-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">{t('register_heading', 'Create a new account')}</h2>
                    <p className="text-xs text-gray-500 dark:text-slate-500">{t('register_instructions', 'Fill in the details below to get started')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                    {/* Full Name */}
                    <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider">{t('full_name', 'Full Name')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 dark:text-slate-500">
                                <User className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder={t('full_name_placeholder', 'Full Name')}
                                required
                                className="block w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800 dark:text-slate-200"
                            />
                        </div>
                        {errors.name && <span className="text-xs text-rose-500 font-semibold">{errors.name}</span>}
                    </div>

                    {/* Username */}
                    <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider">{t('username', 'Username')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 dark:text-slate-500">
                                <User className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                value={data.username}
                                onChange={(e) => setData('username', e.target.value)}
                                placeholder={t('username_placeholder', 'username')}
                                required
                                className="block w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800 dark:text-slate-200"
                            />
                        </div>
                        {errors.username && <span className="text-xs text-rose-500 font-semibold">{errors.username}</span>}
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider">{t('email_address', 'Email Address')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 dark:text-slate-500">
                                <Mail className="w-4 h-4" />
                            </div>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder={t('email_placeholder', 'email@example.com')}
                                required
                                className="block w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800 dark:text-slate-200"
                            />
                        </div>
                        {errors.email && <span className="text-xs text-rose-500 font-semibold">{errors.email}</span>}
                    </div>

                    {/* PIN */}
                    <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider">{t('pin_code_label', '4-Digit PIN')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 dark:text-slate-500">
                                <Lock className="w-4 h-4" />
                            </div>
                            <input
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                value={data.password}
                                onChange={(e) => handlePinInput('password', e.target.value)}
                                placeholder={t('pin_placeholder', '0000')}
                                required
                                className="block w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800 dark:text-slate-200 tracking-[0.3em]"
                            />
                        </div>
                        {errors.password && <span className="text-xs text-rose-500 font-semibold">{errors.password}</span>}
                    </div>

                    {/* Confirm PIN */}
                    <div className="space-y-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider">{t('confirm_pin', 'Confirm PIN')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 dark:text-slate-500">
                                <Lock className="w-4 h-4" />
                            </div>
                            <input
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                value={data.password_confirmation}
                                onChange={(e) => handlePinInput('password_confirmation', e.target.value)}
                                placeholder={t('pin_placeholder', '0000')}
                                required
                                className="block w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800 dark:text-slate-200 tracking-[0.3em]"
                            />
                        </div>
                        {errors.password_confirmation && <span className="text-xs text-rose-500 font-semibold">{errors.password_confirmation}</span>}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-[0.98] mt-2 text-sm"
                    >
                        {processing ? t('registering', 'Registering...') : t('complete_registration', 'Complete Registration')}
                    </button>
                </form>

                <div className="text-center pt-1">
                    <p className="text-xs text-gray-500 dark:text-slate-500">
                        {t('already_have_account', 'Already have an account?')}{' '}
                        <Link href="/login" className="text-emerald-500 hover:underline font-bold">{t('login', 'Login')}</Link>
                    </p>
                </div>
            </div>
        </GuestLayout>
    );
}
