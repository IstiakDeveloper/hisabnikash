import React, { ReactNode, useState, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import FlashToast from '@/components/FlashToast';
import PinActionModal from '@/components/PinActionModal';
import { setupPinRouterGuard } from '@/lib/pin-guard';
import {
    Home, 
    ArrowLeftRight, 
    Coins, 
    PiggyBank, 
    Menu, 
    Plus, 
    X, 
    ChevronDown, 
    User, 
    LogOut, 
    PieChart, 
    Bell, 
    BookOpen, 
    Settings, 
    DollarSign, 
    Building, 
    Wallet, 
    Calendar,
    Share2,
    Lock,
    Fingerprint,
    CreditCard,
    FolderOpen
} from 'lucide-react';

interface Props {
    children: ReactNode;
}

export default function AuthenticatedLayout({ children }: Props) {
    const { props } = usePage();
    const auth = props.auth as any;
    const { t, locale } = useTranslation();
    
    // Shared parameters loaded in DashboardController
    const spaces = (props.spaces as any[]) || [];
    const accounts = (props.accounts as any[]) || [];
    const categories = (props.categories as any[]) || [];
    const loans = (props.loans as any[]) || [];
    const activeBudgets = (props.activeBudgets as any[]) || [];
    
    const activeSpaceId = (props.spaceId as string) || 'combined';
    const activeSpace = spaces.find(s => s.id == activeSpaceId);

    const [isSpaceMenuOpen, setIsSpaceMenuOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [fabTab, setFabTab] = useState<'expense' | 'income' | 'owners_draw' | 'pay_loan'>('expense');

    // Quick Add Form States
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [spaceId, setSpaceId] = useState('');
    const [description, setDescription] = useState('');
    const [note, setNote] = useState('');
    const [isFixed, setIsFixed] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrencePeriod, setRecurrencePeriod] = useState('monthly');

    // Owner's Draw states
    const [sourceSpaceId, setSourceSpaceId] = useState('');
    const [destSpaceId, setDestSpaceId] = useState('');

    // Pay Loan states
    const [selectedLoanId, setSelectedLoanId] = useState('');

    // PIN lock screen state
    const [isPinLocked, setIsPinLocked] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [supportsBiometric, setSupportsBiometric] = useState(false);
    
    // Page Route transition loading state
    const [isRouteLoading, setIsRouteLoading] = useState(false);

    // Selected Budget for Quick Expense
    const [selectedBudgetId, setSelectedBudgetId] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined' && window.PublicKeyCredential) {
            setSupportsBiometric(true);
        }
    }, []);

    useEffect(() => {
        // Auto-suggest spaces & categories based on FAB type
        if (spaces.length > 0) {
            const defSpace = spaces.find(s => s.is_default) || spaces[0];
            setSpaceId(defSpace.id.toString());
            setSourceSpaceId(spaces.find(s => s.type === 'business')?.id?.toString() || '');
            setDestSpaceId(spaces.find(s => s.type === 'personal')?.id?.toString() || '');
        }
        if (accounts.length > 0) {
            setAccountId(accounts[0].id.toString());
        }
    }, [isFabOpen, spaces, accounts]);

    useEffect(() => {
        // Handle categories filtering based on type and selected space
        if (categories.length > 0) {
            const type = fabTab === 'expense' ? 'expense' : 'income';
            const filtered = categories.filter(c => c.type === type && (c.space_id == spaceId || !c.space_id));
            if (filtered.length > 0) {
                setCategoryId(filtered[0].id.toString());
                setIsFixed(filtered[0].is_fixed);
            } else {
                setCategoryId('');
            }
        }
    }, [spaceId, fabTab, categories]);

    useEffect(() => {
        // Check if user has PIN lock configured
        if (auth.user?.pin_code && !sessionStorage.getItem('pin_unlocked')) {
            setIsPinLocked(true);
        }
    }, [auth.user]);

    useEffect(() => {
        let timeout: any = null;

        const startUnbind = router.on('start', () => {
            if (timeout) clearTimeout(timeout);
            // Only show loader if request takes more than 150ms to avoid flickering on fast pages
            timeout = setTimeout(() => {
                setIsRouteLoading(true);
            }, 150);
        });

        const finishUnbind = router.on('finish', () => {
            if (timeout) clearTimeout(timeout);
            setIsRouteLoading(false);
        });

        return () => {
            if (timeout) clearTimeout(timeout);
            startUnbind();
            finishUnbind();
        };
    }, []);

    useEffect(() => {
        return setupPinRouterGuard(() => Boolean(auth.user?.has_pin));
    }, [auth.user?.has_pin]);

    const handlePinVerify = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch('/settings/pin-verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ pin_code: pinInput }),
            });

            if (response.ok) {
                sessionStorage.setItem('pin_unlocked', 'true');
                setIsPinLocked(false);
                setPinError('');
                setPinInput('');
                return;
            }

            setPinError(t('incorrect_pin', 'ভুল পিন কোড! আবার চেষ্টা করুন।'));
            setPinInput('');
        } catch {
            setPinError(t('incorrect_pin', 'ভুল পিন কোড! আবার চেষ্টা করুন।'));
            setPinInput('');
        }
    };

    const handleBiometricUnlock = async () => {
        if (!auth.user?.username) return;

        try {
            setPinError('');
            
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
                throw new Error('Biometric unlock cancelled.');
            }

            // 4. Send credential.id to login endpoint to verify it matching DB
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
                throw new Error(errData.message || 'Biometric unlock failed.');
            }

            // Successfully unlocked!
            sessionStorage.setItem('pin_unlocked', 'true');
            setIsPinLocked(false);
            setPinError('');
            setPinInput('');
        } catch (err: any) {
            console.error(err);
            setPinError(err.message || t('biometric_unlock_failed', 'বায়োমেট্রিক আনলক ব্যর্থ হয়েছে।'));
        }
    };

    const handleSpaceChange = (id: string | number) => {
        setIsSpaceMenuOpen(false);
        router.get(window.location.pathname, { space_id: id }, { preserveState: true });
    };

    const handleCategoryChange = (catId: string) => {
        setCategoryId(catId);
        const cat = categories.find(c => c.id == catId);
        if (cat) {
            setIsFixed(cat.is_fixed);
        }
    };

    const handleBudgetChange = (bId: string) => {
        setSelectedBudgetId(bId);
        if (bId) {
            const budget = activeBudgets.find(b => b.id == bId);
            if (budget) {
                setSpaceId(budget.space_id.toString());
                setCategoryId(budget.category_id.toString());
                const cat = categories.find(c => c.id == budget.category_id);
                if (cat) {
                    setIsFixed(cat.is_fixed);
                }
            }
        }
    };

    const submitQuickAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || isNaN(Number(amount))) return;

        if (fabTab === 'expense' && !selectedBudgetId) {
            alert(t('budget_required_error', 'Selecting a budget is required for expenses.'));
            return;
        }

        if (fabTab === 'expense' || fabTab === 'income') {
            router.post('/transactions', {
                account_id: accountId,
                category_id: categoryId,
                space_id: spaceId,
                type: fabTab,
                amount: Number(amount),
                description: description || (fabTab === 'expense' ? 'Quick Expense' : 'Quick Income'),
                transaction_date: new Date().toISOString().split('T')[0],
                note: note,
                is_fixed: isFixed ? 1 : 0,
                payment_method: paymentMethod,
                is_recurring: isRecurring ? 1 : 0,
                recurrence_period: isRecurring ? recurrencePeriod : null,
            }, {
                onSuccess: () => {
                    resetForm();
                    setIsFabOpen(false);
                }
            });
        } else if (fabTab === 'owners_draw') {
            router.post('/spaces/owners-draw', {
                source_space_id: sourceSpaceId,
                dest_space_id: destSpaceId,
                account_id: accountId,
                amount: Number(amount),
                date: new Date().toISOString().split('T')[0],
                note: note || 'Owners Draw transfer',
            }, {
                onSuccess: () => {
                    resetForm();
                    setIsFabOpen(false);
                }
            });
        } else if (fabTab === 'pay_loan') {
            router.post('/loans/' + selectedLoanId + '/payment', {
                account_id: accountId,
                amount: Number(amount),
                note: note || 'Installment Payment',
            }, {
                onSuccess: () => {
                    resetForm();
                    setIsFabOpen(false);
                }
            });
        }
    };

    const resetForm = () => {
        setAmount('');
        setDescription('');
        setNote('');
        setIsRecurring(false);
        setSelectedBudgetId('');
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col items-center justify-center font-sans p-0 sm:p-4 overflow-x-hidden">
            <FlashToast />
            


            {/* Mobile Device Container Wrapper (Clean mobile frame container) */}
            <div className="relative w-full max-w-md h-screen sm:h-[860px] bg-white dark:bg-slate-900 shadow-2xl sm:rounded-[36px] sm:border-[6px] sm:border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden">

                <PinActionModal />

                {/* PIN Lock Screen Overlay */}
                {isPinLocked && (
                    <div className="absolute inset-0 z-50 bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 space-y-6">
                        <div className="flex flex-col items-center space-y-2">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 animate-pulse">
                                <Lock className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-slate-100">{t('verify_pin_title', 'পিন কোড ভেরিফাই')}</h2>
                            <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold">{t('enter_pin', 'চালিয়ে যেতে আপনার ৪ ডিজিটের পিন লিখুন')}</p>
                        </div>

                        <form onSubmit={handlePinVerify} className="w-full max-w-xs space-y-4">
                            <input
                                type="password"
                                maxLength={4}
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                placeholder="••••"
                                className="block w-full text-center tracking-[1.5em] font-mono text-2xl px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            {pinError && (
                                <p className="text-rose-500 text-xs text-center font-semibold">{pinError}</p>
                            )}
                            <button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-[0.99]"
                            >
                                {t('verify', 'ভেরিফাই')}
                            </button>
                            {auth.user?.has_biometric && supportsBiometric && (
                                <button
                                    type="button"
                                    onClick={handleBiometricUnlock}
                                    className="w-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 font-bold py-3.5 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-[0.99] mt-2"
                                >
                                    <Fingerprint className="w-5 h-5 text-emerald-500" />
                                    <span>{t('biometric_unlock', 'বায়োমেট্রিক আনলক')}</span>
                                </button>
                            )}
                        </form>
                    </div>
                )}

                {/* Premium Floating Header */}
                <header className="w-full bg-gray-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800/80 px-4 py-3 flex items-center justify-between z-10 sticky top-0">
                    
                    {/* Space Switcher */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsSpaceMenuOpen(!isSpaceMenuOpen)}
                            className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-gray-300 dark:border-slate-700 px-3.5 py-1.5 rounded-full text-xs font-bold text-gray-800 dark:text-slate-200 transition-all active:scale-95"
                        >
                            <Building className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{activeSpaceId === 'combined' ? t('all_spaces_combined', 'সব স্পেস (Combined)') : (activeSpace?.name || t('select_space', 'স্পেস সিলেক্ট'))}</span>
                            <ChevronDown className="w-3 h-3 text-gray-500 dark:text-slate-400" />
                        </button>

                        {isSpaceMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-20" onClick={() => setIsSpaceMenuOpen(false)}></div>
                                <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-30 animate-slide-up">
                                    <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-slate-500">{t('change_space', 'স্পেস পরিবর্তন')}</div>
                                    <button 
                                        onClick={() => handleSpaceChange('combined')}
                                        className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-800 ${activeSpaceId === 'combined' ? 'text-emerald-500 font-bold' : ''}`}
                                    >
                                        <span>{t('all_spaces_combined', 'সব স্পেস (Combined)')}</span>
                                    </button>
                                    {spaces.map(s => (
                                        <button 
                                            key={s.id}
                                            onClick={() => handleSpaceChange(s.id)}
                                            className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-800 ${activeSpaceId == s.id ? 'text-emerald-500 font-bold' : ''}`}
                                        >
                                            <span>{s.name}</span>
                                            <span className="text-[9px] bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full uppercase">{s.type}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right side: Theme, language switcher and settings link */}
                    <div className="flex items-center space-x-2">
                        <AppearanceToggleDropdown compact />
                        <button
                            onClick={() => router.post('/settings/language', { language: locale === 'en' ? 'bn' : 'en' })}
                            className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-[10px] font-black text-emerald-400 px-2.5 py-1.5 rounded-full border border-gray-300 dark:border-slate-700 transition-all active:scale-95 z-10"
                        >
                            {locale === 'en' ? 'বাংলা' : 'EN'}
                        </button>
                        <Link href="/settings/app" className="w-8 h-8 rounded-full bg-gray-100/80 dark:bg-slate-800/80 hover:bg-gray-200/80 dark:hover:bg-slate-700/80 border border-gray-300 dark:border-slate-700 flex items-center justify-center text-gray-800 dark:text-slate-200 transition-all">
                            <Settings className="w-4 h-4" />
                        </Link>
                    </div>
                </header>

                {/* Main Dynamic Viewport */}
                <main className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-28 relative">
                    {children}
                </main>

                {/* Floating Bottom Menu for Mobile Layout */}
                <nav className="absolute bottom-0 inset-x-0 bg-gray-50/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-900 px-3 py-2 flex items-center justify-between z-20 pb-safe-area select-none">
                    <Link href="/dashboard" className={`flex flex-col items-center justify-center w-12 py-1 space-y-1 ${window.location.pathname === '/dashboard' ? 'text-emerald-500' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}>
                        <Home className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{t('dashboard', 'হোম')}</span>
                    </Link>
                    <Link href="/transactions" className={`flex flex-col items-center justify-center w-12 py-1 space-y-1 ${window.location.pathname.startsWith('/transactions') ? 'text-emerald-500' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}>
                        <ArrowLeftRight className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{t('transactions', 'লেনদেন')}</span>
                    </Link>
                    
                    {/* Central Quick Add Action Button (FAB) */}
                    <div className="relative -top-4">
                        <button 
                            onClick={() => setIsFabOpen(true)}
                            className="w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-500 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all outline-none border border-emerald-400/20"
                        >
                            <Plus className="w-7 h-7" />
                        </button>
                    </div>

                    <Link href="/loans" className={`flex flex-col items-center justify-center w-12 py-1 space-y-1 ${window.location.pathname.startsWith('/loans') ? 'text-emerald-500' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}>
                        <Coins className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{t('loans', 'ঋণ/EMI')}</span>
                    </Link>
                    <button 
                        onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                        className={`flex flex-col items-center justify-center w-12 py-1 space-y-1 ${isMoreMenuOpen ? 'text-emerald-500' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
                    >
                        <Menu className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{t('menu', 'মেনু')}</span>
                    </button>
                </nav>

                {/* Dynamic Bottom Sheet Dialog for More Menu */}
                {isMoreMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs" onClick={() => setIsMoreMenuOpen(false)}></div>
                        <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 rounded-t-[32px] p-6 z-40 space-y-6 animate-slide-up shadow-2xl">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{t('more_menu', 'আরও মেনু')}</h3>
                                <button onClick={() => setIsMoreMenuOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <Link href="/budgets" onClick={() => setIsMoreMenuOpen(false)} className="flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-gray-300 dark:border-slate-700 p-4 rounded-2xl space-y-2 group transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
                                    <span className="text-[11px] font-bold">{t('budgets', 'বাজেট প্ল্যান')}</span>
                                </Link>
                                <Link href="/savings-goals" onClick={() => setIsMoreMenuOpen(false)} className="flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-gray-300 dark:border-slate-700 p-4 rounded-2xl space-y-2 group transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><PiggyBank className="w-5 h-5" /></div>
                                    <span className="text-[11px] font-bold">{t('savings_goals', 'সঞ্চয় লক্ষ্য')}</span>
                                </Link>
                                <Link href="/recurring-bills" onClick={() => setIsMoreMenuOpen(false)} className="flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-gray-300 dark:border-slate-700 p-4 rounded-2xl space-y-2 group transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center"><Calendar className="w-5 h-5" /></div>
                                    <span className="text-[11px] font-bold">{t('recurring_bills', 'পুনরাবৃত্ত বিল')}</span>
                                </Link>

                                <Link href="/accounts" onClick={() => setIsMoreMenuOpen(false)} className="flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-gray-300 dark:border-slate-700 p-4 rounded-2xl space-y-2 group transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center"><CreditCard className="w-5 h-5" /></div>
                                    <span className="text-[11px] font-bold">{t('accounts', 'অ্যাকাউন্টসমূহ')}</span>
                                </Link>
                                <Link href="/categories" onClick={() => setIsMoreMenuOpen(false)} className="flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-gray-300 dark:border-slate-700 p-4 rounded-2xl space-y-2 group transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center"><FolderOpen className="w-5 h-5" /></div>
                                    <span className="text-[11px] font-bold">{t('categories', 'ক্যাটাগরি')}</span>
                                </Link>
                                <Link href="/spaces" onClick={() => setIsMoreMenuOpen(false)} className="flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-gray-300 dark:border-slate-700 p-4 rounded-2xl space-y-2 group transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><Building className="w-5 h-5" /></div>
                                    <span className="text-[11px] font-bold">{t('spaces', 'স্পেস ও প্রোফাইল')}</span>
                                </Link>

                                <Link href="/reports" onClick={() => setIsMoreMenuOpen(false)} className="flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-gray-300 dark:border-slate-700 p-4 rounded-2xl space-y-2 group transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><PieChart className="w-5 h-5" /></div>
                                    <span className="text-[11px] font-bold">{t('reports', 'রিপোর্ট ও গ্রাফ')}</span>
                                </Link>
                                <Link href="/notes" onClick={() => setIsMoreMenuOpen(false)} className="flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-gray-300 dark:border-slate-700 p-4 rounded-2xl space-y-2 group transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center"><BookOpen className="w-5 h-5" /></div>
                                    <span className="text-[11px] font-bold">{t('notes', 'জার্নাল নোট')}</span>
                                </Link>
                                <Link href="/settings/app" onClick={() => setIsMoreMenuOpen(false)} className="flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-gray-300 dark:border-slate-700 p-4 rounded-2xl space-y-2 group transition-all">
                                    <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-gray-500 dark:text-slate-400 flex items-center justify-center"><Settings className="w-5 h-5" /></div>
                                    <span className="text-[11px] font-bold">{t('settings', 'সেটিংস')}</span>
                                </Link>
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
                                <Link 
                                    href="/logout" 
                                    method="post" 
                                    as="button" 
                                    className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold py-3.5 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>{t('logout', 'লগআউট করুন')}</span>
                                </Link>
                            </div>
                        </div>
                    </>
                )}

                {/* FAB Bottom Add Sheet Drawer */}
                {isFabOpen && (
                    <>
                        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs" onClick={() => setIsFabOpen(false)}></div>
                        <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 rounded-t-[32px] p-6 z-40 space-y-6 animate-slide-up max-h-[90%] overflow-y-auto shadow-2xl">
                            
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{t('quick_actions', 'দ্রুত এন্ট্রি')}</h3>
                                <button onClick={() => setIsFabOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* FAB Quick Add Tabs */}
                            <div className="flex space-x-1 bg-gray-50 dark:bg-slate-950 p-1.5 rounded-2xl">
                                <button 
                                    onClick={() => setFabTab('expense')}
                                    className={`flex-1 text-center py-2 text-xs font-bold rounded-xl transition-all ${fabTab === 'expense' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
                                >
                                    {t('expense', 'খরচ (Expense)')}
                                </button>
                                <button 
                                    onClick={() => setFabTab('income')}
                                    className={`flex-1 text-center py-2 text-xs font-bold rounded-xl transition-all ${fabTab === 'income' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
                                >
                                    {t('income', 'আয় (Income)')}
                                </button>
                                <button 
                                    onClick={() => setFabTab('owners_draw')}
                                    className={`flex-1 text-center py-2 text-xs font-bold rounded-xl transition-all ${fabTab === 'owners_draw' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
                                >
                                    {t('owners_draw', 'ওনার্স ড্র')}
                                </button>
                                <button 
                                    onClick={() => setFabTab('pay_loan')}
                                    className={`flex-1 text-center py-2 text-xs font-bold rounded-xl transition-all ${fabTab === 'pay_loan' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
                                >
                                    {t('emi_tab', 'কিস্তি (EMI)')}
                                </button>
                            </div>

                            {/* Forms Container */}
                            <form onSubmit={submitQuickAdd} className="space-y-4">
                                
                                {/* Validation errors panel */}
                                {Object.keys(props.errors || {}).length > 0 && (
                                    <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-xs font-semibold space-y-1">
                                        {Object.values(props.errors).map((err: any, i) => (
                                            <div key={i} className="flex items-center space-x-1.5">
                                                <span>• {err}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 1. Enter Amount */}
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider mb-1.5">{t('amount_taka', 'পরিমাণ (টাকা)')}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-2xl font-bold text-gray-500 dark:text-slate-400">৳</div>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            required
                                            className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-2xl font-bold text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                {fabTab !== 'owners_draw' && fabTab !== 'pay_loan' && (
                                    <>
                                        {/* Link to Budget (Only for Expense) */}
                                        {fabTab === 'expense' && (
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider mb-1.5">
                                                    {t('link_to_budget', 'Link to Budget')} <span className="text-red-500">*</span>
                                                </label>
                                                {activeBudgets.length > 0 ? (
                                                    <select
                                                        value={selectedBudgetId}
                                                        onChange={(e) => handleBudgetChange(e.target.value)}
                                                        required
                                                        className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                    >
                                                        <option value="">{t('select_budget', 'Select Budget')}</option>
                                                        {activeBudgets.map(b => {
                                                            const space = spaces.find(s => s.id === b.space_id);
                                                            const spaceName = space ? ` [${space.name}]` : '';
                                                            return (
                                                                <option key={b.id} value={b.id}>
                                                                    🎯 {b.name} (Limit: ৳{number_format(b.amount)}){spaceName}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                ) : (
                                                    <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-xs font-semibold">
                                                        ⚠️ {t('no_active_budgets_warning', 'No active budgets found for this month. Please create or clone a budget first before recording expenses.')}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Space Link */}
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider mb-1.5">
                                                {t('space', 'স্পেস / প্রোফাইল')} {!!selectedBudgetId && '🔒'}
                                            </label>
                                            <select
                                                value={spaceId}
                                                onChange={(e) => setSpaceId(e.target.value)}
                                                disabled={!!selectedBudgetId}
                                                className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
                                            >
                                                {spaces.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Categories */}
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider mb-1.5">{t('category', 'ক্যাটাগরি')}</label>
                                            <select
                                                value={categoryId}
                                                onChange={(e) => handleCategoryChange(e.target.value)}
                                                required
                                                className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            >
                                                <option value="">{t('select_category', 'ক্যাটাগরি সিলেক্ট করুন')}</option>
                                                {categories.filter(c => c.type === (fabTab === 'expense' ? 'expense' : 'income') && (c.space_id == spaceId || !c.space_id)).map(c => (
                                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider mb-1.5">{t('description_label', 'বিবরণ (Description)')}</label>
                                            <input
                                                type="text"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder={t('desc_placeholder', 'উদা: মাছ-সবজি কেনাকাটা...')}
                                                className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>

                                        {/* Payment method */}
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider mb-1.5">{t('payment_method', 'পেমেন্ট মাধ্যম')}</label>
                                            <select
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            >
                                                <option value="cash">💵 {t('cash_payment', 'Cash (নগদ)')}</option>
                                                <option value="mobile_banking">📱 {t('mobile_banking_payment', 'Mobile Banking (বিকাশ/নগদ)')}</option>
                                                <option value="bank">🏦 {t('bank_payment', 'Bank Transfer (ব্যাংক)')}</option>
                                                <option value="credit_card">💳 {t('credit_card_payment', 'Credit Card (ক্রেডিট কার্ড)')}</option>
                                            </select>
                                        </div>

                                        {/* Account */}
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider mb-1.5">{t('account', 'অ্যাকাউন্ট')}</label>
                                            <select
                                                value={accountId}
                                                onChange={(e) => setAccountId(e.target.value)}
                                                className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            >
                                                {accounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} (৳{number_format(a.balance)})</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Fixed vs Variable toggling (Suggested by category, editable) */}
                                        {fabTab === 'expense' && (
                                            <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs font-bold">{t('is_fixed_spending_q', 'এটি কি ফিক্সড খরচ? (Fixed Expense)')}</span>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={isFixed}
                                                    onChange={(e) => setIsFixed(e.target.checked)}
                                                    className="w-5 h-5 rounded-md border-gray-200 dark:border-slate-800 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900"
                                                />
                                            </div>
                                        )}

                                        {/* Recurring setups */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl">
                                                <span className="text-xs font-bold">{t('is_recurring_q', 'এটি কি পুনরাবৃত্ত লেনদেন? (Recurring)')}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={isRecurring}
                                                    onChange={(e) => setIsRecurring(e.target.checked)}
                                                    className="w-5 h-5 rounded-md border-gray-200 dark:border-slate-800 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900"
                                                />
                                            </div>

                                            {isRecurring && (
                                                <div>
                                                    <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider mb-1.5">{t('frequency', 'চক্র (Frequency)')}</label>
                                                    <select
                                                        value={recurrencePeriod}
                                                        onChange={(e) => setRecurrencePeriod(e.target.value)}
                                                        className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                    >
                                                        <option value="weekly">{t('weekly', 'সাপ্তাহিক (Weekly)')}</option>
                                                        <option value="monthly">{t('monthly', 'মাসিক (Monthly)')}</option>
                                                        <option value="yearly">{t('yearly', 'বাৎসরিক (Yearly)')}</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {fabTab === 'owners_draw' && (
                                    <>
                                        {/* Source space */}
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider mb-1.5">{t('source_space_business', 'উৎস স্পেস (ব্যবসা)')}</label>
                                            <select
                                                value={sourceSpaceId}
                                                onChange={(e) => setSourceSpaceId(e.target.value)}
                                                required
                                                className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            >
                                                <option value="">{t('select_source_space', 'উৎস স্পেস সিলেক্ট করুন')}</option>
                                                {spaces.filter(s => s.type === 'business').map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Destination space */}
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider mb-1.5">{t('dest_space_personal', 'গন্তব্য স্পেস (ব্যক্তিগত)')}</label>
                                            <select
                                                value={destSpaceId}
                                                onChange={(e) => setDestSpaceId(e.target.value)}
                                                required
                                                className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            >
                                                <option value="">{t('select_dest_space', 'গন্তব্য স্পেস সিলেক্ট করুন')}</option>
                                                {spaces.filter(s => s.type === 'personal').map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Account */}
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider mb-1.5">{t('source_account_desc', 'ব্যবহৃত অ্যাকাউন্ট (টাকা যেখান থেকে গেছে)')}</label>
                                            <select
                                                value={accountId}
                                                onChange={(e) => setAccountId(e.target.value)}
                                                required
                                                className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            >
                                                {accounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} (৳{number_format(a.balance)})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}

                                {fabTab === 'pay_loan' && (
                                    <>
                                        {/* Select Loan */}
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider mb-1.5">{t('select_loan', 'ঋণ সিলেক্ট করুন')}</label>
                                            <select
                                                value={selectedLoanId}
                                                onChange={(e) => {
                                                    setSelectedLoanId(e.target.value);
                                                    const loan = loans.find(l => l.id == e.target.value);
                                                    if (loan) setAmount(loan.monthly_installment.toString());
                                                }}
                                                required
                                                className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            >
                                                <option value="">{t('choose_loan_account', 'ঋণ বা কিস্তির হিসাব বেছে নিন')}</option>
                                                {loans.filter(l => !l.is_completed).map(l => (
                                                    <option key={l.id} value={l.id}>{l.person_name} (বাকি: ৳{number_format(l.remaining_amount)})</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Account */}
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider mb-1.5">{t('payment_account_desc', 'অ্যাকাউন্ট (যেখান থেকে পরিশোধ হচ্ছে)')}</label>
                                            <select
                                                value={accountId}
                                                onChange={(e) => setAccountId(e.target.value)}
                                                required
                                                className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            >
                                                {accounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} (৳{number_format(a.balance)})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}

                                {/* Note */}
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider mb-1.5">{t('note_optional', 'নোট (ঐচ্ছিক)')}</label>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder={t('write_important_info', 'গুরুত্বপূর্ণ তথ্য এখানে লিখুন...')}
                                        rows={2}
                                        className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.99]"
                                >
                                    {t('confirm_save_entry', 'নিশ্চিত করুন (Save Entry)')}
                                </button>
                            </form>
                        </div>
                    </>
                )}

                {/* Mobile Device Home indicator bar for premium native styling on desktop */}
                <div className="hidden sm:block absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-100 dark:bg-slate-800 rounded-full z-20"></div>
            </div>

            {/* Glowing centered iOS activity indicator card overlay */}
            {isRouteLoading && (
                <div className="fixed inset-0 z-50 bg-black/20 dark:bg-black/40 backdrop-blur-xs flex items-center justify-center">
                    <div className="w-24 h-24 bg-white/85 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-gray-200/60 dark:border-slate-800/80 flex items-center justify-center shadow-xl shadow-gray-200/50 dark:shadow-black/50 animate-fade-in">
                        <div className="ios-spinner">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple Helper to format numbers with commas
export function number_format(val: any) {
    if (val === null || val === undefined || isNaN(Number(val))) return '0';
    return Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
