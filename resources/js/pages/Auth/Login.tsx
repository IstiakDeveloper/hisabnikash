import React, { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '../../layouts/GuestLayout';
import { Mail, Lock, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
    status?: string;
}

export default function Login({ status }: Props) {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
    const [supportsBiometric, setSupportsBiometric] = useState(false);
    const [biometricError, setBiometricError] = useState('');
    
    const { data, setData, post, processing, errors, reset } = useForm({
        login: '', // Can be username or email
        password: '',
        remember: true,
    });

    useEffect(() => {
        if (typeof window !== 'undefined' && window.PublicKeyCredential) {
            setSupportsBiometric(true);
        }
        return () => {
            reset('password');
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/login');
    };

    const handleBiometricLogin = async () => {
        if (!data.login) {
            setBiometricError(t('enter_username_for_biometric', 'বায়োমেট্রিক লগইনের জন্য প্রথমে ইউজারনেম বা ইমেইল লিখুন।'));
            return;
        }

        try {
            setBiometricError('');
            
            // 1. Fetch options from backend
            const response = await fetch('/biometrics/login-options', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
                },
                body: JSON.stringify({ username: data.login })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Biometric check failed.');
            }

            const options = await response.json();

            // 2. Decode challenge
            const challengeBuffer = Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0));

            // Decode credential ID
            const rawCredentialId = options.credentialId;
            const base64 = rawCredentialId.replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
            const credentialIdBuffer = Uint8Array.from(atob(padded), c => c.charCodeAt(0));

            // 3. Request credential verification from browser
            const credential = await navigator.credentials.get({
                publicKey: {
                    challenge: challengeBuffer,
                    allowCredentials: [{
                        type: 'public-key',
                        id: credentialIdBuffer
                    }],
                    rpId: options.rpId,
                    userVerification: 'required',
                    timeout: 60000
                }
            }) as PublicKeyCredential;

            if (!credential) {
                throw new Error('Biometric login cancelled.');
            }

            // 4. Send credential.id to login endpoint
            const loginResponse = await fetch('/biometrics/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
                },
                body: JSON.stringify({
                    credential_id: credential.id
                })
            });

            if (!loginResponse.ok) {
                const errData = await loginResponse.json();
                throw new Error(errData.message || 'Biometric login failed.');
            }

            const result = await loginResponse.json();
            if (result.success && result.redirect) {
                window.location.href = result.redirect;
            }
        } catch (err: any) {
            console.error(err);
            setBiometricError(err.message || t('biometric_login_failed', 'বায়োমেট্রিক লগইন ব্যর্থ হয়েছে।'));
        }
    };

    return (
        <GuestLayout>
            <Head title={t('login', 'Login')} />

            <div className="space-y-6">
                <div className="text-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">{t('login_heading', 'Sign in to your account')}</h2>
                    <p className="text-xs text-gray-500 dark:text-slate-500">{t('login_pin_instructions', 'Enter your email/username and 4-digit PIN')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* User ID / Email */}
                    <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider">{t('email_or_username', 'Email or Username')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 dark:text-slate-500">
                                <Mail className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                value={data.login}
                                onChange={(e) => setData('login', e.target.value)}
                                placeholder={t('email_or_username_placeholder', 'username or email')}
                                required
                                className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800 dark:text-slate-200"
                            />
                        </div>
                        {errors.login && <span className="text-xs text-rose-500 font-semibold">{errors.login}</span>}
                    </div>

                    {/* PIN */}
                    <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider">{t('pin_code_label', '4-Digit PIN')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 dark:text-slate-500">
                                <Lock className="w-4 h-4" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder={t('pin_placeholder', '0000')}
                                required
                                className="block w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800 dark:text-slate-200 tracking-[0.3em]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:text-slate-300"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {errors.password && <span className="text-xs text-rose-500 font-semibold">{errors.password}</span>}
                    </div>

                    {/* Session stays active */}
                    <div className="flex items-center justify-end text-xs text-gray-500 dark:text-slate-500">
                        <Link href="/forgot-password" className="text-emerald-500 hover:underline">{t('forgot_password', 'Forgot password?')}</Link>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-[0.98] mt-2"
                    >
                        {processing ? t('logging_in', 'Signing in...') : t('login', 'Login')}
                    </button>

                </form>

                {supportsBiometric && (
                    <button
                        type="button"
                        onClick={handleBiometricLogin}
                        className="w-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold py-3.5 rounded-2xl border border-gray-200 dark:border-slate-800 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
                    >
                        <Fingerprint className="w-5 h-5 text-emerald-500" />
                        <span>{t('biometric_login', 'বায়োমেট্রিক লগইন')}</span>
                    </button>
                )}

                {biometricError && (
                    <p className="text-rose-500 text-xs text-center font-semibold mt-2">{biometricError}</p>
                )}

                <div className="text-center pt-2">
                    <p className="text-xs text-gray-500 dark:text-slate-500">
                        {t('dont_have_account', "Don't have an account?")}{' '}
                        <Link href="/register" className="text-emerald-500 hover:underline font-bold">{t('sign_up', 'Sign up now')}</Link>
                    </p>
                </div>
            </div>
        </GuestLayout>
    );
}
