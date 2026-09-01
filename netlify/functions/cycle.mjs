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

async function email(to, subject, html) {
  if (!process.env.RESEND_API_KEY || !to) return false;
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
          }));
        if (ok) {
          await supa.upsert('nudges',
            { key, stage, sent_at: new Date().toISOString() }, 'key');
          done.reminded.push(c.email);
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

  return new Response(JSON.stringify(done), {
    headers: { 'Content-Type': 'application/json' } });
};

/* 9am UTC daily — early enough that a reminder lands before training,
   late enough that it is not a 3am push */
export const config = { schedule: '0 9 * * *' };
