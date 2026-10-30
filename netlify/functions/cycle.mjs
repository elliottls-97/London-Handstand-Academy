/* ══════════════════════════════════════════════════════════════
   London Handstand Academy — the coaching cycle, on a timer

   A block runs, footage and numbers come in, the coach reviews, the
   next block starts. Left to itself that loop stalls in two places:
   a client forgets to film, or a submission sits unreviewed. This
   runs once a day and nudges whichever one has gone quiet.

   It never writes to a thread and never emails twice for the same
   thing — a reminder that arrives daily stops being a reminder.
   ══════════════════════════════════════════════════════════════ */
import programmes, { planFile } from './programmes.mjs';
import * as supa from './supa.mjs';
import { renderEmail, afterClassEmail, nextStepEmail, tipEmail, intentEmail, intent2Email, earlyEmail } from './emails.mjs';
import { pushReady, pushSend, pushSubs } from './push.mjs';
import { getStore } from '@netlify/blobs';
/* the words for an email, with whatever the dashboard has changed on top */
let EMAIL_OVER = null, EMAIL_AT = 0;
async function emailCopy(key, vars) {
  /* a run kept warm must still see a switch turned off since it started */
  if (EMAIL_OVER === null || Date.now() - EMAIL_AT > 30000) {
    const r = await supa.row('settings', 'key=eq.emails&select=value').catch(() => null);
    EMAIL_OVER = (r && r.value) || {}; EMAIL_AT = Date.now();
  }
  return renderEmail(key, vars, EMAIL_OVER);
}

const DAY = 24 * 60 * 60 * 1000;
/* an early bird that has ended reads as the price it went up to, whether or
   not the site has written it in yet (app.mjs wsRoll does that) */
function wsSettle(all) {
  for (const w of Object.values(all || {})) if (w && w.early && w.early.until && ms(w.early.until) <= Date.now()) {
    if (Number(w.early.then) > 0) w.price = Math.round(Number(w.early.then)); delete w.early;
  }
  return all;
}
const wsPoundsC = p => '£' + (Number(p) / 100).toFixed(2).replace(/\.00$/, '');
const wsEarlyDayC = w => new Date(ms(w.early.until)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' });
/* the hour it ends, since the owner can pick one (19 Oct 2026): "midnight" or "6pm" */
const wsEarlyAtC = w => { const t = new Date(ms(w.early.until)).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' }).replace(/\s/g, '').toLowerCase();
  return t === '11:59pm' ? 'midnight' : t.replace(':00', ''); };
const wsEarlyByC = w => (wsEarlyAtC(w) === 'midnight' ? 'the end of ' : wsEarlyAtC(w) + ' on ') + wsEarlyDayC(w);
const wsEarlyLine = w => w && w.early && Number(w.early.then) > (Number(w.price) || 0)
  ? `It is ${wsPoundsC(w.price)} until ${wsEarlyByC(w)}, then ${wsPoundsC(w.early.then)}.` : '';
const wsCoachLineC = w => !w || !w.coach ? 'Two coaches and a small group, so you get seen.'
  : /\band\b|&/.test(w.coach) ? `${w.coach}, and a small group, so you get seen.` : `A small group with ${w.coach}, so you get seen.`;
/* the business's own Google review box (place id from its listing, 9 Oct
   2026): any workshop without its own review link uses this one */
const GOOGLE_REVIEW = 'https://search.google.com/local/writereview?placeid=ChIJo6P50TJyjGQRZIUQzoUnXLo';
/* the prices the day after email quotes, when the dashboard's Money has
   not set them: the same defaults as app.mjs PRICE_DEFAULTS */
const PRICE_LABELS = { online: '£120', inperson: '£190', session60: '£80', session90: '£100', plus: '£10' };
/* the iPhone app (App Store Connect 6818646346). Apple's lookup finds
   nothing until it is on sale, so the email offers the App Store only once
   it is there, without another deploy. Its price is Apple's, set 3 Oct 2026. */
const IOS_APP_ID = '6818646346', IOS_PRICE = '£9.99';
async function appStoreLink() {
  try {
    const r = await fetch(`https://itunes.apple.com/lookup?id=${IOS_APP_ID}&country=gb`, { signal: AbortSignal.timeout(4000) });
    const x = r.ok ? ((await r.json()).results || [])[0] : null;
    return x && /^https:\/\/apps\.apple\.com\//.test(x.trackViewUrl || '') ? String(x.trackViewUrl).split('?')[0] : '';
  } catch { return ''; }
}
/* as app.mjs wsKindOf: a date in the title does not make it another class */
const wsKind = x => String((x && x.title) || '').toLowerCase().replace(/\b(\d+(st|nd|rd|th)?|jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sept?(ember)?|oct(ober)?|nov(ember)?|dec(ember)?|mon(day)?|tues?(day)?|wed(nesday)?|thu(rs)?(day)?|fri(day)?|sat(urday)?|sun(day)?)\b/g, ' ').replace(/[^a-z]+/g, '');
const REVIEW_HOURS = 48;
const NUDGE_AFTER = [0, 3];        // days past due — once on the day, once 3 days later

const norm = e => String(e || '').trim().toLowerCase();
/* the same signed link app.mjs makes: one place, managed without signing
   in, until the class. The format must match app.mjs sign()/verify(). */
const WS_CUTOFF_H = 24;
/* bookings from this moment are on the 48 hours to change your mind, then credit, rule (app.mjs WS_POLICY_FROM) */
const WS_POLICY_FROM = Date.parse(process.env.WS_POLICY_FROM || '2026-10-22T15:38:00Z');
const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function manageLink(slug, email, session, until) {
  const body = b64u(new TextEncoder().encode(JSON.stringify({ k: 'wsm', s: slug, e: norm(email), x: String(session || ''), exp: (Date.parse(until) || Date.now()) + 6 * 3600e3 })));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.SIGNING_SECRET || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = b64u(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return `${SITE}/booking.html?t=${body}.${mac}`;
}
/* the same for a 1-2-1: app.mjs sessManageLink, which the session page reads */
async function sessManage(x) {
  const body = b64u(new TextEncoder().encode(JSON.stringify({ k: 'ssm', i: x.id, e: norm(x.email), exp: Date.now() + 180 * DAY })));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.SIGNING_SECRET || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = b64u(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return `${SITE}/session.html?m=${body}.${mac}`;
}
const enc = encodeURIComponent;
const ms = v => (v ? new Date(v).getTime() : 0);
/* the same as app.mjs wsWhenTxt: "Saturday 10 October, 1:00 to 2:30pm" */
const wsClock = t => new Date(t).toLocaleString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' }).replace(/\s+/g, '').toLowerCase();
const wsWhenTxt = w => {
  if (!w || !w.when) return '';
  /* as app.mjs wsMins: the calisthenics class is an hour, and read as two
     hours here, 11am to 1pm, in its reminder and the day after (24 Oct 2026) */
  const a = new Date(w.when).getTime(), b = a + (/all levels/i.test(w.title || '') ? 90 : /calisthenics/i.test(w.title || '') ? 60 : 120) * 60e3;
  const s = wsClock(a), e = wsClock(b);
  return new Date(a).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' })
    + ', ' + (s.slice(-2) === e.slice(-2) ? s.slice(0, -2) : s) + ' to ' + e;
};

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
const coachNameOf = e => coaches()[norm(e)] || 'Your coach';

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

function mail({ title, greeting, paras = [], box, cta, signoff, footnote, image, kicker }) {
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
    border:1px solid #e3e0d6;overflow:hidden">
    ${image ? `<tr><td style="padding:0;line-height:0"><img src="${esc(image.src)}" alt="${esc(image.alt || '')}" width="560"
      style="display:block;width:100%;height:auto;max-height:300px;object-fit:cover;border-radius:18px 18px 0 0"></td></tr>` : ''}
    <tr><td style="padding:30px 32px 0;text-align:center">
      <div style="font:700 11px/1 ${F};letter-spacing:.19em;color:#006663;
        text-transform:uppercase">London Handstand Academy</div>
      <div style="height:1px;background:#e3e6e6;margin:24px 0 0"></div>
    </td></tr>
    <tr><td style="padding:30px 32px 8px">
      ${kicker ? `<div style="font:600 11px/1 ${F};letter-spacing:.14em;color:#a8680f;text-transform:uppercase;margin:0 0 12px">${esc(kicker)}</div>` : ''}
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
          style="color:#8a8d80">info@londonhandstandacademy.com</a><!--UNSUB-->
      </div>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

/* the same guard the app function uses — a daily job that mails a real
   client during a test run is exactly the thing to avoid. See app.mjs. */
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

/* The same guard as app.mjs, rule for rule. This one read only the
   CLIENTS variable, so a client added in the dashboard was mailed by the
   daily job while the app held them, and a person silenced by name got
   their reminders anyway. It reads what the app reads now: the stored
   roster, the past clients, the per-person switches and the global one,
   and it lets a receipt through (a booking's reminder) the way the app
   does. Read once a minute at most, not once per email. */
let GUARD = null, GUARD_AT = 0;
async function guardState() {
  if (GUARD && Date.now() - GUARD_AT < 60000) return GUARD;
  const keys = ['roster', 'pastclients', 'mailoff', 'mailguard', 'coaches'];
  const rows = await supa.rows('settings', `key=in.(${keys.join(',')})&select=key,value`).catch(() => null);
  if (!rows) return null;
  const v = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const past = v.pastclients || {};
  const roster = new Set(parseClients().map(c => c.email));
  /* the whole list with names and coaches, the way the app builds it: a
     client who bought coaching on the website is on the stored roster only,
     and was treated here as a free account, drip emails and all */
  const list = new Map(parseClients().map(c => [c.email, c]));
  for (const [e, x] of Object.entries(v.roster || {})) {
    const n = norm(e);
    if (x === null) { roster.delete(n); list.delete(n); continue; }
    roster.add(n);
    const was = list.get(n) || {};
    list.set(n, { email: n, name: (x && x.name) || was.name || n, coach: norm((x && x.coach) || was.coach || '') });
  }
  for (const e of Object.keys(past)) if (past[e]) { roster.delete(norm(e)); list.delete(norm(e)); }
  GUARD = { roster, list: [...list.values()], past, off: v.mailoff || {}, g: v.mailguard, coaches: Object.keys(v.coaches || {}).map(norm) };
  GUARD_AT = Date.now();
  return GUARD;
}
/* the coaching roster, stored and environment together */
async function rosterList() {
  const st = await guardState();
  return st ? st.list : parseClients();
}
async function clientMailAllowed(to, receipt) {
  const t = norm(to);
  const st = await guardState();
  if (!st) return false;
  if (st.coaches.includes(t) || t === norm(process.env.COACH_EMAIL || '') || t === norm(process.env.FROM_EMAIL || '')) return true;
  if (st.off[t] === true) return false;
  if (st.off[t] === false) return true;
  if (receipt) return true;
  if (!st.roster.has(t) && !st.past[t]) return true;
  return st.g ? !st.g.suppress : false;
}

/* same opt-outs the app function honours — a reminder nobody asked for
   is the fastest way to get an app's email marked as spam */
/* replies and reminders are each none, email, push or both; an answer
   saved before that was a yes or no, and reads as both or none */
const CHANNELS = ['none', 'email', 'push', 'both'];
/* nothing chosen is 'auto': a notification when they have a phone with
   notifications on, an email only when they have not (as in the app) */
const chanOf = (p, kind) => {
  const v = p && p[kind];
  return CHANNELS.includes(v) ? v : v === false ? 'none' : 'auto';
};
async function hasPhone(e) {
  try { const r = await pushSubs(norm(e)); return !!(r.subs.length || (Array.isArray(r.apns) && r.apns.length)); }
  catch { return false; }
}
async function prefsOf(to) {
  const p = await supa.row('settings', `key=eq.${enc('prefs:' + norm(to))}&select=value`);
  return (p && p.value) || {};
}
async function wantsEmail(to, kind) {
  if (!kind) return true;
  try {
    const p = await prefsOf(to);
    if (kind === 'replies' || kind === 'reminders') {
      const c = chanOf(p, kind);
      return c === 'auto' ? !(await hasPhone(to)) : ['email', 'both'].includes(c);
    }
    return p[kind] !== false;
  } catch { return true; }
}
async function wantsPush(to, kind) {
  try { return ['push', 'both', 'auto'].includes(chanOf(await prefsOf(to), kind)); } catch { return true; }
}

/* ── unsubscribe: the same signed link and the same rule as app.mjs ──
   Out of everything but a receipt, a booking they made and its reminder. */
async function signTok(obj) {
  const body = b64u(new TextEncoder().encode(JSON.stringify(obj)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.SIGNING_SECRET || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return `${body}.${b64u(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))}`;
}
const unsubUrl = async to => `${SITE}/api/app/unsub?t=${await signTok({ k: 'unsub', e: norm(to), exp: Date.now() + 5 * 365 * DAY })}`;
const isUnsub = async to => !!(await supa.row('settings', `key=eq.${enc('unsub:' + norm(to))}&select=key`).catch(() => null));
const withUnsub = (html, url) => String(html).includes('/api/app/unsub?t=') ? String(html)
  : String(html).includes('<!--UNSUB-->')
  ? String(html).replace('<!--UNSUB-->', ` &nbsp;·&nbsp; <a href="${url}" style="color:#8a8d80">Unsubscribe</a>`)
  : String(html) + `<p style="font:12px/1.5 system-ui;color:#8a8d80;margin-top:24px"><a href="${url}" style="color:#8a8d80">Unsubscribe</a></p>`;
/* true when the last send was tried and failed, as opposed to held on
   purpose (unsubscribed, switched off, the mail guard): the after-class
   emails were marked sent either way, and a failed thank you also blocked
   the next one for 45 days (13 Oct 2026) */
let sendFailed = false;
async function email(to, subject, html, kind, opts) {
  sendFailed = false;
  if (!process.env.RESEND_API_KEY || !to) return false;
  if (!(await wantsEmail(to, kind))) return false;
  if (!mayEmail(to)) return false;
  if (!(await clientMailAllowed(to, !!(opts && opts.receipt)))) return false;
  const t = norm(to), st = await guardState().catch(() => null);
  const staff = (st && st.coaches.includes(t)) || coaches()[t] !== undefined
    || t === norm(process.env.COACH_EMAIL || '') || t === norm(process.env.FROM_EMAIL || '');
  let headers = {};
  /* a plain text part, when the email brings one; the way out goes on it too */
  let text = opts && opts.text ? String(opts.text) : '';
  if (!staff) {
    if (!(opts && (opts.receipt || opts.essential)) && (await isUnsub(t))) return false;
    const uu = await unsubUrl(t);
    html = withUnsub(html, uu);
    if (text) text += `\n\nUnsubscribe: ${uu}`;
    headers = { 'List-Unsubscribe': `<${uu}>, <mailto:info@londonhandstandacademy.com?subject=unsubscribe>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
  }
  const payload = JSON.stringify({
    from: process.env.FROM_EMAIL || 'info@londonhandstandacademy.com',
    to, subject, html, ...(text ? { text } : {}), headers, reply_to: process.env.REPLY_TO || 'info@londonhandstandacademy.com' });
  /* Resend allows two a second and answers 429 past that; one more try
     after a pause, under the same key so a slow first answer is not sent
     twice. The run is once a day, so a failure here is the whole window. */
  const idem = 'cycle-' + (await sha256hex(to + '|' + subject + '|' + new Date().toISOString().slice(0, 10))).slice(0, 40);
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                   'Content-Type': 'application/json', 'Idempotency-Key': idem },
        body: payload,
      });
      if (r.ok) return true;
      if (r.status !== 429 && r.status < 500) break;
    } catch {}
    if (i === 0) await new Promise(res => setTimeout(res, 1200));
  }
  sendFailed = true;
  console.error('cycle email failed', subject.slice(0, 80));
  return false;
}
const sha256hex = async s => Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))).toString('hex');

async function subsFor(who) {
  const rows = await supa.rows('submissions',
    `email=eq.${enc(who)}&select=*&order=created_at.desc`).catch(() => []);
  return (rows || []).map(s => ({ id: s.id, kind: s.kind, cycle: s.cycle,
    at: ms(s.created_at), status: s.status, clips: s.clips || [] }));
}

/* ── voice notes go after a week ──────────────────────────────────────
   Each is stored as voice:v<time><random>, the time being Date.now() in
   base 36, so its age is read off the name without opening it. The
   message stays in the chat and says the note has gone. */
async function voiceSweep(done){
  const db = getStore('lha-app');
  const { blobs } = await db.list({ prefix: 'voice:' });
  const cut = Date.now() - 7 * 24 * 3600 * 1000;
  let n = 0;
  for (const b of blobs || []) {
    const t = parseInt(String(b.key).slice(7, 15), 36);
    if (Number.isFinite(t) && t < cut) { await db.delete(b.key).catch(() => {}); n++; }
  }
  done.voiceDeleted = n;
}

/* the dashboard's past coaching clients, who get nothing from this job */
async function pastClients() {
  const r = await supa.row('settings', 'key=eq.pastclients&select=value').catch(() => null);
  return (r && r.value) || {};
}

/* ── the coaching loop: tests due, block reviews, clips waiting ─────
   Its own job now, run after the reminders that bookings promise, and each
   person on their own: it was the one part of the run with no catch, so a
   single failed read cancelled every later email that day, the class,
   1-2-1 and call reminders included, and nothing recorded it (13 Oct 2026). */
async function coachingLoop(done, now) {
  /* Anyone who has sent something, not only the coaching roster. A one-off
     form check comes from someone who is not a client yet — which makes it
     the worst one to let go quiet. */
  const accounts = (await supa.rows('accounts', 'select=email,name')) || [];
  /* past coaching clients are sent nothing automatic at all */
  const past = await pastClients();
  const roster = (await rosterList()).filter(c => !past[c.email]);
  const known = new Set(roster.map(c => c.email));
  const everyone = roster.concat(
    accounts.filter(a => !known.has(a.email))
      .map(a => ({ email: a.email, name: a.name || a.email, coach: '', lead: true })));

  for (const c of everyone) {
    try {
      if (past[c.email]) { done.skipped++; continue; }
      const cyc = await supa.row('cycles', `email=eq.${enc(c.email)}&select=*`)
        .catch(() => null);
      const cycle = cyc ? { n: cyc.n || 1, start: ms(cyc.started_at) } : null;
      /* no cycle means no block underway — nothing to remind them about.
         Their submissions still need chasing, so fall through to that. */
      if (!cycle && !c.lead) { done.skipped++; continue; }

      const plan = planFile(c.email);
      const days = (plan && Number(plan.testDelayDays)) || 14;
      const dueAt = (cycle ? cycle.start : now) + days * DAY;
      const subs = await subsFor(c.email);
      const mine = c.lead ? subs : subs.filter(s => s.cycle === cycle.n);
      const coach = c.coach || primaryCoach();

      /* 1: footage is due and has not arrived. Only for a programme with
         a test in it: one built in the dashboard, or the onboarding one, has
         none, and the app has nowhere to film it, so "Time to film your
         test" went to people who could not (16 Oct 2026, review). */
      const hasTest = !!(plan && (((plan.filming || []).length) || (plan.test && (plan.test.items || []).length)));
      if (!c.lead && hasTest && !mine.length && now >= dueAt) {
        const overdueDays = Math.floor((now - dueAt) / DAY);
        /* how many nudges are owed by now. Counting rather than matching the
           exact day means a missed run catches up instead of losing the
           reminder for good. */
        const stage = NUDGE_AFTER.filter(d => overdueDays >= d).length - 1;
        const key = `remind:${c.email}:${cycle.n}`;
        const sent = await supa.row('nudges', `key=eq.${enc(key)}&select=*`).catch(() => null);
        if (stage >= 0 && !(sent && sent.stage >= stage)) {
          const ok = await email(c.email,
            overdueDays === 0 ? 'Time to film your test' : 'Still waiting on your clips',
            mail({
              title: overdueDays === 0 ? 'Time to film your test.' : 'Still waiting on your clips.',
              greeting: (c.name || '').split(' ')[0],
              paras: [`You are ${days} days into this block, which is the point where
                the test drills tell us what to change.`,
                `Numbers and clips go in together from the app, and ${esc(coachNameOf(coach))}
                 comes back within <b>${REVIEW_HOURS} hours</b>.`],
              cta: { href: `${SITE}/lha-app.html`, label: 'Film your test' },
              signoff: { name: coachNameOf(coach) },
              footnote: 'One clean attempt at each is plenty. Five scrappy ones tell us less.',
            }), 'reminders');
          if (ok) {
            await supa.upsert('nudges',
              { key, stage, sent_at: new Date().toISOString() }, 'key');
            done.reminded.push(c.email);
          }
        }
      }

      /* 1b, the block is over: ask how it went, once, whatever else happens.
         Testimonials were only ever asked for when the coach remembered, so
         the ask is automatic: three questions and a request for a filmed
         line, answered in the app, landing on Today as a block review. */
      if (!c.lead && cycle && now >= dueAt) {
        const akey = `blockask:${c.email}:${cycle.n}`;
        if (!(await supa.row('nudges', `key=eq.${enc(akey)}&select=key`).catch(() => null))) {
          const T = await emailCopy('blockAsk', { name: esc((c.name || '').split(' ')[0]), coach: esc(coachNameOf(coach)) });
          const ok = !T.off && await email(c.email, T.subject,
            mail({
              title: T.title,
              greeting: (c.name || '').split(' ')[0],
              paras: T.paras,
              cta: { href: `${SITE}/lha-app.html?review=block`, label: 'Answer in the app' },
              signoff: { name: coachNameOf(coach) },
              footnote: T.footnote || undefined,
            }), 'reminders');
          if (ok) {
            await supa.upsert('nudges', { key: akey, sent_at: new Date().toISOString() }, 'key');
            (done.asked = done.asked || []).push(c.email);
          }
        }
      }

      /* 2 — it arrived and nobody has looked at it */
      for (const s of mine) {
        if (s.status !== 'submitted') continue;
        if (now - (s.at || 0) < REVIEW_HOURS * 60 * 60 * 1000) continue;
        const ckey = `chase:${s.id}`;
        if (await supa.row('nudges', `key=eq.${enc(ckey)}&select=key`).catch(() => null)) continue;
        const hrs = Math.round((now - s.at) / 3600000);
        const ok = await email(coach,
          `${c.name} has been waiting ${hrs} hours`,
          mail({
            title: `${esc(c.name)} is still waiting.`,
            paras: [`${esc(c.name)} sent ${s.clips.length} clip${s.clips.length === 1 ? '' : 's'}
              ${hrs} hours ago and nobody has marked it reviewed. The promise is ${REVIEW_HOURS} hours.`],
            cta: { href: `${SITE}/lha-coach.html`, label: 'Open the coach view' },
          }));
        if (ok) {
          await supa.upsert('nudges', { key: ckey, sent_at: new Date().toISOString() }, 'key');
          done.chased.push(c.email);
        }
      }
    } catch (e) { (done.coachingErrors = done.coachingErrors || []).push(c.email + ': ' + String((e && e.message) || e).slice(0, 160)); }
  }
}

/* ── every payment filed ─────────────────────────────────────────────
   17 Oct 2026: every purchase through a payment link failed for three
   weeks before anybody knew. Each morning the last three days of Stripe
   checkouts are read back, and any of ours the webhook has not filed after
   half an hour is filed through the page-after-paying route (/paid with
   pull=1, which files it as Stripe's own delivery would). The coach is told
   what was found, each payment once. Keep the claims in step with CS_FILED
   and csFiled() in app.mjs. */
const CS_FILED = ['welcomed', 'credit', 'sessnew', 'wsbooked', 'wsorphan', 'filed'];
async function paymentsCheck(done) {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!key) return;
  const since = Math.floor((Date.now() - 3 * DAY) / 1000);
  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions?status=complete&limit=100&created%5Bgte%5D=${since}`,
    { headers: { Authorization: 'Bearer ' + key } });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error('Stripe would not list the checkouts: ' + ((d.error && d.error.message) || r.status));
  }
  const list = ((await r.json().catch(() => null)) || {}).data || [];
  const paid = x => !x.payment_status || x.payment_status === 'paid' || x.payment_status === 'no_payment_required';
  /* ours: through a payment link, or a checkout this site made */
  const ours = x => !!(x.payment_link || (x.metadata && (x.metadata.plan || x.metadata.workshop || x.metadata.session || x.metadata.sessPay)));
  const look = list.filter(x => ours(x) && paid(x) && Date.now() - (Number(x.created) || 0) * 1000 > 30 * 60e3);
  const late = [], stuck = [];
  for (const x of look) {
    const rows = await supa.rows('nudges', `key=in.(${enc(CS_FILED.map(k => `"${k}:${x.id}"`).join(','))})&select=key`).catch(() => null);
    if (rows === null || rows.length) continue;
    if (x.subscription && await supa.row('settings', `key=eq.${enc('trialrefused:' + x.subscription)}&select=key`).catch(() => null)) continue;
    if (x.metadata && x.metadata.sessPay) {
      const ss = await supa.row('settings', 'key=eq.sessions&select=value').catch(() => null);
      if (((ss && ss.value) || []).some(r0 => (Array.isArray(r0.pays) ? r0.pays.some(p => p.ref === x.id) : (r0.paidRef === x.id || r0.session === x.id)))) continue;
    }
    let state = '';
    try { const pr = await fetch(`${SITE}/api/app/paid?cs=${enc(x.id)}&pull=1`); state = ((await pr.json().catch(() => null)) || {}).state || ''; } catch {}
    const who = norm((x.customer_details && x.customer_details.email) || x.customer_email || '');
    (state === 'filed' ? late : stuck).push({ cs: x.id, who, amount: Number(x.amount_total) || 0 });
  }
  done.payments = { checked: look.length, late: late.length, stuck: stuck.length };
  const news = [];
  for (const x of late.concat(stuck)) {
    if (await supa.insertIfAbsent('nudges', { key: `unfiled:${x.cs}`, stage: 0, sent_at: new Date().toISOString() }, 'key').catch(() => false)) news.push(x);
  }
  if (!news.length) return;
  const pounds = p => p > 0 ? '\u00a3' + (p / 100).toFixed(2).replace(/\.00$/, '') : 'nothing, on a code';
  const line = x => `<b>${esc(x.who || 'Somebody')}</b>, ${esc(pounds(x.amount))}: ${late.includes(x)
    ? 'filed this morning, so they have had their email now.' : 'still not filed. Find it in Stripe, Workbench, Webhooks, Event deliveries, and press Resend once the problem is fixed.'}`;
  await email(process.env.COACH_EMAIL || process.env.FROM_EMAIL || '',
    `${news.length} payment${news.length > 1 ? 's' : ''} the webhook missed`,
    mail({ title: 'Payments the webhook missed.', paras: [
      'Stripe\u2019s webhook did not file these within half an hour, so the morning check looked for them.',
      news.map(line).join('<br>'),
      'More than one usually means the webhook is failing for everybody: look at the latest errors on its Event deliveries page.'],
      cta: { href: 'https://dashboard.stripe.com/workbench/webhooks', label: 'Open Stripe' } }));
}

export default async () => {
  /* the guard is read fresh for every run: a switch changed a moment ago counts */
  GUARD = null;
  const now = Date.now();
  const done = { reminded: [], chased: [], skipped: 0 };

  /* the reminders bookings promise go first: each has one 24 hour window,
     so anything that goes wrong further down must not cost them */
  try { await workshopMail(done); } catch (e) { done.workshopError = String(e && e.message || e); }
  try { await sessionMail(done); } catch (e) { done.sessionError = String(e && e.message || e); }
  try { await callRemind(done); } catch (e) { done.callError = String(e && e.message || e); }
  /* A scheduled run is stopped at 30 seconds. The started booking emails,
     the early bird's last day among them, ran after the walk over every
     free account and could be the ones that never happened. They go next
     now, the long walks last, and a job that would start past 22 seconds is
     named in the log instead of being cut off half way (16 Oct 2026). */
  const T0 = Date.now(), LATE = 22000;
  const run = async (name, fn) => {
    if (Date.now() - T0 > LATE) { (done.notRun = done.notRun || []).push(name); return; }
    try { await fn(); } catch (e) { done[name + 'Error'] = String(e && e.message || e); }
  };
  /* payments first of the rest: a buyer left with nothing outranks a nudge */
  await run('payments', () => paymentsCheck(done));
  await run('intent', () => intentMail(done));
  /* new class dates, to the people who asked on the class page: one email
     each with everything new. The sending lives in app.mjs, beside Send now
     in the dashboard, so the two cannot drift (30 Oct 2026) */
  await run('classAlerts', async () => {
    const key = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lha-cron:' + (process.env.SIGNING_SECRET || '')))).toString('hex');
    const r = await fetch(`${SITE}/api/app/class-alert/run`, { method: 'POST', headers: { 'x-cron-key': key, 'Content-Type': 'application/json' }, body: '{}' });
    done.classAlerts = ((await r.json().catch(() => null)) || {}).sent || 0;
  });
  await run('coaching', () => coachingLoop(done, now));
  await run('tips', () => firstTenDays(done));
  await run('push', () => trainingPush(done));
  await run('quiet', () => quietFreeAccounts(done));
  await run('voice', () => voiceSweep(done));
  done.secs = Math.round((Date.now() - T0) / 100) / 10;
  /* the response body of a scheduled run is thrown away, so the run says
     what it did in the function log, where a bad day can be found */
  console.log('cycle', JSON.stringify(done));
  return new Response(JSON.stringify(done), {
    headers: { 'Content-Type': 'application/json' } });
};

/* 9am UTC daily — early enough that a reminder lands before training,
   late enough that it is not a 3am push */
/* ── 4: an account gone quiet ──────────────────────────────────────
   Everything above is about coaching clients. A free user who stopped
   heard nothing, ever, and a reminder is the cheapest retention there is.
   Four notes, at five days, a fortnight, a month and three months of
   silence, each sent once, each a different thing to say. Coaching clients
   are skipped: their coach is the reminder. The mail guard still applies
   underneath, so nobody who is suppressed gets one. */
const QUIET_STEPS = [
  { days: 5, key: '5d' }, { days: 14, key: '14d' }, { days: 30, key: '30d' }, { days: 90, key: '90d' },
];
/* ── the week, counted the way the app counts it ─────────────────────
   Keep this in step with weekInfo() in lha-app.html. Weeks turn over on a
   Monday by the date in London. A day with a session in it (part of one
   counts) fills one of the week's circles; the goal is the sessions a week
   they chose, as it was that week. A full week adds to the run, a week
   they paused keeps it, and any other week before this one ends it. The
   week in progress never ends a run: it is not over yet. (17 Oct 2026; it
   was any week with a session in it, with rest weeks earned every four.) */
const LONDON_DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
const londonDay = t => {
  const p = LONDON_DATE.formatToParts(new Date(t)), g = k => +p.find(x => x.type === k).value;
  return Math.round(Date.UTC(g('year'), g('month') - 1, g('day')) / DAY);
};
const londonWeek = t => Math.floor((londonDay(t) + 3) / 7);
export function streakOf(sessions, now = Date.now(), state = {}) {
  const ss = (sessions || []).filter(x => x && x.at && x.kind !== 'none');
  const cur = londonWeek(now), days = {};
  for (const x of ss) { const w = londonWeek(x.at); (days[w] = days[w] || new Set()).add(londonDay(x.at)); }
  const wk = (state && state.wk) || {};
  const goals = (Array.isArray(wk.goals) ? wk.goals : []).filter(g => Array.isArray(g));
  const base = Math.max(1, Math.min(7, Number(state && state.perWeek) || 3));
  const goalFor = w => { let g = null; for (const x of goals) if (Number(x[0]) <= w) g = x;
    return g ? Math.max(1, Math.min(7, Number(g[1]) || 1)) : base; };
  const paused = new Set((Array.isArray(wk.paused) ? wk.paused : []).map(Number));
  const n = w => (days[w] ? days[w].size : 0);
  const ws = Object.keys(days).map(Number);
  let run = 0;
  if (ws.length) for (let w = Math.min(...ws); w <= cur; w++) {
    if (n(w) >= goalFor(w)) run++;
    else if (paused.has(w) || w === cur) continue;
    else run = 0;
  }
  const goal = goalFor(cur), got = n(cur);
  return { weeks: run, goal, got, left: Math.max(0, goal - got), paused: got < goal && paused.has(cur), week: cur };
}

/* ── a training reminder, to the phone ─────────────────────────────
   Only for somebody who turned notifications on, and never on a day they
   have already trained. The app sends the weekdays they plan to train:
   on one of those, a short note at the time this job runs. Somebody with
   no plan gets one after three days without a session, and not again for
   three more. The same checks as an email: training reminders turned on,
   the test lists, and the mail guard that keeps real clients quiet. */
async function trainingPush(done) {
  if (!pushReady()) return;
  const rows = (await supa.rows('settings', `key=like.${enc('push:')}*&select=key,value`).catch(() => [])) || [];
  const now = new Date();
  const wd = (now.getUTCDay() + 6) % 7;             /* Monday is nought, as in the app */
  const today = now.toISOString().slice(0, 10);
  done.trainPush = 0;
  for (const r of rows) {
    const e = norm(String(r.key || '').slice(5));
    const rec = r.value || {};
    /* the iPhone app's phones (apns) count as much as the web ones */
    if (!e || !((Array.isArray(rec.subs) && rec.subs.length) || (Array.isArray(rec.apns) && rec.apns.length))) continue;
    if (!(await wantsPush(e, 'reminders')) || !mayEmail(e) || !(await clientMailAllowed(e))) continue;
    const dayKey = `pushtrain:${e}:${today}`;
    if (await supa.row('nudges', `key=eq.${enc(dayKey)}&select=key`).catch(() => null)) continue;
    const p = await supa.row('progress', `email=eq.${enc(e)}&select=sessions`).catch(() => null);
    const sess = (p && Array.isArray(p.sessions)) ? p.sessions : [];
    const last = Math.max(0, ...sess.map(x => (x && x.at) || 0));
    if (last && new Date(last).toISOString().slice(0, 10) === today) continue;
    let payload = null;
    /* Saturday, two full weeks or more running, and this one not full and
       not paused: the one day a week it is worth saying. Once a week at
       most, and it takes the place of the day's other note. Too many left
       to fit in the weekend, and it says the week can be paused. */
    const S = wd === 5 ? streakOf(sess, now.getTime(),
      ((await supa.row('settings', `key=eq.${enc('state:' + e)}&select=value`).catch(() => null)) || {}).value || {}) : null;
    const streakKey = S ? `pushstreak:${e}:${S.week}` : '';
    if (S && S.weeks >= 2 && S.left > 0 && !S.paused
        && !(await supa.row('nudges', `key=eq.${enc(streakKey)}&select=key`).catch(() => null))) {
      payload = S.left <= 2
        ? { title: S.left === 1 ? 'One more session fills your week' : 'Two more sessions fill your week',
            body: `Keep your ${S.weeks} weeks in a row going.`, url: '/lha-app.html?go=today', tag: 'streak' }
        : { title: `Keep your ${S.weeks} weeks in a row`, body: 'Away this week? Pause it in the app and your run waits.',
            url: '/lha-app.html?go=today', tag: 'streak' };
      await supa.upsert('nudges', { key: streakKey, sent_at: now.toISOString() }, 'key').catch(() => {});
    } else if (Array.isArray(rec.days) && rec.days.length) {
      if (rec.days.includes(wd)) payload = { title: 'Training day',
        body: 'Your session is ready when you are.', url: '/lha-app.html?go=today', tag: 'train' };
    } else if (last) {
      const since = Math.floor((Date.now() - last) / DAY);
      const quietKey = `pushquiet:${e}`;
      const q = await supa.row('nudges', `key=eq.${enc(quietKey)}&select=sent_at`).catch(() => null);
      const lastQuiet = q && q.sent_at ? ms(q.sent_at) : 0;
      if (since >= 3 && Date.now() - lastQuiet > 3 * DAY) {
        payload = { title: since + ' days since your last session',
          body: 'A short one still counts. Pick fifteen minutes.', url: '/lha-app.html?go=today', tag: 'train' };
        await supa.upsert('nudges', { key: quietKey, sent_at: now.toISOString() }, 'key').catch(() => {});
      }
    }
    if (!payload) continue;
    const res = await pushSend(e, payload).catch(err => ({ sent: 0, why: String(err && err.message || err) }));
    await supa.upsert('nudges', { key: dayKey, sent_at: now.toISOString() }, 'key').catch(() => {});
    if (res.sent) done.trainPush++;
  }
}

async function quietFreeAccounts(done) {
  const now = Date.now();
  const rows = (await supa.rows('accounts',
    'select=email,name,last_seen,first_seen&order=last_seen.desc&limit=1000')) || [];
  const roster = new Set((await rosterList()).map(c => c.email).concat(Object.keys(await pastClients())));
  const names = ['Foundations', 'Wall Work', 'Pushing More', 'Take-Off', 'Freestanding', 'Press'];
  for (const a of rows) {
    if (!a.email || roster.has(a.email)) continue;
    const last = ms(a.last_seen), first = ms(a.first_seen);
    if (!last || !first) continue;
    const quiet = now - last;
    /* the longest step that is due; one per run, and each step once ever.
       Somebody back after 40 days has passed the 5 and 14 day marks, and
       hearing about all three in one morning would be spam. The older
       steps are marked as sent so they do not fire on a later lapse. */
    const due = QUIET_STEPS.filter(q => quiet >= q.days * DAY);
    if (!due.length) continue;
    const step = due[due.length - 1];
    const key = `quiet:${step.key}:${a.email}`;
    if (await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null)) continue;
    /* a legacy weekly quiet note counts as the five day one */
    if (step.key === '5d'
        && await supa.row('nudges', `key=eq.${enc('quiet:' + a.email)}&select=key`).catch(() => null)) {
      await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
      continue;
    }
    const st = await supa.row('settings', `key=eq.${enc('state:' + a.email)}&select=value`).catch(() => null);
    const stage = st && st.value && Number.isInteger(st.value.stage) ? st.value.stage : 0;
    const first_ = (a.name || '').split(' ')[0];
    const T = await emailCopy('quiet' + step.key, { name: esc(first_), stage: esc(names[stage] || 'The ladder') });
    if (T.off) { done.held = (done.held || 0) + 1; continue; }
    const ok = await email(a.email, T.subject,
      mail({ title: T.title,
        greeting: first_,
        paras: T.paras,
        cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
        signoff: { name: 'London Handstand Academy' },
        footnote: T.footnote || undefined }),
      'reminders');
    /* every step at or before this one is done with, whether or not the
       mail went: a suppressed address must not be retried daily */
    for (const q of due) {
      const k2 = `quiet:${q.key}:${a.email}`;
      await supa.upsert('nudges', { key: k2, sent_at: new Date().toISOString() }, 'key');
    }
    if (ok) done.quiet = (done.quiet || 0) + 1;
  }
}

/* ── the first ten days ────────────────────────────────────────────
   Five short notes after an account is made, on days one, two, four, seven
   and ten, then nothing but the quiet nudge above. Each is one thing about
   handstands and one thing the app does. Five in ten days is a welcome;
   one a day for ever is the thing people unsubscribe from. Drafted from the
   cue text in the app: Elliott's to rewrite, and they live only here. */
/* the words live in emails.mjs now, where the dashboard can change them */
const TIPS = [ { day: 1 }, { day: 2 }, { day: 4 }, { day: 7 }, { day: 10 } ];
async function firstTenDays(done) {
  const now = Date.now();
  const rows = (await supa.rows('accounts',
    'select=email,name,first_seen&order=first_seen.desc&limit=300')) || [];
  const roster = new Set((await rosterList()).map(c => c.email).concat(Object.keys(await pastClients())));
  for (const a of rows) {
    if (!a.email || roster.has(a.email)) continue;
    const first = ms(a.first_seen); if (!first) continue;
    const ageDays = (now - first) / DAY;
    if (ageDays > 14) continue;
    for (let i = 0; i < TIPS.length; i++) {
      const t = TIPS[i];
      if (ageDays < t.day) continue;
      const key = `tip:${a.email}:${i}`;
      if (await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null)) continue;
      const T = await emailCopy('tip' + t.day, { name: esc((a.name || '').split(' ')[0] || '') });
      if (T.off) { done.held = (done.held || 0) + 1; break; }
      const ok = await email(a.email, T.subject, tipEmail(t.day, T, (a.name || '').split(' ')[0] || '', SITE), 'reminders');
      if (ok) { await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
                done.tips = (done.tips || 0) + 1; }
      break;   /* one a day at most, whatever is owed */
    }
  }
}

/* ── workshops: the day before and the day after ──────────────────────
   Setmore did the reminder and nothing did the review ask. Both run from
   here: every booking gets one reminder when the workshop is 12 to 36
   hours away, and one ask for a review when it was 10 to 40 hours ago.
   The daily run at nine means each window is hit exactly once. */
async function workshopMail(done) {
  done.workshops = { reminded: 0, asked: 0 };
  const row = await supa.row('settings', 'key=eq.workshops&select=value');  /* a failed read stops this job and is reported, rather than reading as nothing booked */
  const all = wsSettle((row && row.value) || {});
  const past = await pastClients();
  const now = Date.now();
  /* the review link is per workshop and easy to leave blank on a new date;
     a blank one borrows the link from the latest date that has one, so the
     day after still has a Leave a review button */
  const anyReview = (Object.values(all).filter(x => x && /^https:\/\//.test(x.reviewUrl || '')).sort((a, b) => ms(b.when) - ms(a.when))[0] || {}).reviewUrl || GOOGLE_REVIEW;
  /* what the day after email shows under the thank you: the dates still on
     sale with who holds them, the prices from Money, the coaching places
     open, the roster. Read once a run, and only when somebody is due one. */
  let AFTER = null;
  const afterData = async () => {
    if (AFTER) return AFTER;
    const coming = [];
    for (const o of Object.values(all)) {
      if (!o || !o.live || !o.when || ms(o.when) <= now) continue;
      const ob = await supa.row('settings', `key=eq.${enc('wsbook:' + o.slug)}&select=value`).catch(() => null);
      const held = ((ob && ob.value) || []).filter(x => x && x.email && x.status !== 'cancelled' && x.status !== 'refunded' && x.status !== 'moved');
      coming.push({ w: o, who: new Set(held.map(x => norm(x.email))), left: Number(o.places) > 0 ? Math.max(0, Number(o.places) - held.length) : null });
    }
    coming.sort((a, b) => ms(a.w.when) - ms(b.w.when));
    const [pr, pl, store, list] = await Promise.all([
      supa.row('settings', 'key=eq.prices&select=value').catch(() => null),
      supa.row('settings', 'key=eq.coachplaces&select=value').catch(() => null),
      appStoreLink(), rosterList()]);
    const P = k => (pr && pr.value && pr.value[k] && pr.value[k].label) || PRICE_LABELS[k];
    const trial = pr && pr.value && Number(pr.value.trialDays);
    AFTER = { coming: coming.slice(0, 3), roster: new Set(list.map(c => c.email)),
      prices: { s60: P('session60'), s90: P('session90'), online: P('online'), inperson: P('inperson'), app: P('plus'),
        trialDays: trial > 0 ? trial : 7, places: pl && pl.value && Number.isInteger(pl.value.n) ? pl.value.n : null,
        store, iphone: IOS_PRICE } };
    return AFTER;
  };
  for (const w of Object.values(all)) {
    /* not w.live: taking a full workshop off the site is the obvious thing to
       do once it fills, and it used to silently cancel the reminder and the
       review ask for everyone already booked. A date is still needed. */
    if (!w || !w.when) continue;
    const at = ms(w.when);
    const b = await supa.row('settings', `key=eq.${enc('wsbook:' + w.slug)}&select=value`).catch(() => null);
    /* people who cancelled or were refunded stay in the list so the history
       reads, and were being sent "see you tomorrow" and then "thank you for
       coming" with a review ask */
    const book = ((b && b.value) || [])
      .filter(p => p && p.email && p.status !== 'cancelled' && p.status !== 'refunded' && p.status !== 'moved');
    if (!book.length) continue;
    const whenTxt = wsWhenTxt(w);
    const hoursTo = (at - now) / 3600e3;
    if (hoursTo > 12 && hoursTo <= 36) {
      /* the key was per workshop, so once the run had marked it, anyone who
         booked afterwards got no reminder at all while the booking page, the
         confirmation and this email all promise one. One key per person. */
      for (const p of book) {
        const key = `wsremind:${w.slug}:${p.email}`;
        if (!(await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null))) {
          const T = await emailCopy('wsRemind', { name: esc(String(p.name || '').split(' ')[0]), title: esc(w.title), when: esc(whenTxt), place: w.place ? ', at ' + esc(w.place) : '',
            arch: /calisthenics/i.test(w.title || '') ? 'Arch 2' : 'Arch 1 (the purple room)',
            directions: '<a href="https://www.google.com/maps/search/?api=1&query=OverGravity+Gymnastics+Sutton+Street+London+E1+0DB" style="color:#006663">Directions</a>.' });
          if (T.off) { done.held = (done.held || 0) + 1; continue; }
          /* a reminder the booking promised is theirs, like a receipt; and it
             is only marked as sent when it went, so a held one is not
             counted as done */
          /* the reminder is the moment somebody finds out they cannot come:
             the way to move or cancel goes with it, while it still counts */
          const canChange = hoursTo > WS_CUTOFF_H;
          const link = canChange && p.session ? await manageLink(w.slug, p.email, p.session, w.when) : '';
          /* the health declaration and photos are asked once paid (13 Oct
             2026); anybody who skipped them is asked again here, on the page
             they would have seen. A guest is asked on the day. */
          const ask = !p.payer && p.session && (!p.health || !p.photo)
            ? [`Two quick questions before the class, about your health and photos: <a href="${SITE}/handstand-class.html?booked=${encodeURIComponent(w.slug)}&bs=${encodeURIComponent(p.session)}#book" style="color:#006663">answer them here</a>.`] : [];
          const went = await email(p.email, T.subject,
            mail({ title: T.title, greeting: String(p.name || '').split(' ')[0],
              paras: T.paras.concat(ask, link ? [`Can't make it after all? <a href="${link}" style="color:#006663">Move to another date${Number(p.at) >= WS_POLICY_FROM ? ', or cancel for a credit towards another class' : ' or cancel'}</a>, no account needed, before ${new Date(at - WS_CUTOFF_H * 3600e3).toLocaleString('en-GB', { weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' }).replace(':00', '').replace(/\s+([ap]m)$/i, '$1')}.`]
                : [`Can't make it after all? Reply to this email.`]),
              signoff: { name: 'Elliott, London Handstand Academy' }, footnote: T.footnote || undefined }), undefined, { receipt: true });
          if (!went) { done.held = (done.held || 0) + 1; continue; }
          done.workshops.reminded++;
          await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
        }
      }
    }
    const hoursSince = (now - at) / 3600e3;
    /* ── the part that was missing: turning the room into clients ──────
       The day after asked for a review and stopped. Three days on, everyone
       who came and is not already a client is offered the next step (a 1-2-1
       credited to their first month, or the free call); ten days on, anyone
       who has not taken it is asked how it is going, with a free look at a
       clip. Each once, and never to somebody on the roster. */
    if (hoursSince > 60 && hoursSince <= 240) {
      /* somebody still booked for a later date hears after that one, once */
      const later = new Set();
      for (const o of Object.values(all)) {
        if (!o || !o.when || ms(o.when) <= now) continue;
        const ob = await supa.row('settings', `key=eq.${enc('wsbook:' + o.slug)}&select=value`).catch(() => null);
        for (const x of ((ob && ob.value) || [])) if (x && x.email && x.status !== 'cancelled' && x.status !== 'refunded' && x.status !== 'moved') later.add(norm(x.email));
      }
      const roster = new Set((await rosterList()).map(c => c.email));
      const sessRow = await supa.row('settings', 'key=eq.sessions&select=value').catch(() => null);
      const sessions = (sessRow && sessRow.value) || [];
      const tookIt = e => sessions.some(x => x && x.email === e && x.status !== 'cancelled' && x.status !== 'refunded' && ms(x.at) > at);
      const days = hoursSince / 24;
      for (const p of book) {
        const e = norm(p.email);
        if (roster.has(e) || past[e]) continue;
        /* marked as not there: "most of what changed for you" reads badly */
        if (p.attended === 'no' || later.has(e)) continue;
        const first = String(p.name || '').split(' ')[0];
        if (days >= 2.5 && days <= 4) {
          const key = `wsoffer:${w.slug}:${e}`;
          if (!(await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null))) {
            const day = new Date(at).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'Europe/London' });
            /* session_line was the 1-2-1 in the old words; it has a card of its
               own now, at the prices in Money, so an older dashboard edit drops it */
            const T = await emailCopy('wsOffer', { name: esc(first), title: esc(w.title), day: esc(day), session_line: '' });
            if (T.off) { done.held = (done.held || 0) + 1; continue; }
            const P = (await afterData()).prices;
            const M = nextStepEmail({ site: SITE, first, title: T.title, paras: T.paras, footnote: T.footnote,
              kicker: w.title, s60: P.s60, s90: P.s90, call: `${SITE}/call.html`,
              photo: { src: '/assets/email/elliott-one-arm.jpg', alt: 'Elliott in a one arm handstand at Leadenhall Market' },
              headshot: '/assets/site/coach-elliott-headshot.jpg',
              preheader: `A 1-2-1 at OverGravity, from ${P.s60}, or a free 15 minute call.` });
            await email(e, T.subject, M.html, 'offers', { text: M.text });
            /* a failed send is not marked, so the next run can try; a held
               one (offers off, unsubscribed) is, as before */
            if (sendFailed) { done.failed = (done.failed || 0) + 1; continue; }
            done.workshops.offered = (done.workshops.offered || 0) + 1;
            await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
          }
        }
        /* the ten-day "are you still training the drills" email is gone (8 Oct
           2026): a booking had up to seven emails, and this one asked again
           what the three-day one had just offered */
      }
    }
    if (hoursSince > 10 && hoursSince <= 40) {
      const reviewUrl = w.reviewUrl || anyReview;
      for (const p of book) {
        /* marked as not there: no thank you for coming */
        if (p.attended === 'no') continue;
        const key = `wsreview:${w.slug}:${p.email}`;
        /* one ask a person, not one a date: both Saturdays booked together got two */
        const once = `wsreviewed:${norm(p.email)}`;
        const had = await supa.row('nudges', `key=eq.${enc(once)}&select=sent_at`).catch(() => null);
        if (had && now - ms(had.sent_at) < 45 * 24 * 3600e3) continue;
        if (!(await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null))) {
          const first = String(p.name || '').split(' ')[0];
          const day = new Date(at).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'Europe/London' });
          /* review_line and app_line belonged to the old words; the review
             and the app have panels of their own now, so an edit made in the
             dashboard before 10 Oct 2026 loses those lines rather than
             saying them twice */
          const T = await emailCopy('wsThanks', { name: esc(first), title: esc(w.title), day: esc(day), review_line: '', app_line: '' });
          if (T.off) { done.held = (done.held || 0) + 1; continue; }
          const A = await afterData(), e = norm(p.email);
          /* a coaching client hears no coaching pitch, and somebody who
             turned offers off gets the thank you and the dates only */
          const pitch = !A.roster.has(e) && (await wantsEmail(e, 'offers'));
          const M = afterClassEmail({ site: SITE, first, title: T.title, paras: T.paras, footnote: T.footnote,
            kicker: w.title, review: reviewUrl,
            photo: { src: '/assets/email/class-upside-down.jpg', alt: 'The class at OverGravity, upside down' },
            headshot: '/assets/site/coach-elliott-headshot.jpg',
            preheader: A.coming.length ? `Thank you for coming. Next date: ${wsWhenTxt(A.coming[0].w).split(', ')[0]}.` : 'Thank you for coming.',
            dates: A.coming.map(c => {
              const [d0, ...t] = wsWhenTxt(c.w).split(', ');
              return { day: d0, time: t.join(', '), place: c.w.place || '',
                what: wsKind(c.w) === wsKind(w) ? '' : c.w.title,
                price: c.w.price ? '£' + (c.w.price / 100).toFixed(2).replace(/\.00$/, '') : 'Free',
                left: c.left, full: c.left === 0, booked: c.who.has(e),
                /* the calisthenics class is booked on the class page too (24 Oct 2026) */
                href: wsBookHref(c.w) };
            }),
            more: `${SITE}/handstand-class`,
            offers: pitch ? A.prices : null });
          await email(p.email, T.subject, M.html, undefined, { text: M.text });
          if (sendFailed) { done.failed = (done.failed || 0) + 1; continue; }
          done.workshops.asked++;
          await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
          await supa.upsert('nudges', { key: once, sent_at: new Date().toISOString() }, 'key').catch(() => {});
        }
      }
    }
  }
}

/* ── started booking and stopped ────────────────────────────────────────
   Somebody who typed their email on the booking sheet, or pressed Book,
   and never paid. One email, the next morning at the earliest (two hours
   after they stopped), while the date is still more than three hours
   away, and never to anyone who holds a place on that date. */
/* The page that sells this workshop: the all levels class has its own,
   anything else is workshop.html. Every started booking email sent people
   to the all levels page, which does not offer the others (16 Oct 2026,
   review), as the after-class email already knew. */
const wsBookHref = w => /all levels/i.test((w && w.title) || '')
  ? `${SITE}/handstand-class?src=email#book` : /calisthenics/i.test((w && w.title) || '') ? `${SITE}/handstand-class?class=calisthenics&src=email#book` : `${SITE}/workshop.html?slug=${enc(w.slug)}&src=email`;
async function intentMail(done) {
  done.intents = { reminded: 0 };
  const row = await supa.row('settings', 'key=eq.workshops&select=value');  /* a failed read stops this job and is reported, rather than reading as nothing booked */
  const all = wsSettle((row && row.value) || {});
  const now = Date.now();
  /* everyone with a row on any date of a class: somebody who typed their
     email while one Saturday was picked and paid for the other has booked */
  const kind = wsKind;
  const heldBy = {};
  for (const x of Object.values(all)) {
    if (!x || !x.slug) continue;
    const r = await supa.row('settings', `key=eq.${enc('wsbook:' + x.slug)}&select=value`).catch(() => null);
    const rows = (r && r.value) || [];
    x.__live = rows.filter(b => b && b.status !== 'cancelled' && b.status !== 'refunded' && b.status !== 'moved').length;
    for (const b of rows) if (b && b.email) (heldBy[kind(x)] = heldBy[kind(x)] || new Set()).add(norm(b.email));
  }
  /* one email a person a run, though they looked at both dates */
  const toldNow = new Set();
  for (const w of Object.values(all)) {
    if (!w || !w.live || !w.when) continue;
    const at = ms(w.when);
    if (at - now < 3 * 3600e3) continue;
    /* "the place is still open" must be true */
    if (Number(w.places) > 0 && w.__live >= Number(w.places)) continue;
    const ir = await supa.row('settings', `key=eq.${enc('wsintent:' + w.slug)}&select=value`).catch(() => null);
    const intents = ((ir && ir.value) || []).filter(x => x && x.email && now - (x.at || 0) > 2 * 3600e3);
    if (!intents.length) continue;
    const br = await supa.row('settings', `key=eq.${enc('wsbook:' + w.slug)}&select=value`).catch(() => null);
    const multiRow = await supa.row('settings', 'key=eq.wsmulti&select=value').catch(() => null);
    /* anyone with a row at all: somebody who booked and then cancelled or
       moved chose that, and "you started booking" reads as not listening */
    const held = new Set(((br && br.value) || []).filter(b => b && b.email).map(b => norm(b.email)));
    const whenTxt = wsWhenTxt(w);
    for (const p of intents) {
      const e = norm(p.email);
      if (held.has(e) || (heldBy[kind(w)] && heldBy[kind(w)].has(e)) || toldNow.has(e)) continue;
      const key = `wsintent:${w.slug}:${e}`;
      /* the last day of an early bird: this morning's run is the last before
         it goes up, so they hear it ends tonight, once. It stands in for the
         morning-after reminder, so that one is marked sent too. */
      if (w.early && Number(w.early.then) > (Number(w.price) || 0) && ms(w.early.until) - now < DAY) {
        const keyE = `wsearly:${w.slug}:${e}`;
        /* the second reminder says "this is the last email about it", so
           whoever had it does not get a third (16 Oct 2026, review) */
        if (!(await supa.row('nudges', `key=eq.${enc(keyE)}&select=key`).catch(() => null))) {
          const priceE = wsPoundsC(w.price), thenE = wsPoundsC(w.early.then);
          const TE = await emailCopy('wsEarly', { name: esc(String(p.name || '').split(' ')[0]), title: esc(w.title), when: esc(whenTxt),
            price: priceE, then: thenE, until: esc(wsEarlyDayC(w)), ends: wsEarlyAtC(w) === 'midnight' ? 'the end of today' : wsEarlyAtC(w) + ' today', link: wsBookHref(w) });
          /* switched off in the dashboard: the usual reminders carry on as if
             it were not there. A continue here skipped them for the day. */
          if (!TE.off) {
            const wentE = await email(e, TE.subject, earlyEmail(TE, { first: String(p.name || '').split(' ')[0], title: w.title, when: whenTxt, place: w.place,
              price: priceE, then: thenE, at: wsEarlyAtC(w), href: wsBookHref(w), left: Number(w.places) > 0 ? Math.max(0, Number(w.places) - w.__live) : 0 }, SITE));
            if (!wentE) { done.held = (done.held || 0) + 1; continue; }
            done.intents.early = (done.intents.early || 0) + 1; toldNow.add(e);
            await supa.upsert('nudges', { key: keyE, sent_at: new Date().toISOString() }, 'key');
            if (!(await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null)))
              await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key').catch(() => {});
            continue;
          }
        }
      }
      const first = await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null);
      /* one reminder, the morning after; the three-days-on one is gone (Elliott, 21 Oct 2026) */
      if (first) continue;
      /* taken off the list in the dashboard: not again, even if they start again */
      if (await supa.row('nudges', `key=eq.${enc(`wsintentoff:${w.slug}:${e}`)}&select=key`).catch(() => null)) continue;
      const anyKey = `wsintentany:${e}`;
      const hadAny = await supa.row('nudges', `key=eq.${enc(anyKey)}&select=sent_at`).catch(() => null);
      if (hadAny && now - ms(hadAny.sent_at) < 14 * DAY) continue;
      const price = w.price ? '£' + (w.price / 100).toFixed(2).replace(/\.00$/, '') : 'Free';
      const openSame = Object.values(all).filter(x => x && x.live && x.when && ms(x.when) - now > 3 * 3600e3 && kind(x) === kind(w)
        && !(Number(x.places) > 0 && x.__live >= Number(x.places))).length;
      /* the multi-booking saving, £5 unless the owner set another */
      const mv = multiRow && multiRow.value && multiRow.value.pence != null ? Math.max(0, Number(multiRow.value.pence) || 0) : 500;
      const pairPence = openSame > 1 ? mv : 0;
      const T = await emailCopy('wsIntent', { name: esc(String(p.name || '').split(' ')[0]), title: esc(w.title), when: esc(whenTxt),
        place: w.place ? ', at ' + esc(w.place) : '', price, early_line: wsEarlyLine(w), coach_line: wsCoachLineC(w), pair_line: pairPence ? `Book both Saturdays together and save £${(pairPence / 100).toFixed(2).replace(/\.00$/, '')}.` : '',
        link: wsBookHref(w) });
      if (T.off) { done.held = (done.held || 0) + 1; continue; }
      const went = await email(e, T.subject, intentEmail(T, { first: String(p.name || '').split(' ')[0], title: w.title, when: whenTxt, place: w.place,
        price, href: wsBookHref(w), left: Number(w.places) > 0 ? Math.max(0, Number(w.places) - w.__live) : 0, pair: pairPence, coach: w.coach || '',
        early: wsEarlyLine(w) ? { day: wsEarlyByC(w), then: wsPoundsC(w.early.then) } : null }, SITE));
      if (!went) { done.held = (done.held || 0) + 1; continue; }
      done.intents.reminded++; toldNow.add(e);
      await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
      await supa.upsert('nudges', { key: anyKey, sent_at: new Date().toISOString() }, 'key').catch(() => {});
    }
  }
}

/* ── one to one sessions: the day before, and the day after ─────────────
   The reminder, and then the offer the site already makes: the session is
   credited against the first month if they join within fourteen days. */
async function sessionMail(done) {
  done.sessions = { reminded: 0, followed: 0, chased: 0 };
  const row = await supa.row('settings', 'key=eq.sessions&select=value');  /* a failed read stops this job and is reported, rather than reading as nothing booked */
  const list = (row && row.value) || [];
  const now = Date.now();
  for (const x of list) {
    /* Bought, and still no time a day on. The session page and the email
       both promise a time within 48 hours, and nothing said when that was
       slipping: the session sat on Today until somebody looked. The coach
       is told once. The London sessions a plan includes promise no time,
       so they are left to Today. */
    /* an ask to move starts the 48 hours again, from when it was asked */
    if (x && x.status === 'toArrange' && !x.when && !x.fromPlan && (x.session || Number(x.paid) > 0) && now - ms(x.moveAsked || x.at) > DAY) {
      const key = `sesschase:${x.id}${x.moveAsked ? ':' + x.moveAsked : ''}`;
      if (!(await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null))) {
        const hrs = Math.round((now - ms(x.moveAsked || x.at)) / 3600e3);
        const went = await email(process.env.COACH_EMAIL || primaryCoach(), `No time yet: ${x.name || x.email}, ${x.kind} min, ${x.moveAsked ? 'asked to move' : 'paid'} ${hrs} hours ago`,
          mail({ title: `${esc(x.name || x.email)} is still waiting for a time.`,
            paras: [`${x.moveAsked ? `They asked to move their ${esc(x.kind)} minute session ${hrs} hours ago` : `They paid for a ${esc(x.kind)} minute session ${hrs} hours ago`} and no time has been set. They were promised one within 48 hours.`,
                    x.prefs ? `They said: <b>${esc(x.prefs)}</b>.` : 'They gave no preferred times, so ask them in the chat.',
                    'If no time works, the session page promises a full refund.'],
            cta: { href: `${SITE}/lha-coach.html`, label: 'Set the time on Today' } }));
        if (went) { await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key'); done.sessions.chased++; }
      }
    }
    /* done, not only arranged: marking a session done the moment it finished
       was cancelling the follow-up, which is the only place the offer of the
       fee against the first month is ever made. Cancelled ones are out. */
    /* an ask to cancel or move, not answered in a day: the coach is told, once */
    if (x && x.req && ['arranged', 'toArrange'].includes(x.status) && now - (Number(x.req.at) || 0) > DAY && (!x.when || ms(x.when) > now)) {
      const key = `sessreqchase:${x.id}:${x.req.at}`;
      if (!(await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null))) {
        const hrs = Math.round((now - Number(x.req.at)) / 3600e3);
        const whenTxt = x.when ? new Date(ms(x.when)).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }) : '';
        const went = await email(process.env.COACH_EMAIL || primaryCoach(), `Still to answer: ${x.name || x.email} asked to ${x.req.kind} ${hrs} hours ago`,
          mail({ title: `${esc(x.name || x.email)} is waiting for your answer.`,
            paras: [`They asked to ${esc(x.req.kind)} their ${esc(x.kind)} minute session${whenTxt ? ' on ' + esc(whenTxt) : ''} ${hrs} hours ago. They were told you would come back within 48 hours.`,
                    'On Today: a full, part or no refund, a new date, or keep it as it is.'],
            cta: { href: `${SITE}/lha-coach.html`, label: 'Answer on Today' } }));
        if (went) { await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key'); done.sessions.chased++; }
      }
    }
    if (!x || !x.when || !['arranged', 'done'].includes(x.status)) continue;
    /* an ask to cancel waits on the coach: no "see you tomorrow" over it */
    if (x.req && x.req.kind === 'cancel' && x.status === 'arranged') continue;
    /* a picked time not confirmed yet (the room not booked): no reminder,
       and the coach is chased once a day has gone by */
    if (x.room === 'hire' && x.status === 'arranged') {
      const since = Math.max(Number(x.at) || 0, ...((x.moves || []).map(m => Number(m.at) || 0)));
      const key = `sessconfirm:${x.id}:${x.when}`;
      if (now - since > DAY && ms(x.when) > now && !(await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null))) {
        const whenTxt = new Date(ms(x.when)).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
        const went = await email(process.env.COACH_EMAIL || primaryCoach(), `Still to confirm: ${x.name || x.email}, ${whenTxt}`,
          mail({ title: `${esc(x.name || x.email)} is waiting for you to confirm.`,
            paras: [`Their ${esc(x.kind)} minute session on ${esc(whenTxt)} is paid for and held, not confirmed. They were told you would confirm within 48 hours.`,
                    'Book the room and confirm it on Today, or move it there if it cannot be secured.'],
            cta: { href: `${SITE}/lha-coach.html`, label: 'Open Today' } }));
        if (went) { await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key'); done.sessions.chased++; }
      }
      continue;
    }
    const at = ms(x.when);
    const hoursTo = (at - now) / 3600e3, hoursSince = (now - at) / 3600e3;
    const whenTxt = new Date(at).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
    if (hoursTo > 12 && hoursTo <= 36) {
      /* one per date: the key was the session alone, so a session moved to
         another day was never reminded of the new one */
      const key = `sessremind:${x.id}:${x.when}`;
      const had = await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null);
      if (!had) {
        const first = String(x.name || '').split(' ')[0];
        /* still more than a day off: they can move it, or cancel it with a
           refund, themselves. Inside that the email already says to reply. */
        /* a cancel or a move goes to Elliott, who has hired the room, so the
           link is there to the end; inside a day the terms may charge it */
        const change = `<b>Can't make it?</b> <a href="${await sessManage(x)}" style="color:#006663">${x.fromPlan ? 'Ask to move it here' : 'Move or cancel it here'}</a>, no sign in needed.${
          hoursTo > WS_CUTOFF_H || x.fromPlan ? '' : ` With less than ${WS_CUTOFF_H} hours' notice it may be charged in full.`}`;
        let went = false;
        if (Number(x.ask) > 0) {
          /* not paid yet, so not confirmed: "see you tomorrow" said nothing
             about the payment that confirms it */
          const amt = '£' + (Number(x.ask) / 100).toFixed(Number(x.ask) % 100 ? 2 : 0);
          went = await email(x.email, `Tomorrow: your session, pay to confirm it`, mail({ title: 'Your session is tomorrow.', greeting: first,
            paras: [`<b>${esc(whenTxt)}</b>${x.place ? ', at ' + esc(x.place) : ''}. ${esc(x.kind)} minutes.`,
                    `It is not paid for yet, so it is not confirmed. Paying ${amt} confirms it.`, change].filter(Boolean),
            cta: { href: `${SITE}/api/app/session/pay?id=${enc(x.id)}`, label: `Pay ${amt}` },
            signoff: { name: 'Elliott, London Handstand Academy' } }), undefined, { receipt: true });
        } else {
          const T = await emailCopy('sessRemind', { name: esc(first), when: esc(whenTxt), place: x.place ? ', at ' + esc(x.place) : '', kind: esc(x.kind) });
          if (T.off) { done.held = (done.held || 0) + 1; continue; }
          went = await email(x.email, T.subject, mail({ title: T.title, greeting: first,
            paras: T.paras.concat(change ? [change] : []),
            signoff: { name: 'Elliott, London Handstand Academy' }, footnote: T.footnote || undefined }), undefined, { receipt: true });
        }
        if (!went) { done.held = (done.held || 0) + 1; continue; }
        await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
        done.sessions.reminded++;
      }
    }
    /* the day-after note sells the Coaching Programme: not to somebody
       already in it, whose session came with their plan */
    const coachedNow = !!x.fromPlan || !!((await guardState()) || { roster: new Set() }).roster.has(norm(x.email));
    if (hoursSince > 10 && hoursSince <= 40 && !(Number(x.ask) > 0) && !coachedNow) {
      const key = `sessfollow:${x.id}`;
      if (!(await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null))) {
        /* one session's share: a pack's first row carries the whole pack, and
           the email said all of it came off a month of coaching */
        const each = Number(x.pack) > 1 ? Math.round(Number(x.paid) / Number(x.pack)) : x.paid;
        const paid = each ? '£' + (each / 100).toFixed(2).replace(/\.00$/, '') : 'the session fee';
        /* a session from a pack is not sold coaching: Elliott offers it
           himself when it fits (19 Oct 2026). It sent the offer after every
           one of the five, and a credit session's said "the session fee". */
        const fromPack = Number(x.pack) > 1 || !!x.credit;
        const T = await emailCopy(fromPack ? 'sessThanksPack' : 'sessThanks', { name: esc(String(x.name || '').split(' ')[0]), paid: esc(paid) });
        if (T.off) { done.held = (done.held || 0) + 1; continue; }
        await email(x.email, T.subject, mail({ title: T.title, greeting: String(x.name || '').split(' ')[0],
          paras: T.paras,
          cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
          signoff: { name: 'Elliott, London Handstand Academy' }, footnote: T.footnote || undefined }));
        if (sendFailed) { done.failed = (done.failed || 0) + 1; continue; }
        await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
        done.sessions.followed++;
      }
    }
  }
}

/* ── calls booked in the app: one reminder, the day before or that morning ──
   The job runs at nine (UTC) each day, so a call from an hour to a day and
   an hour off is reminded now: every call gets one, and one only. In their
   own time zone, with the link to join and the one to move or cancel. */
async function callRemind(done) {
  done.calls = { reminded: 0 };
  const conf = (await supa.row('settings', 'key=eq.callconf&select=value').catch(() => null)) || {};
  const c = conf.value || {};
  const row = await supa.row('settings', 'key=eq.calls&select=value');  /* a failed read stops this job and is reported, rather than reading as nothing booked */
  const list = (row && row.value) || [];
  const now = Date.now();
  const zone = tz => { try { if (tz) { new Intl.DateTimeFormat('en-GB', { timeZone: tz }); return tz; } } catch {} return 'Europe/London'; };
  const f = (t, z, o) => new Date(t).toLocaleString('en-GB', Object.assign({ hour: 'numeric', minute: '2-digit', hour12: true, timeZone: z }, o))
    .replace(':00', '').replace(/\s?([ap]m)/i, '$1').replace(' at ', ', ');
  for (const x of list) {
    if (!x || x.status !== 'booked' || !x.when) continue;
    const at = ms(x.when), hoursTo = (at - now) / 3600e3;
    if (!(hoursTo > 0.5 && hoursTo <= 24.5)) continue;
    const key = `callremind:${x.id}:${x.when}`;
    if (await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null)) continue;
    const z = zone(x.tz);
    const today = new Date(at).toLocaleDateString('en-CA', { timeZone: z }) === new Date(now).toLocaleDateString('en-CA', { timeZone: z });
    const clock = f(at, z, {}), lon = z === 'Europe/London' ? '' : f(at, 'Europe/London', {});
    const body = b64u(new TextEncoder().encode(JSON.stringify({ k: 'csm', i: x.id, e: norm(x.email), exp: now + 120 * DAY })));
    const key2 = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.SIGNING_SECRET || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const manage = `${SITE}/call.html?m=${body}.${b64u(await crypto.subtle.sign('HMAC', key2, new TextEncoder().encode(body)))}`;
    const kindTxt = x.kind === 'welcome' ? 'welcome call' : 'free call';
    const went = await email(x.email, `${today ? 'Today' : 'Tomorrow'}: your ${kindTxt} at ${clock}`, mail({
      title: today ? 'Your call is today.' : 'Your call is tomorrow.', greeting: String(x.name || '').split(' ')[0],
      paras: [`<b>${esc(clock)}</b>${lon && lon !== clock ? ' your time (' + esc(lon) + ' in London)' : ''}, ${Math.round((Number(x.len) || 15))} minutes with Elliott.`,
              c.link ? `When it is time, <a href="${esc(c.link)}" style="color:#006663;font-weight:600">join the call here</a>.` : '',
              `<b>Can't make it?</b> <a href="${manage}" style="color:#006663">Move or cancel it here</a>, no sign in needed.`].filter(Boolean),
      signoff: { name: 'Elliott, London Handstand Academy' } }), undefined, { receipt: true });
    if (!went) { done.held = (done.held || 0) + 1; continue; }
    await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
    done.calls.reminded++;
  }
}

export const config = { schedule: '0 9 * * *' };
