self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let payload = { title: 'Skyupinfra', body: 'You have a new store notification.', url: '/admin' };
  try { payload = { ...payload, ...(event.data ? event.data.json() : {}) }; } catch (_) {}
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body, icon: '/favicon.svg', badge: '/favicon.svg', data: { url: payload.url || '/admin' }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification.data?.url || '/admin';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) { existing.navigate(path); return existing.focus(); }
    return self.clients.openWindow(path);
  }));
});
