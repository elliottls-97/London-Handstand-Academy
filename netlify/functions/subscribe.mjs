// netlify/functions/subscribe.mjs
//
// Receives { email, name, source } from the site's newsletter forms and
// creates a subscription in Beehiiv, keeping the Beehiiv key server side.
//
// Netlify environment variables:
//   BEEHIIV_API_KEY          e.g. bpk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
//   BEEHIIV_PUBLICATION_ID   with or without the "pub_" prefix
//
// 13 Oct 2026: it answered any site, any number of times, and re-subscribed
// people who had unsubscribed. Now a post from another site's page is
// refused, Netlify limits it per visitor, and somebody who left the list is
// not put back on it by an address typed into a form. The site's forms post
// from the same origin, so no CORS headers are sent.

const SITE = 'https://londonhandstandacademy.com';
const json = (status, data) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  const origin = req.headers.get('origin') || '';
  /* the site itself, and a local copy being worked on */
  const ours = origin === SITE || origin === 'https://www.londonhandstandacademy.com' || /^http:\/\/localhost(:\d+)?$/.test(origin);
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  /* another site's page posting plain text needs no browser permission,
     so the origin is checked here */
  if (origin && !ours) return json(403, { error: 'Not from this site' });

  let payload;
  try { payload = await req.json(); } catch { return json(400, { error: 'Invalid request body' }); }
  const email = String(payload.email || '').trim().slice(0, 200);
  const name = String(payload.name || '').trim().slice(0, 80);
  const source = String(payload.source || 'website').trim().slice(0, 40);
  if (!/^[^@\s"<>]+@[^@\s"<>]+\.[^@\s"<>]+$/.test(email)) return json(400, { error: 'A valid email address is required.' });

  const apiKey = process.env.BEEHIIV_API_KEY;
  let publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  if (!apiKey || !publicationId) {
    console.error('Missing BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID env vars');
    return json(500, { error: 'Server is not configured correctly. Please email info@londonhandstandacademy.com.' });
  }
  if (!publicationId.startsWith('pub_')) publicationId = 'pub_' + publicationId;

  const beehiivBody = {
    email,
    /* not reactivate_existing: Beehiiv keeps that for somebody knowingly
       coming back, and this form takes any address anybody types */
    send_welcome_email: true,
    utm_source: 'londonhandstandacademy.com',
    utm_medium: source,
    referring_site: SITE,
    ...(name ? { custom_fields: [{ name: 'First Name', value: name }] } : {}),
  };
  try {
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(beehiivBody), signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) {
      console.error('Beehiiv API error', res.status, data);
      const message = (data && data.errors && data.errors[0] && data.errors[0].message) || (data && data.message) || 'Beehiiv could not process this subscription.';
      return json(502, { error: message });
    }
    return json(200, { ok: true });
  } catch (err) {
    console.error('Subscribe function error', err);
    return json(500, { error: 'Something went wrong. Please try again or email info@londonhandstandacademy.com.' });
  }
};

/* served at its usual address, /.netlify/functions/subscribe, and held to a
   few tries a minute per visitor by Netlify, as /api/app is */
export const config = {
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
