/* VIBE Firebase Cloud Messaging service worker. */
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyC6g40Uc9hq9Ij5DU1nwbO-zwpHqk9L9aQ',
  authDomain: 'vibe-749e5.firebaseapp.com',
  projectId: 'vibe-749e5',
  storageBucket: 'vibe-749e5.firebasestorage.app',
  messagingSenderId: '17097166235',
  appId: '1:17097166235:web:c39c5c082b3cf6a01ee53e',
  measurementId: 'G-YXG6TEQHME'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'VIBE';
  const options = {
    body: payload.notification?.body || 'Nouveau message',
    icon: './icons/icon.svg',
    badge: './icons/icon.svg',
    tag: payload.data?.roomId ? `vibe-room-${payload.data.roomId}` : 'vibe-message',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL('./', self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client) {
        try { await client.focus(); } catch (_) {}
        client.postMessage({ type: 'VIBE_NOTIFICATION_CLICK', data: event.notification.data || {} });
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
