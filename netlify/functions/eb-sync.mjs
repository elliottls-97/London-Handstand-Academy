/* ═════════════════════════════════════════════════
   London Handstand Academy: Eventbrite, once an hour (25 Nov 2026)

   The webhook brings each Eventbrite order in as it happens. This is the
   safety net: every class listed there has its orders read again and what
   Eventbrite may sell set again from the bookings here, which also catches
   a ClassBento hold being released and an early bird ending at its hour.
   The app's own server does the work (/eventbrite/run in app.mjs), and
   does nothing at all until EVENTBRITE_TOKEN is set.
   ═════════════════════════════════════════════════ */
export default async () => {
  const site = process.env.URL || 'https://londonhandstandacademy.com';
  try {
    const r = await fetch(`${site}/api/app/eventbrite/run`, {
      method: 'POST', headers: { 'x-health-key': process.env.SIGNING_SECRET || '', 'content-type': 'application/json' }, body: '{}' });
    console.log('eb-sync', r.status, JSON.stringify(await r.json().catch(() => ({}))));
  } catch (err) { console.error('eb-sync', String(err && err.message || err)); }
  return new Response('ok');
};

/* twenty past each hour */
export const config = { schedule: '20 * * * *' };
