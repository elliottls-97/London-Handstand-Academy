/* Tell Bing, Yandex, Naver and Seznam every page in the sitemap, by IndexNow.
   Run after a push: node tools/indexnow.mjs. The key is the <key>.txt file at
   the site root; the engines fetch it to check the submission is ours.
   Google does not take IndexNow; Search Console is the way in there. */
import { readFileSync, readdirSync } from 'node:fs';
const SITE = 'https://londonhandstandacademy.com';
const key = readdirSync('.').find(f => /^[0-9a-f]{32}\.txt$/.test(f));
if (!key) { console.error('No IndexNow key file at the repo root'); process.exit(1); }
const urls = [...readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim()).concat(process.argv.slice(2));
const live = await fetch(`${SITE}/${key}`).then(r => r.ok ? r.text() : '').catch(() => '');
if (live.trim() !== key.replace('.txt', '')) { console.error(`${SITE}/${key} is not live yet, or does not hold the key. Push first.`); process.exit(1); }
const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: 'londonhandstandacademy.com', key: key.replace('.txt', ''), keyLocation: `${SITE}/${key}`, urlList: urls }) });
console.log(r.status, r.status === 200 || r.status === 202 ? `accepted ${urls.length} URLs` : await r.text());
