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

/* ── who coaches whom ─────────────────────────────────────────────
   CLIENTS is "email:Name" or "email:Name:coachEmail". The third field
   is optional and says who coaches them; without it they belong to the
   primary coach, so every entry written before this keeps working.

   COACHES is "email:Name" — the roster, and where a coach's display
   name comes from. COACH_EMAILS and COACH_EMAIL still grant access, so
   nothing has to be reconfigured for the site to keep running. */
const parseClients = () => (process.env.CLIENTS || '')
  .split(',').map(p => p.trim()).filter(Boolean)
  .map(p => {
    const bits = p.split(':').map(x => x.trim());
    const email = norm(bits[0]);
    const tail = bits.length > 2 ? norm(bits[bits.length - 1]) : '';
    const coach = tail.includes('@') ? tail : '';
    const name = bits.slice(1, coach ? bits.length - 1 : bits.length).join(':');
    return { email, name: name || email, coach };
  })
  .filter(c => c.email);

const clients = () => Object.fromEntries(parseClients().map(c => [c.email, c.name]));

const coaches = () => {
  const out = {};
  for (const p of (process.env.COACHES || '').split(',').map(x => x.trim()).filter(Boolean)) {
    const i = p.indexOf(':');
    if (i < 0) { out[norm(p)] = ''; continue; }
    out[norm(p.slice(0, i))] = p.slice(i + 1).trim();
  }
  for (const e of (process.env.COACH_EMAILS || process.env.COACH_EMAIL || '')
    .split(',').map(x => norm(x)).filter(Boolean)) if (!(e in out)) out[e] = '';
  return out;
};

const primaryCoach = () => Object.keys(coaches())[0] || norm(process.env.COACH_EMAIL || '');
const coachOf = e => {
  const c = parseClients().find(x => x.email === norm(e));
  return (c && c.coach) || primaryCoach();
};
const coachName = e => coaches()[norm(e)] || 'your coach';

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

/* ── Stripe, over plain fetch ────────────────────────────────────
   No SDK: a few form-encoded POSTs is less to install and less to
   go wrong inside a serverless function. */
const stripeKey = () => process.env.STRIPE_SECRET_KEY || '';
async function stripe(path, params, method = 'POST') {
  const res = await fetch('https://api.stripe.com/v1' + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + stripeKey(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params ? new URLSearchParams(params).toString() : undefined,
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((out.error && out.error.message) || 'Stripe error');
  return out;
}
/* Stripe signs the raw body; verify it ourselves rather than trusting
   a webhook that anyone could POST to. */
async function stripeSigOK(raw, header, secret) {
  if (!raw || !header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map(x => x.split('=')));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;   // replay window
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(parts.t + '.' + raw));
  const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('');
  if (hex.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

/* ── the thread ──────────────────────────────────────────────────
   Blobs is eventually consistent, so read-modify-write on a single key
   loses messages. A reply written a second after a client's message can
   read the thread from before that message landed and write it back
   without it — and it is gone for good. That is why a shared clip could
   vanish from the client's chat while the coach could still see it.

   So each message is written as its own blob, which cannot overwrite
   anything. The thread is the compacted history merged with whatever is
   still in the queue; compaction folds the queue in and only deletes a
   queue entry once it is safely part of what was just written. */
const MSG_CAP = 200;
const PROPAGATION = 15 * 1000;              // what Blobs takes to settle

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 12);

async function threadLoad(db, who, { compact = false } = {}) {
  const base = (await db.get(`thread:${who}`, { type: 'json' })) || [];
  /* deliberately not caught: if the queue cannot be listed then the recent
     messages are not in this answer, and returning the older thread anyway
     is exactly the silent loss this is here to prevent. Failing lets both
     front ends keep showing what they already have. */
  const { blobs } = await db.list({ prefix: `mq:${who}:` });
  const queued = (await Promise.all(
    blobs.map(b => db.get(b.key, { type: 'json' }).catch(() => null)))).filter(Boolean);

  const known = new Set(base.map(m => m && m.id).filter(Boolean));
  const all = base
    .concat(queued.filter(m => m.id && !known.has(m.id)))
    .sort((a, b) => (a.at || 0) - (b.at || 0))
    .slice(-MSG_CAP);

  if (compact && queued.length) {
    try {
      await db.setJSON(`thread:${who}`, all);
      const kept = new Set(all.map(m => m.id).filter(Boolean));
      /* leave anything recent alone — the write above has to propagate
         before the queue copy is safe to throw away */
      const cutoff = Date.now() - 8 * PROPAGATION;
      await Promise.all(queued.map(m =>
        (kept.has(m.id) && (m.at || 0) < cutoff)
          ? db.delete(`mq:${who}:${m.id}`).catch(() => {})
          : null));
    } catch { /* compaction is housekeeping, never needed for correctness */ }
  }
  return all;
}

async function threadAdd(db, who, msg) {
  const m = { id: newId(), at: Date.now(), ...msg };
  await db.setJSON(`mq:${who}:${m.id}`, m);   // its own key, so nothing is overwritten
  return m;
}

/* ── photos ──────────────────────────────────────────────────────
   Stream is video only. Photos are shrunk in the browser and kept in
   Blobs, so there is no second provider and no new credential. The id
   is random and unguessable — the same posture the drill videos have
   today, and it becomes signed at the same time they do. */
const IMG_MAX = 3 * 1024 * 1024;
const IMG_DATA = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

export default async (request) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^.*\/api\/app/, '').replace(/^\/\.netlify\/functions\/app/, '') || '/';
  const db = store();

  /* ── Stripe tells us what happened ─────────────────────────────
     Before the JSON parse below, because the signature covers the raw
     text and reading the body twice is not allowed. */
  if (path === '/stripe/webhook' && request.method === 'POST') {
    const raw = await request.text();
    const ok = await stripeSigOK(raw, request.headers.get('stripe-signature'),
      process.env.STRIPE_WEBHOOK_SECRET);
    if (!ok) return json({ error: 'Bad signature' }, 400);

    let ev = {};
    try { ev = JSON.parse(raw); } catch { return json({ error: 'Bad payload' }, 400); }
    const obj = (ev.data && ev.data.object) || {};
    const e = norm(obj.client_reference_id || (obj.customer_details && obj.customer_details.email)
      || obj.customer_email || '');

    /* find the account either by the address we sent, or by the Stripe
       customer we stored when they checked out */
    let key = e ? `acct:${e}` : null;
    if (!key && obj.customer) {
      const idx = (await db.get('stripeIdx', { type: 'json' })) || {};
      if (idx[obj.customer]) key = `acct:${idx[obj.customer]}`;
    }
    if (!key) return json({ ok: true, note: 'no account matched' });

    const acct = await db.get(key, { type: 'json' });
    /* writing {plus:true} into a key with no account behind it would create a
       stub with no password and lock the real person out */
    if (!acct) {
      await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL,
        'Stripe webhook could not find an account',
        `<p style="font:16px/1.6 system-ui">${ev.type} for ${e || obj.customer || 'unknown'}
         — no matching account, so nothing was changed.</p>`);
      return json({ ok: true, note: 'no account matched' });
    }
    const on  = ['checkout.session.completed', 'customer.subscription.created',
                 'customer.subscription.updated', 'invoice.paid'];
    const off = ['customer.subscription.deleted', 'customer.subscription.paused',
                 'invoice.payment_failed'];

    if (on.includes(ev.type)) {
      const status = obj.status || 'active';
      acct.plus = !['canceled', 'unpaid', 'incomplete_expired'].includes(status);
      /* the subscription id is what an in-app cancel needs */
      if (obj.subscription) acct.sub = obj.subscription;
      else if (ev.type.startsWith('customer.subscription') && obj.id) acct.sub = obj.id;
      if (obj.cancel_at_period_end != null) acct.cancelAt = obj.cancel_at_period_end
        ? (obj.current_period_end || 0) * 1000 : 0;
      if (obj.customer) {
        acct.stripeCustomer = obj.customer;
        const idx = (await db.get('stripeIdx', { type: 'json' })) || {};
        idx[obj.customer] = acct.email || e;
        await db.setJSON('stripeIdx', idx);
      }
    } else if (off.includes(ev.type)) {
      acct.plus = false;
    } else {
      return json({ ok: true, ignored: ev.type });
    }
    acct.plusAt = Date.now();
    await db.setJSON(key, acct);

    await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL,
      `${acct.plus ? 'New' : 'Cancelled'} £5 subscriber: ${acct.email || e}`,
      `<p style="font:16px/1.6 system-ui">${ev.type} — access is now
       ${acct.plus ? 'on' : 'off'}.</p>`);
    return json({ ok: true });
  }

  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};

  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  /* a coach signs in with their own email and password like anyone else;
     the shared key still works so nothing breaks mid-change */
  const coachList = () => Object.keys(coaches());
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
    /* two kinds of account now: coached clients configured by Elliott, and
       self-serve ones people create themselves */
    const acct = (await db.get(`acct:${e}`, { type: 'json' })) || null;
    const name = clients()[e] || (acct && (acct.name || e.split('@')[0])) || null;
    const stored = (await hashFor(db, e)) || (acct && acct.hash) || null;
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
                  client: name, coach: coachList().includes(e),
                  coached: !!clients()[e], plus: !!(acct && acct.plus) });
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
  /* ── create an account ───────────────────────────────────────────
     Self-serve, no coach involved. Marketing consent is separate and
     opt-in, which is what UK rules require. */
  if (path === '/signup' && request.method === 'POST') {
    const e = norm(body.email);
    if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      return json({ error: 'That does not look like an email address' }, 400);
    }
    const k = `acct:${e}`;
    const prev = (await db.get(k, { type: 'json' })) || {};

    /* a password is optional: the email gate after the quiz just wants
       the address, and an account can gain a password later */
    const pw = String(body.password || '');
    if (pw && pw.length < 8) {
      return json({ error: 'Password must be at least 8 characters' }, 400);
    }
    if (prev.hash && pw && (await pwHash(pw)) !== prev.hash) {
      return json({ error: 'An account already exists for that address' }, 409);
    }

    const acct = {
      email: e,
      name: String(body.name || prev.name || '').slice(0, 60),
      hash: pw ? await pwHash(pw) : (prev.hash || null),
      marketing: body.marketing === true ? true : !!prev.marketing,
      stage: Number(body.stage) || prev.stage || null,
      plus: !!prev.plus,
      stripeCustomer: prev.stripeCustomer || null,
      first: prev.first || Date.now(),
      last: Date.now(),
    };
    await db.setJSON(k, acct);

    if (!prev.first) {
      await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL,
        `New app sign-up: ${e}`,
        `<p style="font:16px/1.6 system-ui">${e} started the Handstand Ladder.
         Marketing consent: ${acct.marketing ? 'yes' : 'no'}.</p>`);
    }
    return json({
      ok: true,
      plus: acct.plus,
      token: acct.hash ? await sign({ scope: 'app', email: e, exp: Date.now() + TOKEN_TTL }) : null,
    });
  }

  /* ── forgotten password ──────────────────────────────────────────
     A six digit code by email. The response never says whether the
     address exists, so this cannot be used to find out who has an
     account. */
  if (path === '/reset/request' && request.method === 'POST') {
    const e = norm(body.email);
    const ok = json({ ok: true });                 // same answer either way
    if (!e) return ok;

    const acct = await db.get(`acct:${e}`, { type: 'json' });
    const isClient = !!clients()[e];
    if (!acct && !isClient) return ok;

    /* slow down anyone working through a list of addresses */
    const rl = (await db.get(`rsrl:${e}`, { type: 'json' })) || { n: 0, at: 0 };
    const fresh = Date.now() - rl.at < 3600000;
    if (fresh && rl.n >= 5) return ok;
    await db.setJSON(`rsrl:${e}`, { n: fresh ? rl.n + 1 : 1, at: fresh ? rl.at : Date.now() });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await db.setJSON(`reset:${e}`, { code, exp: Date.now() + 15 * 60 * 1000, tries: 0 });
    await email(e, 'Your London Handstand Academy reset code',
      `<p style="font:16px/1.6 system-ui">Your code is
       <b style="font-size:22px;letter-spacing:3px">${code}</b></p>
       <p style="font:14px/1.6 system-ui;color:#666">It works for 15 minutes.
       If you did not ask for this, ignore it — nothing has changed.</p>`);
    return ok;
  }

  if (path === '/reset/confirm' && request.method === 'POST') {
    const e = norm(body.email);
    const code = String(body.code || '').trim();
    const pw = String(body.password || '');
    if (pw.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);

    const rec = await db.get(`reset:${e}`, { type: 'json' });
    const bad = () => json({ error: 'That code is wrong or has expired' }, 400);
    if (!rec || Date.now() > rec.exp) return bad();
    if (rec.tries >= 5) return bad();
    if (code !== rec.code) {
      await db.setJSON(`reset:${e}`, { ...rec, tries: rec.tries + 1 });
      return bad();
    }
    await db.delete(`reset:${e}`);

    const hash = await pwHash(pw);
    const acct = await db.get(`acct:${e}`, { type: 'json' });
    if (acct) { acct.hash = hash; await db.setJSON(`acct:${e}`, acct); }
    /* coached clients keep their password in the override store */
    await db.setJSON(`pw:${e}`, { hash, at: Date.now() });
    await db.delete(`pwrl:${e}`);

    await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL,
      `${e} reset their password`,
      '<p style="font:16px/1.6 system-ui">Via the forgotten-password flow.</p>');
    return json({ ok: true,
      token: await sign({ scope: 'app', email: e, exp: Date.now() + TOKEN_TTL }) });
  }

  /* ── who am I, and what have I paid for ── */
  if (path === '/me') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const acct = (await db.get(`acct:${who}`, { type: 'json' })) || {};
    return json({
      email: who,
      name: clients()[who] || acct.name || '',
      coached: !!clients()[who],
      coach: coachList().includes(who),
      coachName: clients()[who] ? coachName(coachOf(who)) : '',
      plus: !!acct.plus,
      canManage: !!acct.stripeCustomer,
      canCancel: !!(acct.sub || acct.stripeCustomer),
      cancelAt: acct.cancelAt || 0,
      /* the one free form check. Its own key, because nothing else writes
         it — folding it into acct would put it in the path of every other
         account write. */
      freeCheckUsed: !!(await db.get(`fc:${who}`, { type: 'json' })),
    });
  }

  /* ── start a checkout ─────────────────────────────────────────────
     A Checkout Session rather than a payment link, because a link
     cannot tell us which account paid. */
  if (path === '/checkout' && request.method === 'POST') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    if (!stripeKey() || !process.env.STRIPE_PRICE_PLUS) {
      return json({ error: 'Payments are not switched on yet' }, 503);
    }
    const origin = url.origin;
    try {
      const sess = await stripe('/checkout/sessions', {
        mode: 'subscription',
        'line_items[0][price]': process.env.STRIPE_PRICE_PLUS,
        'line_items[0][quantity]': '1',
        customer_email: who,
        client_reference_id: who,
        allow_promotion_codes: 'true',
        success_url: `${origin}/lha-app.html?paid=1`,
        cancel_url: `${origin}/lha-app.html?paid=0`,
      });
      return json({ url: sess.url });
    } catch (err) {
      return json({ error: String(err.message || err) }, 502);
    }
  }

  /* ── the real state of a subscription ────────────────────────────
     Read live from Stripe rather than from whatever a webhook last told
     us. Only called when the account screen opens, so the extra call is
     cheap and the dates are never stale. */
  if (path === '/subscription' && request.method === 'GET') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const acct = (await db.get(`acct:${who}`, { type: 'json' })) || {};
    if (!acct.stripeCustomer && !acct.sub) return json({ none: true });
    if (!stripeKey()) return json({ none: true });

    try {
      let sub = null;
      if (acct.sub) {
        sub = await stripe(`/subscriptions/${acct.sub}`, null, 'GET');
      } else {
        const list = await stripe(
          `/subscriptions?customer=${encodeURIComponent(acct.stripeCustomer)}&status=all&limit=10`,
          null, 'GET');
        sub = (list.data || []).find(x =>
          ['active', 'trialing', 'past_due', 'unpaid'].includes(x.status)) || (list.data || [])[0] || null;
      }
      if (!sub) return json({ none: true });

      /* keep what we learned, so cancel does not have to look it up again */
      const before = JSON.stringify([acct.sub, acct.cancelAt, acct.plus]);
      acct.sub = sub.id;
      acct.cancelAt = sub.cancel_at_period_end ? (sub.current_period_end || 0) * 1000 : 0;
      acct.plus = ['active', 'trialing', 'past_due'].includes(sub.status);
      if (JSON.stringify([acct.sub, acct.cancelAt, acct.plus]) !== before) {
        await db.setJSON(`acct:${who}`, acct);
      }

      const item = (sub.items && sub.items.data && sub.items.data[0]) || {};
      const price = item.price || {};
      return json({
        status: sub.status,
        renewsAt: (sub.current_period_end || 0) * 1000,
        cancelAt: acct.cancelAt,
        willCancel: !!sub.cancel_at_period_end,
        amount: price.unit_amount != null ? price.unit_amount / 100 : null,
        currency: (price.currency || 'gbp').toUpperCase(),
        interval: (price.recurring && price.recurring.interval) || 'month',
        plus: acct.plus,
      });
    } catch (err) {
      return json({ error: String(err.message || err) }, 502);
    }
  }

  /* ── cancel, without leaving the app ─────────────────────────────
     Stops the renewal but leaves access until the end of the month they
     have already paid for, which is the fair reading and what the terms
     will say. */
  if (path === '/cancel' && request.method === 'POST') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const acct = (await db.get(`acct:${who}`, { type: 'json' })) || {};

    /* the id is normally captured from the webhook, but a missed or
       mis-routed event should not leave someone unable to cancel — ask
       Stripe which subscription this customer has */
    if (!acct.sub && acct.stripeCustomer) {
      try {
        const list = await stripe(
          `/subscriptions?customer=${encodeURIComponent(acct.stripeCustomer)}&status=all&limit=10`,
          null, 'GET');
        const live = (list.data || []).find(x =>
          ['active', 'trialing', 'past_due', 'unpaid'].includes(x.status));
        if (live) {
          acct.sub = live.id;
          acct.cancelAt = live.cancel_at_period_end ? (live.current_period_end || 0) * 1000 : 0;
          await db.setJSON(`acct:${who}`, acct);
        }
      } catch { /* fall through to the error below */ }
    }
    if (!acct.sub) return json({ error: 'No subscription to cancel' }, 400);
    try {
      const sub = body.undo
        ? await stripe(`/subscriptions/${acct.sub}`, { cancel_at_period_end: 'false' })
        : await stripe(`/subscriptions/${acct.sub}`, { cancel_at_period_end: 'true' });
      acct.cancelAt = sub.cancel_at_period_end ? (sub.current_period_end || 0) * 1000 : 0;
      await db.setJSON(`acct:${who}`, acct);
      await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL,
        `${who} ${body.undo ? 'resumed' : 'cancelled'} their £5 subscription`,
        `<p style="font:16px/1.6 system-ui">${body.undo
          ? 'They turned the renewal back on.'
          : 'It stops renewing. Access runs to the end of the paid month.'}</p>`);
      return json({ ok: true, cancelAt: acct.cancelAt });
    } catch (err) {
      return json({ error: String(err.message || err) }, 502);
    }
  }

  /* ── manage or cancel ─────────────────────────────────────────────
     Stripe hosts this. Cancelling has to be easy, and this is both the
     simplest and the compliant way to do it. */
  if (path === '/portal' && request.method === 'POST') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const acct = (await db.get(`acct:${who}`, { type: 'json' })) || {};
    if (!acct.stripeCustomer) return json({ error: 'No subscription to manage' }, 400);
    try {
      const sess = await stripe('/billing_portal/sessions', {
        customer: acct.stripeCustomer,
        return_url: `${url.origin}/lha-app.html`,
      });
      return json({ url: sess.url });
    } catch (err) {
      return json({ error: String(err.message || err) }, 502);
    }
  }

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

  /* ── a one-time link to upload a clip ────────────────────────────
     The file goes from the phone straight to Cloudflare. It never passes
     through this function, which could not carry a 60MB video anyway. */
  if (path === '/upload' && request.method === 'POST') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    if (!process.env.CF_ACCOUNT || !process.env.CF_STREAM_TOKEN) {
      return json({ error: 'Video upload is not switched on yet' }, 503);
    }
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT}/stream/direct_upload`,
        { method: 'POST',
          headers: { Authorization: `Bearer ${process.env.CF_STREAM_TOKEN}`,
                     'Content-Type': 'application/json' },
          body: JSON.stringify({
            maxDurationSeconds: 180,          // a form check, not a documentary
            expiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            creator: who,                     // so it can be found and deleted later
            meta: { name: `${who} · ${new Date().toISOString().slice(0, 10)}`,
                    uploadedBy: who, kind: 'form-check' },
          }) });
      const d = await res.json();
      if (!d.success) return json({ error: (d.errors && d.errors[0] && d.errors[0].message) || 'Stream said no' }, 502);
      return json({ uploadURL: d.result.uploadURL, uid: d.result.uid });
    } catch (err) {
      return json({ error: String(err.message || err) }, 502);
    }
  }

  /* ── a photo ─────────────────────────────────────────────────────
     Small enough to come through the function, unlike a video. The
     browser shrinks it first; this is the backstop. */
  if (path === '/image' && request.method === 'POST') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const m = IMG_DATA.exec(String(body.data || ''));
    if (!m) return json({ error: 'That is not a JPEG, PNG or WebP' }, 400);
    let buf;
    try { buf = Buffer.from(m[2], 'base64'); }
    catch { return json({ error: 'Could not read that photo' }, 400); }
    if (!buf.length) return json({ error: 'That photo is empty' }, 400);
    if (buf.length > IMG_MAX) return json({ error: 'That photo is too large' }, 413);
    const id = newId() + Math.random().toString(36).slice(2, 12);
    await db.set(`img:${id}`, buf,
      { metadata: { type: m[1], owner: who, at: Date.now() } });
    return json({ id });
  }

  if (path.startsWith('/image/') && request.method === 'GET') {
    const id = path.slice(7).replace(/[^a-zA-Z0-9]/g, '');
    if (!id) return json({ error: 'Which photo?' }, 400);
    const got = await db.getWithMetadata(`img:${id}`, { type: 'arrayBuffer' })
      .catch(() => null);
    if (!got || !got.data) return json({ error: 'No such photo' }, 404);
    return new Response(got.data, {
      headers: {
        'Content-Type': (got.metadata && got.metadata.type) || 'image/jpeg',
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
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
          stoppedAt: String(body.session.stoppedAt || '').slice(0, 60),
          block: String(body.session.block || '').slice(0, 40),
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
      /* anything the client tells Elliott — why they stopped, a question,
         a flag — kept alongside the numbers so the dashboard is one place */
      if (body.feedback && typeof body.feedback === 'object') {
        p.feedback = (p.feedback || []).concat([{
          kind: String(body.feedback.kind || 'note').slice(0, 40),
          reasons: Array.isArray(body.feedback.reasons)
            ? body.feedback.reasons.slice(0, 12).map(r => String(r).slice(0, 60)) : [],
          text: String(body.feedback.text || '').slice(0, 1000),
          context: String(body.feedback.context || '').slice(0, 120),
          at: now
        }]).slice(-60);
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
    if (request.method === 'GET') {
      return json({ messages: await threadLoad(db, who, { compact: true }) });
    }
    if (request.method === 'POST') {
      const text = String(body.text || '').slice(0, 4000);
      const video = String(body.video || '').slice(0, 64).replace(/[^a-zA-Z0-9]/g, '');
      const image = String(body.image || '').slice(0, 64).replace(/[^a-zA-Z0-9]/g, '');
      if (!text && !video && !image) return json({ error: 'Nothing to send' }, 400);

      /* Anyone signed in may ask a question — that is the way in to
         coaching. Footage is the thing that costs time to review, so a
         free account gets exactly one, and coaching gets the rest. */
      const coached = !!clients()[who];
      if ((video || image) && !coached) {
        if (await db.get(`fc:${who}`, { type: 'json' })) {
          return json({ error: 'Your free form check has already been used. '
            + 'Form checks come with coaching.', gated: true }, 402);
        }
        await db.setJSON(`fc:${who}`, { at: Date.now(), video: video || null, image: image || null });
      }

      await threadAdd(db, who, { from: 'client', text,
        ...(video ? { video } : {}), ...(image ? { image } : {}) });

      const acct = (await db.get(`acct:${who}`, { type: 'json' })) || {};
      const idx = (await db.get('index', { type: 'json' })) || {};
      idx[who] = { name: clients()[who] || acct.name || who, coached,
                   last: Date.now(), unread: (idx[who]?.unread || 0) + 1 };
      await db.setJSON('index', idx);

      const kind = video ? 'sent a video' : image ? 'sent a photo' : '';
      await email(coachOf(who) || process.env.COACH_EMAIL || process.env.FROM_EMAIL,
        `${clients()[who] || who}: ${text.slice(0, 60) || kind}`,
        `<p style="font:16px/1.6 system-ui">${text.slice(0, 2000) || `They have ${kind}.`}</p>
         <p style="font:13px/1.5 system-ui;color:#666">Reply in the coach view.</p>`);
      return json({ ok: true });
    }
  }

  /* ── your side ── */
  if (path.startsWith('/coach/')) {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);

    /* Who is asking. Null means the legacy shared key, which has no
       identity and therefore still sees everything.

       A coach sees their own clients. Enquiries from free accounts are
       nobody's yet, so every coach sees them — an unrouted question going
       unanswered is worse than one being seen twice. */
    const asking = await me();
    const owns = e => !asking || !clients()[norm(e)] || coachOf(e) === asking;

    /* wipe a client's activity record — needed for a deletion request,
       and for clearing test data out of a real client's history */
    if (path === '/coach/progress/reset' && request.method === 'POST') {
      const e = norm(body.email);
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      await db.delete(`prog:${e}`);
      return json({ ok: true, cleared: e });
    }

    /* the coach's own notes on a client — never shown in the client app */
    if (path === '/coach/notes') {
      const e = norm(url.searchParams.get('email') || body.email);
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      const k = `note:${e}`;
      if (request.method === 'GET') {
        return json((await db.get(k, { type: 'json' })) || { text: '', at: 0 });
      }
      if (request.method === 'POST') {
        const text = String(body.text || '').slice(0, 8000);
        await db.setJSON(k, { text, at: Date.now() });
        return json({ ok: true, at: Date.now() });
      }
    }

    if (path === '/coach/progress') {
      const e = norm(url.searchParams.get('email'));
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      return json({ email: e, name: clients()[e] || e,
                    progress: (await db.get(`prog:${e}`, { type: 'json' })) || {} });
    }

    /* which Stripe settings actually reached this deploy — booleans only,
       never the values. Answers "is the secret set in this context" without
       anyone having to read a key out of a dashboard. */
    if (path === '/coach/stripe-status') {
      const k = process.env.STRIPE_SECRET_KEY || '';
      return json({
        secretKey: k ? (k.startsWith('rk_') ? 'restricted' : 'standard') + ' · ' +
          (k.includes('_test_') ? 'TEST' : 'LIVE') : 'missing',
        priceId: process.env.STRIPE_PRICE_PLUS ? 'set' : 'missing',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'set' : 'missing',
        context: process.env.CONTEXT || 'unknown',
        branch: process.env.BRANCH || 'unknown',
      });
    }

    /* switch access on or off by hand — for a webhook that failed, or to
       comp someone. Everything it does is logged on the account. */
    /* set someone's password directly — for when they cannot receive the
       email, or have locked themselves out mid-change */
    if (path === '/coach/setpw' && request.method === 'POST') {
      const e = norm(body.email);
      const pw = String(body.password || '');
      if (!e || pw.length < 8) return json({ error: 'Need an email and 8+ characters' }, 400);
      const hash = await pwHash(pw);
      const acct = await db.get(`acct:${e}`, { type: 'json' });
      if (acct) { acct.hash = hash; await db.setJSON(`acct:${e}`, acct); }
      await db.setJSON(`pw:${e}`, { hash, at: Date.now() });
      await db.delete(`pwrl:${e}`);
      return json({ ok: true, email: e, hadAccount: !!acct });
    }

    if (path === '/coach/grant' && request.method === 'POST') {
      const e = norm(body.email);
      if (!e) return json({ error: 'Which account?' }, 400);
      const k = `acct:${e}`;
      const acct = await db.get(k, { type: 'json' });
      if (!acct) return json({ error: 'No account with that address' }, 404);
      acct.plus = body.plus !== false;
      acct.plusAt = Date.now();
      acct.grantedByCoach = true;
      await db.setJSON(k, acct);
      return json({ ok: true, email: e, plus: acct.plus });
    }

    if (path === '/coach/leads') {
      const out = [];
      const listing = await db.list({ prefix: 'acct:' });
      for (const b of (listing.blobs || [])) {
        const v = await db.get(b.key, { type: 'json' });
        if (v) out.push(v);
      }
      out.sort((a, b) => (b.last || 0) - (a.last || 0));
      return json({ leads: out });
    }

    if (path === '/coach/clients') {
      const idx = (await db.get('index', { type: 'json' })) || {};
      /* CLIENTS alone was not enough: a free account can now send a form
         check and ask about coaching, and one that never appeared here
         would be a question nobody answered. */
      const rows = new Map();
      for (const [e, name] of Object.entries(clients())) {
        if (!owns(e)) continue;
        rows.set(e, { email: e, name, coached: true, coach: coachOf(e),
          last: idx[e]?.last || 0, unread: idx[e]?.unread || 0 });
      }
      for (const [e, v] of Object.entries(idx)) {
        if (rows.has(e)) continue;
        rows.set(e, { email: e, name: (v && v.name) || e, coached: false,
          last: (v && v.last) || 0, unread: (v && v.unread) || 0 });
      }
      return json({ clients: [...rows.values()].sort((a, b) => b.last - a.last) });
    }

    /* remove a clip from Stream — for a deletion request, or when a form
       check has served its purpose */
    if (path === '/coach/video/delete' && request.method === 'POST') {
      const uid = String(body.uid || '').replace(/[^a-zA-Z0-9]/g, '');
      if (!uid) return json({ error: 'Which video?' }, 400);
      if (!process.env.CF_ACCOUNT || !process.env.CF_STREAM_TOKEN) {
        return json({ error: 'Video is not switched on' }, 503);
      }
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT}/stream/${uid}`,
        { method: 'DELETE',
          headers: { Authorization: `Bearer ${process.env.CF_STREAM_TOKEN}` } });
      return json({ ok: res.ok });
    }

    if (path === '/coach/thread') {
      const e = norm(url.searchParams.get('email'));
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      if (request.method === 'GET') {
        const idx = (await db.get('index', { type: 'json' })) || {};
        if (idx[e]) { idx[e].unread = 0; await db.setJSON('index', idx); }
        return json({ messages: await threadLoad(db, e, { compact: true }) });
      }
      if (request.method === 'POST') {
        const text = String(body.text || '').slice(0, 4000);
        const video = String(body.video || '').slice(0, 64).replace(/[^a-zA-Z0-9]/g, '');
        const image = String(body.image || '').slice(0, 64).replace(/[^a-zA-Z0-9]/g, '');
        if (!text && !video && !image) return json({ error: 'Nothing to send' }, 400);
        await threadAdd(db, e, { from: 'coach', by: asking || primaryCoach(), text,
          ...(video ? { video } : {}), ...(image ? { image } : {}) });

        /* a reply is the thing clients are waiting for, so say so */
        const who2 = coachName(asking || coachOf(e));
        const sent = video ? `${who2} has sent you a video.`
          : image ? `${who2} has sent you a photo.` : `${who2} has replied.`;
        await email(e, `${who2} has replied`,
          `<p style="font:16px/1.6 system-ui">${text ? text.slice(0, 500) : sent}</p>
           <p style="font:14px/1.6 system-ui;color:#666">Open the app to see it.</p>`);
        return json({ ok: true });
      }
    }
  }

  return json({ error: 'No such route' }, 404);
};

export const config = { path: '/api/app/*' };
