/* ══════════════════════════════════════════════════════════════
   When a 1-2-1 can be booked

   The room is Arch 2 at OverGravity, and its bookings are in OverGravity's
   Google calendar. Elliott can hire it unless it is booked as a full hire,
   or two bookings already share it. This reads that calendar, from its
   private iCal address (pasted into the dashboard by Elliott and kept in
   the database, never in this file: the repo is public), works out those
   times, takes off his own busy calendars, the 1-2-1s and classes already
   booked and anything held at a checkout, and offers what is left inside
   the hours he has said he offers.

   Plain functions with no fetch and no database, so they can be tested on
   their own. app.mjs does the reading and the remembering.
   ══════════════════════════════════════════════════════════════ */

export const SLOT_TZ = 'Europe/London';
const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;

/* ── wall clock time in a zone, and back ─────────────────────────── */
const FMT = new Map();
function fmtFor(tz) {
  if (!FMT.has(tz)) {
    try {
      FMT.set(tz, new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }));
    } catch { FMT.set(tz, fmtFor(SLOT_TZ)); }
  }
  return FMT.get(tz);
}
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
/* the date and time on a clock in that zone at this instant */
export function wall(utc, tz = SLOT_TZ) {
  const p = {};
  for (const x of fmtFor(tz).formatToParts(new Date(utc))) p[x.type] = x.value;
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second, wd: WD[p.weekday] };
}
const offsetAt = (utc, tz) => { const w = wall(utc, tz); return Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s) - Math.floor(utc / 1000) * 1000; };
/* the instant a clock in that zone shows this date and time. Across the
   spring change a time that never happens moves on an hour, as Google does. */
export function zoned(y, mo, d, h = 0, mi = 0, s = 0, tz = SLOT_TZ) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const o1 = offsetAt(guess, tz);
  let utc = guess - o1;
  const o2 = offsetAt(utc, tz);
  if (o2 !== o1) utc = guess - o2;
  return utc;
}
const addDays = (y, mo, d, n) => { const t = new Date(Date.UTC(y, mo - 1, d + n)); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; };
const dowOf = (y, mo, d) => new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
const dimOf = (y, mo) => new Date(Date.UTC(y, mo, 0)).getUTCDate();

/* ── reading an iCal file ────────────────────────────────────────── */
function lineOf(raw) {
  /* NAME;PARAM=a;PARAM="b:c":value, the first colon outside quotes */
  let q = false, i = 0;
  for (; i < raw.length; i++) { const c = raw[i]; if (c === '"') q = !q; else if (c === ':' && !q) break; }
  const head = raw.slice(0, i), value = raw.slice(i + 1);
  const bits = head.split(';');
  const params = {};
  for (const b of bits.slice(1)) { const j = b.indexOf('='); if (j > 0) params[b.slice(0, j).toUpperCase()] = b.slice(j + 1).replace(/^"|"$/g, ''); }
  return { name: bits[0].toUpperCase(), params, value };
}
const unesc = v => String(v || '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
/* a DTSTART, DTEND, EXDATE or RECURRENCE-ID value: { utc, allDay, local } */
function when(value, params, calTz) {
  const v = String(value || '').trim();
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  if (!m[4] || params.VALUE === 'DATE') {
    return { allDay: true, tz: calTz, local: { y, mo, d, h: 0, mi: 0, s: 0 }, utc: zoned(y, mo, d, 0, 0, 0, calTz) };
  }
  const h = +m[4], mi = +m[5], s = +(m[6] || 0);
  if (m[7]) return { allDay: false, tz: 'UTC', local: { y, mo, d, h, mi, s }, utc: Date.UTC(y, mo - 1, d, h, mi, s) };
  const tz = params.TZID || calTz;
  return { allDay: false, tz, local: { y, mo, d, h, mi, s }, utc: zoned(y, mo, d, h, mi, s, tz) };
}
function duration(v) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(v || '').trim());
  if (!m) return null;
  const n = k => Number(m[k] || 0);
  return (m[1] === '-' ? -1 : 1) * (n(2) * 7 * DAY + n(3) * DAY + n(4) * HOUR + n(5) * MIN + n(6) * 1000);
}

/* Every booking in the file that touches [from, to), repeats worked out.
   A repeat it cannot work out exactly (a monthly rule by position, say) is
   kept free of 1-2-1s at its time of day on every day it might fall, and
   marked approx: offering a time that turns out taken is worse than
   offering one fewer. */
export function parseIcs(text, { from, to } = {}) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const calTzLine = lines.find(l => /^X-WR-TIMEZONE[:;]/i.test(l));
  let calTz = calTzLine ? lineOf(calTzLine).value.trim() : SLOT_TZ;
  try { fmtFor(calTz); new Intl.DateTimeFormat('en-GB', { timeZone: calTz }); } catch { calTz = SLOT_TZ; }
  const raw = [];
  let cur = null, depth = 0;
  for (const l of lines) {
    if (/^BEGIN:VEVENT$/i.test(l)) { cur = { props: [] }; depth = 0; continue; }
    if (!cur) continue;
    if (/^BEGIN:/i.test(l)) { depth++; continue; }      /* a VALARM inside the event */
    if (/^END:VEVENT$/i.test(l)) { raw.push(cur); cur = null; continue; }
    if (/^END:/i.test(l)) { depth = Math.max(0, depth - 1); continue; }
    if (depth) continue;
    if (l.trim()) cur.props.push(lineOf(l));
  }
  const lo = Number.isFinite(from) ? from : -Infinity, hi = Number.isFinite(to) ? to : Infinity;
  const out = [], overrides = new Map();
  const one = (ev, p) => {
    const get = n => p.find(x => x.name === n);
    const all = n => p.filter(x => x.name === n);
    const ds = get('DTSTART'); if (!ds) return null;
    const start = when(ds.value, ds.params, calTz); if (!start) return null;
    const de = get('DTEND'), du = get('DURATION');
    let len = 0;
    if (de) { const e = when(de.value, de.params, calTz); if (e) len = e.utc - start.utc; }
    else if (du) len = duration(du.value) || 0;
    else len = start.allDay ? DAY : 0;
    return { uid: (get('UID') || {}).value || '', title: unesc((get('SUMMARY') || {}).value || ''),
      start, len: Math.max(0, len), status: String((get('STATUS') || {}).value || '').toUpperCase(),
      transparent: String((get('TRANSP') || {}).value || '').toUpperCase() === 'TRANSPARENT',
      rrule: (get('RRULE') || {}).value || '', exdates: all('EXDATE'), rid: get('RECURRENCE-ID') };
  };
  const evs = raw.map(r => one(r, r.props)).filter(Boolean);
  /* a changed or cancelled single date of a repeat replaces that date */
  for (const e of evs) if (e.rid) {
    const r = when(e.rid.value, e.rid.params, calTz);
    if (r) overrides.set(e.uid + '|' + r.utc, e);
  }
  const push = (e, s, approx) => {
    const end = s + (e.len || (e.start.allDay ? DAY : 0));
    if (e.status === 'CANCELLED') return;
    if (end <= lo || s >= hi) return;
    out.push({ uid: e.uid, title: e.title, start: s, end, allDay: e.start.allDay, transparent: e.transparent, ...(approx ? { approx: true } : {}) });
  };
  for (const e of evs) {
    if (e.rid) { push(e, e.start.utc); continue; }
    if (!e.rrule) { push(e, e.start.utc); continue; }
    const ex = new Set();
    for (const x of e.exdates) for (const v of String(x.value).split(',')) { const w = when(v, x.params, calTz); if (w) ex.add(w.allDay ? 'd' + w.local.y + '-' + w.local.mo + '-' + w.local.d : w.utc); }
    const occ = expand(e, lo, hi, calTz);
    for (const o of occ.list) {
      if (ex.has(o.utc) || ex.has('d' + o.y + '-' + o.mo + '-' + o.d)) continue;
      if (overrides.has(e.uid + '|' + o.utc)) continue;
      push(e, o.utc, occ.approx);
    }
  }
  out.sort((a, b) => a.start - b.start);
  return out;
}

/* the dates a repeat falls on, in the wall clock of its own zone, so a
   6pm class stays at 6pm across the clocks changing */
const BYDAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
function expand(e, lo, hi, calTz) {
  const R = {};
  for (const kv of String(e.rrule).split(';')) { const i = kv.indexOf('='); if (i > 0) R[kv.slice(0, i).toUpperCase()] = kv.slice(i + 1); }
  const freq = R.FREQ, step = Math.max(1, Number(R.INTERVAL) || 1);
  const count = R.COUNT ? Number(R.COUNT) : Infinity;
  let until = Infinity;
  if (R.UNTIL) { const u = when(R.UNTIL, {}, e.start.allDay ? calTz : (e.start.tz === 'UTC' ? 'UTC' : e.start.tz)); if (u) until = u.allDay ? u.utc + DAY - 1 : u.utc; }
  const L = e.start.local, tz = e.start.allDay ? calTz : e.start.tz;
  const at = (y, mo, d) => ({ y, mo, d, utc: e.start.allDay ? zoned(y, mo, d, 0, 0, 0, calTz) : (tz === 'UTC' ? Date.UTC(y, mo - 1, d, L.h, L.mi, L.s) : zoned(y, mo, d, L.h, L.mi, L.s, tz)) });
  const days = (R.BYDAY || '').split(',').filter(Boolean);
  const plainDays = days.map(x => /^(SU|MO|TU|WE|TH|FR|SA)$/.test(x) ? BYDAY[x] : null);
  const supported = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)
    && !R.BYSETPOS && !R.BYHOUR && !R.BYMINUTE && !R.BYWEEKNO && !R.BYYEARDAY
    && !(freq !== 'MONTHLY' && days.some((x, i) => plainDays[i] === null))
    && !(freq === 'YEARLY' && (R.BYMONTH || R.BYMONTHDAY || days.length));
  const list = [];
  const end = Math.min(hi, until);
  /* whole days from the first date to a day before the window, for a
     repeat with no count to keep: walking every date of a class that has
     run since 2019 was most of the time this took */
  const behind = Number.isFinite(lo) && count === Infinity ? Math.max(0, Math.floor((lo - e.start.utc) / DAY) - 8) : 0;
  if (!supported) {
    /* every day it could fall on, at its own time of day */
    let [y, mo, d] = addDays(L.y, L.mo, L.d, behind);
    for (let i = 0; i < 4000; i++) {
      const o = at(y, mo, d);
      if (o.utc > end) break;
      if (o.utc >= e.start.utc && o.utc + e.len > lo) list.push(o);
      [y, mo, d] = addDays(y, mo, d, 1);
    }
    return { list, approx: true };
  }
  const months = (R.BYMONTH || '').split(',').filter(Boolean).map(Number);
  let n = 0, guard = 0;
  const take = o => {
    if (o.utc < e.start.utc || (months.length && !months.includes(o.mo))) return true;
    if (o.utc > end || n >= count) return false;
    n++; if (o.utc + e.len > lo) list.push(o); return true; };
  if (freq === 'DAILY') {
    let [y, mo, d] = addDays(L.y, L.mo, L.d, Math.floor(behind / step) * step);
    while (guard++ < 40000) {
      if (!plainDays.length || plainDays.includes(dowOf(y, mo, d))) { if (!take(at(y, mo, d))) break; }
      [y, mo, d] = addDays(y, mo, d, step);
    }
  } else if (freq === 'WEEKLY') {
    const wkst = BYDAY[R.WKST || 'MO'] ?? 1;
    const want = plainDays.length ? plainDays : [dowOf(L.y, L.mo, L.d)];
    /* the first day of DTSTART's week */
    let [y, mo, d] = addDays(L.y, L.mo, L.d, -((dowOf(L.y, L.mo, L.d) - wkst + 7) % 7) + Math.floor(behind / (7 * step)) * 7 * step);
    let go = true;
    while (go && guard++ < 6000) {
      for (let k = 0; k < 7 && go; k++) {
        const [yy, mm, dd] = addDays(y, mo, d, k);
        if (want.includes(dowOf(yy, mm, dd))) go = take(at(yy, mm, dd));
      }
      [y, mo, d] = addDays(y, mo, d, 7 * step);
    }
  } else if (freq === 'MONTHLY') {
    let y = L.y, mo = L.mo;
    const mdays = (R.BYMONTHDAY || '').split(',').filter(Boolean).map(Number);
    let go = true;
    while (go && guard++ < 1500) {
      const dim = dimOf(y, mo), hits = [];
      if (mdays.length) for (const md of mdays) { const dd = md > 0 ? md : dim + md + 1; if (dd >= 1 && dd <= dim) hits.push(dd); }
      else if (days.length) for (const x of days) {
        const m = /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/.exec(x); if (!m) continue;
        const wd = BYDAY[m[2]], all = [];
        for (let dd = 1; dd <= dim; dd++) if (dowOf(y, mo, dd) === wd) all.push(dd);
        if (!m[1]) hits.push(...all);
        else { const k = Number(m[1]); const dd = k > 0 ? all[k - 1] : all[all.length + k]; if (dd) hits.push(dd); }
      } else if (L.d <= dim) hits.push(L.d);
      for (const dd of [...new Set(hits)].sort((a, b) => a - b)) { go = take(at(y, mo, dd)); if (!go) break; }
      mo += step; while (mo > 12) { mo -= 12; y++; }
    }
  } else {
    let y = L.y;
    while (guard++ < 200) {
      if (!(L.mo === 2 && L.d === 29 && dimOf(y, 2) < 29)) { if (!take(at(y, L.mo, L.d))) break; }
      y += step;
    }
  }
  return { list, approx: false };
}

/* ── which times are free ────────────────────────────────────────── */
/* "full hire, private" into words to look for in a booking's title */
export const ruleWords = v => (Array.isArray(v) ? v : String(v || '').split(','))
  .map(x => String(x).trim().toLowerCase()).filter(Boolean).slice(0, 12);
/* how Arch 2's calendar reads one booking, for the dashboard to show */
export function roomRead(ev, rule) {
  if (ev.transparent) return 'free';
  const t = String(ev.title || '').toLowerCase();
  return ruleWords(rule && rule.words).some(w => t.includes(w)) ? 'full' : 'booking';
}
/* the most bookings overlapping at any one moment inside [s, e) */
function busiest(evs, s, e) {
  const pts = [];
  for (const x of evs) { const a = Math.max(x.start, s), b = Math.min(x.end, e); if (a < b) { pts.push([a, 1], [b, -1]); } }
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  let n = 0, top = 0;
  for (const [, d] of pts) { n += d; if (n > top) top = n; }
  return top;
}
const overlaps = (x, s, e) => x.start < e && x.end > s;
/* Why a time cannot be offered, or '' when it can. ctx:
   room: Arch 2's bookings; busy: Elliott's own; taken: 1-2-1s, classes and
   holds, as { start, end, what }; rule: { words, max }; earliest: no start
   before this. The room's bookings are kept as they are, and the rule is
   applied here, so the dashboard can show why. */
export function slotWhy(s, e, ctx) {
  if (s < (ctx.earliest || 0)) return 'too soon';
  const t = (ctx.taken || []).find(x => overlaps(x, s, e));
  if (t) return t.what || 'taken';
  if ((ctx.busy || []).some(x => !x.transparent && overlaps(x, s, e))) return 'your calendar';
  const room = (ctx.room || []).filter(x => overlaps(x, s, e) && roomRead(x, ctx.rule) !== 'free');
  if (room.some(x => roomRead(x, ctx.rule) === 'full')) return 'Arch 2 full hire';
  const max = Math.max(1, Number(ctx.rule && ctx.rule.max) || 2);
  if (busiest(room, s, e) >= max) return `Arch 2 has ${max} bookings`;
  return '';
}
/* Hours offered, as { 0..6: [[startMin, endMin], ...] } by day of the week
   (0 is Sunday) in London time. Read from what the dashboard saves:
   "18:00-21:00, 7:00-9:00" for each day. */
export function readHours(h) {
  const out = {};
  for (let wd = 0; wd < 7; wd++) {
    const v = h && (h[wd] != null ? h[wd] : h[String(wd)]);
    const spans = Array.isArray(v) ? v : String(v || '').split(/[,;]+/);
    out[wd] = spans.map(sp => {
      if (Array.isArray(sp)) return sp.map(Number);
      const m = /^\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:-|to|\u2013)\s*(\d{1,2})(?:[:.](\d{2}))?\s*$/i.exec(String(sp));
      return m ? [Number(m[1]) * 60 + Number(m[2] || 0), Number(m[3]) * 60 + Number(m[4] || 0)] : null;
    }).filter(x => x && x[0] >= 0 && x[1] <= 24 * 60 && x[1] > x[0]).slice(0, 6);
  }
  return out;
}
export const hoursText = h => { const r = readHours(h); const t = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.map(([a, b]) => t(a) + '-' + t(b)).join(', ')])); };
/* Every start time that can be offered, earliest first: inside the hours,
   on the step, the whole length free. */
export function freeSlots({ now = Date.now(), days = 21, step = 30, lenMin = 60, hours, ...ctx }) {
  const H = readHours(hours), len = Math.max(15, Number(lenMin) || 60) * MIN, st = Math.max(15, Number(step) || 30);
  const out = [];
  const w0 = wall(now);
  for (let i = 0; i < Math.min(60, Math.max(1, days)); i++) {
    const [y, mo, d] = addDays(w0.y, w0.mo, w0.d, i);
    for (const [a, b] of H[dowOf(y, mo, d)] || []) {
      for (let m = a; m + len / MIN <= b; m += st) {
        const s = zoned(y, mo, d, Math.floor(m / 60), m % 60, 0, SLOT_TZ), e = s + len;
        if (!slotWhy(s, e, ctx)) out.push({ start: s, end: e });
      }
    }
  }
  return out;
}
