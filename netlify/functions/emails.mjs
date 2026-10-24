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
    "subject": "Chair, wall walks, then the wall",
    "title": "Get used to upside down first.",
    "paras": [
      "Before chest to wall, get used to being upside down. The chair assisted handstand first, then wall walks, then learning to fall out safely, and only then all the way in to the chest to wall handstand.",
      "Underneath every one of them is the same cue: push the floor away. Shoulders up by the ears, arms straight, the whole body reaching upwards rather than sitting in the joints. Every film in the app has captions, so the phone can sit on the floor with the sound off."
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
      "The fear of falling is what keeps people leaning on the wall for a year. So before you work on staying up, learn to come down, three ways:",
      "Practise them until falling out is automatic and you stop thinking about it, so your head and your body both know it is safe. That is when you can really start learning to balance."
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
  "welcomeChecks": {
    "name": "Welcome to form checks",
    "when": "When someone starts form checks, £35 a month",
    "always": true,
    "alwaysWhy": "It carries the password link for somebody who paid on the website.",
    "vars": [
      "name",
      "password_line"
    ],
    "subject": "You are in: form checks",
    "title": "Your first form check is ready to send.",
    "paras": [
      "{password_line}",
      "You get one form check every fortnight. Film one attempt, side on with your whole body in frame, and send it from the Form check tab. Elliott watches it himself and sends you a video back within 48 hours.",
      "The whole Handstand Ladder is open too: every stage, every film and every check point."
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
      "Update the card on the website: the button below opens your account there, with Update card in it. It goes through on the next try. If it keeps failing the subscription ends on its own, and you can start again whenever."
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
    "when": "3 to 4 days after a workshop, to everyone who came and is not a client. Under these words: a 1-2-1 at the prices in Money, and the free call",
    "vars": [
      "name",
      "title",
      "day"
    ],
    "subject": "Keeping what you found on {day}",
    "title": "The next step, if you want one.",
    "paras": [
      "Most of what changed for you at {title} came from being watched and corrected. A room of twelve gets a few minutes each; that is the limit of a class."
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
      "early_line",
      "coach_line",
      "link"
    ],
    "subject": "Still want a place? {title}, {when}",
    "title": "Your place is not held yet.",
    "paras": [
      "You started booking <b>{title}</b>, {when}{place}, and did not get to the end. No payment was taken and nothing is held for you, so if you want to come, the place is still open.",
      "People leave the class with a handstand that has moved on in ninety minutes: a first hold against the wall, the first seconds of balance off it, or the next piece of the press. {coach_line} 5.0 on Google.",
      "{early_line} It takes a minute to book, card or Apple Pay, no account. {pair_line} If you have changed your mind, ignore this: there is one more short note in a few days, and that is all.",
      "Any question, just reply."
    ],
    "footnote": "You are getting this because you began a booking on our site. There is no list to come off."
  },
  "wsEarly": {
    "name": "Workshop, the early price ends today",
    "when": "On the last day of an early bird price, the morning run, to anyone who started booking and has no place",
    "vars": [
      "name",
      "title",
      "when",
      "price",
      "then",
      "until",
      "ends",
      "link"
    ],
    "subject": "{price} ends today: {title}, {when}",
    "title": "The early price ends today.",
    "paras": [
      "You started booking <b>{title}</b>, {when}, and did not get to the end. The place is still open, and it is <b>{price}</b> until {ends}. After that it is {then}.",
      "It takes a minute to book, card or Apple Pay, no account. If you have changed your mind, ignore this.",
      "Any question, just reply."
    ],
    "footnote": "You are getting this because you began a booking on our site. There is no list to come off."
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
  },
  "sessThanksPack": {
    "name": "Session from a pack, the day after",
    "when": "10 to 40 hours after a one to one session from a pack. No coaching offer: Elliott offers that himself when it fits",
    "vars": [
      "name"
    ],
    "subject": "After your session",
    "title": "Thank you for coming.",
    "paras": [
      "What we worked on is in your thread in the app, so it is there when you train this week.",
      "Book the next one whenever suits, from the link in your pack email.",
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
  /* a subject is plain text: vars arrive escaped for the body, so a title
     with "&" read "Press &amp; Balance" in the inbox (13 Oct 2026) */
  const plain = v => v.replace(/&(amp|lt|gt|quot|#39);/g, (m, k) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[k]);
  return { subject: plain(fill(pick('subject'))), title: fill(pick('title')), paras, footnote: fill(pick('footnote') || ''),
    /* switched off in the dashboard: held, not sent. The few that must
       always go (a password link, a bounced card, a charge coming) ignore it */
    off: !!o.off && !d.always };
}

/* ── the after-class emails, laid out like the site ──────────────────
   (10 Oct 2026) Two emails after a class use this: the day after
   (wsThanks: the review, the next dates, a 1-2-1, coaching, the app) and
   three days after (wsOffer: a 1-2-1, or the free call). The words at the
   top of each are the EMAILS entries above, so the dashboard still edits
   and switches them; the panels under them are built here, at the prices
   set in Money.

   Newsreader and Figtree where the mail app loads them (Apple Mail does);
   Gmail falls back to Georgia and Helvetica, Outlook is told Georgia and
   Arial, as it otherwise picks Times New Roman. Tables throughout, as
   Outlook draws HTML with Word. Gradients, shadows and the ground's
   washes are extras in their own style block: a client that throws them
   away still has flat teal and white panels. Each email has a plain text
   part saying the same thing with the links written out. */
const M_SERIF = "Newsreader,Georgia,'Times New Roman',serif";
const M_SANS = "Figtree,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
/* the app's tokens; hairlines as solid colours, since Outlook has no rgba */
const MC = { ink: '#111111', grey: '#5a5a5a', grey2: '#686868', teal: '#006663', deep: '#00403d',
  line: '#e6ecec', ctl: '#cfdcdb', ground: '#f4f4f5', on: '#f7f4f1', amber: '#f3a949' };
const mf = (fam, size, lh, w) => `font-family:${fam};font-size:${size}px;line-height:${lh}px;font-weight:${w}`;
/* the headline pattern: the last word in teal */
const mLit = t => { const s = String(t || '').trim(), i = s.lastIndexOf(' ');
  return i < 0 ? `<span style="color:${MC.teal}">${s}</span>` : `${s.slice(0, i)} <span style="color:${MC.teal}">${s.slice(i + 1)}</span>`; };
const mKick = t => `<div style="${mf(M_SANS, 11, 15, 600)};letter-spacing:.14em;text-transform:uppercase;color:${MC.teal};margin:0 0 10px">${t}</div>`;
const mPara = (t, top = 12) => `<p style="margin:${top}px 0 0;${mf(M_SANS, 16, 25, 400)};color:${MC.grey}">${t}</p>`;
/* one button or a row of them; Outlook takes the padding from the cell */
const mBtns = list => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0"><tr>${list.map((b, i) => {
  const pad = b.main ? '15px 22px' : '14px 20px';
  return `${i ? '<td width="8" style="width:8px;font-size:0;line-height:0">&nbsp;</td>' : ''}<td class="${b.main ? 'btnp' : ''}" bgcolor="${b.main ? MC.teal : '#ffffff'}" style="border-radius:14px;background-color:${b.main ? MC.teal : '#ffffff'};${b.main ? '' : `border:1px solid ${MC.ctl};`}mso-padding-alt:${pad}">
<a href="${escH(b.href)}" style="display:inline-block;padding:${pad};${mf(M_SANS, 16, 20, 600)};color:${b.main ? MC.on : MC.deep};text-decoration:none;border-radius:14px;white-space:nowrap">${b.label}</a></td>`;
}).join('')}</tr></table>`;
const mBtn = (href, label, main) => mBtns([{ href, label, main }]);
const mCard = (inner, pad = '24px 24px 26px') => `<tr><td style="padding:0 0 14px">
<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${MC.line};border-radius:24px;border-collapse:separate">
<tr><td class="px" style="padding:${pad}">${inner}</td></tr></table></td></tr>`;
const mH2 = t => `<tr><td class="px s" style="padding:20px 24px 12px;${mf(M_SERIF, 30, 34, 400)};letter-spacing:-.015em;color:${MC.ink}">${mLit(t)}</td></tr>`;
/* a card with a kicker, a serif name, a line or two and its buttons */
const mOffer = (k, name, lines, btns) => mCard(`${mKick(k)}<div class="s" style="${mf(M_SERIF, 25, 30, 400)};letter-spacing:-.01em;color:${MC.ink}">${name}</div>
${lines.filter(Boolean).map((l, i) => `<p style="margin:${i ? 6 : 10}px 0 0;${mf(M_SANS, 15, 23, 400)};color:${i ? MC.grey2 : MC.grey}">${l}</p>`).join('')}${btns && btns.length ? mBtns(btns) : ''}`);
/* the photo, the kicker, the headline, the greeting and the dashboard's words */
const mHero = d => {
  const img = d.assets || d.site || SITE, first = d.first ? escH(d.first) : '';
  const paras = (d.paras || []).filter(Boolean);
  return `<tr><td style="padding:0 0 14px">
<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${MC.line};border-radius:24px;border-collapse:separate">
${d.photo ? `<tr><td style="padding:0;line-height:0;font-size:0"><img src="${escH(img + d.photo.src)}" width="598" alt="${escH(d.photo.alt || '')}" style="display:block;width:100%;max-width:598px;height:auto;border:0;border-radius:23px 23px 0 0;${mf(M_SANS, 14, 20, 400)};color:${MC.grey}"></td></tr>` : ''}
<tr><td class="px" style="padding:26px 24px 28px">
${d.kicker ? mKick(escH(d.kicker)) : ''}
<h1 class="h1 s" style="margin:0;${mf(M_SERIF, 42, 44, 400)};letter-spacing:-.015em;color:${MC.ink}">${mLit(escH(d.title || ''))}</h1>
${first ? mPara(`Hi ${first},`, 18) : ''}${paras.map((p, i) => mPara(p, i || first ? 12 : 18)).join('')}
</td></tr></table></td></tr>`;
};
const mSign = d => {
  const img = d.assets || d.site || SITE;
  return `<tr><td class="px" style="padding:18px 24px 6px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
${d.headshot ? `<td valign="middle" width="48" style="padding-right:12px"><img src="${escH(img + d.headshot)}" width="48" height="48" alt="Elliott" style="display:block;width:48px;height:48px;border-radius:24px;border:0"></td>` : ''}
<td valign="middle"><div class="s" style="${mf(M_SERIF, 22, 26, 400)};color:${MC.ink}">Elliott</div>
<div style="${mf(M_SANS, 13, 18, 400)};color:${MC.grey2}">London Handstand Academy</div></td></tr></table></td></tr>`;
};
const mFoot = d => {
  const site = d.site || SITE;
  return `<tr><td class="px" style="padding:18px 24px 34px;${mf(M_SANS, 12.5, 19, 400)};color:${MC.grey2}">
${d.footnote ? escH(d.footnote) + '<br>' : ''}<a href="${site}" style="color:${MC.grey2}">londonhandstandacademy.com</a> &nbsp;&middot;&nbsp; <a href="mailto:info@londonhandstandacademy.com" style="color:${MC.grey2}">info@londonhandstandacademy.com</a><!--UNSUB-->
</td></tr>`;
};
/* the page around the panels: <!--UNSUB--> is where the sender puts the way out */
const mShell = (d, rows) => {
  const site = d.site || SITE;
  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting"><meta name="format-detection" content="telephone=no,date=no,address=no">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>${escH(d.title || '')}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>body,table,td,p,a,div,span,b{font-family:Arial,Helvetica,sans-serif!important}.s,.s span{font-family:Georgia,serif!important}</style><![endif]-->
<!--[if !mso]><!--><link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400&amp;family=Figtree:wght@400;600&amp;display=swap" rel="stylesheet"><!--<![endif]-->
<style>
body{margin:0;padding:0;background:${MC.ground};-webkit-text-size-adjust:100%;text-size-adjust:100%}
a{color:${MC.teal}}
@media (max-width:520px){.wrap{padding:14px 10px 0!important}.px{padding-left:20px!important;padding-right:20px!important}.h1{font-size:36px!important;line-height:38px!important}}
</style>
<style>
.ground{background-image:radial-gradient(circle at 15% 8%,rgba(0,102,99,.07),transparent 40%),radial-gradient(circle at 90% 30%,rgba(143,190,202,.12),transparent 45%),radial-gradient(circle at 30% 80%,rgba(243,169,73,.05),transparent 40%)}
.btnp{background-image:linear-gradient(180deg,#0a7a76,#006663)}
.card{box-shadow:0 1px 2px rgba(0,64,61,.05),0 8px 20px rgba(0,64,61,.06)}
</style></head>
<body style="margin:0;padding:0;background:${MC.ground}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escH(d.preheader || d.title || '')}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" class="ground" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${MC.ground}" style="background-color:${MC.ground}">
<tr><td align="center" class="wrap" style="padding:26px 16px 0">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto">
<tr><td class="px" style="padding:0 24px 16px;${mf(M_SANS, 11, 15, 600)};letter-spacing:.16em;text-transform:uppercase;color:${MC.teal}"><a href="${site}" style="color:${MC.teal};text-decoration:none">London Handstand Academy</a></td></tr>
${rows}${mSign(d)}${mFoot(d)}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
};
/* the plain text part: links written out, the entities read back */
const mPlain = t => String(t || '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (m, h, l) => `${l.replace(/<[^>]+>/g, '')} (${h})`)
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·').replace(/&rsquo;/g, '’').replace(/&pound;/g, '£').replace(/&#10003;/g, '✓')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const mTextTop = d => {
  const T = [mPlain(escH(d.title || '')), ''];
  if (d.first) T.push(`Hi ${d.first},`, '');
  (d.paras || []).filter(Boolean).forEach(p => T.push(mPlain(p), ''));
  return T;
};
const mTextEnd = (T, d) => {
  const site = d.site || SITE;
  T.push('Elliott', 'London Handstand Academy', '');
  if (d.footnote) T.push(mPlain(d.footnote));
  T.push(`${site.replace(/^https?:\/\//, '')} · info@londonhandstandacademy.com`);
  return T.join('\n');
};

/* ── the day after: the review, the next dates, and ways to keep going ── */
export function afterClassEmail(d) {
  const site = d.site || SITE;
  const dates = d.dates || [];
  const o = d.offers;
  const review = mCard(`<div style="font-size:18px;line-height:20px;letter-spacing:3px;color:${MC.amber};margin:0 0 12px">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
<div class="s" style="${mf(M_SERIF, 30, 34, 400)};letter-spacing:-.015em;color:${MC.ink}">${mLit('Leave a review.')}</div>
${d.review ? mPara('One minute on Google. It is how the next class fills.', 10) + mBtn(d.review, 'Write a review', true)
  : mPara('Reply with a sentence about how you found it, good or bad. I read every one.', 10)}`);
  const leftTxt = x => x.left != null && x.left > 0 && x.left <= 5 ? `${x.left} ${x.left === 1 ? 'place' : 'places'} left` : '';
  const dateRow = (x, last) => {
    const bits = [x.time, x.place, x.price].filter(Boolean).map(escH);
    if (leftTxt(x)) bits.push(`<b style="color:${MC.deep}">${leftTxt(x)}</b>`);
    const right = x.booked ? `<span style="${mf(M_SANS, 14, 20, 600)};color:${MC.teal};white-space:nowrap">&#10003; Booked</span>`
      : x.full ? `<span style="${mf(M_SANS, 14, 20, 600)};color:${MC.grey2}">Full</span>`
      : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right"><tr><td class="btnp" bgcolor="${MC.teal}" style="border-radius:12px;background-color:${MC.teal};mso-padding-alt:10px 18px"><a href="${escH(x.href)}" style="display:inline-block;padding:10px 18px;${mf(M_SANS, 15, 18, 600)};color:${MC.on};text-decoration:none;border-radius:12px">Book</a></td></tr></table>`;
    return `<tr><td style="padding:14px 0;${last ? '' : `border-bottom:1px solid ${MC.line}`}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="${mf(M_SANS, 16, 22, 600)};color:${MC.ink}">${escH(x.day)}${x.what ? `<div style="${mf(M_SANS, 14, 20, 600)};color:${MC.teal};margin-top:2px">${escH(x.what)}</div>` : ''}
<div style="${mf(M_SANS, 14, 20, 400)};color:${MC.grey};margin-top:2px">${bits.join(' &middot; ')}</div></td>
<td valign="middle" align="right" width="92" style="padding-left:12px">${right}</td></tr></table></td></tr>`;
  };
  const datesCard = mCard(dates.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${dates.map((x, i) => dateRow(x, i === dates.length - 1)).join('')}</table>`
    : mPara('New dates are on the way.', 0) + mBtn(d.more || `${site}/handstand-class`, 'See the class page', false), dates.length ? '8px 24px' : '24px 24px 26px');
  const placesLine = o && Number.isInteger(o.places)
    ? (o.places > 0 ? `<b style="color:${MC.deep}">${o.places} ${o.places === 1 ? 'place' : 'places'} open this month.</b>` : 'Full this month.') : '';
  const trialTxt = o ? (o.trialDays === 7 ? 'first week' : `${Number(o.trialDays) || 7} days`) : '';
  const offers = o ? mH2('Keep going.')
    + mOffer('In person &middot; OverGravity', 'A 1-2-1 with Elliott',
      [`60 minutes, ${escH(o.s60)}. 90 minutes, ${escH(o.s90)}.`, 'Join coaching within 14 days and it comes off your first month.'],
      [{ href: `${site}/session.html`, label: 'Book a session' }])
    + mOffer('Coaching', 'Your own programme',
      ['A plan written around you, and a video form check every two weeks.',
        `${escH(o.online)} a month online. ${escH(o.inperson)} with a session in London each month.`, placesLine],
      [{ href: `${site}/#coaching`, label: 'See coaching' }])
    /* with the app itself on top (Elliott, 24 Oct 2026: "include pictures of
       the app in there"), and the muscle up plan that is on its way */
    + mOffer('On your own', 'The Handstand Ladder app',
      [`First stage free. The other five, ${escH(o.app)} a month, ${trialTxt} free.`,
        'A muscle up plan joins it soon.',
        o.store ? `On iPhone, ${escH(o.iphone || '£9.99')} a month. <a href="${escH(o.store)}" style="color:${MC.teal};font-weight:600">Get it on the App Store</a>` : ''],
      [{ href: `${site}/lha-app.html?ref=classmail`, label: 'Open the app' }])
      .replace('<tr><td class="px" style="padding:', `<tr><td style="padding:0;line-height:0;font-size:0"><a href="${escH(site)}/lha-app.html?ref=classmail"><img src="${escH((d.assets || site) + '/assets/site/app-screens-email.jpg')}" width="598" alt="The Handstand Ladder app: the ladder, a session playing, and a form check" style="display:block;width:100%;max-width:598px;height:auto;border:0;border-radius:23px 23px 0 0;${mf(M_SANS, 14, 20, 400)};color:${MC.grey}"></a></td></tr>
<tr><td class="px" style="padding:`)
    : '';
  const html = mShell(d, mHero(d) + review + mH2('Next dates.') + datesCard + offers);

  const T = mTextTop(d);
  T.push('LEAVE A REVIEW');
  if (d.review) T.push('One minute on Google. It is how the next class fills.', d.review, '');
  else T.push('Reply with a sentence about how you found it, good or bad. I read every one.', '');
  T.push('NEXT DATES');
  if (dates.length) dates.forEach(x => {
    T.push([x.day, x.what, x.time, x.place, x.price].filter(Boolean).join(', ') + (leftTxt(x) ? `. ${leftTxt(x)}` : ''));
    T.push(x.booked ? 'You are booked.' : x.full ? 'Full.' : `Book: ${x.href}`, '');
  });
  else T.push('New dates are on the way.', d.more || `${site}/handstand-class`, '');
  if (o) {
    T.push('KEEP GOING', '',
      `A 1-2-1 with Elliott, at OverGravity. 60 minutes, ${o.s60}. 90 minutes, ${o.s90}. Join coaching within 14 days and it comes off your first month.`,
      `${site}/session.html`, '',
      `Coaching, your own programme. A plan written around you, and a video form check every two weeks. ${o.online} a month online. ${o.inperson} with a session in London each month.${placesLine ? ' ' + mPlain(placesLine) : ''}`,
      `${site}/#coaching`, '',
      `The Handstand Ladder app. First stage free. The other five, ${o.app} a month, ${trialTxt} free. A muscle up plan joins it soon.`,
      `${site}/lha-app.html?ref=classmail`);
    if (o.store) T.push(`On iPhone, ${o.iphone || '£9.99'} a month: ${o.store}`);
    T.push('');
  }
  return { html, text: mTextEnd(T, d) };
}

/* ── three days after: a 1-2-1, or the free call ── */
export function nextStepEmail(d) {
  const site = d.site || SITE;
  const one = mOffer('In person &middot; OverGravity', 'A 1-2-1 with Elliott',
    ['Sixty or ninety minutes on your handstand and nothing else.', 'Join coaching within 14 days and it comes off your first month.'],
    [{ href: `${site}/session.html?kind=60`, label: `60 min, ${escH(d.s60)}`, main: true },
     { href: `${site}/session.html?kind=90`, label: `90 min, ${escH(d.s90)}` }]);
  const call = d.call ? mOffer('Not sure yet?', 'Fifteen minutes, free',
    ['Tell me what you are stuck on. I will tell you honestly where I would start you, even if the answer is the free app.'],
    [{ href: d.call, label: 'Book the free call' }]) : '';
  const html = mShell(d, mHero(d) + one + call);
  const T = mTextTop(d);
  T.push('A 1-2-1 WITH ELLIOTT, AT OVERGRAVITY',
    `Sixty or ninety minutes on your handstand and nothing else. 60 minutes, ${d.s60}. 90 minutes, ${d.s90}. Join coaching within 14 days and it comes off your first month.`,
    `${site}/session.html`, '');
  if (d.call) T.push('NOT SURE YET? FIFTEEN MINUTES, FREE',
    'Tell me what you are stuck on. I will tell you honestly where I would start you, even if the answer is the free app.', d.call, '');
  return { html, text: mTextEnd(T, d) };
}

/* ── the editorial email (14 Oct 2026) ────────────────────────────────
   For the emails that are meant to win somebody over rather than tell
   them a fact: the first ten days, the newsletter, and next the class
   follow ups. Built from blocks, after the newsletters Elliott liked: a
   film still with a two tone headline and a pill button, a white panel
   for the words with points or numbered steps, a dark panel for the one
   thing to do, a review. Tables and inline styles for the mail clients;
   Newsreader and Figtree where a client loads them, Georgia and
   Helvetica where it does not. Receipts, codes and reminders stay on
   the plain template: people read those for one fact. */
/* a still from a drill film, at the size Stream will make (the films are
   600 high at most) */
export const filmStill = (uid, sec, h = 600) => `${STREAM}${uid}/thumbnails/thumbnail.jpg?time=${Number(sec) || 2}s&height=${Math.min(600, h)}`;
const FS = "'Figtree',Helvetica,Arial,sans-serif", FD = "'Newsreader',Georgia,serif";
/* "Setup. Punchline." in two tones; one sentence stays whole */
export function twoTone(head, hi) {
  if (hi != null) return { a: String(head || ''), b: String(hi || '') };
  const s = String(head || '').trim(), m = s.match(/^(.+?[.?!])\s+(\S.*)$/);
  return m ? { a: m[1], b: m[2] } : { a: '', b: s };
}
const kick = (t, c) => t ? `<div style="font:600 11px/1.3 ${FS};letter-spacing:.16em;text-transform:uppercase;color:${c}">${escH(t)}</div>` : '';
function pill(b, dark) {
  if (!b || !b.href) return '';
  const bg = dark ? 'background:#ffffff' : 'background:linear-gradient(180deg,#0a7a76,#006663);background-color:#006663';
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px"><tr>
    <td style="${bg};border-radius:999px;padding:12px 12px 12px 26px"><a href="${escH(b.href)}" style="text-decoration:none;display:block">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:18px"><div style="font:600 17px/1.2 ${FS};color:${dark ? '#00403d' : '#ffffff'}">${escH(b.label)}</div>
          ${b.sub ? `<div style="font:600 10.5px/1.4 ${FS};letter-spacing:.12em;text-transform:uppercase;color:${dark ? '#5a5a5a' : '#cfe6ec'};margin-top:3px">${escH(b.sub)}</div>` : ''}</td>
        <td><div style="width:40px;height:40px;border-radius:50%;background:${dark ? '#006663' : '#ffffff'};color:${dark ? '#ffffff' : '#006663'};font:600 18px/40px Helvetica,Arial,sans-serif;text-align:center">&rarr;</div></td>
      </tr></table></a></td></tr></table>`;
}
const gap = '<tr><td style="height:16px;line-height:16px">&nbsp;</td></tr>';
const P = t => `<p style="margin:0 0 16px;font:400 17px/1.65 ${FS};color:#2b2f2e">${t}</p>`;
const blockHTML = {
  /* light: the app's look (Elliott, 22 Oct 2026), a white panel under the
     photo, the headline in ink with its last word in teal, the teal button */
  hero: b => b.light ? `<tr><td style="border-radius:24px 24px 0 0;overflow:hidden;background:#ffffff">${b.img ? `<a href="${escH(b.href || (b.btn && b.btn.href) || SITE)}"><img src="${escH(b.img)}" width="600" alt="${escH(b.alt || '')}" style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:24px 24px 0 0"></a>` : ''}</td></tr>
    <tr><td class="pad" style="background:#ffffff;border:1px solid #e3e8e8;border-top:0;border-radius:${b.img ? '0 0 24px 24px' : '24px'};padding:22px 30px 26px">
      ${kick(b.kicker, '#006663')}
      <div class="h1" style="font:400 34px/1.05 ${FD};letter-spacing:-.015em;color:#111111;margin-top:10px">${(() => { const h = String(b.head || ''), k = h.trim().lastIndexOf(' ');
        return k > 0 ? escH(h.slice(0, k)) + ' <span style="color:#006663">' + escH(h.slice(k + 1)) + '</span>' : escH(h); })()}</div>
      ${pill(b.btn, false)}</td></tr>` : `<tr><td style="border-radius:24px 24px 0 0;overflow:hidden;background:#00403d">${b.img ? `<a href="${escH(b.href || (b.btn && b.btn.href) || SITE)}"><img src="${escH(b.img)}" width="600" alt="${escH(b.alt || '')}" style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:24px 24px 0 0"></a>` : ''}</td></tr>
    <tr><td class="pad" style="background:#00403d;border-radius:${b.img ? '0 0 24px 24px' : '24px'};padding:${b.compact ? '18px 30px 22px' : '28px 36px 34px'}">
      ${kick(b.kicker, '#8fbeca')}
      <div class="h1" style="font:400 ${b.compact ? 32 : 40}px/1.05 ${FD};letter-spacing:-.015em;color:#8fbeca;margin-top:12px">${(() => { const t = twoTone(b.head, b.hi); return (t.a ? escH(t.a) + '<br>' : '') + `<span style="color:#ffffff">${escH(t.b)}</span>`; })()}</div>
      ${pill(b.btn, true)}</td></tr>`,
  card: b => `<tr><td class="pad" style="background:#ffffff;border-radius:24px;border:1px solid #e3e8e8;padding:34px 36px 20px">
      ${kick(b.kicker, '#006663')}
      ${b.head || b.hi ? `<div class="h2" style="font:400 32px/1.1 ${FD};letter-spacing:-.012em;color:${b.appTone ? '#111111' : '#8a8d8c'};margin:${b.kicker ? 10 : 0}px 0 0">${(() => { const t = twoTone(b.head, b.hi);
        /* appTone: the app's headline, ink with the last words in teal, on one line */
        return b.appTone ? (t.a ? escH(t.a) + ' ' : '') + `<span style="color:#006663">${escH(t.b)}</span>` : (t.a ? escH(t.a) + '<br>' : '') + `<span style="color:#111111">${escH(t.b)}</span>`; })()}</div>` : ''}
      ${b.points && b.points.length ? `${b.head || b.hi || b.kicker ? '<div style="height:1px;background:#e3e8e8;margin:24px 0 20px"></div>' : ''}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${
        b.points.reduce((rows, p, i) => { if (i % 2 === 0) rows.push([]); rows[rows.length - 1].push(p); return rows; }, []).map(row => `<tr>${row.map((p, j) =>
          `<td class="col" width="50%" style="padding:0 ${j ? 0 : 10}px 16px ${j ? 10 : 0}px;vertical-align:top"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:44px;height:44px;border-radius:12px;background:${b.soft ? '#cfe6ec' : '#00403d'};color:${b.soft ? '#00403d' : '#ffffff'};font:600 16px/44px Helvetica,Arial,sans-serif;text-align:center">${p[0]}</td>
            <td style="padding-left:14px;font:600 15px/1.35 ${FS};color:#111111">${p[1]}</td></tr></table></td>`).join('')}${row.length < 2 ? '<td class="col" width="50%"></td>' : ''}</tr>`).join('')
      }</table><div style="height:1px;background:#e3e8e8;margin:4px 0 22px"></div>` : (b.head || b.hi ? '<div style="height:22px"></div>' : '')}
      ${b.greeting ? P(`Hi ${escH(b.greeting)},`) : ''}
      ${(b.paras || []).slice(0, b.stepsAfter == null ? undefined : b.stepsAfter).map(P).join('')}
      ${b.steps && b.steps.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">${b.steps.map((s, i) => `<tr>
        ${s.img ? `<td class="col stepimg" width="236" style="padding:0 0 18px;vertical-align:top"><img class="stepph" src="${escH(s.img)}" width="236" alt="${escH(s.alt || s.title || '')}" style="display:block;width:236px;max-width:100%;height:auto;border:0;border-radius:14px"></td>` : ''}
        <td class="col steptxt" style="padding:4px 0 18px ${s.img ? 20 : 0}px;vertical-align:top">
          <div style="width:28px;height:28px;border-radius:50%;background:#111111;color:#ffffff;font:600 13px/28px Helvetica,Arial,sans-serif;text-align:center">${i + 1}</div>
          <div style="font:600 17px/1.3 ${FS};color:#111111;margin-top:10px">${escH(s.title)}</div>
          ${s.text ? `<div style="font:400 15px/1.55 ${FS};color:#5a5a5a;margin-top:4px">${escH(s.text)}</div>` : ''}</td></tr>`).join('')}</table>` : ''}
      ${b.stepsAfter == null ? '' : (b.paras || []).slice(b.stepsAfter).map(P).join('')}
      ${b.closer ? `<div style="height:1px;background:#e3e8e8;margin:4px 0 18px"></div><p style="margin:0 0 14px;font:400 18px/1.5 ${FS};color:#111111">${b.closer}</p>` : ''}
      ${pill(b.btn, false)}${b.btn ? '<div style="height:14px"></div>' : ''}</td></tr>`,
  dark: b => `<tr><td class="pad" style="background:#0f1a19;border-radius:24px;padding:34px 36px">
      ${kick(b.kicker, '#8fbeca')}
      <div class="h2" style="font:400 34px/1.08 ${FD};letter-spacing:-.012em;color:#7f8c8a;margin-top:12px">${(() => { const t = twoTone(b.head, b.hi); return (t.a ? escH(t.a) + '<br>' : '') + `<span style="color:#ffffff">${escH(t.b)}</span>`; })()}</div>
      ${(b.paras || []).map(t => `<p style="margin:16px 0 0;font:400 17px/1.65 ${FS};color:#c9d2d1">${t}</p>`).join('')}
      ${b.card ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;background:#1b2726;border-radius:16px"><tr><td style="padding:16px 20px">
        ${kick(b.card.kicker, '#f3a949')}<div style="font:400 22px/1.2 ${FD};color:#ffffff;margin-top:8px">${escH(b.card.title)}</div>
        ${b.card.line ? `<div style="font:400 14px/1.5 ${FS};color:#c9d2d1;margin-top:2px">${escH(b.card.line)}</div>` : ''}</td></tr></table>` : ''}
      ${pill(b.btn, false)}</td></tr>`,
  quote: b => `<tr><td class="pad" style="background:#ffffff;border-radius:24px;border:1px solid #e3e8e8;padding:30px 36px">
      <div style="font:400 15px/1 Helvetica,Arial,sans-serif;letter-spacing:3px;color:#006663">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
      <div style="font:400 24px/1.3 ${FD};color:#111111;margin-top:12px">&ldquo;${escH(b.text)}&rdquo;</div>
      <div style="font:400 14px/1.4 ${FS};color:#5a5a5a;margin-top:12px">${escH(b.by || '')}</div></td></tr>`,
};
/* Points are [icon, words] and both are written in the code, so they may
   carry a <br>; everything typed by a person is escaped. */
/* blocks in order; the footer carries the why, the address and the
   unsubscribe (a URL, or <!--UNSUB--> for the sender to fill in) */
export function richEmail({ title, preheader, blocks = [], sign = 'See you soon, Elliott', why, unsub }) {
  const body = blocks.filter(Boolean).map(b => (blockHTML[b.t] || (() => ''))(b)).filter(Boolean).join(gap);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">
<title>${escH(title || '')}</title>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
<style>body{margin:0;padding:0;background:#f4f4f5}a{color:#006663}
@media (max-width:620px){.wrap{width:100%!important}.pad{padding-left:22px!important;padding-right:22px!important}.h1{font-size:34px!important}.h2{font-size:27px!important}
.col{display:block!important;width:100%!important;padding:0 0 14px!important}.stepph{width:100%!important}.steptxt{padding:12px 0 26px!important}}</style></head>
<body style="margin:0;padding:0;background:#f4f4f5">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escH(preheader || '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5"><tr><td align="center" style="padding:24px 12px 40px">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px">
  <tr><td class="pad" style="padding:0 6px 16px;font:600 11px/1 ${FS};letter-spacing:.16em;text-transform:uppercase;color:#006663">London Handstand Academy</td></tr>
  ${body}
  <tr><td class="pad" style="padding:26px 10px 0;text-align:center;font:400 12.5px/1.7 ${FS};color:#8a8d80">
    ${sign ? escH(sign) + '<br>' : ''}${why ? escH(why) + '<br>' : ''}
    <a href="${SITE}" style="color:#8a8d80">londonhandstandacademy.com</a> &nbsp;&middot;&nbsp; <a href="mailto:info@londonhandstandacademy.com" style="color:#8a8d80">info@londonhandstandacademy.com</a>${unsub ? ` &nbsp;&middot;&nbsp; <a href="${unsub}" style="color:#8a8d80">Unsubscribe</a>` : '<!--UNSUB-->'}
  </td></tr>
</table></td></tr></table></body></html>`;
}

/* What each of the first ten days looks like (14 Oct 2026): a still from
   the film it is about, and a few points or steps. The words above them
   stay the ones written in the dashboard; these only frame them. */
const BAILOUT = '362da5a70cede1b49229a635829656ca';
const TIP_LOOK = {
  1: { kicker: 'Day 1 · Wrists first', img: filmStill('a7cd457020f580093be946524a84c3af', 3), alt: 'Wrist circles on the mat',
       points: [['2', 'Two minutes,<br>every session'], ['&#10003;&#65038;', 'At the top of<br>every session'], ['&#8635;&#65038;', 'A mobility day<br>for the off days'], ['&pound;0', 'Free in<br>Foundations']] },
  2: { kicker: 'Day 2 · The way up', img: filmStill('58fc55e74e70f2bd27233abfd289d4e8', 5), alt: 'Chest to wall handstand, pushing the floor away',
       steps: [{ img: `${SITE}/assets/email/l-handstand-stack.jpg`, alt: 'L shaped handstand on a box, a green line through hands, shoulders and hips', title: 'The chair assisted handstand', text: 'Feet on a box or chair, hips over shoulders, shoulders over hands. Get used to being upside down.' },
               { img: filmStill('aa4d27ce00fb663bc340ccac433d2d43', 6, 300), title: 'Wall walks', text: 'Walk the feet up and the hands in, then back down with control.' },
               { img: filmStill(BAILOUT, 7, 300), title: 'Learn to fall', text: 'Chest to wall bailouts, until coming down is something you do on purpose.' },
               { img: filmStill('58fc55e74e70f2bd27233abfd289d4e8', 5, 300), title: 'Chest to wall handstand', text: 'All the way in. Push the floor away and hold.' }] },
  4: { kicker: 'Day 4 · How often', img: filmStill('aa4d27ce00fb663bc340ccac433d2d43', 6), alt: 'Walking up the wall',
       points: [['2&times;', 'Twice<br>a week'], ['15', 'Fifteen minutes<br>is enough'], ['6', 'Six drills,<br>one set each'], ['&#8635;&#65038;', 'A different<br>session each time']] },
  7: { kicker: 'Day 7 · Film it', img: filmStill('51a36a15330dd845d7099de1712cf8d2', 3), alt: 'A kick up to the wall, filmed side on',
       points: [['&#9654;&#65038;', 'Side on, phone<br>on the floor'], ['&#9634;&#65038;', 'Your whole body<br>in frame'], ['30s', 'Thirty seconds<br>of film'], ['&#10003;&#65038;', 'Log it as<br>a check point']] },
  10: { kicker: 'Day 10 · Falling', img: filmStill(BAILOUT, 2), alt: 'Walking up the wall for a bailout',
       steps: [{ title: 'Jump and turn', text: 'Kick up a little, turn your hips and land on your feet beside your hands.' },
               { title: 'The cartwheel out', text: 'Get your hips over your hands, then fall out to the side, never over the top.' },
               { img: filmStill(BAILOUT, 7, 300), title: 'The chest to wall bailout', text: 'Walk up the wall, take one leg out to the side, step a hand and turn down.' }] },
};
export function tipEmail(day, T, first, site) {
  const L = TIP_LOOK[day] || {}, href = `${site || SITE}/lha-app.html?ref=tip${day}`;
  return richEmail({ title: T.title, preheader: String((T.paras || [])[0] || '').replace(/<[^>]+>/g, '').slice(0, 110),
    blocks: [
      { t: 'hero', img: L.img, alt: L.alt, href, kicker: L.kicker, head: T.title, btn: { label: "Open today's session", sub: 'Free in the app', href } },
      { t: 'card', greeting: first, paras: T.paras, points: L.points, steps: L.steps, stepsAfter: L.steps ? 1 : undefined,
        btn: L.steps ? { label: 'Train it in the app', sub: 'Foundations · filmed with cues', href } : undefined },
    ],
    sign: 'Elliott, London Handstand Academy', why: T.footnote || '' });
}

/* ── started booking and stopped: the morning after, and three days on ──
   Built here so the dashboard's preview and the daily job are the same
   email. ctx: first, title, when (wsWhenTxt), place, price ('£25' or
   'Free'), left (places, 0 when uncapped), pair (pence, 0 when none). */
const CLASS_PHOTO = 'https://pub-a41021d2de574a8ab55c29a1e5d7dd88.r2.dev/website-photo/latest-workshop-group-handstand-picture.jpg';
export function intentEmail(T, x, site) {
  const S = site || SITE, pair = x.pair ? '£' + (x.pair / 100).toFixed(2).replace(/\.00$/, '') : '';
  const book = { label: 'Book your place, ' + x.price, sub: String(x.when || '').split(', ')[0] + (x.left ? ` · ${x.left} left` : ''), href: x.href || `${S}/handstand-class?src=email#book` };
  return richEmail({ title: T.title, preheader: `No payment was taken, and the place is still open: ${x.when}.`,
    blocks: [
      { t: 'hero', img: CLASS_PHOTO, alt: 'The last class at OverGravity, everyone upside down', href: book.href, kicker: 'In person, London', head: T.title, btn: book },
      { t: 'card', greeting: x.first, paras: T.paras,
        points: [x.coach && !/\band\b|&/.test(x.coach) ? ['1', 'With ' + escH(x.coach) + ',<br>a small group'] : ['2', 'Two coaches,<br>a small group'],
          ['&#8597;&#65038;', 'Grouped<br>by level'], ['&#9873;&#65038;', 'OverGravity,<br>wall and mats'],
          [x.price === 'Free' ? '&pound;0' : escH(x.price), x.early ? 'Until ' + escH(x.early.day) + ',<br>then ' + escH(x.early.then) : pair ? 'Save ' + pair + '<br>on both Saturdays' : 'A place,<br>no account']] },
      { t: 'quote', text: 'Both great teachers with a lot of experience... Also felt very safe in class.', by: 'Anna, Google review' },
      { t: 'card', btn: book },
    ], sign: 'Elliott, London Handstand Academy', why: T.footnote || '' });
}
/* an offer to somebody who started booking a class and did not finish:
   a code the coach made, the price it brings it to, and the button, which
   carries the code to the booking page (22 Oct 2026). ctx: first, title,
   when, place, price, now (the price with the code), off, code, until,
   left, coach, href */
export function offerEmail(T, x, site) {
  const S = site || SITE;
  const book = { label: 'Book for ' + x.now + ' with ' + x.code, sub: String(x.when || '').split(', ')[0] + (x.left ? ` · ${x.left} left` : ''), href: x.href || `${S}/handstand-class?src=offer#book` };
  return richEmail({ title: T.title, preheader: `Code ${x.code} takes ${x.off} off: ${x.now} instead of ${x.price}, until ${x.until}.`,
    blocks: [
      /* the photo trimmed top and bottom, and a smaller green panel (Elliott, 22 Oct 2026) */
      { t: 'hero', img: `${S}/assets/site/class-photo-email.jpg`, alt: 'The last class at OverGravity, everyone upside down', href: book.href, compact: true, light: true,
        kicker: x.left ? `${x.left} place${x.left === 1 ? '' : 's'} left` : 'In person, London', head: T.title, btn: book },
      { t: 'card', greeting: x.first, paras: T.paras },
      /* the review is about two coaches, so it is left out when one coaches */
      ...(x.coach && !/\band\b|&/.test(x.coach) ? [] : [{ t: 'quote', text: 'Both great teachers with a lot of experience... Also felt very safe in class.', by: 'Anna, Google review' }]),
      /* the free app, where the second button was, under the cover of the
         Instagram carousel (Elliott, 23 Oct 2026) */
      { t: 'hero', light: true, img: `${S}/assets/site/app-cover-email.jpg`, alt: 'The Handstand Ladder app: your handstand, step by step',
        href: `${S}/lha-app.html?ref=offer`, kicker: 'Between classes', head: 'Train at home, free.',
        btn: { label: 'Open the free app', sub: 'Foundations · no account needed', href: `${S}/lha-app.html?ref=offer` } },
    ], sign: 'Elliott, London Handstand Academy', why: T.footnote || '' });
}
/* the last day of an early bird price, to somebody who started booking:
   the price, the hour it ends, the button. ctx as intentEmail, plus then */
export function earlyEmail(T, x, site) {
  const S = site || SITE;
  const book = { label: 'Book your place, ' + x.price, sub: 'Until ' + (!x.at || x.at === 'midnight' ? 'midnight tonight' : x.at + ' today') + ', then ' + x.then, href: x.href || `${S}/handstand-class?src=email#book` };
  return richEmail({ title: T.title, preheader: `${x.price} until ${!x.at || x.at === 'midnight' ? 'the end of today' : x.at + ' today'}, then ${x.then}. ${x.when}.`,
    blocks: [
      { t: 'hero', img: CLASS_PHOTO, alt: 'The last class at OverGravity, everyone upside down', href: book.href, kicker: 'Ends today', head: T.title, btn: book },
      { t: 'card', greeting: x.first, paras: T.paras, btn: book },
    ], sign: 'Elliott, London Handstand Academy', why: T.footnote || '' });
}
export function intent2Email(T, x, site) {
  const S = site || SITE, [day, ...time] = String(x.when || '').split(', '), app = `${S}/lha-app.html?ref=workshop`;
  return richEmail({ title: T.title, preheader: `${day}: places are still open. Or start at home, free.`,
    blocks: [
      { t: 'hero', img: filmStill('aa4d27ce00fb663bc340ccac433d2d43', 6), alt: 'Walking up the wall, in the free app', href: app,
        kicker: 'Handstand, this week', head: T.title, btn: { label: 'Try the free app', sub: 'Foundations · no account needed', href: app } },
      { t: 'card', greeting: x.first, paras: T.paras },
      { t: 'dark', kicker: 'Or come on Saturday', head: '', hi: x.title,
        card: { kicker: x.left ? `${x.left} place${x.left === 1 ? '' : 's'} left` : 'Places open', title: day, line: [time.join(', '), x.place || 'OverGravity, Shadwell', x.price].filter(Boolean).join(' · ') },
        btn: { label: 'Book your place', sub: x.price, href: x.href || `${S}/handstand-class?src=email#book` } },
    ], sign: 'Elliott, London Handstand Academy', why: T.footnote || '' });
}
