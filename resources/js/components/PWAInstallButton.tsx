import React, { useEffect, useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Props {
    variant?: 'button' | 'card' | 'icon';
    className?: string;
}

export default function PWAInstallButton({ variant = 'button', className }: Props) {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true) {
            setIsInstalled(true);
            return;
        }

        // Check if iOS
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(ios);

        const handleBeforeInstallPrompt = (e: Event) => {
            console.log('[PWA Install Button] Prompt available');
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        window.addEventListener('appinstalled', () => {
            console.log('[PWA Install Button] App installed');
            setIsInstalled(true);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (isIOS) {
            // Show iOS instructions
            setShowIOSInstructions(true);
            return;
        }

        if (!deferredPrompt) {
            // Try to trigger install via window method (fallback)
            if (typeof (window as any).installPWA === 'function') {
                (window as any).installPWA();
            } else {
                alert('Install prompt not available. Please check if the app meets PWA requirements.');
            }
            return;
        }

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            console.log('[PWA Install Button] User choice:', outcome);

            if (outcome === 'accepted') {
                setIsInstalled(true);
            }

            setDeferredPrompt(null);
        } catch (error) {
            console.error('[PWA Install Button] Error:', error);
        }
    };

    // Don't show if already installed
    if (isInstalled) {
        return null;
    }

    // iOS Instructions Modal
    if (showIOSInstructions) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm shadow-2xl">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        Install App on iOS
                    </h3>
                    <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                        <p className="flex items-center gap-2">
                            <span className="text-2xl">1️⃣</span>
                            Tap the <strong>Share</strong> button
                        </p>
                        <p className="flex items-center gap-2">
                            <span className="text-2xl">2️⃣</span>
                            Scroll and tap <strong>"Add to Home Screen"</strong>
                        </p>
                        <p className="flex items-center gap-2">
                            <span className="text-2xl">3️⃣</span>
                            Tap <strong>"Add"</strong> to confirm
                        </p>
                    </div>
                    <button
                        onClick={() => setShowIOSInstructions(false)}
                        className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        );
    }

    // Icon variant (for header)
    if (variant === 'icon') {
        return (
            <button
                onClick={handleInstall}
                className={cn(
                    'p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors',
                    className
                )}
                title="Install App"
            >
                <ArrowDownTrayIcon className="h-5 w-5" />
            </button>
        );
    }

    // Card variant (for dashboard)
    if (variant === 'card') {
        return (
            <div className={cn('bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-xl shadow-lg p-4 border border-blue-500/20', className)}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            <ArrowDownTrayIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm">
                                Install App
                            </p>
                            <p className="text-blue-100 text-xs">
                                Quick access & offline support
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleInstall}
                        className="px-4 py-2 bg-white text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors"
                    >
                        Install
                    </button>
                </div>
            </div>
        );
    }

    // Button variant (default)
    return (
        <button
            onClick={handleInstall}
            className={cn(
                'flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm',
                className
            )}
        >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Install App
        </button>
    );
}
