# London Handstand Academy, brand brief

Hand this to Claude Design, or any designer, before they draw anything.
It describes what London Handstand Academy already looks like and sounds
like, so new work joins it rather than starting a second brand beside it.

Two surfaces share one identity: **the website** (londonhandstandacademy.com)
and **the app** (the Handstand Ladder, plus the coach dashboard). They use
the same teal, the same two typefaces and the same voice. They differ in
ground colour and in how much glass they use, and that difference is
deliberate: the site sells, the app is used at the wall with sweaty hands.

---

## 1. What this is

Handstand coaching in London, run by one person. Elliott Staley, a
physiotherapist who coaches handstands, working out of OverGravity in
Shadwell and online. The business is him: every clip is watched by him,
every reply is written by him.

That is the whole positioning, and it is what the design has to protect.
Anything that makes it look like a content platform, an AI product or a
fitness app with a subscription funnel is off brand, however smart it is.

**Who it is for.** Adults who train on their own and have hit something
they cannot fix by trying harder. Most are between "I can kick up to a
wall" and "I can hold it for ten seconds". They are not beginners at
exercise and they are not gymnasts.

---

## 2. Colour

### The one that matters

**Teal `#006663`.** Everything else supports it. It is the brand, the
primary button, the eyebrow text, the tick. It replaced an orange
identity entirely, so **anything orange that is not the one amber use
below is a leftover, not a choice**.

### The full set

| Role | Hex | Notes |
|---|---|---|
| Primary teal | `#006663` | buttons, eyebrows, the word in the headline |
| Deep teal | `#00403D` | text on pale grounds, filled badges |
| Soft teal | `#0A7B74` | the logo's brighter teal; gradient tops, ticks, prices on the site |
| Pale blue | `#CFE6EC` | fill only |
| Mid blue | `#8FBECA` | fill only. As text it lands near 3:1 and fails AA |
| Ink | `#111111` | all body text |
| Grey | `#5A5A5A` | secondary text |
| Grey 2 | `#686868` | tertiary text |
| Amber | `#F3A949` | one thing at a time, see below |
| Terracotta | `#C07A18` | the site only: prices, stars, a highlight |
| Red | `#A4503C` | the only warning colour |
| On primary | `#F7F4F1` | off-white, for text on teal |

### Grounds, which differ by surface

- **Website:** warm cream `#F2EFEB`, with a hero gradient
  `linear-gradient(168deg, #F5F2EE 0%, #ECE7E2 55%, #E7E2DC 100%)`.
- **App:** cool near-white `#F4F4F5` with three soft washes over it.
  The cool value is load-bearing: over the warm cream the washes vanish.

```css
/* the app's ground */
background:
  radial-gradient(circle at 15% 8%,  rgba(0,102,99,.07),    transparent 40%),
  radial-gradient(circle at 90% 30%, rgba(143,190,202,.12), transparent 45%),
  radial-gradient(circle at 30% 80%, rgba(243,169,73,.05),  transparent 40%),
  #f4f4f5;
```

### Rules about colour

- **Amber is for one thing at a time.** The step you are on, a single
  unread dot, the in-person workshop flag. It is not a second brand
  colour and two amber things on one screen is one too many.
- **Teal cannot carry warning.** If something is wrong, it is `#A4503C`.
- **No green blocks.** A whole screen or hero filled with `#006663` is
  the design that was removed in September 2026. Teal is an accent on a
  pale ground, not a background.
- **No translucent form fields.** `rgba(255,255,255,.08)` inputs came
  from the old dark design. Fields are white with a hairline.

---

## 3. Type

Two faces, both Google Fonts, both already loaded on every page.

- **Newsreader** (serif, 300 to 600) for display: headlines, prices,
  big numbers, card titles. Sentence case, never all caps.
- **Figtree** (sans, 400 to 700) for everything else: body, labels,
  buttons, small caps eyebrows.

### The headline pattern

This is the single most recognisable thing in the identity. Every screen
and most sections open the same way: a small-caps eyebrow in teal, then a
serif line with **the last word or phrase in teal**.

```html
<div style="font:600 11px/1 Figtree;letter-spacing:.14em;
  text-transform:uppercase;color:#006663">Good morning</div>
<div style="font:400 46px/.98 Newsreader;letter-spacing:-.015em;margin-top:8px">
  Get upside <em style="color:#006663;font-style:normal">down.</em></div>
```

The `<em>` is set to `font-style:normal` on purpose. It is a colour
change, not italics.

### Sizes that are already in use

52 welcome · 46 a main screen · 44 sign in · 40 a section · 36 a stage ·
32 a sheet heading · 26 a card title. Body 14 to 16.5, line height 1.5
to 1.6. Eyebrows 9.5 to 11px, `letter-spacing:.12em` to `.16em`, upper.

Numbers that are read as quantities get `font-variant-numeric:tabular-nums`.

---

## 4. Components

### Cards

Solid white, a hairline, and a two-layer shadow. One shadow reads as a
box; two read as something lifting off the ground.

```css
background:#fff;
border-radius:26px;
padding:22px 20px;
border:1px solid rgba(0,64,61,.10);
box-shadow:0 1px 2px rgba(0,64,61,.05), 0 8px 20px rgba(0,64,61,.06);
```

Hairlines: `.10` for panels, `.14` for controls, `.18` for something
picked out. Radii: 26 a card, 20 a small card, 16 a control, 999 a pill.

### The primary button

Never a flat fill.

```css
background:linear-gradient(180deg,#0a7a76,#006663);
color:#f7f4f1;
box-shadow:0 12px 30px rgba(0,102,99,.3), inset 0 1px 0 rgba(255,255,255,.35);
border-radius:16px;
```

68px tall for the one action a screen exists for, 52 to 60 otherwise.
Label is `600 17px` Figtree. No text arrow when there is a play disc
beside it: the two say the same thing and the label wraps at 375px.

### Segmented controls

A tinted track holding pills. The live one goes white and lifts.

```
track  background:rgba(0,64,61,.08); border-radius:14px; padding:4px
on     background:#fff; color:#00403D; box-shadow:0 1px 2px rgba(17,17,17,.08)
off    background:transparent; color:#5A5A5A
```

Disabled is `opacity:.35` with a `title` saying why, never a hidden
control.

### Glass, on the website only

The site uses frosted surfaces over the cream: `rgba(255,255,255,.5)` to
`.74` with `backdrop-filter:blur(16px)` to `blur(28px)`. The app does
this only for the header once scrolled and for bottom sheets.

### Bottom sheets, app only

`rgba(250,248,246,.94)`, `backdrop-filter:blur(28px) saturate(180%)`,
radius `28px 28px 0 0`, sliding up over 450ms.

---

## 5. Voice

Read anything you write back in Elliott's voice. He is direct, warm,
unhurried, and never salesy. He says what a thing is and what it costs.

**Do**
- Short declarative sentences. "One clip. One written answer, within 48 hours."
- Say the real number. "45 seconds", "£35 a month", "within 48 hours".
- Name the person doing it. "I watch it, not a bot."
- Let a sentence be plain. "Foundations stays free, always."

**Do not**
- Exclamation marks, "unlock", "crush", "journey", "game-changer".
- Feature lists that describe what the reader already has for free.
- Urgency that is not true. If there are three places, say three places.

### House rule, and it is absolute

**No em dashes and no en dashes, anywhere in customer-facing copy.**
Not as punctuation, not in ranges. Rewrite the sentence rather than
swapping the character: use a comma, a full stop, a colon, or the word
"to" in a range. Write "45 to 60 seconds". The version with a
dash in it is the thing this rule exists to stop.

---

## 6. Photography and video

Real footage of real people at OverGravity, shot side on with the whole
body in frame. No stock, no illustration of a handstand, no silhouettes.
Vertical for anything that appears in the app; 16:9 for the site's hero.

Every drill clip carries captions on a glass plate low in the frame, the
line in Newsreader with one word lit in `#3F8F8C` as it is spoken.

---

## 7. What the money is

Say these exactly. They change, so check before publishing.

| | |
|---|---|
| The Handstand Ladder app | £5 a month, first stage free for ever |
| Form check | one free with an account, then £35 a month |
| Coaching, online | £120 a month |
| Coaching, with a session in London | £190 a month |
| Inner Circle | £320 a month, three places, by application |
| A one-off session | £80 for 60 min, £100 for 90 min |

No joining fees on anything. Everything is month to month.

---

## 8. Layout and accessibility

- Design at **375px** first. Most people meet this on a phone, often in
  a gym. Test that nothing scrolls sideways at that width.
- Tap targets at least 44px.
- Body text never below 12.5px, and grey text never on a tinted fill.
- The app is a single centred column, max 520px, even on a desktop.
- Dark mode does not exist yet. Do not design one half.

---

## 9. What "off brand" looks like

If a draft has any of these, it is not this brand:

- A dark green or gradient-filled hero
- Orange as an accent
- All-caps display type, or a condensed sans
- Stock photography of gyms
- A countdown, a badge saying "most popular", or fake scarcity
- An em dash
