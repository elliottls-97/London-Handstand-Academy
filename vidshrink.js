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

/* file in, a smaller file out, or a sentence saying why not */
function vidShrink(file, onProgress){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = url;
    let ac = null, rec = null, raf = 0, settled = false;
    const teardown = () => {
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
      if (dur > VID_SECS + 1) return fail('That clip is ' + Math.round(dur) + ' seconds. Trim it to three minutes or less, then send it again.');
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
      const vbps = Math.max(1200000, Math.min(4000000, Math.floor(140 * 1048576 * 8 / Math.max(1, dur)) - 128000));
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
        const name = String(file.name || 'clip').replace(/\.[^.]+$/, '') + '-small.' + (/mp4/.test(type) ? 'mp4' : 'webm');
        try{ resolve(new File([blob], name, { type })); }catch(e){ blob.name = name; resolve(blob); }
      };
      const draw = () => {
        if (settled) return;
        try{ g.drawImage(v, 0, 0, cw, ch); }catch(e){}
        if (onProgress && dur) onProgress(Math.min(0.99, v.currentTime / dur));
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(draw); else raf = requestAnimationFrame(draw);
      };
      v.onended = () => { try{ g.drawImage(v, 0, 0, cw, ch); }catch(e){}
        setTimeout(() => { try{ if (rec.state !== 'inactive') rec.stop(); }catch(e){} }, 200); };
      /* a phone that will not play it with sound outside the tap plays it
         silent: the clip matters more than its sound */
      const go = () => { rec.start(1000); draw(); };
      v.play().then(go).catch(() => { v.muted = true; v.play().then(go)
        .catch(() => fail('The clip would not play to shrink it. Try again, and keep this screen open.')); });
    };
  });
}
