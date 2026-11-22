/* ══════════════════════════════════════════════════════════════
   London Handstand Academy: is anything broken? (23 Nov 2026)

   Once a morning, before anybody trains, this asks the app's own server
   to check every film the app can show on Cloudflare and to read what
   failed on people's phones in the last day (runHealth in app.mjs, where
   the library and the keys already live). Anything wrong reaches Elliott
   by email and on his phone. A run here does nothing else.
   ══════════════════════════════════════════════════════════════ */
export default async () => {
  const site = process.env.URL || 'https://londonhandstandacademy.com';
  try {
    const r = await fetch(`${site}/api/app/health/run`, {
      method: 'POST', headers: { 'x-health-key': process.env.SIGNING_SECRET || '', 'content-type': 'application/json' }, body: '{}' });
    const d = await r.json().catch(() => ({}));
    console.log('health', r.status, JSON.stringify({ films: d.films && { checked: d.films.checked, problems: (d.films.problems || []).length }, errs: (d.errs || []).length }));
  } catch (err) { console.error('health', String(err && err.message || err)); }
  return new Response('ok');
};

export const config = { schedule: '30 7 * * *' };
