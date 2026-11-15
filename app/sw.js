/* Foliet service worker: the app and its fonts open offline; other files (like the PDF library) are cached on first use. */
const V = 'sb-v12';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'vendor/firebase.js', 'favicon.svg',
  'fonts/baloo-2-latin-4a324d.woff2',
  'fonts/baloo-2-latin-ext-0d1ee7.woff2',
  'fonts/bricolage-grotesque-latin-ca98c3.woff2',
  'fonts/bricolage-grotesque-latin-ext-90a9a1.woff2',
  'fonts/caveat-latin-14ecf1.woff2',
  'fonts/caveat-latin-ext-60fd7f.woff2',
  'fonts/pacifico-latin-296fd2.woff2',
  'fonts/pacifico-latin-ext-59e558.woff2',
  'fonts/permanent-marker-latin-db42b4.woff2',
  'fonts/playfair-display-latin-48d1e9.woff2',
  'fonts/playfair-display-latin-9385b6.woff2',
  'fonts/playfair-display-latin-ext-413626.woff2',
  'fonts/playfair-display-latin-ext-cf184c.woff2',
  'fonts/space-mono-latin-0319ea.woff2',
  'fonts/space-mono-latin-98d774.woff2',
  'fonts/space-mono-latin-e04b1d.woff2',
  'fonts/space-mono-latin-e78da8.woff2',
  'fonts/space-mono-latin-ext-1badec.woff2',
  'fonts/space-mono-latin-ext-3c18ea.woff2',
  'fonts/space-mono-latin-ext-4aa6c6.woff2',
  'fonts/space-mono-latin-ext-a84a53.woff2'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
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
  if (u.origin === location.origin) e.respondWith(swr(r, V));
});
