/* ══════════════════════════════════════════════════════════════
   London Handstand Academy — service worker

   Why this matters: people train in gyms and studios with poor wifi.
   Without this, opening the app on bad signal shows a browser error
   and the session is lost. With it, the app shell loads instantly
   from cache and previously-watched drill clips keep working.

   Bump CACHE_VERSION whenever you change the app HTML, otherwise
   returning users keep the old cached copy.
   ══════════════════════════════════════════════════════════════ */
const CACHE_VERSION = 'lha-v145';
const SHELL_CACHE   = CACHE_VERSION + '-shell';
/* Films somebody chose to keep for a gym with no signal. Not versioned: a
   new build of the app must not throw away what they saved on purpose. */
const FILM_CACHE    = 'lha-films';

/* Files that make up the app shell. Kept small and all same-origin. */
const SHELL = [
  '/lha-app.html',
  /* the ladder itself lives here now, so the app is not an app without it */
  '/ladder-data.js',
  /* and the clock, which the app loads as a script and so cannot open without */
  '/timing.js',
  '/manifest.json',
  /* an installed app whose icon is not cached loses its icon the first time
     it opens without signal */
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-180.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png'
];

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
        keys.filter(k => !k.startsWith(CACHE_VERSION) && k !== FILM_CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── a saved film, from the phone ──────────────────────────────────
   The app asks for a saved film, its captions or its still by the usual
   address with ?lha=saved on the end. A video element asks for a film a
   slice at a time and will not play a whole file handed back in one, so
   the slice it asked for is cut from the saved copy. Anything not saved
   after all goes to the network as if nothing had happened. */
async function fromSaved(req, url) {
  const key = url.origin + url.pathname;
  const cache = await caches.open(FILM_CACHE);
  const hit = await cache.match(key);
  if (!hit) {
    const clean = new URL(url.href);
    clean.searchParams.delete('lha');
    return fetch(new Request(clean.href, {
      headers: req.headers, credentials: 'omit',
      mode: req.mode === 'navigate' ? 'no-cors' : req.mode,
    }));
  }
  if (!/\.mp4$/i.test(url.pathname)) return hit;
  const blob = await hit.blob();
  const size = blob.size;
  const type = hit.headers.get('content-type') || 'video/mp4';
  const range = req.headers.get('range');
  if (!range) {
    return new Response(blob, { status: 200, headers: {
      'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
  }
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start, end;
  if (m[1] === '' && m[2]) { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
  else { start = parseInt(m[1] || '0', 10); end = m[2] ? parseInt(m[2], 10) : size - 1; }
  if (start >= size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  }
  end = Math.min(end, size - 1);
  return new Response(blob.slice(start, end + 1, type), { status: 206, headers: {
    'Content-Type': type, 'Content-Length': String(end - start + 1),
    'Content-Range': 'bytes ' + start + '-' + end + '/' + size, 'Accept-Ranges': 'bytes' } });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Never cache form posts, analytics or the subscribe function. */
  if (url.pathname.startsWith('/.netlify/')) return;
  if (url.hostname.indexOf('formspree.io') > -1) return;

  if (url.searchParams.get('lha') === 'saved') {
    event.respondWith(fromSaved(req, url));
    return;
  }

  /* Drill videos otherwise go to the network as they always have. The
     cache this used to fill only ever took requests without a range, and a
     video element always sends one, so it held nothing. Keeping a film is
     something the person asks for now, above. */
  if (/\.(mp4|webm|mov)$/i.test(url.pathname)) return;

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
          hit || caches.match('/lha-app.html')
        ))
    );
  }
});
