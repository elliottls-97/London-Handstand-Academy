/* ── one sign in for the whole site (12 Nov 2026) ──────────────────────
   The website and the app are one account: the app keeps its sign in in
   localStorage (lha_app) on this domain, so every page can read it. This puts
   "Sign in" or "Your account" wherever a page has <span data-acct>, fills any
   field marked data-acct-name or data-acct-email that is still empty (class
   bookings, 1-2-1s, the form check), and leaves window.LHAacct for a page that
   wants to know more. A sign in that has run out counts as signed out. */
(function () {
  var s = null; try { s = JSON.parse(localStorage.getItem('lha_app') || 'null'); } catch (e) {}
  var tok = s && s.token ? String(s.token) : '', exp = 0;
  try { exp = Number(JSON.parse(atob(tok.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).exp) || 0; } catch (e) {}
  var on = !!tok && (!exp || exp > Date.now());
  var name = on ? String(s.client || s.name || '').trim() : '';
  var email = on ? String(s.email || '').trim().toLowerCase() : '';
  window.LHAacct = { on: on, name: name, first: name.split(' ')[0] || '', email: email, token: on ? tok : '' };
  /* the app opens on what this page is about: a class page on Classes (or the
     bookings, when a class is coming up), the form check page on Coaching;
     anywhere else, wherever they were last */
  var path = location.pathname || '';
  var to = /handstand-class|session|workshop/.test(path) ? 'classes' : /form-check|coaching/.test(path) ? 'coaching' : '';
  var tq = to ? '&amp;to=' + to : '', tqRaw = to ? '&to=' + to : '';

  var css = '.acct-link{display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-weight:600;white-space:nowrap}'
    + '.acct-av{width:26px;height:26px;border-radius:50%;background:#00403d;color:#fff;display:inline-grid;place-items:center;font:600 11px/1 system-ui,sans-serif;letter-spacing:.02em}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);

  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var initials = function () {
    var p = (name || email.split('@')[0] || '').split(/[\s._-]+/).filter(Boolean);
    return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase();
  };
  var chipHTML = function () {
    return on
      ? '<a class="acct-link" data-app-direct href="/lha-app.html?ref=site-acct' + tq + '" title="Signed in as ' + esc(email) + '" aria-label="Your account"><span class="acct-av">' + esc(initials()) + '</span>Your account</a>'
      : '<a class="acct-link" data-app-direct href="/lha-app.html?signin=1&amp;ref=site-acct' + tq + '">Sign in</a>';
  };
  /* a page's own button made the account button (the homepage's top right): its look is kept,
     its words and link follow the sign in */
  var btn = function (el) {
    if (el.dataset.acctDone) return; el.dataset.acctDone = '1';
    if (!on) { if (to && /signin=1/.test(el.getAttribute('href') || '')) el.href = el.getAttribute('href') + tqRaw; return; }
    el.href = '/lha-app.html?ref=site-acct' + tqRaw;
    /* the homepage opens app links in its own window; an account opens straight in, no tour */
    el.setAttribute('data-app-direct', '');
    el.innerHTML = '<span class="acct-av" style="width:22px;height:22px;font-size:10px;margin-right:7px;vertical-align:middle;background:rgba(255,255,255,.22)">' + esc(initials()) + '</span>Your account';
    el.title = 'Signed in as ' + email;
  };
  var all = function (root, sel) {
    var l = [].slice.call(root.querySelectorAll(sel));
    if (root.matches && root.matches(sel)) l.unshift(root);
    return l;
  };
  var fill = function (root) {
    all(root, '[data-acct-btn]').forEach(btn);
    /* "Sign in" beside a Join button goes once they are signed in */
    if (on) all(root, '[data-acct-hide]').forEach(function (el) { el.style.display = 'none'; });
    all(root, '[data-acct]').forEach(function (el) { if (!el.dataset.acctDone) { el.dataset.acctDone = '1'; el.innerHTML = chipHTML(); } });
    if (!on) return;
    all(root, '[data-acct-name]').forEach(function (el) { if (!el.value && name) el.value = name; });
    all(root, '[data-acct-email]').forEach(function (el) { if (!el.value && email) el.value = email; });
  };
  var go = function () {
    fill(document);
    /* forms a page builds later (the 1-2-1 request, a booking step) */
    try { new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) fill(n); }); }); })
      .observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
