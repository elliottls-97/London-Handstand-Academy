/* ══════════════════════════════════════════════════════════════
   London Handstand Academy — app API
   One Netlify function, routed by path. Sits alongside the
   existing /.netlify/functions/subscribe.

   Routes (netlify.toml maps /api/app/* onto this):
     POST /api/app/code            {email}        → emails a 6-digit code
     POST /api/app/verify          {email, code}  → {token, client}
     GET  /api/app/messages                       → the client's thread
     POST /api/app/messages        {text}         → adds to it, emails Elliott
     GET  /api/app/coach/clients                  → every client (coach key)
     GET  /api/app/coach/thread?email=            → one thread (coach key)
     POST /api/app/coach/thread?email= {text}     → reply (coach key)

   Environment (Site settings → Environment variables):
     SIGNING_SECRET   long random string — signs the tokens
     COACH_KEY        long random string — your own login
     RESEND_API_KEY   from resend.com
     FROM_EMAIL       "London Handstand Academy <hello@…>"
     COACH_EMAIL      where new-message alerts land
     CLIENTS          "hannah.mirman@gmail.com:Hannah,marina@x.com:Marina"
   ══════════════════════════════════════════════════════════════ */
import { getStore } from '@netlify/blobs';

const CODE_TTL = 15 * 60 * 1000;          // a code lasts 15 minutes
const TOKEN_TTL = 90 * 24 * 60 * 60 * 1000;
const store = () => getStore('lha-app');

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const norm = e => String(e || '').trim().toLowerCase();
const clients = () => Object.fromEntries(
  (process.env.CLIENTS || '').split(',').map(p => p.trim()).filter(Boolean)
    .map(p => { const i = p.lastIndexOf(':'); return [norm(p.slice(0, i)), p.slice(i + 1)]; })
);

/* ── HMAC tokens, no dependencies ── */
const b64url = buf => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(body) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(process.env.SIGNING_SECRET || ''),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
}
async function sign(payload) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${await hmac(body)}`;
}
async function verify(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = await hmac(body);
  if (mac.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff) return null;
  try {
    const p = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    return (!p.exp || Date.now() > p.exp) ? null : p;
  } catch { return null; }
}

async function email(to, subject, html) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.FROM_EMAIL, to, subject, html }),
    });
  } catch { /* never let a mail failure break the request */ }
}

export default async (request) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^.*\/api\/app/, '').replace(/^\/\.netlify\/functions\/app/, '') || '/';
  const db = store();
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};

  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const isCoach = () => !!process.env.COACH_KEY &&
    request.headers.get('x-coach-key') === process.env.COACH_KEY;
  const me = async () => {
    const p = await verify(bearer);
    return p && p.scope === 'app' ? p.email : null;
  };

  /* ── email a code ── */
  if (path === '/code' && request.method === 'POST') {
    const e = norm(body.email);
    if (!e) return json({ error: 'Email required' }, 400);
    const name = clients()[e];

    /* Always the same answer. Confirming whether an address is one of your
       clients would let anyone map your client list by typing addresses. */
    if (name) {
      const rl = (await db.get(`rl:${e}`, { type: 'json' })) || { n: 0, at: 0 };
      const fresh = Date.now() - rl.at < 3600000;
      if (!(fresh && rl.n >= 5)) {
        await db.setJSON(`rl:${e}`, { n: fresh ? rl.n + 1 : 1, at: fresh ? rl.at : Date.now() });
        const code = String(Math.floor(100000 + Math.random() * 900000));
        await db.setJSON(`code:${e}`, { code, tries: 0, exp: Date.now() + CODE_TTL });
        await email(e, `${code} is your London Handstand Academy code`,
          `<p style="font:16px/1.5 system-ui">Hi ${name},</p>
           <p style="font:16px/1.5 system-ui">Your code is</p>
           <p style="font:700 34px/1 system-ui;letter-spacing:6px">${code}</p>
           <p style="font:14px/1.5 system-ui;color:#666">It expires in 15 minutes.
           If you didn't ask for it, ignore this.</p>`);
      }
    }
    return json({ ok: true });
  }

  /* ── swap a code for a token ── */
  if (path === '/verify' && request.method === 'POST') {
    const e = norm(body.email);
    const name = clients()[e];
    const bad = () => json({ error: 'Wrong code' }, 401);
    if (!e || !name) return bad();

    const rec = await db.get(`code:${e}`, { type: 'json' });
    if (!rec || Date.now() > rec.exp || rec.tries >= 5) { await db.delete(`code:${e}`); return bad(); }
    if (String(body.code || '').trim() !== rec.code) {
      await db.setJSON(`code:${e}`, { ...rec, tries: rec.tries + 1 });
      return bad();
    }
    await db.delete(`code:${e}`);
    return json({ token: await sign({ scope: 'app', email: e, exp: Date.now() + TOKEN_TTL }), client: name });
  }

  /* ── the client's own thread ── */
  if (path === '/messages') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const k = `thread:${who}`;

    if (request.method === 'GET') {
      return json({ messages: (await db.get(k, { type: 'json' })) || [] });
    }
    if (request.method === 'POST') {
      const text = String(body.text || '').slice(0, 4000);
      if (!text) return json({ error: 'Nothing to send' }, 400);
      const thread = (await db.get(k, { type: 'json' })) || [];
      thread.push({ from: 'client', text, at: Date.now() });
      await db.setJSON(k, thread.slice(-200));

      const idx = (await db.get('index', { type: 'json' })) || {};
      idx[who] = { name: clients()[who] || who, last: Date.now(), unread: (idx[who]?.unread || 0) + 1 };
      await db.setJSON('index', idx);

      await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL,
        `${clients()[who] || who}: ${text.slice(0, 60)}`,
        `<p style="font:16px/1.6 system-ui">${text.slice(0, 2000)}</p>
         <p style="font:13px/1.5 system-ui;color:#666">Reply in the coach view.</p>`);
      return json({ ok: true });
    }
  }

  /* ── your side ── */
  if (path.startsWith('/coach/')) {
    if (!isCoach()) return json({ error: 'Nope' }, 401);

    if (path === '/coach/clients') {
      const idx = (await db.get('index', { type: 'json' })) || {};
      const rows = Object.entries(clients()).map(([e, name]) => ({
        email: e, name, last: idx[e]?.last || 0, unread: idx[e]?.unread || 0,
      })).sort((a, b) => b.last - a.last);
      return json({ clients: rows });
    }

    if (path === '/coach/thread') {
      const e = norm(url.searchParams.get('email'));
      if (!e) return json({ error: 'Which client?' }, 400);
      const k = `thread:${e}`;

      if (request.method === 'GET') {
        const idx = (await db.get('index', { type: 'json' })) || {};
        if (idx[e]) { idx[e].unread = 0; await db.setJSON('index', idx); }
        return json({ messages: (await db.get(k, { type: 'json' })) || [] });
      }
      if (request.method === 'POST') {
        const text = String(body.text || '').slice(0, 4000);
        if (!text) return json({ error: 'Nothing to send' }, 400);
        const thread = (await db.get(k, { type: 'json' })) || [];
        thread.push({ from: 'coach', text, at: Date.now() });
        await db.setJSON(k, thread.slice(-200));
        return json({ ok: true });
      }
    }
  }

  return json({ error: 'No such route' }, 404);
};

export const config = { path: '/api/app/*' };
