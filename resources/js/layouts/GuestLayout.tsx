import React, { ReactNode } from 'react';
import { router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/useTranslation';
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import FlashToast from '@/components/FlashToast';

interface Props {
    children: ReactNode;
}

export default function GuestLayout({ children }: Props) {
    const { t, locale } = useTranslation();

    const toggleLanguage = () => {
        router.post('/settings/language', { language: locale === 'en' ? 'bn' : 'en' });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col items-center justify-center font-sans p-0 sm:p-4 overflow-x-hidden">
            <FlashToast />
            <div className="relative w-full max-w-md h-full sm:h-[880px] bg-white dark:bg-slate-900 shadow-2xl sm:rounded-[40px] sm:border-[8px] sm:border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden justify-center items-center p-6">
                
                {/* Theme & language switchers */}
                <div className="absolute top-4 right-4 flex items-center space-x-2 z-30">
                    <AppearanceToggleDropdown compact />
                    <button
                        onClick={toggleLanguage}
                        className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-[10px] font-black text-emerald-400 px-3 py-1 rounded-full border border-gray-300 dark:border-slate-700 transition-all cursor-pointer"
                    >
                        {locale === 'en' ? 'বাংলা' : 'English'}
                    </button>
                </div>

                {/* Dynamic island notch */}
                <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-100 dark:bg-slate-800 rounded-b-2xl z-30 flex items-center justify-center">
                    <div className="w-3 h-3 bg-gray-50 dark:bg-slate-950 rounded-full mr-2"></div>
                    <div className="w-10 h-1 bg-gray-50 dark:bg-slate-950 rounded-full"></div>
                </div>

                <div className="w-full max-w-xs space-y-6 flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center space-y-2">
                        <div className="text-3xl font-extrabold text-emerald-500 tracking-wider">
                            {t('welcome_title', 'হিসাবনিকাস')}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold tracking-wide">
                            {t('welcome_subtitle', 'স্মার্ট ফিন্যান্সিয়াল লাইফস্টাইল')}
                        </p>
                    </div>

                    <div className="w-full">
                        {children}
                    </div>
                </div>

                {/* Home Indicator */}
                <div className="hidden sm:block absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-100 dark:bg-slate-800 rounded-full z-20"></div>
            </div>
        </div>
    );
}
