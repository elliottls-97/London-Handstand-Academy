/* ══════════════════════════════════════════════════════════════
   London Handstand Academy — service worker

   Why this matters: people train in gyms and studios with poor wifi.
   Without this, opening the app on bad signal shows a browser error
   and the session is lost. With it, the app shell loads instantly
   from cache and previously-watched drill clips keep working.

   Bump CACHE_VERSION whenever you change the app HTML, otherwise
   returning users keep the old cached copy.
   ══════════════════════════════════════════════════════════════ */
const CACHE_VERSION = 'lha-v185';
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
  /* voice notes in the chat, recorded and played by the same file both ends */
  '/voice.js',
  /* shrinking a clip over 200MB before it is sent */
  '/vidshrink.js',
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
  /* nor the dashboard's reads: other people's data, asked for every few
     seconds, and of no use to anybody offline */
  if (url.pathname.startsWith('/api/app/coach/')) return;
  /* nor voice notes: somebody's voice, deleted after a week, and asked for
     in byte ranges that a cache would only get in the way of */
  if (url.pathname.startsWith('/api/app/voice/')) return;
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
          hit || (/\/lha-coach\.html$/.test(url.pathname) ? Response.error() : caches.match('/lha-app.html'))
        ))
    );
  }
});

/* ── notifications ─────────────────────────────────────────────────
   The server sends a title, a line and where it should open. A reply
   opens the chat, a sign-off opens the check points. If the app is
   already open it is brought forward and told where to go; otherwise it
   opens at that address. */
const isDash = u => /\/lha-coach\.html/.test(u);
const isApp = c => /\/lha-app\.html/.test(c.url) && c.frameType !== 'nested' && !/[?&]preview=/.test(c.url);
self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  const title = d.title || 'London Handstand Academy';
  const url = d.url || '/lha-app.html';
  event.waitUntil((async () => {
    /* An iPhone does not show a notification from the app open in front
       of you, so the open app or dashboard is told as well and shows it
       itself. The notification still goes: a phone that is sent one and
       shows nothing stops being sent them. */
    try {
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      open.filter(c => isDash(url) ? (isDash(c.url) && c.frameType !== 'nested') : isApp(c))
        .forEach(c => c.postMessage({ type: 'lha-push', title, body: d.body || '', url, tag: d.tag || '' }));
    } catch (e) {}
    await self.registration.showNotification(title, {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      tag: d.tag || undefined,
      /* a repeat about the same client within minutes replaces the last
         one on the screen without buzzing again */
      renotify: !!d.tag && !d.quiet,
      silent: !!d.quiet,
      data: { url },
    });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/lha-app.html';
  let go = '';
  try { go = new URL(url, self.location.origin).searchParams.get('go') || ''; } catch (e) {}
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    /* one for the coach opens the dashboard, at the client it is about */
    if (isDash(url)) {
      const dash = open.find(c => isDash(c.url) && c.frameType !== 'nested');
      if (dash) {
        try { await dash.focus(); } catch (e) {}
        let hash = '';
        try { hash = new URL(url, self.location.origin).hash; } catch (e) {}
        dash.postMessage({ type: 'lha-coach-go', hash });
        return;
      }
      await self.clients.openWindow(url);
      return;
    }
    /* the app itself, not the copy of a client's app the dashboard shows in
       a frame for the coach */
    const app = open.find(isApp);
    if (app) {
      try { await app.focus(); } catch (e) {}
      app.postMessage({ type: 'lha-go', go });
      return;
    }
    await self.clients.openWindow(url);
  })());
});
