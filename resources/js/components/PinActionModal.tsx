import { useTranslation } from '@/hooks/useTranslation';
import { cancelActionPin, registerPinActionModal, submitActionPin, submitActionBiometric } from '@/lib/pin-guard';
import { usePage } from '@inertiajs/react';
import { Lock, X, Fingerprint } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

export default function PinActionModal() {
    const { t } = useTranslation();
    const { props } = usePage();
    const auth = props.auth as any;

    const [isOpen, setIsOpen] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [supportsBiometric, setSupportsBiometric] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.PublicKeyCredential) {
            setSupportsBiometric(true);
        }
        return registerPinActionModal(() => {
            setPin('');
            setError('');
            setIsOpen(true);
        });
    }, []);

    const close = () => {
        setIsOpen(false);
        setPin('');
        setError('');
        cancelActionPin();
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (pin.length !== 4) {
            setError(t('incorrect_pin', 'ভুল পিন কোড! আবার চেষ্টা করুন।'));
            return;
        }

        setIsOpen(false);
        setError('');
        submitActionPin(pin);
        setPin('');
    };

    const handleBiometricAuth = async () => {
        if (!auth.user?.username) return;

        try {
            setError('');
            // 1. Fetch options
            const response = await fetch('/biometrics/login-options', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
                },
                body: JSON.stringify({ username: auth.user.username })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Biometric options error.');
            }

            const options = await response.json();

            // 2. Decode challenge
            const challengeBuffer = Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0));

            // Decode credential ID
            const rawCredentialId = options.credentialId;
            const base64 = rawCredentialId.replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
            const credentialIdBuffer = Uint8Array.from(atob(padded), c => c.charCodeAt(0));

            // 3. Prompt biometric verification
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
                throw new Error('Biometric cancelled.');
            }

            // 4. Send biometric credential to guard resolver
            setIsOpen(false);
            setError('');
            submitActionBiometric(credential.id);
        } catch (err: any) {
            console.error(err);
            setError(t('biometric_auth_failed', 'বায়োমেট্রিক ভেরিফিকেশন ব্যর্থ হয়েছে।'));
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl animate-fade-in">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                                {t('pin_required_title', 'পিন প্রয়োজন')}
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                {t('pin_required_desc', 'সম্পাদনা বা মুছে ফেলতে ৪ ডিজিটের পিন লিখুন')}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={pin}
                            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="••••"
                            autoFocus
                            className="block w-full text-center tracking-[1.5em] font-mono text-2xl px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        {auth.user?.has_biometric && supportsBiometric && (
                            <button
                                type="button"
                                onClick={handleBiometricAuth}
                                className="absolute right-3.5 inset-y-0 text-emerald-500 hover:text-emerald-400 flex items-center justify-center transition-all active:scale-95"
                                title={t('use_biometric', 'বায়োমেট্রিক ব্যবহার করুন')}
                            >
                                <Fingerprint className="w-6 h-6" />
                            </button>
                        )}
                    </div>

                    {error && (
                        <p className="text-rose-500 text-xs text-center font-semibold">{error}</p>
                    )}

                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={close}
                            className="flex-1 py-3 rounded-2xl text-xs font-bold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                        >
                            {t('cancel', 'বাতিল')}
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl text-xs transition-all active:scale-[0.99]"
                        >
                            {t('verify', 'ভেরিফাই')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
