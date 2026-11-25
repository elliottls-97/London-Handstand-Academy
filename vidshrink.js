/* ══ shrinking a video on the phone, before it is sent ════════════════
   Shared by the app and the dashboard, loaded as a classic script.

   Cloudflare takes a video of up to 200MB in one go, and a phone's 4K clip
   is past that inside a minute. This plays the clip into a smaller canvas
   and records it again at a modest bit rate, on the device itself: nothing
   is uploaded until it has finished, and it costs nothing, because
   Cloudflare charges by the minute of video, not by its size. It takes
   about as long as the clip, and the screen has to stay open while it runs,
   because a phone pauses a page it is not showing. */
const VID_MAX = 200 * 1024 * 1024;   /* what Cloudflare accepts in one upload */
const VID_SECS = 180;                /* the longest clip the upload link allows */

function vidShrinkOk(){
  try{ return typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream; }
  catch(e){ return false; }
}
/* mp4 where the phone can make it (Safari, recent Chrome), webm otherwise;
   Cloudflare takes either */
function vidMime(){
  const c = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4',
             'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const m of c){ try{ if (MediaRecorder.isTypeSupported(m)) return m; }catch(e){} }
  return '';
}
const vidMB = n => Math.max(1, Math.round((Number(n) || 0) / 1048576));

/* file in, a smaller file out, or a sentence saying why not. With a
   window ({from, to} in seconds) it records only that part: the cut. */
function vidShrink(file, onProgress, win){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = url;
    let ac = null, rec = null, raf = 0, settled = false, stopping = false, onHide = null, seekT = 0;
    const teardown = () => {
      try{ if (onHide) document.removeEventListener('visibilitychange', onHide); }catch(e){}
      try{ clearTimeout(seekT); }catch(e){}
      try{ cancelAnimationFrame(raf); }catch(e){}
      try{ if (rec && rec.state !== 'inactive') rec.stop(); }catch(e){}
      try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){}
      try{ if (ac) ac.close(); }catch(e){}
      try{ URL.revokeObjectURL(url); }catch(e){}
    };
    const fail = m => { if (settled) return; settled = true; teardown(); reject(m); };
    v.onerror = () => fail('This phone could not read that video.');
    v.onloadedmetadata = () => {
      const dur = v.duration || 0;
      const from = win ? Math.max(0, Number(win.from) || 0) : 0;
      const to = win ? Math.min(dur || Infinity, Number(win.to) || dur) : dur;
      const len = Math.max(0.5, (to || 0) - from);
      if (!win && dur > VID_SECS + 1) return fail('That clip is ' + Math.round(dur) + ' seconds. Trim it to three minutes or less, then send it again.');
      /* 1280 on the long side is plenty to see a handstand by */
      const w = v.videoWidth || 1280, h = v.videoHeight || 720, s = Math.min(1, 1280 / Math.max(w, h));
      const cw = Math.max(2, Math.round(w * s / 2) * 2), ch = Math.max(2, Math.round(h * s / 2) * 2);
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const g = c.getContext('2d');
      const stream = c.captureStream(30);
      /* the sound, routed into the recording and not to the speaker */
      try{
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC){ ac = new AC(); const src = ac.createMediaElementSource(v), dst = ac.createMediaStreamDestination();
          src.connect(dst); dst.stream.getAudioTracks().forEach(t => stream.addTrack(t));
          if (ac.state === 'suspended') ac.resume().catch(() => {}); }
      }catch(e){ /* no sound is better than no clip */ }
      const mime = vidMime();
      /* aim well under the limit whatever the length: about 140MB for three
         minutes, never more than 4Mbps, never less than 1.2 */
      const vbps = Math.max(1200000, Math.min(4000000, Math.floor(140 * 1048576 * 8 / Math.max(1, len)) - 128000));
      try{ rec = new MediaRecorder(stream, Object.assign(mime ? { mimeType: mime } : {}, { videoBitsPerSecond: vbps, audioBitsPerSecond: 96000 })); }
      catch(e){ return fail('This phone cannot shrink video. Film at 1080p, or trim the clip, then send it again.'); }
      const parts = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) parts.push(e.data); };
      rec.onstop = () => {
        if (settled) return; settled = true;
        const type = String(rec.mimeType || mime || 'video/webm').split(';')[0];
        const blob = new Blob(parts, { type });
        teardown();
        if (!blob.size) return reject('That did not shrink. Try trimming the clip instead.');
        const name = String(file.name || 'clip').replace(/\.[^.]+$/, '') + (win ? '-cut.' : '-small.') + (/mp4/.test(type) ? 'mp4' : 'webm');
        try{ resolve(new File([blob], name, { type })); }catch(e){ blob.name = name; resolve(blob); }
      };
      const finish = () => { if (stopping) return; stopping = true; try{ v.pause(); }catch(e){}
        setTimeout(() => { try{ if (rec.state !== 'inactive') rec.stop(); }catch(e){} }, 200); };
      const draw = () => {
        if (settled || stopping) return;
        try{ g.drawImage(v, 0, 0, cw, ch); }catch(e){}
        if (onProgress && len) onProgress(Math.min(0.99, Math.max(0, v.currentTime - from) / len));
        if (win && v.currentTime >= to - 0.02) return finish();
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(draw); else raf = requestAnimationFrame(draw);
      };
      v.onended = () => { try{ g.drawImage(v, 0, 0, cw, ch); }catch(e){} finish(); };
      /* a phone pauses a page it is not showing, and the recording would sit
         on one frame for ever: say so and stop instead */
      onHide = () => { if (document.hidden && !settled) fail('The phone left this screen, so it stopped. Keep the screen open and try again.'); };
      document.addEventListener('visibilitychange', onHide);
      /* a phone that will not play it with sound outside the tap plays it
         silent: the clip matters more than its sound */
      const go = () => { rec.start(1000); draw(); };
      const play = () => v.play().then(go).catch(() => { v.muted = true; v.play().then(go)
        .catch(() => fail('The clip would not play to cut it. Try again, and keep this screen open.')); });
      if (from > 0.05){
        seekT = setTimeout(() => fail('This phone could not find that part of the clip. Try again.'), 8000);
        v.addEventListener('seeked', () => { clearTimeout(seekT); play(); }, { once: true });
        v.currentTime = from;
      } else play();
    };
  });
}

/* ── a clip that runs too long: pick the part to keep (25 Nov 2026) ──
   Elliott: "limit clips ... if they put one in and it's too much, a tool to
   crop it down before uploading". Rather than a flat no, the clip opens
   with a box the length of the limit to drag along it; the phone then
   records just that part (vidShrink with a window), so the long original
   never leaves the phone. */
const vidClock = s => { s = Math.max(0, Math.round(Number(s) || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const vidLenTxt = s => s === 60 ? 'minute' : s % 60 === 0 ? (s / 60) + ' minutes' : s + ' seconds';
const vidLenCap = s => s === 60 ? 'A minute' : s % 60 === 0 ? (s / 60) + ' minutes' : s + ' seconds';
function vidTrimCss(){
  if (document.getElementById('vidTrimCss')) return;
  const el = document.createElement('style'); el.id = 'vidTrimCss';
  el.textContent = `
#vidTrim{position:fixed;inset:0;z-index:1100;background:rgba(11,33,41,.62);display:flex;align-items:flex-end;justify-content:center;font-family:var(--sans,'Figtree',system-ui,sans-serif);color:#111}
#vidTrim .vt-sheet{position:relative;box-sizing:border-box;width:100%;max-width:520px;max-height:100%;overflow:auto;background:#fcfcfc;border-radius:28px 28px 0 0;padding:22px 20px calc(20px + env(safe-area-inset-bottom,0px));animation:vtUp .35s cubic-bezier(.2,.8,.2,1)}
@media (min-width:700px){#vidTrim{align-items:center}#vidTrim .vt-sheet{border-radius:28px}}
@keyframes vtUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){#vidTrim .vt-sheet{animation:none}}
#vidTrim .vt-x{position:absolute;top:10px;right:10px;width:44px;height:44px;border:0;background:none;font:400 26px/1 system-ui;color:#686868;cursor:pointer}
#vidTrim .vt-kick{font:600 11px/1 var(--sans,system-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--forest,#237f95)}
#vidTrim .vt-h{font:400 30px/1.05 var(--serif,'Newsreader',Georgia,serif);letter-spacing:-.01em;margin-top:8px;padding-right:36px}
#vidTrim .vt-h em{font-style:normal;color:var(--forest,#237f95)}
#vidTrim .vt-vid{margin-top:14px;border-radius:16px;overflow:hidden;background:#0b2129;display:flex;justify-content:center}
#vidTrim video{display:block;width:100%;max-height:42vh;object-fit:contain;background:#0b2129}
#vidTrim .vt-bar{position:relative;height:56px;margin-top:16px;border-radius:14px;background:rgba(29,85,102,.10);touch-action:none;cursor:pointer;outline:none}
#vidTrim .vt-bar:focus-visible{box-shadow:0 0 0 3px rgba(35,127,149,.35)}
#vidTrim .vt-win{position:absolute;top:0;bottom:0;box-sizing:border-box;border:3px solid var(--forest,#237f95);border-radius:14px;background:rgba(35,127,149,.20);display:flex;align-items:center;justify-content:center;gap:4px;cursor:grab}
#vidTrim .vt-win i{width:3px;height:18px;border-radius:2px;background:var(--forest,#237f95);display:block}
#vidTrim .vt-when{display:flex;justify-content:space-between;gap:10px;margin-top:8px;font:500 13.5px/1.3 var(--sans,system-ui);color:#5a5a5a;font-variant-numeric:tabular-nums}
#vidTrim .vt-when b{color:#111;font-weight:600}
#vidTrim .vt-row{display:flex;gap:10px;margin-top:16px}
#vidTrim .vt-row button{flex:1;min-height:56px;border-radius:18px;font:600 16px/1 var(--sans,system-ui);cursor:pointer}
#vidTrim .vt-play{background:#fff;color:var(--deep,#1d5566);border:1px solid rgba(29,85,102,.14)}
#vidTrim .vt-go{border:0;color:#f7f4f1;background:linear-gradient(180deg,#2f93a9,#237f95);box-shadow:0 12px 30px rgba(35,127,149,.3),inset 0 1px 0 rgba(255,255,255,.35)}`;
  document.head.appendChild(el);
}
/* the sheet: resolves {from, to}, or null when they back out */
function vidTrimPick(file, maxSecs, dur){
  return new Promise(resolve => {
    vidTrimCss();
    const len = Math.min(maxSecs, dur), span = Math.max(0, dur - len), url = URL.createObjectURL(file);
    const back = document.activeElement;
    let from = 0, grab = null, done = false, busy = false, want = null;
    const ov = document.createElement('div'); ov.id = 'vidTrim';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'vtH');
    ov.innerHTML = `<div class="vt-sheet">
      <button class="vt-x" aria-label="Pick another clip">&times;</button>
      <div class="vt-kick">This clip runs ${vidClock(dur)}</div>
      <div class="vt-h" id="vtH">Pick the ${vidLenTxt(maxSecs)} to <em>send.</em></div>
      <div class="vt-vid"><video playsinline muted preload="auto"></video></div>
      <div class="vt-bar" role="slider" tabindex="0" aria-label="Where the part you send starts" aria-valuemin="0" aria-valuemax="${Math.round(span)}"><div class="vt-win"><i></i><i></i></div></div>
      <div class="vt-when"><span><b class="vt-a"></b> to <b class="vt-b"></b></span><span>Drag the box</span></div>
      <div class="vt-row"><button class="vt-play">Play it</button><button class="vt-go">Use this part</button></div></div>`;
    document.body.appendChild(ov);
    const q = c => ov.querySelector(c), v = q('video'), bar = q('.vt-bar'), win = q('.vt-win'), playB = q('.vt-play');
    v.setAttribute('playsinline', ''); v.src = url;
    const winW = W => Math.min(W, Math.max(30, W * len / dur));
    const paint = () => {
      const W = bar.clientWidth, ww = winW(W);
      win.style.width = ww + 'px'; win.style.left = (span ? (from / span) * (W - ww) : 0) + 'px';
      q('.vt-a').textContent = vidClock(from); q('.vt-b').textContent = vidClock(from + len);
      bar.setAttribute('aria-valuenow', String(Math.round(from)));
      bar.setAttribute('aria-valuetext', vidClock(from) + ' to ' + vidClock(from + len));
    };
    /* one seek at a time, the latest wanted after it: a drag asks for dozens */
    const seek = t => { if (busy){ want = t; return; } busy = true; try{ v.currentTime = Math.max(0.01, t); }catch(e){ busy = false; } };
    v.addEventListener('seeked', () => { busy = false; if (want != null){ const t = want; want = null; seek(t); } });
    v.addEventListener('loadedmetadata', () => { seek(0.01); paint(); });
    v.addEventListener('timeupdate', () => { if (!v.paused && v.currentTime >= from + len - 0.05){ v.pause(); seek(from); } });
    v.addEventListener('play', () => { playB.textContent = 'Pause'; });
    v.addEventListener('pause', () => { playB.textContent = 'Play it'; });
    const move = x => {
      const r = bar.getBoundingClientRect(), W = r.width, ww = winW(W);
      from = span * Math.min(1, Math.max(0, (x - r.left - grab) / Math.max(1, W - ww)));
      paint(); if (!v.paused) v.pause(); seek(from);
    };
    bar.addEventListener('pointerdown', e => {
      e.preventDefault(); try{ bar.setPointerCapture(e.pointerId); }catch(err){}
      const r = bar.getBoundingClientRect(), W = r.width, ww = winW(W), left = span ? (from / span) * (W - ww) : 0, x = e.clientX - r.left;
      grab = (x >= left && x <= left + ww) ? x - left : ww / 2; move(e.clientX);
    });
    bar.addEventListener('pointermove', e => { if (grab != null) move(e.clientX); });
    const let_go = () => { grab = null; };
    bar.addEventListener('pointerup', let_go); bar.addEventListener('pointercancel', let_go);
    bar.addEventListener('keydown', e => {
      const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
      if (step == null && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      from = e.key === 'Home' ? 0 : e.key === 'End' ? span : Math.min(span, Math.max(0, from + step));
      paint(); seek(from);
    });
    playB.onclick = () => { if (!v.paused){ v.pause(); return; } if (Math.abs(v.currentTime - from) > 0.3) v.currentTime = from; v.play().catch(() => {}); };
    const close = out => {
      if (done) return; done = true;
      document.removeEventListener('keydown', onKey); window.removeEventListener('resize', paint);
      try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){}
      try{ URL.revokeObjectURL(url); }catch(e){}
      ov.remove(); try{ if (back && back.focus) back.focus(); }catch(e){}
      resolve(out);
    };
    const onKey = e => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', onKey); window.addEventListener('resize', paint);
    q('.vt-x').onclick = () => close(null);
    ov.addEventListener('click', e => { if (e.target === ov) close(null); });
    q('.vt-go').onclick = () => close({ from, to: from + len });
    paint(); q('.vt-go').focus();
  });
}
/* the one call: the file as it is when it fits, the part they pick when
   it runs long, null when they back out, or a sentence saying why not */
function vidFit(file, maxSecs, say, secs){
  say = say || function(){};
  if (!(secs > maxSecs + 1)) return Promise.resolve(file);
  if (!vidShrinkOk()) return Promise.reject('That clip runs ' + vidClock(secs) + '. ' + vidLenCap(maxSecs) + ' is the most, so trim it in your Photos app and send it again.');
  return vidTrimPick(file, maxSecs, secs).then(w => {
    if (!w){ say(''); return null; }
    say('Cutting out your ' + vidLenTxt(maxSecs) + '. Keep this screen open.');
    return vidShrink(file, p => say('Cutting it, ' + Math.round(p * 100) + '%. Keep this screen open.'), w);
  });
}
