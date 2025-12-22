
/**
 * HSE Guardian Service Worker - Active Protocol
 * Handles background push notifications and interaction routing.
 */

const CACHE_NAME = 'hse-guardian-v2.5';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Listener for Push Notifications (Remote Protocol)
self.addEventListener('push', (event) => {
  let data = { 
    title: 'HSE Critical Alert', 
    body: 'New high-risk incident assigned to your terminal.',
    url: '/?view=my-tasks'
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.warn('Push payload not JSON, using fallback.');
  }

  const options = {
    body: data.body,
    icon: 'https://raw.githubusercontent.com/s6ft256/Incident-Image-Taking-System/main/Tj1.jpeg',
    badge: 'https://raw.githubusercontent.com/s6ft256/Incident-Image-Taking-System/main/Tj1.jpeg',
    tag: 'critical-alert',
    renotify: true,
    requireInteraction: true, // Keep on screen for critical events
    vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40],
    data: { url: data.url }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle Notification Interactions
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus it and navigate
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(c => c.navigate(urlToOpen));
        }
      }
      // If no tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
