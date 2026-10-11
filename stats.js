/* ── where visitors come from, and what they do ──────────────────────
   On every public page. One count of the page being seen, with where the
   visit came from, and one when somebody heads for a booking page. Totals
   only, on our own server: no cookie, nothing kept on the phone, nothing
   about the person. (Elliott, 11 Oct 2026: "some kind of tracking or
   understanding what's working on the site".)

   Where from: a ?src= or ?ref= or ?utm_source= on the link first (the
   Instagram bio, /ig, sets one), else the site that sent them. A visit that
   started on Google keeps "google" as it moves through the site, because
   the links to the other pages carry it, so the class page and the booking
   know the first source rather than "site". It is taken off the address bar
   once read, so a shared link does not pass it on. */
(function () {
  try {
    var PAGES = { '/': 'home', '/index.html': 'home', '/handstand-class': 'class', '/handstand-class.html': 'class',
      '/handstand-classes-london': 'classes', '/handstand-classes-london.html': 'classes',
      '/learn-to-handstand-london': 'learn', '/learn-to-handstand-london.html': 'learn',
      '/session': 'session', '/session.html': 'session' };
    var page = PAGES[location.pathname];
    if (!page) return;
    var clean = function (v) { return String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20); };
    var ALIAS = { ig: 'instagram', insta: 'instagram', gbp: 'maps', gmb: 'maps', googlemaps: 'maps', fb: 'facebook' };
    var q = new URLSearchParams(location.search);
    var tagged = clean(q.get('src') || q.get('ref') || q.get('utm_source') || window.LHA_TAG);
    tagged = ALIAS[tagged] || tagged;
    var fromRef = function () {
      var r = document.referrer;
      if (!r) return 'direct';
      var h = '';
      try { h = new URL(r).hostname.replace(/^www\./, ''); } catch (e) { return 'other'; }
      if (h === location.hostname.replace(/^www\./, '')) return 'site';
      if (/(^|\.)google\./.test(h)) return 'google';
      if (/instagram\.com$/.test(h)) return 'instagram';
      if (/(facebook\.com|fb\.me|fb\.com)$/.test(h)) return 'facebook';
      if (/(bing\.com|duckduckgo\.com|yahoo\.|ecosia\.org|brave\.com)/.test(h)) return 'search';
      if (/(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|copilot\.microsoft\.com|gemini\.google)/.test(h)) return 'ai';
      if (/(t\.co|x\.com|twitter\.com)$/.test(h)) return 'x';
      if (/(youtube\.com|youtu\.be)$/.test(h)) return 'youtube';
      return 'other';
    };
    var src = tagged || fromRef();
    window.LHA_SRC = src;

    /* off the address bar, the rest of the query kept */
    if (q.has('src') || q.has('utm_source')) {
      q.delete('src'); q.delete('utm_source'); q.delete('utm_medium'); q.delete('utm_campaign');
      var rest = q.toString();
      try { history.replaceState(history.state, '', location.pathname + (rest ? '?' + rest : '') + location.hash); } catch (e) {}
    }

    var send = function (n) {
      var body = JSON.stringify({ n: n, r: src });
      try {
        if (navigator.sendBeacon) navigator.sendBeacon('/api/app/event', new Blob([body], { type: 'application/json' }));
        else fetch('/api/app/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
      } catch (e) {}
    };
    send('pv' + page);

    /* the links to our own pages carry the first source along */
    var carry = src !== 'site' && src !== 'direct';
    var mine = function (a) {
      try { var u = new URL(a.getAttribute('href') || '', location.href); return u.origin === location.origin ? u : null; } catch (e) { return null; }
    };
    var mark = function () {
      if (!carry) return;
      var links = document.querySelectorAll('a[href]');
      for (var i = 0; i < links.length; i++) {
        var u = mine(links[i]);
        if (!u || !PAGES[u.pathname] || u.pathname === location.pathname) continue;
        if (u.searchParams.get('src') === src) continue;
        u.searchParams.set('src', src);
        links[i].setAttribute('href', u.pathname + u.search + u.hash);
      }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark); else mark();
    /* links drawn later (the class dates, the price cards) */
    setTimeout(mark, 2500);

    /* heading for a booking from another page */
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var u = mine(a);
      if (!u) return;
      var to = PAGES[u.pathname];
      if ((to === 'class' || to === 'session') && to !== page) send('tobook');
    }, true);
  } catch (e) { /* counting must never break a page */ }
})();
