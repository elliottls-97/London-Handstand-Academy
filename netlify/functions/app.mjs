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
import { EMAILS, renderEmail } from './emails.mjs';
import { pushReady, pushSubs, pushSave, pushSend } from './push.mjs';

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

let ROSTER = null;                 /* set once per request, never across them */
let REMOVED = new Set();           /* taken off the roster on purpose, this request */
const rosterList = () => ROSTER || parseClients();
const clients = () => Object.fromEntries(rosterList().map(c => [c.email, c.name]));

/* Coaches added from the dashboard, read once at the top of each request so
   that everything downstream can stay a plain synchronous lookup. The
   variable is still the source of the first one: a database nobody can
   reach without a coach account is a poor place for the only way in. */
let COACHES_STORED = {};
let PRICES_STORED = {};
const envCoaches = () => {
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
const coaches = () => Object.assign({}, envCoaches(), COACHES_STORED);
/* the one in the variable, who can add and remove the others. Adding a coach
   is handing over the back office, so it is not something a coach added this
   way can do for themselves. */
const isPrimary = e => Object.keys(envCoaches()).includes(norm(e || ''));

const primaryCoach = () => Object.keys(coaches())[0] || norm(process.env.COACH_EMAIL || '');
/* Whether an account has the tier right now. Stripe sets plus on and off; a
   code sets plus_until, and a date in the past is the same as off, so a
   month free ends on its own without a job to end it. */
/* the shipped check point names, so an email can say "Crow pose" rather
   than "crow" when the key is the ladder's rather than a client's */
const CHECKPOINT_NAMES = { 'ch-assist':'Chair-assisted handstand','fall-comfort':'Falling off the wall',
  'wall-45':'45-degree wall hold', plank:'Plank pose', crow:'Crow pose', chaturanga:'Chaturanga push-ups',
  'kickup-rate':'Kick up to the wall','ctw-hold':'Chest-to-wall handstand','scap-shrugs':'Wall scapula shrugs',
  'sl-tuck':'Single-leg tuck slides','pike-neg':'Pike push-up negatives','pike-full':'Pike push-ups, full reps',
  'nose-toes':'Nose to toes','assist-entry':'Assisted freestanding entries','tuck-depth':'Tuck slides',
  'slide-count':'Slide aways','slide-off':'Coming off the wall','box-dist':'Knees on box, distance',
  'box-time':'Knees on box, hold','step-ups':'Step ups','entry-clean':'Entries to eight clean' };
/* Who is actually holding a place: cancelled and refunded rows stay in the
   list so the history is readable. This lived further down the handler than
   two of the things that call it, and a const is not hoisted, so asking for
   the workshop list and finishing a payment both threw before doing their
   job. Out here it cannot happen again. */
const wsLive = book => (book || []).filter(b => b.status !== 'cancelled' && b.status !== 'refunded');

const plusNow = a => !!a && (!!a.plus || (!!a.plus_until && ms(a.plus_until) > Date.now()));
const coachOf = e => {
  const c = rosterList().find(x => x.email === norm(e));
  return (c && c.coach) || primaryCoach();
};
/* "your coach" is a description, and it was being handed to the app as a
   name: the Ask screen printed it as the heading and took Y as the avatar
   initial, so the coach was anonymous in the one screen that is the whole
   point of coaching. Fall back to whoever is actually the coach here. */
/* Addresses that cannot belong to a person. Deliberately narrow: it
   catches the reserved example domains and the prefixes used for testing
   this app, and nothing else. Anything more clever would eventually hide
   a real client whose address happens to contain the word test. */
const TEST_EMAIL = /@example\.(com|org|net)$|@test\.|^claude-paytest|^lha-test|^livecheck|^paytest/i;

const coachName = e => coaches()[norm(e)]
  || coaches()[primaryCoach()]
  || 'Elliott';

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
  const p = t => `<p style="margin:0 0 16px;font:400 16px/1.62 ${F};color:#4c5654">${t}</p>`;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(
  paras[0] ? String(paras[0]).replace(/<[^>]+>/g, '').slice(0, 110) : title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="background:#f4f4f5;padding:28px 14px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="max-width:560px;background:#ffffff;border-radius:18px;
    border:1px solid #e3e0d6">
    <tr><td style="padding:30px 32px 0;text-align:center">
      <div style="font:700 11px/1 ${F};letter-spacing:.19em;color:#006663;
        text-transform:uppercase">London Handstand Academy</div>
      <div style="height:1px;background:#e3e6e6;margin:24px 0 0"></div>
    </td></tr>
    <tr><td style="padding:30px 32px 8px">
      <h1 style="margin:0 0 18px;font:700 27px/1.22 ${F};color:#111111;
        letter-spacing:-.015em">${esc(title)}</h1>
      ${greeting ? p(`Hi ${esc(greeting)},`) : ''}
      ${paras.map(p).join('')}
      ${box ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="background:#eef4f3;border-radius:12px;margin:6px 0 20px">
        <tr><td style="padding:19px 22px">
          ${box.title ? `<div style="font:700 15px/1.3 ${F};color:#111111;
            margin:0 0 12px">${esc(box.title)}</div>` : ''}
          ${box.items.map((it, i) => `<div style="font:400 15px/1.55 ${F};
            color:#4c5654;margin:0 0 ${i === box.items.length - 1 ? '0' : '11px'}">
            ${box.numbered ? `<b style="color:#006663">${i + 1}.</b> ` : ''}${esc(it)}</div>`).join('')}
        </td></tr></table>` : ''}
      ${cta ? `<table role="presentation" cellpadding="0" cellspacing="0"
        style="margin:4px 0 22px"><tr><td style="border-radius:999px;background:#006663">
        <a href="${esc(cta.href)}" style="display:inline-block;padding:14px 30px;
          font:600 15px/1 ${F};color:#ffffff;text-decoration:none">${esc(cta.label)}</a>
      </td></tr></table>` : ''}
      ${signoff ? p(`${esc(signoff.line || 'Talk soon,')}<br>${esc(signoff.name)}`) : ''}
    </td></tr>
    <tr><td style="padding:6px 32px 28px">
      <div style="height:1px;background:#e3e6e6;margin:0 0 16px"></div>
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
  /* ── a coach is never suppressed ──────────────────────────────────
     This guard exists so a test email cannot reach a paying client while
     the switch is off. It was also silencing the coach: every address in
     the roster is held, and Elliott has an account of his own in there,
     so the one message that says a client has sent a clip was being
     dropped as though it were marketing. Whoever coaches here is told,
     whatever the switch says. */
  if (t && (coaches()[t] !== undefined || t === norm(process.env.COACH_EMAIL || '')
            || t === norm(process.env.FROM_EMAIL || ''))) return true;
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
/* ── how somebody wants to hear, per kind ──────────────────────────
   Replies and reminders are each none, email, push or both. They were a
   yes or no for email that the phone followed as well, so turning reply
   emails off silenced the phone too. Answers saved before read as they
   were meant: yes is both, no is none. Anything with no kind (a password
   reset, a receipt) always goes. */
const CHANNELS = ['none', 'email', 'push', 'both'];
const CHANNEL_KINDS = ['replies', 'reminders'];
const chanOf = (p, kind) => {
  const v = p && p[kind];
  return CHANNELS.includes(v) ? v : v === false ? 'none' : 'both';
};
async function wantsEmail(to, kind) {
  if (!kind) return true;
  try {
    const p = (await getSetting(`prefs:${norm(to)}`)) || {};
    if (CHANNEL_KINDS.includes(kind)) return ['email', 'both'].includes(chanOf(p, kind));
    return p[kind] !== false;
  } catch { return true; }
}
async function wantsPush(to, kind) {
  if (!kind || !CHANNEL_KINDS.includes(kind)) return true;
  try {
    const p = (await getSetting(`prefs:${norm(to)}`)) || {};
    return ['push', 'both'].includes(chanOf(p, kind));
  } catch { return true; }
}

/* ── every send, and why it did not go ─────────────────────────────
   This returned quietly on four different conditions, so an email that
   was never sent looked exactly like one that was: nothing on any screen
   said whether a client had been told anything. The last sixty attempts
   are kept with their outcome, and the dashboard reads them. */
async function mailNote(to, subject, kind, ok, why, skip) {
  try {
    const log = (await getSetting('maillog')) || [];
    log.push({ at: Date.now(), to: norm(to), kind: kind || '', ok: !!ok,
      why: why || '', subject: String(subject || '').slice(0, 80), ...(skip ? { skip: true } : {}) });
    await setSetting('maillog', log.slice(-120));
  } catch { /* a log that fails must never break a send */ }
}
async function email(to, subject, html, kind) {
  if (!process.env.RESEND_API_KEY) return mailNote(to, subject, kind, false, 'Resend is not set up');
  if (!mayEmail(to)) return mailNote(to, subject, kind, false, 'blocked by the EMAIL_ONLY or EMAIL_BLOCK list');
  if (!(await clientMailAllowed(to))) return mailNote(to, subject, kind, false, 'client email is switched off');
  if (!(await wantsEmail(to, kind))) return mailNote(to, subject, kind, false, 'they chose no emails for ' + kind);
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.FROM_EMAIL, to, subject, html }),
    });
    if (r.ok) return mailNote(to, subject, kind, true, '');
    const d = await r.json().catch(() => ({}));
    return mailNote(to, subject, kind, false,
      (d && d.message) || ('Resend said ' + r.status));
  } catch (err) {
    return mailNote(to, subject, kind, false, String((err && err.message) || err));
  }
}

/* ── a notification to their phone ──────────────────────────────
   The same three checks as an email, in the same order: the test lists,
   the mail guard that keeps real clients quiet until it is switched on,
   and what they have chosen to hear about. A phone that never turned
   notifications on is not an attempt, so it is not logged; one that did
   goes into the same log as the emails, so the dashboard shows both. */
async function notify(to, payload, kind) {
  const e = norm(to);
  let rec;
  try { rec = await pushSubs(e); } catch { return; }
  const subj = 'Notification: ' + String((payload && payload.title) || '').slice(0, 70);
  /* said, not silent: "I got the email and not the notification" is
     answered by this line in the dashboard's list of what was sent */
  if (!rec.subs.length) return mailNote(e, subj, kind, false, 'no phone has notifications on for this account', true);
  if (!mayEmail(e)) return mailNote(e, subj, kind, false, 'blocked by the EMAIL_ONLY or EMAIL_BLOCK list');
  if (!(await clientMailAllowed(e))) return mailNote(e, subj, kind, false, 'client email is switched off');
  if (!(await wantsPush(e, kind))) return mailNote(e, subj, kind, false, 'they chose no notifications for ' + kind);
  try {
    const r = await pushSend(e, payload);
    if (r.none) return;
    return mailNote(e, subj, kind, !!r.sent, r.why || '');
  } catch (err) {
    return mailNote(e, subj, kind, false, String((err && err.message) || err));
  }
}

/* ── the coach's own devices ─────────────────────────────────────
   What a client sends lands on the dashboard and in an email, and now as
   a notification on any phone or computer the coach turned them on for.
   Each kind can be switched off from the dashboard's settings. None of
   this goes to a client, so the mail guard has nothing to say about it.
   Never throws: a notification that did not go must not fail the thing
   the client was doing. */
const COACH_ALERT_KINDS = {
  messages: true,     /* messages, clips and questions */
  checkpoints: true,  /* a check point logged with a number */
  told: true,         /* check-ins, a skipped day, how a session felt, a flag */
  trained: false,     /* a session finished */
  business: true,     /* bookings, applications, payments */
  signups: false,     /* a new account, feedback about the app */
};
async function coachAlert(client, kind, payload) {
  try {
    if (!pushReady()) return;
    const to = norm(client ? coachOf(client) : primaryCoach());
    if (!to) return;
    const rec = await pushSubs(to, 'pushcoach');
    if (!rec.subs.length) return;
    const on = Object.assign({}, COACH_ALERT_KINDS, rec.kinds || {});
    if (!on[kind]) return;
    const at = payload && payload.t ? '&t=' + payload.t : '';
    const r = await pushSend(to, Object.assign({
      url: '/lha-coach.html' + (client ? '#c=' + encodeURIComponent(norm(client)) + at : '#today'),
    }, payload, { t: undefined }), 'pushcoach');
    await mailNote(to, 'Dashboard: ' + String((payload && payload.title) || '').slice(0, 70), 'coach', !!r.sent, r.why || '');
  } catch {}
}
const firstNameOf = e => String(clients()[norm(e)] || '').split(' ')[0] || norm(e);

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
/* Is this one of Stripe's own promotion codes? Returns the promotion code
   object's id, which is what a Checkout session takes, plus a line a person
   can read. Never throws: a code we cannot look up is simply not ours. */
async function stripePromo(code) {
  if (!stripeKey() || !code) return null;
  try {
    /* the coupon is not expanded in a list response, so without this the
       label falls back to "a discount" instead of saying 100% off */
    const out = await stripe(
      `/promotion_codes?code=${encodeURIComponent(code)}&active=true&limit=1&expand[]=data.coupon`,
      null, 'GET');
    const p = (out.data || [])[0];
    if (!p || !p.active) return null;
    if (p.expires_at && Date.now() / 1000 > p.expires_at) return null;
    if (p.max_redemptions && (p.times_redeemed || 0) >= p.max_redemptions) return null;
    const co = p.coupon || {};
    const off = co.percent_off ? `${co.percent_off}% off`
      : co.amount_off ? `£${(co.amount_off / 100).toFixed(2)} off` : 'a discount';
    const span = co.duration === 'forever' ? 'for as long as you stay'
      : co.duration === 'repeating' ? `for ${co.duration_in_months} months` : 'on your first month';
    return { id: p.id, label: `${off} ${span}` };
  } catch (err) { return null; }
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
/* plus_until is not a column, because adding one means a migration nobody
   has to run this way: it rides in settings and is folded onto the account
   as it is read, so everything downstream sees one object. */
const plusUntilOf = async e => (await getSetting(`plusuntil:${e}`)) || null;
const getAcct = async e => {
  const a = await supa.row('accounts', `email=eq.${enc(e)}&select=*`);
  if (!a) return a;
  const u = await plusUntilOf(e);
  if (u) a.plus_until = u;
  return a;
};
/* every expiry at once, for the screens that list accounts */
const plusUntilAll = async () => {
  const rows = (await supa.rows('settings', `select=key,value&key=like.plusuntil%3A*`)) || [];
  const out = {};
  for (const r of rows) out[r.key.slice('plusuntil:'.length)] = r.value;
  return out;
};

async function saveAcct(patch, opts) {
  const row = (opts && opts.seen) ? { ...patch, last_seen: nowISO() } : { ...patch };
  return supa.upsert('accounts', row, 'email');
}
/* the client was here. Called where they act, never where we act on them. */
const touchSeen = e => supa.update('accounts', `email=eq.${enc(e)}`, { last_seen: nowISO() })
  .catch(() => {});

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
/* A message's submission column holds tags: the reviews and clips a reply
   answers, and now re:<id> for the message it quotes, as in a chat app.
   Only the first kind is a clip. */
const tagsOf = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
const clipTags = s => tagsOf(s).filter(t => !t.startsWith('re:'));
const quoteOf = s => (tagsOf(s).find(t => t.startsWith('re:')) || '').slice(3);
async function threadLoad(db, who) {
  const rows = await supa.rows('messages',
    `email=eq.${enc(who)}&select=*&order=created_at.asc`);
  return (rows || []).map(m => ({
    id: m.id, from: m.sender, text: m.body || '', at: ms(m.created_at),
    /* the coach opening the thread stamps this, and it has been stamped for
       months without ever reaching the person who sent the clip. Somebody
       who films a wall hold wants to know it was watched, not that it was
       transmitted. */
    /* both ways now: the coach's own messages carry when the client
       opened them, so the dashboard can say whether a reply was read
       rather than only that it was sent */
    ...(m.read_at ? { seen: ms(m.read_at) } : {}),
    ...(m.video ? { video: m.video } : {}),
    ...(m.image ? { image: m.image } : {}),
    ...(clipTags(m.submission).length ? { sub: clipTags(m.submission).join(',') } : {}),
    ...(quoteOf(m.submission) ? { re: quoteOf(m.submission) } : {}),
  }));
}
/* the message being quoted, if it is in this person's thread */
async function quoteId(who, re) {
  const id = String(re || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
  if (!id) return '';
  const r = await supa.row('messages', `id=eq.${enc(id)}&email=eq.${enc(who)}&select=id`).catch(() => null);
  return r ? id : '';
}
/* who is typing, per thread: each side stamps it, the other reads it */
const typingKey = e => `typing:${norm(e)}`;
async function typingSet(e, side) {
  const t = (await getSetting(typingKey(e))) || {};
  t[side] = Date.now();
  await setSetting(typingKey(e), t);
}
async function typingOf(e, side) {
  const t = (await getSetting(typingKey(e)).catch(() => null)) || {};
  return Date.now() - (Number(t[side]) || 0) < 8000 ? Number(t[side]) : 0;
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
/* the client opened the thread: every reply of the coach's that was still
   unread is read now. This is what puts a receipt under Elliott's own
   bubbles in the dashboard. */
const markCoachRead = who => supa.update('messages',
  `email=eq.${enc(who)}&sender=eq.coach&read_at=is.null`, { read_at: nowISO() })
  .catch(() => {});

const markRead = who => supa.update('messages',
  `email=eq.${enc(who)}&sender=eq.client&read_at=is.null`, { read_at: nowISO() });

/* PostgREST says PGRST205 when the relation does not exist. A table that
   has been written but never created is a deploy that is not finished, and
   it must not take a screen down with it. */
const missingTable = err => /PGRST205/.test(String((err && err.message) || err));

/* ── submissions ── */
async function subsFor(db, who) {
  const [rows, replies] = await Promise.all([
    supa.rows('submissions', `email=eq.${enc(who)}&select=*&order=created_at.desc`),
    supa.rows('messages',
      `email=eq.${enc(who)}&sender=eq.coach&submission=not.is.null&select=submission,body,video,created_at`),
  ]);
  const answerFor = {};
  for (const m of (replies || [])) {
    for (const t of clipTags(m.submission)) {
      if (!answerFor[t]) answerFor[t] = { text: m.body || '', video: m.video || null, at: ms(m.created_at) };
    }
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

/* ── a programme's days, cleaned ──────────────────────────────────
   Written once and used by the builder's save and by a block pasted in
   whole, so a block that arrives as JSON cannot carry anything the
   builder could not have produced. */
function cleanDays(list) {
  return (Array.isArray(list) ? list : []).slice(0, 14).map((d, i) => ({
    id: String(d.id || (i + 1)).slice(0, 8),
    label: String(d.label || `Day ${i + 1}`).slice(0, 40),
    sub: String(d.sub || '').slice(0, 60),
    title: String(d.title || '').slice(0, 80),
    when: String(d.when || '').slice(0, 120),
    mins: String(d.mins || '').slice(0, 8),
    groups: (Array.isArray(d.groups) ? d.groups : []).slice(0, 12).map(g => ({
      name: String(g.name || '').slice(0, 60),
      items: (Array.isArray(g.items) ? g.items : []).slice(0, 40).map(it => {
        const num = (x, cap) => {
          const n = Number(x);
          return Number.isFinite(n) && n >= 0 && n <= cap ? Math.round(n) : null;
        };
        const w = num(it.w, 600), r = num(it.r, 600);
        const sets = num(it.sets, 12), amt = num(it.amt, 3600);
        const unit = it.unit === 's' ? 's' : (it.unit === '' ? '' : null);
        return Object.assign(
          { v: String(it.v || '').slice(0, 64),
            d: String(it.d || '').slice(0, 60),
            nt: String(it.nt || '').slice(0, 300) },
          w != null ? { w } : {}, r != null ? { r } : {},
          sets != null ? { sets } : {}, amt != null ? { amt } : {},
          unit != null ? { unit } : {},
          it.star ? { star: String(it.star).slice(0, 40) } : {});
      }).filter(it => it.v),
    })),
  }));
}

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
/* ── may this account send footage now? ───────────────────────────
   A form check is one credit, not one clip: opening it spends the free
   one or a bought one, and until the coach closes it every check point
   clip and every clip in the chat goes in for nothing more. That is how
   somebody sends each check point as they get to it, or a photo to
   follow a question up, without buying the same check twice. */
async function fcGate(who) {
  const ck = `fccredits:${who}`;
  const cur = (await getSetting(ck)) || {};
  if (cur.open) return { ok: true, open: true };
  const won = await supa.insertIfAbsent('free_checks', { email: who }, 'email');
  if (won) { await setSetting(ck, Object.assign({}, cur, { open: true, openedAt: Date.now(), openedWith: 'free' })); return { ok: true, opened: true }; }
  const n = Number(cur.n) || 0;
  if (n <= 0) {
    return { ok: false, error: `That is your free form check used. Elliott watches every one himself, `
      + `so there is one with an account. After that they are ${PRICES.check.label} each, or included with coaching.` };
  }
  await setSetting(ck, Object.assign({}, cur, { n: n - 1, spentAt: Date.now(), open: true, openedAt: Date.now(), openedWith: 'credit' }));
  return { ok: true, opened: true };
}
/* the words for an automated email, with the dashboard's changes on top */
let EMAIL_OVER = null;
async function emailCopy(key, vars) {
  if (EMAIL_OVER === null) EMAIL_OVER = (await getSetting('emails')) || {};
  return renderEmail(key, vars, EMAIL_OVER);
}
const setSetting = (k, value) =>
  supa.upsert('settings', { key: k, value, updated_at: nowISO() }, 'key');
/* many settings in one read, as a map; anything missing is simply absent */
async function settingsMany(keys) {
  const out = {};
  const uniq = [...new Set(keys)];
  for (let i = 0; i < uniq.length; i += 60) {
    const list = uniq.slice(i, i + 60).map(k => '"' + String(k).replace(/"/g, '') + '"').join(',');
    for (const r of (await supa.rows('settings', `key=in.(${enc(list)})&select=key,value`)) || []) out[r.key] = r.value;
  }
  return out;
}
/* a setting that is gone reads as absent, which is not the same as one
   holding an empty object: the programme falls back to the original file */
const dropSetting = k => supa.remove('settings', `key=eq.${enc(k)}`);

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
    supa.rows('messages', 'select=email,created_at,sender,read_at,body,video,image&order=created_at.asc'),
    supa.rows('submissions', 'select=email'),
  ]);

  /* Signing up is not the same as getting in touch. A free account that
     has never sent anything is a lead for the mailing list, not a row
     that should sit in a queue looking like it needs answering — it was
     burying the people who actually wrote to you. */
  const active = new Set();
  const counts = {}; const latest = {}; const lastMsg = {};
  for (const m of (msgs || [])) {
    active.add(m.email);
    latest[m.email] = Math.max(latest[m.email] || 0, ms(m.created_at));
    if (m.sender === 'client' && !m.read_at) counts[m.email] = (counts[m.email] || 0) + 1;
    /* in order, so the last one written is the last one said */
    lastMsg[m.email] = { from: m.sender, text: String(m.body || '').slice(0, 120),
      video: !!m.video, image: !!m.image, at: ms(m.created_at), seen: !!m.read_at };
  }
  for (const s of (subs || [])) active.add(s.email);

  const byEmail = {};
  for (const a of (accounts || [])) {
    if (!active.has(a.email) && !clients()[a.email]) continue;
    byEmail[a.email] = { email: a.email, name: a.name || a.email.split('@')[0],
      last: Math.max(ms(a.last_seen), latest[a.email] || 0),
      unread: counts[a.email] || 0, ...(lastMsg[a.email] ? { lastMsg: lastMsg[a.email] } : {}) };
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
  /* The coaches added from the dashboard, before anything asks who is who.
     Every route but the two that never mention a coach and are the ones
     under load: /ladder is fetched on every app open and the webhook is
     Stripe talking to itself. */
  if (path !== '/ladder' && path !== '/stripe/webhook') {
    try { COACHES_STORED = (await getSetting('coaches')) || {}; } catch { COACHES_STORED = {}; }
  }
  /* the prices, for every route that names one; the webhook needs them too */
  if (path !== '/ladder') {
    try { PRICES_STORED = (await getSetting('prices')) || {}; } catch { PRICES_STORED = {}; }
  }
  /* ── the prices ───────────────────────────────────────────────────
     They lived in five places: the Stripe price ids in Netlify, the
     payment links, the amount-to-plan map in the webhook, the app's copy
     and the terms page. Changing £5 to £10 was a deploy. They are one
     setting now, written from the dashboard, and everything below reads
     it: the checkout picks up a new price id, the webhook files a payment
     by the amount typed here, the app and the site read the labels. What
     was in the environment stays as the fallback. */
  const PRICE_DEFAULTS = {
    plus:     { label: '£10',  amount: 1000,  priceId: '', link: '', founding: false },
    /* the same ladder paid a quarter or a year at a time */
    plusq:    { label: '£39',  amount: 3900,  priceId: '', link: '' },
    plusy:    { label: '£129', amount: 12900, priceId: '', link: '' },
    /* one form check, bought one at a time. Not a subscription any more:
       a clip is an hour of Elliott's week, so each one is paid for. */
    check:    { label: '£20',  amount: 2000,  priceId: '', link: '' },
    online:   { label: '£120', amount: 12000, priceId: '', link: '' },
    inperson: { label: '£190', amount: 19000, priceId: '', link: '' },
    /* online with two or four sessions a month. Labels and amounts are the
       dashboard's to set; until they are, the app does not offer them. */
    inperson2: { label: '', amount: 0, priceId: '', link: '' },
    inperson4: { label: '', amount: 0, priceId: '', link: '' },
    inner:    { label: '£320', amount: 32000, priceId: '', link: '' },
    /* the Inner Circle without the monthly session. The session is an add
       on to either coaching plan now rather than a third plan of its own. */
    inneronline: { label: '£250', amount: 25000, priceId: '', link: '' },
    /* the monthly London session, as the add on it is */
    session:  { label: '£70',  amount: 7000 },
    session60: { label: '£80',  amount: 8000 },     /* one-off, paid on the session page */
    session90: { label: '£100', amount: 10000 },
    trialDays: 7,
    note: 'The price goes up as the ladder fills out. Join now and yours does not.',
  };
  const PRICES = (() => {
    const saved = PRICES_STORED || {};
    const out = {};
    for (const k of Object.keys(PRICE_DEFAULTS)) {
      if (typeof PRICE_DEFAULTS[k] === 'object') out[k] = Object.assign({}, PRICE_DEFAULTS[k], saved[k] || {});
      else out[k] = saved[k] != null ? saved[k] : PRICE_DEFAULTS[k];
    }
    return out;
  })();

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
    /* ── a workshop booking ─────────────────────────────────────────
       Paid through a checkout session this server made, with the workshop
       in the metadata. It is a place on a date, not a subscription, so it
       is recorded and answered here and never touches plus. The payer may
       have no account yet; one is made for them, and the app is opened for
       the days the workshop grants. */
    if (ev.type === 'checkout.session.completed' && obj.metadata && obj.metadata.workshop) {
      const slug = String(obj.metadata.workshop).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24);
      const all = (await getSetting('workshops')) || {};
      const w = all[slug];
      const nm = String((obj.metadata.name || (obj.customer_details && obj.customer_details.name) || '')).slice(0, 60);
      if (!e || !w) {
        await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL, 'A workshop payment could not be filed',
          `<p style="font:16px/1.6 system-ui">${esc(obj.id || '')} for ${esc(e || 'unknown')} on workshop "${esc(slug)}": ${w ? 'no email on the payment' : 'no such workshop'}. The money is in Stripe; the booking is not recorded.</p>`);
        return json({ ok: true, note: 'workshop not filed' });
      }
      const book = (await getSetting(`wsbook:${slug}`)) || [];
      const md = obj.metadata || {};
      /* Stripe delivers at least once, so everything here has to be safe to
         run twice. Recording the place already was. The emails were not, so
         one payment could send the same "you are booked" several times over
         a day or two. */
      const fresh = !book.some(b => b.session === obj.id);
      /* the two things the checkout screens for but a payment can still
         arrive against: someone in two tabs, and the last place going twice */
      const dupPay = fresh && book.some(b => b.email === e && b.status === 'booked');
      const over = fresh && Number(w.places) > 0 && wsLive(book).length >= Number(w.places);
      if (fresh) {
        book.push({ email: e, name: nm, at: Date.now(), session: String(obj.id || ''), paid: Number(obj.amount_total) || 0,
          pi: String(obj.payment_intent || ''), q: String(md.q || '').slice(0, 400), exp: String(md.exp || '').slice(0, 400),
          code: String(md.code || '').slice(0, 24), status: 'booked' });
        await setSetting(`wsbook:${slug}`, book);
        if (md.code) { const codes = (await getSetting('wscodes')) || {}; if (codes[md.code]) { codes[md.code].used = Number(codes[md.code].used || 0) + 1; await setSetting('wscodes', codes); } }
      }
      const mine = (await getSetting(`wsmine:${e}`)) || []; if (!mine.includes(slug)) { mine.push(slug); await setSetting(`wsmine:${e}`, mine); }
      await ensureAcct(e, nm);
      const days = Number(w.appDays) || 0;
      if (days > 0) {
        const cur = await getAcct(e);
        if (!plusNow(cur)) await setSetting(`plusuntil:${e}`, iso(Date.now() + days * DAY));
      }
      const off = (await getSetting('mailoff')) || {};
      if (off[e] === undefined) { off[e] = false; await setSetting('mailoff', off); }
      const whenTxt = w.when ? new Date(w.when).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }) : '';
      if (!fresh) return json({ ok: true, workshop: slug, note: 'already filed' });
      if (dupPay || over) {
        await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL,
          `Look at this booking: ${nm || e} for ${w.title}`,
          mail({ title: 'A booking that needs a look.',
            paras: [`<b>${esc(nm || e)}</b> has paid for <b>${esc(w.title)}</b>.`,
                    dupPay ? 'They already had a place, so this is a second payment from the same person. Refund it in Stripe: only one of the two can be cancelled from the app.' : '',
                    over ? `That is ${wsLive(book).length} places taken against ${w.places}. Either make space or refund this one in Stripe.` : ''].filter(Boolean),
            cta: { href: `${SITE}/lha-coach.html`, label: 'Open the dashboard' } }));
      }
      await email(e, `You are booked: ${w.title}`,
        mail({ title: 'You are booked.', greeting: nm.split(' ')[0] || '',
          paras: [`<b>${esc(w.title)}</b>${whenTxt ? ', ' + esc(whenTxt) : ''}${w.place ? ', at ' + esc(w.place) : ''}.`,
                  w.desc ? esc(w.desc) : '',
                  days > 0 ? `The Handstand Ladder app is open for you for ${days} days, every stage. Sign in with this address and it is there.` : '',
                  `A reminder comes the day before. Sign in to the app with this address to see the booking or cancel it; cancel more than 48 hours before and it is refunded. <a href="${SITE}/api/app/workshop/ics?slug=${slug}" style="color:#006663">Add it to your calendar</a>.`].filter(Boolean),
          cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
          signoff: { name: 'Elliott, London Handstand Academy' } }));
      await coachAlert(null, 'business', { title: 'New booking: ' + (nm || e), body: w.title, tag: 'book:' + e });
      await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL, `Booking: ${nm || e} for ${w.title}`,
        mail({ title: `${esc(nm || e)} has booked.`,
          paras: [`<b>${esc(w.title)}</b>${whenTxt ? ', ' + esc(whenTxt) : ''}. ${wsLive(book).length} of ${w.places || '?'} places taken.${md.code ? ' Code ' + esc(md.code) + '.' : ''}`,
                  md.q ? `Asked: <i>${esc(md.q)}</i>` : '', md.exp ? `Experience: ${esc(md.exp)}` : ''].filter(Boolean),
          cta: { href: `${SITE}/lha-coach.html`, label: 'Open the dashboard' } }));
      return json({ ok: true, workshop: slug, booked: book.length });
    }

    /* ── a one to one session ───────────────────────────────────────
       The room is OverGravity's, not ours, so nobody picks a slot from a
       calendar. They pay, say which days suit, and the time is agreed in
       the thread. Paid first, so the ones who ask mean it. */
    if (ev.type === 'checkout.session.completed' && obj.metadata && obj.metadata.session) {
      const kind = String(obj.metadata.session) === '90' ? '90' : '60';
      const nm = String((obj.metadata.name || (obj.customer_details && obj.customer_details.name) || '')).slice(0, 60);
      const prefs = String(obj.metadata.prefs || '').slice(0, 500);
      if (!e) {
        await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL, 'A session payment had no email',
          `<p style="font:16px/1.6 system-ui">${esc(obj.id || '')}, ${kind} minutes, no email on the payment. It is in Stripe; nothing else was recorded.</p>`);
        return json({ ok: true, note: 'session not filed' });
      }
      const list = (await getSetting('sessions')) || [];
      /* at least once again: a redelivery used to post a second opener into
         the thread and send a second confirmation */
      const freshSess = !list.some(x => x.session === obj.id);
      if (freshSess) {
        list.unshift({ id: 's' + newId(), email: e, name: nm, kind, prefs, at: Date.now(), session: String(obj.id || ''),
          paid: Number(obj.amount_total) || 0, status: 'toArrange', when: '', place: 'OverGravity, Shadwell', note: '' });
        await setSetting('sessions', list.slice(0, 400));
      }
      if (!freshSess) return json({ ok: true, note: 'session already filed' });
      await ensureAcct(e, nm);
      const off = (await getSetting('mailoff')) || {};
      if (off[e] === undefined) { off[e] = false; await setSetting('mailoff', off); }
      try {
        await threadAdd(db, e, { from: 'coach', by: primaryCoach(),
          text: `Thanks, your ${kind} minute session is paid for. ${prefs ? 'You said: "' + prefs + '". ' : ''}I will check the room at OverGravity against that and come back here with a time within 48 hours. If anything changes, say so here.` });
      } catch {}
      await email(e, `Your ${kind} minute session: sorting the time`,
        mail({ title: 'Paid. Now the time.', greeting: nm.split(' ')[0] || '',
          paras: [`Your ${kind} minute session in London is paid for. The room at OverGravity is booked around their timetable, so I check your times against it and confirm within 48 hours.`,
                  prefs ? `You said: <b>${esc(prefs)}</b>.` : 'Reply to this with the days and times that suit you.',
                  'You have an account in the Handstand Ladder app under this address, and the conversation carries on there under Ask as well as by email.'],
          cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
          signoff: { name: 'Elliott, London Handstand Academy' } }));
      await coachAlert(null, 'business', { title: (nm || e) + ' paid for a ' + kind + ' minute session', body: 'Set the time on Today.', tag: 'sess:' + e });
      await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL, `Session to arrange: ${nm || e}, ${kind} min`,
        mail({ title: `${esc(nm || e)} has paid for a ${kind} minute session.`,
          paras: [prefs ? `Prefers: <b>${esc(prefs)}</b>.` : 'No preferred times given.', 'Check the room, then set the time on Today and they get the confirmation.'],
          cta: { href: `${SITE}/lha-coach.html`, label: 'Open the dashboard' } }));
      return json({ ok: true, session: kind });
    }

    let acct = e ? await getAcct(e) : null;
    if (!acct && obj.customer) {
      acct = await supa.row('accounts',
        `stripe_customer=eq.${enc(obj.customer)}&select=*`);
    }
    /* A subscription event carries a customer id and no email, and a
       payment link never wrote the customer onto the account, so every
       later renewal or change from a link buyer came here as "no matching
       account". Ask Stripe who the customer is. */
    if (!acct && obj.customer && stripeKey()) {
      try {
        const cust = await stripe(`/customers/${obj.customer}`, null, 'GET');
        const ce = norm((cust && cust.email) || '');
        if (ce) acct = await getAcct(ce);
      } catch (err) { console.warn('customer lookup', err && err.message); }
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
    /* A failed payment is not a cancelled subscription. Stripe keeps a
       subscription alive in past_due through its whole retry schedule, and
       most of those retries succeed. Switching plus off on the first bounce
       walled a paying subscriber out of the app, then /subscription (which
       counts past_due as paying) turned it back on when they opened the
       Account sheet, and the next subscription.updated turned it off again.
       Stripe ends it for real with subscription.deleted, which is here. */
    const off = ['customer.subscription.deleted', 'customer.subscription.paused'];

    if (on.includes(ev.type)) {
      const status = obj.status || 'active';
      const plusBefore = !!acct.plus;
      acct.plus = !['canceled', 'unpaid', 'incomplete_expired'].includes(status);
      /* the subscription id is what an in-app cancel needs */
      if (obj.subscription) acct.subscription = obj.subscription;
      else if (ev.type.startsWith('customer.subscription') && obj.id) acct.subscription = obj.id;
      if (obj.cancel_at_period_end != null) acct.cancel_at = obj.cancel_at_period_end
        ? iso((obj.current_period_end || 0) * 1000) : null;
      if (obj.customer) acct.stripe_customer = obj.customer;
      /* which product they are on, so the app can tell a ladder subscriber
         from a coached client without asking Stripe again */
      /* the plan: from the metadata a checkout session carries, or, for a
         payment link that carries none, from what was paid */
      /* 10000 is the old coaching price; the link may still carry it */
      /* 18000 is the link on the site until the £190 one replaces it */
      const byAmount = { 500: 'plus', 1000: 'plus', 1500: 'plus', 2000: 'check', 10000: 'online', 12000: 'online', 18000: 'online', 32000: 'inner' };
      for (const k of ['plus', 'plusq', 'plusy', 'check', 'online', 'inperson', 'inperson2', 'inperson4', 'inner', 'inneronline']) {
        const amt = Number(PRICES[k] && PRICES[k].amount);
        if (amt > 0) byAmount[amt] = ({ inperson: 'online', inperson2: 'online', inperson4: 'online', inneronline: 'inner', plusq: 'plus', plusy: 'plus' })[k] || k;
      }
      const boughtPlan = (obj.metadata && obj.metadata.plan)
        || ((obj.currency || 'gbp') === 'gbp' && byAmount[Number(obj.amount_total)]) || '';
      /* ── a form check, bought one at a time ──────────────────────
         Twenty pounds is one clip, not a tier: it adds a credit to the
         account and changes nothing else. A checkout session's status is
         "complete", which the line above read as a paid subscription and
         switched the whole ladder on for the price of one clip. */
      if (boughtPlan === 'check') {
        acct.plus = plusBefore;
        if (ev.type === 'checkout.session.completed') {
          const ck = `fccredits:${acct.email}`;
          const cur = (await getSetting(ck)) || {};
          await setSetting(ck, { n: (Number(cur.n) || 0) + 1, bought: (Number(cur.bought) || 0) + 1, at: Date.now() });
          const first = String(acct.name || '').split(' ')[0];
          const T = await emailCopy('checkCredit', { name: esc(first) });
          await email(acct.email, T.subject,
            mail({ title: T.title,
              greeting: first,
              paras: T.paras,
              cta: { href: `${SITE}/lha-app.html`, label: 'Send the clip' },
              signoff: { name: 'London Handstand Academy' }, footnote: T.footnote || undefined }), 'replies');
        }
        return json({ ok: true, credit: true });
      }
      if (boughtPlan) await setSetting(`plan:${acct.email}`, { plan: boughtPlan, at: Date.now() });
      /* money that matches no tier used to switch the £5 app on and do
         nothing else: no roster, no thread, no email, no alert */
      if (!boughtPlan && ev.type === 'checkout.session.completed' && Number(obj.amount_total) > 500) {
        await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL, `A payment matched no tier: ${acct.email}`,
          mail({ title: 'A payment matched no tier.',
            paras: [`<b>${esc(acct.email)}</b> paid £${(Number(obj.amount_total) / 100).toFixed(2)} and it matched nothing in the prices. They have the app switched on and nothing else. Add them to the roster from the dashboard, or refund it in Stripe.`],
            cta: { href: `${SITE}/lha-coach.html`, label: 'Open the dashboard' } }));
      }
      /* Buying coaching or form checks makes a client, not just a payer.
         Before this the money arrived and nothing else happened: no roster
         entry, no thread, nobody told. */
      if (['online', 'inner'].includes(boughtPlan) && ev.type === 'checkout.session.completed') {
        const e2 = acct.email;
        const stored = (await getSetting('roster')) || {};
        if (!stored[e2] && !clients()[e2]) {
          stored[e2] = { name: acct.name || e2, coach: '', tier: boughtPlan };
          await setSetting('roster', stored);
          /* Joining the roster puts them behind the client email guard, which
             is on by default and is there for two specific people. Someone
             who has just paid is not one of them: they are allowed through
             by name, and can be silenced from their thread like anyone. */
          const off = (await getSetting('mailoff')) || {};
          if (off[e2] === undefined) { off[e2] = false; await setSetting('mailoff', off); }
        }
        const tierName = { check: 'form checks', online: 'coaching', inner: 'Inner Circle' }[boughtPlan];
        const first = String(acct.name || '').split(' ')[0];
        const opener = boughtPlan === 'check'
          ? `Welcome${first ? ' ' + first : ''}. You are set up for form checks. Send a clip here whenever you have one: film from the side, whole body in frame, and I will come back with what to change, in writing, against your own footage.`
          : `Welcome${first ? ' ' + first : ''}. Before I write block one I need to see where you are. Film two things, from the side with your whole body in frame: a chest-to-wall hold for as long as you can, and one freestanding attempt, however it goes. Send them here and I will build the first two weeks from them.`;
        try { await threadAdd(db, e2, { from: 'coach', text: opener }); } catch {}
        await email(coachOf(e2), `New ${tierName} client: ${acct.name || e2}`,
          mail({ title: `Someone just bought ${tierName}.`,
            paras: [`<b>${esc(acct.name || e2)}</b> (${esc(e2)}) is on the roster and has an opening message in their thread asking for a baseline clip.`,
                    boughtPlan === 'online' ? 'Block one is yours to write once the clips arrive.' : 'Their clips will land in the queue like any other.'],
            cta: { href: `${SITE}/lha-coach.html`, label: 'Open the dashboard' },
            signoff: { name: 'London Handstand Academy' } }));
        /* somebody who bought from the website has an account and no
           password, and the sign in screen used to claim one had been sent */
        const noPw = !(await hashFor(db, e2));
        const T = await emailCopy('welcomeCoaching', { name: esc(first), tier: esc(tierName), coach: esc(coachName(coachOf(e2))),
          password_line: noPw ? 'First, a password. Open the app, press Set a password on the sign in screen, and a six digit code comes to this address. Sign in with that password from then on.' : '' });
        await email(e2, T.subject,
          mail({ title: T.title,
            greeting: first,
            paras: T.paras,
            cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
            /* no kind: somebody who has just paid is told they are in
               whatever they have turned off, the same as a receipt */
            signoff: { name: coachName(coachOf(e2)) }, footnote: T.footnote || undefined }));
      }
    } else if (off.includes(ev.type)) {
      acct.plus = false;
    } else if (ev.type === 'invoice.payment_failed') {
      /* Not a cancellation, so nothing is switched off. But nobody was told
         either, and a card that has expired stays expired until somebody
         says so. Stripe retries for a fortnight; this is the only thing
         that turns a bounce back into a payment. */
      const T = await emailCopy('cardFailed', { name: esc((clients()[acct.email] || acct.name || '').split(' ')[0] || '') });
      await email(acct.email, T.subject,
        mail({ title: T.title,
          greeting: (clients()[acct.email] || acct.name || '').split(' ')[0] || '',
          paras: T.paras,
          cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
          signoff: { name: 'London Handstand Academy' }, footnote: T.footnote || undefined }));
      /* the client was told and nobody else was */
      await coachAlert(null, 'business', { title: 'A card was declined', body: clients()[acct.email] || acct.name || acct.email, tag: 'card:' + acct.email });
      await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL,
        `Card declined: ${clients()[acct.email] || acct.name || acct.email}`,
        `<p style="font:16px/1.6 system-ui">A payment from ${esc(acct.email)} failed. They have been
         emailed to update their card. Stripe retries for about two weeks before it cancels.</p>`);
      return json({ ok: true });
    } else if (ev.type === 'customer.subscription.trial_will_end') {
      /* three days out. Nobody should meet the first charge as a surprise:
         that is what gets a small subscription refunded and reported. */
      /* the length of the trial and the price are both settings now, so the
         email says what the checkout actually did rather than £5 and a week */
      const trialTxt = PRICES.trialDays === 7 ? 'free week' : `free ${PRICES.trialDays} days`;
      const priceTxt = (PRICES.plus && PRICES.plus.label) || '£5';
      const T = await emailCopy('trialEnds', { name: esc((clients()[acct.email] || acct.name || '').split(' ')[0] || ''), trial: esc(trialTxt), price: esc(priceTxt) });
      await email(acct.email, T.subject,
        mail({ title: T.title,
          greeting: (clients()[acct.email] || acct.name || '').split(' ')[0] || '',
          paras: T.paras,
          cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
          /* a card is about to be charged, so this is a billing notice and
             not something to opt out of */
          signoff: { name: 'London Handstand Academy' }, footnote: T.footnote || undefined }));
      return json({ ok: true });
    } else {
      return json({ ok: true, ignored: ev.type });
    }
    await saveAcct({ email: acct.email, plus: acct.plus, plus_at: nowISO(),
      subscription: acct.subscription || null, cancel_at: acct.cancel_at || null,
      stripe_customer: acct.stripe_customer || null });

    await coachAlert(null, 'business', { title: acct.plus ? 'New £5 subscriber' : '£5 subscription cancelled', body: acct.email || e, tag: 'plus:' + (acct.email || e) });
    await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL,
      `${acct.plus ? 'New' : 'Cancelled'} £5 subscriber: ${acct.email || e}`,
      `<p style="font:16px/1.6 system-ui">${ev.type} — access is now
       ${acct.plus ? 'on' : 'off'}.</p>`);
    return json({ ok: true });
  }

  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};

  /* who counts as a coached client. The environment variable seeds it; the
     stored roster adds to it and wins on a clash, so a client added in the
     dashboard is live immediately rather than at the next deploy. */
  ROSTER = await (async () => {
    const seed = parseClients();
    const [stored0, planRows] = await Promise.all([
      getSetting('roster'),
      supa.rows('settings', 'key=like.programme%3A*&select=key').catch(() => []),
    ]);
    const stored = stored0 || {};
    const byEmail = new Map(seed.map(c => [c.email, c]));
    REMOVED = new Set();
    for (const [e, v] of Object.entries(stored)) {
      const email = norm(e);
      if (!email) continue;
      if (v === null) { byEmail.delete(email); REMOVED.add(email); continue; }
      byEmail.set(email, { email, name: String(v.name || email).slice(0, 60),
                           coach: norm(v.coach || '') });
    }
    /* ── a programme makes a client ─────────────────────────────────
       The app has always counted someone with a written programme as
       coached, and the dashboard counted only the roster, so an account
       given a programme without being added showed as an enquiry on one
       screen and a client on the other. They are added to the roster the
       first time this sees them, under the name on their account, and
       from then on both screens agree. Taking someone off the roster
       marks them removed, so this does not put them back. */
    const planned = new Set((planRows || []).map(r => norm(String(r.key || '').slice('programme:'.length)))
      .concat(Object.keys(programmes.clients || {}).map(norm)));
    const missing = [...planned].filter(e => e && e.includes('@') && !byEmail.has(e) && !REMOVED.has(e));
    if (missing.length) {
      const accts = (await supa.rows('accounts',
        `email=in.(${enc(missing.map(e => '"' + e + '"').join(','))})&select=email,name`).catch(() => [])) || [];
      let added = 0;
      for (const a of accts) {
        const email = norm(a.email);
        if (!email || byEmail.has(email)) continue;
        const name = String(a.name || email.split('@')[0]).slice(0, 60);
        byEmail.set(email, { email, name, coach: '' });
        stored[email] = { name, coach: '' };
        added++;
      }
      if (added) {
        await setSetting('roster', stored).catch(() => {});
        /* Joining the roster puts someone behind the client email guard,
           which is there for two specific people. These were getting their
           emails and notifications until now, and still do: allowed through
           by name, as a paying sign-up is, and silenced from their thread
           like anyone. */
        try {
          const off = (await getSetting('mailoff')) || {};
          let changed = false;
          for (const a of accts) { const em = norm(a.email); if (em && off[em] === undefined && stored[em]) { off[em] = false; changed = true; } }
          if (changed) await setSetting('mailoff', off);
        } catch {}
      }
    }
    return Array.from(byEmail.values());
  })();

  /* Someone with a written programme is a coached client, whatever the
     roster says. Being coached was read off the roster alone, so an email
     change that moved the account but not the roster entry put a client on
     the free ladder with their plan sitting there unreachable. A programme
     is the more reliable fact of the two, so either one counts. */
  const hasPlan = async e =>
    !!(programmes.clients[e] || (await getSetting(`programme:${e}`)));
  const isCoached = async e => !REMOVED.has(norm(e)) && (!!clients()[e] || await hasPlan(e));

  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  /* a coach signs in with their own email and password like anyone else;
     the shared key still works so nothing breaks mid-change */
  const coachList = () => Object.keys(coaches());
  const isCoach = async () => {
    if (process.env.COACH_KEY && request.headers.get('x-coach-key') === process.env.COACH_KEY) return true;
    /* realMe: a preview token names a client, and a client is never a coach */
    const who = await realMe();
    return !!who && coachList().includes(who);
  };
  /* Who is signed in. Only an app token can write anything.
     A coach previewing a client's app carries a preview token instead:
     it names the client, so every GET answers exactly as it would for
     them, and it is nobody at all the moment a request tries to change
     something. That is the whole of the read-only guarantee, in one
     place, rather than a flag every route has to remember. */
  const realMe = async () => {
    const p = await verify(bearer);
    return p && p.scope === 'app' ? p.email : null;
  };
  const me = async () => {
    const p = await verify(bearer);
    if (!p) return null;
    if (p.scope === 'app') return p.email;
    if (p.scope === 'preview' && request.method === 'GET') return p.email;
    return null;
  };
  const previewing = async () => {
    const p = await verify(bearer);
    return !!(p && p.scope === 'preview');
  };
  /* Anything that decides what something costs, or gives it away, is the
     owner's alone. A coach added from the dashboard runs the coaching: they
     answer, review, write programmes and run a workshop. They do not set
     prices, mint discount codes, comp a tier or publish a workshop, because
     each of those is money out of the business and none of them is visible
     from the coaching screens. The shared key is the owner's own secret, so
     it counts as the owner. */
  const isOwner = async () => {
    if (process.env.COACH_KEY && request.headers.get('x-coach-key') === process.env.COACH_KEY) return true;
    return isPrimary(await me());
  };
  const ownerOnly = { error: 'That one is Elliott\'s. Prices, discount codes and what a workshop costs are set by the account that owns the business. Ask him and he can change it in a moment.' };

  /* ── email a code ── */
  if (path === '/code' && request.method === 'POST') {
    const e = norm(body.email);
    if (!e) return json({ error: 'Email required' }, 400);
    /* A coach is not a client and was not on this list, so asking for a code
       as the coach sent nothing at all. The route answers the same either
       way, so there was no way to see that from the screen. */
    const acct = await getAcct(e);
    const name = clients()[e]
      || (coachList().includes(e) ? (coaches()[e] || e.split('@')[0]) : '')
      || ((acct && acct.name) ? acct.name : '');

    /* Always the same answer. Confirming whether an address is one of your
       clients would let anyone map your client list by typing addresses.
       The test is whether there is an account, not whether we know their
       name: a row created by a thread message, a password reset or a
       booking carries no name, and gating the send on the name meant those
       people asked for a code, were told one was coming, and got nothing,
       with no error anywhere. The name is only the greeting. */
    if (acct || name) {
      const hits = await rateHit(`code:${e}`, 3600000);
      if (hits <= 5) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        await setCode(e, 'login',
          { code, tries: 0, expires_at: iso(Date.now() + CODE_TTL) });
        await email(e, `${code} is your London Handstand Academy code`,
          `<p style="font:16px/1.5 system-ui">Hi ${name || 'there'},</p>
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
                  coached: await isCoached(e), plus: plusNow(acct) });
  }

  /* ── swap a code for a token ── */
  if (path === '/verify' && request.method === 'POST') {
    const e = norm(body.email);
    const acct = await getAcct(e);
    const name = clients()[e]
      || (coachList().includes(e) ? (coaches()[e] || e.split('@')[0]) : '')
      || ((acct && acct.name) ? acct.name : '');
    const bad = () => json({ error: 'Wrong code' }, 401);
    /* the same mistake as /code: this asked for a name where it meant an
       account, so a code that had been sent could not be typed back in */
    if (!e || !(acct || name)) return bad();

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
    return json({ token: await sign({ scope: 'app', email: e, exp: Date.now() + TOKEN_TTL }),
                  client: name || e.split('@')[0],
                  /* /login has always said this and /verify never did, so the
                     code door could not reach the dashboard however the
                     account was configured */
                  coach: coachList().includes(e),
                  coached: await isCoached(e),
                  plus: plusNow(acct) });
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
    /* every other route that creates something is rate limited and this was
       not. An account is two free sessions, so an unlimited rate here is an
       unlimited number of them from one machine. */
    { const ip = request.headers.get('x-nf-client-connection-ip') || 'x';
      if ((await rateHit(`signup:${ip}`, 24 * 3600000)) > 10) {
        return json({ error: 'That is a lot of accounts from one place. Try again tomorrow, or sign in.' }, 429);
      } }
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
      /* Number(0) is falsy, so somebody the quiz placed on Foundations was
         stored with no stage at all and arrived in the dashboard blank */
      stage: (Number.isInteger(Number(body.stage)) ? Number(body.stage)
              : (Number.isInteger(prev.stage) ? prev.stage : null)),
      plus: plusNow(prev),
      stripe_customer: prev.stripe_customer || null,
    };
    await saveAcct(acct);
    /* where the account came from, kept beside it rather than in a column */
    const ref = String(body.ref || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
    if (ref && !prev.email) await setSetting(`ref:${e}`, ref);

    if (!prev.email) {
      /* The thread opens with a line from the coach rather than an empty
         box, so the first thing a new account sees under Ask is a person
         asking if they have a question. It is the cheapest conversation
         starter there is and it was not being started. */
      try {
        await threadAdd(db, e, { from: 'coach',
          text: `Welcome to the ladder. I'm ${coachName(primaryCoach())}, I coach the people this app is built around. If anything about your handstand is confusing, or you want to know what to work on, ask it here. It comes straight to me.` });
      } catch {}
      /* to them, not only to the coach. Transactional: it says what the
         account is and where the app lives, and nothing it did not ask for. */
      const nm = String(acct.name || '').split(' ')[0];
      await email(e, 'Your Handstand Ladder account',
        mail({ title: 'You are in.',
          greeting: nm,
          paras: ['This is the account your progress saves to, so it follows you between phones and survives a lost one.',
                  `Foundations is free for as long as you want it. The five stages above it are ${PRICES.plus.label} a month${Number(PRICES.trialDays) > 0 ? ' with the first ' + (Number(PRICES.trialDays) === 7 ? 'week' : PRICES.trialDays + ' days') + ' free' : ''}, and you can put it on your home screen from the More tab so it opens like an app.`,
                  'If something is wrong, or you have an idea, the pencil in the top bar reaches me directly.'],
          cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
          signoff: { name: 'Elliott, London Handstand Academy' } }), 'replies');
      await coachAlert(null, 'signups', { title: 'New sign-up', body: e, tag: 'signup:' + e });
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
    const isClient = await isCoached(e);
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
           letter-spacing:.24em;color:#111111;background:#eef4f3;border-radius:10px;
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
    /* the app asks this on open, so this is the honest moment to say they
       were here — not whenever some row of theirs happened to be written */
    /* realMe, not me: a coach looking at somebody's app must not make
       that person look like they opened it. */
    await (async () => { const w = await realMe(); if (w) await touchSeen(w); })();
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const acct = (await getAcct(who)) || {};
    const coachedNow = await isCoached(who);
    const usedCheck = !!(await supa.row('free_checks', `email=eq.${enc(who)}&select=email`));
    const fcc = (await getSetting(`fccredits:${who}`)) || {};
    const credits = Number(fcc.n) || 0;
    /* a form check that has been opened and not yet closed by the coach:
       clips and check points go in without spending anything more */
    const checkOpen = !coachedNow && !!fcc.open;
    return json({
      email: who,
      name: clients()[who] || acct.name || '',
      coached: coachedNow,
      coach: coachList().includes(who),
      coachName: (await isCoached(who)) ? coachName(coachOf(who)) : '',
      /* plusNow, not the column: a code's plus_until rides in settings and
         is folded on by getAcct, and this is the read the app refreshes on
         every open, so a WORKSHOP26 account was locking itself again the
         next morning */
      plus: plusNow(acct),
      canManage: !!acct.stripe_customer,
      canCancel: !!(acct.subscription || acct.stripe_customer),
      cancelAt: acct.cancel_at || 0,
      /* the one included form check. Its own key, because nothing else
         writes it: folding it into acct would put it in the path of every
         other account write.
         A form check is Elliott watching footage and writing back, which
         costs him an hour of his week, not a server. One per account is
         the limit and the ledger is the free_checks table, which is what
         makes it a limit rather than a sentence in the copy. */
      /* one per account, free. The plus tier is the ladder and does not
         carry form checks; the check tier puts you on the roster, which is
         what coachedNow reads. */
      freeCheckUsed: !coachedNow && usedCheck,
      /* checks bought one at a time and not yet sent */
      checkCredits: credits,
      checkOpen,
      canCheck: coachedNow || !usedCheck || credits > 0 || checkOpen,
    });
  }

  /* ── start a checkout ─────────────────────────────────────────────
     A Checkout Session rather than a payment link, because a link
     cannot tell us which account paid. */
  /* Which products can be bought without talking to anyone. The ladder was
     the only one; coaching was application-gated with no way to pay. A plan
     only appears here once its Stripe price exists, so switching one on is
     setting an environment variable rather than a deploy of new code. */
  const PLANS = {
    plus:   { price: () => PRICES.plus.priceId   || process.env.STRIPE_PRICE_PLUS,   mode: 'subscription' },
    plusq:  { price: () => (PRICES.plusq||{}).priceId || process.env.STRIPE_PRICE_PLUS_Q, mode: 'subscription' },
    plusy:  { price: () => (PRICES.plusy||{}).priceId || process.env.STRIPE_PRICE_PLUS_Y, mode: 'subscription' },
    inperson: { price: () => PRICES.inperson.priceId || process.env.STRIPE_PRICE_INPERSON, mode: 'subscription' },
    inperson2: { price: () => (PRICES.inperson2||{}).priceId || process.env.STRIPE_PRICE_INPERSON2, mode: 'subscription' },
    inperson4: { price: () => (PRICES.inperson4||{}).priceId || process.env.STRIPE_PRICE_INPERSON4, mode: 'subscription' },
    inneronline: { price: () => (PRICES.inneronline||{}).priceId || process.env.STRIPE_PRICE_INNERONLINE, mode: 'subscription' },
    check:  { price: () => PRICES.check.priceId  || process.env.STRIPE_PRICE_CHECK,  mode: 'payment' },
    online: { price: () => PRICES.online.priceId || process.env.STRIPE_PRICE_ONLINE, mode: 'subscription' },
    inner:  { price: () => PRICES.inner.priceId  || process.env.STRIPE_PRICE_INNER,  mode: 'subscription' },
  };

  /* A Stripe payment link is the other way in. Elliott makes those in the
     Stripe dashboard without needing a price id, so a tier can go live from
     a link alone; the checkout session route is used where a price id has
     been set, because it can carry the account with it. */
  const LINKS = {
    /* the app, a month at a time, as a payment link Elliott made */
    plus:   PRICES.plus.link   || process.env.STRIPE_LINK_PLUS   || 'https://buy.stripe.com/fZu8wP2yz4wc8Pt6SRefC0b',
    check:  PRICES.check.link  || process.env.STRIPE_LINK_CHECK  || 'https://buy.stripe.com/4gMfZhddd7Io8PtgtrefC0f',
    online: PRICES.online.link || process.env.STRIPE_LINK_ONLINE || 'https://buy.stripe.com/14A4gzc999Qw4zd3GFefC00',
    inperson: PRICES.inperson.link || process.env.STRIPE_LINK_INPERSON || 'https://buy.stripe.com/9B69ATa11aUAaXB5ONefC01',
    inperson2: (PRICES.inperson2||{}).link || process.env.STRIPE_LINK_INPERSON2 || 'https://buy.stripe.com/fZueVdc996Ek7LpdhfefC0d',
    inperson4: (PRICES.inperson4||{}).link || process.env.STRIPE_LINK_INPERSON4 || 'https://buy.stripe.com/bJebJ11uv9QwfdRb97efC0e',
    inneronline: (PRICES.inneronline||{}).link || process.env.STRIPE_LINK_INNERONLINE || 'https://buy.stripe.com/fZufZha115Ag4zdb97efC0c',
    inner:  PRICES.inner.link  || process.env.STRIPE_LINK_INNER  || '',
  };
  /* what the app and the site say: labels only, never ids */
  const coplansPublic = () => getSetting('coplans').then(x => x || {});
  const pricesPublic = () => ({
    plus: { label: PRICES.plus.label, amount: PRICES.plus.amount, founding: !!PRICES.plus.founding, note: PRICES.note },
    plusq: { label: (PRICES.plusq||{}).label || '£39', amount: (PRICES.plusq||{}).amount || 3900 },
    plusy: { label: (PRICES.plusy||{}).label || '£129', amount: (PRICES.plusy||{}).amount || 12900 },
    check: { label: PRICES.check.label }, online: { label: PRICES.online.label },
    inperson: { label: PRICES.inperson.label }, inner: { label: PRICES.inner.label },
    inneronline: { label: (PRICES.inneronline||{}).label || '£250' },
    inperson2: { label: (PRICES.inperson2||{}).label || '' }, inperson4: { label: (PRICES.inperson4||{}).label || '' },
    session: { label: (PRICES.session||{}).label || '£70' },
    session60: { label: PRICES.session60.label }, session90: { label: PRICES.session90.label },
    trialDays: Number(PRICES.trialDays) || 0,
  });
  if (path === '/plans') {
    return json({ plans: Object.keys(PLANS).filter(k => !!PLANS[k].price() || !!LINKS[k]),
                  /* the app's month goes through the payment link whenever
                     there is one: a price id left in the environment from
                     the £5 days was quietly winning over the £15 link */
                  links: Object.fromEntries(Object.keys(LINKS).filter(k => LINKS[k] && (k === 'plus' || !PLANS[k].price()))
                    .map(k => [k, LINKS[k]])),
                  prices: pricesPublic(),
                  /* which ways of paying for the ladder exist in Stripe */
                  /* monthly only for now. The quarterly and yearly prices
                     stay wired so switching them back on is this one line. */
                  periods: ['month'],
                  /* what each coaching tier says it includes, where the
                     coach has changed it from what the app ships */
                  coplans: await coplansPublic() });
  }
  if (path === '/coach/prices') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    if (request.method === 'GET') return json({ prices: PRICES, stored: PRICES_STORED || {}, env: {
      plus: !!process.env.STRIPE_PRICE_PLUS, check: !!process.env.STRIPE_PRICE_CHECK,
      online: !!process.env.STRIPE_PRICE_ONLINE, inner: !!process.env.STRIPE_PRICE_INNER } });
    if (request.method === 'POST') {
      if (!(await isOwner())) return json(ownerOnly, 403);
      const next = {};
      const tier = (k) => {
        const t = (body.prices && body.prices[k]) || {};
        const o = {};
        if (typeof t.label === 'string') o.label = t.label.trim().slice(0, 12);
        const a = Number(t.amount); if (Number.isFinite(a) && a >= 0) o.amount = Math.round(a);
        if (typeof t.priceId === 'string') o.priceId = t.priceId.trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 60);
        if (typeof t.link === 'string') o.link = /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/.test(t.link.trim()) ? t.link.trim() : '';
        if (t.founding !== undefined) o.founding = !!t.founding;
        return o;
      };
      for (const k of ['plus', 'plusq', 'plusy', 'check', 'online', 'inperson', 'inperson2', 'inperson4', 'inner', 'inneronline', 'session', 'session60', 'session90']) next[k] = tier(k);
      const td = Number(body.prices && body.prices.trialDays);
      next.trialDays = Number.isFinite(td) ? Math.max(0, Math.min(30, Math.round(td))) : 7;
      if (typeof (body.prices || {}).note === 'string') next.note = body.prices.note.trim().slice(0, 160);
      await setSetting('prices', next);
      PRICES_STORED = next;
      return json({ ok: true, prices: next });
    }
    return json({ error: 'Nope' }, 405);
  }

  if (path === '/checkout' && request.method === 'POST') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    /* an unknown plan used to fall back to 'plus', so a button wired to a
       tier with no price id would quietly take five pounds for it */
    if (body.plan && !Object.prototype.hasOwnProperty.call(PLANS, body.plan)) {
      return json({ error: 'That one is not switched on yet' }, 503);
    }
    let planKey = Object.prototype.hasOwnProperty.call(PLANS, body.plan) ? body.plan : 'plus';
    /* the ladder, paid quarterly or yearly: its own Stripe price, the same
       entitlement. The app sends the period; the plan stays 'plus'. */
    const period = ['month', 'quarter', 'year'].includes(body.period) ? body.period : 'month';
    if (planKey === 'plus' && period === 'quarter') planKey = 'plusq';
    if (planKey === 'plus' && period === 'year') planKey = 'plusy';
    const plan = PLANS[planKey];
    /* Stripe's embedded checkout: the form draws inside the app, and the
       app needs the publishable key and the session's client secret rather
       than a URL. Only when the key is set; otherwise the hosted page. */
    const embedded = !!body.embedded && !!process.env.STRIPE_PUBLISHABLE_KEY;
    /* only ever an id this server handed out from /redeem, never raw user
       input, and Stripe rejects anything that is not a live promotion */
    const promo = /^promo_[A-Za-z0-9]+$/.test(String(body.promo || '')) ? String(body.promo) : '';
    if (!stripeKey() || !plan.price()) {
      return json({ error: 'That one is not switched on yet' }, 503);
    }
    const origin = url.origin;
    try {
      const sess = await stripe('/checkout/sessions', {
        mode: plan.mode,
        'line_items[0][price]': plan.price(),
        'line_items[0][quantity]': '1',
        'metadata[plan]': (planKey === 'plusq' || planKey === 'plusy') ? 'plus' : planKey,
        'metadata[period]': period,
        ...(embedded ? { ui_mode: 'embedded', return_url: `${origin}/lha-app.html?paid=1` } : {}),
        /* seven days before the first charge. Card up front, so the people
           who start it mean it, and it converts unless they cancel. */
        ...(plan.mode === 'subscription' && Number(PRICES.trialDays) > 0
          ? { 'subscription_data[trial_period_days]': String(Number(PRICES.trialDays)) } : {}),
        customer_email: who,
        client_reference_id: who,
        /* a code the app already checked with Stripe arrives applied, so
           nobody has to type it a second time on the Stripe page. Stripe
           refuses discounts and allow_promotion_codes together, so it is
           one or the other. */
        ...(promo ? { 'discounts[0][promotion_code]': promo }
                  : { allow_promotion_codes: 'true' }),
        ...(embedded ? {} : { success_url: `${origin}/lha-app.html?paid=1`,
                              cancel_url: `${origin}/lha-app.html?paid=0` }),
      });
      if (embedded) return json({ clientSecret: sess.client_secret, pk: process.env.STRIPE_PUBLISHABLE_KEY });
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
  /* A clip filmed from the dashboard is written to drills:custom, and this
     read never looked there. libraryNow folds them in, and its comment said
     it was "the only place that has to know". It was not. So a coach could
     film a drill that sits in a written programme, watch it attach, and the
     client's app would still say the video was coming soon, because their
     plan is hydrated through here. Loaded once per request rather than per
     drill, since hydrateItem is sync and runs for every item on the plan. */
  let CUSTOM_NOW = null;
  const ensureCustom = async () => {
    if (!CUSTOM_NOW) CUSTOM_NOW = (await getSetting('drills:custom')) || {};
    return CUSTOM_NOW;
  };
  /* ── a dose in words, from a timing row ──────────────────────────
     library.timing is {work, rest, sets}, not a sentence, and two places
     reached for it as though it were one. A drill in a fix printed
     "[object Object]" where "1 x 60s" belonged, and hydrateItem put the
     same thing on a programme through String(). One reader, so neither
     can do it again. */
  const doseWords = (t) => {
    if (typeof t === 'string') return t;
    if (!t || typeof t !== 'object') return '';
    const sets = Number(t.sets) >= 1 ? Math.round(t.sets) : 1;
    const work = Number(t.work) > 0 ? Math.round(t.work) : 0;
    return work ? `${sets} × ${work}s` : '';
  };
  const libGet = (m, v) => {
    const c = CUSTOM_NOW && CUSTOM_NOW[v];
    if (c) {
      if (m === 'names' && c.n) return c.n;
      if (m === 'video' && c.url) return c.url;
      if (m === 'cues' && Array.isArray(c.cues) && c.cues.length) return c.cues;
      if (m === 'desc' && c.desc) return c.desc;
    }
    return (programmes.library[m] || {})[v];
  };
  function hydrateItem(it) {
    const v = String(it && it.v || '').slice(0, 64);
    if (!v) return null;
    return {
      v,
      n: libGet('names', v) || v,
      d: String(it.d || doseWords(libGet('timing', v)) || '').slice(0, 60),
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
    /* Explainers used to be written into each spec by hand, so the same
       video was pasted per client and nobody could turn one on without a
       rebuild. There is one library now and the plan says which are on. */
    let answers = base.answers || [];
    if (Array.isArray(base.explainers)) {
      const lib = programmes.explainers || {};
      answers = base.explainers.map(v => lib[v]).filter(Boolean)
        .map(x => Object.assign({ t: 'explainer', d: '' }, x));
    }
    return Object.assign({}, base, { days, answers });
  }
  async function planFor(email) {
    await ensureCustom();
    const saved = await getSetting(`programme:${email}`);
    return hydratePlan(saved || programmes.clients[email] || null);
  }

  /* ── the client's own programme ──────────────────────────────────
     The app used to ship one client's plan baked into the HTML, so a
     second client signing in saw the first one's drills. The plan is
     chosen by the token, never by anything the caller sends. */
  /* ── the library, plus whatever the coach has added ──────────────
     programmes.library is generated at build time, so a drill created in
     the dashboard could not appear in it without a deploy. Custom drills
     live in settings and are folded in here, which is the only place that
     has to know they came from somewhere else. */
  const customDrills = () => getSetting('drills:custom').then(d => d || {});
  async function libraryNow() {
    const base = programmes.library || {};
    const extra = await customDrills();
    const keys = Object.keys(extra);
    if (!keys.length) return base;
    const out = {
      names: Object.assign({}, base.names),
      video: Object.assign({}, base.video),
      cues:  Object.assign({}, base.cues),
      desc:  Object.assign({}, base.desc),
      timing: Object.assign({}, base.timing || {}),
    };
    for (const v of keys) {
      const d = extra[v] || {};
      out.names[v] = d.n || v;
      if (d.url) out.video[v] = d.url;
      out.cues[v] = Array.isArray(d.cues) ? d.cues : [];
      out.desc[v] = d.desc || '';
    }
    return out;
  }

  /* ── what the coach has changed about the free ladder ────────────
     The Workouts tab in the dashboard writes drill seconds and doses here,
     and the free app has to be able to read them. It used to read them off
     /programme, which 404s for anyone without a written programme, so every
     edit the coach made reached coached clients only and did nothing at all
     to the app's own workouts. That is the whole point of the tab, so this
     route carries them on their own. Nothing personal is in it. */
  /* ── fixes: a problem, an article, a workout ─────────────────────
     A fix is a named four week programme for one problem: banana back,
     shoulders that will not open, a kick up that goes over. Each has an
     article that says why, blocks of text and film the coach arranges, a
     pool of drills the session builder draws on, and a clip asked for at
     the start and the end so the person can see it worked. Written entirely
     from the dashboard. The app reads only what is live; drills are
     hydrated here from the merged library so a fix can use a drill filmed
     from the dashboard and a free account still gets its name and clip. */
  const FIX_ACCESS = ['free', 'plus'];
  const FIX_BLOCKS = ['h', 'p', 'img', 'vid', 'drill', 'quote'];
  const fixSlug = x => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 20);
  const fixClean = (f) => {
    const slug = fixSlug(f && f.slug || f && f.name);
    if (!slug) return null;
    const str = (v, n) => String(v == null ? '' : v).slice(0, n);
    const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };
    const out = {
      slug,
      name: str(f.name, 60) || slug,
      tag: str(f.tag, 140),                 /* the problem, in one line */
      goal: str(f.goal, 200),               /* what four weeks gets you */
      weeks: num(f.weeks, 4, 1, 12),
      perWeek: num(f.perWeek, 3, 1, 7),
      mins: num(f.mins, 20, 10, 60),
      stage: num(f.stage, 0, 0, 5),         /* whose warm-up to borrow */
      access: FIX_ACCESS.includes(f.access) ? f.access : 'plus',
      live: !!f.live,
      /* a set workout: every drill in this order, the same every time,
         rather than a pool the app rotates through */
      set: !!f.set,
      cover: (f.cover && typeof f.cover === 'object')
        ? { uid: str(f.cover.uid, 64).replace(/[^a-zA-Z0-9]/g, ''), img: str(f.cover.img, 64).replace(/[^a-zA-Z0-9]/g, '') }
        : { uid: '', img: '' },
      article: (Array.isArray(f.article) ? f.article : []).slice(0, 40).map(b => {
        if (!b || !FIX_BLOCKS.includes(b.t)) return null;
        const o = { t: b.t };
        if (b.t === 'h' || b.t === 'p' || b.t === 'quote') o.text = str(b.text, b.t === 'p' ? 2000 : 300);
        if (b.t === 'img') { o.id = str(b.id, 64).replace(/[^a-zA-Z0-9]/g, ''); o.cap = str(b.cap, 200); }
        if (b.t === 'vid') { o.uid = str(b.uid, 64).replace(/[^a-zA-Z0-9]/g, ''); o.cap = str(b.cap, 200);
          /* a file in the R2 bucket, for a long film that would cost by the
             minute on Stream. The bucket's own address only, nothing else. */
          const u = str(b.url, 300);
          if (/^https:\/\/pub-[a-z0-9]+\.r2\.dev\/[^\s"'<>]+\.(mp4|mov|webm|m4v)$/i.test(u)) o.url = u; }
        if (b.t === 'drill') { o.v = str(b.v, 64).replace(/[^a-z0-9-]/g, ''); o.cap = str(b.cap, 200); }
        return o;
      }).filter(Boolean),
      drills: (Array.isArray(f.drills) ? f.drills : []).slice(0, 40).map(d => {
        const v = str(d && d.v, 64).replace(/[^a-z0-9-]/g, '');
        if (!v) return null;
        const o = { v, L: num(d.L, 1, 1, 4), g: str(d.g, 40) || 'Strength', d: str(d.d, 40) };
        /* sets, reps or seconds, and rest, typed rather than read out of the
           dose. Only kept where the coach set them, so an untouched drill
           behaves as it always did. */
        const sets = Number(d.sets), amt = Number(d.amt), r = Number(d.r);
        if (Number.isFinite(sets) && sets >= 1) o.sets = Math.min(12, Math.round(sets));
        if (Number.isFinite(amt) && amt > 0) { o.amt = Math.min(600, Math.round(amt)); o.unit = d.unit === 's' ? 's' : ''; }
        if (Number.isFinite(r) && r >= 0) o.r = Math.min(300, Math.round(r));
        return o;
      }).filter(Boolean),
      warm: (Array.isArray(f.warm) ? f.warm : []).slice(0, 12)
        .map(v => str(v, 64).replace(/[^a-z0-9-]/g, '')).filter(Boolean),
      start: { n: str(f.start && f.start.n, 80), note: str(f.start && f.start.note, 300) },
      finish: { n: str(f.finish && f.finish.n, 80), note: str(f.finish && f.finish.note, 300) },
      updatedAt: Date.now(),
    };
    return out;
  };
  /* names, clips, cues and a dose for every drill a fix names, so the app
     never has to look one up itself */
  const fixHydrate = async (fixes) => {
    const lib = await libraryNow();
    const timing = (await getSetting('timing:custom')) || {};
    const one = f => Object.assign({}, f, {
      drills: (f.drills || []).map(d => Object.assign({}, d, {
        n: (lib.names || {})[d.v] || d.v.replace(/-/g, ' '),
        url: (lib.video || {})[d.v] || '',
        cues: (lib.cues || {})[d.v] || [],
        desc: (lib.desc || {})[d.v] || '',
        d: d.d || ((timing[d.v] || {}).d) || doseWords((lib.timing || {})[d.v]) || '',
      })),
      warmDrills: (f.warm || []).map(v => ({ v, n: (lib.names || {})[v] || v, url: (lib.video || {})[v] || '' })),
      article: (f.article || []).map(b => b.t === 'drill'
        ? Object.assign({}, b, { n: (lib.names || {})[b.v] || b.v, url: (lib.video || {})[b.v] || '' })
        : b),
    });
    return Object.fromEntries(Object.entries(fixes).map(([k, f]) => [k, one(f)]));
  };

  /* ── a paid fix is paid ───────────────────────────────────────────
     This handed every live fix to anybody who asked, with no account at
     all: the whole article, every drill, the doses, the cues and the film
     links, including the ones written for the paid tier. The app knew to
     hide them and the server did not, which is the wrong way round.

     A free fix is still whole and open, because those are the ones doing
     the advertising. A paid one comes back as what it is and what is in
     it, and nothing you could train from. */
  const fixTeaser = f => ({
    slug: f.slug, name: f.name, tag: f.tag, goal: f.goal, stage: f.stage,
    mins: f.mins, weeks: f.weeks, perWeek: f.perWeek, access: f.access,
    live: true, cover: f.cover || {},
    /* enough to say what it is worth, nothing to do it with */
    drillsN: (f.drills || []).length, locked: true,
  });
  if (path === '/fixes' && request.method === 'GET') {
    const all = (await getSetting('fixes')) || {};
    const live = Object.fromEntries(Object.entries(all).filter(([, f]) => f && f.live));
    const full = await fixHydrate(live);
    const who = await me();
    const acct = who ? ((await getAcct(who)) || {}) : {};
    const paid = !!who && (plusNow(acct) || (await isCoached(who)) || coachList().includes(who));
    if (paid) return json({ fixes: full });
    const out = {};
    for (const [k, f] of Object.entries(full)) {
      out[k] = (f && f.access === 'plus') ? fixTeaser(f) : f;
    }
    return json({ fixes: out });
  }
  if (path === '/coach/fixes') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    const all = (await getSetting('fixes')) || {};
    if (request.method === 'GET') {
      return json({ fixes: all, library: await libraryNow() });
    }
    if (request.method === 'POST') {
      if (body.remove) {
        const slug = fixSlug(body.remove);
        delete all[slug];
        await setSetting('fixes', all);
        return json({ ok: true, removed: slug, fixes: all });
      }
      const f = fixClean(body.fix);
      if (!f) return json({ error: 'A fix needs a name' }, 400);
      /* whether a fix is free or inside the paid tier is what it is worth,
         so a coach writes the fix and the owner decides who gets it. A new
         one written by a coach starts in the paid tier, never free. */
      if (!(await isOwner())) f.access = (all[f.slug] || {}).access || 'plus';
      if (!all[f.slug] && Object.keys(all).length >= 40) return json({ error: 'That is a lot of fixes' }, 400);
      /* a slug change is a rename, not a copy */
      const was = fixSlug(body.was || '');
      if (was && was !== f.slug) delete all[was];
      all[f.slug] = Object.assign({}, all[f.slug] || {}, f, { createdAt: (all[f.slug] || {}).createdAt || Date.now() });
      await setSetting('fixes', all);
      return json({ ok: true, fix: all[f.slug], fixes: all });
    }
    return json({ error: 'Nope' }, 405);
  }

  /* ── workshops, without a booking tool ─────────────────────────────
     A workshop has a date and a number of places, so it never needed a
     calendar. Written from the dashboard; the site lists the live ones;
     the booking is a Stripe checkout this server makes with the workshop
     in the metadata; the webhook above turns the payment into a place, a
     confirmation and an open app. The day before and the day after are
     handled by the daily job. */
  const wsSlug = x => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  const wsPublic = (w, booked) => ({ slug: w.slug, title: w.title, when: w.when, place: w.place, price: w.price,
    priceLabel: w.price ? '£' + (w.price / 100).toFixed(2).replace(/\.00$/, '') : 'Free',
    places: w.places, booked, left: Math.max(0, (Number(w.places) || 0) - booked),
    desc: w.desc, appDays: w.appDays, who: w.who || '', film: w.film || '' });
  if (path === '/workshops' && request.method === 'GET') {
    const all = (await getSetting('workshops')) || {};
    const out = [];
    for (const w of Object.values(all)) {
      if (!w || !w.live) continue;
      if (w.when && ms(w.when) < Date.now() - 6 * 3600e3) continue;   /* over */
      const book = (await getSetting(`wsbook:${w.slug}`)) || [];
      out.push(wsPublic(w, wsLive(book).length));
    }
    out.sort((a, b) => ms(a.when) - ms(b.when));
    return json({ workshops: out });
  }
  /* a workshop discount code: pounds or percent off, for one workshop or all,
     with a use count and an expiry. Kept apart from the app codes, which open
     the ladder rather than take money off. */
  const wsCodeCheck = async (slug, code, price) => {
    const c = String(code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
    if (!c) return { off: 0 };
    const codes = (await getSetting('wscodes')) || {};
    const d = codes[c];
    if (!d || d.off === false) return { error: 'That code is not one of ours' };
    /* the dashboard asks for a date, which arrives as midnight, so a code
       set to run until the 30th was dead for the whole of the 30th. The last
       day is a day the code works. */
    if (d.until && ms(d.until) + DAY < Date.now()) return { error: 'That code has expired' };
    if (Number(d.max) > 0 && Number(d.used || 0) >= Number(d.max)) return { error: 'That code has been used up' };
    if (d.workshop && d.workshop !== slug) return { error: 'That code is for a different workshop' };
    const off = d.pct ? Math.round(price * Math.min(100, Number(d.pct)) / 100) : Math.min(price, Math.round(Number(d.pence) || 0));
    return { off, code: c };
  };
  const wsIcs = (w) => {
    const dt = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const start = ms(w.when), end = start + 2 * 3600e3;
    const escI = t => String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//London Handstand Academy//EN', 'BEGIN:VEVENT',
      `UID:ws-${w.slug}@londonhandstandacademy.com`, `DTSTAMP:${dt(Date.now())}`, `DTSTART:${dt(start)}`, `DTEND:${dt(end)}`,
      `SUMMARY:${escI(w.title)}`, `LOCATION:${escI(w.place)}`, `DESCRIPTION:${escI(w.desc)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  };
  if (path === '/workshop/ics' && request.method === 'GET') {
    const slug = wsSlug(url.searchParams.get('slug'));
    const w = ((await getSetting('workshops')) || {})[slug];
    if (!w || !w.when) return json({ error: 'No such workshop' }, 404);
    return new Response(wsIcs(w), { headers: { 'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.ics"` } });
  }
  if (path === '/workshop/code' && request.method === 'POST') {
    /* /workshop/book is rate limited and this was not, so the codes could be
       guessed at any speed from the same page that redeems them */
    { const ip = request.headers.get('x-nf-client-connection-ip') || 'x';
      if ((await rateHit(`wsc:${ip}`, 3600000)) > 40) return json({ error: 'Too many tries' }, 429); }
    const slug = wsSlug(body.slug);
    const w = ((await getSetting('workshops')) || {})[slug];
    if (!w) return json({ error: 'No such workshop' }, 404);
    const r = await wsCodeCheck(slug, body.code, Number(w.price) || 0);
    if (r.error) return json({ error: r.error }, 400);
    const price = Math.max(0, (Number(w.price) || 0) - r.off);
    return json({ ok: true, off: r.off, price, label: price ? '£' + (price / 100).toFixed(2).replace(/\.00$/, '') : 'Free' });
  }
  /* full: take a name for when a place frees up */
  if (path === '/workshop/wait' && request.method === 'POST') {
    const slug = wsSlug(body.slug);
    const e = norm(body.email);
    const nm = String(body.name || '').trim().slice(0, 60);
    if (!slug || !e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return json({ error: 'A name and a real email address' }, 400);
    const w = ((await getSetting('workshops')) || {})[slug];
    if (!w || !w.live) return json({ error: 'That workshop is not open' }, 404);
    const wait = (await getSetting(`wswait:${slug}`)) || [];
    if (!wait.some(x => x.email === e)) { wait.push({ email: e, name: nm, at: Date.now() }); await setSetting(`wswait:${slug}`, wait); }
    return json({ ok: true, position: wait.findIndex(x => x.email === e) + 1 });
  }
  if (path === '/workshop/book' && request.method === 'POST') {
    const slug = wsSlug(body.slug);
    const e = norm(body.email);
    const nm = String(body.name || '').trim().slice(0, 60);
    const qn = String(body.q || '').trim().slice(0, 400);
    const exp = String(body.exp || '').trim().slice(0, 400);
    if (!slug || !e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || !nm) return json({ error: 'A name and a real email address' }, 400);
    const all = (await getSetting('workshops')) || {};
    const w = all[slug];
    if (!w || !w.live) return json({ error: 'That workshop is not open for booking' }, 404);
    const book = (await getSetting(`wsbook:${slug}`)) || [];
    const live = wsLive(book);
    if (Number(w.places) > 0 && live.length >= Number(w.places)) return json({ error: 'That one is full', full: true }, 409);
    if (live.some(b => b.email === e)) return json({ error: 'You are already booked on this one. Check your email.' }, 409);
    const disc = await wsCodeCheck(slug, body.code, Number(w.price) || 0);
    if (disc.error) return json({ error: disc.error }, 400);
    const price = Math.max(0, (Number(w.price) || 0) - disc.off);
    if (!(price > 0)) {
      /* free, or a code that made it free: booked straight away, no Stripe */
      book.push({ email: e, name: nm, at: Date.now(), session: 'free-' + newId(), paid: 0, q: qn, exp, code: disc.code || '', status: 'booked' });
      await setSetting(`wsbook:${slug}`, book);
      if (disc.code) { const codes = (await getSetting('wscodes')) || {}; if (codes[disc.code]) { codes[disc.code].used = Number(codes[disc.code].used || 0) + 1; await setSetting('wscodes', codes); } }
      await ensureAcct(e, nm);
      const mine = (await getSetting(`wsmine:${e}`)) || []; if (!mine.includes(slug)) { mine.push(slug); await setSetting(`wsmine:${e}`, mine); }
      /* The paid path opens the app for the days the workshop grants and the
         booked screen promises it either way. The free path did not, so a free
         place, or a code that made it free, sent someone to an app that had
         nothing in it. */
      const freeDays = Number(w.appDays) || 0;
      if (freeDays > 0) {
        const cur = await getAcct(e);
        if (!plusNow(cur)) await setSetting(`plusuntil:${e}`, iso(Date.now() + freeDays * DAY));
      }
      const off = (await getSetting('mailoff')) || {}; if (off[e] === undefined) { off[e] = false; await setSetting('mailoff', off); }
      const whenTxt = w.when ? new Date(w.when).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }) : '';
      await email(e, `You are booked: ${w.title}`, mail({ title: 'You are booked.', greeting: nm.split(' ')[0] || '',
        paras: [`<b>${esc(w.title)}</b>${whenTxt ? ', ' + esc(whenTxt) : ''}${w.place ? ', at ' + esc(w.place) : ''}.`,
                freeDays > 0 ? `The Handstand Ladder app is open for you for ${freeDays} days, every stage. Sign in with this address and it is there.` : '',
                'A reminder comes the day before. Sign in to the app with this address to see the booking or cancel it.'].filter(Boolean),
        cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' }, signoff: { name: 'Elliott, London Handstand Academy' } }));
      await coachAlert(null, 'business', { title: 'New booking: ' + nm, body: w.title, tag: 'book:' + nm });
      await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL, `Booking: ${nm} for ${w.title}`, mail({ title: `${esc(nm)} has booked.`,
        paras: [`<b>${esc(w.title)}</b>. ${live.length + 1} of ${w.places || '?'} places.${disc.code ? ' Code ' + esc(disc.code) + '.' : ''}`, qn ? `Asked: <i>${esc(qn)}</i>` : '', exp ? `Experience: ${esc(exp)}` : ''].filter(Boolean),
        cta: { href: `${SITE}/lha-coach.html`, label: 'Open the dashboard' } }));
      return json({ ok: true, free: true });
    }
    if (!stripeKey()) return json({ error: 'Booking is not switched on yet' }, 503);
    const ip = request.headers.get('x-nf-client-connection-ip') || 'x';
    if ((await rateHit(`wsb:${ip}`, 3600000)) > 20) return json({ error: 'Too many tries' }, 429);
    try {
      const sess = await stripe('/checkout/sessions', {
        mode: 'payment',
        'line_items[0][price_data][currency]': 'gbp',
        'line_items[0][price_data][unit_amount]': String(Math.round(price)),
        'line_items[0][price_data][product_data][name]': String(w.title).slice(0, 120),
        ...(w.when ? { 'line_items[0][price_data][product_data][description]': String(new Date(w.when).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }) + (w.place ? ', ' + w.place : '')).slice(0, 200) } : {}),
        'line_items[0][quantity]': '1',
        'metadata[workshop]': slug,
        'metadata[name]': nm,
        'metadata[q]': qn, 'metadata[exp]': exp, 'metadata[code]': disc.code || '',
        customer_email: e,
        success_url: `${url.origin}/workshop.html?slug=${slug}&booked=1`,
        cancel_url: `${url.origin}/workshop.html?slug=${slug}`,
      });
      return json({ url: sess.url });
    } catch (err) {
      return json({ error: String(err.message || err) }, 502);
    }
  }
  if (path === '/coach/workshops') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    const all = (await getSetting('workshops')) || {};
    const withBook = async () => {
      const out = [];
      for (const w of Object.values(all)) {
        const book = (await getSetting(`wsbook:${w.slug}`)) || [];
        const wait = (await getSetting(`wswait:${w.slug}`)) || [];
        out.push(Object.assign({}, w, { bookings: book, waitlist: wait }));
      }
      return out.sort((a, b) => ms(b.when) - ms(a.when));
    };
    if (request.method === 'GET') return json({ workshops: await withBook() });
    if (request.method === 'POST') {
      /* A coach can write the workshop: the title, the date, the room, who
         it is for, the words. What it costs and whether it goes on sale are
         the owner's, so those three fields keep whatever is already stored
         and a new workshop cannot be put on sale by anyone else. Deleting
         one with bookings against it is money too. */
      const owner = await isOwner();
      if (body.remove) {
        if (!owner) return json(ownerOnly, 403);
        const slug = wsSlug(body.remove);
        /* the comment used to say bookings were money and then delete them
           anyway: no refund, no email, and they vanished from the customer's
           app. Take them off it one at a time first, or say so deliberately. */
        const held = wsLive((await getSetting(`wsbook:${slug}`)) || []);
        if (held.length && !body.evenWithBookings) {
          return json({ error: `${held.length} ${held.length === 1 ? 'person has' : 'people have'} a place on that one. `
            + 'Refund them in Stripe and cancel their places first, or tick the box to delete it anyway.',
            bookings: held.length }, 409);
        }
        delete all[slug];
        await setSetting('workshops', all);
        return json({ ok: true, workshops: await withBook() });
      }
      const f = body.workshop || {};
      const slug = wsSlug(f.slug || f.title);
      if (!slug) return json({ error: 'A workshop needs a title' }, 400);
      const str = (v, n) => String(v == null ? '' : v).slice(0, n);
      const whenMs = ms(f.when);
      const w = {
        slug, title: str(f.title, 80) || slug,
        when: whenMs ? new Date(whenMs).toISOString() : '',
        place: str(f.place, 120), desc: str(f.desc, 600), who: str(f.who, 80),
        /* on a rename the stored record is under the old slug, and reading
           the new one would quietly make the workshop free */
        price: owner ? Math.max(0, Math.round(Number(f.price) || 0))
                     : Math.max(0, Math.round(Number(
                         (all[slug] || all[wsSlug(body.was || '')] || {}).price) || 0)),
        places: Math.max(0, Math.min(200, Math.round(Number(f.places) || 0))),
        appDays: Math.max(0, Math.min(365, Math.round(Number(f.appDays) || 0))),
        reviewUrl: /^https:\/\//.test(str(f.reviewUrl, 300)) ? str(f.reviewUrl, 300) : '',
        /* the film that sells it, as a Stream id. The app's card was built
           around one typed into the app itself, which is why it went on
           advertising a workshop that had happened. */
        film: /^[a-f0-9]{32}$/.test(str(f.film, 40)) ? str(f.film, 40) : '',
        live: owner ? !!f.live : !!(all[slug] || all[wsSlug(body.was || '')] || {}).live,
        createdAt: (all[slug] || {}).createdAt || Date.now(),
      };
      const was = wsSlug(body.was || '');
      if (was && was !== slug) {
        delete all[was];
        const oldBook = await getSetting(`wsbook:${was}`);
        if (oldBook) await setSetting(`wsbook:${slug}`, oldBook);
        const oldWait = await getSetting(`wswait:${was}`);
        if (oldWait) await setSetting(`wswait:${slug}`, oldWait);
        /* every customer keeps their own list of what they have booked, by
           slug. Renaming moved the booking list and left those behind, so the
           booking disappeared out of their app and took the cancel button
           with it. */
        for (const b of (oldBook || [])) {
          const mine = (await getSetting(`wsmine:${b.email}`)) || [];
          const next = mine.map(x => (x === was ? slug : x));
          if (!next.includes(slug)) next.push(slug);
          await setSetting(`wsmine:${b.email}`, [...new Set(next)]);
        }
      }
      all[slug] = w;
      await setSetting('workshops', all);
      return json({ ok: true, workshop: w, workshops: await withBook() });
    }
    return json({ error: 'Nope' }, 405);
  }

  /* ── one to one sessions: pay, then arrange ───────────────────────── */
  if (path === '/session/book' && request.method === 'POST') {
    const kind = String(body.kind) === '90' ? '90' : '60';
    const e = norm(body.email);
    const nm = String(body.name || '').trim().slice(0, 60);
    const prefs = String(body.prefs || '').trim().slice(0, 500);
    if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || !nm) return json({ error: 'A name and a real email address' }, 400);
    if (!stripeKey()) return json({ error: 'Booking is not switched on yet' }, 503);
    const ip = request.headers.get('x-nf-client-connection-ip') || 'x';
    if ((await rateHit(`ssb:${ip}`, 3600000)) > 20) return json({ error: 'Too many tries' }, 429);
    const price = PRICES[kind === '90' ? 'session90' : 'session60'];
    try {
      const sess = await stripe('/checkout/sessions', {
        mode: 'payment',
        'line_items[0][price_data][currency]': 'gbp',
        'line_items[0][price_data][unit_amount]': String(Math.round(Number(price.amount) || 0)),
        'line_items[0][price_data][product_data][name]': `One to one session, ${kind} minutes, London`,
        'line_items[0][price_data][product_data][description]': 'Time arranged with you after payment, around the room at OverGravity.',
        'line_items[0][quantity]': '1',
        'metadata[session]': kind, 'metadata[name]': nm, 'metadata[prefs]': prefs,
        customer_email: e,
        success_url: `${url.origin}/session.html?booked=1&kind=${kind}`,
        cancel_url: `${url.origin}/session.html?kind=${kind}`,
      });
      return json({ url: sess.url });
    } catch (err) { return json({ error: String(err.message || err) }, 502); }
  }
  if (path === '/coach/sessions') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    /* who is asking, and which of these are theirs. The block further down
       works this out for every other coach route, and this one is not in
       that block, so it has to do it for itself. It was reading those two
       names out of a scope it cannot see, which threw on every call: the
       dashboard swallowed the 500 and showed an empty inbox, so a paid
       session never reached anybody. */
    const asking = await me();
    const owns = e => !asking || !clients()[norm(e)] || coachOf(e) === asking;
    const list = (await getSetting('sessions')) || [];
    if (request.method === 'GET') return json({ sessions: list.filter(x => owns(x.email)) });
    if (request.method === 'POST') {
      const id = String(body.id || '');
      const row = list.find(x => x.id === id);
      if (!row || !owns(row.email)) return json({ error: 'No such session' }, 404);
      const wasArranged = row.status === 'arranged';
      if (body.when !== undefined) { const t = ms(body.when); row.when = t ? new Date(t).toISOString() : ''; }
      if (typeof body.place === 'string') row.place = body.place.slice(0, 120);
      if (typeof body.note === 'string') row.note = body.note.slice(0, 300);
      if (['toArrange', 'arranged', 'done', 'cancelled'].includes(body.status)) row.status = body.status;
      else if (row.when && row.status === 'toArrange') row.status = 'arranged';
      await setSetting('sessions', list);
      /* the confirmation, once, when a time is set */
      if (row.status === 'arranged' && row.when && !wasArranged) {
        const whenTxt = new Date(row.when).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
        try { await threadAdd(db, row.email, { from: 'coach', by: asking || primaryCoach(),
          text: `Confirmed: ${whenTxt}${row.place ? ', at ' + row.place : ''}. ${row.note || 'Wear something you can move in. See you there.'}` }); } catch {}
        await email(row.email, `Confirmed: your session, ${whenTxt}`,
          mail({ title: 'Your session is confirmed.', greeting: String(row.name || '').split(' ')[0],
            paras: [`<b>${esc(whenTxt)}</b>${row.place ? ', at ' + esc(row.place) : ''}. ${row.kind} minutes.`,
                    row.note ? esc(row.note) : 'Wear something you can move in and arrive a few minutes early.',
                    'A reminder comes the day before. If you need to move it, reply to this.'],
            signoff: { name: coachName(asking || primaryCoach()) } }));
      }
      return json({ ok: true, session: row, sessions: list.filter(x => owns(x.email)) });
    }
    return json({ error: 'Nope' }, 405);
  }

  /* what this account has booked, and cancelling one */
  if (path === '/me/bookings' && request.method === 'GET') {
    const who = await me(); if (!who) return json({ error: 'Sign in first' }, 401);
    const mine = (await getSetting(`wsmine:${who}`)) || [];
    const all = (await getSetting('workshops')) || {};
    const out = [];
    for (const slug of mine) {
      const w = all[slug]; if (!w) continue;
      const book = (await getSetting(`wsbook:${slug}`)) || [];
      const b = book.slice().reverse().find(x => x.email === who); if (!b) continue;
      out.push({ slug, title: w.title, when: w.when, place: w.place, status: b.status || 'booked', paid: b.paid || 0,
        /* a workshop with no date yet reads as 1970, so it counted as already
           over: it could be booked and paid for and never cancelled */
        canCancel: (b.status || 'booked') === 'booked' && (!w.when || ms(w.when) > Date.now()),
        refundable: (b.status || 'booked') === 'booked' && (b.paid || 0) > 0
          && (!w.when || ms(w.when) - Date.now() > 48 * 3600e3) });
    }
    out.sort((a, b) => ms(a.when) - ms(b.when));
    return json({ bookings: out });
  }
  if (path === '/workshop/cancel' && request.method === 'POST') {
    const who = await me(); if (!who) return json({ error: 'Sign in first' }, 401);
    const slug = wsSlug(body.slug);
    const w = ((await getSetting('workshops')) || {})[slug];
    if (!w) return json({ error: 'No such workshop' }, 404);
    const book = (await getSetting(`wsbook:${slug}`)) || [];
    const b = book.slice().reverse().find(x => x.email === who && (x.status || 'booked') === 'booked');
    if (!b) return json({ error: 'No booking to cancel' }, 404);
    if (w.when && ms(w.when) < Date.now()) return json({ error: 'That one has already happened' }, 400);
    /* no date set yet is not "48 hours away", it is "not arranged", and the
       money should come back */
    const early = !w.when || ms(w.when) - Date.now() > 48 * 3600e3;
    let refunded = false, refundErr = '';
    if (early && b.pi && (b.paid || 0) > 0 && stripeKey()) {
      try { await stripe('/refunds', { payment_intent: b.pi }); refunded = true; }
      catch (err) { refundErr = String(err.message || err); }
    }
    b.status = refunded ? 'refunded' : 'cancelled'; b.cancelledAt = Date.now();
    await setSetting(`wsbook:${slug}`, book);
    const whenTxt = w.when ? new Date(w.when).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }) : '';
    await email(who, `Cancelled: ${w.title}`, mail({ title: 'Your place is cancelled.', greeting: String(b.name || '').split(' ')[0],
      paras: [`<b>${esc(w.title)}</b>${whenTxt ? ', ' + esc(whenTxt) : ''}.`,
              refunded ? `Refunded in full to the card you paid with; it shows in a few days.`
                : (b.paid || 0) > 0 ? (early ? 'The refund could not be made automatically, so Elliott will do it by hand.' : 'Inside 48 hours the place cannot be refilled, so it is not refunded automatically. If something serious has happened, reply to this.') : ''].filter(Boolean),
      signoff: { name: 'Elliott, London Handstand Academy' } }));
    await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL, `Cancelled: ${b.name || who}, ${w.title}`,
      mail({ title: `${esc(b.name || who)} has cancelled.`, paras: [`<b>${esc(w.title)}</b>. ${refunded ? 'Refunded automatically.' : (early ? 'Refund it in Stripe: ' + esc(refundErr || 'no payment intent on the booking') : 'Inside 48 hours, not refunded.')} ${wsLive(book).length} of ${w.places || '?'} places taken now.`],
        cta: { href: `${SITE}/lha-coach.html`, label: 'Open the dashboard' } }));
    /* somebody waiting gets first go at the place */
    const wait = (await getSetting(`wswait:${slug}`)) || [];
    if (wait.length && Number(w.places) > 0 && wsLive(book).length < Number(w.places)) {
      const first = wait.shift(); await setSetting(`wswait:${slug}`, wait);
      await email(first.email, `A place has opened up: ${w.title}`, mail({ title: 'A place has opened up.', greeting: String(first.name || '').split(' ')[0],
        paras: [`<b>${esc(w.title)}</b>${whenTxt ? ', ' + esc(whenTxt) : ''}. You were next on the list. It is first come, so book now if you still want it.`],
        cta: { href: `${SITE}/workshop.html?slug=${slug}`, label: 'Book the place' }, signoff: { name: 'Elliott, London Handstand Academy' } }));
    }
    return json({ ok: true, status: b.status });
  }
  if (path === '/coach/wscodes') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    const codes = (await getSetting('wscodes')) || {};
    const list = () => Object.keys(codes).sort().map(k => Object.assign({ code: k }, codes[k]));
    if (request.method === 'GET') return json({ codes: list() });
    if (request.method === 'POST') {
      if (!(await isOwner())) return json(ownerOnly, 403);
      const c = String(body.code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
      if (!c) return json({ error: 'A code needs letters' }, 400);
      if (body.remove) { delete codes[c]; await setSetting('wscodes', codes); return json({ ok: true, codes: list() }); }
      codes[c] = Object.assign({}, codes[c] || {}, {
        pence: Math.max(0, Math.round(Number(body.pence) || 0)), pct: Math.max(0, Math.min(100, Math.round(Number(body.pct) || 0))),
        max: Math.max(0, Math.round(Number(body.max) || 0)), until: ms(body.until) ? new Date(ms(body.until)).toISOString() : '',
        workshop: wsSlug(body.workshop || ''), note: String(body.note || '').slice(0, 80), used: Number((codes[c] || {}).used || 0) });
      await setSetting('wscodes', codes);
      return json({ ok: true, codes: list() });
    }
    return json({ error: 'Nope' }, 405);
  }

  if (path === '/ladder' && request.method === 'GET') {
    return json({ ladderExtra: (await getSetting('ladder:extra')) || {},
                  /* drills the coach has taken off a stage */
                  ladderOff:   (await getSetting('ladder:off')) || {},
                  homeOrder:   (await getSetting('home:order')) || 'explainersFirst',
                  /* explainers the coach added from the dashboard, by phase */
                  explainExtra: (await getSetting('explain:extra')) || [],
                  timing:      (await getSetting('timing:custom')) || {},
                  /* the three workouts, written out drill by drill where the
                     coach has written them. Empty means the stage is still
                     built from the level shares. */
                  ladderBands: (await getSetting('ladder:bands')) || {},
                  /* the level shares per stage, so a stage can have its own
                     mix rather than every stage sharing the shipped one */
                  ladderMix:   (await getSetting('ladder:mix')) || {},
                  /* sets and reps that apply only inside one band, so the
                     same drill can be lighter in Easier than in Harder */
                  bandTiming:  (await getSetting('ladder:bandtiming')) || {},
                  /* the ladder's own check points, where the coach has
                     changed a wording, a target or the drill demonstrating it */
                  ladderCps:   (await getSetting('ladder:checkpoints')) || {},
                  /* the words the coach has added for finding an explainer */
                  explainKeys: (await getSetting('explain:keys')) || {},
                  /* how long a session may be, and what a short one does
                     about sets. Shipped defaults until the coach sets them. */
                  shortRules:  (await getSetting('ladder:short')) || {} });
  }

  /* ── the session lengths, and what a short one is ────────────────
     The app shipped these as constants: the times on the chooser, the
     length under which every drill gets one set, and how many of the last
     drills are exempt from that because they are the work. They are the
     coach's numbers, not the app's, so they are editable. */
  /* ── the automated emails, editable ── */
  if (path === '/coach/emails') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    const over = (await getSetting('emails')) || {};
    if (request.method === 'GET') return json({ defaults: EMAILS, overrides: over });
    if (request.method === 'POST') {
      if (!(await isOwner())) return json(ownerOnly, 403);
      const key = String(body.key || '');
      if (!EMAILS[key]) return json({ error: 'No such email' }, 400);
      if (body.reset) { delete over[key]; }
      else {
        const o = {};
        if (typeof body.subject === 'string') o.subject = body.subject.trim().slice(0, 140);
        if (typeof body.title === 'string') o.title = body.title.trim().slice(0, 200);
        if (typeof body.paras === 'string') o.paras = body.paras.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).slice(0, 12).map(p => p.slice(0, 1500));
        if (Array.isArray(body.paras)) o.paras = body.paras.map(p => String(p || '').trim()).filter(Boolean).slice(0, 12).map(p => p.slice(0, 1500));
        if (typeof body.footnote === 'string') o.footnote = body.footnote.trim().slice(0, 300);
        /* written on the canvas: the same blocks a fix uses */
        if (Array.isArray(body.blocks)) {
          const str = (v, n) => String(v == null ? '' : v).slice(0, n);
          o.blocks = body.blocks.slice(0, 30).map(b => {
            if (!b || !['h', 'p', 'quote', 'img', 'vid', 'drill'].includes(b.t)) return null;
            const x = { t: b.t };
            if (b.t === 'h' || b.t === 'p' || b.t === 'quote') x.text = str(b.text, b.t === 'p' ? 2000 : 300);
            if (b.t === 'img') { x.id = str(b.id, 64).replace(/[^a-zA-Z0-9]/g, ''); x.cap = str(b.cap, 200); }
            if (b.t === 'vid') { x.uid = str(b.uid, 64).replace(/[^a-zA-Z0-9]/g, ''); x.cap = str(b.cap, 200);
              const u = str(b.url, 300); if (/^https:\/\/pub-[a-z0-9]+\.r2\.dev\/[^\s"'<>]+\.(mp4|mov|webm|m4v)$/i.test(u)) x.url = u; }
            if (b.t === 'drill') { x.v = str(b.v, 64).replace(/[^a-z0-9-]/g, ''); x.n = str(b.n, 80); x.url = str(b.url, 300); x.cap = str(b.cap, 200); }
            return x;
          }).filter(Boolean);
          if (!o.blocks.length) delete o.blocks;
        }
        over[key] = o;
      }
      await setSetting('emails', over);
      EMAIL_OVER = null;
      return json({ ok: true, overrides: over });
    }
  }
  /* where the fixes sit on the Train screen: above or below the explainers */
  if (path === '/coach/home') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    if (request.method === 'GET') return json({ homeOrder: (await getSetting('home:order')) || 'explainersFirst' });
    if (request.method === 'POST') {
      if (!(await isOwner())) return json(ownerOnly, 403);
      const v = body.homeOrder === 'fixesFirst' ? 'fixesFirst' : 'explainersFirst';
      await setSetting('home:order', v);
      return json({ ok: true, homeOrder: v });
    }
  }
  if (path === '/coach/short') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    if (request.method === 'GET') return json({ shortRules: (await getSetting('ladder:short')) || {} });
    if (request.method === 'POST') {
      if (!(await isOwner())) return json(ownerOnly, 403);
      const r = body.shortRules || {};
      const num = (v, lo, hi, dflt) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : dflt;
      };
      const mins = Array.isArray(r.mins)
        ? [...new Set(r.mins.map(x => num(x, 5, 120, 0)).filter(Boolean))].sort((a, b) => a - b).slice(0, 6)
        : [];
      const next = {
        mins: mins.length ? mins : [15, 30, 45, 60],
        oneSetUnder: num(r.oneSetUnder, 0, 120, 30),
        tail: num(r.tail, 0, 6, 2),
        tailSets: num(r.tailSets, 1, 6, 3),
        easyCap: num(r.easyCap, 5, 120, 30),
      };
      await setSetting('ladder:short', next);
      return json({ ok: true, shortRules: next });
    }
    return json({ error: 'Nope' }, 405);
  }

  /* ── what each coaching tier says it includes ────────────────────
     The three plans and their feature lists were written into the app, so
     changing a word Elliott sells on meant a deploy. */
  if (path === '/coach/coplans') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    if (request.method === 'GET') return json({ coplans: (await getSetting('coplans')) || {} });
    if (request.method === 'POST') {
      if (!(await isOwner())) return json(ownerOnly, 403);
      const src = (body.coplans && typeof body.coplans === 'object') ? body.coplans : {};
      const txt = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
      const next = {};
      for (const k of ['online', 'inperson', 'inner']) {
        const p = src[k] || {};
        const o = {};
        if (p.who  !== undefined) o.who  = txt(p.who, 40);
        if (p.flag !== undefined) o.flag = txt(p.flag, 20);
        if (p.line !== undefined) o.line = txt(p.line, 200);
        if (p.name !== undefined) o.name = txt(p.name, 60);
        if (p.for  !== undefined) o.for  = txt(p.for, 300);
        if (p.note !== undefined) o.note = txt(p.note, 200);
        if (Array.isArray(p.feats)) o.feats = p.feats.map(x => txt(x, 120)).filter(Boolean).slice(0, 8);
        next[k] = o;
      }
      await setSetting('coplans', next);
      return json({ ok: true, coplans: next });
    }
    return json({ error: 'Nope' }, 405);
  }

  /* ── the three workouts, as lists ────────────────────────────────
     Easier, Standard and Harder were a share of each difficulty level
     rather than three sessions, so the only way to change what was in one
     was to move a drill between levels and work out what that did to the
     other two. This stores each of them as an ordered list of drills, which
     is the thing the coach is actually trying to get right.

     A list wins over the shares for that stage and that band. A stage with
     no list carries on exactly as it did, so this can be done one at a time
     rather than all eighteen at once.

     Order matters: a short session takes from the top, so the first four
     are what fifteen minutes gives. */
  if (path === '/coach/bands') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    const all = (await getSetting('ladder:bands')) || {};
    if (request.method === 'GET') {
      /* names for the picker. Every other route that carries the library
         wants a client email, and this tab is not about a client. */
      return json({ bands: all, library: await libraryNow(),
                    /* drills already put onto a stage, so the tab shows the
                       same pool the app builds from rather than the shipped
                       file on its own */
                    ladderExtra: (await getSetting('ladder:extra')) || {},
                    ladderOff:   (await getSetting('ladder:off')) || {},
                    ladderMix:   (await getSetting('ladder:mix')) || {},
                    bandTiming:  (await getSetting('ladder:bandtiming')) || {} });
    }
    if (request.method === 'POST') {
      /* ── taking a drill off a stage ──────────────────────────────
         The tab could add a drill and change one and never take one
         away, so a drill on the wrong stage stayed on it. A shipped
         drill cannot be deleted from the file, so the stage lists it
         as off and every pool the app builds from skips it. It goes
         out of the stage's workouts at the same time, or it would be
         off the stage and still in a session. */
      if (Array.isArray(body.offStage)) {
        const st0 = String(Number(body.stage));
        if (!/^[0-5]$/.test(st0)) return json({ error: 'Which stage?' }, 400);
        const off = (await getSetting('ladder:off')) || {};
        const cur = new Set(off[st0] || []);
        const extra = (await getSetting('ladder:extra')) || {};
        let extraTouched = false;
        for (const x of body.offStage.slice(0, 60)) {
          const v = String((x && x.v) || x || '').toLowerCase()
            .replace(/[^a-z0-9-]/g, '').slice(0, 60);
          if (!v) continue;
          if (x && x.back) { cur.delete(v); continue; }
          cur.add(v);
          if (Array.isArray(extra[st0])) {
            const n0 = extra[st0].length;
            extra[st0] = extra[st0].filter(y => !(y && y.v === v));
            if (extra[st0].length !== n0) extraTouched = true;
          }
          for (const b of ['1', '2', '3']) {
            if (all[st0] && Array.isArray(all[st0][b])) {
              all[st0][b] = all[st0][b].filter(y => y !== v);
            }
          }
        }
        off[st0] = [...cur];
        await setSetting('ladder:off', off);
        if (extraTouched) await setSetting('ladder:extra', extra);
        await setSetting('ladder:bands', all);
        return json({ ok: true, ladderOff: off, ladderExtra: extra, bands: all });
      }
      const stage = String(Number(body.stage));
      const band = String(Number(body.band));
      if (!/^[0-5]$/.test(stage) || !/^[123]$/.test(band)) {
        return json({ error: 'Which stage and which band?' }, 400);
      }
      const list = Array.isArray(body.list) ? body.list : null;
      /* The shares and the band's own numbers can be changed without touching
         the list, and sending the list anyway would turn a stage that is
         still built from the shares into a written one behind the coach. */
      const touchingList = list !== null;
      if (!touchingList && !body.mix && !body.bandTiming) {
        return json({ error: 'No list' }, 400);
      }
      const clean = [];
      for (const x of (list || []).slice(0, 60)) {
        const v = String(x || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
        if (v && clean.indexOf(v) < 0) clean.push(v);
      }
      if (touchingList) {
        all[stage] = all[stage] || {};
        /* an empty list is "go back to the shares", not "a workout with
           nothing in it", which would give somebody a blank session */
        if (clean.length) all[stage][band] = clean;
        else delete all[stage][band];
        if (!Object.keys(all[stage]).length) delete all[stage];
        await setSetting('ladder:bands', all);
      }

      /* A drill can be put in a workout from the whole library, not only
         from what the stage already has. The app builds the session out of
         the stage's pool, so one that is not in that pool would be dropped
         on the way through and the coach would never know it had been. This
         puts it on the stage properly, which is the same list a drill made
         from scratch lands in. */
      const out = { ok: true, bands: all };
      if (touchingList && Array.isArray(body.onStage) && body.onStage.length) {
        const extra = (await getSetting('ladder:extra')) || {};
        const list = (extra[stage] || []).slice();
        for (const x of body.onStage.slice(0, 40)) {
          const v = String((x && x.v) || '').toLowerCase()
            .replace(/[^a-z0-9-]/g, '').slice(0, 60);
          if (!v || clean.indexOf(v) < 0) continue;
          const g = String((x && x.g) || '').slice(0, 40) || 'Strength';
          const L = Math.max(1, Math.min(4, Number(x && x.L) || 2));
          const at = list.findIndex(y => y && y.v === v);
          if (at > -1) list[at] = { v, g, L }; else list.push({ v, g, L });
        }
        extra[stage] = list;
        await setSetting('ladder:extra', extra);
        out.ladderExtra = extra;
      }

      /* the level shares for this stage. They were one shipped set every
         stage borrowed, so tuning Foundations moved Wall Work with it. */
      if (body.mix && typeof body.mix === 'object') {
        const mix = (await getSetting('ladder:mix')) || {};
        const clean = {};
        for (const b of ['1', '2', '3']) {
          const row = body.mix[b];
          if (!row || typeof row !== 'object') continue;
          const one = {};
          for (const L of ['1', '2', '3', '4']) {
            const n = Math.round(Number(row[L]));
            if (Number.isFinite(n) && n > 0) one[L] = Math.min(100, n);
          }
          if (Object.keys(one).length) clean[b] = one;
        }
        if (Object.keys(clean).length) mix[stage] = clean; else delete mix[stage];
        await setSetting('ladder:mix', mix);
        out.ladderMix = mix;
      }

      /* sets and reps that apply only inside this band, so one drill can be
         two sets in Easier and four in Harder without two copies of it */
      if (body.bandTiming && typeof body.bandTiming === 'object') {
        const bt = (await getSetting('ladder:bandtiming')) || {};
        const forStage = bt[stage] || {};
        const rows = {};
        for (const k of Object.keys(body.bandTiming).slice(0, 90)) {
          /* "*" is every drill in this workout and "*l3" is everything at
             that difficulty inside it, so the star has to survive the
             cleaning that keeps the rest of a key to a drill id */
          const v = String(k).toLowerCase().replace(/[^a-z0-9*-]/g, '').slice(0, 60);
          if (!v || (v[0] === '*' && !/^\*(l[1-4])?$/.test(v))) continue;
          const wide = v[0] === '*';
          const r = body.bandTiming[k] || {};
          const one = {};
          const num = (x, lo, hi) => {
            const n = Math.round(Number(x));
            return Number.isFinite(n) && n >= lo && n <= hi ? n : null;
          };
          const sets = num(r.sets, 1, 8);   if (sets !== null) one.sets = sets;
          const amt  = num(r.amt, 1, 600);  if (amt !== null) one.amt = amt;
          const w    = num(r.w, 0, 600);    if (w !== null) one.w = w;
          const rest = num(r.r, 0, 600);    if (rest !== null) one.r = rest;
          if (['s', '', 'f'].includes(r.unit)) one.unit = r.unit;
          if (!wide && ['straight','buildto','failure','eachside','maxhold'].includes(r.style)) {
            one.style = r.style;
          }
          /* a line of words belongs to one drill: "build to 8" written
             across a whole workout would say the same thing about a plank
             and a press, so the wide keys carry numbers only */
          if (!wide && typeof r.d === 'string') one.d = r.d.slice(0, 80);
          if (!wide && typeof r.dx === 'string' && r.dx.trim()) one.dx = r.dx.slice(0, 60);
          if (Object.keys(one).length) rows[v] = one; else delete forStage[v];
        }
        forStage[band] = Object.assign({}, forStage[band], rows);
        /* an emptied row is a removal, not an empty object left behind */
        for (const v of Object.keys(forStage[band])) {
          if (!forStage[band][v] || !Object.keys(forStage[band][v]).length) delete forStage[band][v];
        }
        bt[stage] = forStage;
        await setSetting('ladder:bandtiming', bt);
        out.bandTiming = bt;
      }
      return json(out);
    }
    return json({ error: 'Nope' }, 405);
  }

  /* ── what people type when they look for an explainer ────────────
     Searching the question alone found nothing for "sore wrists" while the
     film about sore wrists sat two rows under the box. The shipped words
     are in ladder-data.js; these are the ones Elliott adds after watching
     what people actually ask, and they need no deploy. */
  if (path === '/coach/explain') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    const all = (await getSetting('explain:keys')) || {};
    if (request.method === 'GET') return json({ explainKeys: all, extra: (await getSetting('explain:extra')) || [] });
    if (request.method === 'POST' && Array.isArray(body.extra)) {
      /* the coach's own explainers: a Stream clip, the question it answers,
         which phases it belongs to, and a line on what is covered */
      const extra = body.extra.slice(0, 80).map(x => ({
        uid: String((x && x.uid) || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 64),
        q: String((x && x.q) || '').trim().slice(0, 140),
        sum: String((x && x.sum) || '').trim().slice(0, 900),
        stages: (Array.isArray(x && x.stages) ? x.stages : []).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 5).slice(0, 6),
        k: (Array.isArray(x && x.k) ? x.k : String((x && x.k) || '').split(',')).map(s => String(s || '').trim().toLowerCase().slice(0, 40)).filter(Boolean).slice(0, 40),
      })).filter(x => x.uid && x.q);
      await setSetting('explain:extra', extra);
      return json({ ok: true, extra });
    }
    if (request.method === 'POST') {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      rows.slice(0, 200).forEach(r => {
        const id = String(r.id || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
        if (!id) return;
        const k = (Array.isArray(r.k) ? r.k : String(r.k || '').split(','))
          .map(x => String(x || '').trim().toLowerCase().slice(0, 40))
          .filter(Boolean).slice(0, 40);
        if (k.length) all[id] = k; else delete all[id];
      });
      await setSetting('explain:keys', all);
      return json({ ok: true, explainKeys: all });
    }
  }

  if (path === '/programme' && request.method === 'GET') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const plan = await planFor(who);
    if (!plan) return json({ error: 'No programme yet' }, 404);
    const cycle = await cycleGet(db, who, plan);
    return json({ client: clients()[who] || plan.client, plan, cycle,
                  week: (await getSetting(`week:${who}`)) || null,
                  library: await libraryNow(),
                  /* drills the coach has added to a ladder stage since the
                     last deploy, so the free ladder can pick them up too */
                  ladderExtra: (await getSetting('ladder:extra')) || {},
                  /* per drill seconds the coach has set, which beat the rule */
                  timing: (await getSetting('timing:custom')) || {} });
  }

  /* ── a one-time link to upload a clip ────────────────────────────
     The file goes from the phone straight to Cloudflare. It never passes
     through this function, which could not carry a 60MB video anyway. */
  /* ── the ladder's own timings ────────────────────────────────────
     The app works a drill's seconds out from its dose, which is right
     until it is not: a rule cannot know that one hold needs longer to set
     up than another. This is the override, per drill, and it beats the
     rule everywhere the drill appears. Dose included, because sets come
     out of the dose and a wrong set count is a wrong session length. */
  if (path === '/coach/timing') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    const all = (await getSetting('timing:custom')) || {};
    if (request.method === 'GET') return json({ timing: all });
    if (request.method === 'POST') {
      const rows = Array.isArray(body.timing) ? body.timing : [];
      for (const r of rows.slice(0, 400)) {
        const v = String((r && r.v) || '').toLowerCase()
          .replace(/[^a-z0-9-]/g, '').slice(0, 60);
        if (!v) continue;
        const num = (x, cap) => {
          const n = Number(x);
          return Number.isFinite(n) && n >= 0 && n <= cap ? Math.round(n) : null;
        };
        const w = num(r.w, 600), rest = num(r.r, 600);
        const d = String(r.d || '').slice(0, 40);
        /* the coach's own wording, where the written-from-the-numbers one
           does not say it: "30s each arm, palms out" */
        const dx = String(r.dx || '').slice(0, 60);
        /* ── sets and the amount, said rather than guessed ────────────
           The dose was one free text field read three ways: a leading
           "N x" for the set count, the first "NNs" for the work timer,
           and the last number for the amount. "30s, both ways" gave
           thirty seconds instead of sixty because the doubling rule
           looks for "each", "build to 5" read as an untimed hold, and
           anything not starting with a number silently became three
           sets. These are the same three facts, stated. */
        const sets = num(r.sets, 12);
        const amt  = num(r.amt, 3600);
        /* reps, seconds, or until they cannot do another one */
        const unit = ['s', '', 'f'].includes(r.unit) ? r.unit : null;
        /* how the dose is said, which the sentence they read is built from */
        const STYLES = ['straight', 'buildto', 'failure', 'eachside', 'maxhold'];
        const style = STYLES.includes(r.style) ? r.style : null;
        if (w == null && rest == null && !d && !dx && sets == null && amt == null
            && unit == null && style == null) {
          delete all[v]; continue;                    /* an empty row is a deletion */
        }
        all[v] = Object.assign({}, w != null ? { w } : {},
                               rest != null ? { r: rest } : {},
                               sets != null ? { sets } : {},
                               amt  != null ? { amt } : {},
                               unit != null ? { unit } : {},
                               style != null ? { style } : {},
                               dx ? { dx } : {},
                               d ? { d } : {});
      }
      await setSetting('timing:custom', all);
      return json({ ok: true, timing: all });
    }
    return json({ error: 'Nope' }, 405);
  }

  /* ── a drill the coach made, clip and all ────────────────────────
     Everything in the library is generated from the specs at build time,
     which meant a new drill needed a developer and a deploy. This writes
     one straight into settings, where libraryNow folds it back in.

     The clip needs MP4 downloads switching on: the whole library is served
     from /downloads/default.mp4 and Stream returns 404 on that path until
     you ask for it, per video. Stream builds the file in the background, so
     a new drill can take a minute or two to start playing. */
  /* ── a client's clip, in a form the review tool can draw ─────────
     The review tool paints the video onto a canvas, draws on it and records
     the canvas. A cross-origin frame taints the canvas and both getImageData
     and captureStream then throw, so the whole tool goes dead on anything
     but a local file.

     Stream's MP4 does send access-control-allow-origin: *, but /downloads/
     answers with a 302 and the redirect itself carries no CORS header, so a
     crossOrigin="anonymous" video never survives the hop. Resolving the
     redirect here and handing back the final /dl/ URL fixes it: verified in
     the browser, untainted canvas and captureStream working.

     Downloads are off per video until asked for, so this asks first. Stream
     builds the file in the background, which is why a clip can 404 for a
     minute after the first request. */
  /* ── the paid library, signed ────────────────────────────────────
     Stream can refuse any request that does not carry a token signed with
     a key it issued. The key is made once, from the dashboard, and kept in
     settings; the app asks /sign for tokens for the drills it has, and only
     an account that has paid, is coached, or still has its free session
     gets them. Free drills are never switched to need one, so the free app
     is exactly as it was. */
  const CF_ACCT = () => process.env.CF_ACCOUNT || process.env.CLOUDFLARE_ACCOUNT_ID || '3dee8d34bba73b3bbb4f7dfd2e2e4f91';
  const CF_TOK  = () => process.env.CF_STREAM_TOKEN || process.env.CLOUDFLARE_STREAM_TOKEN || '';
  const cfStream = (p, init) => fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCT()}/stream${p}`,
    Object.assign({ headers: { Authorization: `Bearer ${CF_TOK()}`, 'content-type': 'application/json' } }, init || {}))
    .then(r => r.json()).catch(err => ({ success: false, errors: [{ message: String(err && err.message || err) }] }));
  const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  let streamKeyCache = null;
  const streamKey = async () => {
    if (streamKeyCache) return streamKeyCache;
    const k = await getSetting('stream:key');
    if (!k || !k.id || !k.jwk) return null;
    const jwk = JSON.parse(Buffer.from(k.jwk, 'base64').toString('utf8'));
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    streamKeyCache = { id: k.id, key };
    return streamKeyCache;
  };
  const signUid = async (k, uid, exp) => {
    const header = b64u(JSON.stringify({ alg: 'RS256', kid: k.id }));
    const payload = b64u(JSON.stringify({ sub: uid, kid: k.id, exp, nbf: Math.floor(Date.now() / 1000) - 60 }));
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', k.key, new TextEncoder().encode(header + '.' + payload));
    return header + '.' + payload + '.' + b64u(sig);
  };
  /* the uid, or a token for it where the library is locked: for the
     server's own requests to Stream */
  const signedSeg = async uid => {
    const k = await streamKey();
    return k ? signUid(k, uid, Math.floor(Date.now() / 1000) + 3600) : uid;
  };

  /* ── the keys to the films ────────────────────────────────────────
     This decided whether somebody may play a locked film and then signed
     every id it was handed, four hundred at a time, six hours apiece,
     without once asking which films they were. An account starts with one
     unused free session, and having one is enough to be signed, so a new
     free account could ask for the entire paid library and be given it.
     The films are the only thing here that costs money to serve.

     Two things close it. A free account is held to one session's worth of
     films at a time and a handful of requests a day, which is true even
     with nothing else known. And where the coach has locked the library
     since this shipped, the lock records which films belong to which
     stage, so a free account is only signed the free stage and the one
     stage it was placed on. The cap is the floor; the map is the ceiling. */
  const FREE_SIGN_MAX = 24;          /* a long session is about twenty films */
  const FREE_SIGN_TRIES = 12;        /* a day of training, not a library raid */
  if (path === '/sign' && request.method === 'POST') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const k = await streamKey();
    if (!k) return json({ tokens: {}, off: true });
    const acct = (await getAcct(who)) || {};
    const stt = (await getSetting(`state:${who}`)) || {};
    const paid = plusNow(acct) || await isCoached(who) || coachList().includes(who);
    let ok = paid;
    if (!ok) {
      /* the one free session at a locked stage still has to play */
      const taste = Number.isInteger(stt.taste) ? stt.taste : 1;
      ok = taste > 0;
    }
    if (!ok) return json({ tokens: {}, exp: 0 });

    let uids = (Array.isArray(body.uids) ? body.uids : []).slice(0, 400)
      .map(u => String(u || '').replace(/[^a-f0-9]/g, '')).filter(u => u.length === 32);

    if (!paid) {
      if ((await rateHit(`sign:${who}`, 24 * 3600000)) > FREE_SIGN_TRIES) {
        return json({ tokens: {}, exp: 0, slow: true });
      }
      /* which films this account is allowed to be given at all */
      const map = (await getSetting('stream:stages')) || {};
      const stage = Math.max(0, Math.min(20, Number(stt.stage) || 0));
      const allowed = new Set([].concat(map['0'] || [], map[String(stage)] || [], map.free || []));
      if (allowed.size) uids = uids.filter(u => allowed.has(u));
      uids = uids.slice(0, FREE_SIGN_MAX);
    }

    const exp = Math.floor(Date.now() / 1000) + 6 * 3600;
    const tokens = {};
    for (const uid of uids) tokens[uid] = await signUid(k, uid, exp);
    return json({ tokens, exp: exp * 1000 });
  }

  if (path === '/coach/stream/status' && request.method === 'GET') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    const k = await getSetting('stream:key');
    const locked = (await getSetting('stream:locked')) || {};
    return json({ token: !!CF_TOK(), key: !!(k && k.id), keyId: k ? k.id : '', locked: (locked.uids || []).length, at: locked.at || 0 });
  }
  if (path === '/coach/stream/lock' && request.method === 'POST') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    if (!(await isOwner())) return json(ownerOnly, 403);
    if (!CF_TOK()) return json({ error: 'No Cloudflare Stream token in the environment' }, 503);
    /* the signing key, made once */
    let k = await getSetting('stream:key');
    if (!k || !k.id) {
      const made = await cfStream('/keys', { method: 'POST', body: '{}' });
      if (!made.success || !made.result || !made.result.id) {
        return json({ error: 'Cloudflare would not make a signing key: ' + JSON.stringify(made.errors || made) }, 502);
      }
      k = { id: made.result.id, jwk: made.result.jwk, at: Date.now() };
      await setSetting('stream:key', k);
      streamKeyCache = null;
    }
    const lib = await libraryNow();
    const uidOf = u => { const m = /\/([a-f0-9]{32})\//.exec(String(u || '')); return m ? m[1] : ''; };
    const all = new Set(Object.values(lib.video || {}).map(uidOf).filter(Boolean));
    /* what stays open: the free stage's drills, the mobility day, drills in
       a free fix, and anything a client's own programme page still plays
       unsigned, because those pages are outside the app */
    const free = new Set();
    for (const v of (Array.isArray(body.freeDrills) ? body.freeDrills : [])) {
      const u = uidOf((lib.video || {})[String(v)]); if (u) free.add(u);
    }
    const fixes = (await getSetting('fixes')) || {};
    for (const f of Object.values(fixes)) {
      if (!f || f.access !== 'free') continue;
      for (const d of (f.drills || [])) { const u = uidOf((lib.video || {})[d.v]); if (u) free.add(u); }
    }
    const walk = (o, depth) => { if (!o || depth > 8) return;
      if (Array.isArray(o)) { o.forEach(x => walk(x, depth + 1)); return; }
      if (typeof o === 'object') { if (o.url) { const u = uidOf(o.url); if (u) free.add(u); } Object.values(o).forEach(x => walk(x, depth + 1)); } };
    walk(programmes.clients || {}, 0);
    /* ── which film belongs to which stage ──────────────────────
       The server has never known: the pools live in the app's own data
       file, which is why this route is handed the free drills rather
       than working them out. It is handed the whole map now and writes
       it down, so /sign can give a free account the films for the free
       stage and the one stage it was placed on, and nothing else. */
    if (body.stageDrills && typeof body.stageDrills === 'object') {
      const byStage = {};
      for (const key of Object.keys(body.stageDrills).slice(0, 24)) {
        const st0 = String(Number(key));
        if (st0 === 'NaN') continue;
        const list = Array.isArray(body.stageDrills[key]) ? body.stageDrills[key] : [];
        const out = [];
        for (const v of list.slice(0, 400)) {
          const u = uidOf((lib.video || {})[String(v)]);
          if (u && out.indexOf(u) < 0) out.push(u);
        }
        if (out.length) byStage[st0] = out;
      }
      /* the free fixes travel with the free stage: a fix anybody can read
         has films anybody can play */
      byStage.free = [...free];
      await setSetting('stream:stages', byStage);
    }
    const unlockAll = !!body.unlockAll;
    const lock = unlockAll ? [] : [...all].filter(u => !free.has(u));
    const unlock = unlockAll ? [...all] : [...all].filter(u => free.has(u));
    const results = { locked: 0, unlocked: 0, failed: [] };
    const flip = async (uid, on) => {
      const r = await cfStream(`/${uid}`, { method: 'POST', body: JSON.stringify({ requireSignedURLs: on }) });
      if (r && r.success) results[on ? 'locked' : 'unlocked']++;
      else results.failed.push(uid + ': ' + JSON.stringify((r && r.errors) || r).slice(0, 120));
    };
    const jobs = lock.map(u => [u, true]).concat(unlock.map(u => [u, false]));
    for (let i = 0; i < jobs.length; i += 8) {
      await Promise.all(jobs.slice(i, i + 8).map(([u, on]) => flip(u, on)));
    }
    await setSetting('stream:locked', { uids: unlockAll ? [] : lock.filter(u => !results.failed.some(f => f.startsWith(u))), at: Date.now() });
    return json(Object.assign({ ok: true, keyId: k.id, free: free.size, total: all.size }, results));
  }

  /* ── films saved for no signal ──────────────────────────────────────
     A drill film's download link answers with a redirect, and the redirect
     carries no CORS header, so the app cannot follow it and keep the file.
     The address it lands on does allow it, and does not expire. This follows
     the redirect for each film and hands back where it ends, with the size
     Stream writes into it. Only this Stream library, and only its download
     path: it will not fetch anything else for anybody. A locked film arrives
     already signed, so nobody gets a film here they could not already play. */
  if (path === '/dlurls' && request.method === 'POST') {
    const ip = request.headers.get('x-nf-client-connection-ip') || request.headers.get('x-forwarded-for') || 'x';
    if ((await rateHit(`dl:${ip}`, 600000)) > 30) {
      return json({ error: 'That is a lot of saving at once. Try again in a few minutes.' }, 429);
    }
    const HOST = 'customer-pns1oongdltmkjwa.cloudflarestream.com';
    const list = Array.isArray(body.urls) ? body.urls.slice(0, 40) : [];
    const films = await Promise.all(list.map(async u => {
      let x = null;
      try { x = new URL(String(u)); } catch { return { src: null }; }
      if (x.hostname !== HOST || !/^\/[A-Za-z0-9._-]+\/downloads\/default\.mp4$/.test(x.pathname)) return { src: null };
      const r = await fetch(`https://${HOST}${x.pathname}`, { method: 'HEAD', redirect: 'manual' }).catch(() => null);
      if (!r) return { src: null };
      let src = null;
      if (r.status >= 300 && r.status < 400) src = r.headers.get('location');
      else if (r.ok) src = `https://${HOST}${x.pathname}`;
      if (!src || !src.startsWith(`https://${HOST}/`)) return { src: null };
      let bytes = 0;
      try {
        const p = new URL(src).searchParams.get('p');
        if (p) bytes = Number(JSON.parse(Buffer.from(p, 'base64').toString('utf8')).totalByteSize) || 0;
      } catch {}
      return { src, bytes };
    }));
    return json({ films });
  }

  if (path === '/coach/clip' && request.method === 'GET') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    const uid = String(url.searchParams.get('uid') || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 64);
    if (!uid) return json({ error: 'Which clip?' }, 400);

    /* signed where the library is locked, or the resolve below is a 403 */
    const base = `https://customer-pns1oongdltmkjwa.cloudflarestream.com/${await signedSeg(uid)}/downloads/default.mp4`;
    const ask = async () => {
      if (!process.env.CF_ACCOUNT || !process.env.CF_STREAM_TOKEN) return;
      await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT}/stream/${uid}/downloads`,
        { method: 'POST', headers: { Authorization: `Bearer ${process.env.CF_STREAM_TOKEN}` } })
        .catch(() => {});
    };
    const resolve = async () => {
      const r = await fetch(base, { method: 'HEAD', redirect: 'manual' }).catch(() => null);
      if (!r) return null;
      if (r.status >= 300 && r.status < 400) return r.headers.get('location') || null;
      return r.ok ? base : null;
    };

    let src = await resolve();
    if (!src) { await ask(); src = await resolve(); }
    if (!src) return json({ error: 'Stream is still building this one. Try again in a minute.', building: true }, 202);
    return json({ uid, src });
  }

  if (path === '/coach/drill') {
    if (!(await isCoach())) return json({ error: 'Nope' }, 401);
    const all = (await getSetting('drills:custom')) || {};

    if (request.method === 'GET') return json({ drills: all });

    if (request.method === 'POST') {
      const v = String(body.v || '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      if (!v) return json({ error: 'That drill needs a name' }, 400);

      if (body.remove) {
        delete all[v];
        await setSetting('drills:custom', all);
        return json({ ok: true, removed: v });
      }
      const uid = String(body.uid || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 64);

      /* ── putting a clip on a drill that already exists ──────────────
         Filming was only reachable through New drill, so the only way to
         put a clip on a drill in a programme or on a check point was to
         make a second drill with the same movement in it.

         This writes the uid and nothing else. A plain save rebuilds the
         record field by field, and libraryNow overwrites cues and desc from
         whatever it finds here, so saving a clip the ordinary way onto a
         generated drill would strip the cues that shipped with it. */
      if (body.clipOnly) {
        if (!uid) return json({ error: 'No clip to attach' }, 400);
        const base = programmes.library || {};
        const prev = all[v] || {};
        const prevCues = Array.isArray(prev.cues) ? prev.cues : null;
        all[v] = {
          n: prev.n || (base.names || {})[v] || v.replace(/-/g, ' '),
          desc: prev.desc != null ? prev.desc : ((base.desc || {})[v] || ''),
          cues: (prevCues && prevCues.length) ? prevCues : ((base.cues || {})[v] || []),
          url: `https://customer-pns1oongdltmkjwa.cloudflarestream.com/${uid}/downloads/default.mp4`,
          uid,
          at: prev.at || Date.now(),
        };
        /* Stream serves every clip from /downloads/default.mp4 and answers
           404 on that path until downloads are switched on, per video */
        if (process.env.CF_ACCOUNT && process.env.CF_STREAM_TOKEN) {
          await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT}/stream/${uid}/downloads`,
            { method: 'POST',
              headers: { Authorization: `Bearer ${process.env.CF_STREAM_TOKEN}` } })
            .catch(() => {});
        }
        await setSetting('drills:custom', all);
        return json({ ok: true, drill: Object.assign({ v }, all[v]) });
      }

      /* a slug the generated library already owns would be shadowed rather
         than added, and the coach would have no way to tell */
      if (!all[v] && (programmes.library.names || {})[v]) {
        return json({ error: 'There is already a drill with that name. Give this one a different one.' }, 409);
      }
      let url = all[v] ? all[v].url : '';
      if (uid) {
        url = `https://customer-pns1oongdltmkjwa.cloudflarestream.com/${uid}/downloads/default.mp4`;
        if (process.env.CF_ACCOUNT && process.env.CF_STREAM_TOKEN) {
          await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT}/stream/${uid}/downloads`,
            { method: 'POST',
              headers: { Authorization: `Bearer ${process.env.CF_STREAM_TOKEN}` } })
            .catch(() => {});
        }
      }
      all[v] = {
        n: String(body.n || '').slice(0, 80) || v.replace(/-/g, ' '),
        desc: String(body.desc || '').slice(0, 400),
        cues: Array.isArray(body.cues)
          ? body.cues.slice(0, 8).map(c => String(c || '').slice(0, 140)).filter(Boolean) : [],
        url,
        uid: uid || (all[v] && all[v].uid) || '',
        at: (all[v] && all[v].at) || Date.now(),
      };
      await setSetting('drills:custom', all);

      /* optionally onto a ladder stage, with the grouping and level the
         free ladder builds its sessions from */
      if (body.stage != null) {
        const st = Math.max(0, Math.min(5, Number(body.stage) || 0));
        const extra = (await getSetting('ladder:extra')) || {};
        const list = (extra[st] || []).filter(x => x && x.v !== v);
        if (!body.offLadder) {
          list.push({ v,
            g: String(body.group || '').slice(0, 40) || 'Strength',
            L: Math.max(1, Math.min(4, Number(body.level) || 1)) });
        }
        extra[st] = list;
        await setSetting('ladder:extra', extra);
      }
      return json({ ok: true, drill: Object.assign({ v }, all[v]) });
    }
    return json({ error: 'Nope' }, 405);
  }

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
      for (const k of CHANNEL_KINDS) {
        const via = body.via && body.via[k];
        if (CHANNELS.includes(via)) cur[k] = via;
        /* an app from before the choice sends a yes or no */
        else if (body[k] !== undefined) cur[k] = body[k] !== false ? 'both' : 'none';
      }
      for (const k of ['marketing', 'promo']) {
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
      /* how each kind arrives now, and the yes or no an older app reads */
      via: { replies: chanOf(p, 'replies'), reminders: chanOf(p, 'reminders') },
      replies: ['email', 'both'].includes(chanOf(p, 'replies')),
      reminders: ['email', 'both'].includes(chanOf(p, 'reminders')),
      marketing: p.marketing !== undefined ? p.marketing !== false : !!acct.marketing,
      /* off unless they turned it on: consent is opt in, never assumed */
      promo: p.promo === true,
    });
  }

  /* ── app state that has to follow the person ──────────────────
     Which weekday each session sits on, and any drill lengths they have
     changed. Small, and useless on one device only — a new phone should
     not cost someone their week. */
  /* ── notifications on this phone ────────────────────────────────
     The public key is public: every phone that subscribes is handed it.
     The private one never leaves Netlify. */
  if (path === '/push/key') {
    return json({ key: process.env.VAPID_PUBLIC_KEY || '', on: pushReady() });
  }
  if (path === '/push/subscribe' && request.method === 'POST') {
    const who = await realMe();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const sb = body.sub || {};
    const endpoint = String(sb.endpoint || '');
    const p256dh = String((sb.keys || {}).p256dh || '').slice(0, 200);
    const auth = String((sb.keys || {}).auth || '').slice(0, 100);
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth) {
      return json({ error: 'That is not a notification subscription' }, 400);
    }
    const rec = await pushSubs(who);
    /* the latest first, one entry per phone, and no more than six */
    rec.subs = [{ endpoint, keys: { p256dh, auth }, at: Date.now() }]
      .concat(rec.subs.filter(x => x && x.endpoint !== endpoint)).slice(0, 6);
    /* the weekdays they plan to train, Monday nought, for the reminder */
    if (Array.isArray(body.days)) {
      rec.days = [...new Set(body.days.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))];
    }
    await pushSave(who, rec);
    return json({ ok: true, phones: rec.subs.length });
  }
  if (path === '/push/unsubscribe' && request.method === 'POST') {
    const who = await realMe();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const endpoint = String(body.endpoint || '');
    const rec = await pushSubs(who);
    rec.subs = rec.subs.filter(x => x && x.endpoint !== endpoint);
    await pushSave(who, rec);
    return json({ ok: true, phones: rec.subs.length });
  }
  /* asked for by the person, to their own phone, so it is not held by the
     mail guard: nobody is told anything they did not just ask for */
  if (path === '/push/test' && request.method === 'POST') {
    const who = await realMe();
    if (!who) return json({ error: 'Sign in first' }, 401);
    if ((await rateHit(`pushtest:${who}`, 600000)) > 5) return json({ error: 'That is a few tests. Try again in a few minutes.' }, 429);
    /* An iPhone does not show a notification from the app that is open in
       front of you, which is exactly where you are when you press Send a
       test. So it waits a few seconds, long enough to go to the Home
       Screen and watch it arrive the way a real one does. */
    const wait = Math.max(0, Math.min(6000, Number(body.wait) || 0));
    if (wait) await new Promise(r => setTimeout(r, wait));
    const r = await pushSend(who, { title: 'Notifications are on',
      body: 'This is how a reply from ' + coachName(coachOf(who) || primaryCoach()) + ' will arrive.',
      url: '/lha-app.html', tag: 'test' });
    return json(r);
  }

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
      /* sessions done per fix: a slug to a small count */
      if (body.fixDone && typeof body.fixDone === 'object') {
        const m = {};
        for (const k of Object.keys(body.fixDone).slice(0, 60)) {
          const n = Number(body.fixDone[k]);
          const slug = String(k).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
          if (slug && Number.isFinite(n) && n > 0) m[slug] = Math.min(999, Math.round(n));
        }
        cur.fixDone = m;
      }
      /* the quiz answers, so a new phone does not ask them all again */
      if (body.intake && typeof body.intake === 'object') {
        const i = body.intake, out = {};
        for (const k of ['goal', 'level', 'mins', 'days', 'baseline']) {
          if (i[k] !== undefined && i[k] !== null) {
            out[k] = typeof i[k] === 'string' ? String(i[k]).slice(0, 80) : i[k];
          }
        }
        if (Array.isArray(i.niggles)) out.niggles = i.niggles.slice(0, 20).map(x => String(x).slice(0, 40));
        cur.intake = out;
      }
      if (body.quizDone !== undefined) cur.quizDone = !!body.quizDone;
      /* the free sessions above the free stage, counted down */
      if (body.taste !== undefined) {
        const t = Number(body.taste);
        /* only ever downwards: the client says how many it has used and a
           client that says fewer than last time is not to be believed */
        if (Number.isInteger(t) && t >= 0 && t <= 5) {
          cur.taste = Number.isInteger(cur.taste) ? Math.min(cur.taste, t) : t;
        }
      }
      if (body.time !== undefined) {
        const t = Number(body.time);
        /* 60 is offered to anyone who can already balance, and it was not on
           this list, so those two levels picked an hour and got it back as
           whatever the last valid answer was. */
        if ([15, 30, 45, 60].includes(t)) cur.time = t;
      }
      if (body.perWeek !== undefined) {
        const n = Number(body.perWeek);
        if (Number.isInteger(n) && n >= 1 && n <= 7) cur.perWeek = n;
      }
      /* Which ladder stage they are on. It was written to the account row for
         the coach to read and never handed back to the app, so signing in on
         a second device put a paying subscriber back on Foundations. */
      if (body.stage !== undefined) {
        const n = Number(body.stage);
        /* Only ever upwards, unless the client says it means it. The app
           sends this on every save, and a save that happens before the
           stored state has loaded back sends 0, which wiped a subscriber's
           place on the ladder on every device. Taking a stage back is a
           deliberate act, so it says so. */
        const back = body.stageDown === true;
        if (Number.isInteger(n) && n >= 0 && n <= 20
            && (back || !Number.isInteger(cur.stage) || n >= cur.stage)) cur.stage = n;
      }
      await setSetting(key, cur);
    }
    const out = (await getSetting(key)) || {};
    /* intake and quizDone were stored by the POST above and left out of this
       answer, so the comment above about a new phone not asking the quiz
       again described something that had never worked. */
    return json({ dayMap: out.dayMap || {}, secs: out.secs || {},
      time: out.time || 0, perWeek: out.perWeek || 0,
      intake: out.intake || {}, quizDone: !!out.quizDone,
      stage: Number.isInteger(out.stage) ? out.stage : null,
      taste: Number.isInteger(out.taste) ? out.taste : null,
      ladderDone: out.ladderDone || {},
      fixDone: out.fixDone || {} });
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
      /* ── the tutorial ────────────────────────────────────────────
         Whether they have been through it and when. Skipping counts as
         having seen it: they were shown it and said no, which is the
         thing worth knowing. First time only, so a reinstall does not
         rewrite the date. */
      if (body.tour && typeof body.tour === 'object') {
        const k = String(body.tour.k || '').slice(0, 24);
        if (k && /^[a-z]+$/.test(k)) {
          cur.tours = cur.tours || {};
          if (!cur.tours[k]) cur.tours[k] = { at: now, skipped: !!body.tour.skipped };
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
      /* one check point reading. These are what decide whether someone
         moves up a stage, so they are kept per key with their history. */
      if (body.checkpoint && typeof body.checkpoint === 'object') {
        const k = String(body.checkpoint.k || '').slice(0, 32);
        const v = Number(body.checkpoint.v);
        /* a clip is optional and it is the point of a coached check point:
           a number on its own says what happened, not whether it was any
           good. Stored as the Stream uid, same as every other upload. */
        const vid = String(body.checkpoint.video || '').slice(0, 64);
        if (k && Number.isFinite(v) && v >= 0 && v <= 100000) {
          cur.checkpoints = cur.checkpoints || {};
          const hist = (cur.checkpoints[k] || []).slice();
          const row = Object.assign({ v: Math.round(v * 10) / 10, at: Date.now() },
                                    vid ? { video: vid } : {});
          /* Same rule as the app: nudging a slider twice in one session is a
             correction, not two readings. The app replaced today's entry and
             this appended, so the coach's record of a day and the client's
             were different, and with a cap of 20 a few days of fiddling
             pushed real readings out. A clip already sent is never dropped
             by a later bare number. */
          const day = t => new Date(t || 0).toISOString().slice(0, 10);
          const last = hist[hist.length - 1];
          if (last && day(last.at) === day(row.at)) {
            if (last.video && !row.video) row.video = last.video;
            /* The coach's verdict is on that row. Moving the slider again the
               same day wiped it, so a sign-off vanished the moment they
               touched the card. It stays with the reading; a new clip after
               a verdict is a new reading, not a correction. */
            if (last.verdict && row.video !== last.video) hist.push(row);
            else {
              if (last.verdict) ['verdict', 'note', 'by', 'verdictAt', 'watchedAt', 'undone']
                .forEach(f => { if (last[f] != null) row[f] = last[f]; });
              /* the same clip was watched and answered, whatever the number
                 says now: without this a nudge after a reply put the clip
                 back to waiting on the dashboard */
              if (row.video && row.video === last.video) ['watchedAt', 'replyAt']
                .forEach(f => { if (last[f] != null) row[f] = last[f]; });
              hist[hist.length - 1] = row;
            }
          } else hist.push(row);
          cur.checkpoints[k] = hist.slice(-20);
          /* A clip on a check point was stored and then nothing happened: no
             email, no place in the queue, only a small play button deep in
             the client's analysis column. Hannah sent hers and Elliott never
             saw them. A new clip is a submission like any other, so it lands
             in "needs you now" and in Client reviews, and the coach is told. */
          /* ── the same gate as every other way of sending footage ──
             A check point clip is a clip for Elliott to watch, so it costs
             what one costs. The app only offers the camera here to a
             coached client, but the route was open to anybody with a token
             and filed a submission and emailed the coach for every one. The
             number is theirs either way: what the gate decides is whether
             it reaches him. */
          let cpFcOk = true;
          if (vid && !clients()[who]) {
            const g = await fcGate(who);
            cpFcOk = !!g.ok;
          }
          if (vid && cpFcOk && !(last && last.video === vid)) {
            const defs = (await getSetting(`programme:${who}`)) || programmes.clients[who] || {};
            let cpName = ((defs.checkpoints || []).find(c => c && c.k === k) || {}).n
              || (CHECKPOINT_NAMES[k] || '');
            /* fix:<slug>:start or :finish, named after the fix and the end */
            if (!cpName && k.startsWith('fix:')) {
              const [, slug, end] = k.split(':');
              const fx = ((await getSetting('fixes')) || {})[slug] || {};
              cpName = (fx.name || slug) + (end === 'finish' ? ', after' : ', before');
            }
            if (!cpName) cpName = k;
            const plan = programmes.clients[who];
            let cycleN = 1;
            try { cycleN = (await cycleGet(db, who, plan)).n || 1; } catch {}
            try {
              await supa.insert('submissions', { email: who, kind: 'checkpoint', cycle: cycleN,
                numbers: { k, v: row.v, name: cpName }, clips: [vid], status: 'submitted' });
            } catch {}
            await email(coachOf(who), `Check point clip from ${clients()[who] || who}`,
              mail({ title: 'A check point clip came in.',
                paras: [`<b>${esc(clients()[who] || who)}</b> sent a clip for <b>${esc(cpName)}</b>, logged at ${esc(String(row.v))}.`],
                cta: { href: `${SITE}/lha-coach.html`, label: 'Watch it' },
                signoff: { name: 'London Handstand Academy' } }));
            await coachAlert(who, 'messages', { title: firstNameOf(who) + ' sent a check point clip',
              body: cpName + ', logged at ' + row.v, tag: 'clip:' + who, t: 'marks' });
          }
        }
      }
      /* a number on a check point, no clip. Dragging a slider logs as it
         goes, so one notification per twenty minutes and it replaces the
         last one rather than stacking. */
      if (body.checkpoint && typeof body.checkpoint === 'object' && !body.checkpoint.video
          && clients()[who] && pushReady()) {
        const k = String(body.checkpoint.k || '').slice(0, 32);
        const hist = ((cur.checkpoints || {})[k]) || [];
        const got = hist[hist.length - 1];
        if (got && (await rateHit(`cpalert:${who}`, 20 * 60000)) === 1) {
          const defs = ((await getSetting(`programme:${who}`)) || programmes.clients[who] || {}).checkpoints || [];
          const d = defs.find(c => c && c.k === k) || {};
          await coachAlert(who, 'checkpoints', { title: firstNameOf(who) + ' logged a check point',
            body: (d.n || CHECKPOINT_NAMES[k] || k) + ': ' + got.v + (d.target ? ' (target ' + d.target + ')' : ''),
            tag: 'cp:' + who, t: 'marks' });
        }
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
      checkins: cur.checkins, photos: cur.photos || [],
      checkpoints: cur.checkpoints || {} });
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
  /* ── feedback ──────────────────────────────────────────────────────
     A question goes to a coach and is about handstands. This is about the
     app itself, and most of the people with something to say about it have
     no account and no coach, so it takes no sign in. It is kept rather than
     only emailed, because a bug reported twice by two people is a different
     thing from a bug reported once, and an inbox cannot tell you that. */
  /* ── what is happening ───────────────────────────────────────────
     Nothing was counted anywhere: not opens, not quiz completions, not how
     many people met the paywall or came back a week later. Every decision
     about the app was a guess. This counts, and keeps nothing about anyone:
     one row per day of totals, in the settings table, no cookies, no third
     party, no per-person record. */
  const EVENTS = ['open', 'quiz', 'wall', 'checkout', 'subscribed', 'start',
                  'finish', 'ret7', 'install', 'taste', 'signup', 'code',
                  /* a fix opened, started and finished, and its public page */
                  'fixopen', 'fixstart', 'fixdone', 'sitefix',
                  /* a workshop page opened, a booking started, a booking paid */
                  'siteworkshoppage', 'workshopbook', 'workshoppaid',
                  /* a one to one session page opened, and a request started */
                  'sitesessionpage', 'sessionbook',
                  /* the website, before the app */
                  'site', 'sitequiz', 'siteapp', 'siteworkshop'];
  if (path === '/event' && request.method === 'POST') {
    const n = String(body.n || '');
    if (!EVENTS.includes(n)) return json({ ok: true, ignored: true });
    /* loose, per address: enough for a real phone, not enough to fill a row */
    const ip = request.headers.get('x-nf-client-connection-ip') || 'x';
    if ((await rateHit(`ev:${ip}`, 3600000)) > 400) return json({ ok: true });
    const day = new Date().toISOString().slice(0, 10);
    const key = `ev:${day}`;
    const row = (await getSetting(key)) || {};
    row[n] = (row[n] || 0) + 1;
    /* where they came from: a ref carried on the link, kept by the app as a
       first touch, sent with every event after. And which fix, for a fix. */
    const src = String(body.r || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
    if (src) { row.by = row.by || {}; row.by[src] = row.by[src] || {}; row.by[src][n] = (row.by[src][n] || 0) + 1; }
    const fx = String(body.f || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
    if (fx && n.startsWith('fix') || fx && n === 'sitefix') { row.fix = row.fix || {}; row.fix[fx] = row.fix[fx] || {}; row.fix[fx][n] = (row.fix[fx][n] || 0) + 1; }
    /* where the quiz put them, which is the one breakdown that matters */
    if (n === 'quiz' || n === 'wall') {
      const st = Number(body.s);
      if (Number.isInteger(st) && st >= 0 && st <= 5) {
        row[n + 'By'] = row[n + 'By'] || {};
        row[n + 'By'][st] = (row[n + 'By'][st] || 0) + 1;
      }
    }
    await setSetting(key, row);
    return json({ ok: true });
  }

  /* ── a code that unlocks the tier for a while ─────────────────────
     WORKSHOP26 on a screen at the end of a workshop. The comp button in the
     dashboard does this per account by hand; this is the same thing a
     person types themselves. Codes carry a number of days and a limit. */
  if (path === '/redeem' && request.method === 'POST') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const code = String(body.code || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
    if (!code) return json({ error: 'Type the code first' }, 400);
    if ((await rateHit(`redeem:${who}`, 3600000)) > 10) {
      return json({ error: 'Too many tries. Give it an hour.' }, 429);
    }
    const codes = (await getSetting('codes')) || {};
    const c = codes[code];
    /* Two code systems exist and only one of them was being checked here.
       These are our own comp codes, which hand out free days directly. A
       code made in Stripe is a promotion code, and Stripe Checkout accepts
       it happily, but this endpoint had never heard of it and told the
       person it was fake. Anyone handed a code at a workshop and typing it
       here got "That code is not one of ours" for a code that works.
       So: not ours, ask Stripe, and if Stripe knows it, carry it into
       checkout rather than rejecting it. */
    if (!c || c.off) {
      const promo = await stripePromo(code);
      if (promo) return json({ ok: true, stripe: true, promo: promo.id, label: promo.label });
      return json({ error: 'That code is not one of ours' }, 404);
    }
    if (c.until && Date.now() > ms(c.until)) return json({ error: 'That code has expired' }, 410);
    if (c.max && (c.used || 0) >= c.max) return json({ error: 'That code has been used up' }, 410);
    const acct = await ensureAcct(who);
    /* already paying: the code is worth nothing to them and should not
       silently shorten anything */
    if (acct && acct.plus) return json({ ok: true, already: true, plus: true });
    const usedBy = c.by || [];
    if (usedBy.includes(who)) return json({ error: 'You have used that one already' }, 409);
    const days = Math.max(1, Math.min(365, Number(c.days) || 30));
    const from = (acct && acct.plus_until && ms(acct.plus_until) > Date.now()) ? ms(acct.plus_until) : Date.now();
    const until = iso(from + days * 86400000);
    await setSetting(`plusuntil:${who}`, until);
    c.used = (c.used || 0) + 1;
    c.by = usedBy.concat(who).slice(-500);
    codes[code] = c;
    await setSetting('codes', codes);
    return json({ ok: true, plus: true, until, days });
  }

  if (path === '/feedback' && request.method === 'POST') {
    const who = await me();
    const kinds = ['bug', 'idea', 'review', 'block'];   /* block: the end of a coaching block */
    const kind = kinds.includes(body.kind) ? body.kind : 'review';
    const text = String(body.text || '').trim().slice(0, 4000);
    if (!text) return json({ error: 'Say something first' }, 400);
    /* signed in is one bucket each, signed out is one bucket between them:
       loose enough for a real person, tight enough that nobody fills the
       setting with noise */
    const bucket = who ? `fb:${who}` : 'fb:anon';
    if ((await rateHit(bucket, 3600000)) > (who ? 12 : 60)) {
      return json({ error: 'That is a lot at once. Try again shortly.' }, 429);
    }
    const extra = {};
    if (body.extra && typeof body.extra === 'object') {
      for (const k of Object.keys(body.extra).slice(0, 12)) {
        const val = body.extra[k];
        if (val === null || val === undefined || val === '') continue;
        extra[String(k).slice(0, 40)] = String(val).slice(0, 600);
      }
    }
    const log = (await getSetting('feedback:log')) || [];
    const row = {
      id: 'fb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      at: Date.now(), kind, text,
      email: who || '', name: who ? (clients()[who] || '') : '',
      stage: Number(body.stage) || 0,
      plus: !!body.plus,
      app: String(body.build || '').slice(0, 20),
      extra, done: false,
    };
    log.unshift(row);
    await setSetting('feedback:log', log.slice(0, 500));
    const label = { bug: 'Bug', idea: 'Idea', review: 'Feedback', block: 'Block review' }[kind];
    await coachAlert(null, 'signups', { title: label + ' from the app', body: String(text || '').slice(0, 160), tag: 'fb' });
    await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL,
      `${label} from the app${who ? ': ' + who : ''}`,
      mail({ title: `${label} from the app.`,
        paras: [esc(text)].concat(Object.keys(extra).map(k => `<b>${esc(k)}</b>: ${esc(extra[k])}`)),
        cta: { href: `${SITE}/lha-coach.html`, label: 'Open the dashboard' },
        signoff: { name: 'London Handstand Academy' } }));
    return json({ ok: true });
  }

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
      /* The email is what actually reaches Elliott, so it goes first and
         the row is the record. supabase/questions.sql has never been run
         against the live database, so this insert throws PGRST205 and the
         question was being lost with a 500 in front of the person who
         asked it. Send it either way. */
      let stored = true;
      try { await supa.insert('questions', { email: who, body: body2 }); }
      catch (err) { if (!missingTable(err)) throw err; stored = false; }
      await coachAlert(who, 'messages', { title: 'Question from ' + firstNameOf(who), body: body2.slice(0, 160), tag: 'q:' + who, url: '/lha-coach.html#today' });
      await email(coachOf(who) || process.env.COACH_EMAIL || process.env.FROM_EMAIL,
        `Question from ${clients()[who] || who}`,
        mail({ title: 'A question came in.',
          paras: [esc(body2)].concat(stored ? [] :
            ['<b>This one is not in the dashboard.</b> The questions table does not '
             + 'exist yet, so it is in this email only. Run supabase/questions.sql.']),
          cta: { href: `${SITE}/lha-coach.html`, label: 'Answer it' },
          signoff: { name: 'London Handstand Academy' } }));
      return json({ ok: true, stored });
    }
    let rows = [];
    try {
      rows = await supa.rows('questions',
        `email=eq.${enc(who)}&select=*&order=created_at.desc`);
    } catch (err) {
      /* a table that does not exist yet must not take the whole app down:
         this route runs on every boot for a signed-in account */
      if (!missingTable(err)) throw err;
      return json({ questions: [], off: true });
    }
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
    /* The website enquiry form asks a few things the in-app one does not.
       They are kept because they are what tells you whether to reply with
       a call or a link. */
    const answers = {
      goal: pick('goal'), level: pick('level'), format: pick('format'),
      days: pick('days'), commitment: pick('commitment'), hours: pick('hours'),
      stops: pick('stops'), plan: pick('plan', 120), source: pick('source', 60),
      injuries: pick('injuries', 1200),
      notes: pick('notes', 1200), location: pick('location'),
    };
    const name = String(body.name || '').slice(0, 60);

    await ensureAcct(e, name);
    if (name) await saveAcct({ email: e, name });
    const [row] = await supa.insert('applications', { email: e, name, answers });

    const lines = Object.entries(answers).filter(([, v]) => v)
      .map(([k, v]) => `<b>${esc(k)}</b>: ${esc(v)}`).join('<br>');
    await coachAlert(null, 'business', { title: 'Coaching application', body: name || e, tag: 'app:' + e });
    await email(coachOf(e) || process.env.COACH_EMAIL || process.env.FROM_EMAIL,
      `Coaching application: ${name || e}`,
      mail({
        title: 'Someone wants coaching.',
        paras: [`<b>${esc(name || e)}</b>, ${esc(e)}`, lines || 'No answers given.'],
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
    /* A form check is part of the paid tier now, and the free week of it is
       the way in. It used to be one free check per account for ever, which
       was one free check per email address, and the wall said so. */
    /* ── one form check, free, and one only ────────────────────────
       A form check is Elliott watching footage and writing back. It costs
       an hour of his week, not a server, so the limit has to be a ledger
       rather than a sentence in the copy.
       The tiers: an account gets one, ever. The ${PRICES.check.label} a
       month tier is the one that buys form checks, and buying it puts the
       person on the roster, which is what `coached` reads above, so they
       never reach this gate. The ${PRICES.plus.label} tier is the ladder
       and does not include them.
       This route used to check the tier and nothing else, which meant a
       five pound subscriber could send a clip every day of the month.
       insertIfAbsent is the claim: whoever wins the row gets the check,
       and a second attempt cannot win it even if both arrive at once. */
    if (!coached) {
      const gate = await fcGate(who);
      if (!gate.ok) return json({ error: gate.error, gated: true, usedUp: true }, 402);
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
    /* free_checks was claimed above, before anything was written, so a
       refused check never costs the person their one. */

    /* it lands in the thread too, so the coach reads it where they
       already reply rather than in a second inbox */
    const label = kind === 'assessment' ? 'Form check' : `Two-week test · cycle ${cycle.n}`;
    /* a question sent with the clip is the thing to answer, so it is the
       message, not a number in a list */
    const question = String(numbers.question || '').trim().slice(0, 600);
    const lines = question ? question
      : Object.entries(numbers).map(([k2, v]) => `${k2}: ${v}`).join(', ');
    await threadAdd(db, who, { from: 'client',
      text: `${label}${lines ? ' — ' + lines : ''}`, sub: id });
    for (const c of clips) {
      await threadAdd(db, who, { from: 'client', text: c.name || c.drill, sub: id,
        ...(c.uid ? { video: c.uid } : {}), ...(c.image ? { image: c.image } : {}) });
    }

    /* acct was never fetched in this route. A coached client short-circuits
       on the first term so it never fired in testing, but a free account
       sending its one free form check threw a ReferenceError here: the row,
       the used-up free check and the thread entries were all written first,
       so the check was spent, nobody was emailed, and the app said it could
       not send. */
    const sender = (await getAcct(who)) || {};
    const them = clients()[who] || String(sender.name || '').split(' ')[0] || '';
    const cn = coachName(coachOf(who));
    const T = await emailCopy('clipIn', { name: esc(them), coach: esc(cn), clips: clips.length === 1 ? 'that' : 'those' });
    await email(who, kind === 'assessment' ? T.subject : T.subject.replace(/clip/i, 'test'),
      mail({
        title: kind === 'assessment' ? T.title : T.title.replace(/clip/i, 'test'),
        greeting: them,
        paras: T.paras,
        box: { title: 'What happens next', numbered: true, items: [
          `${cn} watches your ${clips.length === 1 ? 'clip' : 'clips'} and picks the one thing holding you back.`,
          'You get that back in the app, and an email to tell you it has landed.',
        ] },
        cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
        signoff: { name: cn },
        footnote: T.footnote || undefined,
      }));

    await coachAlert(who, 'messages', { title: firstNameOf(who) + ' sent a ' + label.toLowerCase(), body: clips.length + ' clip' + (clips.length === 1 ? '' : 's') + ' to watch', tag: 'sub:' + who, url: '/lha-coach.html#today' });
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
  /* the best of each shape, read back out of the holds already stored */
  function bestHoldsFrom(holds) {
    const best = {};
    for (const h of (Array.isArray(holds) ? holds : [])) {
      const k = h && h.kind ? h.kind : 'ctw';
      const s = Number(h && h.s) || 0;
      if (s > (best[k] || 0)) best[k] = s;
    }
    return best;
  }

  function repsLogFrom(sessions) {
    const log = {};
    for (const s of (Array.isArray(sessions) ? sessions : [])) {
      for (const it of (Array.isArray(s.items) ? s.items : [])) {
        const v = it && it.v, n = Number(it && it.reps) || 0;
        if (!v || !n) continue;
        (log[v] = log[v] || []).push({ at: Number(s.at) || 0, reps: n, secs: 0,
                                       want: Number(it.want) || 0, n: it.n || '' });
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
      /* how long they have spent in here, per day. It has been recorded on
         every visit since visits stopped meaning "a tab woke up", and only
         the coach could see it. */
      const visits = (await getSetting(`visits:${who}`)) || {};
    return json(prog ? { opens: prog.opens || [], sessions: prog.sessions || [], holds: prog.holds || [],
  flags: prog.flags || {}, tests: prog.tests || [], feedback: prog.feedback || [],
  bestHold: prog.best_hold || 0, lastSeen: ms(prog.last_seen),
  /* whether they have said their clips may be used in marketing: opt in */
  promo: (((await getSetting(`prefs:${who}`)) || {}).promo === true),
  repsLog: repsLogFrom(prog.sessions), visits,
  bestHolds: bestHoldsFrom(prog.holds) } : { visits });
    }
    if (request.method === 'POST') {
    const stored = await supa.row('progress', `email=eq.${enc(who)}&select=*`);
    const p = stored
      ? { opens: stored.opens || [], sessions: stored.sessions || [], holds: stored.holds || [],
          flags: stored.flags || {}, tests: stored.tests || [], feedback: stored.feedback || [],
          bestHold: stored.best_hold || 0, lastSeen: ms(stored.last_seen) }
      : { opens: [], sessions: [], holds: [], flags: {}, tests: [], feedback: [] };
      const now = Date.now();

      /* An open used to be stamped by the app merely loading, so a phone
         waking a backgrounded tab read as a training day. The client only
         reports one after a real interaction now, and says how long the
         visit lasted, so "opened" means opened by a person. */
      const today = new Date(now).toISOString().slice(0, 10);
      if (body.visit) {
        p.opens = (p.opens || []).filter(d => d !== today).concat([today]).slice(-180);
        p.lastSeen = now;
        const key = `visits:${who}`;
        const v = (await getSetting(key)) || {};
        const day = v[today] || { n: 0, ms: 0 };
        day.n += 1;
        day.ms += Math.max(0, Math.min(4 * 3600000, Number(body.visit.ms) || 0));
        v[today] = day;
        /* six months is plenty to read a habit off */
        for (const d of Object.keys(v)) {
          if (d < new Date(now - 180 * 86400000).toISOString().slice(0, 10)) delete v[d];
        }
        await setSetting(key, v);
      }

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
                want: Number(x && x.want) || 0,
                /* a rep and a second are different units and the row carried
                   neither, so volume could only ever be a bare count */
                unit: (x && x.unit) === 's' ? 's' : '',
                per: Number(x && x.per) || 0,
                secs: Math.max(0, Math.min(36000, Number(x && x.secs) || 0)),
                dose: String((x && x.dose) || '').slice(0, 40),
                rate: ['easy', 'hard'].includes(x && x.rate) ? x.rate : '',
              }))
            : [],
          /* how it was recorded, and whether it was all of it. A day closed
             out by the app's own tick rollover is written the next morning,
             so it carries the day it actually happened and the calendar puts
             it there. Anything outside the last week, or in the future, is
             stamped now. */
          mode: String(body.session.mode || '').slice(0, 20),
          kind: ['all', 'part', 'none'].includes(body.session.kind) ? body.session.kind : '',
          at: (() => {
            const t = Number(body.session.at) || 0;
            return (t > now - 8 * 24 * 60 * 60 * 1000 && t <= now) ? t : now;
          })(),
        }]).slice(-200);
      }
      if (body.flags && typeof body.flags === 'object') {
        /* ── too hard, too easy ──────────────────────────────────────
           Every flag was stamped with the time of whatever save happened
           to carry it, so they all looked new on every write and none of
           them looked new to anybody. A flag keeps the moment it was
           made, and a flag that has just been made or changed is worth
           an email, because the coach had no other way of finding out.
           Marina said several exercises were too hard and nobody knew. */
        const was = p.flags || {};
        const fresh = [];
        p.flags = {};
        for (const [drill, v] of Object.entries(body.flags).slice(0, 120)) {
          if (v && (v.rate === 'easy' || v.rate === 'hard')) {
            const k = String(drill).slice(0, 60);
            const note = String(v.note || '').slice(0, 300);
            const old0 = was[k];
            const same = old0 && old0.rate === v.rate && (old0.note || '') === note;
            p.flags[k] = { rate: v.rate, note, at: same ? (old0.at || now) : now };
            if (!same) fresh.push({ k, rate: v.rate, note });
          }
        }
        if (fresh.length) {
          const lib = await libraryNow();
          const nm = clients()[who] || who;
          const line = f => `<b>${esc((lib.names || {})[f.k] || f.k)}</b>: too ${esc(f.rate)}`
            + (f.note ? `<br>&ldquo;${esc(f.note)}&rdquo;` : '');
          await coachAlert(who, 'told', { title: firstNameOf(who) + ' flagged '
              + (fresh.length === 1 ? 'a drill' : fresh.length + ' drills'),
            body: fresh.slice(0, 3).map(f => ((lib.names || {})[f.k] || f.k) + ': too ' + f.rate).join(', '),
            tag: 'flag:' + who, t: 'programme' });
          await email(coachOf(who),
            `${nm}: ${fresh.length === 1 ? 'a drill is too ' + fresh[0].rate
              : fresh.length + ' drills flagged'}`,
            mail({ title: `${nm} flagged ${fresh.length === 1 ? 'a drill' : fresh.length + ' drills'}.`,
              paras: [fresh.map(line).join('<br><br>'),
                      'It is on their plan in the dashboard, against the drill.'],
              cta: { href: `${SITE}/lha-coach.html`, label: 'Open the dashboard' },
              signoff: { name: 'London Handstand Academy' } }));
        }
      }
      if (body.hold != null) {
        const h = Number(body.hold) || 0;
        if (h > 0) {
          /* a hold without the shape it was held in cannot be compared to
             anything — a 45s chest-to-wall is not a 5s freestanding */
          const kind = ['ctw', 'slide', 'takeoff', 'free', 'press']
            .includes(body.holdKind) ? body.holdKind : 'ctw';
          p.holds = (p.holds || []).concat([{ s: h, at: now, kind }]).slice(-100);
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
      if (clients()[who]) {
        const f = body.feedback;
        const fk = f && typeof f === 'object' ? String(f.kind || 'note') : '';
        if (fk && !['Drill flags', 'Question'].includes(fk)
            && !(fk.toLowerCase() === 'session feel' && !f.text)) {
          const bits = [].concat(Array.isArray(f.reasons) ? f.reasons.slice(0, 3) : [], f.text ? [String(f.text)] : []);
          await coachAlert(who, 'told', { title: firstNameOf(who) + ': ' + fk.toLowerCase(),
            body: bits.join(' \u00b7 ').slice(0, 160) || 'Open it on the dashboard.', tag: 'said:' + who, t: 'thread' });
        }
        const sx = body.session;
        if (sx && sx.day != null && sx.done) {
          await coachAlert(who, 'trained', { title: firstNameOf(who) + ' finished a session',
            body: [String(sx.name || '').slice(0, 60), Number(sx.actual || sx.mins) ? Math.round(Number(sx.actual || sx.mins)) + ' min' : '']
              .filter(Boolean).join(', ') || 'Today', tag: 'trained:' + who, t: 'progress' });
        }
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

  /* ── changing the address the account is keyed on ────────────────
     Every table keys on email and the foreign keys cascade on delete but
     not on update, so this is a migration, not an UPDATE. It runs in the
     only order that works: create the new row, repoint the children, move
     the settings, then drop the old one.

     The new address is verified first. Sending a code to it proves the
     person asking can read it, which is what stops a typo locking someone
     out of their own account and stops a stolen session moving it. */
  const EMAIL_TABLES = ['messages', 'progress', 'coach_notes', 'cycles',
                        'submissions', 'free_checks', 'applications', 'questions'];
  /* Everything held in settings under the person's own address. Five of
     these were listed and eight were not, so moving an account quietly left
     behind their form check credits, their week, their visits, the plan they
     bought and where they came from. One list, used by the move and by the
     delete, so neither can forget a key the other knows about. */
  const SETTING_KEYS = ['track', 'programme', 'state', 'intake', 'prefs',
                        'fccredits', 'plusuntil', 'visits', 'week', 'wsmine',
                        'plan', 'ref'];

  /* The only order that works, given the foreign keys cascade on delete and
     not on update: the new row first so there is something to point at, then
     the children, then the settings that carry the address in their key,
     then the old row. One implementation, so the coach route and the client
     route cannot drift apart. */
  async function moveAccount(from, to) {
    const old = await getAcct(from);
    if (!old) return { error: 'No account to move', status: 404 };
    if (await getAcct(to)) return { error: 'There is already an account on that address', status: 409 };

    await supa.upsert('accounts', Object.assign({}, old, { email: to }), 'email');
    for (const t of EMAIL_TABLES) {
      await supa.update(t, `email=eq.${enc(from)}`, { email: to }).catch(() => {});
    }
    for (const k of SETTING_KEYS) {
      const v = await getSetting(`${k}:${from}`);
      if (v !== null && v !== undefined) {
        await setSetting(`${k}:${to}`, v);
        await dropSetting(`${k}:${from}`);
      }
    }
    /* A programme that was never opened in the builder has no saved row: it
       lives in the generated file, keyed on the old address. Moving the
       account left it behind and the client read as free, with no plan.
       Snapshot the file version onto the new address so it travels. */
    if (!(await getSetting(`programme:${to}`)) && programmes.clients[from]) {
      await setSetting(`programme:${to}`,
        Object.assign({}, programmes.clients[from], { movedFrom: from, movedAt: Date.now() }));
    }
    /* the roster keys on the address too, so it follows or the client
       quietly stops being anybody's client */
    const roster = (await getSetting('roster')) || {};
    const wasStored = !!roster[from];
    const seeded = parseClients().some(c => c.email === from);
    roster[to] = roster[from] || { name: (old.name || to), coach: norm(old.coach || '') };
    /* a seeded address cannot simply be deleted, the CLIENTS variable puts it
       straight back, so mark it gone the way the roster route does */
    if (seeded) roster[from] = null; else delete roster[from];
    await setSetting('roster', roster);

    await supa.remove('codes', `email=eq.${enc(from)}`).catch(() => {});
    await supa.remove('accounts', `email=eq.${enc(from)}`);
    return { ok: true, name: old.name || '' };
  }

  /* ── deleting an account ─────────────────────────────────────────
     A test account and three duplicates of the same person had no way out
     of the dashboard, so the only route was typing delete statements
     against the live database. This is the same walk as the move without
     the destination: the children go with the row because every one of
     them cascades, and the settings and the roster have to be taken by
     hand because they carry the address in a key rather than a column.

     It does not touch Stripe. A live subscription keeps billing whatever
     happens here, so the caller has to have dealt with that first. */
  async function deleteAccount(e) {
    const old = await getAcct(e);
    if (!old) return { error: 'No account on that address', status: 404 };

    for (const k of SETTING_KEYS) await dropSetting(`${k}:${e}`).catch(() => {});
    await dropSetting(`emailchange:${e}`).catch(() => {});

    /* applications do not hang off the account row, so nothing takes them */
    await supa.remove('applications', `email=eq.${enc(e)}`).catch(() => {});
    await supa.remove('codes', `email=eq.${enc(e)}`).catch(() => {});
    await supa.remove('nudges', `key=like.remind%3A${enc(e)}%3A*`).catch(() => {});

    const roster = (await getSetting('roster')) || {};
    if (roster[e] !== undefined || parseClients().some(c => c.email === e)) {
      /* a seeded address cannot simply be dropped, the CLIENTS variable puts
         it straight back, so it is marked gone rather than removed */
      if (parseClients().some(c => c.email === e)) roster[e] = null; else delete roster[e];
      await setSetting('roster', roster);
    }

    /* last, because everything above reads better while the row is there,
       and because this is the one that takes the messages, the progress,
       the submissions, the check point history and the questions with it */
    await supa.remove('accounts', `email=eq.${enc(e)}`);
    return { ok: true, name: old.name || '' };
  }

  if (path === '/email/request' && request.method === 'POST') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const next = norm(body.next);
    if (!next || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) {
      return json({ error: 'That does not look like an email address' }, 400);
    }
    if (next === who) return json({ error: 'That is already your address' }, 400);

    /* the password, so a borrowed phone cannot move the account */
    const stored = await hashFor(db, who);
    if (!stored || (await pwHash(String(body.password || ''))) !== stored) {
      return json({ error: 'Current password is wrong' }, 401);
    }
    if (await getAcct(next)) return json({ error: 'There is already an account on that address' }, 409);
    if ((await rateHit(`emailchg:${who}`, 3600000)) > 5) {
      return json({ error: 'Too many attempts. Try again later.' }, 429);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await setSetting(`emailchange:${who}`,
      { next, code, expires: Date.now() + CODE_TTL, tries: 0 });
    await email(next, 'Confirm your new email address',
      mail({
        title: 'Confirm your new address.',
        paras: [`Your code is <b style="font-size:22px;letter-spacing:2px">${code}</b>.`,
                `It moves the London Handstand Academy account from ${esc(who)} to this address, `
                + `and it lasts fifteen minutes. If you did not ask for this, ignore it and nothing changes.`],
        signoff: { name: 'London Handstand Academy' },
      }));
    return json({ ok: true, sent: next });
  }

  if (path === '/email/confirm' && request.method === 'POST') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const key = `emailchange:${who}`;
    const pending = await getSetting(key);
    if (!pending || !pending.next) return json({ error: 'Nothing waiting to confirm' }, 400);
    if (Date.now() > (pending.expires || 0)) {
      await dropSetting(key);
      return json({ error: 'That code has expired. Start again.' }, 400);
    }
    if ((pending.tries || 0) >= 5) return json({ error: 'Too many attempts. Start again.' }, 429);
    if (String(body.code || '').trim() !== pending.code) {
      await setSetting(key, Object.assign({}, pending, { tries: (pending.tries || 0) + 1 }));
      return json({ error: 'Wrong code' }, 401);
    }

    const next = norm(pending.next);
    if (await getAcct(next)) {
      await dropSetting(key);
      return json({ error: 'There is already an account on that address' }, 409);
    }

    const moved = await moveAccount(who, next);
    if (moved.error) { await dropSetting(key); return json({ error: moved.error }, moved.status || 400); }
    const old = { name: moved.name };
    await dropSetting(key);

    /* both addresses hear about it: the old one because losing an account
       silently is how a takeover goes unnoticed */
    await email(who, 'Your email address was changed',
      mail({ title: 'Your address has moved.',
        paras: [`Your London Handstand Academy account now uses ${esc(next)}. `
              + `If this was not you, reply to this email straight away.`],
        signoff: { name: 'London Handstand Academy' } }));
    await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL,
      `${old.name || who} changed their email`,
      `<p style="font:16px/1.6 system-ui">${esc(old.name || '')} moved from ${esc(who)}
       to ${esc(next)}. The roster still lists the old address, so update it.</p>`);

    /* a fresh token, because the old one is signed for the old address */
    return json({ ok: true, email: next,
                  token: await sign({ scope: 'app', email: next, exp: Date.now() + TOKEN_TTL }) });
  }

  if (path === '/messages') {
    const who = await me();
    if (!who) return json({ error: 'Sign in first' }, 401);
    if (request.method === 'GET') {
      const [out, typing] = await Promise.all([threadLoad(db, who), typingOf(who, 'coach')]);
      /* reading it is what marks it read, and only when the person
         themselves is reading: a coach previewing a client's app must not
         make their replies look opened. Nor does the app checking from
         another screen: that says read=0, and only the chat itself reads. */
      if (url.searchParams.get('read') !== '0' && out.some(m => m.from === 'coach' && !m.seen)
          && (await realMe()) === who) await markCoachRead(who);
      return json({ messages: out, typing });
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
      let subId = '';
      if (video || image) {
        /* ── a clip is a clip, whoever sent it ────────────────────────
           Only a free account's clip was filed as a submission, so a
           coached client's footage landed in the thread and nowhere else:
           not in the review queue, not in "needs you now", nothing to
           chase it. The only signal was an email, and the email had three
           silent switches in front of it. Marina sent clips and they were
           never seen. Everyone's clip is filed now. The free account's is
           also its form check, which is the only difference. */
        if (!coached) {
          const gate = await fcGate(who);
          if (!gate.ok) return json({ error: gate.error, gated: true }, 402);
        }
        try {
          const plan = programmes.clients[who];
          const cycle = await cycleGet(db, who, plan);
          await ensureAcct(who);
          const [saved] = await supa.insert('submissions',
            { email: who, kind: 'assessment', cycle: cycle.n, numbers: {},
              clips: [{ drill: '',
                        name: text.slice(0, 80)
                          || (coached ? 'Clip sent in the chat' : 'Form check clip'),
                        uid: video || '', image: image || '' }],
              status: 'submitted' });
          subId = saved && saved.id ? saved.id : '';
        } catch (err) { console.warn('chat clip not filed as a submission', err && err.message); }
      }

      const re = await quoteId(who, body.re);
      const tagC = [subId, re ? 're:' + re : ''].filter(Boolean).join(',');
      const addedC = await threadAdd(db, who, { from: 'client', text,
        ...(video ? { video } : {}), ...(image ? { image } : {}),
        ...(tagC ? { sub: tagC } : {}) });
      /* sending is the end of typing */
      try { const t = (await getSetting(typingKey(who))) || {}; if (t.client) { t.client = 0; await setSetting(typingKey(who), t); } } catch {}

      const kind = video ? 'sent a video' : image ? 'sent a photo' : '';
      await email(coachOf(who) || process.env.COACH_EMAIL || process.env.FROM_EMAIL,
        `${clients()[who] || who}: ${text.slice(0, 60) || kind}`,
        `<p style="font:16px/1.6 system-ui">${text.slice(0, 2000) || `They have ${kind}.`}</p>
         <p style="font:13px/1.5 system-ui;color:#666">Reply in the coach view.</p>`);
      await coachAlert(who, 'messages', { title: firstNameOf(who) + (text ? '' : ' ' + kind),
        body: text ? text.slice(0, 160) : 'Open it on the dashboard.', tag: 'msg:' + who, t: 'thread' });
      return json({ ok: true, id: (addedC && addedC.id) || '' });
    }
  }

  /* ── typing, and taking back what you said ───────────────────────── */
  if (path === '/typing' && request.method === 'POST') {
    const who = await realMe();
    if (!who) return json({ error: 'Sign in first' }, 401);
    await typingSet(who, 'client');
    return json({ ok: true });
  }
  /* Delete for everyone, as a chat app has it. A clip that is still
     waiting goes from the review queue with it; one the coach has already
     answered stays, because the answer is about it. */
  if (path === '/messages/delete' && request.method === 'POST') {
    const who = await realMe();
    if (!who) return json({ error: 'Sign in first' }, 401);
    const id = String(body.id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
    const m = id ? await supa.row('messages', `id=eq.${enc(id)}&email=eq.${enc(who)}&sender=eq.client&select=*`) : null;
    if (!m) return json({ error: 'That message is not there any more' }, 404);
    for (const sid of clipTags(m.submission)) {
      const s = await supa.row('submissions', `id=eq.${enc(sid)}&email=eq.${enc(who)}&select=id,status`).catch(() => null);
      if (s && s.status !== 'submitted') return json({ error: coachName(coachOf(who)) + ' has already answered this one, so it stays.' }, 409);
      if (s) await supa.remove('submissions', `id=eq.${enc(sid)}&email=eq.${enc(who)}`).catch(() => {});
    }
    await supa.remove('messages', `id=eq.${enc(id)}&email=eq.${enc(who)}&sender=eq.client`);
    return json({ ok: true });
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
    /* Wipe a client back to a clean account. Destructive and deliberate:
       it names exactly what it cleared, and the chat keeps one message so
       the screen is not an empty void the next time they open it. */
    if (path === '/coach/reset' && request.method === 'POST') {
      const e = norm(body.email);
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      /* usage and the chat only. A reset is about wiping what somebody has
         done, never what they have been given, so the programme, their
         check points and their explainers are all out of scope. */
      const want = Array.isArray(body.parts) ? body.parts : ['activity', 'chat', 'tracking'];
      const done = [];

      if (want.includes('activity')) {
        await supa.remove('progress', `email=eq.${enc(e)}`);
        await supa.update('accounts', `email=eq.${enc(e)}`, { last_seen: null }).catch(() => {});
        done.push('activity');
      }
      if (want.includes('tracking')) {
        await setSetting(`track:${e}`, {});
        done.push('tracking');
      }
      if (want.includes('chat')) {
        await supa.remove('messages', `email=eq.${enc(e)}`);
        const nm = (clients()[e] || '').split(' ')[0];
        await threadAdd(db, e, { from: 'coach',
          text: `Hi${nm ? ' ' + nm : ''}, this is where we talk. Send me a clip, a question, `
              + `or how a session went, and I will come back to you here.` });
        done.push('chat');
      }
      return json({ ok: true, email: e, cleared: done });
    }

    if (path === '/coach/progress/reset' && request.method === 'POST') {
      const e = norm(body.email);
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      await supa.remove('progress', `email=eq.${enc(e)}`);
      return json({ ok: true, cleared: e });
    }

    /* the coach's own notes on a client — never shown in the client app */
    /* One sentence, to one client, about this week. Everything else the app
       tailors, it tailors from state or from the block: nothing let the
       coach say a thing to a person. Private notes are for the coach, so
       this is separate and deliberately visible. */
    if (path === '/coach/week') {
      const e = norm(url.searchParams.get('email') || body.email);
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      const k = `week:${e}`;
      if (request.method === 'POST') {
        const text = String(body.text || '').trim().slice(0, 400);
        if (text) await setSetting(k, { text, at: Date.now(), by: asking || primaryCoach() });
        else await dropSetting(k);
        return json({ ok: true, week: text ? await getSetting(k) : null });
      }
      return json({ week: (await getSetting(k)) || null });
    }

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

    /* the roster itself, so a client can be taken on without a deploy */
    /* ── who else coaches here ───────────────────────────────────────
       Adding a coach used to mean editing a Netlify variable and spending a
       deploy on it. The variable is still where the first one lives, because
       a list that can only be reached from a coach account is a poor place
       for the only way in; everyone after that is kept here. */
    /* ── the ladder's check points ───────────────────────────────────
       The shipped list is in ladder-data.js and the only way to change a
       target or point a check point at the right film was a deploy. Kept as
       an overlay on the shipped one, keyed by k, so anything untouched stays
       as it shipped and a future change to the file still lands. */
    /* the last N days of counts, and the ratios between them */
    if (path === '/coach/funnel') {
      const days = Math.max(7, Math.min(90, Number(url.searchParams.get('days')) || 30));
      const rows = [];
      const totals = {};
      for (let i = 0; i < days; i++) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        const r = (await getSetting(`ev:${d}`)) || {};
        rows.push({ day: d, ...r });
        for (const k of Object.keys(r)) {
          if (typeof r[k] === 'number') totals[k] = (totals[k] || 0) + r[k];
          else if ((k === 'by' || k === 'fix') && r[k] && typeof r[k] === 'object') {
            /* two levels: source, then event */
            totals[k] = totals[k] || {};
            for (const s1 of Object.keys(r[k])) {
              totals[k][s1] = totals[k][s1] || {};
              for (const s2 of Object.keys(r[k][s1] || {})) totals[k][s1][s2] = (totals[k][s1][s2] || 0) + (r[k][s1][s2] || 0);
            }
          }
          else if (r[k] && typeof r[k] === 'object') {
            totals[k] = totals[k] || {};
            for (const s2 of Object.keys(r[k])) totals[k][s2] = (totals[k][s2] || 0) + r[k][s2];
          }
        }
      }
      /* ── the accounts side, minus the ones that are not people ──────
         Every test sign-up lands in the same table as a real client, so
         the owner's headline numbers counted them: fifteen signed up, of
         which nine were mine and Elliott's own test accounts, and the one
         account on the £5 tier was a test card. A number nobody can trust
         is worse than no number. Excluded ones are counted and named, so
         the filter is visible rather than quietly shrinking the figure. */
      const all = (await supa.rows('accounts', 'select=email,plus,first_seen,last_seen')) || [];
      const untils = await plusUntilAll();
      all.forEach(a => { if (untils[a.email]) a.plus_until = untils[a.email]; });
      const marked = (await getSetting('testers')) || {};
      const isTest = a => !!marked[norm(a.email)] || TEST_EMAIL.test(a.email || '');
      const accts = all.filter(a => !isTest(a));
      const tests = all.filter(isTest).map(a => a.email).sort();
      const now = Date.now();
      const acct = {
        total: accts.length,
        plus: accts.filter(plusNow).length,
        active14: accts.filter(a => a.last_seen && now - ms(a.last_seen) < 14 * 86400000).length,
        new7: accts.filter(a => a.first_seen && now - ms(a.first_seen) < 7 * 86400000).length,
        excluded: tests.length,
        tests,
      };
      return json({ days, rows, totals, acct });
    }

    /* ── see it as they see it ───────────────────────────────────────
       A token that names the client and can only read. The coach opens
       the client's own app with it, in an iframe, so anything broken on
       their page is visible rather than described. Half an hour, because
       it is for looking at something now. */
    if (path === '/coach/preview' && request.method === 'GET') {
      const e = norm(url.searchParams.get('email'));
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      return json({ email: e,
        token: await sign({ scope: 'preview', email: e, exp: Date.now() + 30 * 60000 }) });
    }

    /* Which accounts are not people. A list Elliott keeps, on top of the
       addresses that are obviously not real. */
    if (path === '/coach/testers') {
      if (request.method === 'GET') {
        const marked = (await getSetting('testers')) || {};
        return json({ testers: Object.keys(marked).filter(k => marked[k]).sort(),
                      pattern: String(TEST_EMAIL) });
      }
      if (request.method === 'POST') {
        const list = Array.isArray(body.testers) ? body.testers : [];
        const next = {};
        list.map(x => norm(x)).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x))
            .slice(0, 200).forEach(e => { next[e] = true; });
        await setSetting('testers', next);
        return json({ ok: true, testers: Object.keys(next).sort() });
      }
      return json({ error: 'Nope' }, 405);
    }

    /* ── the codes ───────────────────────────────────────────────────── */
    if (path === '/coach/codes') {
      const codes = (await getSetting('codes')) || {};
      const list = () => Object.keys(codes).sort().map(k => ({
        code: k, days: codes[k].days || 30, max: codes[k].max || 0, used: codes[k].used || 0,
        until: codes[k].until || '', off: !!codes[k].off, note: codes[k].note || '' }));
      if (request.method === 'GET') return json({ codes: list() });
      if (request.method === 'POST') {
        if (!(await isOwner())) return json(ownerOnly, 403);
        const code = String(body.code || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
        if (!code) return json({ error: 'Need a code' }, 400);
        if (body.remove) { delete codes[code]; }
        else if (body.off !== undefined && codes[code]) { codes[code].off = !!body.off; }
        else {
          if (Object.keys(codes).length >= 100) return json({ error: 'That is a lot of codes' }, 400);
          const prev = codes[code] || {};
          codes[code] = Object.assign({}, prev, {
            days: Math.max(1, Math.min(365, Number(body.days) || prev.days || 30)),
            max: Math.max(0, Math.min(10000, Number(body.max) || 0)),
            note: String(body.note || prev.note || '').slice(0, 80),
            until: body.until ? String(body.until).slice(0, 10) : (prev.until || ''),
            used: prev.used || 0, by: prev.by || [], off: false });
        }
        await setSetting('codes', codes);
        return json({ ok: true, codes: list() });
      }
      return json({ error: 'Nope' }, 405);
    }

    /* a drill's level and grouping on one stage, on its own. The bands
       route can do this but only alongside a written list, and the gaps
       view is for stages that have no list yet. */
    if (path === '/coach/drillmeta' && request.method === 'POST') {
      const stage = String(Number(body.stage));
      if (!/^[0-5]$/.test(stage)) return json({ error: 'Which stage?' }, 400);
      const v = String(body.v || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
      if (!v) return json({ error: 'Which drill?' }, 400);
      const extra = (await getSetting('ladder:extra')) || {};
      const list = (extra[stage] || []).slice();
      const at = list.findIndex(x => x && x.v === v);
      const prev = at > -1 ? list[at] : {};
      const L = Math.max(1, Math.min(4, Number(body.L) || prev.L || 2));
      const g = String(body.g || prev.g || 'Strength').slice(0, 40);
      if (at > -1) list[at] = { v, g, L }; else list.push({ v, g, L });
      extra[stage] = list;
      await setSetting('ladder:extra', extra);
      return json({ ok: true, ladderExtra: extra });
    }

    if (path === '/coach/checkpoints') {
      const all = (await getSetting('ladder:checkpoints')) || {};
      if (request.method === 'GET') return json({ ladderCps: all });
      if (request.method === 'POST') {
        const stage = String(Number(body.stage));
        if (!/^[0-5]$/.test(stage)) return json({ error: 'Which stage?' }, 400);
        const KINDS = ['secs', 'count', 'rate', 'breaks', 'yn', 'face'];
        const one = c => {
          const out = {};
          const k = String((c && c.k) || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
          if (!k) return null;
          out.k = k;
          if (typeof c.n === 'string' && c.n.trim()) out.n = c.n.trim().slice(0, 80);
          if (KINDS.includes(c.kind)) out.kind = c.kind;
          const t = Number(c.target);
          if (Number.isFinite(t) && t > 0) out.target = Math.round(t);
          if (typeof c.demo === 'string') {
            const d = c.demo.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
            out.demo = d;                       /* empty clears it */
          }
          if (typeof c.note === 'string') out.note = c.note.slice(0, 200);
          if (typeof c.unit === 'string') out.unit = c.unit.slice(0, 8);
          if (c.lower !== undefined) out.lower = !!c.lower;
          if (Array.isArray(c.faces) && c.faces.length === 3) {
            out.faces = c.faces.map(x => String(x).slice(0, 30));
          }
          return out;
        };
        const edit = {}, add = [];
        for (const c of (Array.isArray(body.edit) ? body.edit : []).slice(0, 40)) {
          const r = one(c); if (r) { const { k, ...rest } = r; edit[k] = rest; }
        }
        for (const c of (Array.isArray(body.add) ? body.add : []).slice(0, 20)) {
          const r = one(c);
          if (r && r.n) add.push(Object.assign({ kind: 'count', target: 10 }, r));
        }
        const off = (Array.isArray(body.off) ? body.off : []).slice(0, 40)
          .map(x => String(x).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)).filter(Boolean);
        const order = (Array.isArray(body.order) ? body.order : []).slice(0, 60)
          .map(x => String(x).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)).filter(Boolean);
        const row = {};
        if (Object.keys(edit).length) row.edit = edit;
        if (add.length) row.add = add;
        if (off.length) row.off = off;
        if (order.length) row.order = order;
        if (Object.keys(row).length) all[stage] = row; else delete all[stage];
        await setSetting('ladder:checkpoints', all);
        return json({ ok: true, ladderCps: all });
      }
      return json({ error: 'Nope' }, 405);
    }

    if (path === '/coach/coaches') {
      const env = envCoaches();
      /* Who is on the list, and whether each of them can actually get in
         yet: a coach with no password has only the emailed code, and mail
         is the part that fails. Built in one place, because the list handed
         back after a change was a second copy without hasPw, which offered
         to set a first password for coaches who already had one. */
      const rowsNow = async () => {
        const out = Object.keys(coaches()).map(e => ({
          email: e, name: coaches()[e] || e.split('@')[0],
          fixed: e in env,                     /* in the variable, not editable here */
          you: e === asking,
          clients: rosterList().filter(c => coachOf(c.email) === e && clients()[c.email]).length,
        }));
        for (const r of out) r.hasPw = !!(await hashFor(db, r.email));
        return out;
      };
      if (request.method === 'GET') {
        return json({ coaches: await rowsNow(), youArePrimary: isPrimary(asking) });
      }
      if (request.method === 'POST') {
        if (!isPrimary(asking)) {
          return json({ error: 'Only the account in the Netlify variable can change this list.' }, 403);
        }
        const e = norm(body.email);
        if (!e || !e.includes('@')) return json({ error: 'Need an email' }, 400);
        const stored = (await getSetting('coaches')) || {};
        if (body.remove) {
          if (e in env) return json({ error: 'That one is set in Netlify, not here.' }, 400);
          delete stored[e];
          /* their clients fall back to the coach in the variable rather than
             to nobody, or a thread would have no one answering it */
          const roster = (await getSetting('roster')) || {};
          for (const k of Object.keys(roster)) {
            if (roster[k] && norm(roster[k].coach || '') === e) roster[k].coach = '';
          }
          await setSetting('roster', roster);
        } else {
          if (Object.keys(stored).length >= 20) return json({ error: 'That is a lot of coaches.' }, 400);
          stored[e] = String(body.name || '').slice(0, 60) || e.split('@')[0];
          await ensureAcct(e);
        }
        await setSetting('coaches', stored);
        COACHES_STORED = stored;
        return json({ ok: true, email: e, removed: !!body.remove, coaches: await rowsNow() });
      }
      return json({ error: 'Nope' }, 405);
    }

    /* move a client from one coach to another */
    if (path === '/coach/assign' && request.method === 'POST') {
      const e = norm(body.email);
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      const to = norm(body.coach || '');
      if (to && coaches()[to] === undefined) return json({ error: 'Not a coach' }, 400);
      const stored = (await getSetting('roster')) || {};
      const was = stored[e] || rosterList().find(x => x.email === e) || {};
      stored[e] = { name: was.name || e, coach: to };
      await setSetting('roster', stored);
      return json({ ok: true, email: e, coach: to || primaryCoach() });
    }

    if (path === '/coach/roster') {
      if (request.method === 'GET') {
        return json({ roster: rosterList(),
                      stored: Object.keys((await getSetting('roster')) || {}) });
      }
      if (request.method === 'POST') {
        const e = norm(body.email);
        if (!e || !e.includes('@')) return json({ error: 'Need an email' }, 400);
        const stored = (await getSetting('roster')) || {};
        if (body.remove) {
          /* a seeded client cannot simply be dropped from the object — the
             variable would put them straight back, so mark the removal */
          /* marked, not deleted, seeded or not: a client with a programme
             would otherwise be put straight back on by the roster check */
          stored[e] = null;
        } else {
          if (Object.keys(stored).length >= 200) return json({ error: 'Roster is full' }, 400);
          stored[e] = { name: String(body.name || '').slice(0, 60) || e,
                        coach: norm(body.coach || '') };
          await ensureAcct(e);
        }
        await setSetting('roster', stored);
        return json({ ok: true, email: e, removed: !!body.remove });
      }
    }

    /* ── blocks ───────────────────────────────────────────────────
       A client trains one programme and the coach writes the next one
       while they are still on it. Until now there was one copy: editing
       it changed what they were doing today, halfway through being
       written. A draft is the same programme under its own name. Putting
       it live swaps the two, keeps the old one where it can be brought
       back, and moves the block number on so the app says which block
       they are in. */
    if (path === '/coach/blocks') {
      const e = norm(url.searchParams.get('email') || body.email);
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      const dkey = `progdrafts:${e}`, akey = `progarchive:${e}`;
      const sum = p => ({ days: (p && p.days || []).length,
        drills: (p && p.days || []).reduce((n, d) =>
          n + (d.groups || []).reduce((m, g) => m + (g.items || []).length, 0), 0) });
      const state = async () => {
        const drafts = (await getSetting(dkey)) || {};
        const arch = (await getSetting(akey)) || [];
        const live = (await getSetting(`programme:${e}`)) || programmes.clients[e] || { days: [] };
        let n = 1;
        try { n = (await cycleGet(db, e, programmes.clients[e])).n || 1; } catch {}
        return json({
          block: n,
          live: Object.assign({ label: live.label || `Block ${n}`, editedAt: live.editedAt || 0 }, sum(live)),
          drafts: Object.keys(drafts).map(id => Object.assign(
            { id, label: (drafts[id] || {}).label || id, at: (drafts[id] || {}).at || 0 },
            sum((drafts[id] || {}).prog))),
          archive: arch.map((a, i) => Object.assign({ i, label: a.label || '', at: a.at || 0 }, sum(a.prog))),
        });
      };
      if (request.method === 'GET') return state();
      if (request.method !== 'POST') return json({ error: 'Nope' }, 405);

      const act = String(body.action || '');
      const drafts = (await getSetting(dkey)) || {};

      if (act === 'new') {
        const id = 'b' + Date.now().toString(36);
        const from = String(body.from || '');
        const live = (await getSetting(`programme:${e}`)) || programmes.clients[e] || { days: [] };
        const prog = from === 'live' ? JSON.parse(JSON.stringify(live))
          : Object.assign({}, live, { days: [] });
        prog.label = String(body.label || '').slice(0, 40) || 'Next block';
        drafts[id] = { label: prog.label, prog, at: Date.now() };
        await setSetting(dkey, drafts);
        return state();
      }
      /* a whole block pasted in, rather than built a drill at a time */
      if (act === 'import') {
        const days = cleanDays(body.days);
        if (!days.length) return json({ error: 'No days in that.' }, 400);
        const id = 'b' + Date.now().toString(36);
        const live = (await getSetting(`programme:${e}`)) || programmes.clients[e] || {};
        const prog = Object.assign({}, live, { days,
          label: String(body.label || '').slice(0, 40) || 'Pasted block' });
        drafts[id] = { label: prog.label, prog, at: Date.now() };
        await setSetting(dkey, drafts);
        return state();
      }
      if (act === 'rename') {
        const id = String(body.id || '');
        if (!drafts[id]) return json({ error: 'No such draft' }, 404);
        drafts[id].label = String(body.label || '').slice(0, 40) || drafts[id].label;
        if (drafts[id].prog) drafts[id].prog.label = drafts[id].label;
        await setSetting(dkey, drafts);
        return state();
      }
      if (act === 'discard') {
        const id = String(body.id || '');
        delete drafts[id];
        await setSetting(dkey, drafts);
        return state();
      }
      if (act === 'promote') {
        const id = String(body.id || '');
        const d = drafts[id];
        if (!d || !d.prog) return json({ error: 'No such draft' }, 404);
        if (!(d.prog.days || []).length) {
          return json({ error: 'That block has no days in it yet.' }, 400);
        }
        const live = (await getSetting(`programme:${e}`)) || programmes.clients[e] || { days: [] };
        let n = 1;
        try { n = (await cycleGet(db, e, programmes.clients[e])).n || 1; } catch {}
        /* the one coming off is kept, named, so it can go back on */
        const arch = (await getSetting(akey)) || [];
        arch.unshift({ at: Date.now(), label: live.label || `Block ${n}`, prog: live });
        await setSetting(akey, arch.slice(0, 12));
        const next = Object.assign({}, d.prog, { label: d.label || `Block ${n + 1}`, editedAt: Date.now() });
        await setSetting(`programme:${e}`, next);
        delete drafts[id];
        await setSetting(dkey, drafts);
        /* a new block starts its own clock, which is what the test date and
           "week 3 of 6" are counted from */
        await supa.upsert('cycles', { email: e, n: n + 1, started_at: nowISO() }, 'email');
        const nm = clients()[e] || '';
        await email(e, 'Your next block is in the app',
          mail({ title: 'Block ' + (n + 1) + ' is ready.',
            paras: [`${esc(nm ? nm.split(' ')[0] : 'Hello')}, the next block is in the app now. `
              + `Same place, new days.`],
            cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
            signoff: { name: coachName(coachOf(e) || primaryCoach()) } }), 'reminders');
        await notify(e, { title: 'Block ' + (n + 1) + ' is ready',
          body: 'Your next block is in the app. Same place, new days.',
          url: '/lha-app.html?go=plan', tag: 'block' }, 'reminders');
        return state();
      }
      if (act === 'restore') {
        const arch = (await getSetting(akey)) || [];
        const i = Number(body.i);
        const a = arch[i];
        if (!a || !a.prog) return json({ error: 'Nothing to bring back' }, 404);
        const live = (await getSetting(`programme:${e}`)) || programmes.clients[e] || { days: [] };
        arch.splice(i, 1);
        arch.unshift({ at: Date.now(), label: live.label || 'Was live', prog: live });
        await setSetting(akey, arch.slice(0, 12));
        await setSetting(`programme:${e}`, Object.assign({}, a.prog, { editedAt: Date.now() }));
        return state();
      }
      return json({ error: 'Nope' }, 400);
    }

    if (path === '/coach/programme') {
      if (request.method === 'GET') {
        const e = norm(url.searchParams.get('email'));
        if (!e) return json({ error: 'Which client?' }, 400);
        if (!owns(e)) return json({ error: 'Not your client' }, 403);
        await ensureCustom();
        const slot = String(url.searchParams.get('slot') || '').replace(/[^a-z0-9-]/gi, '').slice(0, 24);
        const saved = await getSetting(`programme:${e}`);
        let cur = saved || programmes.clients[e] || { days: [] };
        if (slot) {
          const d = ((await getSetting(`progdrafts:${e}`)) || {})[slot];
          if (d && d.prog) cur = d.prog;
        }
        return json({
          email: e,
          slot: slot || '',
          edited: !!saved,
          plan: hydratePlan(cur),
          library: await libraryNow(),
          /* every explainer that exists, and which of them this client has */
          explainerLib: programmes.explainers || {},
          explainersOn: Array.isArray(cur.explainers)
            ? cur.explainers
            : (cur.answers || []).map(a => a && a.v).filter(Boolean),
        });
      }
      if (request.method === 'POST') {
        const e = norm(body.email);
        if (!e) return json({ error: 'Which client?' }, 400);
        if (!owns(e)) return json({ error: 'Not your client' }, 403);
        /* ── which copy is being written ──────────────────────────
           A block was edited in place, so there was no way to write the
           next one without the client training it while it was half
           written. A draft is the same shape stored under its own name,
           and the dashboard puts one live when it is ready. */
        const slot = String(body.slot || '').replace(/[^a-z0-9-]/gi, '').slice(0, 24);
        const drafts = (await getSetting(`progdrafts:${e}`)) || {};
        const live = (await getSetting(`programme:${e}`)) || programmes.clients[e] || {};
        const base = slot ? ((drafts[slot] || {}).prog || live) : live;
        /* only what the builder edits is taken from the request; the rest of
           the plan — the read, the test, the coach's notes — carries over */
        const next = Object.assign({}, base, {
          client: String(body.client || base.client || '').slice(0, 60),
          goal: String(body.goal || base.goal || '').slice(0, 300),
          /* Only what was sent is replaced. Posting check points on their
             own used to blank the programme, because days defaulted to an
             empty list rather than to what was already there. */
          days: cleanDays(Array.isArray(body.days) ? body.days : (base.days || [])),
          /* the coach's check points for this client. Left alone when the
             builder does not send them, so saving a programme cannot wipe
             them. */
          explainers: Array.isArray(body.explainers)
            ? body.explainers.slice(0, 40).map(v => String(v || '').slice(0, 80))
                .filter(v => (programmes.explainers || {})[v])
            : (Array.isArray(base.explainers) ? base.explainers
               : (base.answers || []).map(a => a && a.v).filter(Boolean)),
          checkpoints: Array.isArray(body.checkpoints)
            ? body.checkpoints.slice(0, 20).map(c => {
                const was = (base.checkpoints || []).find(x => x.k === c.k);
                const tgt = Number(c.target);
                return {
                  k: String(c.k || '').slice(0, 32),
                  n: String(c.n || '').slice(0, 80),
                  kind: ['secs', 'count', 'rate', 'yn', 'face'].includes(c.kind) ? c.kind : 'count',
                  note: String(c.note || '').slice(0, 200),
                  /* The target was being dropped here, so a coach-set check
                     point had nothing to be measured against: the app's slider
                     had no end to run to and "reached" could never be true.
                     The demo went the same way, which is why they never had a
                     clip showing how to test the thing. */
                  target: Number.isFinite(tgt) && tgt >= 0 && tgt <= 100000
                    ? Math.round(tgt * 10) / 10 : null,
                  unit: String(c.unit || '').slice(0, 8),
                  lower: !!c.lower,
                  demo: String(c.demo || '').slice(0, 60),
                  faces: Array.isArray(c.faces)
                    ? c.faces.slice(0, 3).map(x => String(x || '').slice(0, 24)) : undefined,
                  video: c.video !== false,
                  /* the day it starts showing in their app. Blank means now. */
                  from: /^\d{4}-\d{2}-\d{2}$/.test(String(c.from || '')) ? String(c.from) : '',
                  /* stamped once, so re-saving a programme does not make an
                     old check point look new all over again */
                  addedAt: (was && was.addedAt) || Date.now(),
                };
              }).filter(c => c.k && c.n)
            : (base.checkpoints || []),
          editedAt: Date.now(),
        });
        if (slot) {
          drafts[slot] = Object.assign({}, drafts[slot] || {}, { prog: next, at: Date.now() });
          await setSetting(`progdrafts:${e}`, drafts);
          /* nobody is training a draft, so nothing is announced */
          return json({ ok: true, draft: slot, plan: hydratePlan(next) });
        }
        await setSetting(`programme:${e}`, next);

        /* Tell them a new one has landed. Only genuinely new keys, and only
           ones already showing: a check point scheduled for three weeks time
           is not news today. The app flags it either way when it appears. */
        const hadKeys = new Set((base.checkpoints || []).map(c => c.k));
        const today = new Date().toISOString().slice(0, 10);
        const fresh = (next.checkpoints || [])
          .filter(c => !hadKeys.has(c.k) && (!c.from || c.from <= today));
        if (fresh.length) {
          const nm = clients()[e] || '';
          const T = await emailCopy('newCheckpoints', { name: esc(nm ? nm.split(' ')[0] : 'Hello'),
            n: fresh.length === 1 ? 'a check point' : fresh.length + ' check points',
            list: fresh.map(c => `<b>${esc(c.n)}</b>${c.note ? '<br>' + esc(c.note) : ''}`).join('<br><br>') });
          await email(e, T.subject,
            mail({
              title: T.title,
              paras: T.paras,
              cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
              signoff: { name: coachName(coachOf(e) || primaryCoach()) }, footnote: T.footnote || undefined,
            }), 'reminders');
          await notify(e, { title: fresh.length === 1 ? 'A new check point' : fresh.length + ' new check points',
            body: fresh.slice(0, 3).map(c => c.n).join(', ') + '. Log it when you next test yourself.',
            url: '/lha-app.html?go=cps', tag: 'cp-new' }, 'reminders');
        }
        await ensureCustom();
        return json({ ok: true, plan: hydratePlan(next), notified: fresh.length });
      }
    }

    if (path === '/coach/progress') {
      const e = norm(url.searchParams.get('email'));
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      /* one read of every setting and the progress row together: these were
         nine reads one after another, for every client, on every open */
      const [S, prog] = await Promise.all([
        settingsMany([`programme:${e}`, `week:${e}`, `intake:${e}`, `track:${e}`, `visits:${e}`, `flagseen:${e}`]),
        supa.row('progress', `email=eq.${enc(e)}&select=*`),
      ]);
      /* the same block clock the client is shown, so the two screens cannot
         disagree about which block it is or when the test is due */
      const cyc = clients()[e]
        ? await cycleGet(db, e, S[`programme:${e}`] || programmes.clients[e] || null)
        : null;
      return json({ email: e, name: clients()[e] || e,
                    cycle: cyc,
                    week: S[`week:${e}`] || null,
                    intake: S[`intake:${e}`] || null,
                    track: S[`track:${e}`] || null,
                    /* so the dashboard can name a check point the coach set
                       rather than showing its key */
                    checkpoints: (S[`programme:${e}`] || {}).checkpoints || [],
                    visits: S[`visits:${e}`] || {},
        progress: prog ? { opens: prog.opens || [], sessions: prog.sessions || [], holds: prog.holds || [],
  flags: prog.flags || {}, tests: prog.tests || [], feedback: prog.feedback || [],
  bestHold: prog.best_hold || 0, lastSeen: ms(prog.last_seen) } : {},
        /* when this coach last said they had read the flags */
        flagSeen: Number(S[`flagseen:${e}`] || 0) });
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
    /* Elliott moving a client's address himself. No code to the new
       inbox: the point of this route is the client who has lost the old
       one and cannot receive anything. He is the authority, so the guard
       is that he has to type it. */
    if (path === '/coach/email' && request.method === 'POST') {
      const from = norm(body.email), to = norm(body.next);
      if (!from || !to) return json({ error: 'Need both addresses' }, 400);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json({ error: 'That is not an email address' }, 400);
      if (from === to) return json({ error: 'Those are the same address' }, 400);
      if (!owns(from)) return json({ error: 'Not your client' }, 403);

      const moved = await moveAccount(from, to);
      if (moved.error) return json({ error: moved.error }, moved.status || 400);

      await email(to, 'Your email address was changed',
        mail({ title: 'Your address has moved.',
          paras: [`Elliott has moved your London Handstand Academy account to this address. `
                + `Everything came with it: your programme, your progress and the whole chat. `
                + `You sign in with ${esc(to)} from now on.`],
          cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
          signoff: { name: coachName(coachOf(to) || primaryCoach()) } }));

      return json({ ok: true, from, to, name: moved.name });
    }

    /* ── deleting somebody's account ────────────────────────────
       The owner's alone, and gone for good: the messages, the progress,
       the check point history, the submissions and the questions go with
       the row. The address has to be typed again to confirm, because a
       button that deletes a person on one press is a button that will
       eventually be pressed by accident.

       Two refusals are worth more than the button itself. A coach is not
       deleted here, or one could remove the other. An account still on a
       live subscription is not deleted either: Stripe would carry on
       taking the money with nothing left to show for it, so that has to
       be cancelled first, deliberately, somewhere that can actually do
       it. */
    if (path === '/coach/account/delete' && request.method === 'POST') {
      if (!(await isOwner())) return json(ownerOnly, 403);
      const e = norm(body.email);
      if (!e) return json({ error: 'Which account?' }, 400);
      if (norm(body.confirm) !== e) {
        return json({ error: 'Type the address again to confirm it' }, 400);
      }
      if (e === asking) return json({ error: 'That is your own account' }, 400);
      if (coaches()[e] !== undefined || coachList().includes(e)) {
        return json({ error: 'That is a coach. Remove them from the coaches list instead.' }, 400);
      }
      const acct = await getAcct(e);
      if (!acct) return json({ error: 'No account on that address' }, 404);
      const live = acct.subscription && !acct.cancel_at;
      if (live && !body.force) {
        return json({ error: 'That account is still on a live subscription. '
          + 'Cancel it in Stripe first, or the card keeps being charged.' }, 409);
      }

      const gone = await deleteAccount(e);
      if (gone.error) return json({ error: gone.error }, gone.status || 400);
      return json({ ok: true, email: e, name: gone.name });
    }

    if (path === '/coach/setpw' && request.method === 'POST') {
      const e = norm(body.email);
      const pw = String(body.password || '');
      if (!e || pw.length < 8) return json({ error: 'Need an email and 8+ characters' }, 400);
      /* Setting a password is how a coach helps a client who is locked out.
         Pointed at another coach it is how one takes the other's account,
         and with coaches addable from a screen that stops being theoretical.

         The first one is the exception. A coach added from the dashboard had
         exactly one door, the emailed code, and if that mail does not arrive
         they are locked out for good while the only person who could help is
         forbidden from helping. So the primary may seed a password for a
         coach they added, and only while that account has never had one.
         An account already in use still cannot be taken from its owner. */
      if (e !== asking && coaches()[e] !== undefined) {
        const seeding = isPrimary(asking) && !isPrimary(e) && !(await hashFor(db, e));
        if (!seeding) {
          return json({ error: 'That is another coach. They set their own password.' }, 403);
        }
      }
      const hash = await pwHash(pw);
      const acct = await getAcct(e);
      await ensureAcct(e);
      await saveAcct({ email: e, hash });
      await supa.remove('rate_limits', `key=eq.${enc('pw:' + e)}`);
      return json({ ok: true, email: e, hadAccount: !!acct });
    }

    if (path === '/coach/grant' && request.method === 'POST') {
      if (!(await isOwner())) return json(ownerOnly, 403);
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
      const refRows = (await supa.rows('settings', `select=key,value&key=like.ref%3A*`)) || [];
      const refs = {}; for (const r of refRows) refs[r.key.slice(4)] = r.value;
      /* Named, not spread. The row carries the salted password hash, and
         spreading it sent every account's hash to the browser to draw a
         list that never needed it. */
      const untils = await plusUntilAll();
      return json({ leads: out.map(a => ({
        email: a.email, name: a.name || '',
        ref: refs[a.email] || '',
        plus: plusNow(Object.assign({}, a, untils[a.email] ? { plus_until: untils[a.email] } : {})),
        plusAt: ms(a.plus_at),
        /* a code, not Stripe, and when it runs out */
        until: untils[a.email] || '',
        last: ms(a.last_seen), first: ms(a.first_seen),
        stripeCustomer: a.stripe_customer || null })) });
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

    /* the last sixty emails this site tried to send, and what happened */
    if (path === '/coach/maillog' && request.method === 'GET') {
      const log = (await getSetting('maillog')) || [];
      return json({ log: log.slice(-60).reverse() });
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
      /* EMAIL_ONLY fails closed and says nothing, which is right while
         testing and dangerous afterwards: left set, every sign-in code,
         receipt and booking confirmation goes nowhere and every screen
         still says an email is on its way. The dashboard could not see it,
         so it is reported here. The addresses are not returned, only how
         many and whether they are Elliott's own. */
      const only = mailList('EMAIL_ONLY');
      return json({ suppress: g ? !!g.suppress : true,
                    clients: Object.keys(clients()).length, off,
                    only: only.length,
                    onlyIsYou: only.length > 0 && only.every(a => coachList().includes(a)),
                    block: mailList('EMAIL_BLOCK').length,
                    resend: !!process.env.RESEND_API_KEY,
                    from: process.env.FROM_EMAIL || '' });
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

    if (path === '/coach/feedback') {
      const log = (await getSetting('feedback:log')) || [];
      if (request.method === 'POST') {
        /* ticking one off, so the list is a queue rather than a pile */
        const id = String(body.id || '').trim();
        const i = log.findIndex(x => x && x.id === id);
        if (i < 0) return json({ error: 'No such one' }, 404);
        log[i].done = body.done !== false;
        await setSetting('feedback:log', log);
        return json({ ok: true, feedback: log });
      }
      return json({ feedback: log });
    }

    if (path === '/coach/questions') {
      /* same missing table: the dashboard should say "nothing to answer",
         not fall over on the tab that lists what needs answering */
      let rows = [];
      try { rows = await supa.rows('questions', 'select=*&order=created_at.desc'); }
      catch (err) { if (!missingTable(err)) throw err; return json({ questions: [], off: true }); }
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
      await notify(q.email, { title: nm + ' answered your question',
        body: String(answer).slice(0, 140), url: '/lha-app.html?go=answer', tag: 'question' }, 'replies');
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
      /* Accepted used to change a word in a list and nothing else. The
         applicant found out only if the coach also wrote to them by hand,
         and could not read that thread anyway, having no password. */
      if (status === 'accepted') {
        const app = await supa.row('applications', `id=eq.${enc(id)}&select=email,name`);
        if (app && app.email) {
          const noPw = !(await hashFor(db, norm(app.email)));
          await email(norm(app.email), 'Yes. Let us start.',
            mail({ title: 'Yes. Let us start.',
              greeting: String(app.name || '').split(' ')[0] || '',
              paras: ['I have read your application and I would like to coach you.',
                      `Coaching is ${PRICES.online.label} a month online, or ${PRICES.inperson.label} with a session in London each month. Pick one on the site and pay there; the app opens the moment it goes through, with a message from me asking for your first two clips.`,
                      noPw ? 'You have an account under this address with no password yet. On the app sign in screen press Set a password and a code comes here.' : '',
                      'If you have questions before you decide, reply to this.'].filter(Boolean),
              cta: { href: `${SITE}/#coaching`, label: 'Start coaching' },
              signoff: { name: coachName(asking || primaryCoach()) } }));
        }
      }
      return json({ ok: true, id, status });
    }

    if (path === '/coach/queue') {
      /* ── everything that has come in and is waiting on you ────────────
         This read every setting for every person one after another, and
         the roster holds every account that has ever had a message, which
         is every sign-up since each one is sent a welcome. So Today took
         as long as the list was long. It is a handful of reads now, all at
         once, whoever is on the list. */
      const roster = await rosterRows();
      const mine = Object.keys(roster).filter(e => owns(e));
      const coached = mine.filter(e => clients()[e]);
      const inList = list => enc(list.map(e => '"' + e + '"').join(','));
      const keys = [];
      for (const e of mine) keys.push(`msgdone:${e}`);
      for (const e of coached) keys.push(`track:${e}`, `programme:${e}`, `saidseen:${e}`, `cpseen:${e}`, `trainseen:${e}`);
      const since60 = new Date(Date.now() - 60 * 864e5).toISOString();
      const [S, msgs, progRows, waiting, known] = await Promise.all([
        settingsMany(keys),
        supa.rows('messages', `created_at=gte.${enc(since60)}&select=id,email,sender,body,video,image,submission,read_at,created_at&order=created_at.asc`),
        coached.length ? supa.rows('progress', `email=in.(${inList(coached)})&select=email,feedback,sessions`) : [],
        supa.rows('submissions', 'status=eq.submitted&select=*&order=created_at.asc'),
        coached.length ? supa.rows('submissions', `email=in.(${inList(coached)})&select=email,clips`) : [],
      ]);
      const out = [];
      const nameOf = e => clients()[e] || (roster[e] && roster[e].name) || e;

      /* ── a message you have not answered ────────────────────────────
         It used to count only messages nobody had opened, so one you read
         and meant to come back to left Today the moment the thread was on
         screen, which is how things got missed. A message waits now until
         you reply, or say it needs no reply. A clip in the chat has its
         own review row, so only the words are counted here. */
      const byWho = {};
      for (const m of (msgs || [])) (byWho[m.email] = byWho[m.email] || []).push(m);
      for (const e of mine) {
        const list = byWho[e] || [];
        if (!list.length) continue;
        let after = Number(S[`msgdone:${e}`]) || 0;
        for (const m of list) if (m.sender === 'coach') after = Math.max(after, ms(m.created_at));
        const wait = list.filter(m => m.sender === 'client' && !clipTags(m.submission).length && ms(m.created_at) > after);
        if (!wait.length) continue;
        const lastM = wait[wait.length - 1];
        out.push({ email: e, name: nameOf(e), coached: !!clients()[e],
          id: 'msg:' + e, kind: 'msg', at: ms(wait[0].created_at), clips: 0, n: wait.length,
          unread: wait.filter(m => !m.read_at).length,
          msgs: wait.slice(-4).map(m => ({ text: String(m.body || '').slice(0, 600),
            image: !!m.image, video: !!m.video, at: ms(m.created_at), unread: !m.read_at })),
          numbers: { name: String(lastM.body || (lastM.image ? 'A photo' : 'A message')).slice(0, 140) } });
      }

      const progOf = {};
      for (const p of (progRows || [])) progOf[p.email] = p;
      const knownBy = {};
      for (const s of (known || [])) {
        const set = knownBy[s.email] = knownBy[s.email] || new Set();
        for (const c of (s.clips || [])) set.add(c && typeof c === 'object' ? (c.uid || c.video) : c);
      }
      for (const e of coached) {
        const p = progOf[e] || {};
        /* ── what they told you from inside a session ──────────────
           Skipping a day, a check-in, a session that felt too hard, why they
           stopped early. Flags and questions have their own rows. */
        const sinceSaid = Math.max(Number(S[`saidseen:${e}`]) || 0, Date.now() - 30 * 864e5);
        const said = (p.feedback || []).filter(f => f && (f.at || 0) > sinceSaid
          && !['Drill flags', 'Question'].includes(f.kind)
          && !(String(f.kind || '').toLowerCase() === 'session feel' && !f.text));
        if (said.length) {
          out.push({ email: e, name: nameOf(e), coached: true,
            id: 'said:' + e, kind: 'said', at: said[0].at, clips: 0, n: said.length,
            said: said.slice(-8).map(f => ({ kind: f.kind || 'note', text: f.text || '',
              reasons: f.reasons || [], context: f.context || '', at: f.at })),
            numbers: { name: said.slice(-3).map(f => (f.kind || 'note')
              + (f.text ? ': ' + String(f.text).slice(0, 60) : '')).join(' · ') } });
        }
        /* ── sessions finished ─────────────────────────────────────
           Nothing to answer, but it is the thing you most want to know
           happened, and it showed only as a number on their own screen. */
        const sinceTrain = Math.max(Number(S[`trainseen:${e}`]) || 0, Date.now() - 7 * 864e5);
        const trained = (p.sessions || []).filter(x => x && (x.at || 0) > sinceTrain && (x.done || x.kind === 'part'));
        if (trained.length) {
          out.push({ email: e, name: nameOf(e), coached: true,
            id: 'trained:' + e, kind: 'trained', at: trained[0].at, clips: 0, n: trained.length,
            sessions: trained.slice(-6).map(x => ({ name: x.name || '', mins: Math.round(Number(x.actual || x.mins) || 0),
              done: !!x.done, got: x.got || 0, of: x.of || 0, stoppedAt: x.stoppedAt || '', at: x.at })),
            numbers: { name: trained.slice(-3).map(x => x.name || 'A session').join(' · ') } });
        }

        const tr = S[`track:${e}`] || {};
        const defs = (S[`programme:${e}`] || programmes.clients[e] || {}).checkpoints || [];
        const cpName = k => ((defs.find(c => c && c.k === k) || {}).n) || CHECKPOINT_NAMES[k] || k;
        /* Clips sent on check points before there was a queue entry for them
           are sitting in the client's track with nowhere to show. Bring each
           one in as a submission the first time the queue is drawn, once. */
        const seenClip = knownBy[e] || new Set();
        for (const k of Object.keys(tr.checkpoints || {})) {
          for (const r of tr.checkpoints[k] || []) {
            if (!r || !r.video || seenClip.has(r.video)) continue;
            try {
              const [made] = await supa.insert('submissions', { email: e, kind: 'checkpoint', cycle: 1,
                numbers: { k, v: r.v, name: cpName(k) }, clips: [r.video], status: 'submitted',
                created_at: new Date(r.at || Date.now()).toISOString() });
              seenClip.add(r.video);
              if (made) (waiting || []).push(made);
            } catch {}
          }
        }
        /* ── a check point logged with no clip ───────────────────────
           Not a review, nothing to watch, but it is the thing they came to
           do. Cleared by opening their check points. */
        const sinceCp = Number(S[`cpseen:${e}`]) || 0;
        const fresh = [];
        for (const k of Object.keys(tr.checkpoints || {})) {
          for (const r of tr.checkpoints[k] || []) {
            if (!r || r.video || !(r.at > sinceCp)) continue;
            const d = defs.find(c => c && c.k === k) || {};
            fresh.push({ k, n: cpName(k), v: r.v, at: r.at, target: d.target != null ? d.target : null });
          }
        }
        if (fresh.length) {
          fresh.sort((a, b) => b.at - a.at);
          out.push({ email: e, name: nameOf(e), coached: true,
            id: 'cplog:' + e, kind: 'cplog', at: fresh[fresh.length - 1].at,
            clips: 0, n: fresh.length, logs: fresh.slice(0, 6),
            numbers: { name: fresh.slice(0, 4).map(x => x.n + ' ' + x.v).join(' · ') } });
        }
      }
      for (const s of (waiting || [])) {
        const e = s.email;
        if (!roster[e] || !owns(e) || s.status !== 'submitted') continue;
        out.push({ email: e, name: nameOf(e), coached: !!clients()[e], id: s.id, kind: s.kind,
          cycle: s.cycle, at: ms(s.created_at), clips: (s.clips || []).length, numbers: s.numbers || {} });
      }
      /* oldest first: the one closest to breaking the 48-hour promise */
      out.sort((a, b) => (a.at || 0) - (b.at || 0));
      return json({ queue: out });
    }

    /* ── notifications on the coach's own devices ─────────────────── */
    if (path === '/coach/push' && request.method === 'GET') {
      const rec = await pushSubs(asking || primaryCoach(), 'pushcoach');
      return json({ key: process.env.VAPID_PUBLIC_KEY || '', on: pushReady(), devices: rec.subs.length,
        endpoints: rec.subs.map(x => x.endpoint.slice(-24)),
        kinds: Object.assign({}, COACH_ALERT_KINDS, rec.kinds || {}) });
    }
    if (path === '/coach/push' && request.method === 'POST') {
      const rec = await pushSubs(asking || primaryCoach(), 'pushcoach');
      if (body.sub) {
        const sb = body.sub || {};
        const endpoint = String(sb.endpoint || '');
        const p256dh = String((sb.keys || {}).p256dh || '').slice(0, 200);
        const auth = String((sb.keys || {}).auth || '').slice(0, 100);
        if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth) {
          return json({ error: 'That is not a notification subscription' }, 400);
        }
        rec.subs = [{ endpoint, keys: { p256dh, auth }, at: Date.now() }]
          .concat(rec.subs.filter(x => x && x.endpoint !== endpoint)).slice(0, 6);
      }
      if (body.off) rec.subs = rec.subs.filter(x => x && x.endpoint !== String(body.off));
      if (body.kinds && typeof body.kinds === 'object') {
        rec.kinds = {};
        for (const k of Object.keys(COACH_ALERT_KINDS)) {
          if (body.kinds[k] !== undefined) rec.kinds[k] = body.kinds[k] === true;
        }
      }
      await pushSave(asking || primaryCoach(), rec, 'pushcoach');
      return json({ ok: true, devices: rec.subs.length,
        kinds: Object.assign({}, COACH_ALERT_KINDS, rec.kinds || {}) });
    }
    if (path === '/coach/push/test' && request.method === 'POST') {
      if ((await rateHit(`pushtest:${asking || primaryCoach()}`, 600000)) > 5) return json({ error: 'That is a few tests. Try again in a few minutes.' }, 429);
      const wait = Math.max(0, Math.min(6000, Number(body.wait) || 0));
      if (wait) await new Promise(r => setTimeout(r, wait));
      return json(await pushSend(asking || primaryCoach(), { title: 'Dashboard notifications are on',
        body: 'This is how a message from a client will arrive.', url: '/lha-coach.html#today', tag: 'test' }, 'pushcoach'));
    }

    /* ── take a reply back ──────────────────────────────────────────
       The message goes from their chat, the check points it answered go
       back to how they were before it, and the clips it closed go back to
       waiting. What it already did outside the app cannot be undone: an
       email or a notification that went stays sent. */
    if (path === '/coach/thread/unsend' && request.method === 'POST') {
      const e = norm(body.email);
      const id = String(body.id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
      if (!e || !id) return json({ error: 'Which message?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      const m = await supa.row('messages', `id=eq.${enc(id)}&email=eq.${enc(e)}&sender=eq.coach&select=*`);
      if (!m) return json({ error: 'That message is not there any more' }, 404);
      const rec = await getSetting(`unsend:${id}`);
      const tags = String(m.submission || '').split(',').map(x => x.trim()).filter(Boolean);
      const tkey = `track:${e}`;
      const tr = (await getSetting(tkey)) || {};
      let touched = false;
      const GROUPS = [['replyAt', ['replyAt']], ['watchedAt', ['watchedAt']],
                      ['verdictAt', ['verdict', 'note', 'by', 'verdictAt', 'undone']]];
      const put = (out, pre, fields) => fields.forEach(f => {
        if (pre[f] === undefined || pre[f] === null) delete out[f]; else out[f] = pre[f]; });
      for (const k of Object.keys(tr.checkpoints || {})) {
        tr.checkpoints[k] = (tr.checkpoints[k] || []).map(r => {
          if (!r || !r.video) return r;
          if (rec && Array.isArray(rec.rows)) {
            /* the reply wrote down what each row held before it */
            const x = rec.rows.find(y => y.k === k && y.video === r.video);
            if (!x) return r;
            const out = Object.assign({}, r);
            for (const [stamp, fields] of GROUPS) {
              if (out[stamp] === rec.at) { put(out, x.pre || {}, fields); touched = true; }
            }
            return out;
          }
          /* a reply from before this existed kept no note of what it
             changed: its own stamps are the ones made as it was sent */
          if (!tags.includes(r.video)) return r;
          const t0 = ms(m.created_at);
          const near = t => t && Math.abs(t - t0) < 120000;
          const out = Object.assign({}, r);
          if (near(out.replyAt)) { delete out.replyAt; touched = true; }
          if (near(out.watchedAt)) { delete out.watchedAt; touched = true; }
          if (near(out.verdictAt)) { ['verdict', 'note', 'by', 'verdictAt', 'undone'].forEach(f => delete out[f]); touched = true; }
          return out;
        });
      }
      if (touched) await setSetting(tkey, tr);
      const reopen = (rec && Array.isArray(rec.subs)) ? rec.subs : [];
      for (const sid of reopen) {
        await supa.update('submissions', `id=eq.${enc(sid)}&email=eq.${enc(e)}`,
          { status: 'submitted', reviewed_at: null, reviewed_by: null }).catch(() => {});
      }
      await supa.remove('messages', `id=eq.${enc(id)}&email=eq.${enc(e)}&sender=eq.coach`);
      if (rec) await dropSetting(`unsend:${id}`).catch(() => {});
      return json({ ok: true, seen: !!m.read_at, reopened: reopen.length,
        ...(touched ? { checkpoints: tr.checkpoints } : {}) });
    }

    /* ── cleared from Today ────────────────────────────────────────
       One call for anything Today counts since a moment: messages you
       do not need to answer, what they told you, check points logged,
       sessions finished, flags. */
    if (path === '/coach/seen' && request.method === 'POST') {
      const e = norm(body.email);
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      const KEYS = { msg: 'msgdone', said: 'saidseen', cp: 'cpseen', trained: 'trainseen', flags: 'flagseen' };
      const what = Array.isArray(body.what) ? body.what : Object.keys(KEYS);
      const now = Date.now();
      await Promise.all(what.filter(w => KEYS[w]).map(w => setSetting(`${KEYS[w]}:${e}`, now)));
      return json({ ok: true, at: now });
    }

    if (path === '/coach/typing' && request.method === 'POST') {
      const e = norm(body.email);
      if (!e || !owns(e)) return json({ error: 'Not your client' }, 403);
      await typingSet(e, 'coach');
      return json({ ok: true });
    }

    /* the coach has read what they said: stop counting it */
    if (path === '/coach/saidseen' && request.method === 'POST') {
      const e = norm(body.email);
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      await setSetting(`saidseen:${e}`, Date.now());
      return json({ ok: true });
    }

    /* the coach has looked at their check points: stop counting the ones
       logged before now */
    if (path === '/coach/cpseen' && request.method === 'POST') {
      const e = norm(body.email);
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      await setSetting(`cpseen:${e}`, Date.now());
      return json({ ok: true });
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
        const T = await emailCopy('answerReady', { name: esc((clients()[e] || '').split(' ')[0] || ''), coach: esc(nm) });
        await email(e, T.subject,
          mail({
            title: T.title,
            greeting: (clients()[e] || '').split(' ')[0] || '',
            paras: T.paras,
            cta: { href: `${SITE}/lha-app.html`, label: 'Read it' },
            signoff: { name: nm }, footnote: T.footnote || undefined,
          }), 'replies');
        await notify(e, { title: 'Your answer is ready', body: nm + ' has been through what you sent.',
          url: '/lha-app.html?go=answer', tag: 'answer' }, 'replies');
      }

      /* A verdict on a check point clip: reached, or not yet, with a line.
         Written onto the submission and onto the client's own record of
         that check point, matched on the clip, so the app can show what the
         coach said beside what they logged. */
      /* marking a free account's clip reviewed closes the form check: the
         next clip they send needs the next credit */
      if (!clients()[e]) {
        const ck = `fccredits:${e}`;
        const cur = (await getSetting(ck)) || {};
        if (cur.open) await setSetting(ck, Object.assign({}, cur, { open: false, closedAt: Date.now() }));
      }
      if (rec.kind === 'checkpoint') {
        const verdict = ['reached', 'notyet'].includes(body.verdict) ? body.verdict : '';
        const note = String(body.note || '').slice(0, 300);
        if (verdict) {
          const numbers = Object.assign({}, rec.numbers || {}, { verdict, verdictNote: note });
          await supa.update('submissions', `id=eq.${enc(id)}`, { numbers });
        }
        /* ── watched is worth saying even with no verdict ────────────
           Marking a check point clip reviewed without picking reached or
           not yet wrote nothing onto the client's own record of it, so
           their card sat on "Clip sent" for ever while the reply was in
           the chat. Whatever else happens, the row now carries when it
           was watched and by whom. */
        const tkey = `track:${e}`;
        const tr = (await getSetting(tkey)) || {};
        const k = (rec.numbers || {}).k;
        const c0 = (rec.clips || [])[0];
        const uid = (c0 && typeof c0 === 'object') ? (c0.uid || c0.video || '') : c0;
        if (k && tr.checkpoints && tr.checkpoints[k]) {
          tr.checkpoints[k] = tr.checkpoints[k].map(r =>
            (uid && r.video === uid)
              ? Object.assign({}, r, { watchedAt: Date.now(), by: asking || primaryCoach() },
                  verdict ? { verdict, note, verdictAt: Date.now() } : {})
              : r);
          await setSetting(tkey, tr);
        }
      }
      if (body.nextBlock) {
        await supa.upsert('cycles',
          { email: e, n: (rec.cycle || 1) + 1, started_at: nowISO() }, 'email');
      }
      return json({ ok: true, cycle: rec.cycle, nextBlock: !!body.nextBlock });
    }

    /* ── a verdict on a check point clip, with or without a review row ──
       The check points pane could only answer a clip that had a submission
       row behind it, and a clip sent before that filing existed, or one
       whose insert failed quietly, had no buttons at all: the card said
       "there is no review row against it" and left the coach with nothing
       to press. The verdict belongs to the check point, so it is written
       there by name, and any submission carrying the same clip is marked
       reviewed so the queue clears with it. */
    if (path === '/coach/checkpoint/verdict' && request.method === 'POST') {
      const e = norm(body.email);
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      const k = String(body.k || '').slice(0, 64);
      const uid = String(body.uid || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 64);
      const verdict = ['reached', 'notyet'].includes(body.verdict) ? body.verdict : '';
      const note = String(body.note || '').slice(0, 300);
      if (!k || !verdict) return json({ error: 'Which check point, and reached or not?' }, 400);
      const tkey = `track:${e}`;
      const tr = (await getSetting(tkey)) || {};
      tr.checkpoints = tr.checkpoints || {};
      let rows = tr.checkpoints[k];
      if (!Array.isArray(rows) || !rows.length) {
        /* Seen in a session, or a check point with no number on it: there
           is nothing logged for the verdict to sit on, so the sign-off makes
           the reading. Not there yet on nothing is not a verdict. */
        if (verdict !== 'reached') return json({ error: 'Nothing logged against that one yet' }, 404);
        const v0 = Number(body.v);
        rows = tr.checkpoints[k] = [{ v: Number.isFinite(v0) && v0 >= 0 && v0 <= 100000 ? v0 : 0, at: Date.now() }];
      }
      const by = asking || primaryCoach();
      /* taking a sign-off back leaves a mark saying so, and the app treats
         it as no verdict at all rather than as "not there yet" */
      const undo = !!body.quiet && verdict === 'notyet';
      const stamp = r => Object.assign({}, r,
        { verdict, note, by, verdictAt: Date.now(), watchedAt: Date.now(), undone: undo || undefined });
      let hit = false;
      tr.checkpoints[k] = rows.map(r => (uid && r && r.video === uid) ? (hit = true, stamp(r)) : r);
      if (!hit) {
        /* no clip named, or the clip is not on a row any more: the reading
           it is a verdict on is the last one they logged */
        const i = tr.checkpoints[k].length - 1;
        tr.checkpoints[k][i] = stamp(tr.checkpoints[k][i]);
      }
      await setSetting(tkey, tr);

      /* the same clip may be sitting in the review queue */
      let cleared = '';
      if (uid) {
        const open = await supa.rows('submissions',
          `email=eq.${enc(e)}&status=eq.submitted&select=*`);
        const row = (open || []).find(x => (x.clips || []).some(c =>
          (c && typeof c === 'object' ? (c.uid || c.video) : c) === uid));
        if (row) {
          await supa.update('submissions', `id=eq.${enc(row.id)}`, {
            status: 'reviewed', reviewed_at: nowISO(), reviewed_by: by,
            numbers: Object.assign({}, row.numbers || {}, { verdict, verdictNote: note }),
          });
          cleared = row.id;
        }
      }

      /* and they are told, unless a reply is already on its way to them, or
         this is the coach taking a sign-off back */
      const thread = await threadLoad(db, e);
      const lastCoach = Math.max(0, ...thread.filter(m => m.from === 'coach').map(m => m.at || 0));
      if (!body.quiet && Date.now() - lastCoach > 6 * 3600000) {
        const nm = coachName(by);
        /* "has been through what you sent" is wrong when nothing was sent */
        const key = uid ? 'answerReady' : verdict === 'reached' ? 'cpSigned' : 'cpNotYet';
        const cpName = String(body.n || '').slice(0, 80) || 'one of your check points';
        const T = await emailCopy(key, { name: esc((clients()[e] || '').split(' ')[0] || ''), coach: esc(nm),
          checkpoint: esc(cpName) });
        await email(e, T.subject,
          mail({
            title: T.title,
            greeting: (clients()[e] || '').split(' ')[0] || '',
            paras: T.paras,
            cta: { href: `${SITE}/lha-app.html`, label: 'Read it' },
            signoff: { name: nm }, footnote: T.footnote || undefined,
          }), 'replies');
      }
      /* the phone as well, and not held back by a reply earlier in the day:
         a sign-off is its own piece of news. Taking one back says nothing. */
      if (!body.quiet) {
        const cpN = String(body.n || '').slice(0, 80) || 'A check point';
        await notify(e, verdict === 'reached'
          ? { title: 'Signed off: ' + cpN, body: note || 'It is green on your check points.',
              url: '/lha-app.html?go=cps', tag: 'cp-' + k }
          : { title: 'A note on ' + cpN, body: note || 'Not there yet. There is a note on it in the app.',
              url: '/lha-app.html?go=cps', tag: 'cp-' + k }, 'replies');
      }
      return json({ ok: true, cleared, checkpoints: tr.checkpoints });
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
      /* the dashboard asks this first, so it is where it learns whether the
         person signed in owns the business. It hides the money panels on
         the answer rather than letting a coach fill a form the server will
         refuse. */
      return json({ clients: rows.sort((a, b) => b.last - a.last),
                    you: asking || '', youAreOwner: await isOwner() });
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

    /* the coach has read this client's too hard and too easy flags */
    if (path === '/coach/flagseen' && request.method === 'POST') {
      const e = norm(body.email);
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      await setSetting(`flagseen:${e}`, Date.now());
      return json({ ok: true, at: Date.now() });
    }

    if (path === '/coach/thread') {
      const e = norm(url.searchParams.get('email'));
      if (!e) return json({ error: 'Which client?' }, 400);
      if (!owns(e)) return json({ error: 'Not your client' }, 403);
      if (request.method === 'GET') {
        /* opening the thread is what marks it read. The dashboard also
           loads a thread nobody is looking at, and says so with read=0 */
        if (url.searchParams.get('read') !== '0') await markRead(e);
        const [messages, typing] = await Promise.all([threadLoad(db, e), typingOf(e, 'client')]);
        return json({ messages, typing });
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
        /* ── a recording answers the clips it was made about ──────────
           A review tool recording went into the chat and nowhere else: the
           check point it was about stayed "clip to watch", and the client
           found the answer only by scrolling the chat. The dashboard sends
           the clips the coach ticked, each with a verdict if one was given.
           Their review rows are closed, their check point rows are stamped,
           and the message names every one so the app can show it on each. */
        const ansClips = Array.isArray(body.answersClips) ? body.answersClips.slice(0, 20).map(x => ({
          uid: String((x && x.uid) || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 64),
          verdict: ['reached', 'notyet'].includes(x && x.verdict) ? x.verdict : '',
        })).filter(x => x.uid) : [];
        const tags = answers ? [answers] : [];
        let cpsOut = null;
        /* what this reply changes, written down so it can be taken back */
        const undo = { at: Date.now(), rows: [], subs: [] };
        if (ansClips.length) {
          const by = asking || primaryCoach();
          const uids = new Set(ansClips.map(x => x.uid));
          const rows = await supa.rows('submissions', `email=eq.${enc(e)}&select=id,clips,status`);
          for (const row of (rows || [])) {
            const has = (row.clips || []).some(c =>
              uids.has(c && typeof c === 'object' ? (c.uid || c.video) : c));
            if (!has) continue;
            tags.push(row.id);
            if (row.status === 'submitted') {
              await supa.update('submissions', `id=eq.${enc(row.id)}`, {
                status: 'reviewed', reviewed_at: nowISO(), reviewed_by: by });
              undo.subs.push(row.id);
            }
          }
          const tkey = `track:${e}`;
          const tr = (await getSetting(tkey)) || {};
          const now = undo.at;
          let touched = false;
          for (const k of Object.keys(tr.checkpoints || {})) {
            tr.checkpoints[k] = (tr.checkpoints[k] || []).map(r => {
              const a = r && r.video && ansClips.find(x => x.uid === r.video);
              if (!a) return r;
              touched = true;
              if (!undo.rows.some(y => y.k === k && y.video === r.video)) {
                const pre = {};
                ['replyAt', 'watchedAt', 'verdict', 'note', 'by', 'verdictAt', 'undone']
                  .forEach(f => { if (r[f] !== undefined) pre[f] = r[f]; });
                undo.rows.push({ k, video: r.video, pre });
              }
              return Object.assign({}, r, { replyAt: now, watchedAt: r.watchedAt || now },
                a.verdict ? { verdict: a.verdict, note: r.verdict === a.verdict ? (r.note || '') : '',
                              by, verdictAt: now, undone: undefined } : {});
            });
          }
          if (touched) { await setSetting(tkey, tr); cpsOut = tr.checkpoints; }
          uids.forEach(u => tags.push(u));
        }
        const reQ = await quoteId(e, body.re);
        if (reQ) tags.push('re:' + reQ);
        const subTag = [...new Set(tags)].join(',').slice(0, 2000);
        const added = await threadAdd(db, e, { from: 'coach', by: asking || primaryCoach(), text,
          ...(video ? { video } : {}), ...(image ? { image } : {}),
          ...(subTag ? { sub: subTag } : {}) });
        if (answers) {
          const was = await supa.row('submissions', `id=eq.${enc(answers)}&email=eq.${enc(e)}&select=status`).catch(() => null);
          if (was && was.status === 'submitted') undo.subs.push(answers);
          await supa.update('submissions', `id=eq.${enc(answers)}&email=eq.${enc(e)}`, {
            status: 'reviewed', reviewed_at: nowISO(),
            reviewed_by: asking || primaryCoach(),
          });
        }
        if (added && added.id && (undo.rows.length || undo.subs.length)) {
          await setSetting(`unsend:${added.id}`, undo).catch(() => {});
        }

        /* a reply is the thing clients are waiting for, so say so */
        const who2 = coachName(asking || coachOf(e));
        const sent = video ? `${who2} has sent you a video.`
          : image ? `${who2} has sent you a photo.` : `${who2} has replied.`;
        const T = await emailCopy('coachReplied', { name: esc((clients()[e] || '').split(' ')[0] || ''), coach: esc(who2), text: text ? esc(text.slice(0, 600)) : esc(sent) });
        await email(e, T.subject,
          mail({
            title: T.title,
            greeting: (clients()[e] || '').split(' ')[0] || '',
            paras: T.paras,
            cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
            signoff: { name: who2 }, footnote: T.footnote || undefined,
          }), 'replies');
        await notify(e, { title: who2 + (video ? ' sent you a video' : image ? ' sent you a photo' : ' replied'),
          body: text ? text.slice(0, 140) : sent, url: '/lha-app.html?go=chat', tag: 'reply' }, 'replies');
        try { const t = (await getSetting(typingKey(e))) || {}; if (t.coach) { t.coach = 0; await setSetting(typingKey(e), t); } } catch {}
        return json({ ok: true, id: (added && added.id) || '', ...(cpsOut ? { checkpoints: cpsOut } : {}) });
      }
    }
  }

  return json({ error: 'No such route' }, 404);
};

export const config = { path: '/api/app/*' };
