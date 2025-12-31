import React from 'react';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import {
    WifiIcon,
    CloudArrowUpIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function OfflineIndicator() {
    const { isOnline, isSyncing, queueLength } = useOfflineQueue();

    if (isOnline && queueLength === 0) return null;

    return (
        <div className="fixed top-16 lg:top-20 left-1/2 -translate-x-1/2 z-40">
            {!isOnline ? (
                <div className="bg-yellow-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 text-sm font-medium">
                    <WifiIcon className="h-5 w-5" />
                    <span>You're Offline</span>
                    {queueLength > 0 && (
                        <span className="bg-yellow-600 px-2 py-0.5 rounded-full text-xs">
                            {queueLength} pending
                        </span>
                    )}
                </div>
            ) : isSyncing ? (
                <div className="bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 text-sm font-medium">
                    <CloudArrowUpIcon className="h-5 w-5 animate-bounce" />
                    <span>Syncing...</span>
                </div>
            ) : queueLength > 0 ? (
                <div className="bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 text-sm font-medium">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    <span>{queueLength} items waiting to sync</span>
                </div>
            ) : null}
        </div>
    );
}
