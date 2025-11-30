
const CACHE_NAME = 'dar-altawheed-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn-icons-png.flaticon.com/512/4358/4358667.png'
];

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event (Network First for API, Cache First for Assets, Stale-While-Revalidate for others)
self.addEventListener('fetch', (event) => {
  // 1. Don't cache Gemini API calls or non-GET requests
  if (event.request.method !== 'GET' || event.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 2. Return cached response if found
      if (cachedResponse) {
        // Optional: Update cache in background for next time (Stale-While-Revalidate strategy)
        // This ensures the user gets the fast cached version, but we update it for next launch
        fetch(event.request).then(networkResponse => {
            if(networkResponse && networkResponse.status === 200 && networkResponse.type !== 'error') {
                 const responseToCache = networkResponse.clone();
                 caches.open(CACHE_NAME).then((cache) => {
                   cache.put(event.request, responseToCache);
                 });
            }
        }).catch(() => {});
        
        return cachedResponse;
      }

      // 3. If not in cache, fetch from network and cache it (Runtime Caching)
      return fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
          return networkResponse;
        }

        // Clone the response because it's a stream and can only be consumed once
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
          // 4. Fallback for navigation (HTML) if offline and not cached
          if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
          }
      });
    })
  );
});
