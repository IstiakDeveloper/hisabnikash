import { useState, useEffect } from 'react';

interface QueueItem {
    id: string;
    type: 'transaction' | 'budget' | 'account';
    action: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
}

const QUEUE_KEY = 'offline-queue';

export function useOfflineQueue() {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        // Load queue from localStorage
        loadQueue();

        // Listen for online/offline events
        const handleOnline = () => {
            setIsOnline(true);
            syncQueue();
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const loadQueue = () => {
        try {
            const stored = localStorage.getItem(QUEUE_KEY);
            if (stored) {
                setQueue(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Error loading offline queue:', error);
        }
    };

    const saveQueue = (items: QueueItem[]) => {
        try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
            setQueue(items);
        } catch (error) {
            console.error('Error saving offline queue:', error);
        }
    };

    const addToQueue = (item: Omit<QueueItem, 'id' | 'timestamp'>) => {
        const newItem: QueueItem = {
            ...item,
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
        };

        const updatedQueue = [...queue, newItem];
        saveQueue(updatedQueue);

        // Try to sync immediately if online
        if (isOnline) {
            syncQueue();
        }

        return newItem.id;
    };

    const syncQueue = async () => {
        if (queue.length === 0 || isSyncing || !isOnline) return;

        setIsSyncing(true);

        try {
            // Process each item in queue
            const results = await Promise.allSettled(
                queue.map(item => processQueueItem(item))
            );

            // Remove successfully processed items
            const remainingQueue = queue.filter((item, index) => {
                const result = results[index];
                return result.status === 'rejected';
            });

            saveQueue(remainingQueue);

            // Register background sync if supported
            if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('background-sync');
            }
        } catch (error) {
            console.error('Error syncing offline queue:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const processQueueItem = async (item: QueueItem): Promise<void> => {
        // Build API endpoint
        const endpoint = getEndpoint(item);
        const method = getMethod(item.action);

        // Send request
        const response = await fetch(endpoint, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: item.action !== 'delete' ? JSON.stringify(item.data) : undefined,
        });

        if (!response.ok) {
            throw new Error(`Failed to sync ${item.type}: ${response.statusText}`);
        }
    };

    const getEndpoint = (item: QueueItem): string => {
        const base = `/${item.type}s`;
        if (item.action === 'create') {
            return base;
        }
        return `${base}/${item.data.id}`;
    };

    const getMethod = (action: QueueItem['action']): string => {
        switch (action) {
            case 'create': return 'POST';
            case 'update': return 'PUT';
            case 'delete': return 'DELETE';
        }
    };

    const clearQueue = () => {
        localStorage.removeItem(QUEUE_KEY);
        setQueue([]);
    };

    return {
        queue,
        isOnline,
        isSyncing,
        addToQueue,
        syncQueue,
        clearQueue,
        queueLength: queue.length,
    };
}
