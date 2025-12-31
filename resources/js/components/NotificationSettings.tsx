import React, { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import {
    BellIcon,
    BellAlertIcon,
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface Props {
    className?: string;
}

export default function NotificationSettings({ className }: Props) {
    const { permission, isSupported, requestPermission, sendNotification } = useNotifications();
    const [isRequesting, setIsRequesting] = useState(false);

    const handleEnableNotifications = async () => {
        setIsRequesting(true);
        try {
            // Add a small delay to ensure user interaction is registered (important for Android)
            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await requestPermission();
            console.log('[NotificationSettings] Permission result:', result);

            if (result === 'granted') {
                // Wait a bit before sending test notification
                await new Promise(resolve => setTimeout(resolve, 500));

                // Send a test notification
                const success = await sendNotification({
                    title: '🎉 Notifications Enabled!',
                    body: 'You will now receive important updates about your finances.',
                });

                if (success) {
                    console.log('[NotificationSettings] Test notification sent successfully');
                } else {
                    console.warn('[NotificationSettings] Failed to send test notification');
                }
            } else {
                console.warn('[NotificationSettings] Permission not granted:', result);
            }
        } catch (error) {
            console.error('[NotificationSettings] Error enabling notifications:', error);
        } finally {
            setIsRequesting(false);
        }
    };

    const handleTestNotification = async () => {
        await sendNotification({
            title: '🧪 Test Notification',
            body: 'This is a test notification. Your notifications are working properly!',
        });
    };

    if (!isSupported) {
        return (
            <div className={cn('bg-gray-100 dark:bg-gray-800 rounded-lg p-4', className)}>
                <div className="flex items-center space-x-3">
                    <XCircleIcon className="h-6 w-6 text-gray-400" />
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Notifications Not Supported
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Your browser doesn't support push notifications
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (permission === 'denied') {
        return (
            <div className={cn('bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800', className)}>
                <div className="flex items-center space-x-3">
                    <BellIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-900 dark:text-red-200">
                            Notifications Blocked
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                            Please enable notifications in your browser settings to receive alerts
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (permission === 'granted') {
        return null; // Don't show banner when already enabled
    }

    return (
        <div className={cn('bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800', className)}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <BellAlertIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                            Enable Notifications
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            Get alerts when budgets are exceeded or payments are due
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleEnableNotifications}
                    disabled={isRequesting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                    {isRequesting ? 'Enabling...' : 'Enable'}
                </button>
            </div>
        </div>
    );
}
