import { useState, useEffect } from 'react';

interface NotificationOptions {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
}

export function useNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        // Check if notifications are supported
        if ('Notification' in window && 'serviceWorker' in navigator) {
            setIsSupported(true);
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async (): Promise<NotificationPermission> => {
        if (!isSupported) {
            console.warn('Notifications are not supported in this browser');
            return 'denied';
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return 'denied';
        }
    };

    const sendNotification = async (options: NotificationOptions): Promise<boolean> => {
        if (!isSupported) {
            console.warn('Notifications are not supported');
            return false;
        }

        if (permission !== 'granted') {
            const newPermission = await requestPermission();
            if (newPermission !== 'granted') {
                console.warn('Notification permission denied');
                return false;
            }
        }

        try {
            // Check if service worker is ready
            const registration = await navigator.serviceWorker.ready;

            // Ensure proper icon paths
            const notificationOptions = {
                body: options.body,
                icon: options.icon || '/images/icon-192x192.png',
                badge: options.badge || '/images/icon-72x72.png',
                tag: options.tag || `notification-${Date.now()}`,
                requireInteraction: options.requireInteraction || false,
                vibrate: [300, 100, 300, 100, 300], // Stronger vibration for Android
                renotify: true,
                silent: false,
                timestamp: Date.now(),
                data: {
                    url: '/dashboard',
                    ...options
                },
                actions: [
                    {
                        action: 'view',
                        title: 'View',
                        icon: '/images/icon-72x72.png'
                    },
                    {
                        action: 'dismiss',
                        title: 'Dismiss',
                        icon: '/images/icon-72x72.png'
                    }
                ]
            };

            // Show notification through service worker for better reliability
            await registration.showNotification(options.title, notificationOptions);

            console.log('[Notification] Sent successfully:', options.title);
            return true;
        } catch (error) {
            console.error('[Notification] Error sending notification:', error);

            // Fallback to standard Notification API
            try {
                if (permission === 'granted') {
                    const notification = new Notification(options.title, {
                        body: options.body,
                        icon: options.icon || '/images/icon-192x192.png',
                        badge: options.badge || '/images/icon-72x72.png',
                        tag: options.tag
                    });

                    // Vibrate manually if supported
                    if ('vibrate' in navigator) {
                        navigator.vibrate([300, 100, 300, 100, 300]);
                    }

                    console.log('[Notification] Sent via fallback method');
                    return true;
                }
            } catch (fallbackError) {
                console.error('[Notification] Fallback also failed:', fallbackError);
            }

            return false;
        }
    };

    const sendBudgetAlert = async (budgetName: string, percentage: number, isExceeded: boolean) => {
        const title = isExceeded ? '🚨 Budget Exceeded!' : '⚠️ Budget Alert';
        const body = isExceeded
            ? `Your "${budgetName}" budget has been exceeded! You've spent ${percentage.toFixed(1)}% of your budget.`
            : `Warning: You've spent ${percentage.toFixed(1)}% of your "${budgetName}" budget.`;

        return sendNotification({
            title,
            body,
            tag: `budget-${budgetName}`,
            requireInteraction: isExceeded,
        });
    };

    const sendTransactionReminder = async (message: string) => {
        return sendNotification({
            title: '💰 Transaction Reminder',
            body: message,
            tag: 'transaction-reminder',
        });
    };

    const sendLoanReminder = async (loanName: string, amount: number, dueDate: string) => {
        return sendNotification({
            title: '📅 Loan Payment Due',
            body: `Reminder: Payment of ৳${amount.toLocaleString()} for "${loanName}" is due on ${dueDate}`,
            tag: `loan-${loanName}`,
            requireInteraction: true,
        });
    };

    return {
        permission,
        isSupported,
        requestPermission,
        sendNotification,
        sendBudgetAlert,
        sendTransactionReminder,
        sendLoanReminder,
    };
}
