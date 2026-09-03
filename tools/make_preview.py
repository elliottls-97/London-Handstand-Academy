"""Generate lha-app-preview.html — the real app, driven by fake data.

Not linked from anywhere and never deployed to main. Every network call is
stubbed, so it cannot reach a real account or show a real client's plan; the
banner says so on screen, because a preview that looks like the live app is
exactly how invented data reaches production.
"""
import pathlib, json, re

src = (pathlib.Path.home()/'lha'/'lha-app.html').read_text(encoding='utf-8')

DEMO_PLAN = {
  "client": "Demo",
  "days": [{
    "id": "1", "label": "Day 1", "sub": "Home · floor", "title": "Day 1",
    "when": "Floor and a chair. Nothing else needed.", "mins": "35",
    "groups": [
      {"name": "Warm-up", "items": [
        {"v": "wrist-circles-mob", "n": "Wrist Circles", "d": "30s each way"},
        {"v": "plank-pose", "n": "Plank Pose", "d": "2 × 20s", "nt": "Shoulders over the hands, ribs down."},
        {"v": "shoulder-circles", "n": "Shoulder Circles", "d": "10 each way"}]},
      {"name": "Crow", "items": [
        {"v": "crow-pose", "n": "Crow Pose", "d": "1 × max hold"}]},
      {"name": "Wall", "items": [
        {"v": "chest-to-wall", "n": "Chest to Wall", "d": "3 × 30s", "nt": "Ribs in, push the floor away."}]}]}],
  "read": ["This is preview data, not a real programme.",
           "Every screen below is the live app — only the content is invented."],
  "test": {"blurb": "Two weeks in, run these and send me the numbers and the clips.",
           "items": [
             {"id": "d-chair", "v": "p-l-handstand", "n": "Chair-Assisted Handstand",
              "q": "Longest hold with the shoulders stacked.", "u": "seconds"},
             {"id": "d-crow", "v": "crow-pose", "n": "Crow Pose",
              "q": "Longest clean hold.", "u": "seconds"},
             {"id": "d-wall", "v": "chest-to-wall", "n": "Chest to Wall",
              "q": "Longest hold before the ribs flare.", "u": "seconds"}]},
  "filming": ["Side on, phone vertical, whole body in frame."],
  "testDelayDays": 14,
}

# a believable four weeks: trained roughly every other day, four sessions this week
DEMO_PROG_JS = """(function(){
  const day=864e5, k=d=>new Date(Date.now()-d*day).toISOString().slice(0,10);
  const opens=[]; for(let i=0;i<28;i++) if(i%2===0&&i<25) opens.push(k(i));
  const sessions=[];
  [0,1,3,5].forEach(d=>sessions.push({day:'1',name:'Day 1',done:true,drills:9,mins:35,actual:32,got:9,of:9,at:Date.now()-d*day}));
  [8,10,12].forEach(d=>sessions.push({day:'1',name:'Day 1',done:true,drills:9,mins:35,actual:26,got:7,of:9,at:Date.now()-d*day}));
  return {opens,sessions,holds:[],flags:{},tests:[],feedback:[],bestHold:34,lastSeen:Date.now()};
})()"""

SHIM = """
<meta name="robots" content="noindex,nofollow">
<script>
/* ── PREVIEW SHIM ──────────────────────────────────────────────────
   Seeds a signed-in coached client and answers every request locally.
   Nothing here reaches the API, so no real account, plan or thread can
   appear — and nothing typed in here leaves the browser. */
(function(){
  const DEMO_PLAN = __PLAN__;
  const DEMO_PROG = __PROG__;
  /* keep the demo plan in step with the app's own shape — the preview is
     generated from lha-app.html, so it goes stale the moment a screen
     changes and nobody regenerates it */
  const DEMO_MSGS = [
    {from:'coach', text:"Sample reply. Your shoulder line is stacking better — keep the ribs down on the entry.", at:Date.now()-6*3600e3},
    {from:'client', text:"Thanks — the wall work felt easier this week.", at:Date.now()-5*3600e3}
  ];
  let mode = new URLSearchParams(location.search).get('as') || 'coached';
  try{
    localStorage.setItem('lha_app', JSON.stringify({
      token:'preview', in: mode==='coached', email:'demo@example.com',
      client:'Demo', coachName:'Elliott', mode: mode==='coached'?'coached':'free',
      quizDone:true, stage:1, tab: mode==='coached' ? 'today' : 'ladder',
      plus: mode==='plus', prog: DEMO_PROG, msgs:[], freeCheckUsed:false, tick:{}
    }));
  }catch(e){}

  const reply = (body, status) => Promise.resolve(new Response(
    JSON.stringify(body), {status: status||200, headers:{'Content-Type':'application/json'}}));

  const real = window.fetch.bind(window);
  window.fetch = function(url, opts){
    const u = String((url && url.url) || url || '');
    if(!/\\/api\\/app\\//.test(u)) return real(url, opts);
    const post = (opts && opts.method === 'POST');
    /* match the path exactly, the way the real function routes. Substring
       matching is a trap here: '/messages' contains '/me'. */
    const path = u.replace(/^.*\/api\/app/, '').split('?')[0].replace(/\/$/,'') || '/';

    if(path === '/programme') return mode==='coached'
      ? reply({client:'Demo', plan:DEMO_PLAN, cycle:{start:Date.now()-9*864e5,n:1,days:14},
               library:(window.LIBRARY||[])})
      : reply({error:'No programme yet'}, 404);
    if(path === '/me') return reply({email:'demo@example.com', name:'Demo',
      coached: mode==='coached', coach:false, plus: mode==='plus',
      coachName: mode==='coached'?'Elliott':'', canManage:false, canCancel:false,
      cancelAt:0, freeCheckUsed:false});
    if(path === '/messages') return post ? reply({ok:true})
      : reply({messages: mode==='coached' ? DEMO_MSGS : []});
    if(path === '/submissions') return reply({submissions:[]});
    if(path === '/submission'){ alert('Preview — nothing was sent.'); return reply({ok:true,id:'preview'}); }
    if(path === '/cycle') return reply({start:Date.now()-9*864e5,n:1,days:14,
      dueAt:Date.now()+5*864e5, due:false, daysLeft:5, submission:null, awaiting:false, reviewHours:48});
    /* the client route answers with the record itself; only the coach one
       wraps it in {progress}. The app does st.prog = d. */
    if(path === '/progress') return post ? reply({ok:true}) : reply(DEMO_PROG);
    if(path === '/upload' || path.startsWith('/image')){
      alert('Preview — uploads are switched off here.'); return reply({error:'Preview'},503); }
    return reply({ok:true});
  };

  addEventListener('DOMContentLoaded', function(){
    const b=document.createElement('div');
    b.textContent='PREVIEW — invented data, nothing is sent';
    b.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#c2703d;'
      +'color:#fff;font:600 10px/1 Manrope,system-ui,sans-serif;letter-spacing:.14em;'
      +'text-align:center;padding:6px;pointer-events:none';
    document.body.appendChild(b);
  });
})();
</script>
"""

shim = (SHIM.replace('__PLAN__', json.dumps(DEMO_PLAN))
            .replace('__PROG__', DEMO_PROG_JS))

# the shim must run before the app's own script boots
i = src.index('<script>')
out = src[:i] + shim + src[i:]
out = out.replace('<title>', '<title>PREVIEW · ', 1) if '<title>' in out else out

dest = pathlib.Path.home()/'lha'/'lha-app-preview.html'
dest.write_text(out, encoding='utf-8')
print('wrote', dest, len(out), 'bytes')
