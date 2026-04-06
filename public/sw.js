// ─── Negócios de Limpeza — Service Worker ───────────────────────────────────
const CACHE_NAME = 'nl-limpeza-v1';
const APP_SHELL = ['/', '/index.html'];

// ── Install: cache app shell ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL).catch(() => {/* ignore if offline */});
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first (always fresh), fallback to cache ───────────────────
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Skip non-GET, Chrome extensions, Supabase API, Evolution API
  if (
    event.request.method !== 'GET' ||
    url.startsWith('chrome-extension') ||
    url.includes('supabase.co') ||
    url.includes('evolution') ||
    url.includes('googleapis') ||
    url.includes('esm.sh')
  ) return;

  event.respondWith(
    fetch(event.request)
      .then(resp => {
        // Cache successful HTML/JS/CSS responses
        if (resp.ok && (url.includes('.js') || url.includes('.css') || url.endsWith('/') || url.endsWith('.html'))) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { data = { title: 'NL Limpeza', body: event.data?.text() || 'Nova notificação' }; }

  const title = data.title || 'Negócios de Limpeza';
  const options = {
    body: data.body || 'Você tem uma nova atualização.',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    tag: data.tag || 'nl-notification',
    renotify: true,
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click → open/focus app ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Se já tem uma janela aberta, foca nela
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Senão abre uma nova
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── Message from app (ex: trigger test notification) ─────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, url, tag } = event.data;
    self.registration.showNotification(title || 'NL Limpeza', {
      body: body || '',
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      tag: tag || 'nl-msg',
      renotify: true,
      data: { url: url || '/admin/crm' },
      vibrate: [150, 75, 150],
    });
  }
});
