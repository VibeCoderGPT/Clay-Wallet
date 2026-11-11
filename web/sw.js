// Clay Wallet service worker — network-first with offline fallback.
// Network-first so updates always show immediately (a wallet should never
// silently serve stale code); cached copy is the offline safety net.
const CACHE = 'clay-wallet-v2';
const CORE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/chains.js',
  '/vault.js',
  '/background.js',
  '/vendor/ethers.js',
  '/vendor/three.module.js',
  '/vendor/three.core.js',
  '/vendor/qrcode.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // never intercept RPC / price APIs

  // Network-first for every same-origin asset, cache fallback when offline.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((cached) => cached || caches.match('/index.html'))
      )
  );
});
