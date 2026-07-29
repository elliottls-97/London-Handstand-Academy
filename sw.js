/* ══════════════════════════════════════════════════════════════
   London Handstand Academy — service worker

   Why this matters: people train in gyms and studios with poor wifi.
   Without this, opening the app on bad signal shows a browser error
   and the session is lost. With it, the app shell loads instantly
   from cache and previously-watched drill clips keep working.

   Bump CACHE_VERSION whenever you change the app HTML, otherwise
   returning users keep the old cached copy.
   ══════════════════════════════════════════════════════════════ */
const CACHE_VERSION = 'lha-v1';
const SHELL_CACHE   = CACHE_VERSION + '-shell';
const VIDEO_CACHE   = CACHE_VERSION + '-video';

/* Files that make up the app shell. Kept small and all same-origin. */
const SHELL = [
  '/handstand-ladder-app.html',
  '/manifest.json'
];

/* Cap the video cache so a long session cannot fill up the device. */
const MAX_VIDEOS = 40;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      /* addAll fails the whole install if any single file 404s, so add
         them individually and tolerate misses */
      .then(cache => Promise.all(
        SHELL.map(url => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !k.startsWith(CACHE_VERSION))
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Trim a cache to a maximum number of entries, oldest first. */
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Never cache form posts, analytics or the subscribe function. */
  if (url.pathname.startsWith('/.netlify/')) return;
  if (url.hostname.indexOf('formspree.io') > -1) return;

  /* Drill videos: cache-first, since they never change once uploaded.
     Range requests (video seeking) must go straight to the network —
     the Cache API cannot serve a 206 partial response. */
  const isVideo = /\.(mp4|webm|mov)$/i.test(url.pathname);
  if (isVideo) {
    if (req.headers.has('range')) return;
    event.respondWith(
      caches.open(VIDEO_CACHE).then(cache =>
        cache.match(req).then(hit => {
          if (hit) return hit;
          return fetch(req).then(res => {
            if (res && res.status === 200) {
              cache.put(req, res.clone());
              trim(VIDEO_CACHE, MAX_VIDEOS);
            }
            return res;
          });
        })
      )
    );
    return;
  }

  /* App shell and everything else same-origin: network-first so an
     updated app is picked up straight away, falling back to cache
     when the network is unavailable. */
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then(hit =>
          hit || caches.match('/handstand-ladder-app.html')
        ))
    );
  }
});
