/* ══════════════════════════════════════════════════════════════
   Supabase, over plain fetch

   No SDK, for the same reason there is no Stripe SDK here: a few
   HTTP calls are less to install and less to go wrong inside a
   serverless function. This talks to PostgREST, which is what the
   Data API is.

   The service role key bypasses RLS, so it must never leave the
   server. It lives in Netlify env vars — never in this repo, which
   is public.
   ══════════════════════════════════════════════════════════════ */

const base = () => (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const key  = () => process.env.SUPABASE_SERVICE_KEY || '';

/* Whether the app has been given a database at all. Lets routes fall
   back to Blobs during the migration rather than erroring. */
export const configured = () => !!(base() && key());

async function rest(path, { method = 'GET', body, prefer } = {}) {
  if (!configured()) throw new Error('Supabase is not configured');
  const res = await fetch(`${base()}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key(),
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  if (!res.ok) {
    /* PostgREST puts a real explanation in the body — carry it, because
       "supabase 400" on its own tells nobody anything */
    throw new Error(`Supabase ${res.status} on ${method} ${path}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : null;
}

/* ── the handful of shapes the app actually needs ── */

export const rows = (table, query = '') => rest(`${table}${query ? '?' + query : ''}`);

export async function row(table, query) {
  const r = await rows(table, query + '&limit=1');
  return (r && r[0]) || null;
}

export const insert = (table, body) =>
  rest(table, { method: 'POST', body, prefer: 'return=representation' });

/* upsert: the pattern that replaces read-modify-write. One statement, so
   two of them racing cannot lose each other's work the way two Blobs
   writes could. */
export const upsert = (table, body, onConflict) =>
  rest(`${table}?on_conflict=${onConflict}`, {
    method: 'POST', body,
    prefer: 'resolution=merge-duplicates,return=representation',
  });

/* insert that quietly does nothing if the row already exists — used for
   the one-free-form-check limit, where the primary key IS the limit */
export async function insertIfAbsent(table, body, onConflict) {
  const r = await rest(`${table}?on_conflict=${onConflict}`, {
    method: 'POST', body,
    prefer: 'resolution=ignore-duplicates,return=representation',
  });
  return Array.isArray(r) && r.length > 0;      // true = we created it
}

export const update = (table, query, body) =>
  rest(`${table}?${query}`, { method: 'PATCH', body, prefer: 'return=representation' });

/* returns the rows it deleted, so a caller can tell "removed nothing"
   apart from "removed something" — a delete that quietly matched no rows
   looks identical to success otherwise */
export const remove = (table, query) =>
  rest(`${table}?${query}`, { method: 'DELETE', prefer: 'return=representation' });

export const count = async (table, query = '') => {
  const r = await rows(table, `select=email${query ? '&' + query : ''}`);
  return Array.isArray(r) ? r.length : 0;
};

/* Name the wrong key rather than letting it fail as a permission error
   forty minutes later. A legacy key is a JWT whose payload names the
   role; a new-style one says what it is in the prefix. */
function keyLooksRight() {
  const k = key();
  if (!k) return 'missing';
  if (k.startsWith('sb_publishable_')) return 'WRONG KEY — that is the publishable key, not the service_role secret';
  if (k.startsWith('sb_secret_')) return 'service key present';
  if (k.startsWith('eyJ')) {
    try {
      const claim = JSON.parse(Buffer.from(k.split('.')[1], 'base64').toString()).role;
      if (claim === 'service_role') return 'service key present';
      return `WRONG KEY — this one is the "${claim}" role, not service_role`;
    } catch { return 'key present, could not read its role'; }
  }
  return 'key present, unrecognised format';
}

/* ── is it actually reachable ──────────────────────────────────── */
export async function ping() {
  if (!configured()) {
    return { ok: false, why: !base() ? 'SUPABASE_URL is not set'
                                     : 'SUPABASE_SERVICE_KEY is not set' };
  }
  const tables = ['accounts', 'messages', 'progress', 'coach_notes', 'cycles',
    'submissions', 'free_checks', 'applications', 'codes', 'rate_limits',
    'nudges', 'settings'];
  const found = {};
  for (const t of tables) {
    try { await rows(t, 'select=*&limit=1'); found[t] = 'ok'; }
    catch (err) { found[t] = String(err.message || err).slice(0, 160); }
  }
  const bad = Object.entries(found).filter(([, v]) => v !== 'ok');
  return {
    ok: bad.length === 0,
    host: base().replace(/^https?:\/\//, ''),
    keyKind: keyLooksRight(),
    tables: found,
  };
}
