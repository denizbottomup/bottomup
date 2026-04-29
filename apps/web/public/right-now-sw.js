/**
 * Right Now Web Push service worker.
 *
 * Listens for push events from the bottomup API and surfaces a native
 * notification for combined-direction flips. Click handler focuses the
 * /home/right-now tab if it's already open, otherwise opens it fresh.
 *
 * Scope is the whole site; lives at /right-now-sw.js so the registration
 * call from the page can reach it without a custom worker config.
 */
self.addEventListener('install', (event) => {
  // Activate immediately so a deploy reaches existing subscribers
  // without making them wait for the next browser restart.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  if (data.type !== 'right_now_flip') return;
  const title = data.title || `${data.coin}: ${data.to}`;
  const body =
    data.message ||
    `Kombine yön ${data.from} → ${data.to}. Güven %${Math.round(
      (data.confidence || 0) * 100,
    )}.`;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `right-now-${data.coin}`,
      renotify: true,
      data: { url: '/home/right-now' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/home/right-now';
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if (client.url.includes('/home/right-now')) {
          client.focus();
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
