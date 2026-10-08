/* ── the page's title, description and sharing image, as it is sent ─────
   Set in the website editor's Page settings. WhatsApp, Instagram and
   Facebook read a link's preview straight from the page as it arrives and
   never run its scripts, so the editor's own layer (site-edits.js) is too
   late for them. This puts the settings into the page on the way out.

   The class page's title names its next dates, from the workshops written
   in the dashboard (a live one with All Levels in its title), unless a
   title has been written for it.

   Anything that goes wrong sends the page exactly as it is: this must never
   be the reason the website does not load. */

const PAGES = { '/': 'home', '/index.html': 'home', '/handstand-class': 'handstand-class', '/handstand-class.html': 'handstand-class' };
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const attr = t => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/* a moment, as London sees it */
const london = ts => {
  const g = {};
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(ts)).forEach(x => { g[x.type] = x.value; });
  return g;
};
const parts = d => { const p = d.split('-'), t = new Date(Date.UTC(+p[0], p[1] - 1, +p[2], 12)); return { dow: DAY[t.getUTCDay()], dd: +p[2], m: MON[p[1] - 1] }; };

function classTitle(list) {
  const up = (list || []).filter(w => w && w.when && /all levels/i.test(w.title || ''))
    .map(w => Date.parse(w.when)).filter(t => t && t + 90 * 60000 > Date.now()).sort((x, y) => x - y)
    .map(t => { const g = london(t); return parts(g.year + '-' + g.month + '-' + g.day); });
  if (!up.length) return '';
  const a = up[0], b = up[1] || null;
  const when = a.dow.slice(0, 3) + ' ' + a.dd + (b ? (b.m === a.m ? ' and ' + b.dd + ' ' + a.m : ' ' + a.m + ' and ' + b.dd + ' ' + b.m) : ' ' + a.m);
  return 'All Levels Handstand Class · ' + when + ' · OverGravity, London';
}

function setMeta(html, re, tag) {
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', tag + '\n</head>');
}

export default async (request, context) => {
  const url = new URL(request.url);
  const page = PAGES[url.pathname];
  if (!page || request.method !== 'GET' || url.searchParams.has('siteedit')) return context.next();
  let E = null, W = [], setmore = false;
  /* Each on its own clock. They shared one abort and one Promise.all, so a
     slow workshop list cost the page its edits and, worse, the Setmore
     switch: the page went out as the site's own whatever the dashboard said. */
  const get = (path, ms) => {
    const ctl = new AbortController(), stop = setTimeout(() => ctl.abort(), ms);
    return fetch(new URL(path, url.origin), { signal: ctl.signal }).then(r => r.ok ? r.json() : null)
      .catch(() => null).finally(() => clearTimeout(stop));
  };
  try {
    const [s, w, c] = await Promise.all([
      get('/api/app/site?page=' + page, 1200),
      page === 'handstand-class' ? get('/api/app/workshops', 1500) : null,
      /* the dashboard's switch: the site's own booking, or the old Setmore page */
      page === 'handstand-class' ? get('/api/app/classpage', 1500) : null]);
    E = (s && s.e) || null;
    W = (w && w.workshops) || [];
    setmore = !!(c && c.booking === 'setmore');
  } catch { /* the page as it is */ }
  const m = (E && E.m) || {};
  const title = m.title || (page === 'handstand-class' && !setmore ? classTitle(W) : '');
  const desc = m.desc || '';
  const img = m.img ? new URL(m.img, url.origin).href : '';
  if (!title && !desc && !img && !setmore) return context.next();

  /* the Setmore page stands in for the new one, at the same address */
  const res = setmore ? await fetch(new URL('/handstand-class-setmore.html', url.origin)).catch(() => null) || await context.next()
                      : await context.next();
  if (res.status !== 200 || !(res.headers.get('content-type') || '').includes('text/html')) return res;
  let html = await res.text();
  try {
    if (title) {
      html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + attr(title) + '</title>');
      html = setMeta(html, /<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${attr(title)}"/>`);
      html = setMeta(html, /<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${attr(title)}">`);
    }
    if (desc) {
      html = setMeta(html, /<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${attr(desc)}"/>`);
      html = setMeta(html, /<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${attr(desc)}"/>`);
      html = setMeta(html, /<meta\s+name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${attr(desc)}">`);
    }
    if (img) {
      html = setMeta(html, /<meta\s+property="og:image"[^>]*>/i, `<meta property="og:image" content="${attr(img)}">`);
      html = setMeta(html, /<meta\s+name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${attr(img)}">`);
    }
  } catch { /* the page as it came */ }
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  return new Response(html, { status: res.status, headers });
};

export const config = { path: ['/', '/index.html', '/handstand-class', '/handstand-class.html'] };
