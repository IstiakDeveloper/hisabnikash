import React, { useState, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout, { number_format } from '../../layouts/AuthenticatedLayout';
import { useTranslation } from '@/hooks/useTranslation';
import AppearanceTabs from '@/components/appearance-tabs';
import { 
    User, 
    Lock, 
    Trash2, 
    Plus, 
    Building, 
    ShieldCheck, 
    Download,
    Upload,
    RefreshCw, 
    X,
    FolderPlus,
    Palette,
    Clock,
    Activity,
    LogOut,
    Check,
    Fingerprint,
    SunMoon
} from 'lucide-react';

export default function Index(props: any) {
    const {
        user = {},
        categories = [],
        spaces = [],
        loginLogs = []
    } = props;

    const { t, locale } = useTranslation();

    // Local toggles
    const [activeSection, setActiveSection] = useState<'profile' | 'spaces' | 'categories' | 'security'>('profile');
    const [isAddSpaceOpen, setIsAddSpaceOpen] = useState(false);
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

    // Profile State
    const profileForm = useForm({
        name: user.name,
        currency: user.currency,
        timezone: user.timezone,
        language: user.language || 'en'
    });

    // PIN lock form
    const pinForm = useForm({
        pin_code: ''
    });

    // Reset Form
    const resetForm = useForm({
        password: ''
    });

    const [backupFile, setBackupFile] = useState<File | null>(null);
    const restoreForm = useForm({
        password: '',
    });

    // Biometric Login States & Logic
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [biometricStatus, setBiometricStatus] = useState(user.has_biometric ? 'registered' : 'unregistered');
    const [biometricError, setBiometricError] = useState('');
    const [biometricSuccess, setBiometricSuccess] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && ['profile', 'spaces', 'categories', 'security'].includes(tab)) {
            setActiveSection(tab as any);
        }
    }, []);

    useEffect(() => {
        if (window.PublicKeyCredential) {
            PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then(result => {
                    setIsBiometricSupported(result);
                })
                .catch(() => {
                    setIsBiometricSupported(false);
                });
        }
    }, []);

    const handleRegisterBiometric = async () => {
        try {
            setBiometricError('');
            setBiometricSuccess('');
            
            // 1. Get options from backend
            const response = await fetch('/biometrics/register-options', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
                }
            });
            
            if (!response.ok) {
                throw new Error(t('biometric_fetch_error', 'Could not fetch biometric configuration from server.'));
            }
            
            const options = await response.json();
            
            // 2. Decode challenge and user ID from Base64
            const challengeBuffer = Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0));
            const userIdBuffer = Uint8Array.from(atob(options.user.id), c => c.charCodeAt(0));
            
            // 3. Configure credentials request
            const credentialOptions: CredentialCreationOptions = {
                publicKey: {
                    challenge: challengeBuffer,
                    rp: {
                        name: options.rp.name,
                        id: options.rp.id,
                    },
                    user: {
                        id: userIdBuffer,
                        name: options.user.name,
                        displayName: options.user.displayName,
                    },
                    pubKeyCredParams: [
                        { type: 'public-key', alg: -7 },  // ES256
                        { type: 'public-key', alg: -257 } // RS256
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        userVerification: 'required'
                    },
                    timeout: 60000,
                    attestation: 'none'
                }
            };
            
            // 4. Trigger browser credential creation
            const credential = await navigator.credentials.create(credentialOptions) as PublicKeyCredential;
            
            if (!credential) {
                throw new Error(t('biometric_cancelled', 'Device biometric registration was cancelled.'));
            }
            
            // 5. Send credential.id to backend
            const saveResponse = await fetch('/biometrics/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
                },
                body: JSON.stringify({
                    credential_id: credential.id
                })
            });
            
            if (!saveResponse.ok) {
                throw new Error(t('biometric_save_error', 'Could not save biometric to server.'));
            }
            
            setBiometricSuccess(t('biometric_register_success', 'Device biometric registered successfully!'));
            setBiometricStatus('registered');
            router.reload({ only: ['user'] });
        } catch (err: any) {
            console.error(err);
            setBiometricError(err.message || t('biometric_register_error', 'Biometric registration failed. Make sure your device biometric is enabled.'));
        }
    };

    const handleRemoveBiometric = async () => {
        try {
            setBiometricError('');
            setBiometricSuccess('');
            
            const response = await fetch('/biometrics/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
                },
                body: JSON.stringify({
                    credential_id: ''
                })
            });
            
            if (!response.ok) {
                throw new Error(t('biometric_remove_error', 'Could not remove biometric.'));
            }
            
            setBiometricSuccess(t('biometric_disable_success', 'Biometric disabled successfully!'));
            setBiometricStatus('unregistered');
            router.reload({ only: ['user'] });
        } catch (err: any) {
            console.error(err);
            setBiometricError(err.message || t('biometric_disable_error', 'Failed to disable biometric.'));
        }
    };

    // Space Form
    const [spaceName, setSpaceName] = useState('');
    const [spaceType, setSpaceType] = useState('business');

    // Category Form
    const [catName, setCatName] = useState('');
    const [catIcon, setCatIcon] = useState('📁');
    const [catColor, setCatColor] = useState('#EC4899');
    const [catType, setCatType] = useState('expense');
    const [catIsFixed, setCatIsFixed] = useState(false);
    const [catSpaceId, setCatSpaceId] = useState(spaces[0]?.id?.toString() || '');

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        profileForm.post('/settings/profile');
    };

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        pinForm.post('/settings/pin', {
            onSuccess: () => pinForm.reset()
        });
    };

    const handleAddSpace = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/spaces', {
            name: spaceName,
            type: spaceType
        }, {
            onSuccess: () => {
                setIsAddSpaceOpen(false);
                setSpaceName('');
            }
        });
    };

    const handleDeleteSpace = (id: number) => {
        if (confirm(t('delete_space_confirm', 'Are you sure you want to delete this space? All associated categories and transactions might be lost.'))) {
            router.delete('/spaces/' + id);
        }
    };

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/categories', {
            name: catName,
            type: catType,
            icon: catIcon,
            color: catColor,
            is_fixed: catIsFixed ? 1 : 0,
            space_id: catSpaceId,
        }, {
            onSuccess: () => {
                setIsAddCategoryOpen(false);
                setCatName('');
            }
        });
    };

    const handleDeleteCategory = (id: number) => {
        if (confirm(t('delete_category_confirm', 'Are you sure you want to delete this category?'))) {
            router.delete('/categories/' + id);
        }
    };

    const handleResetData = (e: React.FormEvent) => {
        e.preventDefault();
        if (confirm(t('confirm_reset_data', 'WARNING! Resetting data will permanently delete all transactions, installments, and budgets. Are you sure?'))) {
            resetForm.post('/settings/reset', {
                onSuccess: () => resetForm.reset()
            });
        }
    };

    const handleRestoreBackup = (e: React.FormEvent) => {
        e.preventDefault();

        if (!backupFile) {
            return;
        }

        if (!confirm(t('confirm_restore_backup', 'Warning! Restoring will replace all current financial data with the backup. Continue?'))) {
            return;
        }

        const formData = new FormData();
        formData.append('backup_file', backupFile);
        formData.append('password', restoreForm.data.password);

        router.post('/settings/restore', formData, {
            forceFormData: true,
            onSuccess: () => {
                restoreForm.reset();
                setBackupFile(null);
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-slate-100">{t('settings_title', 'App Settings & Customizations')}</h2>
                </div>

                {/* Sub-menu navigations */}
                <div className="grid grid-cols-4 gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-2xl text-[10px] font-bold text-center">
                    <button onClick={() => setActiveSection('profile')} className={`py-2 rounded-xl transition-all ${activeSection === 'profile' ? 'bg-gray-50 dark:bg-slate-950 text-emerald-500 border border-gray-200 dark:border-slate-800' : 'text-gray-500 dark:text-slate-400'}`}>{t('profile_section', 'Profile')}</button>
                    <button onClick={() => setActiveSection('spaces')} className={`py-2 rounded-xl transition-all ${activeSection === 'spaces' ? 'bg-gray-50 dark:bg-slate-950 text-emerald-500 border border-gray-200 dark:border-slate-800' : 'text-gray-500 dark:text-slate-400'}`}>{t('spaces_section', 'Spaces')}</button>
                    <button onClick={() => setActiveSection('categories')} className={`py-2 rounded-xl transition-all ${activeSection === 'categories' ? 'bg-gray-50 dark:bg-slate-950 text-emerald-500 border border-gray-200 dark:border-slate-800' : 'text-gray-500 dark:text-slate-400'}`}>{t('categories_section', 'Categories')}</button>
                    <button onClick={() => setActiveSection('security')} className={`py-2 rounded-xl transition-all ${activeSection === 'security' ? 'bg-gray-50 dark:bg-slate-950 text-emerald-500 border border-gray-200 dark:border-slate-800' : 'text-gray-500 dark:text-slate-400'}`}>{t('security_section', 'Security')}</button>
                </div>

                {/* --- 1. PROFILE SECTION --- */}
                {activeSection === 'profile' && (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                        <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400 flex items-center"><User className="w-4.5 h-4.5 text-emerald-500 mr-2" /> {t('profile_info', 'Profile Information')}</h3>

                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('full_name', 'Full Name')}</label>
                                <input
                                    type="text"
                                    value={profileForm.data.name}
                                    onChange={(e) => profileForm.setData('name', e.target.value)}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs text-gray-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('default_currency', 'Default Currency')}</label>
                                <select
                                    value={profileForm.data.currency}
                                    onChange={(e) => profileForm.setData('currency', e.target.value)}
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs text-gray-700 dark:text-slate-300"
                                >
                                    <option value="BDT">BDT (৳)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('timezone', 'Timezone')}</label>
                                <select
                                    value={profileForm.data.timezone}
                                    onChange={(e) => profileForm.setData('timezone', e.target.value)}
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs text-gray-700 dark:text-slate-300"
                                >
                                    <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                                    <option value="UTC">UTC (GMT+0)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('language_setting', 'Language / ভাষা')}</label>
                                <select
                                    value={profileForm.data.language}
                                    onChange={(e) => profileForm.setData('language', e.target.value)}
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs text-gray-700 dark:text-slate-300"
                                >
                                    <option value="en">{t('english', 'English')}</option>
                                    <option value="bn">{t('bangla', 'বাংলা (Bengali)')}</option>
                                </select>
                            </div>

                            <div>
                                <label className="flex text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-2 items-center">
                                    <SunMoon className="w-3.5 h-3.5 text-emerald-500 mr-1.5" />
                                    {t('theme_settings', 'Theme / থিম')}
                                </label>
                                <AppearanceTabs className="w-full flex" />
                            </div>

                            <button
                                type="submit"
                                disabled={profileForm.processing}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all"
                            >
                                {t('save_profile', 'Save Profile')}
                            </button>
                        </form>
                    </div>
                )}

                {/* --- 2. SPACES SECTION --- */}
                {activeSection === 'spaces' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400 flex items-center"><Building className="w-4.5 h-4.5 text-emerald-500 mr-2" /> {t('spaces_title', 'Workspace Management')}</h3>
                            <button onClick={() => setIsAddSpaceOpen(true)} className="text-emerald-500 hover:underline text-xs font-bold flex items-center">
                                <Plus className="w-4 h-4 mr-0.5" /> {t('add_space', 'Create New Space')}
                            </button>
                        </div>

                        <div className="space-y-3">
                            {spaces.map((s: any) => (
                                <div key={s.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-4.5 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs font-bold text-gray-800 dark:text-slate-200">{s.name}</span>
                                            {s.is_default && <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">{t('default_label', 'Default')}</span>}
                                        </div>
                                        <span className="text-[9px] text-gray-500 dark:text-slate-500 uppercase font-bold block">{s.type}</span>
                                    </div>

                                    {!s.is_default && (
                                        <button onClick={() => handleDeleteSpace(s.id)} className="text-gray-500 dark:text-slate-500 hover:text-rose-500 transition-all p-1">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- 3. CATEGORIES SECTION --- */}
                {activeSection === 'categories' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400 flex items-center"><Palette className="w-4.5 h-4.5 text-emerald-500 mr-2" /> {t('expense_income_categories', 'Expense & Income Categories')}</h3>
                            <button onClick={() => setIsAddCategoryOpen(true)} className="text-emerald-500 hover:underline text-xs font-bold flex items-center">
                                <Plus className="w-4 h-4 mr-0.5" /> {t('add_category_btn', 'Add Category')}
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                            {categories.map((c: any) => (
                                <div key={c.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-lg bg-gray-50 dark:bg-slate-950 p-1.5 rounded-xl border border-gray-200 dark:border-gray-200 dark:border-slate-800" style={{ color: c.color }}>{c.icon}</span>
                                        <div className="space-y-0.5">
                                            <span className="text-xs font-bold text-gray-800 dark:text-slate-200 block">{c.name}</span>
                                            <span className="text-[9px] text-gray-500 dark:text-slate-500 font-bold block uppercase tracking-wider">
                                                {c.type} • {c.is_fixed ? t('fixed', 'Fixed') : t('variable', 'Variable')} • {c.space?.name || t('all_spaces', 'All Spaces')}
                                            </span>
                                        </div>
                                    </div>

                                    <button onClick={() => handleDeleteCategory(c.id)} className="text-gray-500 dark:text-slate-500 hover:text-rose-500 transition-all p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- 4. SECURITY & PRIVACY SECTION --- */}
                {activeSection === 'security' && (
                    <div className="space-y-5">
                        
                        {/* Biometric Configuration */}
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                            <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400 flex items-center">
                                <Fingerprint className="w-4.5 h-4.5 text-emerald-500 mr-2" /> 
                                {t('biometric_login', 'Biometric Login (Face ID / Fingerprint)')}
                            </h3>
                            
                            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed text-[11px]">
                                {t('biometric_login_desc', "Enable quick login using your device's biometric authentication (such as Face ID or fingerprint sensor) instead of a password.")}
                            </p>

                            {biometricError && (
                                <div className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-[11px]">
                                    {biometricError}
                                </div>
                            )}

                            {biometricSuccess && (
                                <div className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-[11px]">
                                    {biometricSuccess}
                                </div>
                            )}

                            <div className="space-y-2">
                                {user.has_biometric ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-950 px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-800 text-xs">
                                            <span className="text-gray-500 dark:text-slate-400">{t('biometric_status', 'Biometric Status')}</span>
                                            <span className="text-emerald-500 font-bold flex items-center">
                                                <Check className="w-4 h-4 mr-1" /> {t('biometric_active', 'Active')}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleRemoveBiometric}
                                            className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 py-3 rounded-2xl text-xs font-bold text-rose-450 transition-all active:scale-[0.98]"
                                        >
                                            {t('disable_biometric', 'Disable Biometric')}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-950 px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-800 text-xs">
                                            <span className="text-gray-500 dark:text-slate-400">{t('biometric_status', 'Biometric Status')}</span>
                                            <span className="text-amber-500 font-bold text-[11px]">
                                                {t('biometric_inactive', 'Inactive')}
                                            </span>
                                        </div>
                                        {isBiometricSupported ? (
                                            <button
                                                type="button"
                                                onClick={handleRegisterBiometric}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] py-3 rounded-2xl text-xs font-bold text-white transition-all"
                                            >
                                                {t('enable_device_biometric', 'Enable Device Biometric')}
                                            </button>
                                        ) : (
                                            <div className="text-center p-3 text-[11px] text-gray-500 dark:text-slate-500 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50 dark:bg-slate-950">
                                                {t('biometric_not_supported', 'This browser or device does not support secure biometric login (such as Face ID or fingerprint).')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Backups & Data Resets */}
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                            <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400 flex items-center"><Download className="w-4.5 h-4.5 text-emerald-500 mr-2" /> {t('backup_reset', 'Data Backup & Reset')}</h3>
                            
                            <div className="space-y-3">
                                <a
                                    href="/settings/backup"
                                    className="block w-full text-center bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-800 py-3.5 rounded-2xl text-xs font-bold text-gray-700 dark:text-slate-300 transition-all flex items-center justify-center space-x-2"
                                >
                                    <Download className="w-4 h-4 text-emerald-500" />
                                    <span>{t('download_backup', 'Download Backup (JSON)')}</span>
                                </a>

                                <form onSubmit={handleRestoreBackup} className="pt-4 border-t border-gray-200 dark:border-slate-800 space-y-3.5">
                                    <p className="text-[10px] text-gray-500 dark:text-slate-500 leading-relaxed">
                                        {t('restore_backup_desc', 'Upload a previously downloaded JSON backup to restore your data. Current financial data will be replaced.')}
                                    </p>

                                    <div>
                                        <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('select_backup_file', 'Select Backup File (.json)')}</label>
                                        <input
                                            type="file"
                                            accept=".json,application/json"
                                            onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                                            required
                                            className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-200 dark:border-slate-800 rounded-2xl text-xs text-gray-700 dark:text-slate-300 file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-[10px] file:font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('enter_pin_restore', 'Enter PIN to confirm restore')}</label>
                                        <input
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={4}
                                            value={restoreForm.data.password}
                                            onChange={(e) => restoreForm.setData('password', e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            required
                                            placeholder={t('pin_placeholder', '0000')}
                                            className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none tracking-[0.3em]"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={restoreForm.processing || !backupFile}
                                        className="w-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        <Upload className="w-4 h-4" />
                                        <span>{t('restore_backup', 'Restore from Backup')}</span>
                                    </button>
                                </form>

                                <form onSubmit={handleResetData} className="pt-4 border-t border-gray-200 dark:border-slate-800 space-y-3.5">
                                    <div>
                                        <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('enter_pin_reset', 'Enter your PIN to confirm reset')}</label>
                                        <input
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={4}
                                            value={resetForm.data.password}
                                            onChange={(e) => resetForm.setData('password', e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            required
                                            placeholder={t('pin_placeholder', '0000')}
                                            className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none tracking-[0.3em]"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98]"
                                    >
                                        <RefreshCw className="w-4 h-4 animate-spin-slow" />
                                        <span>{t('reset_data', 'Reset All Data')}</span>
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Recent Login logs */}
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                            <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400 flex items-center"><Activity className="w-4.5 h-4.5 text-emerald-500 mr-2" /> {t('login_activity_log', 'Login Activity Log')}</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {loginLogs.map((log: any) => (
                                    <div key={log.id} className="text-[10px] bg-gray-50 dark:bg-slate-950 p-2.5 rounded-xl border border-gray-200 dark:border-gray-200 dark:border-slate-800 space-y-0.5">
                                        <span className="font-bold text-gray-700 dark:text-slate-300 block">{log.ip_address} ({log.logged_in_at.substring(0, 19)})</span>
                                        <span className="text-gray-500 dark:text-slate-500 block truncate max-w-[280px]">{log.user_agent}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

            </div>

            {/* Add Space Drawer Bottom Sheet */}
            {isAddSpaceOpen && (
                <>
                    <div className="fixed inset-0 z-35 bg-black/60 backdrop-blur-xs" onClick={() => setIsAddSpaceOpen(false)}></div>
                    <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 rounded-t-[32px] p-6 z-40 space-y-5 animate-slide-up">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{t('add_space', 'Create New Space')}</h3>
                            <button onClick={() => setIsAddSpaceOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleAddSpace} className="space-y-4">
                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('space_name', 'Space Name')}</label>
                                <input
                                    type="text"
                                    value={spaceName}
                                    onChange={(e) => setSpaceName(e.target.value)}
                                    placeholder={t('space_name_placeholder', 'e.g.: Mousumi Digital Window, Freelance...')}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('space_type', 'Space Type')}</label>
                                <select
                                    value={spaceType}
                                    onChange={(e) => setSpaceType(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                >
                                    <option value="business">{t('business_space', 'Business')}</option>
                                    <option value="personal">{t('personal_space', 'Personal')}</option>
                                    <option value="other">{t('other_space', 'Other')}</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all"
                            >
                                {t('create_space_btn', 'Create Space')}
                            </button>
                        </form>
                    </div>
                </>
            )}

            {/* Add Category Drawer Bottom Sheet */}
            {isAddCategoryOpen && (
                <>
                    <div className="fixed inset-0 z-35 bg-black/60 backdrop-blur-xs" onClick={() => setIsAddCategoryOpen(false)}></div>
                    <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 rounded-t-[32px] p-6 z-40 space-y-5 animate-slide-up max-h-[85%] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{t('create_category_title', 'Create New Category')}</h3>
                            <button onClick={() => setIsAddCategoryOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleAddCategory} className="space-y-4">
                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('category_name', 'Category Name')}</label>
                                <input
                                    type="text"
                                    value={catName}
                                    onChange={(e) => setCatName(e.target.value)}
                                    placeholder={t('category_name_placeholder_settings', 'e.g.: Travel, Client Payment...')}
                                    required
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('category_type', 'Category Type')}</label>
                                <select
                                    value={catType}
                                    onChange={(e) => setCatType(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                >
                                    <option value="expense">{t('expense_type_option', 'Expense')}</option>
                                    <option value="income">{t('income_type_option', 'Income')}</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('icon', 'Icon')}</label>
                                    <input
                                        type="text"
                                        value={catIcon}
                                        onChange={(e) => setCatIcon(e.target.value)}
                                        required
                                        maxLength={2}
                                        className="block w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-center text-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('hex_color', 'Color (HEX)')}</label>
                                    <input
                                        type="color"
                                        value={catColor}
                                        onChange={(e) => setCatColor(e.target.value)}
                                        required
                                        className="block w-full px-3 py-1 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl h-10 cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1">{t('display_in_space', 'Display In (Space)')}</label>
                                <select
                                    value={catSpaceId}
                                    onChange={(e) => setCatSpaceId(e.target.value)}
                                    required
                                    className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs"
                                >
                                    {spaces.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {catType === 'expense' && (
                                <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl">
                                    <span className="text-xs font-bold">{t('is_fixed_spending_rent', 'Is this a Fixed Expense? (Rent, Bills)')}</span>
                                    <input
                                        type="checkbox"
                                        checked={catIsFixed}
                                        onChange={(e) => setCatIsFixed(e.target.checked)}
                                        className="w-5 h-5 rounded-md border-gray-200 dark:border-slate-800 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 py-3.5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all"
                            >
                                {t('save_category', 'Save Category')}
                            </button>
                        </form>
                    </div>
                </>
            )}

        </AuthenticatedLayout>
    );
}
