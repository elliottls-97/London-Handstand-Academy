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
import * as supa from './supa.mjs';

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
   theirs the new hash lives on their account row and takes precedence. */
async function hashFor(db, email) {
  const acct = await getAcct(email);
  return (acct && acct.hash) || passwords()[email] || null;
}
const passwords = () => Object.fromEntries(
  (process.env.PASSWORDS || '').split(',').map(x => x.trim()).filter(Boolean)
    .map(x => { const i = x.indexOf(':'); return [norm(x.slice(0, i)), x.slice(i + 1)]; })
);

/* ── what an email looks like ────────────────────────────────────
   Tables and inline styles, because mail clients are two decades behind
   browsers and Outlook still renders HTML through Word. No images and no
   web fonts either: images are blocked by default in most clients and a
   missing font is worse than never asking for one.

   Everything here is transactional — a reply, a code, a status. None of
   it is marketing, so none of it carries an unsubscribe. */
const SITE = 'https://londonhandstandacademy.com';
const esc = t => String(t == null ? '' : t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function mail({ title, greeting, paras = [], box, cta, signoff, footnote }) {
  const F = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const p = t => `<p style="margin:0 0 16px;font:400 16px/1.62 ${F};color:#2c3229">${t}</p>`;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f2efe7">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(
  paras[0] ? String(paras[0]).replace(/<[^>]+>/g, '').slice(0, 110) : title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="background:#f2efe7;padding:28px 14px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="max-width:560px;background:#ffffff;border-radius:18px;
    border:1px solid #e3e0d6">
    <tr><td style="padding:30px 32px 0;text-align:center">
      <div style="font:700 11px/1 ${F};letter-spacing:.19em;color:#2f3d2f;
        text-transform:uppercase">London Handstand Academy</div>
      <div style="height:1px;background:#e8e5db;margin:24px 0 0"></div>
    </td></tr>
    <tr><td style="padding:30px 32px 8px">
      <h1 style="margin:0 0 18px;font:700 27px/1.22 ${F};color:#1c2019;
        letter-spacing:-.015em">${esc(title)}</h1>
      ${greeting ? p(`Hi ${esc(greeting)},`) : ''}
      ${paras.map(p).join('')}
      ${box ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="background:#f4f6f2;border-radius:12px;margin:6px 0 20px">
        <tr><td style="padding:19px 22px">
          ${box.title ? `<div style="font:700 15px/1.3 ${F};color:#1c2019;
            margin:0 0 12px">${esc(box.title)}</div>` : ''}
          ${box.items.map((it, i) => `<div style="font:400 15px/1.55 ${F};
            color:#3d443a;margin:0 0 ${i === box.items.length - 1 ? '0' : '11px'}">
            ${box.numbered ? `<b style="color:#2f3d2f">${i + 1}.</b> ` : ''}${esc(it)}</div>`).join('')}
        </td></tr></table>` : ''}
      ${cta ? `<table role="presentation" cellpadding="0" cellspacing="0"
        style="margin:4px 0 22px"><tr><td style="border-radius:999px;background:#2f3d2f">
        <a href="${esc(cta.href)}" style="display:inline-block;padding:14px 30px;
          font:600 15px/1 ${F};color:#ffffff;text-decoration:none">${esc(cta.label)}</a>
      </td></tr></table>` : ''}
      ${signoff ? p(`${esc(signoff.line || 'Talk soon,')}<br>${esc(signoff.name)}`) : ''}
    </td></tr>
    <tr><td style="padding:6px 32px 28px">
      <div style="height:1px;background:#e8e5db;margin:0 0 16px"></div>
      <div style="font:400 12.5px/1.6 ${F};color:#8a8d80">
        ${footnote ? esc(footnote) + '<br>' : ''}
        <a href="${SITE}" style="color:#8a8d80">londonhandstandacademy.com</a>
        &nbsp;·&nbsp; <a href="mailto:info@londonhandstandacademy.com"
          style="color:#8a8d80">info@londonhandstandacademy.com</a>
      </div>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

/* ── who may be emailed ──────────────────────────────────────────
   While the app is being tested against real client records, a test run
   must not land in a real client's inbox. Two env vars, both optional
   and both off by default:

     EMAIL_ONLY   if set, mail goes to these addresses and nobody else.
                  The safe one during testing — it fails closed, so an
                  address nobody thought about is silent rather than sent.
     EMAIL_BLOCK  never mail these, whatever else is set.

   Addresses live in Netlify, not in this file: the repo is public. */
const mailList = v => (process.env[v] || '').split(',')
  .map(x => String(x).trim().toLowerCase()).filter(Boolean);

function mayEmail(to) {
  const t = String(to || '').trim().toLowerCase();
  if (!t) return false;
  if (mailList('EMAIL_BLOCK').includes(t)) return false;
  const only = mailList('EMAIL_ONLY');
  if (only.length && !only.includes(t)) return false;
  return true;
}

/* The switch that actually gets used. Env vars need a redeploy to take
   effect, which is no good for something you flip while testing — so this
   lives in Blobs and the coach view toggles it in one click.

   It only ever affects real coaching clients. Everyone else — you, a
   tester, someone who sent a form check — is mailed normally either way.

   Default is SUPPRESSED: if the switch has never been set, or cannot be
   read, a real client is not mailed. Being silent is recoverable; sending
   a test email to a paying client is not. */
async function clientMailAllowed(to) {
  const t = norm(to);
  try {
    /* a per-person setting beats the global one in both directions, so a
       single client can be silenced while the rest carry on, or allowed
       through while everyone else is held */
    const off = (await getSetting('mailoff')) || {};
    if (off[t] === true) return false;
    if (off[t] === false) return true;
    if (!clients()[t]) return true;
    const g = await getSetting('mailguard');
    return g ? !g.suppress : false;
  } catch { return false; }
}

/* What someone has chosen to hear about. An email with no kind is one you
   cannot opt out of — a password reset, a receipt, confirmation that
   something they sent arrived. Everything else is theirs to turn off. */
async function wantsEmail(to, kind) {
  if (!kind) return true;
  try {
    const p = await getSetting(`prefs:${norm(to)}`);
    return !p || p[kind] !== false;
  } catch { return true; }
}

async function email(to, subject, html, kind) {
  if (!process.env.RESEND_API_KEY) return;
  if (!mayEmail(to)) return;                 // suppressed on purpose, not a failure
  if (!(await clientMailAllowed(to))) return;
  if (!(await wantsEmail(to, kind))) return;
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

/* ── the data layer ──────────────────────────────────────────────
   Everything below talks to Postgres. The machinery this replaces is
   worth naming, because it existed only to work around the store:

     - a thread was one Blobs value, so two writes seconds apart could
       lose one of them for good. Messages are rows now; they cannot.
     - each message was written to its own key and later folded back in,
       with a compaction pass and a propagation delay to respect. Gone.
     - the 200-message cap existed because the whole thread was rewritten
       on every reply. Gone.
     - one free form check was a read-then-write that could race. It is
       a primary key now, so the database enforces it.

   Reads are strongly consistent, so the "wait 15 seconds before
   concluding a write failed" rule no longer applies. */

const enc = encodeURIComponent;
const nowISO = () => new Date().toISOString();
const iso = v => (v ? new Date(Number(v) || v).toISOString() : null);
const ms = v => (v ? new Date(v).getTime() : 0);

/* ── accounts ── */
const getAcct = e => supa.row('accounts', `email=eq.${enc(e)}&select=*`);

async function saveAcct(patch) {
  const row = { ...patch, last_seen: nowISO() };
  return supa.upsert('accounts', row, 'email');
}

/* an account has to exist before a message or a submission can point at
   it — every one of those tables has a foreign key onto this */
async function ensureAcct(e, name) {
  const got = await getAcct(e);
  if (got) return got;
  const [made] = await supa.upsert('accounts',
    { email: e, name: name || clients()[e] || '' }, 'email');
  return made;
}

/* ── the thread ── */
async function threadLoad(db, who) {
  const rows = await supa.rows('messages',
    `email=eq.${enc(who)}&select=*&order=created_at.asc`);
  return (rows || []).map(m => ({
    id: m.id, from: m.sender, text: m.body || '', at: ms(m.created_at),
    ...(m.video ? { video: m.video } : {}),
    ...(m.image ? { image: m.image } : {}),
    ...(m.submission ? { sub: m.submission } : {}),
  }));
}

async function threadAdd(db, who, msg) {
  await ensureAcct(who);
  const [row] = await supa.insert('messages', {
    email: who,
    sender: msg.from === 'coach' ? 'coach' : 'client',
    body: msg.text || '',
    video: msg.video || null,
    image: msg.image || null,
    submission: msg.sub || null,
  });
  return row;
}

const unreadCount = async who => (await supa.rows('messages',
  `email=eq.${enc(who)}&sender=eq.client&read_at=is.null&select=id`) || []).length;

const markRead = who => supa.update('messages',
  `email=eq.${enc(who)}&sender=eq.client&read_at=is.null`, { read_at: nowISO() });

/* ── submissions ── */
async function subsFor(db, who) {
  const [rows, replies] = await Promise.all([
    supa.rows('submissions', `email=eq.${enc(who)}&select=*&order=created_at.desc`),
    supa.rows('messages',
      `email=eq.${enc(who)}&sender=eq.coach&submission=not.is.null&select=submission,body,video,created_at`),
  ]);
  const answerFor = {};
  for (const m of (replies || [])) {
    if (!answerFor[m.submission]) answerFor[m.submission] =
      { text: m.body || '', video: m.video || null, at: ms(m.created_at) };
  }
  return (rows || []).map(s => ({
    id: s.id, kind: s.kind, cycle: s.cycle, at: ms(s.created_at),
    status: s.status, numbers: s.numbers || {}, clips: s.clips || [],
    reviewedAt: ms(s.reviewed_at), reviewedBy: s.reviewed_by || '',
    answer: answerFor[s.id] || null,
  }));
}

/* ── the coaching cycle ── */
const DAY = 24 * 60 * 60 * 1000;
const REVIEW_HOURS = 48;

async function cycleGet(db, who, plan) {
  let row = await supa.row('cycles', `email=eq.${enc(who)}&select=*`);
  if (!row) {
    await ensureAcct(who);
    const [made] = await supa.upsert('cycles', { email: who, n: 1 }, 'email');
    row = made;
  }
  const days = (plan && Number(plan.testDelayDays)) || 14;
  const start = ms(row.started_at);
  return { start, n: row.n || 1, days, dueAt: start + days * DAY };
}

/* ── short-lived odds and ends ── */
const getSetting = async k => {
  const r = await supa.row('settings', `key=eq.${enc(k)}&select=value`);
  return r ? r.value : null;
};
const setSetting = (k, value) =>
  supa.upsert('settings', { key: k, value, updated_at: nowISO() }, 'key');

const getCode = (e, kind) =>
  supa.row('codes', `email=eq.${enc(e)}&kind=eq.${kind}&select=*`);
const setCode = (e, kind, row) =>
  supa.upsert('codes', { email: e, kind, ...row }, 'email,kind');
const clearCode = (e, kind) =>
  supa.remove('codes', `email=eq.${enc(e)}&kind=eq.${kind}`);

/* rate limits: one row per key, window kept as a timestamp */
async function rateHit(key, windowMs) {
  const r = await supa.row('rate_limits', `key=eq.${enc(key)}&select=*`);
  const fresh = r && (Date.now() - ms(r.window_at)) < windowMs;
  const n = fresh ? (r.n || 0) + 1 : 1;
  await supa.upsert('rate_limits',
    { key, n, window_at: fresh ? r.window_at : nowISO() }, 'key');
  return n;
}

const nudgeSent = k => supa.row('nudges', `key=eq.${enc(k)}&select=*`);
const nudgeMark = (k, stage = 0) =>
  supa.upsert('nudges', { key: k, stage, sent_at: nowISO() }, 'key');

/* ── photos ──────────────────────────────────────────────────────
   Stream is video only. Photos are shrunk in the browser and kept in
   Blobs, so there is no second provider and no new credential. The id
   is random and unguessable — the same posture the drill videos have
   today, and it becomes signed at the same time they do. */
/* image keys. Lost when the old thread machinery was deleted, which took
   /image down with it — video was unaffected because it uploads straight
   to Cloudflare and never comes through here. */
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 12);

const IMG_MAX = 3 * 1024 * 1024;
const IMG_DATA = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

/* The client list used to be a hand-maintained 'index' blob, updated on
   every message and easy to get out of step. It is two queries now: who
   exists, and what has not been read. */
async function rosterRows() {
  const [accounts, msgs, subs] = await Promise.all([
    supa.rows('accounts', 'select=email,name,last_seen&order=last_seen.desc'),
    supa.rows('messages', 'select=email,created_at,sender,read_at'),
    supa.rows('submissions', 'select=email'),
  ]);

  /* Signing up is not the same as getting in touch. A free account that
     has never sent anything is a lead for the mailing list, not a row
     that should sit in a queue looking like it needs answering — it was
     burying the people who actually wrote to you. */
  const active = new Set();
  const counts = {}; const latest = {};
  for (const m of (msgs || [])) {
    active.add(m.email);
    latest[m.email] = Math.max(latest[m.email] || 0, ms(m.created_at));
    if (m.sender === 'client' && !m.read_at) counts[m.email] = (counts[m.email] || 0) + 1;
  }
  for (const s of (subs || [])) active.add(s.email);

  const byEmail = {};
  for (const a of (accounts || [])) {
    if (!active.has(a.email) && !clients()[a.email]) continue;
    byEmail[a.email] = { email: a.email, name: a.name || a.email.split('@')[0],
      last: Math.max(ms(a.last_seen), latest[a.email] || 0),
      unread: counts[a.email] || 0 };
  }
  /* a coaching client always belongs here, even before they say anything */
  for (const e of Object.keys(clients())) {
    byEmail[e] = byEmail[e] || { email: e, name: clients()[e], last: 0, unread: 0 };
    byEmail[e].name = clients()[e];
  }
  return byEmail;
}

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
    /* stripeIdx used to be a hand-kept map from customer to email. It is a
       column with an index on it now, so the lookup is a query. */
    let acct = e ? await getAcct(e) : null;
    if (!acct && obj.customer) {
      acct = await supa.row('accounts',
        `stripe_customer=eq.${enc(obj.customer)}&select=*`);
    }
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
      if (obj.subscription) acct.subscription = obj.subscription;
      else if (ev.type.startsWith('customer.subscription') && obj.id) acct.subscription = obj.id;
      if (obj.cancel_at_period_end != null) acct.cancel_at = obj.cancel_at_period_end
        ? iso((obj.current_period_end || 0) * 1000) : null;
      if (obj.customer) acct.stripe_customer = obj.customer;
    } else if (off.includes(ev.type)) {
      acct.plus = false;
    } else {
      return json({ ok: true, ignored: ev.type });
    }
    await saveAcct({ email: acct.email, plus: acct.plus, plus_at: nowISO(),
      subscription: acct.subscription || null, cancel_at: acct.cancel_at || null,
      stripe_customer: acct.stripe_customer || null });

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
      const hits = await rateHit(`code:${e}`, 3600000);
      if (hits <= 5) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        await setCode(e, 'login',
          { code, tries: 0, expires_at: iso(Date.now() + CODE_TTL) });
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
    const acct = await getAcct(e);
    const name = clients()[e] || (acct && (acct.name || e.split('@')[0])) || null;
    const stored = (await hashFor(db, e)) || (acct && acct.hash) || null;
    const bad = () => json({ error: 'Wrong email or password' }, 401);
    if (!e || !name || !stored || !body.password) return bad();

    /* slow the guessing down */
    const existing = await supa.row('rate_limits', `key=eq.${enc('pw:' + e)}&select=*`);
    if (existing && (Date.now() - ms(existing.window_at)) < 900000 && existing.n >= 10) {
      return json({ error: 'Too many attempts. Try again shortly.' }, 429);
    }

    const got = await pwHash(String(body.password));
    if (got.length !== stored.length) return bad();
    let diff = 0;
    for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ stored.charCodeAt(i);
    if (diff) {
      await rateHit(`pw:${e}`, 900000);
      return bad();
    }
    await supa.remove('rate_limits', `key=eq.${enc('pw:' + e)}`);
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

    const rec = await getCode(e, 'login');
    if (!rec || Date.now() > ms(rec.expires_at) || rec.tries >= 5) {
      await clearCode(e, 'login'); return bad();
    }
    if (String(body.code || '').trim() !== rec.code) {
      await setCode(e, 'login', { code: rec.code, tries: rec.tries + 1,
        expires_at: rec.expires_at });
      return bad();
    }
    await clearCode(e, 'login');
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
    const prev = (await getAcct(e)) || {};

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
      stripe_customer: prev.stripe_customer || null,
    };
    await saveAcct(acct);

    if (!prev.email) {
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

    const acct = await getAcct(e);
    const isClient = !!clients()[e];
    if (!acct && !isClient) return ok;

    /* slow down anyone working through a list of addresses */
    if ((await rateHit(`reset:${e}`, 3600000)) > 5) return ok;

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await ensureAcct(e);
    await setCode(e, 'reset',
      { code, tries: 0, expires_at: iso(Date.now() + 15 * 60 * 1000) });
    await email(e, 'Your reset code',
      mail({
        title: 'Your reset code.',
        paras: ['Use this to set a new password. It expires in 15 minutes.',
          `<span style="display:inline-block;font:700 30px/1 ui-monospace,SFMono-Regular,Menlo,monospace;
           letter-spacing:.24em;color:#1c2019;background:#f4f6f2;border-radius:10px;
           padding:16px 20px 16px 24px">${esc(code)}</span>`,
          'If you did not ask for this, ignore it — nothing has changed.'],
        signoff: { line: 'Thanks,', name: 'London Handstand Academy' },
      }));
    return ok;
  }

  if (path === '/reset/confirm' && request.method === 'POST') {
    const e = norm(body.email);
    const code = String(body.code || '').trim();
    const pw = String(body.password || '');
    if (pw.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);

    const rec = await getCode(e, 'reset');
    const bad = () => json({ error: 'That code is wrong or has expired' }, 400);
    if (!rec || Date.now() > ms(rec.expires_at)) return bad();
    if (rec.tries >= 5) return bad();
    if (code !== rec.code) {
      await setCode(e, 'reset', { code: rec.code, tries: rec.tries + 1,
        expires_at: rec.expires_at });
      return bad();
    }
    await clearCode(e, 'reset');

    /* one hash, on the account row. There is no separate override store
       any more — a coached client and a self-serve one are the same row. */
    await ensureAcct(e);
    await saveAcct({ email: e, hash: await pwHash(pw) });
    await supa.remove('rate_limits', `key=eq.${enc('pw:' + e)}`);

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
    const acct = (await getAcct(who)) || {};
    return json({
      email: who,
      name: clients()[who] || acct.name || '',
      coached: !!clients()[who],
      coach: coachList().includes(who),
      coachName: clients()[who] ? coachName(coachOf(who)) : '',
      plus: !!acct.plus,
      canManage: !!acct.stripe_customer,
      canCancel: !!(acct.subscription || acct.stripe_customer),
      cancelAt: acct.cancel_at || 0,
      /* the one free form check. Its own key, because nothing else writes
         it — folding it into acct would put it in the path of every other
         account write. */
      freeCheckUsed: !!(await supa.row('free_checks', `email=eq.${enc(who)}&select=email`)),
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
    const acct = (await getAcct(who)) || {};
    if (!acct.stripe_customer && !acct.subscription) return json({ none: true });
    if (!stripeKey()) return json({ none: true });

    try {
      let sub = null;
      if (acct.subscription) {
        sub = await stripe(`/subscriptions/${acct.subscription}`, null, 'GET');
      } else {
        const list = await stripe(
          `/subscriptions?customer=${encodeURIComponent(acct.stripe_customer)}&status=all&limit=10`,
          null, 'GET');
        sub = (list.data || []).find(x =>
          ['active', 'trialing', 'past_due', 'unpaid'].includes(x.status)) || (list.data || [])[0] || null;
      }
      if (!sub) return json({ none: true });

      /* keep what we learned, so cancel does not have to look it up again */
      const before = JSON.stringify([acct.subscription, acct.cancel_at, acct.plus]);
      acct.subscription = sub.id;
      acct.cancel_at = sub.cancel_at_period_end ? iso((sub.current_period_end || 0) * 1000) : null;
      acct.plus = ['active', 'trialing', 'past_due'].includes(sub.status);
      if (JSON.stringify([acct.subscription, acct.cancel_at, acct.plus]) !== before) {
        await saveAcct({ email: who, subscription: acct.subscription,
          cancel_at: acct.cancel_at, plus: acct.plus });
      }

      const item = (sub.items && sub.items.data && sub.items.data[0]) || {};
      const price = item.price || {};
      return json({
        status: sub.status,
        renewsAt: (sub.current_period_end || 0) * 1000,
        cancelAt: acct.cancel_at,
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
    const acct = (await getAcct(who)) || {};

    /* the id is normally captured from the webhook, but a missed or
       mis-routed event should not leave someone unable to cancel — ask
       Stripe which subscription this customer has */
    if (!acct.subscription && acct.stripe_customer) {
      try {
        const list = await stripe(
          `/subscriptions?customer=${encodeURIComponent(acct.stripe_customer)}&status=all&limit=10`,
          null, 'GET');
        const live = (list.data || []).find(x =>
          ['active', 'trialing', 'past_due', 'unpaid'].includes(x.status));
        if (live) {
          acct.subscription = live.id;
          acct.cancel_at = live.cancel_at_period_end ? iso((live.current_period_end || 0) * 1000) : null;
          await saveAcct({ email: who, subscription: acct.subscription,
          cancel_at: acct.cancel_at, plus: acct.plus });
        }
      } catch { /* fall through to the error below */ }
    }
    if (!acct.subscription) return json({ error: 'No subscription to cancel' }, 400);
    try {
      const sub = body.undo
        ? await stripe(`/subscriptions/${acct.subscription}`, { cancel_at_period_end: 'false' })
        : await stripe(`/subscriptions/${acct.subscription}`, { cancel_at_period_end: 'true' });
      acct.cancel_at = sub.cancel_at_period_end ? iso((sub.current_period_end || 0) * 1000) : null;
      await saveAcct({ email: who, subscription: acct.subscription,
          cancel_at: acct.cancel_at, plus: acct.plus });
      await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL,
        `${who} ${body.undo ? 'resumed' : 'cancelled'} their £5 subscription`,
        `<p style="font:16px/1.6 system-ui">${body.undo
          ? 'They turned the renewal back on.'
          : 'It stops renewing. Access runs to the end of the paid month.'}</p>`);
      return json({ ok: true, cancelAt: acct.cancel_at });
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
    const acct = (await getAcct(who)) || {};
    if (!acct.stripe_customer) return json({ error: 'No subscription to manage' }, 400);
    try {
      const sess = await stripe('/billing_portal/sessions', {
        customer: acct.stripe_customer,
        return_url: `${url.origin}/lha-app.html`,
      });
      return json({ url: sess.url });
    } catch (err) {
      return json({ error: String(err.message || err) }, 502);
    }
  }

  /* ── programmes that can be written ───────────────────────────
     A programme was a generated file, so changing one meant a deploy.
     An edited programme lives in the settings row and wins over the
     file; the file stays as the starting point for anyone never edited.

     Drills are stored as a reference and a dose, not a copy. The name,
     clip, cues and description come from the library at read time — the
     reason the cues drifted out of two programmes was that they had
     been copied. */
  const libGet = (m, v) => (programmes.library[m] || {})[v];
  function hydrateItem(it) {
    const v = String(it && it.v || '').slice(0, 64);
    if (!v) return null;
    return {
      v,
      n: libGet('names', v) || v,
      d: String(it.d || libGet('timing', v) || '').slice(0, 60),
      nt: String(it.nt || '').slice(0, 300),
      url: libGet('video', v) || '',
      cues: libGet('cues', v) || [],
      desc: libGet('desc', v) || '',
    };
  }
  function hydratePlan(base) {
    if (!base) return null;
    const days = (base.days || []).slice(0, 14).map((d, i) => ({
      id: String(d.id || (i + 1)).slice(0, 8),
      label: String(d.label || `Day ${i + 1}`).slice(0, 40),
      sub: String(d.sub || '').slice(0, 60),
      title: String(d.title || d.label || '').slice(0, 80),
      when: String(d.when || '').slice(0, 120),
      mins: String(d.mins || '').slice(0, 8),
      more: d.more || '',
      groups: (d.groups || []).slice(0, 12).map(g => ({
        name: String(g.name || '').slice(0, 60),
        items: (g.items || []).slice(0, 40).map(hydrateItem).filter(Boolean),
      })),
    }));
    return Object.assign({}, base, { days });
  }
  async function planFor(email) {
    const saved = await getSetting(`programme:${email}`);
    return hydratePlan(saved || programmes.clients[email] || null);
  }

  /* ── the client's own programme ──────────────────────────────────
     The app used to ship one client's plan baked into the HTML, so a
     second client signing in saw the first one's drills. The plan is
     chosen by the token, never by anything the caller sends. */
  if (path === '/programme' && request.method === 'GET') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const plan = await planFor(who);
    if (!plan) return json({ error: 'No programme yet' }, 404);
    const cycle = await cycleGet(db, who, plan);
    return json({ client: clients()[who] || plan.client, plan, cycle,
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

  /* ── what they want to hear about ────────────────────────────── */
  if (path === '/prefs') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    if (request.method === 'POST') {
      const cur = (await getSetting(`prefs:${who}`)) || {};
      for (const k of ['replies', 'reminders', 'marketing']) {
        if (body[k] !== undefined) cur[k] = body[k] !== false;
      }
      await setSetting(`prefs:${who}`, cur);
      if (body.marketing !== undefined) {
        await saveAcct({ email: who, marketing: body.marketing !== false });
      }
    }
    const p = (await getSetting(`prefs:${who}`)) || {};
    const acct = (await getAcct(who)) || {};
    return json({
      replies: p.replies !== false,
      reminders: p.reminders !== false,
      marketing: p.marketing !== undefined ? p.marketing !== false : !!acct.marketing,
    });
  }

  /* ── app state that has to follow the person ──────────────────
     Which weekday each session sits on, and any drill lengths they have
     changed. Small, and useless on one device only — a new phone should
     not cost someone their week. */
  if (path === '/state') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const key = `state:${who}`;
    if (request.method === 'POST') {
      const cur = (await getSetting(key)) || {};
      if (body.dayMap && typeof body.dayMap === 'object') {
        const m = {};
        for (const k of Object.keys(body.dayMap).slice(0, 14)) {
          const d = Number(body.dayMap[k]);
          if (Number.isInteger(d) && d >= 0 && d <= 6) m[String(k).slice(0, 8)] = d;
        }
        cur.dayMap = m;
      }
      if (body.secs && typeof body.secs === 'object') {
        const m = {};
        for (const k of Object.keys(body.secs).slice(0, 200)) {
          const n = Number(body.secs[k]);
          if (Number.isFinite(n) && n >= 10 && n <= 300) m[String(k).slice(0, 64)] = Math.round(n);
        }
        cur.secs = m;
      }
      if (body.ladderDone && typeof body.ladderDone === 'object') {
        const m = {};
        for (const k of Object.keys(body.ladderDone).slice(0, 400)) {
          if (body.ladderDone[k]) m[String(k).slice(0, 64)] = true;
        }
        cur.ladderDone = m;
      }
      if (body.time !== undefined) {
        const t = Number(body.time);
        if ([15, 30, 45].includes(t)) cur.time = t;
      }
      if (body.perWeek !== undefined) {
        const n = Number(body.perWeek);
        if (Number.isInteger(n) && n >= 1 && n <= 7) cur.perWeek = n;
      }
      await setSetting(key, cur);
    }
    const out = (await getSetting(key)) || {};
    return json({ dayMap: out.dayMap || {}, secs: out.secs || {},
      time: out.time || 0, perWeek: out.perWeek || 0,
      ladderDone: out.ladderDone || {} });
  }

  /* ── tracking: metrics, habits, check-ins ─────────────────────
     Rides on the settings row rather than new columns, so there is no
     migration to apply by hand. Everything is append-only and capped:
     a client cannot grow their own row without bound. */
  if (path === '/track') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const key = `track:${who}`;
    const cur = (await getSetting(key)) || {};
    cur.metrics = cur.metrics || {};
    cur.habits  = cur.habits  || {};
    cur.checkins = cur.checkins || [];

    if (request.method === 'POST') {
      const now = Date.now();
      /* one reading of one metric */
      if (body.metric && typeof body.metric === 'object') {
        const m = String(body.metric.m || '').slice(0, 32);
        const v = Number(body.metric.v);
        if (m && Number.isFinite(v) && v >= 0 && v <= 100000) {
          const list = (cur.metrics[m] || []).concat([{ v: Math.round(v * 10) / 10, at: now }]);
          cur.metrics[m] = list.slice(-60);
        }
      }
      /* a habit ticked or unticked on a given day */
      if (body.habit && typeof body.habit === 'object') {
        const h = String(body.habit.h || '').slice(0, 32);
        const day = String(body.habit.day || '').slice(0, 10);
        if (h && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
          const set = new Set(cur.habits[h] || []);
          if (body.habit.on === false) set.delete(day); else set.add(day);
          cur.habits[h] = Array.from(set).sort().slice(-180);
        }
      }
      /* a fortnightly check-in */
      if (body.checkin && typeof body.checkin === 'object') {
        const c = body.checkin;
        cur.checkins = cur.checkins.concat([{
          at: now,
          mood: Number(c.mood) || 0,
          soreness: Number(c.soreness) || 0,
          sleep: Number(c.sleep) || 0,
          note: String(c.note || '').slice(0, 600),
        }]).slice(-40);
      }
      /* a progress photo, already uploaded — this records the reference */
      if (body.photo && typeof body.photo === 'object' && body.photo.id) {
        cur.photos = (cur.photos || []).concat([{
          id: String(body.photo.id).slice(0, 80),
          view: ['side', 'front', 'back'].includes(body.photo.view) ? body.photo.view : 'side',
          at: now,
        }]).slice(-40);
      }
      await setSetting(key, cur);
    }
    return json({ metrics: cur.metrics, habits: cur.habits,
      checkins: cur.checkins, photos: cur.photos || [] });
  }

  /* the intake answers, so the coach sees who someone said they were */
  if (path === '/intake' && request.method === 'POST') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const a = (body.intake && typeof body.intake === 'object') ? body.intake : {};
    const clean = {
      goal: String(a.goal || '').slice(0, 32),
      level: Number.isFinite(Number(a.level)) ? Number(a.level) : null,
      niggles: Array.isArray(a.niggles) ? a.niggles.slice(0, 8).map(x => String(x).slice(0, 40)) : [],
      mins: Number(a.mins) || null, days: Number(a.days) || null,
      at: Date.now(),
    };
    await ensureAcct(who);
    await setSetting(`intake:${who}`, clean);
    if (Number.isFinite(Number(body.stage))) {
      await saveAcct({ email: who, stage: Number(body.stage) });
    }
    return json({ ok: true });
  }

  /* ── questions ───────────────────────────────────────────────────
     A question is not a chat message. It has one job, it either has an
     answer or it does not, and it should be findable months later next to
     the answer it got — which a thread cannot do. */
  if (path === '/questions') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    if (request.method === 'POST') {
      const body2 = String(body.body || '').trim().slice(0, 1200);
      if (!body2) return json({ error: 'Ask something first' }, 400);
      if ((await rateHit(`ask:${who}`, 3600000)) > 10) {
        return json({ error: 'That is a lot of questions at once. Try again shortly.' }, 429);
      }
      await ensureAcct(who);
      await supa.insert('questions', { email: who, body: body2 });
      await email(coachOf(who) || process.env.COACH_EMAIL || process.env.FROM_EMAIL,
        `Question from ${clients()[who] || who}`,
        mail({ title: 'A question came in.',
          paras: [esc(body2)],
          cta: { href: `${SITE}/lha-coach.html`, label: 'Answer it' },
          signoff: { name: 'London Handstand Academy' } }));
      return json({ ok: true });
    }
    const rows = await supa.rows('questions',
      `email=eq.${enc(who)}&select=*&order=created_at.desc`);
    return json({ questions: (rows || []).map(q => ({
      id: q.id, body: q.body, answer: q.answer || '', status: q.status,
      at: ms(q.created_at), answeredAt: ms(q.answered_at) })) });
  }

  /* ── applying for coaching ───────────────────────────────────────
     The most valuable thing anyone does in this app used to fire a
     Formspree email and an alert: no record, no status, no way to see it
     again. It is a row now, and it shows up in the dashboard like
     anything else that needs answering. */
  if (path === '/application' && request.method === 'POST') {
    const who = await me();
    const e = norm(who || body.email);
    if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      return json({ error: 'We need an email address to reply to' }, 400);
    }
    /* an open endpoint, so cap it — five a day per address is generous
       for something you only do once */
    if ((await rateHit(`apply:${e}`, 86400000)) > 5) {
      return json({ error: 'That has been sent already. Check your email.' }, 429);
    }

    const pick = (k, max = 200) => String((body.answers || {})[k] || '').slice(0, max);
    const answers = {
      goal: pick('goal'), level: pick('level'), format: pick('format'),
      days: pick('days'), injuries: pick('injuries', 1200),
      notes: pick('notes', 1200), location: pick('location'),
    };
    const name = String(body.name || '').slice(0, 60);

    await ensureAcct(e, name);
    if (name) await saveAcct({ email: e, name });
    const [row] = await supa.insert('applications', { email: e, name, answers });

    const lines = Object.entries(answers).filter(([, v]) => v)
      .map(([k, v]) => `<b>${esc(k)}</b>: ${esc(v)}`).join('<br>');
    await email(coachOf(e) || process.env.COACH_EMAIL || process.env.FROM_EMAIL,
      `Coaching application: ${name || e}`,
      mail({
        title: 'Someone wants coaching.',
        paras: [`<b>${esc(name || e)}</b> — ${esc(e)}`, lines || 'No answers given.'],
        cta: { href: `${SITE}/lha-coach.html`, label: 'Open the dashboard' },
        signoff: { name: 'London Handstand Academy' },
      }));

    /* tell them it landed, because silence after applying is what makes
       people assume it did not */
    await email(e, 'Your coaching application',
      mail({
        title: 'Got it.',
        greeting: (name || '').split(' ')[0] || '',
        paras: ['Your application is with me. I read every one myself and '
          + 'come back within 48 hours with whether I think it is a fit, '
          + 'and what I would start you on.',
          'If anything changes in the meantime, just reply to this.'],
        signoff: { name: coachName(coachOf(e)) },
      }));

    return json({ ok: true, id: row.id });
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

  /* ── where the client is in the cycle, and what they owe ────────── */
  if (path === '/cycle' && request.method === 'GET') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const plan = programmes.clients[who];
    const cycle = await cycleGet(db, who, plan);
    const subs = await subsFor(db, who);
    const current = subs.find(s => s.cycle === cycle.n) || null;
    return json({
      ...cycle,
      due: Date.now() >= cycle.dueAt,
      daysLeft: Math.ceil((cycle.dueAt - Date.now()) / DAY),
      submission: current,
      awaiting: !!(current && current.status === 'submitted'),
      reviewHours: REVIEW_HOURS,
    });
  }

  /* numbers and footage arrive together — that pairing is the whole
     point, because a number without the clip is a claim you cannot check */
  if (path === '/submission' && request.method === 'POST') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    /* A free account has one assessment in it. The gate lives here as well
       as on /messages — footage can reach a coach by either road, and a
       limit enforced on only one of them is not a limit. */
    const coached = !!clients()[who];
    const kind = coached && body.kind !== 'assessment' ? 'test' : 'assessment';
    if (!coached) {
      if (await supa.row('free_checks', `email=eq.${enc(who)}&select=email`)) {
        return json({ error: 'Your free assessment has already been used. '
          + 'Coaching includes unlimited form checks.', gated: true }, 402);
      }
    }
    const numbers = (body.numbers && typeof body.numbers === 'object') ? body.numbers : {};
    const clips = Array.isArray(body.clips) ? body.clips.slice(0, 12).map(c => ({
      drill: String((c && c.drill) || '').slice(0, 64),
      name: String((c && c.name) || '').slice(0, 80),
      uid: String((c && c.uid) || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 64),
      image: String((c && c.image) || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 64),
    })).filter(c => c.uid || c.image) : [];
    if (!clips.length && !Object.keys(numbers).length) {
      return json({ error: 'Nothing to send' }, 400);
    }

    const plan = programmes.clients[who];
    const cycle = await cycleGet(db, who, plan);
    await ensureAcct(who);
    const [saved] = await supa.insert('submissions',
      { email: who, kind, cycle: cycle.n, numbers, clips, status: 'submitted' });
    const id = saved.id;
    /* the primary key is the limit — two requests racing cannot both win */
    if (!coached) {
      const won = await supa.insertIfAbsent('free_checks',
        { email: who, submission: id }, 'email');
      if (!won) {
        await supa.remove('submissions', `id=eq.${enc(id)}`);
        return json({ error: 'Your free assessment has already been used. '
          + 'Coaching includes unlimited form checks.', gated: true }, 402);
      }
    }

    /* it lands in the thread too, so the coach reads it where they
       already reply rather than in a second inbox */
    const label = kind === 'assessment' ? 'Baseline assessment' : `Two-week test · cycle ${cycle.n}`;
    const lines = Object.entries(numbers).map(([k2, v]) => `${k2}: ${v}`).join(', ');
    await threadAdd(db, who, { from: 'client',
      text: `${label}${lines ? ' — ' + lines : ''}`, sub: id });
    for (const c of clips) {
      await threadAdd(db, who, { from: 'client', text: c.name || c.drill, sub: id,
        ...(c.uid ? { video: c.uid } : {}), ...(c.image ? { image: c.image } : {}) });
    }

    const them = clients()[who] || (acct.name || '').split(' ')[0] || '';
    const cn = coachName(coachOf(who));
    await email(who, kind === 'assessment' ? 'Your clip is in' : 'Your test is in',
      mail({
        title: kind === 'assessment' ? 'Your clip is in.' : 'Your test is in.',
        greeting: them,
        paras: [`Thanks for sending ${clips.length === 1 ? 'that' : 'those'} over.
          ${esc(cn)} watches every one personally — you will hear back within
          <b>48 hours</b>.`],
        box: { title: 'What happens next', numbered: true, items: [
          `${cn} watches your ${clips.length === 1 ? 'clip' : 'clips'} and picks the one thing holding you back.`,
          'You get that back in the app, and an email to tell you it has landed.',
        ] },
        cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
        signoff: { name: cn },
        footnote: 'Sit tight — the next email from us is the one with your answer.',
      }));

    await email(coachOf(who) || process.env.COACH_EMAIL || process.env.FROM_EMAIL,
      `${clients()[who] || who}: ${label}`,
      `<p style="font:16px/1.6 system-ui">${clips.length} clip${clips.length === 1 ? '' : 's'}
       and ${Object.keys(numbers).length} number${Object.keys(numbers).length === 1 ? '' : 's'}.</p>
       <p style="font:15px/1.6 system-ui">${lines || 'No numbers given.'}</p>
       <p style="font:13px/1.5 system-ui;color:#666">Review in the coach view within ${REVIEW_HOURS} hours.</p>`);

    return json({ ok: true, id });
  }

  if (path === '/submissions' && request.method === 'GET') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    return json({ submissions: await subsFor(db, who) });
  }

  /* ── what a client is actually doing ─────────────────────────────
     Written by the app, read by the coach view. Kept as a rolling
     summary plus a capped event log — enough to see a pattern, not so
     much that it becomes a surveillance record of someone's training. */
  /* What was done on each drill, newest first, read back out of the sessions
     the account already holds. Derived rather than stored a second time — two
     copies of the same fact drift, and this one has to survive a new phone. */
  function repsLogFrom(sessions) {
    const log = {};
    for (const s of (Array.isArray(sessions) ? sessions : [])) {
      for (const it of (Array.isArray(s.items) ? s.items : [])) {
        const v = it && it.v, n = Number(it && it.reps) || 0;
        if (!v || !n) continue;
        (log[v] = log[v] || []).push({ at: Number(s.at) || 0, reps: n, secs: 0 });
      }
    }
    for (const v of Object.keys(log)) {
      log[v] = log[v].sort((a, b) => b.at - a.at).slice(0, 8);
    }
    return log;
  }

  if (path === '/progress') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const k = `prog:${who}`;

    if (request.method === 'GET') {
      const prog = await supa.row('progress', `email=eq.${enc(who)}&select=*`);
    return json(prog ? { opens: prog.opens || [], sessions: prog.sessions || [], holds: prog.holds || [],
  flags: prog.flags || {}, tests: prog.tests || [], feedback: prog.feedback || [],
  bestHold: prog.best_hold || 0, lastSeen: ms(prog.last_seen),
  repsLog: repsLogFrom(prog.sessions) } : {});
    }
    if (request.method === 'POST') {
    const stored = await supa.row('progress', `email=eq.${enc(who)}&select=*`);
    const p = stored
      ? { opens: stored.opens || [], sessions: stored.sessions || [], holds: stored.holds || [],
          flags: stored.flags || {}, tests: stored.tests || [], feedback: stored.feedback || [],
          bestHold: stored.best_hold || 0, lastSeen: ms(stored.last_seen) }
      : { opens: [], sessions: [], holds: [], flags: {}, tests: [], feedback: [] };
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
          /* the drill-by-drill, so an abandoned session says which drill it
             died on rather than only that it died */
          items: Array.isArray(body.session.items)
            ? body.session.items.slice(0, 40).map(x => ({
                v: String((x && x.v) || '').slice(0, 64),
                n: String((x && x.n) || '').slice(0, 60),
                grp: String((x && x.grp) || '').slice(0, 40),
                got: Number(x && x.got) || 0,
                of: Number(x && x.of) || 0,
                reps: Number(x && x.reps) || 0,
                rate: ['easy', 'hard'].includes(x && x.rate) ? x.rate : '',
              }))
            : [],
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
      await ensureAcct(who);
    await supa.upsert('progress', {
      email: who, opens: p.opens || [], sessions: p.sessions || [], holds: p.holds || [],
      flags: p.flags || {}, tests: p.tests || [], feedback: p.feedback || [],
      best_hold: p.bestHold || null, last_seen: iso(p.lastSeen) || nowISO(),
    }, 'email');
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
    await saveAcct({ email: who, hash: await pwHash(next) });

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
      return json({ messages: await threadLoad(db, who) });
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
        const won = await supa.insertIfAbsent('free_checks', { email: who }, 'email');
        if (!won) {
          return json({ error: 'Your free form check has already been used. '
            + 'Form checks come with coaching.', gated: true }, 402);
        }
      }

      await threadAdd(db, who, { from: 'client', text,
        ...(video ? { video } : {}), ...(image ? { image } : {}) });

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
      await supa.remove('progress', `email=eq.${enc(e)}`);
      return json({ ok: true, cleared: e });
    }

    /* the coach's own notes on a client — never shown in the client app */
    if (path === '/coach/notes') {
      const e = norm(url.searchParams.get('email') || body.email);
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      const k = `note:${e}`;
      if (request.method === 'GET') {
        const note = await supa.row('coach_notes', `email=eq.${enc(e)}&select=*`);
        return json(note ? { text: note.body || '', at: ms(note.updated_at) } : { text: '', at: 0 });
      }
      if (request.method === 'POST') {
        const text = String(body.text || '').slice(0, 8000);
        await ensureAcct(e);
        await supa.upsert('coach_notes',
          { email: e, body: text, updated_at: nowISO() }, 'email');
        return json({ ok: true, at: Date.now() });
      }
    }

    if (path === '/coach/programme') {
      if (request.method === 'GET') {
        const e = norm(url.searchParams.get('email'));
        if (!e) return json({ error: 'Which client?' }, 400);
        if (!owns(e)) return json({ error: 'Not your client' }, 403);
        const saved = await getSetting(`programme:${e}`);
        return json({
          email: e,
          edited: !!saved,
          plan: hydratePlan(saved || programmes.clients[e] || { days: [] }),
          library: programmes.library,
        });
      }
      if (request.method === 'POST') {
        const e = norm(body.email);
        if (!e) return json({ error: 'Which client?' }, 400);
        if (!owns(e)) return json({ error: 'Not your client' }, 403);
        const base = (await getSetting(`programme:${e}`)) || programmes.clients[e] || {};
        /* only what the builder edits is taken from the request; the rest of
           the plan — the read, the test, the coach's notes — carries over */
        const next = Object.assign({}, base, {
          client: String(body.client || base.client || '').slice(0, 60),
          goal: String(body.goal || base.goal || '').slice(0, 300),
          days: (Array.isArray(body.days) ? body.days : []).slice(0, 14).map((d, i) => ({
            id: String(d.id || (i + 1)).slice(0, 8),
            label: String(d.label || `Day ${i + 1}`).slice(0, 40),
            sub: String(d.sub || '').slice(0, 60),
            title: String(d.title || '').slice(0, 80),
            when: String(d.when || '').slice(0, 120),
            mins: String(d.mins || '').slice(0, 8),
            groups: (Array.isArray(d.groups) ? d.groups : []).slice(0, 12).map(g => ({
              name: String(g.name || '').slice(0, 60),
              items: (Array.isArray(g.items) ? g.items : []).slice(0, 40)
                .map(it => ({ v: String(it.v || '').slice(0, 64),
                              d: String(it.d || '').slice(0, 60),
                              nt: String(it.nt || '').slice(0, 300) }))
                .filter(it => it.v),
            })),
          })),
          editedAt: Date.now(),
        });
        await setSetting(`programme:${e}`, next);
        return json({ ok: true, plan: hydratePlan(next) });
      }
    }

    if (path === '/coach/progress') {
      const e = norm(url.searchParams.get('email'));
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      return json({ email: e, name: clients()[e] || e,
                    intake: (await getSetting(`intake:${e}`)) || null,
                    track: (await getSetting(`track:${e}`)) || null,
        progress: (await (async () => {
          const prog = await supa.row('progress', `email=eq.${enc(e)}&select=*`);
          return prog ? { opens: prog.opens || [], sessions: prog.sessions || [], holds: prog.holds || [],
  flags: prog.flags || {}, tests: prog.tests || [], feedback: prog.feedback || [],
  bestHold: prog.best_hold || 0, lastSeen: ms(prog.last_seen) } : {};
        })()) });
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
      const acct = await getAcct(e);
      await ensureAcct(e);
      await saveAcct({ email: e, hash });
      await supa.remove('rate_limits', `key=eq.${enc('pw:' + e)}`);
      return json({ ok: true, email: e, hadAccount: !!acct });
    }

    if (path === '/coach/grant' && request.method === 'POST') {
      const e = norm(body.email);
      if (!e) return json({ error: 'Which account?' }, 400);
      const acct = await getAcct(e);
      if (!acct) return json({ error: 'No account with that address' }, 404);
      const plus = body.plus !== false;
      await saveAcct({ email: e, plus, plus_at: nowISO() });
      return json({ ok: true, email: e, plus });
    }

    if (path === '/coach/leads') {
      /* one query, ordered by the database — this used to be a full
         listing plus a fetch per account */
      const out = (await supa.rows('accounts',
        'select=*&order=last_seen.desc')) || [];
      return json({ leads: out.map(a => ({ ...a, last: ms(a.last_seen),
        first: ms(a.first_seen), stripeCustomer: a.stripe_customer })) });
    }

    /* everything waiting on a review, across everyone this coach has.
       Without it a one-off form check from someone who is not yet a client
       only surfaces if you happen to notice them in the list and click in. */
    /* give someone their free assessment back — for a test run, or when a
       clip was unusable and it would be mean to spend their one on it */
    /* the email switch, read and written from the dashboard */
    /* Is the database reachable, and is it the right key? Mirrors
       /coach/stripe-status: reports what the running deploy can see
       without ever revealing a secret. */
    /* ── Blobs → Supabase ──────────────────────────────────────────
       Idempotent: every write is an upsert keyed on what makes the row
       unique, so running it twice changes nothing and running it again
       later picks up whatever has been written since.

       Accounts go first — everything else references them.

       Deliberately not migrated: login codes, reset codes, rate-limit
       counters and sent-nudge markers. All are short-lived, all rebuild
       themselves within a day, and carrying them over risks importing a
       stale lockout. ?dry=1 reports what it would do and writes nothing. */
    if (path === '/coach/migrate' && request.method === 'POST') {
      if (!supa.configured()) return json({ error: 'Supabase is not configured' }, 503);
      const dry = url.searchParams.get('dry') === '1';
      const t0 = Date.now();
      const n = { accounts: 0, messages: 0, progress: 0, notes: 0,
                  cycles: 0, submissions: 0, freeChecks: 0, settings: 0 };
      const problems = [];

      const iso = v => (v ? new Date(Number(v) || v).toISOString() : null);
      const listKeys = async prefix => {
        try { return (await db.list({ prefix })).blobs.map(b => b.key); }
        catch { return []; }
      };

      /* who exists at all: an account blob, or a thread, or progress */
      const emails = new Set();
      for (const pre of ['acct:', 'thread:', 'prog:']) {
        for (const k of await listKeys(pre)) emails.add(k.slice(pre.length));
      }

      for (const e of emails) {
        if (!e) continue;
        try {
          /* Blobs, deliberately — this route reads the OLD store. A blanket
             rename briefly pointed it at Supabase, which would have made it
             copy Postgres onto itself and report success having moved nothing. */
          const acct = (await db.get(`acct:${e}`, { type: 'json' })) || {};
          const pw = await db.get(`pw:${e}`, { type: 'json' });
          const rowAcct = {
            email: e,
            name: acct.name || clients()[e] || '',
            hash: (pw && pw.hash) || acct.hash || null,
            marketing: !!acct.marketing,
            stage: acct.stage || null,
            plus: !!acct.plus,
            plus_at: iso(acct.plusAt),
            /* blob field names on the right, column names on the left —
               the old store called these stripeCustomer, sub and cancelAt */
            stripe_customer: acct.stripeCustomer || null,
            subscription: acct.sub || null,
            cancel_at: iso(acct.cancelAt),
            first_seen: iso(acct.first) || new Date().toISOString(),
            last_seen: iso(acct.last) || iso(acct.lastSeen) || new Date().toISOString(),
          };
          if (!dry) await supa.upsert('accounts', rowAcct, 'email');
          n.accounts++;

          /* the thread, compacted plus anything still queued */
          const base = (await db.get(`thread:${e}`, { type: 'json' })) || [];
          const queued = [];
          for (const k of await listKeys(`mq:${e}:`)) {
            const m = await db.get(k, { type: 'json' });
            if (m) queued.push(m);
          }
          const seen = new Set(base.map(m => m && m.id).filter(Boolean));
          const all = base.concat(queued.filter(m => m.id && !seen.has(m.id)))
            .sort((a, b) => (a.at || 0) - (b.at || 0));
          for (const m of all) {
            if (!m) continue;
            const rowMsg = {
              email: e,
              sender: m.from === 'coach' ? 'coach' : 'client',
              body: m.text || '',
              video: m.video || null,
              image: m.image || null,
              submission: m.sub || null,
              created_at: iso(m.at) || new Date().toISOString(),
            };
            /* no natural key on Blobs messages, so skip anything already
               carried over rather than duplicating the thread */
            if (!dry) {
              const dupe = await supa.row('messages',
                `email=eq.${encodeURIComponent(e)}&created_at=eq.${encodeURIComponent(rowMsg.created_at)}&select=id`);
              if (!dupe) { await supa.insert('messages', rowMsg); n.messages++; }
            } else n.messages++;
          }

          const prog = await db.get(`prog:${e}`, { type: 'json' });
          if (prog) {
            if (!dry) await supa.upsert('progress', {
              email: e,
              opens: prog.opens || [], sessions: prog.sessions || [],
              holds: prog.holds || [], flags: prog.flags || {},
              tests: prog.tests || [], feedback: prog.feedback || [],
              best_hold: prog.bestHold || null, last_seen: iso(prog.lastSeen),
            }, 'email');
            n.progress++;
          }

          const note = await db.get(`note:${e}`, { type: 'json' });
          if (note && note.text) {
            if (!dry) await supa.upsert('coach_notes',
              { email: e, body: note.text, updated_at: iso(note.at) || new Date().toISOString() }, 'email');
            n.notes++;
          }

          const cyc = await db.get(`cycle:${e}`, { type: 'json' });
          if (cyc) {
            if (!dry) await supa.upsert('cycles',
              { email: e, n: cyc.n || 1, started_at: iso(cyc.start) || new Date().toISOString() }, 'email');
            n.cycles++;
          }

          for (const k of await listKeys(`sub:${e}:`)) {
            const sub = await db.get(k, { type: 'json' });
            if (!sub) continue;
            if (!dry) {
              const dupe = await supa.row('submissions',
                `email=eq.${encodeURIComponent(e)}&created_at=eq.${encodeURIComponent(iso(sub.at))}&select=id`);
              if (!dupe) await supa.insert('submissions', {
                email: e, kind: sub.kind === 'assessment' ? 'assessment' : 'test',
                cycle: sub.cycle || 1, numbers: sub.numbers || {}, clips: sub.clips || [],
                status: sub.status === 'reviewed' ? 'reviewed' : 'submitted',
                reviewed_at: iso(sub.reviewedAt), reviewed_by: sub.reviewedBy || null,
                created_at: iso(sub.at) || new Date().toISOString(),
              });
            }
            n.submissions++;
          }

          const fc = await db.get(`fc:${e}`, { type: 'json' });
          if (fc) {
            if (!dry) await supa.upsert('free_checks',
              { email: e, used_at: iso(fc.at) || new Date().toISOString() }, 'email');
            n.freeChecks++;
          }
        } catch (err) {
          problems.push(`${e}: ${String(err.message || err).slice(0, 200)}`);
        }
      }

      const guard = await db.get('mailguard', { type: 'json' });
      if (guard) {
        if (!dry) await supa.upsert('settings',
          { key: 'mailguard', value: guard, updated_at: new Date().toISOString() }, 'key');
        n.settings++;
      }

      return json({ dry, people: emails.size, copied: n, problems,
                    seconds: Math.round((Date.now() - t0) / 100) / 10 });
    }

    if (path === '/coach/dbcheck') {
      return json(await supa.ping());
    }

    if (path === '/coach/mailguard') {
      if (request.method === 'POST') {
        if (body.email) {
          /* one person, on or off, independent of the global switch */
          const e2 = norm(body.email);
          const off = (await getSetting('mailoff')) || {};
          if (body.off === null) delete off[e2]; else off[e2] = body.off !== false;
          await setSetting('mailoff', off);
        } else {
          await setSetting('mailguard', { suppress: body.suppress !== false,
            at: Date.now(), by: asking || primaryCoach() });
        }
      }
      const g = await getSetting('mailguard');
      const off = (await getSetting('mailoff')) || {};
      return json({ suppress: g ? !!g.suppress : true,
                    clients: Object.keys(clients()).length, off });
    }

    if (path === '/coach/formcheck/reset' && request.method === 'POST') {
      const e = norm(body.email);
      if (!e) return json({ error: 'Which person?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      /* both directions: hand it back, or spend it on their behalf when a
         form check happened somewhere other than the app */
      if (body.used === true) {
        await ensureAcct(e);
        const won = await supa.insertIfAbsent('free_checks', { email: e }, 'email');
        return json({ ok: true, email: e, used: true,
          note: won ? 'Marked as used.' : 'It was already used.' });
      }
      const gone = await supa.remove('free_checks', `email=eq.${enc(e)}`);
      const n = Array.isArray(gone) ? gone.length : 0;
      return json({ ok: true, email: e, cleared: n,
        note: n ? 'They can send another.' : 'They had not used theirs — nothing to clear.' });
    }

    if (path === '/coach/formcheck' && request.method === 'GET') {
      const e = norm(url.searchParams.get('email'));
      if (!e) return json({ error: 'Which person?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      const row = await supa.row('free_checks', `email=eq.${enc(e)}&select=used_at`);
      return json({ email: e, used: !!row, at: row ? ms(row.used_at) : 0 });
    }

    if (path === '/coach/questions') {
      const rows = await supa.rows('questions', 'select=*&order=created_at.desc');
      const out = [];
      for (const q of (rows || [])) {
        if (!owns(q.email)) continue;
        out.push({ id: q.id, email: q.email, name: clients()[q.email] || q.email.split('@')[0],
          body: q.body, answer: q.answer || '', status: q.status,
          at: ms(q.created_at), answeredAt: ms(q.answered_at) });
      }
      return json({ questions: out });
    }

    if (path === '/coach/question/answer' && request.method === 'POST') {
      const id = String(body.id || '').trim();
      const answer = String(body.answer || '').trim().slice(0, 4000);
      if (!id || !answer) return json({ error: 'Which question, and what answer?' }, 400);
      const q = await supa.row('questions', `id=eq.${enc(id)}&select=*`);
      if (!q) return json({ error: 'No such question' }, 404);
      if (!owns(q.email)) return json({ error: 'Not your client' }, 403);
      await supa.update('questions', `id=eq.${enc(id)}`, {
        answer, status: 'answered', answered_at: nowISO(),
        answered_by: asking || primaryCoach() });

      const nm = coachName(asking || coachOf(q.email));
      await email(q.email, `${nm} answered your question`,
        mail({ title: 'Your question has an answer.',
          greeting: (clients()[q.email] || '').split(' ')[0] || '',
          paras: [`<b>You asked:</b> ${esc(q.body)}`, esc(answer)],
          cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
          signoff: { name: nm } }), 'replies');
      return json({ ok: true });
    }

    if (path === '/coach/applications') {
      const rows = await supa.rows('applications', 'select=*&order=created_at.desc');
      return json({ applications: (rows || []).map(a => ({
        id: a.id, email: a.email, name: a.name || '', answers: a.answers || {},
        status: a.status, at: ms(a.created_at) })) });
    }

    if (path === '/coach/application/status' && request.method === 'POST') {
      const id = String(body.id || '').trim();
      const status = ['new', 'replied', 'accepted', 'declined'].includes(body.status)
        ? body.status : null;
      if (!id || !status) return json({ error: 'Which application, and what status?' }, 400);
      await supa.update('applications', `id=eq.${enc(id)}`, { status });
      return json({ ok: true, id, status });
    }

    if (path === '/coach/queue') {
      const roster = await rosterRows();
      const out = [];
      for (const e of Object.keys(roster)) {
        if (!owns(e)) continue;
        for (const s of await subsFor(db, e)) {
          if (s.status !== 'submitted') continue;
          out.push({ email: e, name: clients()[e] || roster[e].name || e,
            coached: !!clients()[e], id: s.id, kind: s.kind, cycle: s.cycle,
            at: s.at, clips: (s.clips || []).length, numbers: s.numbers || {} });
        }
      }
      /* oldest first: the one closest to breaking the 48-hour promise */
      out.sort((a, b) => (a.at || 0) - (b.at || 0));
      return json({ queue: out });
    }

    if (path === '/coach/submissions') {
      const e = norm(url.searchParams.get('email'));
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      return json({ submissions: await subsFor(db, e) });
    }

    /* marking a review done is what starts the next block — the cycle
       advances here and nowhere else */
    if (path === '/coach/submission/reviewed' && request.method === 'POST') {
      const e = norm(body.email);
      const id = String(body.id || '').replace(/[^a-zA-Z0-9]/g, '');
      if (!e || !id) return json({ error: 'Which submission?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      const rec = await supa.row('submissions',
        `id=eq.${enc(id)}&email=eq.${enc(e)}&select=*`);
      if (!rec) return json({ error: 'No such submission' }, 404);
      await supa.update('submissions', `id=eq.${enc(id)}`, {
        status: 'reviewed', reviewed_at: nowISO(),
        reviewed_by: asking || primaryCoach(),
      });
      rec.at = ms(rec.created_at);

      /* If they already replied in the thread, the client has been emailed
         already and a second one is noise. If this was marked reviewed
         without a reply, nothing has told them — and the app says an email
         lands the moment it does. */
      const thread = await threadLoad(db, e);
      const replied = thread.some(m => m.from === 'coach' && (m.at || 0) > (rec.at || 0));
      if (!replied) {
        const nm = coachName(asking || coachOf(e));
        await email(e, 'Your answer is ready',
          mail({
            title: 'Your answer is ready.',
            greeting: (clients()[e] || '').split(' ')[0] || '',
            paras: [`${esc(nm)} has been through what you sent and written it up.
              It is waiting in the app.`],
            cta: { href: `${SITE}/lha-app.html`, label: 'Read it' },
            signoff: { name: nm },
          }), 'replies');
      }

      if (body.nextBlock) {
        await supa.upsert('cycles',
          { email: e, n: (rec.cycle || 1) + 1, started_at: nowISO() }, 'email');
      }
      return json({ ok: true, cycle: rec.cycle, nextBlock: !!body.nextBlock });
    }

    if (path === '/coach/clients') {
      /* CLIENTS alone was not enough: a free account can now send a form
         check and ask about coaching, and one that never appeared here
         would be a question nobody answered. */
      const roster = await rosterRows();
      const rows = Object.values(roster)
        .filter(r => owns(r.email))
        .map(r => ({ ...r, coached: !!clients()[r.email],
          ...(clients()[r.email] ? { coach: coachOf(r.email) } : {}) }));
      return json({ clients: rows.sort((a, b) => b.last - a.last) });
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
        /* opening the thread is what marks it read */
        await markRead(e);
        return json({ messages: await threadLoad(db, e) });
      }
      if (request.method === 'POST') {
        const text = String(body.text || '').slice(0, 4000);
        const video = String(body.video || '').slice(0, 64).replace(/[^a-zA-Z0-9]/g, '');
        const image = String(body.image || '').slice(0, 64).replace(/[^a-zA-Z0-9]/g, '');
        if (!text && !video && !image) return json({ error: 'Nothing to send' }, 400);
        /* answering and marking answered were two separate acts, which is one
           too many — the half that gets forgotten is the one the client is
           waiting on. A reply can carry the submission it answers. */
        const answers = String(body.answers || '').trim();
        await threadAdd(db, e, { from: 'coach', by: asking || primaryCoach(), text,
          ...(video ? { video } : {}), ...(image ? { image } : {}),
          ...(answers ? { sub: answers } : {}) });
        if (answers) {
          await supa.update('submissions', `id=eq.${enc(answers)}&email=eq.${enc(e)}`, {
            status: 'reviewed', reviewed_at: nowISO(),
            reviewed_by: asking || primaryCoach(),
          });
        }

        /* a reply is the thing clients are waiting for, so say so */
        const who2 = coachName(asking || coachOf(e));
        const sent = video ? `${who2} has sent you a video.`
          : image ? `${who2} has sent you a photo.` : `${who2} has replied.`;
        await email(e, `${who2} has replied`,
          mail({
            title: `${who2} has replied.`,
            greeting: (clients()[e] || '').split(' ')[0] || '',
            paras: [text ? esc(text.slice(0, 600)) : esc(sent)],
            cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
            signoff: { name: who2 },
          }), 'replies');
        return json({ ok: true });
      }
    }
  }

  return json({ error: 'No such route' }, 404);
};

export const config = { path: '/api/app/*' };
