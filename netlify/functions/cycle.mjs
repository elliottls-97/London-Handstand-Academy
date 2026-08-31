/* ══════════════════════════════════════════════════════════════
   London Handstand Academy — the coaching cycle, on a timer

   A block runs, footage and numbers come in, the coach reviews, the
   next block starts. Left to itself that loop stalls in two places:
   a client forgets to film, or a submission sits unreviewed. This
   runs once a day and nudges whichever one has gone quiet.

   It never writes to a thread and never emails twice for the same
   thing — a reminder that arrives daily stops being a reminder.
   ══════════════════════════════════════════════════════════════ */
import { getStore } from '@netlify/blobs';
import programmes from './programmes.mjs';

const DAY = 24 * 60 * 60 * 1000;
const REVIEW_HOURS = 48;
const NUDGE_AFTER = [0, 3];        // days past due — once on the day, once 3 days later

const norm = e => String(e || '').trim().toLowerCase();
const store = () => getStore('lha-app');

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

async function email(to, subject, html) {
  if (!process.env.RESEND_API_KEY || !to) return false;
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

async function subsFor(db, who) {
  let blobs = [];
  try { ({ blobs } = await db.list({ prefix: `sub:${who}:` })); } catch { return []; }
  return (await Promise.all(
    blobs.map(b => db.get(b.key, { type: 'json' }).catch(() => null)))).filter(Boolean);
}

export default async () => {
  const db = store();
  const now = Date.now();
  const done = { reminded: [], chased: [], skipped: 0 };

  for (const c of parseClients()) {
    const cycle = await db.get(`cycle:${c.email}`, { type: 'json' });
    /* no cycle means they have never opened their programme — there is
       nothing to remind them about yet */
    if (!cycle) { done.skipped++; continue; }

    const plan = programmes.clients[c.email];
    const days = (plan && Number(plan.testDelayDays)) || 14;
    const dueAt = cycle.start + days * DAY;
    const subs = await subsFor(db, c.email);
    const mine = subs.filter(s => s.cycle === cycle.n);
    const coach = c.coach || primaryCoach();

    /* 1 — footage is due and has not arrived */
    if (!mine.length && now >= dueAt) {
      const overdueDays = Math.floor((now - dueAt) / DAY);
      /* how many nudges are owed by now. Counting rather than matching the
         exact day means a missed run catches up instead of losing the
         reminder for good. */
      const stage = NUDGE_AFTER.filter(d => overdueDays >= d).length - 1;
      const sent = (await db.get(`rem:${c.email}`, { type: 'json' })) || {};
      if (stage >= 0 && !(sent.cycle === cycle.n && sent.stage >= stage)) {
        const ok = await email(c.email,
          overdueDays === 0 ? 'Time to film your test' : 'Still waiting on your clips',
          `<p style="font:16px/1.6 system-ui">Hi ${c.name}, you are ${days} days into this block —
           time to run the test drills and film them.</p>
           <p style="font:16px/1.6 system-ui">Numbers and clips go in together from the app, and
           ${coachNameOf(coach)} comes back within ${REVIEW_HOURS} hours.</p>
           <p style="font:15px/1.6 system-ui"><a href="https://londonhandstandacademy.com/lha-app.html">Open the app</a></p>
           <p style="font:13px/1.5 system-ui;color:#666">One clean attempt at each is plenty.</p>`);
        if (ok) {
          await db.setJSON(`rem:${c.email}`, { cycle: cycle.n, stage, at: now });
          done.reminded.push(c.email);
        }
      }
    }

    /* 2 — it arrived and nobody has looked at it */
    for (const s of mine) {
      if (s.status !== 'submitted') continue;
      if (now - (s.at || 0) < REVIEW_HOURS * 60 * 60 * 1000) continue;
      const key = `chase:${c.email}:${s.id}`;
      if (await db.get(key, { type: 'json' })) continue;
      const hrs = Math.round((now - s.at) / 3600000);
      const ok = await email(coach,
        `${c.name} has been waiting ${hrs} hours`,
        `<p style="font:16px/1.6 system-ui">${c.name} sent ${s.clips.length}
         clip${s.clips.length === 1 ? '' : 's'} ${hrs} hours ago and it is still unreviewed.
         The promise is ${REVIEW_HOURS} hours.</p>
         <p style="font:15px/1.6 system-ui"><a href="https://londonhandstandacademy.com/lha-coach.html">Open the coach view</a></p>`);
      if (ok) { await db.setJSON(key, { at: now }); done.chased.push(c.email); }
    }
  }

  return new Response(JSON.stringify(done), {
    headers: { 'Content-Type': 'application/json' } });
};

/* 9am UTC daily — early enough that a reminder lands before training,
   late enough that it is not a 3am push */
export const config = { schedule: '0 9 * * *' };
