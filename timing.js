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
/* A set that asks how many (max hold, build to, attempts, to failure) has
   no countdown: they stop when they stop. Its time still has to be counted
   somewhere, and Elliott's figure for it is a minute. */
const LHA_OPEN_SECS   = 60;
const LHA_WARM_GRP = /warm|pancake|mobility|wrist/i;
const LHA_HARD_GRP = /^(strength|press)$/i;

const lhaIsHold = d => /max hold|attempts|build to|to failure/i.test(String(d || ''));

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
/* ── stated beats parsed ───────────────────────────────────────────
   A drill can now carry its set count, its amount and its unit as three
   numbers the coach typed, rather than leaving all three to be read back
   out of a sentence. Where they are there they win; where they are not,
   the dose is parsed exactly as it always was, so a drill nobody has
   touched behaves the same as yesterday. */
function lhaSetsOf(it){
  it = it || {};
  const n = Number(it.sets);
  if(Number.isFinite(n) && n >= 1) return Math.round(n);
  return lhaSets(it.d);
}
/* one set's worth: how much, and whether that is reps or seconds */
function lhaAmount(it){
  it = it || {};
  const n = Number(it.amt);
  if(Number.isFinite(n) && n > 0 && (it.unit === 's' || it.unit === '')){
    return { n: Math.round(n), unit: it.unit };
  }
  const d = String(it.d || '');
  const nums = d.match(/\d+/g);
  if(nums && nums.length){
    return { n: Number(nums[nums.length - 1]),
             unit: /\bs(ec|econds)?\b|\d+\s*s\b/i.test(d) ? 's' : '' };
  }
  return { n: 0, unit: '' };
}
/* one set, in seconds. 0 means untimed: they stop when they stop. */
function lhaWork(it, grp){
  it = it || {};
  if(it.w) return it.w;                       /* a coach's own number wins */
  /* a stated amount in seconds is how long one set takes; a stated amount
     in reps says nothing about the clock and falls through to the rules */
  if(it.unit === 's' && Number(it.amt) > 0) return Math.round(Number(it.amt));
  if(it.unit === '' && Number(it.amt) > 0 && !it.w && !it.d) return LHA_REPS_SECS;
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
   takes time, so it is counted at a minute a set rather than nothing.
   A group marked warm is the rotating warm-up, which the player runs once
   through whatever the doses say, unless the coach set a number of sets:
   counting its doses made the dashboard a minute or more long a day. */
function lhaSessionSecs(groups){
  let secs = 0;
  const flat = [];
  (groups || []).forEach(g => (g.items || []).forEach(it =>
    flat.push({ it, grp: g.name, warm: !!g.warm })));
  flat.forEach((x, i) => {
    const n = x.warm ? Math.max(1, Number(x.it.sets) || 1) : lhaSetsOf(x.it);
    const w = lhaWork(x.it, x.grp) || LHA_OPEN_SECS;
    const r = lhaRest(x.it, x.grp, i, flat);
    secs += n * w + (n - 1) * r;
    if(i < flat.length - 1) secs += r;
  });
  return secs;
}
const lhaMins = secs => Math.round(secs / 60);

/* ── the rotating warm-up ─────────────────────────────────────────────
   One warm-up for a whole programme instead of one written into every
   day. The drills marked essential open every day; the rest take turns,
   so each day gets a different few and the same mix only comes back once
   the list has gone round. Worked out from the date and the day, so a plan
   cached for a gym with no signal still rotates, and the dashboard's
   preview says exactly what the app will do.
   warm is { n, items:[{ v, must, ... }] }; dateKey is YYYY-MM-DD. */
function lhaWarmPick(warm, dayIdx, dateKey){
  if(!warm || !Array.isArray(warm.items)) return [];
  const items = warm.items.filter(x => x && x.v);
  const must = items.filter(x => x.must), rest = items.filter(x => !x.must);
  const n = Math.max(must.length, Math.min(items.length, Number(warm.n) || items.length));
  const want = Math.min(rest.length, n - must.length);
  const picks = [];
  if(want > 0){
    const dayNo = Math.floor(Date.parse(String(dateKey) + 'T12:00:00Z') / 864e5) || 0;
    const start = ((((dayNo + (dayIdx | 0)) * want) % rest.length) + rest.length) % rest.length;
    for(let i = 0; i < want; i++) picks.push(rest[(start + i) % rest.length]);
  }
  const chosen = new Set(must.concat(picks));
  /* in the order the coach put them, which is the order a warm-up runs */
  return items.filter(x => chosen.has(x));
}
