// Shalom Kerala Stores - PWA Service Worker (v2)
// Full offline precaching for Storefront, POS Billing, Inventory ERP & Dashboard
const CACHE_NAME = 'shalom-store-v2';
const PRECACHE_URLS = [
  './',
  'index.html',
  'billing.html',
  'inventory.html',
  'dashboard.html',
  'manifest.json',
  'css/styles.css',
  'js/app.js',
  'js/billing.js',
  'js/cart.js',
  'js/orders.js',
  'js/products.js',
  'js/upi.js',
  'js/cloud-sync.js',
  'js/auth.js',
  'js/inventory.js',
  'js/html5-qrcode.min.js',
  'images/icon-192.png',
  'images/icon-512.png',
  'images/hero.jpg',
  'images/banana_chips.jpg',
  'images/spices_masala.jpg',
  'images/church_articles.jpg',
  'images/stationery.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[PWA SW] Precache partial error (non-fatal):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip external analytics or Firebase real-time streams
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (url.includes('firebaseio.com') || url.includes('google-analytics') || url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to revalidate cache (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for HTML documents
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('index.html');
        }
      });
    })
  );
});
