/* ══════════════════════════════════════════════════════════════
   London Handstand Academy: notifications to a phone

   Shared by the app function and the daily job. A person turns
   notifications on in the app, the phone hands over a subscription,
   and it is kept against their account under settings `push:{email}`
   with the weekdays they plan to train. Nothing here decides whether
   somebody should be told: the caller does that, with the same checks
   an email goes through, so the mail guard that keeps real clients
   quiet until it is switched on keeps them quiet here too.

   Keys live in Netlify, never in this public repo:
     VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
   ══════════════════════════════════════════════════════════════ */
import webpush from 'web-push';
import * as supa from './supa.mjs';

const enc = encodeURIComponent;
const norm = e => String(e || '').trim().toLowerCase();

export const pushReady = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let keysSet = false;
function keys() {
  if (keysSet) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:info@londonhandstandacademy.com',
    process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  keysSet = true;
}

/* `push` is a client's phones. `pushcoach` is a coach's own phones and
   computers, kept apart so a coach who also trains in the app is not
   sent their clients' news on the client side, or the other way round. */
const keyOf = (e, ns) => (ns || 'push') + ':' + norm(e);

/* the phones this person has allowed, and the days they train */
export async function pushSubs(e, ns) {
  const r = await supa.row('settings', `key=eq.${enc(keyOf(e, ns))}&select=value`).catch(() => null);
  const v = (r && r.value) || {};
  return Object.assign({}, v, { subs: Array.isArray(v.subs) ? v.subs : [] });
}
export async function pushSave(e, rec, ns) {
  await supa.upsert('settings', { key: keyOf(e, ns), value: rec, updated_at: new Date().toISOString() }, 'key');
}

/* Every phone they allowed. A phone that has turned notifications off, or
   been reset, answers 404 or 410, and is dropped so it is not tried again. */
export async function pushSend(e, payload, ns) {
  if (!pushReady()) return { sent: 0, why: 'the notification keys are not set in Netlify' };
  const rec = await pushSubs(e, ns);
  if (!rec.subs.length) return { sent: 0, none: true, why: 'no phone has notifications on' };
  keys();
  const body = JSON.stringify(payload || {});
  let sent = 0, lastErr = '';
  const gone = [];
  await Promise.all(rec.subs.map(async s => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, { TTL: 86400 });
      sent++;
    } catch (err) {
      const code = err && err.statusCode;
      if (code === 404 || code === 410) gone.push(s.endpoint);
      else lastErr = 'the push service said ' + String(code || (err && err.message) || err).slice(0, 80);
    }
  }));
  if (gone.length) {
    rec.subs = rec.subs.filter(s => !gone.includes(s.endpoint));
    await pushSave(e, rec, ns).catch(() => {});
  }
  return { sent, why: sent ? '' : (lastErr || 'the phone has turned notifications off') };
}
