// admin/sw.js - stable caching + update flow + FCM background notifications

importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA6kN9-7dN9Ovq6BmWBBJwBhLXRW6INX4c",
  authDomain: "daisy-s-website.firebaseapp.com",
  projectId: "daisy-s-website",
  storageBucket: "daisy-s-website.firebasestorage.app",
  messagingSenderId: "595443495060",
  appId: "1:595443495060:web:7bbdd1108ad336d55c8481"
});

const messaging = firebase.messaging();

const CACHE_VERSION = 'v5';
const CACHE_NAME = `admin-cache-${CACHE_VERSION}`;

const toUrl = (path) => new URL(path, self.registration.scope).toString();

// Only include files that definitely exist in this deployment.
const PRECACHE_URLS = [
  './index.html',
  './login.html',
  './styles.css',
  './firebase.js',
  './admin-auth.js',
  './update-popup.js',
  './manifest.webmanifest',

  // Shared layout partials
  './layout/layout.js',
  './layout/layout.css',
  './layout/sidebar.html',
  './layout/header.html',
  './layout/bottom-nav.html',

  // Clean-URL pages
  './product-management/index.html',
  './product-management/product-management.js',
  './product-management/product-management-styles.css',

  './order-management/index.html',
  './order-management/order-management.js',
  './order-management/order-management-styles.css',

  './analytics/index.html',
  './analytics/analytics.js',

  './settings/index.html',
  './settings/settings-styles.css',

  './add-product/index.html',
  './add-product/add-product.js'
].map(toUrl);

const OFFLINE_FALLBACK = toUrl('./index.html');

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Best-effort precache: never fail install because one file is missing/redirecting.
    await Promise.all(
      PRECACHE_URLS.map(async (url) => {
        try {
          const res = await fetch(new Request(url, { cache: 'reload' }));
          if (res && res.ok) await cache.put(url, res.clone());
        } catch {}
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith('admin-cache-') && k !== CACHE_NAME)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Allow update-popup.js to activate waiting SW immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

function isFirebaseOrApi(url) {
  return (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('/api/')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = req.url;
  if (!url.startsWith(self.location.origin)) return;
  if (isFirebaseOrApi(url)) return;

  const isNavigation = req.mode === 'navigate' || req.destination === 'document';

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Network-first for HTML navigations (prevents stale lock-in)
    if (isNavigation) {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(req);
        return cached || cache.match(OFFLINE_FALLBACK);
      }
    }

    // Stale-while-revalidate for static assets
    const cached = await cache.match(req);
    const fetchPromise = fetch(req)
      .then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      })
      .catch(() => null);

    return cached || fetchPromise || new Response('', { status: 504, statusText: 'Offline' });
  })());
});

// FCM background notifications
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || payload?.data?.title || "You're So Golden";
  const body = payload?.notification?.body || payload?.data?.body || "You have a new notification";
  const urlToOpen = payload?.data?.url || './index.html';

  self.registration.showNotification(title, {
    body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: { url: urlToOpen }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = event.notification?.data?.url || './index.html';
  const absoluteTarget = new URL(target, self.registration.scope).toString();

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if (client.url === absoluteTarget && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow(absoluteTarget);
  })());
});
