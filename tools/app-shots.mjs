/* The five app screens on the home page (assets/app/*.webp), remade from the
 * current build. Serve the repo on localhost:8862 (the lha-early preview), then:
 *   node tools/app-shots.mjs <empty folder> [ladder,choose,player,explainers,formcheck]
 * and convert each PNG to WebP into assets/app/ (PIL, quality 82), then bump
 * the ?v= on the five images in index.html. 22 Oct 2026. */
// Headless Chrome over the DevTools protocol: the app at 375 x 673 CSS px,
// device scale 1.6, so every capture is 600 x 1077 like the 18 Oct set.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const OUT = process.argv[2], BASE = 'http://localhost:8862/lha-app.html';
const only = (process.argv[3] || '').split(',').filter(Boolean);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const prof = OUT + '/profile'; fs.rmSync(prof, { recursive: true, force: true });
const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9333', '--user-data-dir=' + prof, '--no-first-run',
  '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws = null;
for (let i = 0; i < 50 && !ws; i++) { await sleep(200);
  try { const l = await (await fetch('http://127.0.0.1:9333/json/list')).json(); const p = l.find(x => x.type === 'page'); if (p) ws = p.webSocketDebuggerUrl; } catch {} }
const sock = new WebSocket(ws); await new Promise(r => sock.onopen = r);
let id = 0; const wait = {};
sock.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait[d.id]) { wait[d.id](d); delete wait[d.id]; } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; wait[i] = r; sock.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result && r.result.result && r.result.result.value; };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 673, deviceScaleFactor: 1.6, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
const load = async (url) => { await send('Page.navigate', { url }); await sleep(3500); };

// ── the state, once: through the real first run, then a few weeks of use ──
await load(BASE);
await ev(`localStorage.clear(); 'ok'`); await load(BASE);
await ev(`(async()=>{ if(typeof skipIntake==='function') skipIntake(); await new Promise(r=>setTimeout(r,1500));
  const D=864e5, now=Date.now();
  st.client='Elliott'; st.mode='free'; st.quizDone=true; st.oriented=true; st.quizSkip=false; st.tab='home';
  st.intake=Object.assign({}, st.intake||{}, {level:0, goal:'learn', placedBy:'quiz'});
  st.track=st.track||{}; st.track.checkpoints=Object.assign({}, st.track.checkpoints||{}, {
    'kickup-rate':[{v:8, at:now-18*D}], 'crow':[{v:12, at:now-25*D}] });
  st.prog=st.prog||{}; const ss=[];
  for(let w=5; w>=0; w--) for(const d of [1,3]) { const at=now-(w*7+d)*D; if(at<now-3600e3) ss.push({at, done:true, kind:'all', mins:30, mode:'follow'}); }
  st.prog.sessions=ss;
  const seen={v:TOUR_V}; Object.keys(TOURS).forEach(k=>seen[k]=1); st.tourSeen=seen;
  st.firstOpen=st.firstOpen||now-45*D; st.ov=null; save(); return 'seeded'; })()`);
const SEED = await ev(`localStorage.getItem('lha_app')`);
fs.writeFileSync(OUT + '/seed.json', SEED);

const shot = async (name, setup, settle = 2200) => {
  if (only.length && !only.includes(name)) return;
  await load(BASE); await ev(`localStorage.setItem('lha_app', ${JSON.stringify(SEED)}); 'ok'`); await load(BASE);
  if (setup) console.log(name, await ev(setup));
  await sleep(settle);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('saved', name);
};
const click = t => `(()=>{ const el=[...document.querySelectorAll('button,a,[onclick]')].find(e=>e.offsetParent!==null && e.textContent.replace(/\\s+/g,' ').trim().startsWith(${JSON.stringify(t)})); if(!el) return 'no '+${JSON.stringify(t)}; el.click(); return 'clicked'; })()`;

await shot('ladder', `(async()=>{ go('home'); await new Promise(r=>setTimeout(r,900)); return ${click('Check points')}; })()`);
await shot('choose', `(async()=>{ go('home'); await new Promise(r=>setTimeout(r,800)); openOv('mode'); return st.ov; })()`);
await shot('player', `(async()=>{ go('home'); await new Promise(r=>setTimeout(r,800)); openOv('mode'); await new Promise(r=>setTimeout(r,1200));
  const r=${click('Go')}; await new Promise(r=>setTimeout(r,2500));
  for(let i=0;i<4;i++){ try{ advance(); }catch(e){} await new Promise(r=>setTimeout(r,900)); }
  const v=document.querySelector('#player video'); if(v){ try{ await v.play(); }catch(e){} }
  await new Promise(r=>setTimeout(r,5000)); return r+' '+(v?v.readyState:'novideo'); })()`, 1500);
await shot('explainers', `(async()=>{ go('home'); await new Promise(r=>setTimeout(r,1200));
  const c=[...document.querySelectorAll('#app *')].filter(e=>/^Learn at/.test(e.textContent.trim())).sort((a,b)=>a.textContent.length-b.textContent.length)[0];
  const nn=${click('Not now')}; await new Promise(r=>setTimeout(r,900));
  const c2=[...document.querySelectorAll('#app *')].filter(e=>/^Learn at/.test(e.textContent.trim())).sort((a,b)=>a.textContent.length-b.textContent.length)[0]||c;
  if(!c2) return 'no learn';
  let sc=c2.parentElement; while(sc && !(sc.scrollHeight>sc.clientHeight+10 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc=sc.parentElement;
  const box=sc||document.scrollingElement; const y=c2.getBoundingClientRect().top-(sc?sc.getBoundingClientRect().top:0)+box.scrollTop-150; box.scrollTop=y;
  await new Promise(r=>setTimeout(r,600)); return nn+' scrolled '+Math.round(y)+' in '+(sc?sc.className:'page'); })()`);
await shot('formcheck', `(async()=>{ st.coTab='check'; save(); go('coaching'); await new Promise(r=>setTimeout(r,1200)); return st.tab+' '+st.coTab; })()`);
sock.close(); ch.kill(); console.log('done');
