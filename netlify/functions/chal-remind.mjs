/* ═════════════════════════════════════════════════
   London Handstand Academy: the advent challenge's evening reminder
   (25 Nov 2026)

   At 7pm London time, anybody in the challenge whose door is still shut
   today gets one notification on their phone (never an email), unless they
   turned the reminder off. The work is done by the app's own server
   (/challenge/remind/run in app.mjs), where the people and the phones are.
   ═════════════════════════════════════════════════ */
export default async () => {
  const site = process.env.URL || 'https://londonhandstandacademy.com';
  try {
    const r = await fetch(`${site}/api/app/challenge/remind/run`, {
      method: 'POST', headers: { 'x-health-key': process.env.SIGNING_SECRET || '', 'content-type': 'application/json' }, body: '{}' });
    console.log('chal-remind', r.status, JSON.stringify(await r.json().catch(() => ({}))));
  } catch (err) { console.error('chal-remind', String(err && err.message || err)); }
  return new Response('ok');
};

/* 19:00 UTC is 7pm in London all through December */
export const config = { schedule: '0 19 * * *' };
