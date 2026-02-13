
// BBM Reborn Service Worker
// CRITICAL FOR iOS: This service worker MUST show notifications immediately via 'push' event.

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase (Generic placeholder - works for push events without specific config in many cases for Web Push)
firebase.initializeApp({
  apiKey: "AIzaSyDYbwSA0gC_djXBc5oYN1ApQMN_zU1qZ8U",
  authDomain: "bbm-reborn-840f9.firebaseapp.com",
  projectId: "bbm-reborn-840f9",
  storageBucket: "bbm-reborn-840f9.firebasestorage.app",
  messagingSenderId: "33190102542",
  appId: "1:33190102542:web:2df7c67234c7a2808b5e5f"
});

const messaging = firebase.messaging();

// Service Worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('SW: Installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activating');
  event.waitUntil(self.clients.claim());
});

// CRITICAL: Handle push events directly.
// iOS terminates push subscriptions if notifications aren't shown IMMEDIATELY (synchronously) within the push event.
self.addEventListener('push', (event) => {
  console.log('🔔 Push event received');

  let notificationData = {
    title: 'BBM',
    body: 'New message',
    icon: '/icon.png',
    badge: '/icon.png',
    tag: `bbm-${Date.now()}` // Unique tag prevents coalescing/throttling on some OS
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload.notification) {
        notificationData = { ...notificationData, ...payload.notification };
      } else if (payload.data) {
        notificationData = { ...notificationData, ...payload.data };
      }
    } catch (e) {
      // Fallback for text payload
      notificationData.body = event.data.text();
    }
  }

  // iOS Requirement: Show notification immediately.
  const promise = self.registration.showNotification(notificationData.title, {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    renotify: true,
    requireInteraction: false, // iOS doesn't support this well, but good for Desktop
    data: { 
        url: '/', 
        chatId: notificationData.chatId || (event.data && event.data.json && event.data.json().data ? event.data.json().data.chatId : null) 
    }
  });

  event.waitUntil(promise);
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked');
  event.notification.close();

  const chatId = event.notification.data?.chatId;
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 1. Try to find existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then((focusedClient) => {
                if (chatId) {
                    // Post message to the client to navigate internally
                    focusedClient.postMessage({ type: 'OPEN_CHAT', chatId });
                }
            });
          }
        }
        // 2. Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Keep alive handler for iOS
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'KEEP_ALIVE') {
    // Just acknowledging keeps it alive briefly
    // console.log('SW: Keep alive ping');
  }
});
