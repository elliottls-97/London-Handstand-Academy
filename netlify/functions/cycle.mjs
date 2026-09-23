/* ══════════════════════════════════════════════════════════════
   London Handstand Academy — the coaching cycle, on a timer

   A block runs, footage and numbers come in, the coach reviews, the
   next block starts. Left to itself that loop stalls in two places:
   a client forgets to film, or a submission sits unreviewed. This
   runs once a day and nudges whichever one has gone quiet.

   It never writes to a thread and never emails twice for the same
   thing — a reminder that arrives daily stops being a reminder.
   ══════════════════════════════════════════════════════════════ */
import programmes from './programmes.mjs';
import * as supa from './supa.mjs';
import { renderEmail } from './emails.mjs';
import { pushReady, pushSend } from './push.mjs';
import { getStore } from '@netlify/blobs';
/* the words for an email, with whatever the dashboard has changed on top */
let EMAIL_OVER = null;
async function emailCopy(key, vars) {
  if (EMAIL_OVER === null) {
    const r = await supa.row('settings', 'key=eq.emails&select=value').catch(() => null);
    EMAIL_OVER = (r && r.value) || {};
  }
  return renderEmail(key, vars, EMAIL_OVER);
}

const DAY = 24 * 60 * 60 * 1000;
const REVIEW_HOURS = 48;
const NUDGE_AFTER = [0, 3];        // days past due — once on the day, once 3 days later

const norm = e => String(e || '').trim().toLowerCase();
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

/* same switch as app.mjs, same default: a real client is not mailed
   unless somebody has explicitly turned it back on */
async function clientMailAllowed(to) {
  const t = norm(to);
  if (!parseClients().some(c => c.email === t)) return true;
  try {
    const r = await supa.row('settings', `key=eq.mailguard&select=value`);
    return r && r.value ? !r.value.suppress : false;
  } catch { return false; }
}

/* same opt-outs the app function honours — a reminder nobody asked for
   is the fastest way to get an app's email marked as spam */
/* replies and reminders are each none, email, push or both; an answer
   saved before that was a yes or no, and reads as both or none */
const CHANNELS = ['none', 'email', 'push', 'both'];
const chanOf = (p, kind) => {
  const v = p && p[kind];
  return CHANNELS.includes(v) ? v : v === false ? 'none' : 'both';
};
async function prefsOf(to) {
  const p = await supa.row('settings', `key=eq.${enc('prefs:' + norm(to))}&select=value`);
  return (p && p.value) || {};
}
async function wantsEmail(to, kind) {
  if (!kind) return true;
  try {
    const p = await prefsOf(to);
    if (kind === 'replies' || kind === 'reminders') return ['email', 'both'].includes(chanOf(p, kind));
    return p[kind] !== false;
  } catch { return true; }
}
async function wantsPush(to, kind) {
  try { return ['push', 'both'].includes(chanOf(await prefsOf(to), kind)); } catch { return true; }
}

async function email(to, subject, html, kind) {
  if (!process.env.RESEND_API_KEY || !to) return false;
  if (!(await wantsEmail(to, kind))) return false;
  if (!mayEmail(to)) return false;
  if (!(await clientMailAllowed(to))) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'info@londonhandstandacademy.com',
        to, subject, html }),
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

export default async () => {
  const now = Date.now();
  const done = { reminded: [], chased: [], skipped: 0 };

  /* Anyone who has sent something, not only the coaching roster. A one-off
     form check comes from someone who is not a client yet — which makes it
     the worst one to let go quiet. */
  const accounts = (await supa.rows('accounts', 'select=email,name')) || [];
  const roster = parseClients();
  const known = new Set(roster.map(c => c.email));
  const everyone = roster.concat(
    accounts.filter(a => !known.has(a.email))
      .map(a => ({ email: a.email, name: a.name || a.email, coach: '', lead: true })));

  for (const c of everyone) {
    const cyc = await supa.row('cycles', `email=eq.${enc(c.email)}&select=*`)
      .catch(() => null);
    const cycle = cyc ? { n: cyc.n || 1, start: ms(cyc.started_at) } : null;
    /* no cycle means no block underway — nothing to remind them about.
       Their submissions still need chasing, so fall through to that. */
    if (!cycle && !c.lead) { done.skipped++; continue; }

    const plan = programmes.clients[c.email];
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
            footnote: 'One clean attempt at each is plenty — five scrappy ones tell us less.',
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
        const ok = await email(c.email, T.subject,
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
    if (!e || !Array.isArray(rec.subs) || !rec.subs.length) continue;
    if (!(await wantsPush(e, 'reminders')) || !mayEmail(e) || !(await clientMailAllowed(e))) continue;
    const dayKey = `pushtrain:${e}:${today}`;
    if (await supa.row('nudges', `key=eq.${enc(dayKey)}&select=key`).catch(() => null)) continue;
    const p = await supa.row('progress', `email=eq.${enc(e)}&select=sessions`).catch(() => null);
    const sess = (p && Array.isArray(p.sessions)) ? p.sessions : [];
    const last = Math.max(0, ...sess.map(x => (x && x.at) || 0));
    if (last && new Date(last).toISOString().slice(0, 10) === today) continue;
    let payload = null;
    if (Array.isArray(rec.days) && rec.days.length) {
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
  const roster = new Set(parseClients().map(c => c.email));
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
  const roster = new Set(parseClients().map(c => c.email));
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
  const now = Date.now();
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
      .filter(p => p && p.email && p.status !== 'cancelled' && p.status !== 'refunded');
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
          const T = await emailCopy('wsRemind', { name: esc(String(p.name || '').split(' ')[0]), title: esc(w.title), when: esc(whenTxt), place: w.place ? ', at ' + esc(w.place) : '' });
          await email(p.email, T.subject,
            mail({ title: T.title, greeting: String(p.name || '').split(' ')[0],
              paras: T.paras,
              signoff: { name: 'Elliott, London Handstand Academy' }, footnote: T.footnote || undefined }));
          done.workshops.reminded++;
          await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
        }
      }
    }
    const hoursSince = (now - at) / 3600e3;
    if (hoursSince > 10 && hoursSince <= 40) {
      for (const p of book) {
        const key = `wsreview:${w.slug}:${p.email}`;
        if (!(await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null))) {
          const T = await emailCopy('wsThanks', { name: esc(String(p.name || '').split(' ')[0]), title: esc(w.title),
            review_line: w.reviewUrl ? 'A sentence about how you found it, where other people will see it. It takes a minute and it is how the next workshop fills.' : 'Reply to this with a sentence about how you found it, good or bad. I read every one.',
            app_line: w.appDays ? `The app is open for you for ${w.appDays} days from your booking, so the drills from today are in there to keep going with.` : 'The drills from today are in the Handstand Ladder app, and Foundations is free.' });
          await email(p.email, T.subject,
            mail({ title: T.title, greeting: String(p.name || '').split(' ')[0],
              paras: T.paras,
              cta: w.reviewUrl ? { href: w.reviewUrl, label: 'Leave a review' } : { href: `${SITE}/lha-app.html`, label: 'Open the app' },
              signoff: { name: 'Elliott, London Handstand Academy' }, footnote: T.footnote || undefined }));
          done.workshops.asked++;
          await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
        }
      }
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
      const key = `sessremind:${x.id}`;
      if (!(await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null))) {
        const T = await emailCopy('sessRemind', { name: esc(String(x.name || '').split(' ')[0]), when: esc(whenTxt), place: x.place ? ', at ' + esc(x.place) : '', kind: esc(x.kind) });
        await email(x.email, T.subject, mail({ title: T.title, greeting: String(x.name || '').split(' ')[0],
          paras: T.paras,
          signoff: { name: 'Elliott, London Handstand Academy' }, footnote: T.footnote || undefined }));
        await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
        done.sessions.reminded++;
      }
    }
    if (hoursSince > 10 && hoursSince <= 40) {
      const key = `sessfollow:${x.id}`;
      if (!(await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null))) {
        const paid = x.paid ? '£' + (x.paid / 100).toFixed(2).replace(/\.00$/, '') : 'the session fee';
        const T = await emailCopy('sessThanks', { name: esc(String(x.name || '').split(' ')[0]), paid: esc(paid) });
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
