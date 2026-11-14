/* Sketchbook service worker: the app shell opens offline; fonts and libraries are cached on first use. */
const V = 'sb-v1', RT = 'sb-rt';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== RT).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const swr = (req, name) => caches.open(name).then(c => c.match(req).then(hit => {
  const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r }).catch(() => hit);
  return hit || net;
}));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res }).catch(() => caches.match(r).then(h => h || caches.match('index.html') || caches.match('./'))));
    return;
  }
  if (u.origin === location.origin) { e.respondWith(swr(r, V)); return }
  if (/fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$/.test(u.hostname)) e.respondWith(swr(r, RT));
});
