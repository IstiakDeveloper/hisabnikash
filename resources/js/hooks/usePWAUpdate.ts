import { useState, useEffect } from 'react';

export function usePWAUpdate() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
                setRegistration(reg);

                // Check for updates every 10 minutes
                setInterval(() => {
                    reg.update();
                }, 10 * 60 * 1000);

                // Listen for new service worker waiting
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New service worker installed and waiting
                                setUpdateAvailable(true);
                            }
                        });
                    }
                });
            });

            // Listen for controller change (new SW activated)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });
        }
    }, []);

    const updateApp = () => {
        if (registration?.waiting) {
            // Tell the waiting service worker to skip waiting and become active
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    };

    return {
        updateAvailable,
        updateApp,
    };
}
