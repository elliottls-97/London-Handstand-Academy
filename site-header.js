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
    ? [['co', 'Your programme'], ['hs', 'Handstand'], ['classes', 'Classes']]
    : [['hs', 'Handstand'], ['classes', 'Classes'], ['co', 'Coaching']];
  var site = [['learn', 'Learn', '/learn/'], ['about', 'About', '/#story']];

  var css = ''
    + (hide ? hide + '{display:none!important}' : '')
    + '.lsh{position:sticky;top:0;z-index:60;margin:0;padding:0;background:rgba(252,252,252,.9);backdrop-filter:blur(22px) saturate(180%);'
    + '-webkit-backdrop-filter:blur(22px) saturate(180%);border-bottom:1px solid rgba(0,64,61,.10);font-family:Figtree,system-ui,sans-serif}'
    + '.lsh *{box-sizing:border-box}'
    /* a page's own link and nav styles must not reach in (the Learn pages set capitals and spacing) */
    + '.lsh a,.lsh span,.lsh nav,.lsh button{text-transform:none!important;letter-spacing:normal!important;margin:0;text-shadow:none!important}'
    + '.lsh nav{position:static;background:none;border:0;padding:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;width:auto;height:auto}'
    + '.lsh .lsh-menu{position:absolute}'
    + '.lsh-row{max-width:1320px;margin:0 auto;padding:12px 36px;display:flex;align-items:center;gap:26px}'
    + '.lsh-logo img{height:46px;width:auto;display:block;filter:brightness(0) saturate(100%) invert(35%) sepia(22%) saturate(900%) hue-rotate(135deg) brightness(96%) contrast(90%)}'
    + '.lsh-nav{flex:1;min-width:0;display:flex;align-items:center;gap:24px}'
    + '.lsh-a{padding:10px 0;font:500 15px/1 Figtree,system-ui,sans-serif;color:#5a5a5a;text-decoration:none;border-bottom:2px solid transparent}'
    + '.lsh-a.s{color:#686868}'
    + '.lsh-a:hover{color:#00403d}'
    + '.lsh-a.on{color:#00403d;font-weight:600;border-bottom-color:#006663}'
    + '.lsh-sep{width:1px;height:18px;background:rgba(0,64,61,.18)}'
    + '.lsh-msg{position:relative;flex:none;width:44px;height:44px;border-radius:50%;border:1px solid rgba(0,64,61,.14);background:#fff;display:grid;place-items:center;color:#00403d}'
    + '.lsh-acct{flex:none;display:flex;align-items:center;gap:10px;padding:4px 14px 4px 4px;border-radius:999px;border:1px solid rgba(0,64,61,.14);background:#fff;'
    + 'font:600 14px/1 Figtree,system-ui,sans-serif;color:#111;text-decoration:none}'
    + '.lsh-acct:hover,.lsh-msg:hover{border-color:#006663}'
    + '.lsh-ini{width:36px;height:36px;border-radius:50%;background:#00403d;color:#f7f4f1;display:grid;place-items:center;font:600 13px/1 Figtree,system-ui,sans-serif}'
    + '.lsh-btn{flex:none;min-height:44px;padding:0 18px;border-radius:14px;border:1px solid rgba(0,64,61,.14);background:#fff;color:#00403d;'
    + 'font:600 14px/1 Figtree,system-ui,sans-serif;display:inline-flex;align-items:center;text-decoration:none}'
    + '.lsh-btn.go{margin-left:-14px;border:0;color:#f7f4f1;background:linear-gradient(180deg,#0a7a76,#006663);box-shadow:0 8px 20px rgba(0,102,99,.25),inset 0 1px 0 rgba(255,255,255,.35)}'
    + '.lsh-mb{display:none;flex:none;width:44px;height:44px;border-radius:50%;border:1px solid rgba(0,64,61,.14);background:#fff;color:#00403d;cursor:pointer;place-items:center;padding:0}'
    + '.lsh-menu{display:none}'
    + '@media (max-width:1079px){'
    + '.lsh-row{padding:10px 16px;gap:12px}.lsh-logo img{height:38px}'
    + '.lsh-nav,.lsh-btn.go,.lsh-msg{display:none}.lsh-row .lsh-gap{flex:1}'
    + '.lsh-acct .lsh-name{display:none}.lsh-acct{padding:4px}'
    + '.lsh-mb{display:grid}'
    + '.lsh-menu{position:absolute;top:calc(100% + 6px);left:16px;right:16px;background:#fff;border:1px solid rgba(0,64,61,.10);border-radius:22px;padding:8px;'
    + 'box-shadow:0 1px 2px rgba(0,64,61,.05),0 18px 40px rgba(0,64,61,.14)}'
    + '.lsh-menu.open{display:grid;gap:2px}'
    + '.lsh-menu a{display:block;padding:13px 16px;border-radius:14px;font:400 20px/1.2 Newsreader,Georgia,serif;color:#111;text-decoration:none}'
    + '.lsh-menu a.on{color:#006663}.lsh-menu a:hover{background:rgba(0,64,61,.06)}'
    + '.lsh-menu hr{border:0;height:1px;background:rgba(0,64,61,.10);margin:6px 8px}'
    + '}'
    + '@media (min-width:1080px){.lsh-gap{display:none}}'
    + '.lsh.fixed{position:fixed;left:0;right:0;top:0}'
    + 'body.has-eb .lsh.fixed{top:40px}'
    + (zi ? '.lsh{z-index:' + zi + '}' : '');

  var nav = items.map(function (x) { return '<a class="lsh-a' + (on === x[0] ? ' on' : '') + '" data-nowin href="' + APP + x[0] + '">' + esc(x[1]) + '</a>'; }).join('')
    + '<span class="lsh-sep" aria-hidden="true"></span>'
    + site.map(function (x) { return '<a class="lsh-a s' + (on === x[0] ? ' on' : '') + '" href="' + x[2] + '"' + (on === x[0] ? ' aria-current="page"' : '') + '>' + x[1] + '</a>'; }).join('');
  var chat = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-6.2A8 8 0 1 1 21 12z"/></svg>';
  var right = signed
    ? '<a class="lsh-msg" data-nowin href="' + APP + 'chat" aria-label="Messages">' + chat + '</a>'
      + '<a class="lsh-acct" data-nowin href="' + APP + 'menu" aria-label="Your account"><span class="lsh-ini">' + esc(ini) + '</span><span class="lsh-name">' + esc(first || 'You') + '</span></a>'
    : '<a class="lsh-btn" data-nowin href="' + APP + 'signin">Sign in</a><a class="lsh-btn go" data-nowin href="' + APP + 'join">Create account</a>';
  var menu = items.map(function (x) { return '<a data-nowin href="' + APP + x[0] + '"' + (on === x[0] ? ' class="on"' : '') + '>' + esc(x[1]) + '</a>'; }).join('')
    + '<hr>' + site.map(function (x) { return '<a href="' + x[2] + '"' + (on === x[0] ? ' class="on"' : '') + '>' + x[1] + '</a>'; }).join('')
    + (signed ? '' : '<hr><a data-nowin href="' + APP + 'join">Create account</a>');
  var burger = '<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  var style = D.createElement('style');
  if (embedded) { style.textContent = hide ? hide + '{display:none!important}' : ''; D.head.appendChild(style); return; }
  style.textContent = css; D.head.appendChild(style);
  var h = D.createElement('header'); h.className = 'lsh' + (fixed ? ' fixed' : '');
  h.innerHTML = '<div class="lsh-row"><a class="lsh-logo" href="/" aria-label="London Handstand Academy, home"><img src="/assets/site/full-logo.png" alt="London Handstand Academy"></a>'
    + '<nav class="lsh-nav" aria-label="Main">' + nav + '</nav><span class="lsh-gap"></span>' + right
    + '<button type="button" class="lsh-mb" aria-label="Menu" aria-expanded="false">' + burger + '</button></div>'
    + '<nav class="lsh-menu" aria-label="Menu">' + menu + '</nav>';
  if (me && me.parentNode) me.parentNode.insertBefore(h, me); else D.body.insertBefore(h, D.body.firstChild);
  var mb = h.querySelector('.lsh-mb'), mn = h.querySelector('.lsh-menu');
  mb.addEventListener('click', function (e) { e.stopPropagation(); var o = mn.classList.toggle('open'); mb.setAttribute('aria-expanded', String(o)); });
  D.addEventListener('click', function (e) { if (!h.contains(e.target)) { mn.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); } });
})();
