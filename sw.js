// admin/sw.js (GBD Admin Dashboard)
// Stable PWA cache + working update flow + FCM background notifications

importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js');

// 🔥 Firebase config (public config is normal in web apps)
firebase.initializeApp({
  apiKey: "AIzaSyA6kN9-7dN9Ovq6BmWBBJwBhLXRW6INX4c",
  authDomain: "daisy-s-website.firebaseapp.com",
  projectId: "daisy-s-website",
  storageBucket: "daisy-s-website.firebasestorage.app",
  messagingSenderId: "595443495060",
  appId: "1:595443495060:web:7bbdd1108ad336d55c8481"
});

const messaging = firebase.messaging();

// ✅ Bump this when you want to force a fresh cache
const CACHE_VERSION = 'v2';
const CACHE_NAME = `admin-cache-${CACHE_VERSION}`;

const toUrl = (path) => new URL(path, self.registration.scope).toString();

// Core “app shell” files to precache
// IMPORTANT: only include files that definitely exist (no product-detail.js)
const PRECACHE_URLS = [
  './',
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
    // cache: 'reload' helps avoid the browser giving you a stale HTTP cache copy
    await cache.addAll(PRECACHE_URLS.map(u => new Request(u, { cache: 'reload' })));
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

// ✅ Allows update-popup.js to activate the waiting SW immediately
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

  // Only handle GET
  if (req.method !== 'GET') return;

  const url = req.url;

  // Only same-origin (keeps SW simple + avoids caching CDNs)
  if (!url.startsWith(self.location.origin)) return;

  // Don't cache firebase/api calls
  if (isFirebaseOrApi(url)) return;

  const isNavigation = req.mode === 'navigate' || (req.destination === 'document');

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // ✅ Network-first for HTML (prevents stale page lock-in)
    if (isNavigation) {
      try {
        const fresh = await fetch(req);
        // Cache latest HTML for offline fallback
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(req);
        return cached || cache.match(OFFLINE_FALLBACK);
      }
    }

    // ✅ Stale-while-revalidate for static assets (fast + updates silently)
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

// ✅ FCM background messages (reliable, no broken "push" handler)
messaging.onBackgroundMessage((payload) => {
  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    "You're So Golden";

  const body =
    payload?.notification?.body ||
    payload?.data?.body ||
    "You have a new notification";

  const urlToOpen =
    payload?.data?.url ||
    './index.html';

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
