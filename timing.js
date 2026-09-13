/* How long a drill takes, and a session made of them.

   The rules Elliott set: a warm-up is thirty seconds, a timed hold is the
   time asked for plus ten to get into and out of it, a set of reps is
   forty-five, and "build to" is untimed because the point of it is to stop
   when you stop.

   Pure functions, no app state, so the coach dashboard can work out what a
   session actually comes to without a second copy of the arithmetic going
   quietly out of step with the app's. */
const LHA_WARMUP_SECS = 30;
const LHA_SETUP_SECS  = 10;
const LHA_REPS_SECS   = 45;
const LHA_WARM_GRP = /warm|pancake|mobility|wrist/i;
const LHA_HARD_GRP = /^(strength|press)$/i;

const lhaIsHold = d => /max hold|attempts|build to/i.test(String(d || ''));

/* the seconds named in a dose: "30s" is thirty, "30s each way" is sixty */
function lhaDoseSecs(d){
  const t = String(d || '');
  const m = /(\d+)\s*(?:s\b|sec)/i.exec(t);
  if(!m) return 0;
  const n = +m[1];
  return /each (?:way|side|leg|arm)/i.test(t) ? n * 2 : n;
}
/* how many sets a dose asks for: "3 × 8" is three, "2 sets · ..." is two */
function lhaSets(dose){
  let m = /^\s*(\d+)\s*[×x]/.exec(String(dose || ''));  if(m) return +m[1];
  m = /^\s*(\d+)\s*sets?\b/i.exec(String(dose || ''));  if(m) return +m[1];
  return 1;
}
/* one set, in seconds. 0 means untimed: they stop when they stop. */
function lhaWork(it, grp){
  it = it || {};
  if(it.w) return it.w;                       /* a coach's own number wins */
  if(LHA_WARM_GRP.test(String(grp || it.grp || ''))) return LHA_WARMUP_SECS;
  const d = String(it.d || '');
  if(lhaIsHold(d)) return 0;
  const held = lhaDoseSecs(d);
  return held ? held + LHA_SETUP_SECS : LHA_REPS_SECS;
}
/* the rest after one set. Decided by the block, never by the drill's name:
   matching names put mobility work on a ninety second strength rest. */
function lhaRest(it, grp, i, list){
  it = it || {};
  if(it.r != null) return it.r;
  const g = String(grp || it.grp || '').trim();
  const t = ((it.n || '') + ' ' + (it.d || '')).toLowerCase();
  if(Array.isArray(list) && i != null && i < 4
     && LHA_WARM_GRP.test(String((list[i] && list[i].grp) || ''))) return 0;
  if(LHA_WARM_GRP.test(g)) return 10;
  if(LHA_HARD_GRP.test(g)) return 90;
  if(/entries|build to/.test(t)) return 60;
  return 35;
}
/* A whole session, in seconds. Takes the blocks as the programme stores
   them, expands each drill by the sets its dose asks for, and counts the
   rest between sets as well as between drills. An untimed drill still
   takes time, so it is counted at the reps figure rather than nothing. */
function lhaSessionSecs(groups){
  let secs = 0;
  const flat = [];
  (groups || []).forEach(g => (g.items || []).forEach(it =>
    flat.push({ it, grp: g.name })));
  flat.forEach((x, i) => {
    const n = lhaSets(x.it.d);
    const w = lhaWork(x.it, x.grp) || LHA_REPS_SECS;
    const r = lhaRest(x.it, x.grp, i, flat);
    secs += n * w + (n - 1) * r;
    if(i < flat.length - 1) secs += r;
  });
  return secs;
}
const lhaMins = secs => Math.round(secs / 60);
