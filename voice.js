/* Voice notes in the chat, for coached clients: recording one, turning it
   into something the server takes, and playing one back. Loaded by the
   app and the dashboard alike, the way ladder-data.js is, so the two ends
   of a conversation cannot drift apart. Pure functions and one small bar;
   each page does its own sending, because each sends differently.

   A note is kept for a week and then deleted on the server. The bubble
   stays, and says so, rather than showing a player that fails. */

const VOICE_MAX_SECS  = 120;
const VOICE_KEEP_DAYS = 7;
const voiceGone = at => !!at && (Date.now() - at > VOICE_KEEP_DAYS * 864e5);
const voiceLen  = s => { s = Math.max(0, Math.round(Number(s) || 0));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/* AAC first: an iPhone records it, Chrome on a Mac records it, and both
   play it. Opus in WebM only where nothing better is on offer. */
function voiceMime(){
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/aac',
          'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
    .find(t => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) || '';
}
const voiceCan = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  && typeof MediaRecorder !== 'undefined');

/* ── recording ─────────────────────────────────────────────────────────
   The bar is its own element on the page rather than part of either
   screen, so a chat that redraws underneath it (a new message arriving,
   say) cannot take a recording in progress away with it. */
const voiceRec = { mr: null, chunks: [], t0: 0, stream: null, mime: '', timer: 0, done: null };

/* anchor: the box it should sit over while recording, if the page has one */
function voiceRecord(onDone, anchor){
  if (voiceRec.mr) return;
  if (!voiceCan()) { onDone(null, 0, 'This browser cannot record. Try Safari or Chrome.'); return; }
  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    .then(stream => {
      const mime = voiceMime();
      let mr;
      try { mr = new MediaRecorder(stream, Object.assign({ audioBitsPerSecond: 48000 }, mime ? { mimeType: mime } : {})); }
      catch (e) { stream.getTracks().forEach(t => t.stop()); onDone(null, 0, 'Could not start recording.'); return; }
      Object.assign(voiceRec, { mr, stream, chunks: [], t0: Date.now(), mime: mr.mimeType || mime || 'audio/mp4', done: onDone });
      mr.ondataavailable = e => { if (e.data && e.data.size) voiceRec.chunks.push(e.data); };
      mr.start(250);
      voiceBar(anchor);
      voiceRec.timer = setInterval(() => {
        const s = (Date.now() - voiceRec.t0) / 1000;
        const el = document.getElementById('vrecT'); if (el) el.textContent = voiceLen(s);
        if (s >= VOICE_MAX_SECS) voiceFinish(true);
      }, 250);
    })
    .catch(() => onDone(null, 0, 'The microphone is switched off for this site. Allow it in your browser settings and try again.'));
}
function voiceFinish(send){
  const r = voiceRec; if (!r.mr) return;
  clearInterval(r.timer);
  const secs = (Date.now() - r.t0) / 1000, done = r.done, mr = r.mr;
  mr.onstop = () => {
    r.stream && r.stream.getTracks().forEach(t => t.stop());
    const blob = new Blob(r.chunks, { type: r.mime.split(';')[0] || 'audio/mp4' });
    Object.assign(voiceRec, { mr: null, chunks: [], stream: null, done: null });
    const bar = document.getElementById('vrec'); if (bar) bar.remove();
    if (!send) return;
    if (secs < 1 || !blob.size) { done && done(null, 0, 'That was too short to send.'); return; }
    done && done(blob, Math.round(secs), '');
  };
  try { mr.stop(); } catch (e) { mr.onstop(); }
}
function voiceBar(anchor){
  const old = document.getElementById('vrec'); if (old) old.remove();
  const el = document.createElement('div'); el.id = 'vrec';
  el.setAttribute('role', 'status');
  const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
  const where = r && r.width
    ? `left:${Math.round(r.left)}px;width:${Math.round(r.width)}px;top:${Math.round(r.top + r.height / 2 - 32)}px;`
    : 'left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom) + 14px);width:min(520px,calc(100% - 24px));';
  el.style.cssText = 'position:fixed;' + where + 'box-sizing:border-box;height:64px;'
    + 'z-index:1200;display:flex;align-items:center;gap:12px;padding:10px 10px 10px 14px;'
    + 'border-radius:999px;background:#fff;box-shadow:0 18px 40px -16px rgba(0,48,46,.45),0 0 0 1px rgba(0,64,61,.1);'
    + 'font:600 14px/1 Figtree,system-ui,sans-serif;color:#111';
  el.innerHTML = `<button type="button" aria-label="Cancel the voice note" onclick="voiceFinish(false)"
      style="flex:none;width:40px;height:40px;border-radius:50%;border:0;cursor:pointer;background:rgba(17,17,17,.06);
      color:#5a5a5a;display:grid;place-items:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>
    <span style="flex:none;width:10px;height:10px;border-radius:50%;background:#d0453a;animation:vrecPulse 1.2s ease-in-out infinite"></span>
    <span id="vrecT" style="font-variant-numeric:tabular-nums">0:00</span>
    <span style="flex:1;min-width:0;font-weight:500;color:#6b6b6b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Recording, up to ${VOICE_MAX_SECS / 60} min</span>
    <button type="button" aria-label="Send the voice note" onclick="voiceFinish(true)"
      style="flex:none;width:44px;height:44px;border-radius:50%;border:0;cursor:pointer;background:#006663;color:#fff;
      display:grid;place-items:center"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12 3 4l18 8-18 8 1.5-8Zm0 0H12"/></svg></button>
    <style>@keyframes vrecPulse{50%{opacity:.25}}@media (prefers-reduced-motion:reduce){#vrec span{animation:none!important}}</style>`;
  document.body.appendChild(el);
}
/* the server takes it the way it takes a photo: a data URL in JSON */
function voiceData(blob){
  return new Promise((res, rej) => { const fr = new FileReader();
    fr.onload = () => res(String(fr.result || '')); fr.onerror = () => rej('Could not read the recording');
    fr.readAsDataURL(blob); });
}

/* ── playing one back ──────────────────────────────────────────────────
   The address goes straight into the player inside the tap, because an
   iPhone refuses to start sound that begins anywhere else. The server
   answers byte ranges, which Safari insists on before it plays a note. */
let voiceAudio = null, voiceOn = '';
function voiceBubbleHTML(id, secs, at){
  if (voiceGone(at)) return `<span style="display:flex;align-items:center;gap:8px;opacity:.7;font:500 13px/1.4 var(--sans,system-ui)">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
    Voice note, gone after a week</span>`;
  return `<span class="cvoice" data-voice="${id}" style="display:flex;align-items:center;gap:10px;min-width:200px;padding:2px 0">
    <button type="button" onclick="event.stopPropagation();voicePlay('${id}')" aria-label="Play the voice note"
      style="flex:none;width:36px;height:36px;border-radius:50%;border:0;cursor:pointer;display:grid;place-items:center;
      background:rgba(127,127,127,.18);color:inherit">${voiceIcon(false)}</button>
    <span style="flex:1;height:4px;border-radius:2px;background:rgba(127,127,127,.3);overflow:hidden">
      <i style="display:block;height:100%;width:0;background:currentColor;border-radius:2px"></i></span>
    <span data-vlen style="flex:none;font:600 12px/1 var(--sans,system-ui);opacity:.75;font-variant-numeric:tabular-nums">${voiceLen(secs)}</span>
  </span>`;
}
const voiceIcon = on => on
  ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
  : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';
function voicePaint(id, playing){
  document.querySelectorAll('[data-voice="' + id + '"]').forEach(el => {
    const b = el.querySelector('button'); if (b) { b.innerHTML = voiceIcon(playing); b.setAttribute('aria-label', playing ? 'Pause' : 'Play the voice note'); }
    const a = voiceAudio && voiceOn === id ? voiceAudio : null;
    const i = el.querySelector('i'); if (i) i.style.width = a && a.duration ? Math.min(100, a.currentTime / a.duration * 100) + '%' : '0';
    const l = el.querySelector('[data-vlen]');
    if (l && a && isFinite(a.duration) && a.currentTime > 0) l.textContent = voiceLen(a.duration - a.currentTime);
  });
}
function voicePlay(id){
  if (!/^[a-zA-Z0-9]+$/.test(id)) return;
  if (voiceAudio && voiceOn === id) {
    if (voiceAudio.paused) voiceAudio.play().catch(() => {}); else voiceAudio.pause();
    return;
  }
  if (voiceAudio) { const was = voiceOn; voiceAudio.pause(); voiceAudio = null; voiceOn = ''; voicePaint(was, false); }
  const a = new Audio('/api/app/voice/' + id);
  a.preload = 'auto';
  voiceAudio = a; voiceOn = id;
  a.onplay = () => voicePaint(id, true);
  a.onpause = () => voicePaint(id, false);
  a.ontimeupdate = () => voicePaint(id, !a.paused);
  a.onended = () => { voicePaint(id, false); if (voiceOn === id) { voiceAudio = null; voiceOn = ''; }
    document.querySelectorAll('[data-voice="' + id + '"] i').forEach(i => { i.style.width = '0'; }); };
  a.onerror = () => { voicePaint(id, false); voiceAudio = null; voiceOn = '';
    document.querySelectorAll('[data-voice="' + id + '"] [data-vlen]').forEach(l => { l.textContent = 'Could not play'; }); };
  a.play().catch(() => {});
}
