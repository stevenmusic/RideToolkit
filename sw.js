const CACHE_NAME = 'ride-toolkit-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isAppShell = url.origin === self.location.origin;
  const isMapTile = url.hostname.includes('tile.openstreetmap.org') || url.hostname.includes('api.maptiler.com');
  const isLeaflet = url.hostname.includes('cdnjs.cloudflare.com');

  // App shell：cache-first，離線時也能開啟介面
  if (isAppShell) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 地圖圖磚 / Leaflet 函式庫：cache-first，已看過的地圖區域離線也能顯示
  if (isMapTile || isLeaflet) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // 天氣等即時 API：network-first，離線時不阻塞
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
