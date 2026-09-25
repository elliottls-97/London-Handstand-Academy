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
    "vars": [
      "name"
    ],
    "subject": "Your form check is ready to send",
    "title": "Your form check is ready to send.",
    "paras": [
      "Open the app, go to Form check, and send the clip: side on, whole body in frame, one clean attempt. Elliott watches it himself and writes back within 48 hours."
    ]
  },
  "welcomeCoaching": {
    "name": "Welcome to coaching",
    "when": "When someone buys online coaching or Inner Circle",
    "vars": [
      "name",
      "tier",
      "coach",
      "password_line"
    ],
    "subject": "You are in: {tier}",
    "title": "You are in.",
    "paras": [
      "{password_line}",
      "Open the app and your Start page walks you through it: put the app on your Home Screen with notifications on, so you hear the moment I reply; a few questions; a few tests to film and send me; a call to book. Then I write your first block.",
      "Everything happens in the app from here: your clips, my replies, and your programme."
    ]
  },
  "cardFailed": {
    "name": "Card did not go through",
    "when": "When a subscription payment bounces",
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
      "place"
    ],
    "subject": "Tomorrow: {title}",
    "title": "See you tomorrow.",
    "paras": [
      "<b>{title}</b>, {when}{place}.",
      "Wear something you can move in and bring water. Arrive ten minutes early so we start on time.",
      "If you cannot make it, reply to this and we will sort it."
    ]
  },
  "wsThanks": {
    "name": "Workshop, the day after",
    "when": "10 to 40 hours after a workshop",
    "vars": [
      "name",
      "title",
      "review_line",
      "app_line"
    ],
    "subject": "How was {title}?",
    "title": "Thank you for coming.",
    "paras": [
      "Two things would help a lot.",
      "{review_line}",
      "{app_line}"
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
  return { subject: fill(pick('subject')), title: fill(pick('title')), paras, footnote: fill(pick('footnote') || '') };
}
