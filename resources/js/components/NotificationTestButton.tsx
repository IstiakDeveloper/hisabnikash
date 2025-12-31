import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { BellIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface Props {
    variant?: 'button' | 'card';
    className?: string;
}

export default function NotificationTestButton({ variant = 'button', className }: Props) {
    const { permission, isSupported, sendNotification } = useNotifications();

    const handleTestNotification = async () => {
        await sendNotification({
            title: '🧪 Test Notification',
            body: 'This is a test notification. Your notifications are working properly!',
        });
    };

    if (!isSupported || permission !== 'granted') {
        return null;
    }

    if (variant === 'card') {
        return (
            <div className={cn('bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800', className)}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        <div>
                            <p className="text-sm font-medium text-green-900 dark:text-green-200">
                                Notifications Enabled
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                You'll receive alerts for budget limits and important updates
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleTestNotification}
                        className="px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                    >
                        Test
                    </button>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={handleTestNotification}
            className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors border border-green-200 dark:border-green-800',
                className
            )}
        >
            <BellIcon className="h-4 w-4" />
            Test Notification
        </button>
    );
}
