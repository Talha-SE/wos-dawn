const NOTIFICATION_CLICK_DEFAULT_URL = '/dashboard/alliance-chat';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function focusOrOpenClient(url) {
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const normalizedUrl = new URL(url, self.location.origin).href;

  for (const client of allClients) {
    try {
      const clientUrl = client.url ? new URL(client.url, self.location.origin).href : '';
      if (clientUrl === normalizedUrl) {
        await client.focus();
        return client;
      }
    } catch (err) {
      // ignore malformed URLs
    }
  }

  if (allClients.length > 0) {
    const [first] = allClients;
    await first.focus();
    first.navigate(normalizedUrl);
    return first;
  }

  return await self.clients.openWindow(normalizedUrl);
}

self.addEventListener('notificationclick', (event) => {
  const data = event.notification?.data || {};
  const targetUrl = data.url || data.roomUrl || NOTIFICATION_CLICK_DEFAULT_URL;
  event.notification.close();

  event.waitUntil(focusOrOpenClient(targetUrl));
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const title = payload.title || 'Alliance update';
    const options = {
      body: payload.body,
      icon: payload.icon || '/notification-icon.svg',
      badge: payload.badge || '/notification-icon.svg',
      data: payload.data || {},
      tag: payload.tag,
      renotify: payload.renotify ?? true,
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    // ignore malformed payloads
  }
});
