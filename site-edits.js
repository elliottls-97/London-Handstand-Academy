/* ── the website's own edits ──────────────────────────────────────────
   Text, links, photos and sections changed in the dashboard's Website
   editor. Nothing here changes the page files: the edits are kept by the
   server and laid over the page as it loads, so publishing is instant and
   costs no deploy.

   Every piece of the page is known by what it said when it was written (a
   hash of its words, or of a photo's address), never by its position. If
   the page itself is later rewritten, an edit to words that are no longer
   there simply stops applying; it can never land on the wrong paragraph.

   Loaded with data-page="home" (or the page's name), after the page's own
   content and before its own scripts, so it sees the page as written.

   Opened by the editor (?siteedit=1 inside the dashboard), it becomes the
   editing surface instead: nothing navigates, and a click picks what to
   change. */
(function () {
  'use strict';
  var me = document.currentScript;
  var PAGE = (me && me.getAttribute('data-page')) || 'home';
  var EDIT = /[?&]siteedit=1\b/.test(location.search) && window.parent !== window;
  var API = '/api/app/site';

  /* ── what counts as something to edit ── */
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, SVG: 1, SELECT: 1, OPTION: 1,
    TEXTAREA: 1, INPUT: 1, IFRAME: 1, CANVAS: 1, HEAD: 1 };
  var BLOCK = 'div,p,h1,h2,h3,h4,h5,h6,ul,ol,li,section,article,aside,header,footer,nav,form,table,figure,blockquote,details,summary,dl,dt,dd,img,video,iframe';
  var norm = function (s) { return String(s || '').replace(/\s+/g, ' ').trim(); };
  /* the words as read: a line break is a space, not nothing */
  var words = function (el) {
    var c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('br'), function (b) { b.replaceWith(' '); });
    return norm(c.textContent);
  };
  var hash = function (s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  };
  var ownText = function (el) {
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && /\S/.test(n.nodeValue)) return true;
    return false;
  };
  /* prices and dates are filled in by the page itself; the Google reviews
     are word for word and never edited */
  var lockOf = function (el) {
    var l = el.closest('[data-lock]');
    if (l) return l.getAttribute('data-lock') || 'This part is locked.';
    if (el.matches('[data-price],[data-when]') || el.querySelector('[data-price],[data-when]'))
      return 'Prices and dates are set elsewhere: prices in Prices, dates on the class.';
    /* a line with a working button or link inside (one that opens the quiz,
       say) would lose what it does if saved as text */
    if (el.querySelector('[onclick],[id],[data-booking-url]'))
      return 'This line has a working link inside it, so ask Claude to change it.';
    return '';
  };

  var texts = [], imgs = [], vids = [], secs = [], byKey = {};
  var orig = new Map();        /* element -> what it was */
  var touched = new Set();     /* elements an edit has changed */
  var remember = function (el, o) { orig.set(el, Object.assign(orig.get(el) || {}, o)); };
  var bgUrl = function (el) { var m = /url\(\s*['"]?([^'")]+)['"]?\s*\)/.exec((el.style && el.style.backgroundImage) || ''); return m ? m[1] : ''; };
  var vidSrc = function (v) { var s = v.querySelector('source'); return v.getAttribute('src') || (s && s.getAttribute('src')) || ''; };
  /* a cover photo drawn as a background often stands in front of a video
     that plays when it is pressed (the team cards): that video is its partner */
  var partner = function (el) { var p = el.parentElement; if (!p) return null;
    for (var c = p.firstElementChild; c; c = c.nextElementSibling) if (c.tagName === 'VIDEO') return c; return null; };

  function scan() {
    var seen = {};
    var keyOf = function (base) { var n = seen[base] || 0; seen[base] = n + 1; return n ? base + '.' + n : base; };
    var walk = function (el) {
      if (!el || SKIP[el.tagName] || (el.id && el.id.indexOf('lhaSite') === 0)) return;
      if (el.tagName === 'IMG') {
        var src = el.getAttribute('src') || '';
        if (src) {
          var k = keyOf('img.' + hash(src));
          imgs.push({ key: k, el: el, lock: lockOf(el) });
          byKey[k] = el; remember(el, { src: src, srcset: el.getAttribute('srcset') });
        }
        return;
      }
      if (el.tagName === 'VIDEO') {
        var vs = vidSrc(el);
        if (vs) {
          var vk = keyOf('vid.' + hash(vs));
          vids.push({ key: vk, el: el, lock: lockOf(el) });
          byKey[vk] = el; remember(el, { vsrc: vs, poster: el.getAttribute('poster') });
        }
        return;
      }
      /* a photo drawn as a background: the element stays open for the words
         and photos inside it */
      var bu = bgUrl(el);
      if (bu) {
        var bk = keyOf('bg.' + hash(bu));
        imgs.push({ key: bk, el: el, lock: lockOf(el), bg: true });
        byKey[bk] = el; remember(el, { bg: el.style.backgroundImage, bgUrl: bu });
      }
      if (ownText(el) && !el.querySelector(BLOCK)) {
        var said = words(el);
        if (said) {
          var key = keyOf(el.tagName.toLowerCase() + '.' + hash(said));
          texts.push({ key: key, el: el, was: said.slice(0, 140), lock: lockOf(el), link: el.tagName === 'A' });
          byKey[key] = el; remember(el, { html: el.innerHTML, href: el.getAttribute('href') });
          return;
        }
      }
      for (var c = el.firstElementChild; c; c = c.nextElementSibling) walk(c);
    };
    walk(document.body);
    /* the page's sections, in the order written, each with a slot so they
       can be put back in any order */
    var list = document.querySelectorAll('body > section, body > footer, body > main > section, body > main > footer, body > header, body > main > header');
    var sseen = {};
    Array.prototype.forEach.call(list, function (s) {
      var h = s.querySelector('h1,h2,h3,.eyebrow');
      var base = s.id ? 'sec.' + s.id : 'sec.' + hash((h ? words(h) : words(s)).slice(0, 200));
      var n = sseen[base] || 0; sseen[base] = n + 1;
      var key = n ? base + '.' + n : base;
      var slot = document.createComment('lha-site-slot');
      s.parentNode.insertBefore(slot, s);
      secs.push({ key: key, el: s, slot: slot, name: (h ? words(h) : (s.id || 'Section')).slice(0, 60) });
      byKey[key] = s; remember(s, { display: s.style.display });
    });
  }

  /* only what an editor would type: no scripts, no handlers, no styles
     smuggled in */
  var SAFE_TAGS = { B: 1, STRONG: 1, I: 1, EM: 1, BR: 1, A: 1, SPAN: 1, SMALL: 1, U: 1 };
  var safeHref = function (h) {
    h = String(h || '').trim();
    return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(h) && !/^\/\//.test(h) ? h : '';
  };
  function clean(html) {
    var t = document.createElement('template');
    t.innerHTML = String(html || '');
    var tidy = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 8) { c.remove(); return; }
        if (c.nodeType !== 1) return;
        tidy(c);
        if (!SAFE_TAGS[c.tagName]) { while (c.firstChild) c.parentNode.insertBefore(c.firstChild, c); c.remove(); return; }
        Array.prototype.slice.call(c.attributes).forEach(function (a) {
          var keep = (c.tagName === 'A' && (a.name === 'href' || a.name === 'target' || a.name === 'rel'))
            || (a.name === 'class' && c.tagName === 'SPAN') || a.name === 'data-price' || a.name === 'data-when';
          if (!keep) c.removeAttribute(a.name);
        });
        if (c.tagName === 'A') { var h = safeHref(c.getAttribute('href')); if (h) c.setAttribute('href', h); else c.removeAttribute('href'); }
      });
    };
    tidy(t.content);
    return t.innerHTML;
  }
  var safeSrc = function (s) { s = String(s || ''); return /^(https:\/\/|\/api\/app\/site\/img\/|\/assets\/|assets\/)/.test(s) ? s : ''; };
  var setVideo = function (v, src) {
    var s = v.querySelector('source');
    if (s) { if (s.getAttribute('src') !== src) { s.setAttribute('src', src); try { v.load(); } catch (e) {} } }
    else if (v.getAttribute('src') !== src) v.setAttribute('src', src);
  };

  /* lay a set of edits over the page. Only what an edit has touched is
     ever put back, so nothing the page's own scripts changed is undone. */
  function apply(E) {
    E = E || {};
    var t = E.t || {}, h = E.h || {}, im = E.i || {}, x = E.x || {};
    var want = new Set();
    Object.keys(t).forEach(function (k) {
      var el = byKey[k]; if (!el || orig.get(el).html === undefined || lockOf(el)) return;
      var html = clean(t[k] && t[k].html);
      if (el.innerHTML !== html) el.innerHTML = html;
      want.add(el);
    });
    Object.keys(h).forEach(function (k) {
      var el = byKey[k]; if (!el || el.tagName !== 'A' || lockOf(el)) return;
      var href = safeHref(h[k] && h[k].href); if (!href) return;
      el.setAttribute('href', href); want.add(el);
    });
    Object.keys(im).forEach(function (k) {
      var el = byKey[k]; if (!el || lockOf(el)) return;
      var src = safeSrc(im[k] && im[k].src); if (!src) return;
      if (el.tagName === 'IMG') {
        if (el.getAttribute('src') !== src) { el.removeAttribute('srcset'); el.setAttribute('src', src); }
        if (im[k].alt) el.setAttribute('alt', String(im[k].alt).slice(0, 200));
      } else if (orig.get(el).bgUrl) {
        el.style.backgroundImage = 'url("' + src.replace(/"/g, '%22') + '")';
        /* the video behind it starts on the same picture */
        var v = partner(el); if (v && (v.getAttribute('poster') || '') === orig.get(el).bgUrl) v.setAttribute('poster', src);
      } else return;
      want.add(el);
    });
    var vv = E.v || {};
    Object.keys(vv).forEach(function (k) {
      var el = byKey[k]; if (!el || el.tagName !== 'VIDEO' || lockOf(el)) return;
      var src = String((vv[k] && vv[k].src) || ''); if (!/^https:\/\//.test(src)) return;
      setVideo(el, src); want.add(el);
    });
    secs.forEach(function (s) {
      var hide = !!x[s.key];
      s.el.style.display = hide && !EDIT ? 'none' : (orig.get(s.el).display || '');
      s.el.toggleAttribute('data-lha-hidden', hide);
      if (hide) want.add(s.el);
    });
    /* sections in their chosen order: into the slots they were written in */
    var order = Array.isArray(E.o) ? E.o : [];
    var ranked = secs.slice().sort(function (a, b) {
      var ia = order.indexOf(a.key), ib = order.indexOf(b.key);
      if (ia < 0) ia = 1e4 + secs.indexOf(a); if (ib < 0) ib = 1e4 + secs.indexOf(b);
      return ia - ib;
    });
    ranked.forEach(function (s, i) { var slot = secs[i].slot; if (slot.nextSibling !== s.el) slot.parentNode.insertBefore(s.el, slot.nextSibling); });
    /* what was edited before and is not now goes back to how it was written */
    touched.forEach(function (el) {
      if (want.has(el)) return;
      var o = orig.get(el);
      if (o.html !== undefined && el.innerHTML !== o.html) el.innerHTML = o.html;
      if (o.href !== undefined && o.href !== null) el.setAttribute('href', o.href);
      if (o.src !== undefined && el.getAttribute('src') !== o.src) { el.setAttribute('src', o.src); if (o.srcset) el.setAttribute('srcset', o.srcset); }
      if (o.bgUrl) { el.style.backgroundImage = o.bg; var pv = partner(el); if (pv) pv.setAttribute('poster', o.bgUrl); }
      if (o.vsrc) setVideo(el, o.vsrc);
    });
    touched = want;
  }

  scan();

  /* ── on the public page ── */
  if (!EDIT) {
    var CK = 'lhaSite:' + PAGE;
    /* last time's edits straight away, so a returning visitor never sees
       the old words flash first; then the current ones */
    var current = null;
    try { current = JSON.parse(localStorage.getItem(CK) || 'null'); if (current) apply(current); } catch (e) {}
    /* the page's own scripts set some photos as it loads (the team's
       headshots and covers): once they have, the edits go back on top */
    window.addEventListener('load', function () { if (current) apply(current); });
    fetch(API + '?page=' + encodeURIComponent(PAGE), { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        var e = d.e || {};
        current = e;
        apply(e);
        try { if (Object.keys(e).length) localStorage.setItem(CK, JSON.stringify(e)); else localStorage.removeItem(CK); } catch (err) {}
      }).catch(function () {});
    return;
  }

  /* ── inside the editor ── */
  var style = document.createElement('style');
  style.id = 'lhaSiteStyle';
  style.textContent =
    '[data-lha-t]{cursor:text;transition:outline-color .12s}' +
    '[data-lha-t]:hover{outline:2px dashed rgba(0,102,99,.55);outline-offset:3px}' +
    '[data-lha-i]{cursor:pointer}[data-lha-i]:hover{outline:3px dashed rgba(0,102,99,.6);outline-offset:-3px}' +
    '[data-lha-lock]:hover{outline:2px dotted rgba(90,90,90,.55)!important;cursor:not-allowed!important}' +
    '[data-lha-on]{outline:2px solid #006663!important;outline-offset:3px;background:rgba(207,230,236,.25)}' +
    '[data-lha-sec-on]{box-shadow:inset 0 0 0 3px #006663!important}' +
    '[data-lha-hidden]{opacity:.32;position:relative}' +
    '[data-lha-hidden]::before{content:"Hidden on the website";position:absolute;top:12px;left:12px;z-index:50;' +
    'background:#00403d;color:#fff;font:600 12px/1 system-ui;padding:7px 10px;border-radius:999px}' +
    '[contenteditable="true"]{cursor:text}' +
    '[data-lha-v]{cursor:pointer}[data-lha-v]:hover{outline:3px dashed rgba(0,102,99,.6);outline-offset:-3px}' +
    '#cookieBar,.cookie-bar{display:none!important}';
  document.head.appendChild(style);
  texts.forEach(function (x) { x.el.setAttribute(x.lock ? 'data-lha-lock' : 'data-lha-t', ''); if (x.lock) x.el.title = x.lock; });
  imgs.forEach(function (x) { x.el.setAttribute(x.lock ? 'data-lha-lock' : 'data-lha-i', ''); if (x.lock) x.el.title = x.lock; });
  vids.forEach(function (x) { x.el.setAttribute(x.lock ? 'data-lha-lock' : 'data-lha-v', ''); if (x.lock) x.el.title = x.lock; });

  var host = null, on = null, onKind = '', onSec = null, typing = null;
  var info = function (kind, rec) {
    var o = orig.get(rec.el) || {};
    var out = { kind: kind, key: rec.key, was: rec.was || '', lock: rec.lock || '', link: !!rec.link,
      href: rec.el.getAttribute('href') || '', origHref: o.href || '', src: rec.el.getAttribute('src') || '',
      origSrc: o.src || '', alt: rec.el.getAttribute('alt') || '', tag: rec.el.tagName.toLowerCase() };
    if (rec.bg) { out.bg = true; out.src = bgUrl(rec.el); out.origSrc = o.bgUrl; }
    if (kind === 'v') { out.src = vidSrc(rec.el); out.origSrc = o.vsrc; out.poster = rec.el.getAttribute('poster') || ''; }
    /* a cover with a video behind it: both can be changed from one click */
    var pv = rec.bg ? partner(rec.el) : null;
    if (pv) { var pr = vids.filter(function (x) { return x.el === pv; })[0];
      if (pr) out.video = { key: pr.key, src: vidSrc(pv), origSrc: (orig.get(pv) || {}).vsrc }; }
    return out;
  };
  var recOf = function (el) {
    for (var i = 0; i < texts.length; i++) if (texts[i].el === el) return ['t', texts[i]];
    for (var j = 0; j < imgs.length; j++) if (imgs[j].el === el) return ['i', imgs[j]];
    for (var v = 0; v < vids.length; v++) if (vids[v].el === el) return ['v', vids[v]];
    return null;
  };
  function unselect() {
    if (on) {
      on.removeAttribute('data-lha-on');
      if (on.getAttribute('contenteditable')) { on.removeAttribute('contenteditable'); commitText(on); }
    }
    if (onSec) onSec.el.removeAttribute('data-lha-sec-on');
    on = null; onKind = ''; onSec = null;
  }
  function commitText(el) {
    var r = recOf(el); if (!r || r[0] !== 't') return;
    var html = clean(el.innerHTML), o = orig.get(el);
    host && host.change('t', r[1].key, html === clean(o.html) ? null : { html: html, was: r[1].was });
  }
  function select(el) {
    unselect();
    var r = recOf(el); if (!r) return;
    on = el; onKind = r[0];
    el.setAttribute('data-lha-on', '');
    var sec = secs.filter(function (s) { return s.el.contains(el); })[0];
    if (r[0] === 't' && !r[1].lock) {
      el.setAttribute('contenteditable', 'true');
      el.focus();
    }
    host && host.select(Object.assign(info(r[0], r[1]), { section: sec ? sec.key : '' }));
  }
  function selectSection(s) {
    unselect(); onSec = s; s.el.setAttribute('data-lha-sec-on', '');
    s.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    host && host.select({ kind: 's', key: s.key, name: s.name, hidden: s.el.hasAttribute('data-lha-hidden') });
  }

  /* nothing on the page does what it normally would: a click picks */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (on && on.contains(t) && on.getAttribute('contenteditable')) {
      if (t.closest('a,button')) e.preventDefault();
      return;
    }
    e.preventDefault(); e.stopPropagation();
    var el = t.closest('[data-lha-t],[data-lha-i],[data-lha-v],[data-lha-lock]');
    if (el && el.hasAttribute('data-lha-lock')) { unselect(); host && host.select({ kind: 'lock', lock: el.getAttribute('title') || 'Locked.' }); return; }
    if (el) { select(el); return; }
    var s = secs.filter(function (x) { return x.el.contains(t); })[0];
    if (s) selectSection(s); else { unselect(); host && host.select(null); }
  }, true);
  ['submit', 'dblclick'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); }, true); });
  document.addEventListener('input', function (e) {
    if (!on || !on.contains(e.target)) return;
    clearTimeout(typing); typing = setTimeout(function () { commitText(on); }, 500);
  }, true);
  document.addEventListener('keydown', function (e) {
    if (!on || !on.getAttribute('contenteditable')) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); var el = on; unselect(); host && host.select(null); return; }
    if (e.key === 'Escape') { e.preventDefault(); unselect(); host && host.select(null); }
  }, true);
  /* words, not someone else's formatting */
  document.addEventListener('paste', function (e) {
    if (!on || !on.getAttribute('contenteditable')) return;
    e.preventDefault();
    var txt = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, txt);
  }, true);

  /* what the editor next door can ask of the page */
  window.LHA_SITE = {
    page: PAGE,
    connect: function (h) { host = h; },
    apply: function (E) { var keep = on; apply(E); if (keep && document.contains(keep)) keep.setAttribute('data-lha-on', ''); },
    sections: function () { return secs.map(function (s) { return { key: s.key, name: s.name }; }); },
    keys: function () { return Object.keys(byKey); },
    was: function (key) { var r = texts.concat(imgs, vids).filter(function (x) { return x.key === key; })[0]; var o = r ? orig.get(r.el) || {} : {}; return r ? (r.was || o.src || o.bgUrl || o.vsrc || '') : ''; },
    format: function (cmd, arg) { if (on && on.getAttribute('contenteditable')) { on.focus(); document.execCommand(cmd, false, arg || null); commitText(on); } },
    done: function () { unselect(); },
    reset: function (key) { var el = byKey[key]; if (!el) return; var o = orig.get(el); if (o.html !== undefined) el.innerHTML = o.html; },
    pick: function (key) { var el = byKey[key]; if (!el) return; if (el.tagName === 'SECTION' || el.tagName === 'FOOTER' || el.tagName === 'HEADER') { var s = secs.filter(function (x) { return x.el === el; })[0]; if (s) selectSection(s); return; } el.scrollIntoView({ behavior: 'smooth', block: 'center' }); select(el); },
    clean: clean
  };
  try { window.parent.postMessage({ type: 'lha-site-ready', page: PAGE }, location.origin); } catch (e) {}
})();
