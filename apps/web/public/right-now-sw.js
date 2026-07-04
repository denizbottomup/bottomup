/**
 * bupcore Web Push service worker (shared).
 *
 * Historically registered for Right Now combined-direction flips; the
 * Foxy radar alerts reuse the SAME registration + push subscription,
 * so this one file handles both payload types:
 *   - `right_now_flip` → /home/right-now
 *   - `foxy_radar`     → /home/foxy?coin=<COIN>
 *
 * The filename stays /right-now-sw.js because existing subscribers'
 * registrations point at this URL — renaming would orphan them.
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

  let title;
  let body;
  let tag;
  let url;

  if (data.type === 'right_now_flip') {
    title = data.title || `${data.coin}: ${data.to}`;
    body =
      data.message ||
      `Kombine yön ${data.from} → ${data.to}. Güven %${Math.round(
        (data.confidence || 0) * 100,
      )}.`;
    tag = `right-now-${data.coin}`;
    url = '/home/right-now';
  } else if (data.type === 'foxy_radar') {
    title = data.title || `${data.coin}: ${data.direction}`;
    body = data.message || 'Takip ettiğin coinde yeni bir sinyal var.';
    tag = `foxy-radar-${data.coin}`;
    url = data.url || '/home/foxy';
  } else {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      renotify: true,
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/home';
  const targetPath = target.split('?')[0];
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if (client.url.includes(targetPath)) {
          // Same page already open — bring it forward and let it pick
          // up the query (e.g. ?coin=) via navigate when supported.
          if ('navigate' in client && target.includes('?')) {
            try {
              await client.navigate(target);
            } catch {
              // cross-origin/detached client — focusing is still better
              // than opening a duplicate tab.
            }
          }
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
