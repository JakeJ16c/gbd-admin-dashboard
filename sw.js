// sw.js (GBD Admin Dashboard)
// - Reliable install (best-effort precache: one missing file won't brick the SW)
// - Network-first for HTML (avoids getting stuck on stale pages)
// - Stale-while-revalidate for static assets
// - FCM background notifications

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

// Bump this to force refresh
const CACHE_VERSION = 'v3';
const CACHE_NAME = `admin-cache-${CACHE_VERSION}`;

const toUrl = (path) => new URL(path, self.registration.scope).toString();

// Only include files that exist in the admin deployment
const PRECACHE_URLS = [
  './index.html',
  './login.html',
  './styles.css',
  './admin-auth.js',
  './dashboard.js',
  './notifications.js',
  './products.html',
  './products.js',
  './orders.html',
  './orders.js',
  './settings.html',
  './analytics.html',
  './analytics.js',
  './site-design.html',
  './marquee-manager.js',
  './welcome-modal.js',
  './update-popup.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
].map(toUrl);

const OFFLINE_FALLBACK = toUrl('./index.html');

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Best-effort precache: do NOT fail the whole install if one file 404s
    await Promise.all(
      PRECACHE_URLS.map(async (url) => {
        try {
          const res = await fetch(new Request(url, { cache: 'reload' }));
          if (res && res.ok) await cache.put(url, res.clone());
        } catch {
          // ignore individual failures
        }
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

// Enables update-popup.js to activate a waiting SW
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

    // Network-first for HTML
    if (isNavigation) {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(req);
        return cached || (await cache.match(OFFLINE_FALLBACK));
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
  const title = payload?.notification?.title || payload?.data?.title || 'You\'re So Golden';
  const body = payload?.notification?.body || payload?.data?.body || 'You have a new notification';
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
