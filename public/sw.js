const CACHE_NAME = 'finance-app-v1.0.0';
const STATIC_CACHE_NAME = 'finance-app-static-v1.0.0';

// Only cache actual files that exist on your server
const urlsToCache = [
  '/',
  '/offline.html', // Make sure this file exists
];

// Static assets (update with your actual asset paths)
const staticAssets = [
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/manifest.json',
  // Add your actual built CSS/JS files here
  // '/static/css/main.css',
  // '/static/js/main.js',
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

  // Force activation
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Take control immediately
  self.clients.claim();
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
          // If successful, cache and return
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseClone));
            return response;
          }
          // If not found, serve the main app (for SPA routing)
          return caches.match('/') || caches.match('/offline.html');
        })
        .catch(() => {
          // Network failed, serve from cache or offline page
          return caches.match('/') || caches.match('/offline.html');
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
          console.log('[SW] Serving from cache:', request.url);
          return response;
        }

        // Clone request for network fetch
        const fetchRequest = request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response for caching
            const responseToCache = response.clone();

            // Cache the response (only for same-origin requests)
            if (url.origin === location.origin) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }

            return response;
          })
          .catch(() => {
            // Offline fallback
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }

            // For other requests, return a generic offline response
            return new Response('Offline content not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Background sync for offline actions (optional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(
      // Handle background sync logic here
      // e.g., send pending transactions when online
      handleBackgroundSync()
    );
  }
});

// Push notifications (optional)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/images/icon-192x192.png',
    badge: '/images/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/images/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/images/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Finance App', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received');

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Helper function for background sync
async function handleBackgroundSync() {
  try {
    // Handle any pending offline actions
    // This is where you'd sync offline transactions, etc.
    console.log('[SW] Handling background sync');

    // Example: Send pending data to server
    // const pendingData = await getPendingData();
    // await sendToServer(pendingData);

    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    return Promise.reject(error);
  }
}
