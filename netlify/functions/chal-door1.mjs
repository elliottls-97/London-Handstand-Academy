/* ═════════════════════════════════════════════════
   London Handstand Academy: the advent challenge's first morning
   (25 Nov 2026)

   On 1 December at 8am London time, everyone in the challenge gets one email
   saying door 1 is open, and a notification if they turned them on. The app's
   own server does the work (/challenge/door1/run in app.mjs); it only sends
   on day 1, once each, so running every morning is harmless.
   ═════════════════════════════════════════════════ */
export default async () => {
  const site = process.env.URL || 'https://londonhandstandacademy.com';
  try {
    const r = await fetch(`${site}/api/app/challenge/door1/run`, {
      method: 'POST', headers: { 'x-health-key': process.env.SIGNING_SECRET || '', 'content-type': 'application/json' }, body: '{}' });
    console.log('chal-door1', r.status, JSON.stringify(await r.json().catch(() => ({}))));
  } catch (err) { console.error('chal-door1', String(err && err.message || err)); }
  return new Response('ok');
};

/* 08:00 UTC is 8am in London all through December */
export const config = { schedule: '0 8 * * *' };
