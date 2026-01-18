// Updated admin/sw.js with proper scope handling
// This service worker is specifically for the admin dashboard


// Firebase background push support for FCM
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


const CACHE_NAME = 'admin-cache-v1';
const OFFLINE_URL = 'index.html';

// Assets to cache
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './admin-auth.js',
  './notifications.js',
  './dashboard.js',
  './products.html',
  './product-detail.js',
  './products.js',
  './orders.html',
  './orders.js',
  './settings.html',
  './analytics.html',
  './analytics.js',
  './site-design.html',
  './marquee-manager.js',
  './update-popup.js',
  './manifest.webmanifest',
  '../IMG_8861.png',
  '../favicon_circle.ico'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('✅ [Admin SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ [Admin SW] Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('✅ [Admin SW] Service Worker installed');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ [Admin SW] Error during install:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('✅ [Admin SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.filter(cacheName => {
            return cacheName !== CACHE_NAME;
          }).map(cacheName => {
            console.log('✅ [Admin SW] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log('✅ [Admin SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Handle API requests differently (don't cache)
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebase')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Return cached response
          return response;
        }
        
        // Fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // Cache the response for future
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            
            return networkResponse;
          })
          .catch(error => {
            console.error('❌ [Admin SW] Fetch error:', error);
            
            // For navigation requests, serve the offline page
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            return null;
          });
      })
  );
});

// Push event - handle push notifications
self.addEventListener('push', event => {
  console.log('✅ [Admin SW] Push notification received:', event);
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'New Notification',
        body: event.data.text()
      };
    }
  }
  
  //const title = notificationData.title || 'You\'re So Golden';
  //const options = {
    //body: notificationData.body || 'You have a new notification',
    //icon: '../icon-512.png',
    //badge: '../favicon_circle.ico',
    //data: notificationData.data || {},
    //actions: notificationData.actions || []
  //};
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('✅ [Admin SW] Notification clicked:', event);
  
  event.notification.close();
  
  // Handle notification click - open appropriate page
  const urlToOpen = event.notification.data && event.notification.data.url 
    ? event.notification.data.url 
    : './index.html';
  
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then(windowClients => {
        // Check if there is already a window open
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Log scope information for debugging
console.log('✅ [Admin SW] Service Worker scope:', self.registration.scope);
