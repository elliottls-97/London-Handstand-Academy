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
   The iPhone app from the App Store hears through Apple instead, with a
   token per phone kept beside the web subscriptions (`apns`):
     APNS_KEY (the .p8 file's text), APNS_KEY_ID, APNS_TEAM_ID,
     APNS_TOPIC (the app's bundle id), APNS_ENV (production or sandbox)
   ══════════════════════════════════════════════════════════════ */
import webpush from 'web-push';
import crypto from 'node:crypto';
import http2 from 'node:http2';
import * as supa from './supa.mjs';

const enc = encodeURIComponent;
const norm = e => String(e || '').trim().toLowerCase();

export const webReady = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export const apnsReady = () => !!(process.env.APNS_KEY && process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID);
export const pushReady = () => webReady() || apnsReady();

/* ── Apple ─────────────────────────────────────────────────────────
   A token signed with the .p8 key, good for an hour and kept for fifty
   minutes, and one HTTP/2 request per phone. A token Apple says is gone
   (410, or BadDeviceToken) is dropped like a dead web subscription. */
let apnsJwt = { t: '', at: 0 };
/* The .p8 as a proper PEM, whatever the Netlify box did to it: pasted on
   one line, with \n written out, in quotes or with the header lines lost,
   the base64 is pulled out and wrapped again at 64 characters. */
function apnsPem() {
  const raw = String(process.env.APNS_KEY || '').replace(/\\n/g, '\n');
  const b64 = raw.replace(/-----[^-]*-----/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
  return '-----BEGIN PRIVATE KEY-----\n' + (b64.match(/.{1,64}/g) || []).join('\n') + '\n-----END PRIVATE KEY-----\n';
}
function apnsToken() {
  if (apnsJwt.t && Date.now() - apnsJwt.at < 50 * 60000) return apnsJwt.t;
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64({ alg: 'ES256', kid: String(process.env.APNS_KEY_ID || '').trim() });
  const body = b64({ iss: String(process.env.APNS_TEAM_ID || '').trim(), iat: Math.floor(Date.now() / 1000) });
  const key = apnsPem();
  const sig = crypto.sign('sha256', Buffer.from(head + '.' + body), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  apnsJwt = { t: head + '.' + body + '.' + sig, at: Date.now() };
  return apnsJwt.t;
}
const apnsHost = () => process.env.APNS_HOST
  || (process.env.APNS_ENV === 'sandbox' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com');
function apnsSendAll(tokens, payload) {
  return new Promise(resolve => {
    const res = { sent: 0, gone: [], err: '' };
    if (!tokens.length) return resolve(res);
    /* a key that cannot be read threw inside here and took the whole
       request down, so the app only ever heard "That did not send" */
    let bearer;
    try { bearer = apnsToken(); }
    catch (e) { res.err = 'the Apple key in Netlify (APNS_KEY) could not be read: ' + String(e.message || e).slice(0, 80); return resolve(res); }
    let client, finished = false;
    const finish = () => { if (finished) return; finished = true; clearTimeout(timer); try { client && client.close(); } catch {} resolve(res); };
    /* Apple not answering must not hold the request until Netlify kills it */
    const timer = setTimeout(() => { res.err = res.err || 'Apple did not answer within 8 seconds'; try { client && client.destroy(); } catch {} finish(); }, 8000);
    try { client = http2.connect(apnsHost()); } catch (e) { res.err = String(e.message || e); return finish(); }
    client.on('error', e => { res.err = 'could not reach Apple: ' + String(e.message || e).slice(0, 80); finish(); });
    const p = payload || {};
    const note = JSON.stringify(Object.assign({
      aps: Object.assign({ alert: { title: String(p.title || ''), body: String(p.body || '') } },
        p.quiet ? {} : { sound: 'default' }, p.tag ? { 'thread-id': String(p.tag) } : {}) },
      p.url ? { url: String(p.url) } : {}));
    let left = tokens.length;
    const done = () => { if (--left === 0) finish(); };
    for (const t of tokens) {
      let status = 0, text = '';
      const req = client.request({ ':method': 'POST', ':path': '/3/device/' + t,
        authorization: 'bearer ' + bearer, 'apns-topic': String(process.env.APNS_TOPIC || 'com.londonhandstandacademy.app').trim(),
        'apns-push-type': 'alert', 'apns-priority': p.quiet ? '5' : '10',
        ...(p.tag ? { 'apns-collapse-id': String(p.tag).slice(0, 64) } : {}) });
      req.setEncoding('utf8');
      req.on('response', h => { status = Number(h[':status']) || 0; });
      req.on('data', c => { text += c; });
      req.on('end', () => {
        if (status === 200) res.sent++;
        else if (status === 410 || /BadDeviceToken|Unregistered/.test(text)) res.gone.push(t);
        else res.err = 'Apple said ' + status + (text ? ' ' + text.slice(0, 80) : '');
        done();
      });
      req.on('error', e => { res.err = String(e.message || e); done(); });
      req.end(note);
    }
  });
}

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
  const apns = Array.isArray(rec.apns) ? rec.apns : [];
  if (!rec.subs.length && !apns.length) return { sent: 0, none: true, why: 'no phone has notifications on' };
  const body = JSON.stringify(payload || {});
  let sent = 0, lastErr = '';
  const gone = [];
  /* the iPhone app's phones, through Apple */
  if (apns.length && apnsReady()) {
    const a = await apnsSendAll(apns.map(x => x.token), payload);
    sent += a.sent; if (a.err) lastErr = a.err;
    if (a.gone.length) { rec.apns = apns.filter(x => !a.gone.includes(x.token)); await pushSave(e, rec, ns).catch(() => {}); }
  }
  if (rec.subs.length && webReady()) keys();
  await Promise.all((webReady() ? rec.subs : []).map(async s => {
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
