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
import programmes from './programmes.mjs';

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


/* ── password login ──────────────────────────────────────────
   Codes are the better mechanism and the routes above still work,
   but email delivery has to be trusted before a client depends on
   it. Passwords get people in today.

   PASSWORDS holds email:hash pairs — PBKDF2-SHA256, 100k rounds,
   salted with SIGNING_SECRET. The plain password is never stored
   anywhere on the server, so a leak of this variable doesn't hand
   anyone an account. Changing SIGNING_SECRET invalidates them all. */
async function pwHash(plain) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(plain),
    { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(process.env.SIGNING_SECRET || ''),
      iterations: 100000, hash: 'SHA-256' }, key, 256);
  return Buffer.from(bits).toString('base64');
}
/* PASSWORDS in the environment is the starting point; once someone changes
   theirs the new hash lives in the blob store and takes precedence. */
async function hashFor(db, email) {
  const stored = await db.get(`pw:${email}`, { type: 'json' });
  return (stored && stored.hash) || passwords()[email] || null;
}
const passwords = () => Object.fromEntries(
  (process.env.PASSWORDS || '').split(',').map(x => x.trim()).filter(Boolean)
    .map(x => { const i = x.indexOf(':'); return [norm(x.slice(0, i)), x.slice(i + 1)]; })
);

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
  /* a coach signs in with their own email and password like anyone else;
     the shared key still works so nothing breaks mid-change */
  const coachList = () => (process.env.COACH_EMAILS || process.env.COACH_EMAIL || '')
    .split(',').map(x => norm(x)).filter(Boolean);
  const isCoach = async () => {
    if (process.env.COACH_KEY && request.headers.get('x-coach-key') === process.env.COACH_KEY) return true;
    const who = await me();
    return !!who && coachList().includes(who);
  };
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


  /* ── POST /login  {email, password} → {token, client} ── */
  if (path === '/login' && request.method === 'POST') {
    const e = norm(body.email);
    const name = clients()[e];
    const stored = await hashFor(db, e);
    const bad = () => json({ error: 'Wrong email or password' }, 401);
    if (!e || !name || !stored || !body.password) return bad();

    /* slow the guessing down without keeping any per-user state */
    const rl = (await db.get(`pwrl:${e}`, { type: 'json' })) || { n: 0, at: 0 };
    const fresh = Date.now() - rl.at < 900000;
    if (fresh && rl.n >= 10) return json({ error: 'Too many attempts. Try again shortly.' }, 429);

    const got = await pwHash(String(body.password));
    if (got.length !== stored.length) return bad();
    let diff = 0;
    for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ stored.charCodeAt(i);
    if (diff) {
      await db.setJSON(`pwrl:${e}`, { n: fresh ? rl.n + 1 : 1, at: fresh ? rl.at : Date.now() });
      return bad();
    }
    await db.delete(`pwrl:${e}`);
    return json({ token: await sign({ scope: 'app', email: e, exp: Date.now() + TOKEN_TTL }),
                  client: name, coach: coachList().includes(e) });
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
  /* ── the client's own programme ──────────────────────────────────
     The app used to ship one client's plan baked into the HTML, so a
     second client signing in saw the first one's drills. The plan is
     chosen by the token, never by anything the caller sends. */
  if (path === '/programme' && request.method === 'GET') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const plan = programmes.clients[who];
    if (!plan) return json({ error: 'No programme yet' }, 404);
    return json({ client: clients()[who] || plan.client, plan,
                  library: programmes.library });
  }

  /* ── what a client is actually doing ─────────────────────────────
     Written by the app, read by the coach view. Kept as a rolling
     summary plus a capped event log — enough to see a pattern, not so
     much that it becomes a surveillance record of someone's training. */
  if (path === '/progress') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const k = `prog:${who}`;

    if (request.method === 'GET') {
      return json((await db.get(k, { type: 'json' })) || {});
    }
    if (request.method === 'POST') {
      const p = (await db.get(k, { type: 'json' })) || { opens: [], sessions: [], flags: {}, tests: [] };
      const now = Date.now();

      /* one "open" per day is all we need to see a habit */
      const today = new Date(now).toISOString().slice(0, 10);
      p.opens = (p.opens || []).filter(d => d !== today).concat([today]).slice(-180);
      p.lastSeen = now;

      if (body.session && body.session.day != null) {
        p.sessions = (p.sessions || []).concat([{
          day: body.session.day,
          name: String(body.session.name || '').slice(0, 60),
          done: !!body.session.done,
          drills: Number(body.session.drills) || 0,
          mins: Number(body.session.mins) || 0,          // as planned
          actual: Number(body.session.actual) || 0,      // as actually taken
          got: Number(body.session.got) || 0,            // steps completed
          of: Number(body.session.of) || 0,              // steps in the session
          at: now
        }]).slice(-200);
      }
      if (body.flags && typeof body.flags === 'object') {
        p.flags = {};
        for (const [drill, v] of Object.entries(body.flags).slice(0, 120)) {
          if (v && (v.rate === 'easy' || v.rate === 'hard')) {
            p.flags[String(drill).slice(0, 60)] = {
              rate: v.rate, note: String(v.note || '').slice(0, 300), at: now
            };
          }
        }
      }
      if (body.hold != null) {
        const h = Number(body.hold) || 0;
        if (h > 0) {
          p.holds = (p.holds || []).concat([{ s: h, at: now }]).slice(-100);
          if (h > (p.bestHold || 0)) { p.bestHold = h; p.bestHoldAt = now; }
        }
      }
      if (body.test && typeof body.test === 'object') {
        p.tests = (p.tests || []).concat([{ vals: body.test, at: now }]).slice(-12);
      }
      await db.setJSON(k, p);
      return json({ ok: true });
    }
  }

  /* ── change your own password ── */
  if (path === '/password' && request.method === 'POST') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);

    const current = String(body.current || '');
    const next = String(body.next || '');
    if (next.length < 8) return json({ error: 'New password must be at least 8 characters' }, 400);

    const stored = await hashFor(db, who);
    if (!stored || (await pwHash(current)) !== stored) {
      return json({ error: 'Current password is wrong' }, 401);
    }
    await db.setJSON(`pw:${who}`, { hash: await pwHash(next), at: Date.now() });

    /* tell Elliott, so a password changing is never a silent event */
    await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL,
      `${clients()[who] || who} changed their password`,
      `<p style="font:16px/1.6 system-ui">${clients()[who] || who} (${who}) just changed
       their app password. No action needed unless this is a surprise.</p>`);

    return json({ ok: true });
  }

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
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);

    if (path === '/coach/progress') {
      const e = norm(url.searchParams.get('email'));
      if (!e) return json({ error: 'Which client?' }, 400);
      return json({ email: e, name: clients()[e] || e,
                    progress: (await db.get(`prog:${e}`, { type: 'json' })) || {} });
    }

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
