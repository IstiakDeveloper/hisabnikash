import React, { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'message';

type ToastItem = {
    id: string;
    type: ToastType;
    text: string;
};

const toastStyles: Record<ToastType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    success: {
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/30',
        text: 'text-emerald-300',
        icon: <CheckCircle className="w-4.5 h-4.5 flex-shrink-0" />,
    },
    error: {
        bg: 'bg-rose-500/15',
        border: 'border-rose-500/30',
        text: 'text-rose-300',
        icon: <XCircle className="w-4.5 h-4.5 flex-shrink-0" />,
    },
    warning: {
        bg: 'bg-amber-500/15',
        border: 'border-amber-500/30',
        text: 'text-amber-300',
        icon: <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />,
    },
    info: {
        bg: 'bg-sky-500/15',
        border: 'border-sky-500/30',
        text: 'text-sky-300',
        icon: <Info className="w-4.5 h-4.5 flex-shrink-0" />,
    },
    message: {
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/30',
        text: 'text-emerald-300',
        icon: <CheckCircle className="w-4.5 h-4.5 flex-shrink-0" />,
    },
};

function flattenErrors(errors: Record<string, string | string[]> | undefined): string[] {
    if (!errors) {
        return [];
    }

    return Object.values(errors)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((value) => value?.toString().trim())
        .filter((value): value is string => Boolean(value));
}

function buildToasts(
    flash: Partial<Record<ToastType, string>> | undefined,
    errors: Record<string, string | string[]> | undefined,
    status?: string,
): ToastItem[] {
    const items: ToastItem[] = [];
    const seen = new Set<string>();

    const push = (type: ToastType, text: string | null | undefined, prefix: string) => {
        const normalized = text?.toString().trim();
        if (!normalized) {
            return;
        }

        const key = `${type}:${normalized}`;
        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        items.push({ id: `${prefix}-${items.length}`, type, text: normalized });
    };

    // Errors & warnings first
    push('error', flash?.error, 'flash-error');
    push('warning', flash?.warning, 'flash-warning');

    flattenErrors(errors).forEach((message, index) => {
        push('error', message, `validation-${index}`);
    });

    // Success & info
    push('success', flash?.success, 'flash-success');
    push('info', flash?.info, 'flash-info');
    push('message', flash?.message, 'flash-message');
    push('info', status, 'status');

    return items;
}

export default function FlashToast() {
    const page = usePage();
    const { flash, errors, status } = page.props as {
        flash?: Partial<Record<ToastType, string>>;
        errors?: Record<string, string | string[]>;
        status?: string;
    };

    const signature = useMemo(
        () => JSON.stringify({ flash, errors, status }),
        [flash, errors, status],
    );

    const [visibleToasts, setVisibleToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        const nextToasts = buildToasts(flash, errors, status);
        setVisibleToasts(nextToasts);

        if (nextToasts.length === 0) {
            return;
        }

        const timer = setTimeout(() => setVisibleToasts([]), 5000);
        return () => clearTimeout(timer);
    }, [signature, flash, errors, status]);

    const dismissToast = (id: string) => {
        setVisibleToasts((current) => current.filter((toast) => toast.id !== id));
    };

    if (visibleToasts.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm flex flex-col gap-2 pointer-events-none">
            {visibleToasts.map((toast) => {
                const style = toastStyles[toast.type];

                return (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-2xl border shadow-lg backdrop-blur-md animate-fadeIn ${style.bg} ${style.border} ${style.text}`}
                        role="alert"
                    >
                        {style.icon}
                        <p className="text-xs font-semibold leading-relaxed flex-1 pt-0.5">{toast.text}</p>
                        <button
                            type="button"
                            onClick={() => dismissToast(toast.id)}
                            className="text-current opacity-70 hover:opacity-100 transition-opacity p-0.5"
                            aria-label="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
