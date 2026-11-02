/* ── what breaks on a website page (30 Oct 2026) ────────────────────
   A script error on any page that loads this, sent to the same What broke
   list as the app's, at most five a visit and never from Elliott's own
   devices. The app has its own reporter, so it is left to that. */
(function () {
  try {
    if (/lha-app|lha-coach/.test(location.pathname)) return;
    if (/(?:^|;\s*)lha_me=1(?:;|$)/.test(document.cookie || '')) return;
    var sent = 0;
    var tell = function (k, m, w, st) {
      if (sent >= 5 || !m) return; sent++;
      var body = JSON.stringify({ k: 'site', m: String(m).slice(0, 220), w: String(w || '').slice(0, 120),
        sc: location.pathname.replace(/[^a-z0-9-]+/gi, ' ').trim().slice(0, 40) || 'home', dv: 'web', st: String(st || '').slice(0, 600) });
      try {
        if (navigator.sendBeacon) navigator.sendBeacon('/api/app/err', new Blob([body], { type: 'application/json' }));
        else fetch('/api/app/err', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
      } catch (e) {}
    };
    /* what Instagram's and Facebook's in-app browsers throw, not ours */
    var noise = /_AutofillCallbackHandler|Java object is gone|webkit\.messageHandlers|iabjs:|navigation_performance_logger/;
    window.addEventListener('error', function (e) {
      if (!e || !e.message || /Script error\.?$/.test(e.message)) return;
      if (noise.test(e.message) || noise.test(String(e.filename || '')) || noise.test(String((e.error && e.error.stack) || ''))) return;
      tell('js', e.message, (String(e.filename || '').split('/').pop().split(/[?#]/)[0] || '') + ':' + (e.lineno || 0), e.error && e.error.stack);
    });
    window.addEventListener('unhandledrejection', function (e) {
      var r = e && e.reason; tell('promise', (r && r.message) || String(r), '', r && r.stack);
    });
  } catch (e) {}
})();
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
      '/session': 'session', '/session.html': 'session', '/links': 'links', '/links.html': 'links',
      '/six-week-handstand-group': 'group', '/six-week-handstand-group.html': 'group', '/call': 'call', '/call.html': 'call',
      '/workshop': 'workshop', '/workshop.html': 'workshop' };
    /* the app, which keeps the first source as its own (30 Oct 2026): the
       link into it dropped it, so an account from Instagram via the
       homepage was never known as one */
    var APP = { '/lha-app.html': 1, '/lha-app': 1, '/app': 1, '/app.html': 1 };
    var page = PAGES[location.pathname] || (/^\/learn(\/|$)/.test(location.pathname) ? 'learn' : '');
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
    /* Back from Stripe, paid or by its back link: the same visit, not a new
       one from "Other websites" (16 Oct 2026, review). */
    var fromStripe = /(^|\.)stripe\.com$/.test((function () { try { return document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { return ''; } })())
      || q.get('from') === 'stripe' || q.has('booked');
    if (q.get('from') === 'stripe') { q.delete('from'); var r0 = q.toString();
      try { history.replaceState(history.state, '', location.pathname + (r0 ? '?' + r0 : '') + location.hash); } catch (e) {} }

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
    if (!fromStripe) send('pv' + page);

    /* the links to our own pages carry the first source along */
    /* "typed in or saved" is carried too: the next page saw our own site as
       the referrer and counted it as from your own pages (16 Oct 2026) */
    var carry = src !== 'site';
    var mine = function (a) {
      try { var u = new URL(a.getAttribute('href') || '', location.href); return u.origin === location.origin ? u : null; } catch (e) { return null; }
    };
    var mark = function () {
      if (!carry) return;
      var links = document.querySelectorAll('a[href]');
      for (var i = 0; i < links.length; i++) {
        var u = mine(links[i]);
        if (!u || !(PAGES[u.pathname] || APP[u.pathname]) || u.pathname === location.pathname) continue;
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
/* ── cookie consent on every public page (1 Nov 2026) ────────────────
   The homepage has its own bar; every other page that loads this gets the
   same one, with the same remembered answer (lha-cookie-consent), so a
   choice made anywhere holds everywhere. Accept loads Microsoft Clarity
   and Google Analytics; decline, or no answer, loads nothing. Never on
   Elliott's own devices, never in the app or the dashboard. */
(function () {
  try {
    if (/lha-app|lha-coach|lha-app-preview/.test(location.pathname)) return;
    if (document.getElementById('cookieBar')) return;
    var KEY = 'lha-cookie-consent', CLARITY_ID = 'xu03z2n3k6', GA_ID = 'G-Q8X7QG1BPE';
    var mine = /(?:^|;\s*)lha_me=1(?:;|$)/.test(document.cookie || '');
    var read = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
    var write = function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} };
    var loaded = false;
    var load = function () {
      if (loaded || mine) return; loaded = true;
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(window, document, 'clarity', 'script', CLARITY_ID);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', GA_ID, { anonymize_ip: true });
      var g = document.createElement('script'); g.async = true;
      g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
      document.head.appendChild(g);
    };
    var css = '#lhaCookie{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));z-index:2147483000;width:calc(100% - 24px);max-width:500px;'
      + 'display:flex;align-items:center;gap:14px;padding:12px 12px 12px 18px;border-radius:18px;background:rgba(0,64,61,.96);'
      + 'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.12);box-shadow:0 18px 44px -12px rgba(0,0,0,.45);'
      + 'transform:translate(-50%,calc(100% + 40px));transition:transform .35s ease;font-family:Figtree,system-ui,-apple-system,sans-serif}'
      + '#lhaCookie.in{transform:translate(-50%,0)}'
      + '#lhaCookie p{flex:1;min-width:0;margin:0;font-size:13px;line-height:1.45;color:rgba(255,255,255,.88)}'
      + '#lhaCookie .lhc-b{display:flex;gap:8px;flex-shrink:0;margin:0}'
      + '#lhaCookie button{position:static;margin:0;width:auto;height:auto;min-width:0;padding:9px 16px;border-radius:999px;border:0;cursor:pointer;font:700 12.5px/1 Figtree,system-ui,sans-serif;letter-spacing:.5px;text-transform:uppercase;white-space:nowrap}'
      + '#lhaCookie .lhc-y{background:#fff;color:#00403d}#lhaCookie .lhc-n{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.32)}'
      + '@media (max-width:640px){#lhaCookie{gap:10px;padding:10px 10px 10px 14px;border-radius:16px;bottom:calc(10px + env(safe-area-inset-bottom))}#lhaCookie p{font-size:12px;line-height:1.35}#lhaCookie button{padding:8px 12px;font-size:11.5px}}'
      + '.lha-cookie-link{background:none;border:0;padding:0;cursor:pointer;font:inherit;color:inherit;text-decoration:underline}';
    var bar = null;
    var show = function () {
      if (bar) return;
      bar = document.createElement('div'); bar.id = 'lhaCookie'; bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-label', 'Cookie consent');
      bar.innerHTML = '<p>Analytics cookies? Optional: decline and nothing is stored.</p><div class="lhc-b"><button class="lhc-n" type="button">Decline</button><button class="lhc-y" type="button">Accept</button></div>';
      document.body.appendChild(bar);
      var answer = function (v) { write(v); bar.classList.remove('in'); var b = bar; bar = null; setTimeout(function () { b.remove(); }, 400); if (v === 'accepted') load(); };
      bar.querySelector('.lhc-n').onclick = function () { answer('declined'); };
      bar.querySelector('.lhc-y').onclick = function () { answer('accepted'); };
      requestAnimationFrame(function () { requestAnimationFrame(function () { bar && bar.classList.add('in'); }); });
    };
    window.LHA = window.LHA || {};
    window.LHA.showCookieSettings = function () { try { localStorage.removeItem(KEY); } catch (e) {} show(); };
    var start = function () {
      var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      /* a way to change your mind, at the end of the page's footer */
      var f = document.querySelector('footer');
      if (f && !f.querySelector('.lha-cookie-link')) {
        var at = f.querySelector('.wrap') || f;
        at.insertAdjacentHTML('beforeend', ' &middot; <button type="button" class="lha-cookie-link" onclick="LHA.showCookieSettings()">Cookie settings</button>');
      }
      var c = read();
      if (c === 'accepted') load(); else if (c !== 'declined' && !mine) show();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  } catch (e) {}
})();
