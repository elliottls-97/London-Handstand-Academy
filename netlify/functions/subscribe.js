// netlify/functions/subscribe.js
//
// Receives { email, name, source } from the LHA site/app forms and creates
// a subscription in Beehiiv. Keeps the Beehiiv API key server-side only.
//
// Required Netlify environment variables (Site configuration → Environment
// variables — "Contains secret values" should be UNCHECKED so the function
// can read them at runtime):
//   BEEHIIV_API_KEY          e.g. bpk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
//   BEEHIIV_PUBLICATION_ID   e.g. 67bfddfb-2bba-42a6-9c00-9f3d340f9b16
//                             (with or without the "pub_" prefix — handled below)

exports.handler = async function (event) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }

  const email = (payload.email || '').trim();
  const name = (payload.name || '').trim();
  const source = (payload.source || 'website').trim();

  if (!email || email.indexOf('@') < 0) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'A valid email address is required.' })
    };
  }

  const apiKey = process.env.BEEHIIV_API_KEY;
  let publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    console.error('Missing BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID env vars');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Server is not configured correctly. Please email info@londonhandstandacademy.com.' })
    };
  }

  // Beehiiv publication IDs must be prefixed with "pub_". Add it if missing.
  if (!publicationId.startsWith('pub_')) {
    publicationId = 'pub_' + publicationId;
  }

  const beehiivBody = {
    email: email,
    reactivate_existing: true,
    send_welcome_email: true,
    utm_source: 'londonhandstandacademy.com',
    utm_medium: source,
    referring_site: 'https://londonhandstandacademy.com'
  };

  if (name) {
    beehiivBody.custom_fields = [
      { name: 'First Name', value: name }
    ];
  }

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(beehiivBody)
      }
    );

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { raw: text };
    }

    if (!res.ok) {
      console.error('Beehiiv API error', res.status, data);
      const message =
        (data && data.errors && data.errors[0] && data.errors[0].message) ||
        (data && data.message) ||
        'Beehiiv could not process this subscription.';
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ error: message })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    console.error('Subscribe function error', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Something went wrong. Please try again or email info@londonhandstandacademy.com.' })
    };
  }
};
