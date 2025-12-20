
/**
 * HSE Guardian Service Worker - Passive Mode
 * No fetch listener = No proxy = Zero interference with IDE/Git operations.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// fetch event removed to ensure no network interception
