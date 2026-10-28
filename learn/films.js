/* ── the films on a Learn page ───────────────────────────────────────
   Every film on the long articles started at once, in full size, the
   moment the page opened: the falling article pulled seven 1080p files
   in its first six seconds, most of them screens below, and the one being
   read waited behind them (Elliott, 28 Oct 2026: "the articles are very
   laggy even on good internet"). A film now loads only as it comes near
   the screen and plays only while it is on it.

   Which copy it plays, in order:
   - the one saved on this phone for no signal, through the app's worker;
   - the ladder of sizes where the browser plays one (every iPhone), so it
     starts small and grows with the signal, as the app's player does;
   - the full file everywhere else.
   Film quality, set in the app's menu and kept on this phone, changes
   that: Data saver asks Stream for the 480p copy alone and loads nothing
   ahead, Best always plays the full file. A film that will not play drops
   to the next copy down. A page that is slow to start its films offers
   Data saver once.

   The stories use the same choice through window.LHAF. */
(function(){
  var S='https://customer-pns1oongdltmkjwa.cloudflarestream.com/', CACHE='lha-films', SAVER_MBPS=1.5;
  var get=function(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } };
  var put=function(k,v){ try{ localStorage.setItem(k,v); }catch(e){} };
  var mode=function(){ var q=get('lha_q'); return q==='saver' || q==='high' ? q : 'auto'; };
  /* the app asks one real film whether the ladder plays and keeps the
     answer here; until it has, every iPhone browser is WebKit and does */
  var ios=/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  var hls=function(){ var h=get('lha_hls'); return h==='1' || (h==null && ios); };
  var uidOf=function(u){ var m=/cloudflarestream\.com\/([a-f0-9]{32})\//.exec(String(u||'')); return m?m[1]:''; };

  /* what this phone has saved, read once a page (and again after a save) */
  var have=null;
  var saved=function(){
    if(have) return have;
    var on=false; try{ on=!!(window.caches && navigator.serviceWorker && navigator.serviceWorker.controller); }catch(e){}
    have = !on ? Promise.resolve({}) : caches.open(CACHE).then(function(c){ return c.keys(); }).then(function(ks){
      var s={}; ks.forEach(function(r){ var m=/\/([a-f0-9]{32})\/downloads\/default\.mp4$/.exec(r.url); if(m) s[m[1]]=1; }); return s;
    }).catch(function(){ return {}; });
    return have;
  };
  /* seg is what goes in the address: the uid, or a pass for a members' film */
  var pick=function(uid, seg, has){
    if(has && has[uid]) return S+uid+'/downloads/default.mp4?lha=saved';
    seg=seg||uid; var m=mode();
    if(m!=='high' && hls()) return S+seg+'/manifest/video.m3u8'+(m==='saver' ? '?clientBandwidthHint='+SAVER_MBPS : '');
    return S+seg+'/downloads/default.mp4';
  };
  var play=function(v){ if(!v.src) return; var p; try{ p=v.play(); }catch(e){} if(p && p.catch) p.catch(function(){}); };
  /* the next copy down, once each */
  var fall=function(v){
    var cur=String(v.currentSrc||v.src||''), uid=v.dataset.uid||uidOf(cur), seg=v.dataset.seg||uid, next='';
    if(!uid || v.dataset.fell===cur) return;
    if(/lha=saved/.test(cur)) next=pick(uid, seg, {});
    else if(/\/manifest\//.test(cur)) next=S+seg+'/downloads/default.mp4';
    if(!next || next===cur) return;
    v.dataset.fell=cur; v.src=next; try{ v.load(); }catch(e){}
    if(v.dataset.vis==='1' || v.dataset.want==='1') play(v);
  };
  /* a film's start: data-from where it loops a stretch, else the #t= its
     address carried, so a manifest starts on the same frame the file did */
  var start=function(v){ var a=parseFloat(v.dataset.from||v.dataset.t0||0)||0;
    if(a>0 && v.currentTime<a-0.25){ try{ v.currentTime=a; }catch(e){} } };

  /* ── slow to start: offer Data saver, once ── */
  var slowN=0, stalls=0, offered=false;
  var slow=function(){
    if(offered || mode()!=='auto' || get('lha_q_asked')) return;
    if(slowN<2 && !(slowN && stalls>=2)) return;
    offered=true; put('lha_q_asked', String(Date.now()));
    var P=null; try{ P=window.parent!==window && window.parent.lhaSlowFilms ? window.parent : null; }catch(e){}
    if(P){ try{ P.lhaSlowFilms(); return; }catch(e){} }
    var b=document.createElement('div');
    b.setAttribute('role','status');
    b.style.cssText='position:fixed;left:16px;right:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);z-index:70;max-width:440px;margin:0 auto;'+
      'background:#fff;border:1px solid rgba(0,64,61,.14);border-radius:18px;padding:14px 16px;display:flex;gap:12px;align-items:center;'+
      'box-shadow:0 1px 2px rgba(0,64,61,.05),0 12px 30px rgba(0,64,61,.14);font:400 14px/1.4 Figtree,system-ui,sans-serif;color:#111';
    b.innerHTML='<span style="flex:1;min-width:0">The films are slow on this signal. Smaller ones?</span>'+
      '<button type="button" data-y style="flex:none;border:0;border-radius:12px;height:40px;padding:0 14px;cursor:pointer;'+
      'background:linear-gradient(180deg,#0a7a76,#006663);color:#f7f4f1;font:600 13px/1 Figtree,system-ui,sans-serif">Data saver</button>'+
      '<button type="button" data-n aria-label="No thanks" style="flex:none;border:0;background:none;cursor:pointer;font:400 20px/1 system-ui;color:#686868;padding:4px">&times;</button>';
    b.querySelector('[data-y]').onclick=function(){ put('lha_q','saver'); b.remove(); LHAF.refresh(); };
    b.querySelector('[data-n]').onclick=function(){ b.remove(); };
    document.body.appendChild(b);
  };
  var time=function(v){
    if(v.dataset.timed) return; v.dataset.timed='1';
    var asked=0, began=false;
    v.addEventListener('play', function(){ if(!began && !asked) asked=Date.now(); });
    v.addEventListener('playing', function(){
      if(!began && asked && !/lha=saved/.test(v.currentSrc||'') && Date.now()-asked>4000){ slowN++; slow(); }
      began=true; });
    v.addEventListener('waiting', function(){ if(began && v.dataset.vis==='1'){ stalls++; slow(); } });
    v.addEventListener('error', function(){ fall(v); });
    v.addEventListener('loadedmetadata', function(){ start(v); });
  };

  /* ── the long articles: data-src films ── */
  var films=[].slice.call(document.querySelectorAll('video[data-src]'));
  var load=function(v){
    if(v.dataset.loaded) return; v.dataset.loaded='1';
    var raw=v.dataset.src, uid=uidOf(raw), t=/#t=([\d.]+)/.exec(raw);
    if(t) v.dataset.t0=t[1];
    v.dataset.uid=uid;
    time(v);
    saved().then(function(has){
      var src = uid ? pick(uid, uid, has) : raw;
      /* the full file keeps its #t=, which shows the right first frame */
      if(t && /\.mp4$/.test(src)) src+='#t='+t[1];
      v.preload = v.hasAttribute('data-auto') ? 'auto' : 'metadata';
      v.src=src;
      if(v.dataset.vis==='1' && v.hasAttribute('data-auto')) play(v);
    });
  };
  var near=null, seen=null;
  var watch=function(){
    if(near) near.disconnect(); if(seen) seen.disconnect();
    if(!('IntersectionObserver' in window)){ films.forEach(function(v){ v.dataset.vis='1'; load(v); }); return; }
    /* loaded a screen ahead, or only once on it with Data saver */
    near=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting) load(e.target); }); },
      {rootMargin: mode()==='saver' ? '0px' : '100% 0px'});
    seen=new IntersectionObserver(function(es){ es.forEach(function(e){ var v=e.target;
      if(e.isIntersecting){ v.dataset.vis='1'; if(v.hasAttribute('data-auto')){ load(v); play(v); } }
      else { v.dataset.vis='0'; if(v.hasAttribute('data-auto') && !v.paused) v.pause(); } }); }, {threshold:.35});
    films.forEach(function(v){ near.observe(v); seen.observe(v); });
  };
  watch();
  /* inside the app's reader the first look can come before the frame has
     its size, and then nothing loads until a scroll: look again once the
     page has loaded, and whenever the frame changes size (shown again) */
  var again=0, look=function(){ clearTimeout(again); again=setTimeout(watch, 250); };
  addEventListener('load', look); addEventListener('resize', look); addEventListener('pageshow', look);
  document.addEventListener('visibilitychange', function(){
    films.forEach(function(v){ if(!v.hasAttribute('data-auto')) return;
      if(document.hidden) v.pause(); else if(v.dataset.vis==='1') play(v); }); });

  window.LHAF={ mode:mode, hls:hls, saved:saved, pick:pick, fall:fall, time:time, play:play,
    /* after a save, or Film quality changed: every loaded film picks again */
    refresh:function(){ have=null;
      films.forEach(function(v){ if(!v.dataset.loaded) return; delete v.dataset.loaded; delete v.dataset.fell; v.removeAttribute('src'); try{ v.load(); }catch(e){} });
      watch(); } };
})();
