import React, { useEffect, useState } from 'react';
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [canShowFallback, setCanShowFallback] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true) {
            setIsInstalled(true);
            return;
        }

        // Check if user already dismissed the prompt
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

            // Show again after 7 days
            if (daysSinceDismissed < 7) {
                return;
            }
        }

        let promptTimeout: NodeJS.Timeout;

        const handleBeforeInstallPrompt = (e: Event) => {
            console.log('[PWA] Install prompt triggered');
            e.preventDefault();

            const promptEvent = e as BeforeInstallPromptEvent;
            setDeferredPrompt(promptEvent);

            // Show prompt after a delay to not interrupt user
            promptTimeout = setTimeout(() => {
                setShowPrompt(true);
            }, 5000); // Increased to 5 seconds for better UX
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for successful installation
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed successfully');
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        });

        // Fallback: If beforeinstallprompt doesn't fire after 10 seconds,
        // we still show something if criteria are met
        const fallbackTimeout = setTimeout(() => {
            if (!deferredPrompt && !isInstalled) {
                console.log('[PWA] Prompt event did not fire, showing fallback');
                setCanShowFallback(true);
            }
        }, 10000);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            clearTimeout(promptTimeout);
            clearTimeout(fallbackTimeout);
        };
    }, [deferredPrompt, isInstalled]);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            console.log('[PWA] Install prompt outcome:', outcome);

            if (outcome === 'accepted') {
                console.log('[PWA] User accepted installation');
            } else {
                console.log('[PWA] User dismissed installation');
                localStorage.setItem('pwa-install-dismissed', Date.now().toString());
            }

            setShowPrompt(false);
            setDeferredPrompt(null);
        } catch (error) {
            console.error('[PWA] Install prompt error:', error);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setCanShowFallback(false);
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    // Don't show if installed
    if (isInstalled) {
        return null;
    }

    // Don't show if no prompt and no fallback allowed
    if (!showPrompt && !canShowFallback) {
        return null;
    }

    // Don't show anything if prompt was dismissed and fallback not ready
    if (!deferredPrompt && !canShowFallback) {
        return null;
    }

    return (
        <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-slide-up">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-2xl shadow-2xl p-4 border border-blue-500/20">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                        <ArrowDownTrayIcon className="h-6 w-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-base mb-1">
                            Install Finance App
                        </h3>
                        <p className="text-blue-100 text-sm mb-3">
                            Add to your home screen for quick access and offline support
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={handleInstall}
                                className="flex-1 bg-white text-blue-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors"
                            >
                                Install
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 text-white/90 hover:text-white text-sm font-medium transition-colors"
                            >
                                Later
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 text-white/70 hover:text-white transition-colors p-1"
                        aria-label="Close"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
