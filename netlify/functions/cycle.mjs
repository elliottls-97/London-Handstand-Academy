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
import { renderEmail } from './emails.mjs';
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
const REVIEW_HOURS = 48;
const NUDGE_AFTER = [0, 3];        // days past due — once on the day, once 3 days later

const norm = e => String(e || '').trim().toLowerCase();
/* the same signed link app.mjs makes: one place, managed without signing
   in, until the class. The format must match app.mjs sign()/verify(). */
const WS_CUTOFF_H = 24;
const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function manageLink(slug, email, session, until) {
  const body = b64u(new TextEncoder().encode(JSON.stringify({ k: 'wsm', s: slug, e: norm(email), x: String(session || ''), exp: (Date.parse(until) || Date.now()) + 6 * 3600e3 })));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.SIGNING_SECRET || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = b64u(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return `${SITE}/booking.html?t=${body}.${mac}`;
}
const enc = encodeURIComponent;
const ms = v => (v ? new Date(v).getTime() : 0);

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
          style="color:#8a8d80">info@londonhandstandacademy.com</a>
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

async function email(to, subject, html, kind, opts) {
  if (!process.env.RESEND_API_KEY || !to) return false;
  if (!(await wantsEmail(to, kind))) return false;
  if (!mayEmail(to)) return false;
  if (!(await clientMailAllowed(to, !!(opts && opts.receipt)))) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'info@londonhandstandacademy.com',
        to, subject, html, reply_to: process.env.REPLY_TO || 'info@londonhandstandacademy.com' }),
    });
    return r.ok;
  } catch { return false; }
}

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

export default async () => {
  /* the guard is read fresh for every run: a switch changed a moment ago counts */
  GUARD = null;
  const now = Date.now();
  const done = { reminded: [], chased: [], skipped: 0 };

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

    /* 1 — footage is due and has not arrived */
    if (!c.lead && !mine.length && now >= dueAt) {
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

}

  try { await quietFreeAccounts(done); } catch (e) { done.quietError = String(e && e.message || e); }
  try { await workshopMail(done); } catch (e) { done.workshopError = String(e && e.message || e); }
  try { await intentMail(done); } catch (e) { done.intentError = String(e && e.message || e); }
  try { await sessionMail(done); } catch (e) { done.sessionError = String(e && e.message || e); }
  try { await firstTenDays(done); } catch (e) { done.tipsError = String(e && e.message || e); }
  try { await trainingPush(done); } catch (e) { done.pushError = String(e && e.message || e); }
  try { await voiceSweep(done); } catch (e) { done.voiceError = String(e && e.message || e); }
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
/* ── the streak, counted the way the app counts it ──────────────────
   Keep this in step with streakInfo() in lha-app.html. Weeks turn over on
   a Monday by the date in London; a week with a session in it (part of
   one counts) keeps the run; every four weeks kept earns a rest week, two
   at most, and a week with nothing in it spends one instead of ending the
   run. The week in progress never ends a run: it is not over yet. */
const LONDON_DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
const londonWeek = t => {
  const p = LONDON_DATE.formatToParts(new Date(t)), g = k => +p.find(x => x.type === k).value;
  return Math.floor((Math.round(Date.UTC(g('year'), g('month') - 1, g('day')) / DAY) + 3) / 7);
};
export function streakOf(sessions, now = Date.now()) {
  const ss = (sessions || []).filter(x => x && x.at && x.kind !== 'none');
  const cur = londonWeek(now), weeks = new Set(ss.map(x => londonWeek(x.at)));
  let run = 0, rests = 0;
  if (weeks.size) for (let w = Math.min(...weeks); w <= cur; w++) {
    if (weeks.has(w)) { run++; if (run % 4 === 0) rests = Math.min(2, rests + 1); }
    else if (w === cur) break;
    else if (run && rests) rests--;
    else run = 0;
  }
  return { weeks: run, rests, thisWeek: ss.filter(x => londonWeek(x.at) === cur).length, week: cur };
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
    /* Saturday, a streak of two weeks or more, nothing yet this week and no
       rest week to cover it: the one day a week it is worth saying. Once a
       week at most, and it takes the place of the day's other note. */
    const S = streakOf(sess, now.getTime());
    const streakKey = `pushstreak:${e}:${S.week}`;
    if (wd === 5 && S.weeks >= 2 && !S.thisWeek && !S.rests
        && !(await supa.row('nudges', `key=eq.${enc(streakKey)}&select=key`).catch(() => null))) {
      payload = { title: `Keep your ${S.weeks} week streak`, body: 'One session by Sunday keeps it going.',
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
      const ok = await email(a.email, T.subject,
        mail({ title: T.title, greeting: (a.name || '').split(' ')[0] || '',
          paras: T.paras,
          cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
          signoff: { name: 'Elliott, London Handstand Academy' },
          footnote: T.footnote || undefined }),
        'reminders');
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
  const row = await supa.row('settings', 'key=eq.workshops&select=value').catch(() => null);
  const all = (row && row.value) || {};
  const past = await pastClients();
  const now = Date.now();
  /* the review link is per workshop and easy to leave blank on a new date;
     a blank one borrows the link from the latest date that has one, so the
     day after still has a Leave a review button */
  const anyReview = (Object.values(all).filter(x => x && /^https:\/\//.test(x.reviewUrl || '')).sort((a, b) => ms(b.when) - ms(a.when))[0] || {}).reviewUrl || '';
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
    const whenTxt = new Date(at).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
    const hoursTo = (at - now) / 3600e3;
    if (hoursTo > 12 && hoursTo <= 36) {
      /* the key was per workshop, so once the run had marked it, anyone who
         booked afterwards got no reminder at all while the booking page, the
         confirmation and this email all promise one. One key per person. */
      for (const p of book) {
        const key = `wsremind:${w.slug}:${p.email}`;
        if (!(await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null))) {
          const T = await emailCopy('wsRemind', { name: esc(String(p.name || '').split(' ')[0]), title: esc(w.title), when: esc(whenTxt), place: w.place ? ', at ' + esc(w.place) : '',
            directions: '<a href="https://www.google.com/maps/search/?api=1&query=OverGravity+Gymnastics+Sutton+Street+London+E1+0DB" style="color:#006663">Directions</a>.' });
          if (T.off) { done.held = (done.held || 0) + 1; continue; }
          /* a reminder the booking promised is theirs, like a receipt; and it
             is only marked as sent when it went, so a held one is not
             counted as done */
          /* the reminder is the moment somebody finds out they cannot come:
             the way to move or cancel goes with it, while it still counts */
          const canChange = hoursTo > WS_CUTOFF_H;
          const link = canChange && p.session ? await manageLink(w.slug, p.email, p.session, w.when) : '';
          const went = await email(p.email, T.subject,
            mail({ title: T.title, greeting: String(p.name || '').split(' ')[0],
              paras: T.paras.concat(link ? [`Can't make it after all? <a href="${link}" style="color:#006663">Move to another date or cancel</a>, no account needed, before ${new Date(at - WS_CUTOFF_H * 3600e3).toLocaleString('en-GB', { weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' }).replace(':00', '').replace(/\s+([ap]m)$/i, '$1')}.`]
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
            const T = await emailCopy('wsOffer', { name: esc(first), title: esc(w.title),
              session_line: `The fastest way on is a one to one at OverGravity: sixty minutes on your handstand alone, £80, and if you join coaching within fourteen days it comes off your first month. Book it at <a href="${SITE}/session.html" style="color:#006663">londonhandstandacademy.com/session</a>.` });
            if (T.off) { done.held = (done.held || 0) + 1; continue; }
            await email(e, T.subject, mail({ title: T.title, greeting: first, paras: T.paras,
              cta: { href: 'https://calendly.com/londonhandstandacademy-info/intro-call', label: 'Book the free call' },
              signoff: { name: 'Elliott, London Handstand Academy' }, footnote: T.footnote || undefined }), 'offers');
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
          const T = await emailCopy('wsThanks', { name: esc(String(p.name || '').split(' ')[0]), title: esc(w.title),
            review_line: reviewUrl ? 'A sentence about how you found it, where other people will see it. It takes a minute and it is how the next workshop fills.' : 'Reply to this with a sentence about how you found it, good or bad. I read every one.',
            app_line: 'The drills from today are in the Handstand Ladder app, and the first stage, Foundations, is free.' });
          if (T.off) { done.held = (done.held || 0) + 1; continue; }
          await email(p.email, T.subject,
            mail({ title: T.title, greeting: String(p.name || '').split(' ')[0],
              paras: T.paras,
              cta: reviewUrl ? { href: reviewUrl, label: 'Leave a review' } : { href: `${SITE}/lha-app.html`, label: 'Open the app' },
              signoff: { name: 'Elliott, London Handstand Academy' }, footnote: T.footnote || undefined }));
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
async function intentMail(done) {
  done.intents = { reminded: 0 };
  const row = await supa.row('settings', 'key=eq.workshops&select=value').catch(() => null);
  const all = (row && row.value) || {};
  const now = Date.now();
  /* everyone with a row on any date of a class: somebody who typed their
     email while one Saturday was picked and paid for the other has booked */
  /* as app.mjs wsKindOf: a date in the title does not make it another class */
  const kind = x => String((x && x.title) || '').toLowerCase().replace(/\b(\d+(st|nd|rd|th)?|jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sept?(ember)?|oct(ober)?|nov(ember)?|dec(ember)?|mon(day)?|tues?(day)?|wed(nesday)?|thu(rs)?(day)?|fri(day)?|sat(urday)?|sun(day)?)\b/g, ' ').replace(/[^a-z]+/g, '');
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
    const pairRow = await supa.row('settings', 'key=eq.wspair&select=value').catch(() => null);
    /* anyone with a row at all: somebody who booked and then cancelled or
       moved chose that, and "you started booking" reads as not listening */
    const held = new Set(((br && br.value) || []).filter(b => b && b.email).map(b => norm(b.email)));
    const whenTxt = new Date(at).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
    for (const p of intents) {
      const e = norm(p.email);
      if (held.has(e) || (heldBy[kind(w)] && heldBy[kind(w)].has(e)) || toldNow.has(e)) continue;
      const key = `wsintent:${w.slug}:${e}`;
      const first = await supa.row('nudges', `key=eq.${enc(key)}&select=key,sent_at`).catch(() => null);
      if (first) {
        /* three days after the first, if they still have no place and the
           date is still more than a day away: the date once more, and the
           free app as the way to start at home. The last word on it. */
        const sentAt = ms(first.sent_at);
        if (!sentAt || now - sentAt < 3 * DAY || at - now < DAY) continue;
        const key2 = `wsintent2:${w.slug}:${e}`;
        if (await supa.row('nudges', `key=eq.${enc(key2)}&select=key`).catch(() => null)) continue;
        const price2 = w.price ? '£' + (w.price / 100).toFixed(2).replace(/\.00$/, '') : 'free';
        const T2 = await emailCopy('wsIntent2', { name: esc(String(p.name || '').split(' ')[0]), title: esc(w.title), when: esc(whenTxt),
          price: price2, link: `${SITE}/handstand-class#book`, app_link: `${SITE}/lha-app.html?ref=workshop` });
        if (T2.off) { done.held = (done.held || 0) + 1; continue; }
        const went2 = await email(e, T2.subject, mail({ title: T2.title, greeting: String(p.name || '').split(' ')[0], paras: T2.paras,
          kicker: 'Handstand, this week',
          cta: { href: `${SITE}/lha-app.html?ref=workshop`, label: 'Try the free app' },
          signoff: { name: 'Elliott, London Handstand Academy' }, footnote: T2.footnote || undefined }));
        if (!went2) { done.held = (done.held || 0) + 1; continue; }
        done.intents.again = (done.intents.again || 0) + 1; toldNow.add(e);
        await supa.upsert('nudges', { key: key2, sent_at: new Date().toISOString() }, 'key');
        continue;
      }
      const anyKey = `wsintentany:${e}`;
      const hadAny = await supa.row('nudges', `key=eq.${enc(anyKey)}&select=sent_at`).catch(() => null);
      if (hadAny && now - ms(hadAny.sent_at) < 14 * DAY) continue;
      const price = w.price ? '£' + (w.price / 100).toFixed(2).replace(/\.00$/, '') : 'Free';
      const openSame = Object.values(all).filter(x => x && x.live && x.when && ms(x.when) - now > 3 * 3600e3 && kind(x) === kind(w)
        && !(Number(x.places) > 0 && x.__live >= Number(x.places))).length;
      const pairPence = openSame > 1 ? Number(((pairRow && pairRow.value) || {}).pence) || 0 : 0;
      const T = await emailCopy('wsIntent', { name: esc(String(p.name || '').split(' ')[0]), title: esc(w.title), when: esc(whenTxt),
        place: w.place ? ', at ' + esc(w.place) : '', price, pair_line: pairPence ? `Both Saturdays together are £${(pairPence / 100).toFixed(2).replace(/\.00$/, '')}.` : '',
        link: `${SITE}/handstand-class#book` });
      if (T.off) { done.held = (done.held || 0) + 1; continue; }
      const went = await email(e, T.subject, mail({ title: T.title, greeting: String(p.name || '').split(' ')[0], paras: T.paras,
        kicker: 'In person, London', image: { src: 'https://pub-a41021d2de574a8ab55c29a1e5d7dd88.r2.dev/website-photo/latest-workshop-group-handstand-picture.jpg', alt: 'The last class at OverGravity, everyone upside down' },
        box: { title: 'What you get', items: [
          'Ninety minutes with two coaches, Elliott and Suryava, in a small group.',
          'Grouped by level: never been upside down, learning freestanding, or working on press, one arm or handstand push ups.',
          `${w.place || 'OverGravity, Shadwell'}: a proper gymnastics space, with wall and soft mats.`,
          `${price} a place.${pairPence ? ' Both Saturdays together, £' + (pairPence / 100).toFixed(2).replace(/\.00$/, '') + '.' : ''}`] },
        cta: { href: `${SITE}/handstand-class#book`, label: 'Book your place, ' + price },
        signoff: { name: 'Elliott, London Handstand Academy' }, footnote: T.footnote || undefined }));
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
  done.sessions = { reminded: 0, followed: 0 };
  const row = await supa.row('settings', 'key=eq.sessions&select=value').catch(() => null);
  const list = (row && row.value) || [];
  const now = Date.now();
  for (const x of list) {
    /* done, not only arranged: marking a session done the moment it finished
       was cancelling the follow-up, which is the only place the offer of the
       fee against the first month is ever made. Cancelled ones are out. */
    if (!x || !x.when || !['arranged', 'done'].includes(x.status)) continue;
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
        let went = false;
        if (Number(x.ask) > 0) {
          /* not paid yet, so not confirmed: "see you tomorrow" said nothing
             about the payment that confirms it */
          const amt = '£' + (Number(x.ask) / 100).toFixed(Number(x.ask) % 100 ? 2 : 0);
          went = await email(x.email, `Tomorrow: your session, pay to confirm it`, mail({ title: 'Your session is tomorrow.', greeting: first,
            paras: [`<b>${esc(whenTxt)}</b>${x.place ? ', at ' + esc(x.place) : ''}. ${esc(x.kind)} minutes.`,
                    `It is not paid for yet, so it is not confirmed. Paying ${amt} confirms it.`],
            cta: { href: `${SITE}/api/app/session/pay?id=${enc(x.id)}`, label: `Pay ${amt}` },
            signoff: { name: 'Elliott, London Handstand Academy' } }), undefined, { receipt: true });
        } else {
          const T = await emailCopy('sessRemind', { name: esc(first), when: esc(whenTxt), place: x.place ? ', at ' + esc(x.place) : '', kind: esc(x.kind) });
          if (T.off) { done.held = (done.held || 0) + 1; continue; }
          went = await email(x.email, T.subject, mail({ title: T.title, greeting: first,
            paras: T.paras,
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
        const paid = x.paid ? '£' + (x.paid / 100).toFixed(2).replace(/\.00$/, '') : 'the session fee';
        const T = await emailCopy('sessThanks', { name: esc(String(x.name || '').split(' ')[0]), paid: esc(paid) });
        if (T.off) { done.held = (done.held || 0) + 1; continue; }
        await email(x.email, T.subject, mail({ title: T.title, greeting: String(x.name || '').split(' ')[0],
          paras: T.paras,
          cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
          signoff: { name: 'Elliott, London Handstand Academy' }, footnote: T.footnote || undefined }));
        await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
        done.sessions.followed++;
      }
    }
  }
}

export const config = { schedule: '0 9 * * *' };
