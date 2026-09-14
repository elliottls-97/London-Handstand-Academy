#!/usr/bin/env node
/* Dump every table to timestamped JSON. There were no data backups at all,
   and the two rows that matter most, progress and settings, hold every
   session, check point, photo and habit anyone has ever logged.

   Run it with the credentials in the environment, never on the command
   line, so the key does not land in shell history:

     export SUPABASE_URL=...
     export SUPABASE_SERVICE_KEY=...
     node tools/backup.mjs [outputDir]

   The service key can read and write everything, so keep the dump off
   the repo. It writes outside it by default, and .gitignore names the
   folder in case anyone points it inside. */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const URL_ = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_KEY || '';
if (!URL_ || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.');
  process.exit(1);
}

/* every table in supabase/schema.sql. codes and rate_limits are transient
   and are dumped anyway: a backup that decides what matters is a backup
   that leaves out the thing you needed. */
const TABLES = ['accounts', 'messages', 'progress', 'coach_notes', 'cycles',
  'submissions', 'free_checks', 'applications', 'codes', 'rate_limits',
  'nudges', 'settings'];

const PAGE = 1000;

async function pull(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const r = await fetch(`${URL_}/rest/v1/${table}?select=*`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`,
                 Range: `${from}-${from + PAGE - 1}` },
    });
    if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
    const page = await r.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dir = join(process.argv[2] || join(process.env.HOME, 'lha-backups'), stamp);
await mkdir(dir, { recursive: true });

let total = 0;
for (const t of TABLES) {
  try {
    const rows = await pull(t);
    await writeFile(join(dir, `${t}.json`), JSON.stringify(rows, null, 1));
    total += rows.length;
    console.log(`${String(rows.length).padStart(6)}  ${t}`);
  } catch (e) {
    /* one missing table must not cost you the other eleven */
    console.error(`  FAILED  ${t}: ${e.message}`);
  }
}
console.log(`\n${total} rows to ${dir}`);
