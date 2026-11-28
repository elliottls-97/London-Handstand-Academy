/* ═════════════════════════════════════════════════
   London Handstand Academy: the fortnight's check point test
   (28 Nov 2026)

   Saturday afternoon, one notification to anybody on the free ladder who
   has not logged a check point for a fortnight. The work is done by the
   app's own server (/cptest/run in app.mjs), where the people and the
   phones are, and it keeps its own fortnight per person.
   ═════════════════════════════════════════════════ */
export default async () => {
  const site = process.env.URL || 'https://londonhandstandacademy.com';
  try {
    const r = await fetch(`${site}/api/app/cptest/run`, {
      method: 'POST', headers: { 'x-health-key': process.env.SIGNING_SECRET || '', 'content-type': 'application/json' }, body: '{}' });
    console.log('cptest', r.status, JSON.stringify(await r.json().catch(() => ({}))));
  } catch (err) { console.error('cptest', String(err && err.message || err)); }
  return new Response('ok');
};

/* Saturday, 16:00 UTC: 4pm in London in winter, 5pm in summer */
export const config = { schedule: '0 16 * * 6' };
