const CACHE_NAME = 'finance-app-v1.0.1';
const STATIC_CACHE_NAME = 'finance-app-static-v1.0.1';
const DYNAMIC_CACHE_NAME = 'finance-app-dynamic-v1.0.1';

// Only cache actual files that exist on your server
const urlsToCache = [
  '/',
  '/offline.html',
];

// Static assets (update with your actual asset paths)
const staticAssets = [
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/manifest.json',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');

  event.waitUntil(
    Promise.all([
      // Cache app routes (only actual files)
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('[SW] Caching app routes');
          return cache.addAll(urlsToCache);
        }).catch((error) => {
          console.error('[SW] Failed to cache app routes:', error);
        }),

      // Cache static assets
      caches.open(STATIC_CACHE_NAME)
        .then((cache) => {
          console.log('[SW] Caching static assets');
          // Filter out assets that might not exist
          return Promise.allSettled(
            staticAssets.map(asset =>
              fetch(asset)
                .then(response => {
                  if (response.ok) {
                    return cache.put(asset, response);
                  }
                  console.warn('[SW] Asset not found:', asset);
                })
                .catch(error => {
                  console.warn('[SW] Failed to cache asset:', asset, error);
                })
            )
          );
        })
    ])
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME &&
                cacheName !== STATIC_CACHE_NAME &&
                cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control immediately
      self.clients.claim()
    ])
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event.action);

  event.notification.close();

  if (event.action === 'view') {
    // Open the app or focus existing window
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url.includes('/dashboard') && 'focus' in client) {
              return client.focus();
            }
          }
          // If not open, open new window
          if (clients.openWindow) {
            return clients.openWindow('/dashboard');
          }
        })
    );
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);

  const data = event.data ? event.data.json() : {};

  const title = data.title || 'Finance App Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/images/icon-192x192.png',
    badge: '/images/icon-72x72.png',
    tag: data.tag || 'general',
    requireInteraction: data.requireInteraction || false,
    vibrate: [300, 100, 300, 100, 300], // More pronounced vibration for Android
    renotify: true,
    silent: false,
    data: data.data || {},
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

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle navigation requests (for SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If successful, clone and cache
          if (response && response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME)
              .then(cache => cache.put(request, responseClone))
              .catch(err => console.warn('[SW] Cache put failed:', err));
            return response;
          }
          // If not found, try cache or serve offline page
          return caches.match(request)
            .then(cached => cached || caches.match('/offline.html'));
        })
        .catch(() => {
          // Network failed, serve from cache or offline page
          return caches.match(request)
            .then(cached => cached || caches.match('/offline.html'));
        })
    );
    return;
  }

  // Handle other requests
  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          // For dynamic content, fetch in background to update cache
          if (!request.url.includes('/build/') && !request.url.includes('/images/')) {
            fetch(request)
              .then((fetchResponse) => {
                if (fetchResponse && fetchResponse.ok) {
                  caches.open(DYNAMIC_CACHE_NAME)
                    .then(cache => cache.put(request, fetchResponse.clone()))
                    .catch(err => console.warn('[SW] Background cache update failed:', err));
                }
              })
              .catch(() => {}); // Silent fail for background updates
          }
          return response;
        }

        // Clone request for network fetch
        return fetch(request)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone response for caching
            const responseToCache = response.clone();

            // Cache the response (only for same-origin requests)
            if (url.origin === location.origin) {
              const cacheName = request.url.includes('/build/') || request.url.includes('/images/')
                ? STATIC_CACHE_NAME
                : DYNAMIC_CACHE_NAME;

              caches.open(cacheName)
                .then((cache) => {
                  cache.put(request, responseToCache);
                })
                .catch(err => console.warn('[SW] Cache put failed:', err));
            }

            return response;
          })
          .catch((error) => {
            console.warn('[SW] Fetch failed:', request.url, error);

            // Offline fallback
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }

            // For images, return a placeholder if available
            if (request.destination === 'image') {
              return new Response(
                '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect fill="#ddd" width="100" height="100"/></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }

            // For other requests, return a generic offline response
            return new Response('Offline - content not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Helper function for background sync
async function handleBackgroundSync() {
  try {
    console.log('[SW] Processing background sync');

    // Get offline queue from IndexedDB or localStorage
    const QUEUE_KEY = 'offline-queue';
    const stored = await clients.matchAll().then(clients => {
      if (clients.length > 0) {
        return new Promise((resolve) => {
          // Request queue data from client
          const channel = new MessageChannel();
          channel.port1.onmessage = (event) => {
            resolve(event.data);
          };
          clients[0].postMessage({ type: 'GET_QUEUE' }, [channel.port2]);
        });
      }
      return null;
    });

    if (stored && stored.queue && stored.queue.length > 0) {
      console.log(`[SW] Processing ${stored.queue.length} queued items`);

      // Process each queued item
      for (const item of stored.queue) {
        try {
          await processQueueItem(item);
          console.log('[SW] Successfully synced:', item.type);
        } catch (error) {
          console.error('[SW] Failed to sync:', item.type, error);
        }
      }

      // Notify clients that sync is complete
      const allClients = await clients.matchAll();
      allClients.forEach(client => {
        client.postMessage({ type: 'SYNC_COMPLETE' });
      });
    }

    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Background sync error:', error);
    return Promise.reject(error);
  }
}

// Process a single queue item
async function processQueueItem(item) {
  const endpoint = getEndpoint(item);
  const method = getMethod(item.action);

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

  return response.json();
}

function getEndpoint(item) {
  const base = `/${item.type}s`;
  if (item.action === 'create') {
    return base;
  }
  return `${base}/${item.data.id}`;
}

function getMethod(action) {
  switch (action) {
    case 'create': return 'POST';
    case 'update': return 'PUT';
    case 'delete': return 'DELETE';
    default: return 'GET';
  }
}
