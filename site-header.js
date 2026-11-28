/* ── one header for the whole site (Elliott, 14 Nov 2026) ─────────────
   "the learn and about page are formatted different pages, and i lose the
   header". Every site page draws this one, the same as the app's own header
   on a laptop: the logo, Handstand, Classes and Coaching, then Learn and
   About, and on the right the account when signed in, or Sign in and Create
   account when not. It reads the sign in the app keeps on this browser
   (same site, same storage), so a signed in person stays signed in here.

   Use: <script src="/site-header.js" data-on="learn" data-hide=".old-header"></script>
   straight after <body>. data-on marks the page (learn, about); data-hide is
   the page's old header, hidden so it does not show twice. */
(function () {
  var D = document, me = D.currentScript;
  var on = (me && me.getAttribute('data-on')) || '';
  var hide = (me && me.getAttribute('data-hide')) || '';
  var fixed = !!(me && me.hasAttribute('data-fixed'));
  var zi = (me && me.getAttribute('data-z')) || '';
  /* inside the app's own window (an iframe or ?embed=1) the page shows no
     header at all; the website editor's preview keeps it */
  var embedded = (window.self !== window.top || /[?&]embed=1/.test(location.search)) && !/[?&]siteedit=1/.test(location.search);
  /* Inside the iPhone app (its web view adds LHAiOS to the user agent).
     Apple lets the app open the legal pages and the in person bookings
     (classes and 1-2-1s at OverGravity are paid outside Apple, which it
     allows), never a page that sells the app, coaching or form checks
     (guideline 3.1.1). So any other page goes straight back into the app,
     a link to one does the same, and the header is just Back to the app
     (26 Nov 2026). */
  var IOSOK = /^\/(privacy|terms|waiver|session|handstand-class)(\.html)?\/?$/;
  var ios = /LHAiOS/.test(navigator.userAgent) && !/lha-app/.test(location.pathname);
  if (ios) {
    if (!IOSOK.test(location.pathname)) { location.replace('/lha-app.html'); return; }
    var bare = function (h) { return String(h || '').replace(/^www\./, ''); };
    D.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[href]'); if (!a) return;
      var u; try { u = new URL(a.getAttribute('href'), location.href); } catch (x) { return; }
      if (!/^https?:$/.test(u.protocol) || bare(u.hostname) !== bare(location.hostname)) return;
      if (IOSOK.test(u.pathname) || /^\/(lha-app|api\/|assets\/)/.test(u.pathname)) return;
      e.preventDefault(); location.href = '/lha-app.html';
    }, true);
  }
  var st = {};
  try { st = JSON.parse(localStorage.getItem('lha_app') || '{}') || {}; } catch (e) {}
  var signed = !!st.token, coached = !!(st.in || st.coached);
  var first = String(st.client || '').trim().split(/\s+/)[0] || (st.email ? String(st.email).split('@')[0] : '');
  var ini = (function () {
    var w = String(st.client || '').trim().split(/\s+/).filter(Boolean);
    if (w.length > 1) return (w[0][0] + w[w.length - 1][0]).toUpperCase();
    return String(w[0] || (st.email ? String(st.email).split('@')[0] : '') || '?').slice(0, 2).toUpperCase();
  })();
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  var APP = '/lha-app.html?go=';
  var items = coached
    ? [['co', 'Your programme'], ['hs', 'Training'], ['classes', 'Classes']]
    : [['hs', 'Training'], ['classes', 'Classes'], ['co', 'Coaching']];
  /* the Advent challenge, while it runs, as in the app's own header (27 Nov 2026,
     Elliott: "on the website there isn't an advent option on the header"): the
     page about it when signed out, the calendar in the app when signed in */
  if (!coached && Date.now() < Date.parse('2026-12-29T00:00:00Z')) items.splice(1, 0, ['adv', 'Advent']);
  var site = [['learn', 'Learn', '/learn/'], ['about', 'About', '/#story']];

  var css = ''
    + (hide ? hide + '{display:none!important}' : '')
    + '.lsh{position:sticky;top:0;z-index:60;margin:0;padding:0;background:rgba(252,252,252,.9);backdrop-filter:blur(22px) saturate(180%);'
    + '-webkit-backdrop-filter:blur(22px) saturate(180%);border-bottom:1px solid rgba(29,85,102,.10);font-family:Figtree,system-ui,sans-serif}'
    + '.lsh *{box-sizing:border-box}'
    /* a page's own link and nav styles must not reach in (the Learn pages set capitals and spacing) */
    + '.lsh a,.lsh span,.lsh nav,.lsh button{text-transform:none!important;letter-spacing:normal!important;margin:0;text-shadow:none!important}'
    + '.lsh nav{position:static;background:none;border:0;padding:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;width:auto;height:auto}'
    + '.lsh .lsh-menu{position:absolute}'
    + '.lsh-row{max-width:1320px;margin:0 auto;padding:12px 36px;display:flex;align-items:center;gap:26px}'
    + '.lsh-logo img{height:46px;width:auto;display:block;filter:brightness(0) saturate(100%) invert(36%) sepia(30%) saturate(1000%) hue-rotate(144deg) brightness(110%) contrast(90%)}'
    + '.lsh-nav{flex:1;min-width:0;display:flex;align-items:center;gap:24px}'
    + '.lsh-a{padding:10px 0;font:500 15px/1 Figtree,system-ui,sans-serif;color:#5a5a5a;text-decoration:none;border-bottom:2px solid transparent}'
    + '.lsh-a.s{color:#686868}'
    + '.lsh-a:hover{color:#1d5566}'
    + '.lsh-a.on{color:#1d5566;font-weight:600;border-bottom-color:#237f95}'
    + '.lsh-sep{width:1px;height:18px;background:rgba(29,85,102,.18)}'
    + '.lsh-msg{position:relative;flex:none;width:44px;height:44px;border-radius:50%;border:1px solid rgba(29,85,102,.14);background:#fff;display:grid;place-items:center;color:#1d5566}'
    + '.lsh-acct{flex:none;display:flex;align-items:center;gap:10px;padding:4px 14px 4px 4px;border-radius:999px;border:1px solid rgba(29,85,102,.14);background:#fff;'
    + 'font:600 14px/1 Figtree,system-ui,sans-serif;color:#111;text-decoration:none}'
    + '.lsh-acct:hover,.lsh-msg:hover{border-color:#237f95}'
    + '.lsh-ini{width:36px;height:36px;border-radius:50%;background:#1d5566;color:#f7f4f1;display:grid;place-items:center;font:600 13px/1 Figtree,system-ui,sans-serif}'
    + '.lsh-btn{flex:none;min-height:44px;padding:0 18px;border-radius:14px;border:1px solid rgba(29,85,102,.14);background:#fff;color:#1d5566;'
    + 'font:600 14px/1 Figtree,system-ui,sans-serif;display:inline-flex;align-items:center;text-decoration:none}'
    + '.lsh-btn.go{margin-left:-14px;border:0;color:#f7f4f1;background:linear-gradient(180deg,#2f93a9,#237f95);box-shadow:0 8px 20px rgba(35,127,149,.25),inset 0 1px 0 rgba(255,255,255,.35)}'
    + '.lsh-mb{display:none;flex:none;width:44px;height:44px;border-radius:50%;border:1px solid rgba(29,85,102,.14);background:#fff;color:#1d5566;cursor:pointer;place-items:center;padding:0}'
    + '.lsh-menu{display:none}'
    + '@media (max-width:1079px){'
    + '.lsh-row{padding:10px 16px;gap:12px}.lsh-logo img{height:38px}'
    + '.lsh-nav,.lsh-btn.go,.lsh-msg{display:none}.lsh-row .lsh-gap{flex:1}'
    + '.lsh-acct .lsh-name{display:none}.lsh-acct{padding:4px}'
    + '.lsh-mb{display:grid}'
    + '.lsh .lsh-menu{position:absolute;top:calc(100% + 6px);left:16px;right:16px;background:#fff;border:1px solid rgba(29,85,102,.10);border-radius:22px;padding:8px;'
    + 'box-shadow:0 1px 2px rgba(29,85,102,.05),0 18px 40px rgba(29,85,102,.14)}'
    + '.lsh .lsh-menu.open{display:grid;gap:2px}'
    + '.lsh-menu a{display:block;padding:13px 16px;border-radius:14px;font:400 20px/1.2 Newsreader,Georgia,serif;color:#111;text-decoration:none}'
    + '.lsh-menu a.on{color:#237f95}.lsh-menu a:hover{background:rgba(29,85,102,.06)}'
    + '.lsh-menu hr{border:0;height:1px;background:rgba(29,85,102,.10);margin:6px 8px}'
    + '}'
    + '@media (min-width:1080px){.lsh-gap{display:none}}'
    + '.lsh.fixed{position:fixed;left:0;right:0;top:0}'
    + 'body.has-eb .lsh.fixed{top:40px}'
    + (zi ? '.lsh{z-index:' + zi + '}' : '');

  /* signed out, Classes is the class page itself, with the photos, coaches
     and reviews; signed in, it is the classes in the app (Elliott, 14 Nov 2026:
     "classes main landing page has gone when im not signed in") */
  /* and Coaching is the coaching page (25 Nov 2026, launched; it was the free
     form check page from 14 Nov, which the coaching page now links to) */
  var hrefOf = function (k) { return k === 'adv' ? (signed ? '/lha-app.html?chal=join' : '/advent')
    : (!signed && k === 'classes') ? '/handstand-class' : (!signed && k === 'co') ? '/coaching' : APP + k; };
  var nav = items.map(function (x) { return '<a class="lsh-a' + (on === x[0] ? ' on' : '') + '" data-nowin href="' + hrefOf(x[0]) + '">' + esc(x[1]) + '</a>'; }).join('')
    + '<span class="lsh-sep" aria-hidden="true"></span>'
    + site.map(function (x) { return '<a class="lsh-a s' + (on === x[0] ? ' on' : '') + '" href="' + x[2] + '"' + (on === x[0] ? ' aria-current="page"' : '') + '>' + x[1] + '</a>'; }).join('');
  var chat = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-6.2A8 8 0 1 1 21 12z"/></svg>';
  var right = signed
    ? '<a class="lsh-msg" data-nowin href="' + APP + 'chat" aria-label="Messages">' + chat + '</a>'
      + '<a class="lsh-acct" data-nowin href="' + APP + 'menu" aria-label="Your account"><span class="lsh-ini">' + esc(ini) + '</span><span class="lsh-name">' + esc(first || 'You') + '</span></a>'
    : '<a class="lsh-btn" data-nowin href="' + APP + 'signin">Sign in</a><a class="lsh-btn go" data-nowin href="' + APP + 'join">Create account</a>';
  var menu = items.map(function (x) { return '<a data-nowin href="' + hrefOf(x[0]) + '"' + (on === x[0] ? ' class="on"' : '') + '>' + esc(x[1]) + '</a>'; }).join('')
    + '<hr>' + site.map(function (x) { return '<a href="' + x[2] + '"' + (on === x[0] ? ' class="on"' : '') + '>' + x[1] + '</a>'; }).join('')
    + (signed ? '' : '<hr><a data-nowin href="' + APP + 'join">Create account</a>');
  var burger = '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  var style = D.createElement('style');
  if (embedded) { style.textContent = hide ? hide + '{display:none!important}' : ''; D.head.appendChild(style); return; }
  style.textContent = css; D.head.appendChild(style);
  var h = D.createElement('header'); h.className = 'lsh' + (fixed ? ' fixed' : '');
  if (ios) {
    h.innerHTML = '<div class="lsh-row"><a class="lsh-logo" href="/lha-app.html" aria-label="Back to the app"><img src="/assets/site/full-logo.png" alt="London Handstand Academy"></a>'
      + '<span class="lsh-gap"></span><a class="lsh-btn" href="/lha-app.html" style="border:0;color:#f7f4f1;background:linear-gradient(180deg,#2f93a9,#237f95);box-shadow:0 8px 20px rgba(35,127,149,.25),inset 0 1px 0 rgba(255,255,255,.35)">Back to the app</a></div>';
    if (me && me.parentNode) me.parentNode.insertBefore(h, me); else D.body.insertBefore(h, D.body.firstChild);
    return;
  }
  h.innerHTML = '<div class="lsh-row"><a class="lsh-logo" href="/" aria-label="London Handstand Academy, home"><img src="/assets/site/full-logo.png" alt="London Handstand Academy"></a>'
    + '<nav class="lsh-nav" aria-label="Main">' + nav + '</nav><span class="lsh-gap"></span>' + right
    + '<button type="button" class="lsh-mb" aria-label="Menu" aria-expanded="false">' + burger + '</button></div>'
    + '<nav class="lsh-menu" aria-label="Menu">' + menu + '</nav>';
  if (me && me.parentNode) me.parentNode.insertBefore(h, me); else D.body.insertBefore(h, D.body.firstChild);
  /* the app is told which website page they came from, so signing out
     there brings them back to it, signed out, instead of leaving them on
     the app's sign in screen (Elliott, 15 Nov 2026) */
  if (!/lha-app/.test(location.pathname)) {
    var back = encodeURIComponent(location.pathname + location.search + location.hash);
    [].forEach.call(h.querySelectorAll('a[data-nowin]'), function (a) {
      var u = a.getAttribute('href') || ''; if (u.indexOf('/lha-app.html') === 0) a.setAttribute('href', u + (u.indexOf('?') > -1 ? '&' : '?') + 'back=' + back); });
  }
  var mb = h.querySelector('.lsh-mb'), mn = h.querySelector('.lsh-menu');
  mb.addEventListener('click', function (e) { e.stopPropagation(); var o = mn.classList.toggle('open'); mb.setAttribute('aria-expanded', String(o)); });
  mn.addEventListener('click', function (e) { if (e.target.closest('a')) { mn.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); } });
  /* close it from anywhere: a press outside (caught before the page's own
     handlers, some of which stop the click going further), Escape, or a scroll */
  var shut = function () { if (mn.classList.contains('open')) { mn.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); } };
  var y0 = 0;
  mb.addEventListener('click', function () { y0 = window.scrollY; });
  D.addEventListener('pointerdown', function (e) { if (!mn.contains(e.target) && !mb.contains(e.target)) shut(); }, true);
  D.addEventListener('click', function (e) { if (!mn.contains(e.target) && !mb.contains(e.target)) shut(); }, true);
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
  window.addEventListener('scroll', function () { if (Math.abs(window.scrollY - y0) > 40) shut(); }, { passive: true });
})();
