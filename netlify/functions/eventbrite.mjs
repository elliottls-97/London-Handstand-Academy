/* ══════════════════════════════════════════════════════════════
   Eventbrite: the same classes, sold there as well (25 Nov 2026)

   A class can be listed on Eventbrite from the dashboard. This site stays
   the one list of who is coming: Eventbrite's orders come back by webhook
   (and by the hourly check, for any the webhook missed) into the class's
   bookings, and what Eventbrite may still sell is set from what is left
   here after every change. So the two never sell the same place, and the
   places held for ClassBento are sold by neither.

   Plain functions with no fetch and no database, so they can be tested on
   their own, as slots.mjs is. app.mjs does the asking and the remembering.
   The private token is EVENTBRITE_TOKEN in Netlify's environment, set by
   Elliott himself; it never appears here (the repo is public).
   ══════════════════════════════════════════════════════════════ */

export const EB_API = 'https://www.eventbriteapi.com/v3';
export const EB_TZ = 'Europe/London';
/* Sports & Fitness, and the format "Class, Training, or Workshop" */
export const EB_CATEGORY = '108';
export const EB_FORMAT = '9';
/* what the webhook is told about: a new order, a refund, a change to an
   order or to the one person on it (a cancel arrives as the last of these) */
export const EB_ACTIONS = 'order.placed,order.refunded,order.updated,attendee.updated';

const ms = v => (v ? new Date(v).getTime() : 0);
const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* Eventbrite takes UTC to the second, with no milliseconds */
export const ebUtc = t => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');

/* ── the place ─────────────────────────────────────────────────────
   One Eventbrite venue per place, made once and remembered. OverGravity
   unless a class says it is somewhere else. */
export const ebVenueKey = w => (!w || !w.place || /overgravity/i.test(w.place))
  ? 'overgravity' : String(w.place).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'elsewhere';
export function ebVenueBody(w) {
  if (ebVenueKey(w) === 'overgravity') return { venue: { name: 'OverGravity',
    address: { address_1: 'Arches 160 to 163, Sutton Street', city: 'London', postal_code: 'E1 0DB', country: 'GB' } } };
  const p = String(w.place).trim();
  return { venue: { name: p.slice(0, 80), address: { address_1: p.slice(0, 120), city: 'London', country: 'GB' } } };
}

/* ── the class page's own words and photos ─────────────────────────
   The All Levels and Calisthenics dates are written once, on the class
   page (handstand-class.html), not date by date in the dashboard, so their
   listings take the page's words and photos (Elliott, 25 Nov 2026): the
   level, who teaches it, the stations, two of the reviews. These are the
   page's own lines; change them there and here together. A date's own
   description or topic, when it has one, is added on top. Anything else
   (a workshop) is described by its own fields alone. */
export const ebKind = w => { const t = String((w && w.title) || '');
  return /all levels|handstand and calisthenics/i.test(t) ? 'handstand' : /calisthenics/i.test(t) ? 'cali' : ''; };
export const EB_PAGE = {
  handstand: {
    summary: 'An hour of handstands, grouped by level: from your first kick up to a press or one arm. A small group at OverGravity, Shadwell.',
    intro: 'An hour of handstands, grouped by level: from your first kick up to a press or one arm. A small group, so you get seen.',
    coach: 'Taught by Elliott Staley: nearly a decade of handstand practice, from yoga, calisthenics and movement coaching. He coaches complete beginners through to one arm work.',
  },
  cali: {
    summary: 'An hour of calisthenics: pull ups to muscle ups and handstand push ups, on the bars and rings. A small group at OverGravity, Shadwell.',
    intro: 'An hour of calisthenics: pull ups to muscle ups and handstand push ups, on the bars and rings. A small group, so you get seen.',
    coach: 'Taught by Suryava: over eight years in gymnastics, training it and coaching it. A gymnast\'s discipline: proper progressions and honest assessment.',
  },
};
export const EB_REVIEWS = [
  ['Kate', 'Really enjoyed the handstand workshop with Elliott and Suryava. The group was small, only 6 or 7 people so had plenty of attention from the two coaches.'],
  ['Anna', 'Both great teachers with a lot of experience. Their advice was great for all levels as they adjusted depending on the student. Also felt very safe in class.'],
];
/* The photos, from the class page (assets/site), with their sizes for the
   2:1 crop Eventbrite's main image needs; y is where the crop starts, so a
   tall photo keeps the people rather than the ceiling. */
export const EB_PHOTOS = {
  'class-upside-down-wide.jpg': { w: 995, h: 800, y: 150 },
  'arch2-group-kick-ups.jpg': { w: 900, h: 1600, y: 640 },
  'arch2-coach-spot-rig.jpg': { w: 900, h: 1600, y: 300 },
  'class-group-overgravity.jpg': { w: 1000, h: 957 },
  'arch2-spotted-handstand.jpg': { w: 900, h: 1600 },
};
/* the cover by the date's room: the purple room for a handstand date in
   Arch 1, the group kicking up in Arch 2, the rig for calisthenics; then
   the group after class and a spotted handstand under the words */
export function ebPhotos(w, room) {
  const k = ebKind(w);
  if (!k) return { cover: '', more: [] };
  const cover = k === 'cali' ? 'arch2-coach-spot-rig.jpg' : room === 'Arch 2' ? 'arch2-group-kick-ups.jpg' : 'class-upside-down-wide.jpg';
  return { cover, more: ['class-group-overgravity.jpg', 'arch2-spotted-handstand.jpg'] };
}
export function ebCrop(file) {
  const p = EB_PHOTOS[file]; if (!p) return null;
  const h = Math.floor(p.w / 2), y = p.y != null ? p.y : Math.round((p.h - h) / 2);
  /* exactly 2:1, so an odd width loses its last pixel */
  return { top_left: { x: 0, y: Math.max(0, Math.min(p.h - h, y)) }, width: 2 * h, height: h };
}

/* ── the event ─────────────────────────────────────────────────────
   Eventbrite's line under the title is 140 characters at most: the one
   line on who it is for, else the first sentence of the description. */
export function ebSummary(w) {
  const pick = String((w && w.who) || '').trim() || String((w && w.desc) || '').trim().split(/(?<=[.!?])\s+/)[0]
    || (EB_PAGE[ebKind(w)] || {}).summary || '';
  const s = pick.replace(/\s+/g, ' ');
  return s.length <= 140 ? s : s.slice(0, 139).replace(/\s+\S*$/, '') + '.';
}
export function ebEventBody(w, { venueId, mins }) {
  const start = ms(w.when), end = start + Math.max(15, Number(mins) || 60) * 60e3;
  return { event: {
    name: { html: escH(String(w.title || '').slice(0, 75)) },
    summary: ebSummary(w),
    start: { timezone: EB_TZ, utc: ebUtc(start) },
    end: { timezone: EB_TZ, utc: ebUtc(end) },
    currency: 'GBP', venue_id: String(venueId), online_event: false,
    listed: true, shareable: true, invite_only: false,
    /* "places left" is shown on the site once a few are taken; Eventbrite
       would show the count from the first ticket, so it does not show it */
    show_remaining: false,
    category_id: EB_CATEGORY, format_id: EB_FORMAT } };
}
/* The words on the listing, as one block of HTML. Built from the class's
   own fields, so the dashboard stays the place they are written. parts:
   { mins, where, coachLine, waiver } worked out by app.mjs. */
export function ebDescHTML(w, parts) {
  const p = parts || {}, pg = EB_PAGE[ebKind(w)];
  const para = t => t ? `<p>${t}</p>` : '';
  const og = !w.place || /overgravity/i.test(w.place);
  return [
    pg ? para(escH(pg.intro)) : '',
    para(escH(String(w.desc || '').trim())),
    w.topic ? para(`<strong>This week:</strong> ${escH(w.topic)}.`) : '',
    w.who ? para(`<strong>Who it is for:</strong> ${escH(w.who)}`) : '',
    /* the page names who teaches each class; a date with its own coach says so instead */
    para(`<strong>How long:</strong> ${escH(String(p.mins || 60))} minutes.${w.coach || !pg ? ' ' + escH(p.coachLine || '') : ''}`.trim()),
    pg && !w.coach ? para(escH(pg.coach)) : '',
    para(`<strong>Where:</strong> ${escH(p.where || 'OverGravity, Arches 160 to 163, Sutton Street, London E1 0DB')}.${og ? ' Nearest stations: Shadwell (Overground and DLR) and Wapping. Changing rooms and a caf\u00e9 to wait in.' : ''}`),
    para('<strong>What to bring:</strong> normal training kit you can move in, and a water bottle. Bare feet or socks, no shoes on the mats. Arrive ten minutes early so we start on time.'),
    pg ? '<p><strong>What people say</strong></p>' + EB_REVIEWS.map(([n, q]) => para(`<em>"${escH(q)}"</em> ${escH(n)}`)).join('') : '',
    para(`<strong>Can't make it?</strong> Reply to your reminder email up to 24 hours before and we will move your place to another date, free. Refunds follow the refund policy on this page.`),
    p.waiver ? para(`Everyone trains under our participation waiver: <a href="${escH(p.waiver)}">${escH(p.waiver.replace(/^https?:\/\//, ''))}</a>. Please read it before the day.`) : '',
    para('London Handstand Academy will email you a reminder the day before with everything you need.'),
  ].filter(Boolean).join('');
}
/* the description as Eventbrite takes it: the words, then any photos */
export function ebModules(html, imageIds) {
  const mods = [{ type: 'text', data: { body: { text: html, alignment: 'left' } } }];
  for (const id of imageIds || []) if (id) mods.push({ type: 'image', data: { image: { image_id: String(id) } } });
  return mods;
}
/* a short fingerprint, so the words are only sent again when they change
   (and anything Elliott adds on Eventbrite itself is left alone otherwise) */
export function ebHash(s) {
  let h = 5381; const t = String(s || '');
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/* ── the tickets ───────────────────────────────────────────────────
   One ticket, "Place", at the price the site charges; and while an early
   bird is on, a second, "Early bird", at the early price until it ends,
   with "Place" at the later price going on sale at that moment. Only one
   of the two is ever on sale, so each can be offered everything that is
   left without the two together selling more.

   left   what this site and Eventbrite may still sell between them
          (wsSale(w, list).left in app.mjs, the ClassBento hold kept back)
   open   the class is on the site, not stopped on Eventbrite, still to come
   tcs    { std, early } the ticket ids made already
   filed  { ticketId: n } live Eventbrite bookings here, by ticket
   sold   { ticketId: n } what Eventbrite says it has sold, by ticket
   stdStart  when "Place" was last set to go on sale, if in the future

   A ticket may sell what it has sold plus what is left, less any of its
   orders not filed here yet (taking the larger of what Eventbrite counts
   and what is filed keeps an unfiled order from being sold twice). One a
   person per order: each order is one named place here. A ticket that
   must sell nothing is hidden, as Eventbrite will not take a quantity of
   none. Fees go on top for the buyer (Elliott, 25 Nov 2026). */
export function ebTicketPlan(w, { left, open, now, tcs, filed, sold, stdStart }) {
  const t = Number(now) || Date.now(), start = ms(w.when);
  const T = tcs || {}, F = filed || {}, S = sold || {};
  const price = Math.max(0, Math.round(Number(w.price) || 0));
  const until = w.early ? ms(w.early.until) : 0;
  const early = !!(w.early && until > t && until < start && Math.round(Number(w.early.then) || 0) > price);
  /* the later price as soon as the early bird is over, before the site
     has written it in as the price (app.mjs wsRoll does that on its next
     request), or "Place" would drop back to the early price */
  const stdPrice = w.early && Math.round(Number(w.early.then) || 0) > price ? Math.round(Number(w.early.then)) : price;
  const room = id => Math.max(S[id] || 0, (F[id] || 0) + Math.max(0, Number(left) || 0));
  const qty = (id, on) => {
    if (!on) return { quantity_total: Math.max(1, S[id] || 0), hidden: true };
    const q = room(id);
    return q > 0 ? { quantity_total: q, hidden: false } : { quantity_total: 1, hidden: true };
  };
  const cost = p => p > 0 ? { free: false, cost: 'GBP,' + p } : { free: true };
  const common = { include_fee: false, split_fee_with_organizer: false, minimum_quantity: 1, maximum_quantity: 1, sales_end: ebUtc(start) };
  const out = [];
  /* the early one first, so a new event lists it at the top */
  if (early || T.early) {
    const id = T.early || '';
    if (early) out.push({ key: 'early', id, make: !id, body: { ticket_class: { name: 'Early bird', ...cost(price), ...common,
      sales_end: ebUtc(until), ...qty(id, open) } } });
    else out.push({ key: 'early', id, make: false, body: { ticket_class: qty(id, false) } });
  }
  const sid = T.std || '';
  const std = { name: 'Place', ...cost(stdPrice), ...common, ...qty(sid, open) };
  let nextStart = 0;
  if (early) { std.sales_start = ebUtc(until); nextStart = until; }
  /* an early bird ended early: "Place" was waiting for it, and goes on sale now */
  else if (Number(stdStart) > t) std.sales_start = ebUtc(t - 60e3);
  out.push({ key: 'std', id: sid, make: !sid, body: { ticket_class: std } });
  return { tickets: out, stdStart: nextStart };
}

/* ── orders coming back ────────────────────────────────────────────
   One Eventbrite order as the place it should be here: live while it is
   placed and the person on it has not been cancelled or refunded. paid is
   the ticket's own price, without the fees the buyer paid on top. */
export function ebOrderPlace(order) {
  const o = order || {}, att = Array.isArray(o.attendees) ? o.attendees : [];
  const a = att[0] || {}, pr = a.profile || {};
  const still = att.filter(x => x && !x.cancelled && !x.refunded && !/deleted|not attending/i.test(String(x.status || '')));
  const status = String(o.status || '').toLowerCase();
  const val = c => Math.max(0, Math.round(Number(c && c.value) || 0));
  const paid = val(o.costs && o.costs.base_price) || val(a.costs && a.costs.base_price);
  return {
    id: String(o.id || ''), event: String(o.event_id || a.event_id || ''),
    email: String(o.email || pr.email || '').trim().toLowerCase(),
    name: String(o.name || [o.first_name, o.last_name].filter(Boolean).join(' ') || pr.name || '').trim().slice(0, 60),
    live: status === 'placed' && (!att.length || still.length > 0),
    refunded: status === 'refunded' || att.some(x => x && x.refunded),
    paid, tc: String(a.ticket_class_id || ''), n: still.length || (att.length ? 0 : 1),
    at: ms(o.created) || 0,
  };
}
/* what a webhook is about: only Eventbrite's own API addresses are
   followed, so a forged call can do no more than make us look up a real
   order with our own token */
export function ebHookTarget(apiUrl) {
  const u = String(apiUrl || '');
  if (!u.startsWith(EB_API + '/')) return null;
  if (/\/orders\/\d+\/?(\?.*)?$/.test(u)) return { kind: 'order', url: u };
  if (/\/attendees\/\d+\/?(\?.*)?$/.test(u)) return { kind: 'attendee', url: u };
  return { kind: 'other', url: u };
}
