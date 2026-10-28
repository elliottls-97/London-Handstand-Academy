"""The Learn stories: one card a screen, tapped through, one film each.
Built on the falling article's head, header, menu and footer.

    python3 tools/build-learn-story.py            every story
    python3 tools/build-learn-story.py <slug>     one of them

The muscle up story (27 Oct 2026) and the false grip (28 Oct 2026). A
story's films must also be in LEARN_FILMS in netlify/functions/app.mjs,
which is the list the page is given passes for."""
import re, os, sys, html
os.chdir(os.path.expanduser('~/lha'))
src = open('learn/fall-out-of-a-handstand-safely.html').read()
lines = src.split('\n')

STYLE = """<style>
/* the story: one card a screen. Words sit under the film, never on it,
   because the films carry their own titles and cues and a line over the
   person doing the move hides the move (Elliott, 17 Oct 2026). */
.st{position:relative;box-sizing:border-box;width:100%;max-width:560px;margin:0 auto;padding:2px 16px 18px;
  height:calc(100vh - 80px);height:min(calc(100svh - 80px),940px);min-height:540px;display:flex;flex-direction:column;gap:12px;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
html.inapp .st{height:100svh;max-height:none;padding-top:14px}
.st-bars{display:flex;gap:4px;flex:none;padding:0 2px}
.st-bars i{flex:1;height:3px;border-radius:2px;background:rgba(0,64,61,.14);overflow:hidden}
.st-bars b{display:block;height:100%;background:#006663;transform-origin:0 50%;transform:scaleX(0)}
.st-bars i.done b{transform:scaleX(1)}
.st-deck{position:relative;flex:1;min-height:0;cursor:pointer;touch-action:pan-y}
.sc{position:absolute;inset:0;display:flex;flex-direction:column;gap:16px;opacity:0;visibility:hidden;
  transition:opacity .22s ease,visibility 0s linear .22s}
.sc.on{opacity:1;visibility:visible;transition:opacity .22s ease}
.sc-m{position:relative;flex:1;min-height:0}
.sc-m video,.sc-m .ph{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);height:100%;width:auto;max-width:100%;
  aspect-ratio:9/16;box-sizing:border-box;border-radius:24px;object-fit:cover}
.sc-m video{background:#0d2b29;box-shadow:0 1px 2px rgba(0,64,61,.08),0 14px 30px rgba(0,64,61,.16)}
.sc-m .ph{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;
  background:rgba(255,255,255,.6);border:1.5px dashed rgba(0,64,61,.3)}
/* a card that is words on purpose, not a film still to come */
.sc-m .ph.solid{background:#fff;border:1px solid rgba(0,64,61,.10);box-shadow:0 1px 2px rgba(0,64,61,.05),0 8px 20px rgba(0,64,61,.06)}
/* a landscape film is shown whole, the words straight under it: the kick
   up films are side on, with the body across the frame, and a tall crop
   cut off the hands or the feet (28 Oct 2026) */
.sc.wide{justify-content:center}
.sc-m.wide{flex:none;width:100%;aspect-ratio:16/9}
.sc-m.wide video,.sc-m.wide .ph{left:0;right:0;width:100%;height:100%;transform:none;aspect-ratio:auto}
.sc-m.wide .ph-g{font-size:clamp(56px,10vh,110px)}
/* a still, at its own shape */
.sc-m img{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);height:100%;width:auto;max-width:100%;
  aspect-ratio:3/4;object-fit:cover;border-radius:24px;background:#0d2b29;box-shadow:0 1px 2px rgba(0,64,61,.08),0 14px 30px rgba(0,64,61,.16)}
@media (min-width:900px){.st.wst{max-width:820px}}
.ph-g{font:400 clamp(84px,17vh,168px)/.9 Newsreader,Georgia,serif;color:#006663;letter-spacing:-.03em}
.ph-k{font:600 11px/1 Figtree,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#006663}
.sc-t{flex:none;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 4px;text-align:center}
.sc-k{font:600 11px/1 Figtree,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#006663}
.sc-h{margin:0;font:400 34px/1.02 Newsreader,Georgia,serif;letter-spacing:-.012em;text-wrap:balance}
h1.sc-h{font-size:40px}
.sc-h em{font-style:normal;color:#006663}
.sc-p{margin:0;font-size:16px;line-height:1.45;color:#111;max-width:36ch;text-wrap:pretty}
.sc-d{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:2px}
.sc-d span{height:30px;padding:0 12px;border-radius:999px;background:rgba(0,64,61,.08);color:#00403D;
  font:600 13px/30px Figtree,system-ui,sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap}
.sc-go{display:inline-flex;align-items:center;gap:6px;font:600 13px/1 Figtree,system-ui,sans-serif;color:#5A5A5A;margin-top:2px}
.sc-end .ph{border:1px solid rgba(0,64,61,.10);border-style:solid;background:#fff;gap:12px;padding:28px 22px;
  box-shadow:0 1px 2px rgba(0,64,61,.05),0 8px 20px rgba(0,64,61,.06);cursor:default}
.sc-end .btn,.sc-end .btn2{width:100%;box-sizing:border-box;justify-content:center;height:56px;text-decoration:none}
.sc-end .btn{margin-top:10px}
.sc-again{background:none;border:0;padding:10px;font:600 14px/1 Figtree,system-ui,sans-serif;color:#006663;cursor:pointer}
/* opened in the app: the end card leaves nobody on a website */
html.inapp .sc-site,html:not(.inapp) .sc-app{display:none!important}
.sc-safe{margin:0;font-size:13.5px;line-height:1.4;color:#5A5A5A;max-width:30ch}
.st-nav{position:absolute;top:50%;margin-top:-23px;border:0;cursor:pointer;z-index:2;display:none}
.st-nav svg{stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round}
.st-nav.prev{left:-58px}.st-nav.next{right:-58px}
.st-nav[disabled]{opacity:.35;cursor:default}
@media (min-width:700px){.st-nav{display:inline-flex}}
@media (max-width:560px){.st{height:calc(100vh - 72px);height:calc(100svh - 72px)}
  .sc-h{font-size:30px} h1.sc-h{font-size:34px}}
@media (max-height:700px){.sc-h{font-size:27px} h1.sc-h{font-size:30px} .sc-p{font-size:15px} .sc{gap:12px}}
@media (prefers-reduced-motion:reduce){.sc,.sc.on{transition:none}}
</style>
<noscript><style>.st{height:auto}.st-deck{cursor:auto}.sc{position:static;opacity:1;visibility:visible;margin-bottom:40px}
.sc-m{height:70vh;flex:none}.st-bars,.st-nav,.sc-go,.sc-again{display:none}</style></noscript>"""

SCRIPT = """<script>
/* the story: tap the right of a card for the next, the left to go back,
   swipe either way, hold to pause the film. The arrows do it on a laptop,
   and so do the arrow keys. Only the card on screen plays; the next one is
   loaded behind it. */
(function(){
  var root=document.getElementById('story'); if(!root) return;
  var deck=root.querySelector('.st-deck'), cards=[].slice.call(root.querySelectorAll('.sc')),
      bars=[].slice.call(root.querySelectorAll('.st-bars i')), prev=root.querySelector('.prev'), next=root.querySelector('.next');
  var S='https://customer-pns1oongdltmkjwa.cloudflarestream.com/', tk={}, cur=0;
  /* how far people get: one anonymous count a visit, the furthest card
     reached, sent when they reach the end or leave. No cookie, nothing
     about the person, the same route as the site's other counts. */
  var far=0, sent=false;
  var count=function(){ if(sent || !far) return; sent=true;
    try{ var b=JSON.stringify({n:'story', f:'__SLUG__', s:far, e:far>=cards.length?1:0});
      if(navigator.sendBeacon) navigator.sendBeacon('/api/app/event', new Blob([b],{type:'application/json'}));
      else fetch('/api/app/event',{method:'POST',headers:{'Content-Type':'application/json'},body:b,keepalive:true}).catch(function(){});
    }catch(e){} };
  addEventListener('pagehide', count);
  document.addEventListener('visibilitychange', function(){ if(document.hidden) count(); });
  var vid=function(i){ return cards[i] ? cards[i].querySelector('video[data-uid]') : null; };
  /* the card on screen loads in full, the ones either side only their
     first frame, and with Data saver nothing ahead at all (films.js). A
     film saved on this phone plays from there and needs no pass, so a
     saved story works with no signal. */
  var F=window.LHAF || null;
  var load=function(i){ var v=vid(i); if(!v || v.dataset.on) return;
    var u=v.dataset.uid, t=tk[u];
    (F ? F.saved() : Promise.resolve({})).then(function(has){
      if(v.dataset.on || (!t && !has[u])) return;
      v.dataset.on='1'; v.dataset.seg=t||u;
      v.poster = t ? S+t+'/thumbnails/thumbnail.jpg?time='+(v.dataset.poster||'3')+'s&height=900'
        : S+u+'/thumbnails/thumbnail.jpg?lha=saved';
      v.preload = i===cur ? 'auto' : (F && F.mode()==='saver') ? 'none' : 'metadata';
      if(F) F.time(v);
      v.src = F ? F.pick(u, t||u, has) : S+(t||u)+'/downloads/default.mp4';
      if(i===cur) play(v);
    }); };
  var play=function(v){ if(!v || !v.src) return; var p=v.play(); if(p&&p.catch) p.catch(function(){}); };
  /* a film with data-to loops just its stretch, from data-from, of a longer take */
  var from=function(v){ return v ? +(v.dataset.from||0) : 0; };
  cards.forEach(function(c,i){ var v=vid(i); if(!v || !v.dataset.to) return;
    var z=+v.dataset.to;
    v.addEventListener('loadedmetadata',function(){ if(v.currentTime<from(v)) v.currentTime=from(v); });
    v.addEventListener('timeupdate',function(){ if(v.currentTime>=z || v.currentTime<from(v)-0.5) v.currentTime=from(v); }); });
  var go=function(n, keep){
    n=Math.max(0, Math.min(cards.length-1, n));
    cards.forEach(function(c,i){ c.classList.toggle('on', i===n); c.setAttribute('aria-hidden', i===n?'false':'true');
      var v=vid(i); if(v && i!==n){ v.pause(); } });
    bars.forEach(function(b,i){ b.classList.toggle('done', i<n); b.firstChild.style.transform=i<n?'scaleX(1)':'scaleX(0)'; });
    cur=n; far=Math.max(far, n+1); if(far>=cards.length) count(); load(n); load(n+1); load(n-1);
    var v=vid(n); if(v){ v.preload='auto'; v.dataset.vis='1'; try{ v.currentTime=from(v); }catch(e){} play(v); }
    cards.forEach(function(c,i){ var w=vid(i); if(w && i!==n) w.dataset.vis='0'; });
    prev.disabled=n===0; next.disabled=n===cards.length-1;
    if(!keep && history.replaceState) history.replaceState(null,'', n? '#s'+(n+1) : location.pathname+location.search);
  };
  /* the bar for the card on screen runs with its film, round again each loop */
  /* every card's words take the room of the longest, so the film is the
     same size on every card and the frame does not jump as you tap */
  /* landscape cards are matched among themselves, so a long cover line does
     not leave the film cards with a gap under them */
  var fit=function(){ ['.sc:not(.wide) .sc-t','.sc.wide .sc-t'].forEach(function(q){
    var ts=[].slice.call(root.querySelectorAll(q)), h=0;
    ts.forEach(function(t){ t.style.minHeight=''; }); ts.forEach(function(t){ h=Math.max(h, t.offsetHeight); });
    ts.forEach(function(t){ t.style.minHeight=h+'px'; }); }); };
  fit(); if(document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  addEventListener('resize', fit);
  (function tick(){ var b=bars[cur] && bars[cur].firstChild, v=vid(cur);
    var a=from(v), z=v ? (+(v.dataset.to||0) || v.duration || 0) : 0;
    if(b) b.style.transform='scaleX('+(v ? (z>a ? Math.max(0, Math.min(1, (v.currentTime-a)/(z-a))) : 0) : 1)+')';
    requestAnimationFrame(tick); })();
  var x0=0, y0=0, t0=0, held=0, pressed=false;
  deck.addEventListener('pointerdown',function(e){
    if(e.target.closest('a,button')) return;
    /* a tap that shuts the site menu is only that, not the next card */
    var mn=document.getElementById('siteMenu'); if(mn && !mn.hidden) return;
    pressed=true; x0=e.clientX; y0=e.clientY; t0=Date.now(); held=0;
    held=setTimeout(function(){ held=-1; var v=vid(cur); if(v) v.pause(); }, 260);
  });
  deck.addEventListener('pointerup',function(e){
    if(!pressed) return; pressed=false;
    var wasHeld=held===-1; clearTimeout(held); held=0;
    if(wasHeld){ play(vid(cur)); return; }
    var dx=e.clientX-x0, dy=e.clientY-y0;
    if(Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)){ go(cur+(dx<0?1:-1)); return; }
    if(Math.abs(dx)>12 || Math.abs(dy)>12) return;
    var r=deck.getBoundingClientRect(); go(cur+((e.clientX-r.left) < r.width*.3 ? -1 : 1));
  });
  deck.addEventListener('pointercancel',function(){ pressed=false; if(held===-1) play(vid(cur)); clearTimeout(held); held=0; });
  deck.addEventListener('contextmenu',function(e){ if(!e.target.closest('a')) e.preventDefault(); });
  prev.addEventListener('click',function(){ go(cur-1); });
  next.addEventListener('click',function(){ go(cur+1); });
  root.querySelectorAll('[data-go]').forEach(function(b){ b.addEventListener('click',function(){ go(+b.dataset.go); }); });
  /* in the app the last card closes the story, rather than only starting it
     again (Elliott, 28 Oct 2026: "there is no way to get back once im done") */
  root.querySelectorAll('[data-done]').forEach(function(b){ b.addEventListener('click',function(){
    try{ var P=window.parent; if(P && P!==window){
      if(P.fxQuickBack && P.fxQuickBack()) return;
      if(P.fxReadClose){ P.fxReadClose(); return; } } }catch(e){}
    history.back(); }); });
  document.addEventListener('keydown',function(e){
    if(e.target.closest && e.target.closest('input,textarea,select')) return;
    if(e.key==='ArrowRight'){ go(cur+1); e.preventDefault(); }
    else if(e.key==='ArrowLeft'){ go(cur-1); e.preventDefault(); }
  });
  document.addEventListener('visibilitychange',function(){ var v=vid(cur); if(!v) return; if(document.hidden) v.pause(); else play(v); });
  var fromHash=function(){ var m=/^#s(\\d+)$/.exec(location.hash); return m ? Math.max(0, +m[1]-1) : 0; };
  addEventListener('hashchange', function(){ go(fromHash(), true); });
  go(fromHash(), true);
  /* members' films: the page asks for passes for its own, then puts them in.
     Without them (offline, or the key not set) the cards stay dark frames. */
  fetch('/api/app/learn/films?page=__SLUG__').then(function(r){ return r.ok?r.json():{}; }).then(function(d){
    tk=(d&&d.tokens)||{}; load(cur); load(cur+1); load(cur-1); play(vid(cur));
  }).catch(function(){});
})();
</script>"""

GO = ('\n        <span class="sc-go">Tap to start <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" '
      'style="stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round"><path d="M5 3l4 4-4 4"/></svg></span>')
CLASS = 'https://londonhandstandacademy.com/handstand-class?class=calisthenics&amp;src=learn'


def film(uid, dur, label, frm=None, wide=False):
    """dur is the film's length, or with frm the end of the stretch that loops"""
    span = f' data-from="{frm}" data-to="{dur}"' if frm is not None else ''
    at = round((frm or 0) + (dur - (frm or 0)) * .3, 1)
    return (f'<video data-uid="{uid}" data-poster="{at}"{span}{" data-wide" if wide else ""} muted="muted" playsinline="playsinline" loop="loop" '
            f'preload="none" aria-label="{html.escape(label)}"></video>')


def img(src, alt):
    return f'<img src="{src}" alt="{html.escape(alt)}" decoding="async">'


def ph(glyph, k, solid=False, wide=False):
    """a card with no film: 'Film to come' until there is one, or words on purpose (solid)"""
    return (f'<div class="ph{" solid" if solid else ""}"{" data-wide" if wide else ""} aria-hidden="true">'
            f'<span class="ph-g">{glyph}</span><span class="ph-k">{k}</span></div>')


def card(n, N, media, k, h, em, p, tag='h2', go='', dose=()):
    d = ('\n        <div class="sc-d">' + ''.join(f'<span>{x}</span>' for x in dose) + '</div>') if dose else ''
    w = ' wide' if 'data-wide' in media else ''
    return (f'    <section class="sc{w}{" on" if n == 1 else ""}" id="s{n}" aria-label="{n} of {N}">\n'
            f'      <div class="sc-m{w}">{media}</div>\n'
            f'      <div class="sc-t"><div class="sc-k">{k}</div>\n'
            f'        <{tag} class="sc-h">{h} <em>{em}</em></{tag}>\n'
            f'        <p class="sc-p">{p}</p>{d}{go}</div>\n    </section>')


CALI = ('Calisthenics at OverGravity, Shadwell, in Arch 2 with the bars.', CLASS)
HAND = ('The All Levels class at OverGravity, Shadwell, in Arch 1, the purple room.',
        'https://londonhandstandacademy.com/handstand-class?src=learn')


def end_card(N, app_line, safe, site=CALI):
    return f'''    <section class="sc sc-end" id="s{N}" aria-label="{N} of {N}">
      <div class="sc-m"><div class="ph">
        <div class="sc-k sc-site">Train it</div><div class="sc-k sc-app">That&rsquo;s all</div>
        <h2 class="sc-h sc-site">In the room on <em>Saturdays.</em></h2>
        <p class="sc-p sc-site">{site[0]}</p>
        <a href="{site[1]}" class="btn sc-site">See the class dates</a>
        <a href="https://londonhandstandacademy.com/learn/" class="btn2 sc-site">More from Learn</a>
        <h2 class="sc-h sc-app">Now go and <em>train it.</em></h2>
        <p class="sc-p sc-app">{app_line}</p>
        <button type="button" class="btn sc-app" data-done style="border:0;cursor:pointer">Back to the app</button>
        <p class="sc-safe">{safe}</p>
        <button type="button" class="sc-again" data-go="0">Start again</button>
      </div></div>
      <div class="sc-t" aria-hidden="true"></div>
    </section>'''


# ── the stories ─────────────────────────────────────────────────────────

MU = {'mu': ('5d8fccb8303d45ab4f181e34c0452156', 14.4), 'high': ('59c77778dba35e2e6b2a11b628f2c042', 8.8),
      'diag': ('3df1ca69eaa029e52ea4096fa2c10fb2', 4.1), 'dip': ('b54aa8d0c9d304e7a8a56ead0ac252ee', 7.5)}
FG = {'rings': ('40eb6695b30de839d6ae2186ec6d1a65', 14.0), 'look': ('4f47608890bc591afe04757c867ed65d', 22.0),
      'setup': ('f4239cba98e33d1cf7a3ce6e66ae8aa3', 22.9), 'hang': ('954a564b1807055e16ff7b58ca7128f1', 5.1),
      'pulls': ('493b8f355015ccd9495ee6d4908b8372', 10.8)}

KU = {'bounce': ('843bc9940391615a0da8bc40fc061572', 0, 15.5), 'nose': ('8bca83124064e21a1abe84d1a21ac587', 6, 33.3),
      'bunny': ('8575e4f2e14f33dc0f7708932d5a6dc4', 0, 19), 'chest': ('2563624790ac1efb8db57988e8594d01', 0, 13),
      'wall': ('51a36a15330dd845d7099de1712cf8d2', 3.6, 7.6), 'block': ('41ee75425ffdb75af7c5122ad7823770', 0, 18)}


def kf(k, label):
    """a kick up film: the stretch of it the article loops, shown whole, landscape"""
    uid, frm, to = KU[k]
    return film(uid, to, label, frm=frm, wide=True)


STORIES = {
    'why-you-cant-muscle-up-yet': dict(
        title="Why you can't muscle up yet", published='2026-10-26', modified='2026-10-27',
        desc=("Why you can't muscle up on the bar yet: ten strict pull ups first, then high pull ups, high pulls for speed, "
              "pulling diagonally behind you, weighted pull ups and the transition."),
        note='(Elliott, 27 Oct 2026: "tapping almost like\n     going through a story, one video per page and much less text"). Bar\n     only.',
        cards=[
            (film(*MU['mu'], 'A muscle up on the bar: swing, pull to the hips, chest over the bar, press to straight arms'),
             'Learn · Muscle up on the bar', "Why you can't muscle up", 'yet.', 'Six things, one at a time.', 'h1', GO),
            (ph('10', 'Film to come'), 'First', 'Ten strict', 'pull ups.',
             'From a dead hang, chin over the bar, ten in a row. Get these before anything else.'),
            (film(*MU['high'], 'High pull ups: the bar pulled to the lower chest'), '1 of 5', 'Learn high', 'pull ups.',
             'Pull the bar to your lower chest, not your chin. That is the height a muscle up needs.'),
            (ph('Fast', 'Film to come'), '2 of 5', 'Be', 'fast.',
             'High pulls with a thick green band. This is for speed, not strength.', 'h2', '', ('3 to 4 reps', '3½ min rest')),
            (film(*MU['diag'], 'Swings to a high pull: the pull goes back behind as the legs come forward'), '3 of 5', 'Pull diagonally', 'behind you.',
             'Not straight up. Back behind you, so you go round the bar, not into it.'),
            (ph('+kg', 'Film to come'), '4 of 5', 'Build weighted', 'pull ups.',
             'Hands fairly wide, chin over the bar, every rep.', 'h2', '', ('5 reps', '4 min rest')),
            (film(*MU['dip'], 'Straight bar dips with a pause at the bottom'), '5 of 5', 'Work on the', 'transition.',
             'Dip deep and pause at the bottom, chest over the bar. That is where you land.'),
        ],
        app_line='High pull ups and swings to a high pull are in your sessions at this stage.',
        safe='Build up slowly, and stop if anything hurts.'),

    'the-false-grip': dict(
        title='The false grip', published='2026-10-28', modified='2026-10-28',
        desc=("The false grip for the muscle up: what it looks like, why it belongs in every session, and how to build it, "
              "from the hold to supported holds to pull ups with your feet down, 15 seconds at a time."),
        note='(Elliott, 28 Oct 2026, after the muscle up\n     story). Bar and rings.',
        cards=[
            (film(*FG['rings'], 'A false grip hang on the rings, feet on a box'),
             'Learn · Muscle up', 'The false', 'grip.', 'What it looks like, and how to build it into every session.', 'h1', GO),
            (film(*FG['look'], 'Setting a false grip on a ring: the ring in the crease of the wrist, palm over the top, thumb around'),
             'What it is', 'What it', 'looks like.',
             'The heel of your hand on top of the bar or ring, your wrist bent over it, thumb around. You hang from the wrist, not the fingers.'),
            (ph('Day 1', 'Then every session', solid=True), 'Every session', 'In every', 'workout.',
             'Start every session with it, from your first one. Wrists get used to it slowly.'),
            (film(*FG['setup'], 'Setting a false grip on the bar: heel of the hand on top, wrist bent over'), '1 of 3', 'Learn the', 'hold.',
             'On a low bar or rings with your feet on the floor, set the grip and hold the wrist position.'),
            (film(*FG['hang'], 'A false grip hang on the bar, the feet taking some of the weight'), '2 of 3', 'Supported', 'holds.',
             'Hang in the false grip with your feet on the floor or a box. Your feet take what your hands can&rsquo;t.'),
            (ph('Pull', 'Film to come'), '3 of 3', 'Pull ups, feet', 'down.',
             'Pull ups in the false grip with your feet on a box or the floor, so your arms carry less of your weight.'),
            (ph('15', 'Seconds, each step', solid=True), 'The aim', 'Fifteen', 'seconds.',
             'Hold each step for 15 seconds before you move on to the next.'),
            (film(*FG['pulls'], 'Chest to bar pull ups in a false grip, wrists staying over the bar'), 'Then', 'Hang and pull', 'in it.',
             'Keep building until you can hang and do pull ups in a false grip, feet off the floor.'),
        ],
        app_line='The false grip is in your sessions at every stage of the ladder.',
        safe='Build up slowly, and stop if your wrists hurt.'),

    'the-kick-up': dict(
        title='The kick up', published='2026-10-28', modified='2026-10-28', wide=True, site=HAND,
        desc=("How to kick up into a handstand: start stacked, then six steps from kick up bounces and bunny hops "
              "to knee to chest kick ups, the wall and a foam block, then leave the wall."),
        note='(Elliott, 28 Oct 2026, from the kick up article\n     on the learn-kick-up branch, in his words). Landscape films.',
        cards=[
            (img('/assets/learn/kick-up-stacked.jpg', 'A kick up stacked: hands, shoulders and hips in one line, the knee in; the arched line is wrong'),
             'Learn · Kick up', 'Start stacked, and the kick up gets', 'easy.',
             'Shoulders over the hands, hips over the shoulders, like standing. Six steps, and you move on when each one gets you there.', 'h1', GO),
            (kf('bounce', 'Kick up bounces: quick, light, a little higher each time'), '1 of 6', 'Kick up', 'bounces.',
             "Quick, light and lots of them. Ten, a little higher each time. Don't worry about the wall yet."),
            (kf('nose', 'Knee to nose bounces from table top, the back rounding'), '2 of 6', 'Knee to nose', 'bounces.',
             'From table top, knee to the nose with the back rounded. On the last one, jump: hips up, shoulders down.'),
            (kf('bunny', 'Bunny hops: the hips going up and over the shoulders'), '3 of 6', 'Bunny', 'hops.',
             'Hips as far over the shoulders as you can. Harder: push up through the palms and the shoulders.'),
            (kf('chest', 'Knee to chest kick ups: the kicking knee pulled into the chest'), '4 of 6', 'Knee to chest', 'kick ups.',
             "If your back arches, the hips haven't got over the shoulders. Pull the knee into your chest as you jump."),
            (kf('wall', 'Kicking up to the wall, hands a few inches from it'), '5 of 6', 'Kick up to the', 'wall.',
             'Hands 6 to 9 inches from the wall. Look between your hands, never back.'),
            (kf('block', 'Kicking up with a foam block held between hip and thigh'), '6 of 6', 'With a foam', 'block.',
             "Block between your hip and the thigh of your kicking leg. It won't let the tuck go."),
            (ph('3', 'Faults to watch', solid=True, wide=True), 'What gets in the way', 'Three', 'faults.',
             'Turn the biceps forward before the hands go down, look between your hands, and learn to fall first.', 'h2', '',
             ('Bent arms', 'Looking at your feet', 'Fear of falling')),
            (ph('Away', 'From the wall', solid=True, wide=True), 'Then', 'Leave the', 'wall.',
             'The wall teaches you to overshoot. Once the fear has gone, move away from it.'),
        ],
        app_line='Kick up bounces, bunny hops, knee to chest and wall kick ups are all in your Foundations sessions.',
        safe='Warm up first, and try both sides.'),

    'falling-the-quick-version': dict(
        title='Falling, the quick version', published='2026-10-28', modified='2026-10-28', wide=True, site=HAND,
        desc=("How to fall out of a handstand safely, the quick version: basic bail outs, cartwheels, kick up bounces, "
              "bailing out on the way to the wall and a partner spot, until falling is light and automatic."),
        note='(Elliott, 28 Oct 2026: the falling article "as option to view",\n     a summary of it in his words). Mostly landscape films.',
        cards=[
            (film('dd9bd98c29500b6500d646be9dd6ee6f', 23.6, 'A cartwheel out of a handstand', frm=19.5, wide=True),
             'Learn · Falling', 'Make the fall light, then', 'automatic.',
             'Five steps, over a few weeks, until coming down is nothing. Then balance can start.', 'h1', GO),
            (film('692ed8ab7e701e52ea14fe5e88103585', 13.6, 'A basic bail out: jump, turn to the side, land', frm=10.3),
             '1 of 5', 'Basic bail', 'outs.',
             'Shoulders over the hands, hips high. Jump up a little, turn to the side, land on your feet.'),
            (film('045869a0384df496680feb0922bf0acb', 39.3, 'A low cartwheel out to the side', frm=33, wide=True),
             '2 of 5', 'Cartwheels, any', 'kind.',
             "It doesn't have to be pretty. Hips over the shoulders, out to the side, never over the top."),
            (film('843bc9940391615a0da8bc40fc061572', 11.6, 'Kick up bounces: up, down light, again', frm=0, wide=True),
             '3 of 5', 'Kick up', 'bounces.',
             'Kick up, come down light, straight back up, a bit bigger each time. Biceps forward, arms straight.'),
            (film('362da5a70cede1b49229a635829656ca', 29.3, 'Bailing out of a chest to wall handstand, one leg out', wide=True),
             '4 of 5', 'Bail out on the way to the', 'wall.',
             'Walk in closer step by step, and crawl out to the side at each one. Then you always know the way down.'),
            (ph('Spot', 'Film to come', wide=True), '5 of 5', 'Kick up with a', 'partner.',
             "They guide your legs down, then just say the word, then step back, until it's just you."),
            (ph('Light', 'Then automatic', solid=True, wide=True), 'The point of all five', 'Then balance can', 'start.',
             'Once falling out takes no thought, you stop thinking about falling and start thinking about holding.'),
        ],
        app_line='Bail outs, cartwheels, bounces and chest to wall bail outs are all in Learn to Fall.',
        safe='Make it light. If it feels like effort, make it smaller.'),
}


def build(slug, S):
    title = S['title']
    head = '\n'.join(lines[:129] + lines[177:184])
    head = head.replace('<title>How to fall out of a handstand safely · London Handstand Academy</title>',
                        f'<title>{title} · London Handstand Academy</title>')
    head = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{S["desc"]}">', head)
    head = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{S["desc"]}">', head)
    head = head.replace('<link rel="canonical" href="https://londonhandstandacademy.com/learn/fall-out-of-a-handstand-safely">',
                        f'<link rel="canonical" href="https://londonhandstandacademy.com/learn/{slug}">')
    head = head.replace('<meta property="og:title" content="How to fall out of a handstand safely">',
                        f'<meta property="og:title" content="{title}">')
    head = re.sub(r'<meta property="og:image" content="[^"]*">\n', '', head)
    head = head.replace("""<!-- Built from the Claude Design canvas "LHA Learn articles" (14 Oct 2026):
     the artboard's markup as drawn, its uploads pointed back at the films
     on Cloudflare Stream, and the step that lights up with the film in
     plain script. Change the words here or on the canvas, then rebuild. -->""", f"""<!-- A story, not an article {S['note']}
     The films are members' films, locked at Stream: the page asks
     /api/app/learn/films for its own, two hours at a time. Built by
     tools/build-learn-story.py; change the words there, then rebuild. -->""")
    assert 'fall-out-of-a-handstand-safely' not in head, 'old slug left in head'
    head = head.replace('</head>', STYLE + '\n</head>')

    cards = S['cards']
    N = len(cards) + 1
    secs = [card(i + 1, N, *c) for i, c in enumerate(cards)] + [end_card(N, S['app_line'], S['safe'], S.get('site', CALI))]
    arrow = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="{}"/></svg>'
    story = (f'''<!-- The story -->
<main class="st{' wst' if S.get('wide') else ''}" id="story" aria-roledescription="carousel" aria-label="{title}">
  <div class="st-bars" aria-hidden="true">{"".join("<i><b></b></i>" for _ in range(N))}</div>
  <div class="st-deck">
''' + '\n'.join(secs) + f'''
  </div>
  <button type="button" class="st-nav prev round glass" aria-label="Back">{arrow.format("M12 4l-6 6 6 6")}</button>
  <button type="button" class="st-nav next round glass" aria-label="Next">{arrow.format("M8 4l6 6-6 6")}</button>
</main>
''')
    header = src[src.index('<!-- Header -->'):src.index('<!-- Hero -->')].replace('<i>How to fall safely</i>', f'<i>{title}</i>')
    footer = src[src.index('<footer'):src.index('</footer>') + len('</footer>')]
    body = ('<body>\n<div style="display:flex;flex-direction:column;min-height:400px">\n\n'
            + header + story + '\n' + footer + '\n</div>\n')
    ld = ('<script type="application/ld+json">{"@context": "https://schema.org", "@type": "Article", "headline": "'
          + title + '", '
          f'"description": "{S["desc"]}", "datePublished": "{S["published"]}", "dateModified": "{S["modified"]}", '
          '"author": {"@type": "Person", "name": "Elliott Staley"}, '
          '"publisher": {"@type": "Organization", "name": "London Handstand Academy", "logo": {"@type": "ImageObject", "url": "https://londonhandstandacademy.com/icons/icon-512.png"}}, '
          f'"mainEntityOfPage": "https://londonhandstandacademy.com/learn/{slug}"}}</script>')
    tail = src[src.index('<script type="application/ld+json">'):]
    tail = tail[tail.index('</script>') + len('</script>'):]
    # the gallery's script has no gallery to run on here
    g0 = tail.index('<script>\n/* the gallery:'); g1 = tail.index('</script>', g0) + len('</script>\n')
    tail = tail[:g0] + tail[g1:]
    tail = tail.replace('<script src="../stats.js" defer></script>',
                        '<script src="films.js"></script>\n' + SCRIPT.replace('__SLUG__', slug) + '\n<script src="../stats.js" defer></script>', 1)
    page = head + '\n' + body + ld + tail
    assert page.count('<script src="films.js">') == 1, 'the film loader'
    assert page.count('<body>') == 1 and page.count('</html>') == 1
    assert '—' not in page and '–' not in page, 'dash in the page'
    open(f'learn/{slug}.html', 'w').write(page)
    print('written', slug, len(page), 'cards', N)


if __name__ == '__main__':
    want = sys.argv[1:] or list(STORIES)
    for slug in want:
        build(slug, STORIES[slug])
