import { usePage } from '@inertiajs/react';
import en from '@/locales/en';
import bn from '@/locales/bn';

export function useTranslation() {
    const { props } = usePage();
    
    // Fallback order: user.language -> session locale -> default 'en'
    const locale = ((props.auth as any)?.user?.language || props.locale || 'en') as 'en' | 'bn';

    const t = (key: string, fallback?: string): string => {
        const dict = locale === 'bn' ? bn : en;
        return (dict as any)[key] ?? fallback ?? key;
    };

    return { t, locale };
}
