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
async function wantsEmail(to, kind) {
  if (!kind) return true;
  try {
    const p = await supa.row('settings', `key=eq.${enc('prefs:' + norm(to))}&select=value`);
    return !p || !p.value || p.value[kind] !== false;
  } catch { return true; }
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

    /* 3 — a ladder client whose hold has not been retested in a month.
       Not a sales email: the ladder moves on the marker, and a number
       four weeks old is not telling them anything any more. */
    if (c.lead) {
      const prog = await supa.row('progress', `email=eq.${enc(c.email)}&select=*`)
        .catch(() => null);
      const holds = (prog && prog.holds) || [];
      const sessions = ((prog && prog.sessions) || []).filter(x => x && x.done);
      const lastHold = holds.length ? Math.max(...holds.map(h => h.at || 0)) : 0;
      const lastSession = sessions.length ? Math.max(...sessions.map(x => x.at || 0)) : 0;
      /* only someone still training — nudging a lapsed account to retest is
         asking the wrong question */
      const training = lastSession && (now - lastSession) < 10 * DAY;
      const stale = lastHold && (now - lastHold) > 28 * DAY;
      if (training && stale) {
        const key = `retest:${c.email}:${Math.floor(lastHold / (28 * DAY))}`;
        const sent = await supa.row('nudges', `key=eq.${enc(key)}&select=key`).catch(() => null);
        if (!sent) {
          const best = Math.max(0, ...holds.map(h => h.s || 0));
          const ok = await email(c.email, 'Worth retesting your hold',
            mail({
              title: 'Worth retesting your hold.',
              greeting: (c.name || '').split(' ')[0],
              paras: [`Your best on record is <b>${best}s</b>, and it was set over a month ago.
                You have trained since, so the number is almost certainly wrong.`,
                `The max hold timer is on the ladder. One clean attempt is all it takes,
                 and it decides when you move up.`],
              cta: { href: `${SITE}/lha-app.html`, label: 'Retest it' },
              footnote: 'If it has not moved, that is worth knowing too — it usually '
                + 'means the drills underneath need the attention, not the hold itself.',
            }), 'reminders');
          if (ok) {
            await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
            (done.retest = done.retest || []).push(c.email);
          }
        }
      }
    }
  }

  try { await quietFreeAccounts(done); } catch (e) { done.quietError = String(e && e.message || e); }
  try { await firstTenDays(done); } catch (e) { done.tipsError = String(e && e.message || e); }
  return new Response(JSON.stringify(done), {
    headers: { 'Content-Type': 'application/json' } });
};

/* 9am UTC daily — early enough that a reminder lands before training,
   late enough that it is not a 3am push */
/* ── 4: a free account gone quiet ─────────────────────────────────
   Everything above is about coaching clients. A free user who stopped on
   day four heard nothing, ever, and a reminder is the cheapest retention
   there is. Three days of silence, one note, named at their stage, never
   more than one a week, and only to someone who has actually trained: a
   nudge to retest sent to a lapsed account is spam. */
async function quietFreeAccounts(done) {
  const now = Date.now();
  const rows = (await supa.rows('accounts',
    'select=email,name,last_seen,first_seen&order=last_seen.desc&limit=500')) || [];
  const roster = new Set(parseClients().map(c => c.email));
  for (const a of rows) {
    if (!a.email || roster.has(a.email)) continue;
    const last = ms(a.last_seen), first = ms(a.first_seen);
    if (!last || !first) continue;
    const quiet = now - last;
    if (quiet < 3 * DAY || quiet > 21 * DAY) continue;
    /* somebody who opened it once and left is not a lapsed trainer */
    if (last - first < DAY) continue;
    const key = `quiet:${a.email}`;
    const sent = await supa.row('nudges', `key=eq.${enc(key)}&select=*`).catch(() => null);
    if (sent && now - ms(sent.sent_at) < 7 * DAY) continue;
    const st = await supa.row('settings', `key=eq.${enc('state:' + a.email)}&select=value`).catch(() => null);
    const stage = st && st.value && Number.isInteger(st.value.stage) ? st.value.stage : 0;
    const names = ['Foundations', 'Wall Work', 'Pushing More', 'Take-Off', 'Freestanding', 'Press'];
    const first_ = (a.name || '').split(' ')[0];
    const ok = await email(a.email, 'Your next session is ready',
      mail({ title: 'Your next session is ready.',
        greeting: first_,
        paras: [`It has been a few days. ${names[stage] || 'The ladder'} is where you left it, and the next session is built and waiting: fifteen minutes is enough.`,
                'Two sessions a week is what moves a handstand. One is what keeps it.'],
        cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
        signoff: { name: 'London Handstand Academy' },
        footnote: 'These stop the moment you turn reminders off in the app, under More.' }),
      'reminders');
    if (ok) {
      await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
      done.quiet = (done.quiet || 0) + 1;
    }
  }
}

/* ── the first ten days ────────────────────────────────────────────
   Five short notes after an account is made, on days one, two, four, seven
   and ten, then nothing but the quiet nudge above. Each is one thing about
   handstands and one thing the app does. Five in ten days is a welcome;
   one a day for ever is the thing people unsubscribe from. Drafted from the
   cue text in the app: Elliott's to rewrite, and they live only here. */
const TIPS = [
  { day: 1, subject: 'Fingers first',
    title: 'Your wrists carry the whole thing.',
    paras: ['Most handstand pain in the first month is wrists, and most of it is skipped warm-ups. Circles, then flexion and extension with the other hand helping, then weight shifts on all fours. Two minutes. The app puts these at the top of every session for a reason.',
            'On a day the rest of you is not up to it, there is a mobility day in the app: wrists and shoulders, ten minutes, no stage work. It still counts, and it is the day that keeps a habit alive.'] },
  { day: 2, subject: 'Push the floor away',
    title: 'One cue, for everything.',
    paras: ['Chest to wall, chair assisted, crow, the press: the cue underneath all of them is the same. Push the floor away. Shoulders up by the ears, arms straight, the whole body reaching upwards rather than sitting in the joints.',
            'Every film in the app has captions, so you can put the phone on the floor with the sound off and still catch the cue as it is said.'] },
  { day: 4, subject: 'Twice a week is the number',
    title: 'Two sessions a week moves a handstand. One keeps it.',
    paras: ['Nobody needs an hour. A fifteen minute session in the app is six drills at one set each, and two of those a week beats one heroic Sunday every time.',
            'Say how long you have and it builds one. It starts further down your stage each time, so Tuesday and Thursday are different workouts, not the same one again.'] },
  { day: 7, subject: 'Film yourself, from the side',
    title: 'You cannot feel a bent hip. You can see one.',
    paras: ['Phone on the floor, side on, whole body in frame. What feels straight almost never is, and thirty seconds of footage teaches more than a month of guessing.',
            'Each stage in the app has check points, the things you have to be able to do before the next stage opens. Log them as you go, and if you are being coached, send the clip with it.'] },
  { day: 10, subject: 'Falling is a skill',
    title: 'Learn to come down before you try to stay up.',
    paras: ['The fear of falling is what keeps people leaning on the wall for a year. A cartwheel out is the answer: practise it on purpose, low and slow, until it is boring. Then kicking up freestanding stops being a leap.',
            'Your Progress tab keeps a calendar of every session, what was in it and how long it took. Ten days in is a good moment to look at it.'] },
];
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
      const ok = await email(a.email, t.subject,
        mail({ title: t.title, greeting: (a.name || '').split(' ')[0] || '',
          paras: t.paras,
          cta: { href: `${SITE}/lha-app.html`, label: 'Open the app' },
          signoff: { name: 'Elliott, London Handstand Academy' },
          footnote: 'Five of these in the first ten days, then only a note if you go quiet. Reminders off in the app, under More, stops all of it.' }),
        'reminders');
      if (ok) { await supa.upsert('nudges', { key, sent_at: new Date().toISOString() }, 'key');
                done.tips = (done.tips || 0) + 1; }
      break;   /* one a day at most, whatever is owed */
    }
  }
}

export const config = { schedule: '0 9 * * *' };
