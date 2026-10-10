/* ── every automated email, the words in one place ─────────────────
   The dashboard edits these. A key names the email, vars are the
   placeholders it may use, written {like_this}, and the app fills them
   in. Anything the dashboard has not changed falls through to the
   default here, so an untouched email reads as it always did. */
export const EMAILS = {
  "tip1": {
    "name": "Welcome note, day 1",
    "when": "Day 1 after an account is made, to a free account",
    "vars": [
      "name"
    ],
    "subject": "Fingers first",
    "title": "Your wrists carry the whole thing.",
    "paras": [
      "Most handstand pain in the first month is wrists, and most of it is skipped warm-ups. Circles, then flexion and extension with the other hand helping, then weight shifts on all fours. Two minutes. The app puts these at the top of every session for a reason.",
      "On a day the rest of you is not up to it, there is a mobility day in the app: wrists and shoulders, ten minutes, no stage work. It still counts, and it is the day that keeps a habit alive."
    ],
    "footnote": "Five of these in the first ten days, then only a note if you go quiet. Reminders off in the app, in the menu at the top left, stops all of it."
  },
  "tip2": {
    "name": "Welcome note, day 2",
    "when": "Day 2, to a free account",
    "vars": [
      "name"
    ],
    "subject": "Push the floor away",
    "title": "One cue, for everything.",
    "paras": [
      "Chest to wall, chair assisted, crow, the press: the cue underneath all of them is the same. Push the floor away. Shoulders up by the ears, arms straight, the whole body reaching upwards rather than sitting in the joints.",
      "Every film in the app has captions, so you can put the phone on the floor with the sound off and still catch the cue as it is said."
    ],
    "footnote": "Five of these in the first ten days, then only a note if you go quiet. Reminders off in the app, in the menu at the top left, stops all of it."
  },
  "tip4": {
    "name": "Welcome note, day 4",
    "when": "Day 4, to a free account",
    "vars": [
      "name"
    ],
    "subject": "Twice a week is the number",
    "title": "Two sessions a week moves a handstand. One keeps it.",
    "paras": [
      "Nobody needs an hour. A fifteen minute session in the app is six drills at one set each, and two of those a week beats one heroic Sunday every time.",
      "Say how long you have and it builds one. It starts further down your stage each time, so Tuesday and Thursday are different workouts, not the same one again."
    ],
    "footnote": "Five of these in the first ten days, then only a note if you go quiet. Reminders off in the app, in the menu at the top left, stops all of it."
  },
  "tip7": {
    "name": "Welcome note, day 7",
    "when": "Day 7, to a free account",
    "vars": [
      "name"
    ],
    "subject": "Film yourself, from the side",
    "title": "You cannot feel a bent hip. You can see one.",
    "paras": [
      "Phone on the floor, side on, whole body in frame. What feels straight almost never is, and thirty seconds of footage teaches more than a month of guessing.",
      "Each stage in the app has check points, the things you have to be able to do before the next stage opens. Log them as you go, and if you are being coached, send the clip with it."
    ],
    "footnote": "Five of these in the first ten days, then only a note if you go quiet. Reminders off in the app, in the menu at the top left, stops all of it."
  },
  "tip10": {
    "name": "Welcome note, day 10",
    "when": "Day 10, to a free account",
    "vars": [
      "name"
    ],
    "subject": "Falling is a skill",
    "title": "Learn to come down before you try to stay up.",
    "paras": [
      "The fear of falling is what keeps people leaning on the wall for a year. A cartwheel out is the answer: practise it on purpose, low and slow, until it is boring. Then kicking up freestanding stops being a leap.",
      "Your Progress tab keeps a calendar of every session, what was in it and how long it took. Ten days in is a good moment to look at it."
    ],
    "footnote": "Five of these in the first ten days, then only a note if you go quiet. Reminders off in the app, in the menu at the top left, stops all of it."
  },
  "quiet5d": {
    "name": "Gone quiet, 5 days",
    "when": "Five days after a free account last opened the app",
    "vars": [
      "name",
      "stage"
    ],
    "subject": "Your next session is ready",
    "title": "Your next session is ready.",
    "paras": [
      "It has been five days. {stage} is where you left it, and the next session is built and waiting: fifteen minutes is enough.",
      "Two sessions a week is what moves a handstand. One is what keeps it."
    ],
    "footnote": "These stop the moment you turn reminders off in the app, in the menu at the top left."
  },
  "quiet14d": {
    "name": "Gone quiet, 2 weeks",
    "when": "A fortnight of silence",
    "vars": [
      "name",
      "stage"
    ],
    "subject": "Two weeks off a handstand",
    "title": "Two weeks is where it starts to slip.",
    "paras": [
      "A fortnight without going upside down and the wrists and shoulders start to forget. {stage} is still where you were, and a short session today is worth more than a long one next month.",
      "Open it, pick fifteen minutes, and let the timer run."
    ],
    "footnote": "These stop the moment you turn reminders off in the app, in the menu at the top left."
  },
  "quiet30d": {
    "name": "Gone quiet, a month",
    "when": "A month of silence",
    "vars": [
      "name",
      "stage"
    ],
    "subject": "Still want the handstand?",
    "title": "Still want the handstand?",
    "paras": [
      "It has been a month. Nothing has moved, which is fine, because nothing has been lost either: {stage} is exactly where you left it.",
      "If the sessions were too long, choose fifteen minutes. If they were too hard, choose Easier from the chooser. If it is something else, reply to this and tell me."
    ],
    "footnote": "These stop the moment you turn reminders off in the app, in the menu at the top left."
  },
  "quiet90d": {
    "name": "Gone quiet, 3 months",
    "when": "Three months of silence",
    "vars": [
      "name",
      "stage"
    ],
    "subject": "Three months on",
    "title": "Three months on.",
    "paras": [
      "Your account is still here and so is {stage}. Most people who get a handstand had two or three false starts first, so this is not a failed attempt, it is the gap between attempts.",
      "One session. See how it feels. That is the whole ask."
    ],
    "footnote": "These stop the moment you turn reminders off in the app, in the menu at the top left."
  },
  "blockAsk": {
    "name": "How did this block go?",
    "when": "To a coaching client when a block is due its review",
    "vars": [
      "name",
      "coach"
    ],
    "subject": "How did this block go?",
    "title": "How did this block go?",
    "paras": [
      "Three quick questions before the next one is written, so it is built on what actually happened rather than what I guess.",
      "<b>What got better?</b> <b>What got in the way?</b> <b>What should change next block?</b>",
      "And if you have thirty seconds and the light is decent, a filmed line about how it has gone would mean a lot. Send it from Ask in the app."
    ]
  },
  "answerReady": {
    "name": "Your answer is ready",
    "when": "When a clip is marked reviewed without a reply in the chat",
    "vars": [
      "name",
      "coach"
    ],
    "subject": "Your answer is ready",
    "title": "Your answer is ready.",
    "paras": [
      "{coach} has been through what you sent and written it up. It is waiting in the app."
    ]
  },
  "cpSigned": {
    "name": "Check point signed off",
    "when": "When you sign off a check point that came with no clip",
    "vars": [
      "name",
      "coach",
      "checkpoint"
    ],
    "subject": "{coach} has signed off a check point",
    "title": "Signed off.",
    "paras": [
      "{coach} has signed off <b>{checkpoint}</b>. It is green on your check points in the app."
    ]
  },
  "cpNotYet": {
    "name": "Check point not there yet",
    "when": "When you mark a check point not there yet and it came with no clip",
    "vars": [
      "name",
      "coach",
      "checkpoint"
    ],
    "subject": "A note on {checkpoint}",
    "title": "Not quite there yet.",
    "paras": [
      "{coach} has looked at <b>{checkpoint}</b> and it is not there yet. There is a note on it in the app, with what to work on."
    ]
  },
  "coachReplied": {
    "name": "Coach has replied",
    "when": "Every reply you send from the dashboard",
    "vars": [
      "name",
      "coach",
      "text"
    ],
    "subject": "{coach} has replied",
    "title": "{coach} has replied.",
    "paras": [
      "{text}"
    ]
  },
  "checkCredit": {
    "name": "Form check paid for",
    "when": "When someone buys a form check",
    "always": true,
    "alwaysWhy": "It is the receipt, and for a new buyer the only way into the app.",
    "vars": [
      "name"
    ],
    "subject": "Your form check is ready to send",
    "title": "Your form check is ready to send.",
    "paras": [
      "The button below opens it in the app. Send the clip: side on, whole body in frame, one clean attempt. Elliott watches it himself and sends you a video back within 48 hours."
    ]
  },
  "welcomeCoaching": {
    "name": "Welcome to coaching",
    "when": "When someone buys online coaching or Inner Circle",
    "always": true,
    "alwaysWhy": "It carries the password link for somebody who paid on the website.",
    "vars": [
      "name",
      "tier",
      "coach",
      "password_line",
      "london_line"
    ],
    "subject": "You are in: {tier}",
    "title": "You are in.",
    "paras": [
      "{password_line}",
      "Open the app and your Start page walks you through it, one step at a time: put the app on your Home Screen with notifications on, so you hear the moment I reply; a few questions; a few tests to film and send me; then a short call where we agree what block one works on. I start writing it as soon as your baseline is in and we have spoken, and you have a starter week to train in the meantime.",
      "{london_line}",
      "Everything happens in the app from here: your clips, my replies, and your programme. I reply to messages within 48 hours, and form checks come back as a video within 48 hours."
    ]
  },
  "welcomeLadder": {
    "name": "Welcome to the ladder",
    "when": "When someone starts the Handstand Ladder",
    "always": true,
    "alwaysWhy": "It carries the password link for somebody who paid on the website.",
    "vars": [
      "name",
      "password_line",
      "trial_line"
    ],
    "subject": "You are in: the Handstand Ladder",
    "title": "The whole ladder is open.",
    "paras": [
      "{password_line}",
      "{trial_line}",
      "Open the app and press Start for today's session: your stage, every film and your check points are there. If you are not sure where you are, the quiz puts you on the right stage in about a minute."
    ]
  },
  "paidOther": {
    "name": "Payment received",
    "when": "When a payment comes through that the app cannot name on its own",
    "always": true,
    "alwaysWhy": "It is the only thing that tells somebody their payment arrived.",
    "vars": [
      "name",
      "amount",
      "product",
      "password_line"
    ],
    "subject": "Thank you: your payment has come through",
    "title": "Your payment has come through.",
    "paras": [
      "Thank you. {amount} for {product} has come through.",
      "Elliott will be in touch within 48 hours about what happens next, by email and in the app.",
      "{password_line}"
    ]
  },
  "cardFailed": {
    "name": "Card did not go through",
    "when": "When a subscription payment bounces",
    "always": true,
    "alwaysWhy": "It is the only thing that tells a client their card bounced.",
    "vars": [
      "name"
    ],
    "subject": "Your card did not go through",
    "title": "Your card did not go through.",
    "paras": [
      "Nothing has changed and the app still works. Your bank turned the payment down, which is usually an expired card or a new one.",
      "Update the card from Account in the app and it goes through on the next try. If it keeps failing the subscription ends on its own, and you can start again whenever."
    ]
  },
  "trialEnds": {
    "name": "Trial ends in three days",
    "when": "Three days before the first charge",
    "always": true,
    "alwaysWhy": "It is the only warning before the first charge.",
    "vars": [
      "name",
      "trial",
      "price"
    ],
    "subject": "Your {trial} ends in three days",
    "title": "Three days left on the {trial}.",
    "paras": [
      "After that it is {price} a month, and you can cancel from the app before then if it is not for you.",
      "If it is, you need do nothing."
    ]
  },
  "clipIn": {
    "name": "Your clip is in",
    "when": "When a form check or test is sent",
    "vars": [
      "name",
      "coach",
      "clips"
    ],
    "subject": "Your clip is in",
    "title": "Your clip is in.",
    "paras": [
      "Thanks for sending {clips} over. {coach} watches every one personally. You will hear back within <b>48 hours</b>."
    ],
    "footnote": "Sit tight. The next email from us is the one with your answer."
  },
  "newCheckpoints": {
    "name": "New check points",
    "when": "When you add a check point to a client's programme",
    "vars": [
      "name",
      "n",
      "list"
    ],
    "subject": "New check points in your app",
    "title": "Something new to test.",
    "paras": [
      "{name}, I have added {n} to your app.",
      "{list}",
      "They are on the Progress tab under Check points. Log the number when you test it, and send a clip so I can see it."
    ]
  },
  "wsRemind": {
    "name": "Workshop, the day before",
    "when": "12 to 36 hours before a workshop",
    "vars": [
      "name",
      "title",
      "when",
      "place",
      "directions"
    ],
    "subject": "Tomorrow: {title}",
    "title": "See you tomorrow.",
    "paras": [
      "<b>{title}</b>, {when}{place}.",
      "We are in <b>Arch 1</b> at OverGravity: Arches 160 to 163, Sutton Street, London E1&nbsp;0DB. {directions}",
      "Here early? Wait in the café, which is in Arch 1 too. There are changing rooms, so you can change when you get there.",
      "Bring clothes you can move in and some water. Arrive ten minutes early so we start on time."
    ]
  },
  "wsOffer": {
    "name": "Workshop, three days after: the next step",
    "when": "3 to 4 days after a workshop, to everyone who came and is not a client",
    "vars": [
      "name",
      "title",
      "session_line"
    ],
    "subject": "Keeping what you found on Saturday",
    "title": "The next step, if you want one.",
    "paras": [
      "Most of what changed for you at {title} came from being watched and corrected. A room of twelve gets a few minutes each; that is the limit of a class.",
      "{session_line}",
      "Or, if you would rather talk it through first, book a free 15 minute call and I will tell you honestly where I would start you, even if the answer is the free app."
    ]
  },
  "wsIntent": {
    "name": "Workshop, started booking and stopped",
    "when": "The morning after somebody typed their email on the booking page, or pressed Book, and did not pay",
    "vars": [
      "name",
      "title",
      "when",
      "place",
      "price",
      "pair_line",
      "link"
    ],
    "subject": "Still want a place? {title}, {when}",
    "title": "Your place is not held yet.",
    "paras": [
      "You started booking <b>{title}</b>, {when}{place}, and did not get to the end. No payment was taken and nothing is held for you, so if you want to come, the place is still open.",
      "People leave the class with a handstand that has moved on in ninety minutes: a first hold against the wall, the first seconds of balance off it, or the next piece of the press. Two coaches and a small group, so you get seen. 5.0 on Google.",
      "It takes a minute to book, card or Apple Pay, no account. {pair_line} If you have changed your mind, ignore this: there is one more short note in a few days, and that is all.",
      "Any question, just reply."
    ],
    "footnote": "You are getting this because you began a booking on our site. There is no list to come off."
  },
  "wsIntent2": {
    "name": "Workshop, started booking and stopped, three days on",
    "when": "Three days after the first reminder, if they still have no place and the date is more than a day away",
    "vars": [
      "name",
      "title",
      "when",
      "price",
      "link",
      "app_link"
    ],
    "subject": "Start upside down this week, with or without Saturday",
    "title": "Two ways to start.",
    "paras": [
      "A few days ago you looked at <b>{title}</b>, {when}. Places are still open, and it is still the quickest way to a handstand that works: <a href=\"{link}\" style=\"color:#006663\">book your place, {price}</a>.",
      "If Saturday is not going to happen, start at home instead. The Handstand Ladder is the path I take my clients down, in an app: six stages from your first wall hold to a freestanding press, with a film for every drill and a session built for the time you have. The first stage is free, no account needed.",
      "Either way, this is the last email about it. Any question, just reply."
    ],
    "footnote": "You are getting this because you began a booking on our site. Nothing more comes after this one."
  },
  "wsThanks": {
    "name": "Workshop, the day after",
    "when": "10 to 40 hours after a workshop. Under these words: the review button, the next dates, a 1-2-1, coaching and the app, at the prices in Money",
    "vars": [
      "name",
      "title",
      "day"
    ],
    "subject": "Thanks for coming on {day}",
    "title": "Thank you for coming.",
    "paras": [
      "Good to have you on the mats on {day}."
    ]
  },
  "sessRemind": {
    "name": "Session, the day before",
    "when": "12 to 36 hours before a one to one session",
    "vars": [
      "name",
      "when",
      "place",
      "kind"
    ],
    "subject": "Tomorrow: your session",
    "title": "See you tomorrow.",
    "paras": [
      "<b>{when}</b>{place}. {kind} minutes.",
      "Wear something you can move in and arrive a few minutes early. If you cannot make it, reply to this now rather than tomorrow."
    ]
  },
  "sessThanks": {
    "name": "Session, the day after",
    "when": "10 to 40 hours after a one to one session",
    "vars": [
      "name",
      "paid"
    ],
    "subject": "After your session",
    "title": "Thank you for coming.",
    "paras": [
      "What we worked on is in your thread in the app, so it is there when you train this week.",
      "If you want to keep going with a written programme, {paid} comes off your first month of the Coaching Programme if you join within fourteen days. Reply to this and I will set it up.",
      "And a sentence about how you found it, good or bad, would help me. Reply and I read it."
    ]
  }
};

/* the words for one email, with the dashboard's changes on top and the
   placeholders filled. Callers escape their values first. */
const SITE = 'https://londonhandstandacademy.com';
const STREAM = 'https://customer-pns1oongdltmkjwa.cloudflarestream.com/';
const escH = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* an email written as blocks on the canvas: each block becomes one
   paragraph of HTML. A film cannot play inside an email, so it is its
   still, linked to the film. */
export function blocksToParas(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map(b => {
    if (!b) return '';
    if (b.t === 'h') return `<b style="font-size:19px;line-height:1.3">${escH(b.text)}</b>`;
    if (b.t === 'p') return escH(b.text).replace(/\n/g, '<br>');
    if (b.t === 'quote') return `<span style="display:block;border-left:3px solid #006663;padding-left:14px;font-size:18px;line-height:1.4;color:#00403d">${escH(b.text)}</span>`;
    if (b.t === 'img' && b.id) return `<img src="${SITE}/api/app/image/${escH(b.id)}" alt="${escH(b.cap || '')}" style="width:100%;border-radius:14px;display:block">${b.cap ? `<span style="display:block;font-size:13px;color:#5c6660;margin-top:6px">${escH(b.cap)}</span>` : ''}`;
    if (b.t === 'vid' && (b.uid || b.url)) {
      const href = b.uid ? `${STREAM}${escH(b.uid)}/watch` : escH(b.url);
      const still = b.uid ? `${STREAM}${escH(b.uid)}/thumbnails/thumbnail.jpg?time=3s&height=480` : '';
      return `<a href="${href}" style="display:block;text-decoration:none">${still ? `<img src="${still}" alt="" style="width:100%;border-radius:14px;display:block">` : ''}<span style="display:block;font-size:14px;color:#006663;margin-top:6px">&#9654; ${escH(b.cap || 'Watch the film')}</span></a>`;
    }
    if (b.t === 'drill' && b.v) {
      const uid = /\/([a-f0-9]{32})\//.exec(String(b.url || '')); const still = uid ? `${STREAM}${uid[1]}/thumbnails/thumbnail.jpg?time=3s&height=480` : '';
      return `<a href="${SITE}/lha-app.html" style="display:block;text-decoration:none">${still ? `<img src="${still}" alt="" style="width:100%;border-radius:14px;display:block">` : ''}<span style="display:block;font-size:14px;color:#111;margin-top:6px"><b>${escH(b.n || b.v)}</b>${b.cap ? ' &middot; ' + escH(b.cap) : ''}</span></a>`;
    }
    return '';
  }).filter(Boolean);
}
export function renderEmail(key, vars, over) {
  const d = EMAILS[key] || {};
  const o = (over && over[key]) || {};
  const pick = f => (o[f] != null && String(o[f]).trim() !== '') ? o[f] : d[f];
  const fill = s => String(s == null ? '' : s).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null) ? String(vars[k]) : '');
  const rawParas = (Array.isArray(o.blocks) && o.blocks.length) ? blocksToParas(o.blocks) : pick('paras');
  const paras = (Array.isArray(rawParas) ? rawParas : String(rawParas || '').split(/\n\s*\n/))
    .map(fill).map(p => p.trim()).filter(Boolean);
  return { subject: fill(pick('subject')), title: fill(pick('title')), paras, footnote: fill(pick('footnote') || ''),
    /* switched off in the dashboard: held, not sent. The few that must
       always go (a password link, a bounced card, a charge coming) ignore it */
    off: !!o.off && !d.always };
}

/* ── the day after a class: one email, laid out like the site ─────────
   (10 Oct 2026) The thank you was a review button and a line about the
   app. It now carries what comes next too: the next dates, from the
   workshops written in the dashboard; a 1-2-1; coaching; the app; at the
   prices set in Money. The words at the top are wsThanks above, so the
   dashboard still edits and switches them.

   Newsreader and Figtree where the mail app loads them (Apple Mail does);
   Gmail falls back to Georgia and Helvetica, Outlook is told Georgia and
   Arial, as it otherwise picks Times New Roman. Tables throughout, as
   Outlook draws HTML with Word. Gradients, shadows and the ground's
   washes are extras in their own style block: a client that throws them
   away still has flat teal and white panels. The plain text part says
   the same thing with the links written out. */
export function afterClassEmail(d) {
  const SERIF = "Newsreader,Georgia,'Times New Roman',serif";
  const SANS = "Figtree,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  /* the app's tokens; hairlines as solid colours, since Outlook has no rgba */
  const C = { ink: '#111111', grey: '#5a5a5a', grey2: '#686868', teal: '#006663', deep: '#00403d',
    line: '#e6ecec', ctl: '#cfdcdb', ground: '#f4f4f5', on: '#f7f4f1', amber: '#f3a949' };
  const site = d.site || SITE, img = d.assets || site;
  const f = (fam, size, lh, w) => `font-family:${fam};font-size:${size}px;line-height:${lh}px;font-weight:${w}`;
  /* the headline pattern: the last word in teal */
  const lit = t => { const s = String(t || '').trim(), i = s.lastIndexOf(' ');
    return i < 0 ? `<span style="color:${C.teal}">${s}</span>` : `${s.slice(0, i)} <span style="color:${C.teal}">${s.slice(i + 1)}</span>`; };
  const kick = t => `<div style="${f(SANS, 11, 15, 600)};letter-spacing:.14em;text-transform:uppercase;color:${C.teal};margin:0 0 10px">${t}</div>`;
  const para = (t, top = 12) => `<p style="margin:${top}px 0 0;${f(SANS, 16, 25, 400)};color:${C.grey}">${t}</p>`;
  const btn = (href, label, main) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0"><tr>
<td class="${main ? 'btnp' : ''}" bgcolor="${main ? C.teal : '#ffffff'}" style="border-radius:14px;background-color:${main ? C.teal : '#ffffff'};${main ? '' : `border:1px solid ${C.ctl};`}mso-padding-alt:${main ? '15px 26px' : '12px 20px'}">
<a href="${escH(href)}" style="display:inline-block;padding:${main ? '15px 26px' : '12px 20px'};${f(SANS, main ? 16 : 15, 20, 600)};color:${main ? C.on : C.deep};text-decoration:none;border-radius:14px">${label}</a></td></tr></table>`;
  const card = (inner, pad = '24px 24px 26px') => `<tr><td style="padding:0 0 14px">
<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${C.line};border-radius:24px;border-collapse:separate">
<tr><td class="px" style="padding:${pad}">${inner}</td></tr></table></td></tr>`;
  const h2 = t => `<tr><td class="px s" style="padding:20px 24px 12px;${f(SERIF, 30, 34, 400)};letter-spacing:-.015em;color:${C.ink}">${lit(t)}</td></tr>`;

  const first = d.first ? escH(d.first) : '';
  const title = escH(d.title || 'Thank you for coming.');
  const paras = (d.paras || []).filter(Boolean);
  const dates = d.dates || [];
  const o = d.offers;

  /* ── the panels ── */
  const hero = `<tr><td style="padding:0 0 14px">
<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${C.line};border-radius:24px;border-collapse:separate">
${d.photo ? `<tr><td style="padding:0;line-height:0;font-size:0"><img src="${escH(img + d.photo.src)}" width="598" alt="${escH(d.photo.alt || '')}" style="display:block;width:100%;max-width:598px;height:auto;border:0;border-radius:23px 23px 0 0;${f(SANS, 14, 20, 400)};color:${C.grey}"></td></tr>` : ''}
<tr><td class="px" style="padding:26px 24px 28px">
${d.kicker ? kick(escH(d.kicker)) : ''}
<h1 class="h1 s" style="margin:0;${f(SERIF, 42, 44, 400)};letter-spacing:-.015em;color:${C.ink}">${lit(title)}</h1>
${first ? para(`Hi ${first},`, 18) : ''}${paras.map((p, i) => para(p, i || first ? 12 : 18)).join('')}
</td></tr></table></td></tr>`;

  const review = card(`<div style="font-size:18px;line-height:20px;letter-spacing:3px;color:${C.amber};margin:0 0 12px">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
<div class="s" style="${f(SERIF, 30, 34, 400)};letter-spacing:-.015em;color:${C.ink}">${lit('Leave a review.')}</div>
${d.review ? para('One minute on Google. It is how the next class fills.', 10) + btn(d.review, 'Write a review', true)
  : para('Reply with a sentence about how you found it, good or bad. I read every one.', 10)}`);

  const dateRow = (x, last) => {
    const bits = [x.time, x.place, x.price].filter(Boolean).map(escH);
    if (x.left != null && x.left > 0 && x.left <= 5) bits.push(`<b style="color:${C.deep}">${x.left} ${x.left === 1 ? 'place' : 'places'} left</b>`);
    const right = x.booked ? `<span style="${f(SANS, 14, 20, 600)};color:${C.teal};white-space:nowrap">&#10003; Booked</span>`
      : x.full ? `<span style="${f(SANS, 14, 20, 600)};color:${C.grey2}">Full</span>`
      : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right"><tr><td class="btnp" bgcolor="${C.teal}" style="border-radius:12px;background-color:${C.teal};mso-padding-alt:10px 18px"><a href="${escH(x.href)}" style="display:inline-block;padding:10px 18px;${f(SANS, 15, 18, 600)};color:${C.on};text-decoration:none;border-radius:12px">Book</a></td></tr></table>`;
    return `<tr><td style="padding:14px 0;${last ? '' : `border-bottom:1px solid ${C.line}`}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="${f(SANS, 16, 22, 600)};color:${C.ink}">${escH(x.day)}${x.what ? `<div style="${f(SANS, 14, 20, 600)};color:${C.teal};margin-top:2px">${escH(x.what)}</div>` : ''}
<div style="${f(SANS, 14, 20, 400)};color:${C.grey};margin-top:2px">${bits.join(' &middot; ')}</div></td>
<td valign="middle" align="right" width="92" style="padding-left:12px">${right}</td></tr></table></td></tr>`;
  };
  const datesCard = card(dates.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${dates.map((x, i) => dateRow(x, i === dates.length - 1)).join('')}</table>`
    : para('New dates are on the way.', 0) + btn(d.more || `${site}/handstand-class`, 'See the class page', false), dates.length ? '8px 24px' : '24px 24px 26px');

  const offer = (k, name, lines, href, label) => card(`${kick(k)}<div class="s" style="${f(SERIF, 25, 30, 400)};letter-spacing:-.01em;color:${C.ink}">${name}</div>
${lines.filter(Boolean).map((l, i) => `<p style="margin:${i ? 6 : 10}px 0 0;${f(SANS, 15, 23, 400)};color:${i ? C.grey2 : C.grey}">${l}</p>`).join('')}${href ? btn(href, label, false) : ''}`);
  const placesLine = o && Number.isInteger(o.places)
    ? (o.places > 0 ? `<b style="color:${C.deep}">${o.places} ${o.places === 1 ? 'place' : 'places'} open this month.</b>` : 'Full this month.') : '';
  const offers = o ? h2('Keep going.')
    + offer('In person &middot; OverGravity', 'A 1-2-1 with Elliott',
      [`60 minutes, ${escH(o.s60)}. 90 minutes, ${escH(o.s90)}.`, 'Join coaching within 14 days and it comes off your first month.'],
      `${site}/session.html`, 'Book a session')
    + offer('Coaching', 'Your own programme',
      ['A plan written around you, and a video form check every two weeks.',
        `${escH(o.online)} a month online. ${escH(o.inperson)} with a session in London each month.`, placesLine],
      `${site}/#coaching`, 'See coaching')
    + offer('On your own', 'The Handstand Ladder app',
      [`First stage free. The other five, ${escH(o.app)} a month, ${o.trialDays === 7 ? 'first week' : `${Number(o.trialDays) || 7} days`} free.`,
        o.store ? `On iPhone, ${escH(o.iphone || '£9.99')} a month. <a href="${escH(o.store)}" style="color:${C.teal};font-weight:600">Get it on the App Store</a>` : ''],
      `${site}/lha-app.html?ref=classmail`, 'Open the app')
    : '';

  const sign = `<tr><td class="px" style="padding:18px 24px 6px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
${d.headshot ? `<td valign="middle" width="48" style="padding-right:12px"><img src="${escH(img + d.headshot)}" width="48" height="48" alt="Elliott" style="display:block;width:48px;height:48px;border-radius:24px;border:0"></td>` : ''}
<td valign="middle"><div class="s" style="${f(SERIF, 22, 26, 400)};color:${C.ink}">Elliott</div>
<div style="${f(SANS, 13, 18, 400)};color:${C.grey2}">London Handstand Academy</div></td></tr></table></td></tr>`;
  const foot = `<tr><td class="px" style="padding:18px 24px 34px;${f(SANS, 12.5, 19, 400)};color:${C.grey2}">
${d.footnote ? escH(d.footnote) + '<br>' : ''}<a href="${site}" style="color:${C.grey2}">londonhandstandacademy.com</a> &nbsp;&middot;&nbsp; <a href="mailto:info@londonhandstandacademy.com" style="color:${C.grey2}">info@londonhandstandacademy.com</a><!--UNSUB-->
</td></tr>`;

  const pre = escH(d.preheader || String(d.title || ''));
  const html = `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting"><meta name="format-detection" content="telephone=no,date=no,address=no">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>${title}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>body,table,td,p,a,div,span,b{font-family:Arial,Helvetica,sans-serif!important}.s,.s span{font-family:Georgia,serif!important}</style><![endif]-->
<!--[if !mso]><!--><link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400&amp;family=Figtree:wght@400;600&amp;display=swap" rel="stylesheet"><!--<![endif]-->
<style>
body{margin:0;padding:0;background:${C.ground};-webkit-text-size-adjust:100%;text-size-adjust:100%}
a{color:${C.teal}}
@media (max-width:520px){.wrap{padding:14px 10px 0!important}.px{padding-left:20px!important;padding-right:20px!important}.h1{font-size:36px!important;line-height:38px!important}}
</style>
<style>
.ground{background-image:radial-gradient(circle at 15% 8%,rgba(0,102,99,.07),transparent 40%),radial-gradient(circle at 90% 30%,rgba(143,190,202,.12),transparent 45%),radial-gradient(circle at 30% 80%,rgba(243,169,73,.05),transparent 40%)}
.btnp{background-image:linear-gradient(180deg,#0a7a76,#006663)}
.card{box-shadow:0 1px 2px rgba(0,64,61,.05),0 8px 20px rgba(0,64,61,.06)}
</style></head>
<body style="margin:0;padding:0;background:${C.ground}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${pre}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" class="ground" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.ground}" style="background-color:${C.ground}">
<tr><td align="center" class="wrap" style="padding:26px 16px 0">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto">
<tr><td class="px" style="padding:0 24px 16px;${f(SANS, 11, 15, 600)};letter-spacing:.16em;text-transform:uppercase;color:${C.teal}"><a href="${site}" style="color:${C.teal};text-decoration:none">London Handstand Academy</a></td></tr>
${hero}${review}${h2('Next dates.')}${datesCard}${offers}${sign}${foot}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;

  /* ── the same email as plain text ── */
  const plain = t => String(t || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (m, h, l) => `${l.replace(/<[^>]+>/g, '')} (${h})`)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’').replace(/&#10003;/g, '✓')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const T = [plain(title), ''];
  if (first) T.push(`Hi ${d.first},`, '');
  paras.forEach(p => T.push(plain(p), ''));
  T.push('LEAVE A REVIEW');
  if (d.review) T.push('One minute on Google. It is how the next class fills.', d.review, '');
  else T.push('Reply with a sentence about how you found it, good or bad. I read every one.', '');
  T.push('NEXT DATES');
  if (dates.length) dates.forEach(x => {
    T.push([x.day, x.what, x.time, x.place, x.price].filter(Boolean).join(', ')
      + (x.left != null && x.left > 0 && x.left <= 5 ? `. ${x.left} ${x.left === 1 ? 'place' : 'places'} left` : ''));
    T.push(x.booked ? 'You are booked.' : x.full ? 'Full.' : `Book: ${x.href}`, '');
  });
  else T.push('New dates are on the way.', d.more || `${site}/handstand-class`, '');
  if (o) {
    T.push('KEEP GOING', '',
      `A 1-2-1 with Elliott, at OverGravity. 60 minutes, ${o.s60}. 90 minutes, ${o.s90}. Join coaching within 14 days and it comes off your first month.`,
      `${site}/session.html`, '',
      `Coaching, your own programme. A plan written around you, and a video form check every two weeks. ${o.online} a month online. ${o.inperson} with a session in London each month.${placesLine ? ' ' + plain(placesLine) : ''}`,
      `${site}/#coaching`, '',
      `The Handstand Ladder app. First stage free. The other five, ${o.app} a month, ${o.trialDays === 7 ? 'first week' : `${Number(o.trialDays) || 7} days`} free.`,
      `${site}/lha-app.html?ref=classmail`);
    if (o.store) T.push(`On iPhone, ${o.iphone || '£9.99'} a month: ${o.store}`);
    T.push('');
  }
  T.push('Elliott', 'London Handstand Academy', '');
  if (d.footnote) T.push(plain(d.footnote));
  T.push(`${site.replace(/^https?:\/\//, '')} · info@londonhandstandacademy.com`);
  return { html, text: T.join('\n') };
}
