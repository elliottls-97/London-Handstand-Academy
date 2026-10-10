/* The ladder, as data. Nothing in here calls anything.

   It lived inside lha-app.html, which meant the coach dashboard could not
   show a workout without keeping a second copy that would drift. Both
   pages load this file instead.

   A classic script loaded before the app's own, so these consts sit in the
   shared global lexical scope and every reader sees them exactly as it did
   when they were inline. */

const CHECKPOINTS={
  0:[
    {k:'ch-assist',   n:'Chair-assisted handstand', kind:'secs',  target:20, demo:'chair-assisted-knee-lifts', note:'Stacked? How long did you hold it?'},
    {k:'fall-comfort',n:'Falling off the wall',     kind:'face',  demo:'fear-of-falling-cartwheel', note:'How comfortable does bailing out feel?', faces:['Not really','Getting there','Comfortable']},
    {k:'wall-45',     n:'45-degree wall hold',      kind:'secs',  target:30, demo:'45-degree-wall-hold', note:'Alignment held, not just time on the clock.'},
    {k:'plank',       n:'Plank pose',               kind:'secs',  target:60, demo:'plank-pose'},
    {k:'crow',        n:'Crow pose',                kind:'secs',  target:10, demo:'crow-pose'},
    {k:'chaturanga',  n:'Chaturanga push-ups',      kind:'count', target:5,  demo:'push-ups-on-knees', note:'On the knees.'},
    {k:'kickup-rate', n:'Kick up to the wall',      kind:'count', target:8,  demo:'wall-kick-ups', note:'Out of ten attempts, how many landed?'}
  ],
  1:[
    {k:'ctw-hold',    n:'Chest-to-wall handstand',  kind:'secs',  target:30, demo:'chest-to-wall-handstand'},
    {k:'scap-shrugs', n:'Wall scapula shrugs',      kind:'count', target:15, demo:'wall-scapula-shrugs'},
    {k:'sl-tuck',     n:'Single-leg tuck slides',   kind:'count', target:10, demo:'single-leg-tuck-slides', note:'One side. How deep does the knee slide?'},
    {k:'pike-neg',    n:'Pike push-up negatives',   kind:'count', target:8,  demo:'pike-press-ups'},
    {k:'pike-full',   n:'Pike push-ups, full reps', kind:'count', target:5,  demo:'pike-press-ups'},
    {k:'nose-toes',   n:'Nose to toes',             kind:'secs',  target:20, note:'The main drill for this stage.'},
    {k:'assist-entry',n:'Knee to chest kick ups', kind:'count', target:10, demo:'knee-to-chest-kick-ups'}
  ],
  2:[
    {k:'tuck-depth',  n:'Tuck slides',              kind:'face',  demo:'tuck-slides', note:'Film it. Are the shoulders stacked at depth?', faces:['Not stacked','Nearly','Stacked']},
    {k:'slide-count', n:'Slide aways',              kind:'count', target:10, demo:'slide-away'},
    {k:'slide-off',   n:'Coming off the wall',      kind:'face',  demo:'slide-away', note:'Do you leave it on purpose, or slide and stay?', faces:['Still stuck','Sometimes','I leave it']},
    {k:'box-dist',    n:'Knees on box, distance',   kind:'count', target:40, unit:'cm', lower:true, demo:'knees-on-box', note:'Hands to box on your best hold. Smaller is better.'},
    {k:'box-time',    n:'Knees on box, hold',       kind:'secs',  target:20, demo:'knees-on-box'},
    {k:'step-ups',    n:'Step ups',                 kind:'count', target:10, demo:'chair-assisted-step-ups'},
    {k:'entry-clean', n:'Entries to eight clean',   kind:'breaks',target:12, demo:'straddle-entries'}
  ],
  3:[
    {k:'side-away',   n:'Full slide away',          kind:'secs',  target:5,  demo:'slide-away'},
    {k:'tuck-takeoff',n:'Tuck take-offs',           kind:'secs',  target:5,  demo:'tuck-take-offs'},
    {k:'box-lifts-l', n:'Knees on box, left leg lifts',  kind:'count', target:10, demo:'knees-on-box'},
    {k:'box-lifts-r', n:'Knees on box, right leg lifts', kind:'count', target:10, demo:'knees-on-box'},
    {k:'shape-wall',  n:'Shape changes on the wall',kind:'count', target:8,  demo:'wall-shape-changes', note:'Straddle to straight.'},
    {k:'free-attempt',n:'Freestanding balance attempts', kind:'count', target:10}
  ],
  4:[
    {k:'tuck-entries',      n:'Tuck entries',           kind:'breaks', target:12, demo:'tuck-entries'},
    {k:'straight-entries',  n:'Straight entries',       kind:'breaks', target:12, demo:'straight-entries'},
    {k:'straddle-entries',  n:'Straddle entries',       kind:'breaks', target:12, demo:'straddle-entries'},
    {k:'straddle-to-straight',n:'Straddle to straight', kind:'breaks', target:14, demo:'straddle-to-straight'},
    {k:'straight-to-tuck-back',n:'Straight to tuck and back', kind:'breaks', target:14, demo:'straight-to-tuck-back'},
    {k:'straddle-to-diamond',n:'Straddle to diamond',   kind:'breaks', target:14, demo:'straddle-to-diamond'}
  ],
  /* the six physical tests from the press masterclass: the start of the
     stage, and the week-six retest */
  5:[
    {k:'t-chair',    n:'Chair-assisted handstand hold', kind:'secs',  target:30, demo:'chair-assisted-handstand-walks', note:'Feet on a chair, hips stacked over the shoulders, arms straight. Film from the side.'},
    {k:'t-pancake',  n:'Pancake reach',                 kind:'face',  demo:'pancake-lift-combo', note:'Chest flat on the floor is the goal.', faces:['Hands only','Chest close','Chest flat']},
    {k:'t-pike',     n:'Pike push-ups',                 kind:'count', target:9,  demo:'p-pike-pushups', note:'Full range, head to the floor.'},
    {k:'t-compress', n:'Seated compression lift',       kind:'secs',  target:10, demo:'pike-hip-lifts', note:'Heels off the floor and held.'},
    {k:'t-overhead', n:'Overhead reach',                kind:'face',  note:'Wrists touch with the back flat.', faces:['Wrists nowhere near','Ribs flare','Back flat']},
    {k:'t-wallpress',n:'Chest-to-wall descent',         kind:'face',  demo:'press-eccentrics', note:'Down and back up, smoothly.', faces:['Cannot lower','A fight','Smooth']}
  ]
};

const CP_KIND={
  /* max is the top of the slider, not a limit on what can be logged. lower
     means a smaller number is the better one, which the breaks kind needs or
     the bar reads backwards. */
  secs:  {unit:'s',   label:'Seconds held', max:90},
  count: {unit:'',    label:'How many',     max:20},
  rate:  {unit:'/10', label:'Out of ten',   max:10},
  breaks:{unit:'',    label:'Goes to reach it', max:25, lower:true, suffix:' goes'},
  yn:    {unit:'',    label:'Yes or no'},
};
/* Targets and demo drills from the ladder design. `demo` is a library slug,
   so a check point can show the drill it is measuring. */

const STAGES=[
 {n:'Foundations',sum:'Getting used to being upside down, kicking up with confidence, and learning to fall safely.',rec:'We recommend two to three sessions a week.',goal:'Kick up with confidence, feel at home upside down, and know how to fall safely.',hold:'15s',intro:'Everything you need before going upside down for real. Wrist and shoulder resilience, kicking up with confidence, time spent upside down, and how to come down safely when it goes wrong.',
  ch:'Chest-to-wall hold',chSub:'Kick up to the wall and hold for 30 seconds. Do it with me.',
  drillIds:['wrist-circles-mob','plank-fingertip-lifts','shoulder-circles','downward-dog-pulses','chest-to-wall-bailouts','wall-walks','kick-up-bounces','wall-scapula-shrugs','chest-to-wall-handstand','wall-kick-ups','p-l-handstand','chair-assisted-knee-lifts','chair-assisted-step-ups','dd-float-drills','p-dd-toe-taps','chaturganga-push-ups','p-pike-pushups-knees','dd-wrist-taps','palm-lifts-table-top','bunny-hops','knee-to-chest-kick-ups','fear-of-falling-cartwheel','proper-cartwheel','45-degree-wall-hold','push-ups-on-knees','floor-scapula-push-ups','chair-assisted-handstand-walks','chair-assisted-handstand-shoulder-adjustments','crow-pose','plank-pose']},
 {n:'Wall Work',sum:'Longer holds on the wall, stronger shoulders, and your first moves against it.',goal:'Hold chest-to-wall for 30 seconds and start moving on the wall.',hold:'30s',intro:'Now you own the wall, get strong and mobile on it. Scapular strength, longer holds, and the first movements that take weight off the wall.',
  ch:'Slide away & hold',chSub:'Slide off the wall and hold your balance as long as you can. Aim for 15 seconds.',
  drillIds:['wall-scapula-shrugs','wall-walks','tuck-slides','single-leg-tuck-slides','lateral-slide-outs','slide-away','pike-press-ups','knees-on-box','wall-kick-ups-progressions','p-tuck-handstand','knees-on-box-single-leg-lifts','knees-on-box-knee-lift-offs','shoulder-pulses','chair-assisted-handstand-shoulder-adjustments','chair-assisted-handstand-scapula-shrugs','floor-scapula-push-ups']},
 {n:'Pushing More',sum:'Taking your weight off the wall on purpose: slides, box work and cleaner entries.',goal:'Own the assisted balance: slides, box work and clean entries.',hold:'20s',
  intro:'A short refining stage. You can hold the wall and now you take weight off it deliberately: tuck slides with the shoulders stacked, sliding away under control, and entries clean enough to repeat. It is the difference between leaving the wall and being pushed off it.',
  ch:'Slide away & hold',chSub:'Slide off the wall and hold what you find. Aim for 20 seconds.',
  drillIds:['tuck-slides','single-leg-tuck-slides','lateral-slide-outs','slide-away','knees-on-box','knees-on-box-single-leg-lifts','knees-on-box-knee-lift-offs','chair-assisted-step-ups','tuck-entries','straddle-entries','straight-entries','p-plank-slides','wall-scapula-shrugs','wall-shape-changes']},
 {n:'Take-Off',sum:'Leaving the wall for your first real seconds of balance.',goal:'Leave the wall into brief moments of freestanding balance.',hold:'5s',intro:'This is where the wall disappears. Single-leg take-offs, box work and tuck take-offs build the control to leave on your own terms.',
  ch:'Free handstand attempt',chSub:'Take off and catch your balance. Hold whatever you find.',
  drillIds:['knees-on-box','single-leg-take-off','single-leg-wall-removals','slide-away','tuck-take-offs','single-leg-tuck-take-offs','p-plank-slides']},
 {n:'Freestanding',sum:'Kicking up and balancing on your own, again and again rather than by luck.',goal:'Kick up and balance freestanding, consistently.',hold:'30s',intro:'Entries, shapes and corrections. The stage where a handstand becomes something you can repeat rather than catch.',
  ch:'Freestanding hold',chSub:'Kick up and hold freestanding. Aim for 30 seconds clean.',
  drillIds:['tuck-entries','straight-entries','straddle-entries','straddle-to-straight','straight-to-tuck-back','straddle-to-diamond']},
 {n:'Press',sum:'The compression and strength to press up into a handstand with control.',goal:'Compress, unroll and press to handstand.',hold:'20s',intro:'The press is strength, compression and patience in one skill. Part of the Press Masterclass.',
  ch:'Chest-to-wall press',chSub:'One clean press attempt from the wall. Compress, unroll, hold.',
  drillIds:['press-walks','knees-on-box','p-bench-zombies','chest-to-wall-toe-taps','p-solo-press-circles','p-back-to-wall','p-chest-to-wall','press-eccentrics','sideways-press-walks','chair-assisted-puppy-press','chair-press-entries','lolasana-lifts','p-pike-pushup-negs']}];

/* Doses taken from Elliott's own Exercise Timing Master, not invented here.
   Without one a drill fell back to '3 × 8', which labelled a wall hold as
   eight reps. The ones still missing are listed in the open threads: they
   are not in either workbook, so nothing but Elliott can supply them. */
const FREE_DOSE={'wall-kick-ups':'2 × 10 reps each side','crow-pose':'2 × hold 15 to 30s',
 'p-l-handstand':'3 × 30s','chaturganga-push-ups':'2 × 10 reps','p-dd-toe-taps':'3 × 10 reps',
 'p-pike-pushups-knees':'3 × 10 reps',
 'p-tuck-handstand':'3 × 20s',
 'wall-kick-ups-progressions':'2 × 10 reps each side',
 'knees-on-box-single-leg-lifts':'3 × 8 each side','knees-on-box-knee-lift-offs':'3 × 5 to 8 reps',
 'p-plank-slides':'3 × 8 reps','single-leg-tuck-take-offs':'3 × build to 5 reps',
 'wrist-circles-mob':'30s, both ways','wall-scapula-shrugs':'3 × 10','wall-walks':'3 × 3 walks in',
 'chest-to-wall-bailouts':'3 × 3 each way','tuck-slides':'build to 5','single-leg-tuck-slides':'build to 5 each',
 'lateral-slide-outs':'3 × 6 each','slide-away':'3 × build to 5','pike-press-ups':'3 × 8',
 'knees-on-box':'2 sets · build to 30s','kick-up-bounces':'3 × 10','plank-fingertip-lifts':'10 reps',
 'shoulder-circles':'10 each way','downward-dog-pulses':'10 reps','single-leg-take-off':'build to 5',
 'single-leg-wall-removals':'build to 5','tuck-take-offs':'build to 5',
 'tuck-entries':'10 reps','straight-entries':'10 reps','straddle-entries':'10 reps',
 'straddle-to-straight':'build to 6','straight-to-tuck-back':'build to 6','straddle-to-diamond':'build to 6',
 'press-walks':'1 × up and down the mat','p-bench-zombies':'2 × 5 to 8',
 'chest-to-wall-toe-taps':'3 × 8','chest-to-wall-handstand':'3 × 30s'};

const WEEK = {
  0: [
    {n:'Getting upside down', sub:'Kick ups and the wall',      focus:['Kick ups','Falling','Chest to wall']},
    {n:'Shapes and strength', sub:'The pushing underneath it',  focus:['Strength','Crow']},
    {n:'Assisted work',       sub:'Chair and wall, learning the line', focus:['Chair assisted','Chest to wall']},
  ],
  1: [
    {n:'On the wall',    sub:'Longer holds and the first slides', focus:['Chest to wall','Box work']},
    {n:'Strength',       sub:'The shoulders that hold it up',     focus:['Strength','Chest to wall']},
    {n:'Entries',        sub:'Getting up there cleanly',          focus:['Entries','Chair assisted','Box work']},
  ],
  2: [
    {n:'Off the wall',   sub:'Taking the weight deliberately',    focus:['Off the wall','Slides']},
    {n:'Box and shapes', sub:'Stacked, and holding the shape',    focus:['Box work','Shapes','Strength']},
    {n:'Entries',        sub:'Clean enough to repeat',            focus:['Entries','Off the wall']},
  ],
};


/* ── what each explainer covers ──────────────────────────────────
   Written from the captions of the film, not from its title, so the line
   under the video says what is actually said in it. Keyed by Stream uid. */
const EXPLAIN_SUM = {
  'bf9ca9d217d21dbd588318d479d9507c':
    'Most of the fear of falling goes once the body knows, consciously, that it can get out of any position. Elliott and Suryava go through the ways out: drills that start on the floor, the cartwheel out, chest to wall bailouts, and why the forward roll is fine in a gym and painful on a hard floor. Practise falling until it stops needing a thought, and keep the exit low effort so you can go straight back up.',
  '780eb706b9607047da0fd92103f09cf0':
    'The wrists hurt because they have never carried you, and the legs have had decades of practice. Soreness is normal for a while and is not a reason to stop, but it is a reason to be kind to yourself and to know when to. The wrist and forearm routine, forearm massage and the small muscles of the hand all strengthen with regular attention, and Elliott reckons on about eighteen months of regular wrist work before it stops being a thing. Two minutes at a desk with a water bottle counts.',
  'a74fc970945b633f71bc7457893baf25':
    'Two to three half hour sessions a week is the recommendation for a beginner, with recovery in between: every day for an hour fatigues you and the progress stalls. Further up, freestanding and shape changes want three to four sessions of 45 minutes to an hour, and one arm work wants four or five a week at an hour each, plus mobility. The honest answer is how much you can commit and what you want out of it.',
  '7467f41353ab66c13b57543f0a7105d6':
    'Short answer no, long answer it helps, but not the way you think. Gym strength does not carry over much; handstand strength comes from handstands, the way climbing strength comes from climbing. The ladder is built for someone with a small training background. Big strong people usually lack shoulder mobility and very flexible people usually lack strength, so everybody has one limiting factor, and coaching is where it gets found and worked on.',
  'd692864081a3d4976dbafaaaff314213':
    'It depends on you, how much you can commit, and what you mean by a handstand: one lucky ten second hold, or holding it any day, anywhere. Some people get five or ten seconds in ten days, some in six months, Elliott took eighteen. Perfecting it takes years. The time passes anyway, so start now. And it is not zero or one: there are dozens of steps between the wall and a handstand, which is why the ladder exists, so celebrate the small wins along it.',
  'f84f53ba8026f8bd0348cb6836a46aad':
    'Stacked, and relaxed. Suryava describes the shoulders engaging and the rest of the body no longer feeling like weight on the hands, able to breathe and talk. Elliott explains why: standing is effortless because the hips are over the feet, and a handstand gets the same efficiency when the shoulders stack over the hands and the hips over the shoulders. The banana back is a symptom, not the cause: the shoulders cannot open, so the body leans and the back arches to pull the weight back in. Fix the shoulder position and the hold gets lighter.',
  '99806cf5a01e65ef29f786bb4e50453b':
    'Wall work is where you spend real time upside down, with the wall as the assistance. Chest to wall handstands until they are comfortable and relaxed, wall scapular shrugs to build the push through the shoulders, the pike push up taken a step on from wherever you are, and the knee tuck entry so you can kick up in the middle of the room and get most of the way there. The check points for this stage are on the ladder, and you still choose how long and how hard each session is.',
  'e1ff0eb98d4c9721ede040f7db994acf':
    "Between the hands, at the centre point, with a relaxed head rather than a flared one or eyes pushed up. Almost every drill in the programme asks for it, because seeing where you are is how you learn to balance and build coordination in that position. Gaze shifts and looking back are targeted exercises for shoulder positioning and mobility, later. Suryava's rule of thumb: the push is directional, and you push where you look.",
  'a366aa047568153b2db238333eb43e8f':
    "Build to is Elliott's answer to handstands feeling like failure. If the set asks for thirty seconds or eight reps and you come down at ten, that is not the end of the set: rest ten or thirty seconds and go back up until the number is reached. Handstands are learned by time upside down, and coming down early on every set means never getting enough of it. Progress is a jagged line, and your bad balance days a year from now will be better than your good days today.",
  '681e59df476ca15c136c365cbd2cec72':
    'Why not just kick up in the middle of the room once wall work is done? Because wall work teaches you what the line feels like, and Pushing More teaches you to take yourself a little off the wall while keeping it, with the shrug and the scapular elevation most people have not quite got yet. Plenty of people can get their legs off the wall while lying on it with the chest sunk in. This phase is about getting off it properly, so the balance work in the next two phases already has that ability underneath it. Entries still level up alongside, so you keep kicking up and learning to get in and out consistently.',
  '7cca146ef4826328688d1c00693b7b4a':
    'Take-Off is where the fun starts: weight on the hands, balancing it yourself, the wall as a friend rather than a bed. Kicking up and hoping gives one hold in ten and almost no time upside down; here you use the shoulders and the hips to shift your centre of mass away from the wall and create balance, touching back when you fall. Knees on box leg lifts, shape changes against the wall relying on it less each week, and five minutes of freestanding attempts at the start or end so you find out where you are. Aim for a ten second freestanding hold by the end of it.',
  'ea06b266a4ed68ce5f8ee0c180d01827':
    'Easier because the centre of mass is lower, as with crow pose, so there is less to balance. Harder because tucking the knees shifts your mass forward, and a good tuck handstand opens the shoulders even more than a straight one to compensate; most people close the shoulder and planche instead. It needs more strength and more shoulder mobility, which is why this phase adds active and weighted mobility drills, and why the tuck carries into press and one arm later and makes your straight handstand feel easier.',
};

const WRIST_DAY = {n:'Mobility day', sub:'Wrists and shoulders, and it is the one that keeps you training',
  drills:['forearm-massage','wrist-circles-mob','dd-wrist-taps','palm-lifts-table-top',
          'shoulder-circles','heart-melting-pose']};

/* What a band is made of: the share of the session that sits at each drill
   level, as a percentage. Every band ramps, so the session runs easiest
   first and the hardest thing you do is at the end of it. What the three
   buttons change is where the weight of the session sits.

   These were set counts before, which is not the same thing. A count of
   three at level one and one at level two reads as three to one, but each
   of those drills also appeared as often as its count, so the session came
   out nearer nine to one: Easier was four drills on repeat. Shares are what
   was meant, so shares are what it stores. */
/* ── explainers, by the phase they belong to ──────────────────────
   The list Elliott and Suryava keep, copied phase by phase. A row with no
   uid is written but not filmed: it still shows, as a placeholder, because
   the list is also the filming list and hiding the gaps hides the work.

   uid is a Cloudflare Stream id. Stream makes its own thumbnail at
   /thumbnails/thumbnail.jpg, which is why the cover images do not need
   uploading anywhere.

   k is the words someone would actually type. Searching the title alone
   found nothing for "sore wrists", "scared" or "how many days", which are
   the three ways people ask the questions we have already answered. The
   coach can add more from the dashboard without a deploy, which is what
   EXPLAIN_KEYS merges in. id is what that keys on, so it must not change. */
const EXPLAIN = {
  0: [
    {id:'falling-safely', q:'How to safely fall out of a handstand', uid:'bf9ca9d217d21dbd588318d479d9507c', dur:'3 min', tag:'Bailing',
     k:['fall','falling','fell','bail','bailing','bail out','scared','scary','fear','afraid','nervous','cartwheel','come down','get down','safe','crash']},
    {id:'wrists-hurt', q:'Why do my wrists hurt?', uid:'780eb706b9607047da0fd92103f09cf0', dur:'2 min', tag:'Wrists',
     k:['wrist','wrists','hurt','hurts','pain','painful','sore','ache','aching','hands','injury','prehab','mobility']},
    {id:'how-often', q:'How often should I practise handstands?', uid:'a74fc970945b633f71bc7457893baf25', dur:'3 min', tag:'Programming',
     k:['often','how often','frequency','how many days','days','week','weekly','schedule','rest','recovery','every day','daily']},
    {id:'strong-to-start', q:'Do I need to be strong to start?', uid:'7467f41353ab66c13b57543f0a7105d6', dur:'3 min', tag:'Strength',
     k:['strong','strength','beginner','start','starting','new','weak','fit','fitness','push up','press up','prerequisite']},
    {id:'core', q:'Engaging my core', uid:'', dur:'', tag:'Shapes',
     k:['core','abs','stomach','hollow','brace','ribs','tight','banana','engage']},
    {id:'how-long', q:'How long does it take to learn a handstand?', uid:'d692864081a3d4976dbafaaaff314213', dur:'4 min', tag:'Progress',
     k:['how long','long','time','months','years','weeks','learn','soon','quick','fast','realistic','timeline']},
    {id:'fitness', q:'Do handstands improve my fitness?', uid:'', dur:'', tag:'Progress',
     k:['fitness','fit','cardio','health','healthy','benefits','weight','conditioning','strength']},
    {id:'how-it-feels', q:'How should it feel when doing these exercises?', uid:'f84f53ba8026f8bd0348cb6836a46aad', dur:'3 min', tag:'Alignment',
     k:['feel','feels','feeling','alignment','aligned','stacked','straight','right','wrong','correct','sore','normal']},
  ],
  1: [
    {id:'wall-work-phase', q:'What are we trying to achieve in this phase?', uid:'99806cf5a01e65ef29f786bb4e50453b', dur:'3 min', tag:'The phase',
     k:['phase','stage','wall work','wall','goal','aim','point','why','chest to wall','purpose','two']},
    {id:'good-kickup', q:'What makes a good kick up?', uid:'', dur:'', tag:'Kick ups',
     k:['kick up','kickup','kicking','kick','entry','enter','jump','up','launch','getting up']},
    {id:'bail-out', q:'How to bail out?', uid:'', dur:'', tag:'Bailing',
     k:['bail','bail out','bailing','fall','exit','come down','get down','cartwheel','pirouette','safe']},
    {id:'where-to-look', q:'Where to look in a handstand?', uid:'e1ff0eb98d4c9721ede040f7db994acf', dur:'2 min', tag:'Alignment',
     k:['look','looking','where to look','eyes','head','gaze','neck','chin','stare','vision']},
    {id:'how-strong', q:'How strong do I need to get?', uid:'7467f41353ab66c13b57543f0a7105d6', dur:'3 min', tag:'Strength',
     k:['strong','strength','stronger','how strong','press','push','shoulders','conditioning']},
    {id:'stuck-wall', q:'Why do people get stuck against the wall?', uid:'', dur:'', tag:'The wall',
     k:['stuck','wall','plateau','chest','sunk','banana','arch','progress','not improving','off the wall']},
    {id:'fingertips', q:'Using finger tips', uid:'', dur:'', tag:'Balance',
     k:['fingers','finger tips','fingertips','hands','grip','balance','press','claw','knuckles']},
  ],
  2: [
    {id:'scapula-elevation', q:'What is scapula elevation?', uid:'', dur:'', tag:'Shapes',
     k:['scapula','scap','scapular','shoulders','elevation','elevate','shrug','push','tall','blades']},
    {id:'build-to', q:"Explaining the concept of 'build to'", uid:'a366aa047568153b2db238333eb43e8f', dur:'2 min', tag:'Programming',
     k:['build to','build','reps','how many','sets','progression','dose','means','notation']},
    {id:'entries-balance', q:'Why separate entries with balance?', uid:'', dur:'', tag:'Entries',
     k:['entries','entry','balance','separate','split','why','practice','combine']},
    {id:'balance-now', q:"Why can't I start to balance now?", uid:'681e59df476ca15c136c365cbd2cec72', dur:'2 min', tag:'Balance',
     k:['balance','balancing','now','freestanding','free standing','why not','wait','ready','impatient','skip']},
    {id:'sunk-chest', q:'Stuck to the wall? The sunk chest theory', uid:'', dur:'', tag:'The wall',
     k:['stuck','wall','chest','sunk','sinking','shoulders','theory','closed','open']},
  ],
  3: [
    {id:'take-off-phase', q:'Oh no, not another stage using the wall', uid:'7cca146ef4826328688d1c00693b7b4a', dur:'5 min', tag:'The phase',
     k:['phase','stage','take off','takeoff','wall','another','why','goal','purpose','four']},
    {id:'supporting-leg', q:'How do I use my supporting leg?', uid:'', dur:'', tag:'Take off',
     k:['leg','legs','supporting','support','second leg','tick','ticking','kick','toe','foot']},
    {id:'shape-changes', q:'I come off the wall but my shape changes', uid:'', dur:'', tag:'Shapes',
     k:['shape','shapes','changes','banana','arch','off the wall','hollow','straight','collapse']},
    {id:'tuck-takeoff', q:'About the tuck handstand', uid:'ea06b266a4ed68ce5f8ee0c180d01827', dur:'4 min', tag:'Shapes',
     k:['tuck','tucked','knees','shape','balance','harder','straight','compare']},
    {id:'spotter', q:'Bailing out freestanding, and using a spotter', uid:'', dur:'', tag:'Bailing',
     k:['bail','bailing','spotter','spot','freestanding','safe','partner','help','alone','falling']},
  ],
  4: [
    {id:'build-to-free', q:"Explaining the concept of 'build to'", uid:'a366aa047568153b2db238333eb43e8f', dur:'2 min', tag:'Programming',
     k:['build to','build','reps','how many','sets','progression','dose']},
    {id:'shoulder-position', q:'Keeping the right shoulder positioning', uid:'', dur:'', tag:'Alignment',
     k:['shoulder','shoulders','position','positioning','stacked','open','closed','elevation','ears']},
    {id:'straddle-legs', q:'How far to open the legs in straddle?', uid:'', dur:'', tag:'Shapes',
     k:['straddle','legs','open','wide','split','how far','shape','flexibility']},
    {id:'tuck-vs-straight', q:'Why is tuck harder than straight?', uid:'ea06b266a4ed68ce5f8ee0c180d01827', dur:'4 min', tag:'Shapes',
     k:['tuck','tucked','straight','harder','why','shape','balance','difficult','compare']},
    {id:'straight-vs-tuck', q:'Why is straight harder than tuck handstand?', uid:'ea06b266a4ed68ce5f8ee0c180d01827', dur:'4 min', tag:'Shapes',
     k:['straight','tuck','harder','shape','why','difficult','compare','line']},
  ],
  5: [],
};

/* The film that introduces each phase. Foundations' is the ladder intro,
   Wall Work's is its walkthrough; the rest are still to be filmed. The app
   plays these in a stage's sheet and on Train, and the dashboard marks
   them on the Explainers tab. The coach can pick another from there, which
   arrives as stageIntro and wins over this. */
const PHASE_INTRO = {
  0: 'f71dd8d48affa0aa92c1e574c3240100',   /* how the handstand ladder works: the split-screen cut of 4 Oct 2026, captions in the film (none on Stream); the first cut was ca0c240d... */
  1: '99806cf5a01e65ef29f786bb4e50453b',   /* Wall Work, what this phase is for */
};

const BAND_MIX = {
  1: {1:55, 2:30, 3:15},          /* Easier: mostly level one, some two, a little three to finish on */
  2: {1:25, 2:40, 3:35},          /* Standard: a mixture, building to three */
  3: {1:10, 2:25, 3:35, 4:30},    /* Harder: opens easy, then far more three and four */
};
/* "As written" asked people to know what had been written, and where.
   Standard says the same thing without the question. */
const BAND_NAME   = {1:'Easier', 2:'Standard', 3:'Harder'};

const POOL = {
  /* Foundations */
  0:[
    {v:'wrist-circles-mob',            g:'Warm-up',        L:1},
    {v:'plank-fingertip-lifts',        g:'Warm-up',        L:1},
    {v:'shoulder-circles',             g:'Warm-up',        L:1},
    {v:'downward-dog-pulses',          g:'Warm-up',        L:1},
    {v:'dd-wrist-taps',                g:'Warm-up',        L:1},
    {v:'palm-lifts-table-top',         g:'Warm-up',        L:1},
    {v:'kick-up-bounces',              g:'Kick ups',       L:1},
    {v:'bunny-hops',                   g:'Kick ups',       L:2},
    {v:'knee-to-chest-kick-ups',       g:'Kick ups',       L:2},
    {v:'wall-kick-ups',                g:'Kick ups',       L:3},
    {v:'fear-of-falling-cartwheel',    g:'Falling',        L:1},
    {v:'proper-cartwheel',             g:'Falling',        L:2},
    {v:'basic-bail-outs',              g:'Falling',        L:1},
    {v:'chest-to-wall-bailouts',       g:'Falling',        L:2},
    {v:'wall-walks',                   g:'Chest to wall',  L:3},
    {v:'chest-to-wall-handstand',      g:'Chest to wall',  L:3},
    {v:'45-degree-wall-hold',          g:'Chest to wall',  L:4},
    {v:'crow-pose',                    g:'Crow',           L:1},
    {v:'chair-assisted-handstand-walks', g:'Chair assisted', L:2},
    {v:'chair-assisted-knee-lifts',    g:'Chair assisted', L:2},
    {v:'chair-assisted-handstand-shoulder-adjustments', g:'Chair assisted', L:2},
    {v:'chair-assisted-step-ups',      g:'Chair assisted', L:3},
    {v:'p-l-handstand',                g:'Chair assisted', L:3},
    {v:'plank-pose',                   g:'Strength',       L:1},
    {v:'push-ups-on-knees',            g:'Strength',       L:1},
    {v:'wall-scapula-shrugs',          g:'Strength',       L:1},
    {v:'floor-scapula-push-ups',       g:'Strength',       L:2},
    {v:'chaturganga-push-ups',         g:'Strength',       L:2},
    {v:'dd-float-drills',              g:'Strength',       L:2},
    {v:'p-dd-toe-taps',                g:'Strength',       L:2},
    {v:'p-pike-pushups-knees',         g:'Strength',       L:2},
  ],
  /* Wall Work */
  1:[
    {v:'pike-hip-lifts',               g:'Warm-up',        L:1},
    {v:'ytws',                         g:'Warm-up',        L:1},
    {v:'banded-external-rotations',    g:'Warm-up',        L:1},
    {v:'lying-back-engagements',       g:'Warm-up',        L:1},
    {v:'shoulder-pulses',              g:'Warm-up',        L:1},
    {v:'wall-walks',                   g:'Chest to wall',  L:1},
    {v:'chest-to-wall-handstand',      g:'Chest to wall',  L:2},
    {v:'single-leg-tuck-slides',       g:'Chest to wall',  L:3},
    {v:'lateral-slide-outs',           g:'Chest to wall',  L:3},
    {v:'tuck-slides',                  g:'Chest to wall',  L:3},
    {v:'slide-away',                   g:'Chest to wall',  L:4},
    {v:'p-tuck-handstand',             g:'Chest to wall',  L:4},
    {v:'pike-press-ups',               g:'Strength',       L:2},
    {v:'knee-to-nose-bounces',         g:'Entries',        L:1},
    {v:'slow-entries',                 g:'Entries',        L:2},
    {v:'wall-kick-ups-progressions',   g:'Entries',        L:2},
    {v:'chair-assisted-knee-lifts',    g:'Chair assisted', L:1},
    {v:'chair-assisted-handstand-shoulder-adjustments', g:'Chair assisted', L:1},
    {v:'chair-assisted-handstand-scapula-shrugs', g:'Chair assisted', L:2},
    {v:'wall-scapula-shrugs',          g:'Strength',       L:1},
    {v:'floor-scapula-push-ups',       g:'Strength',       L:2},
    {v:'knees-on-box',                 g:'Box work',       L:2},
    {v:'knees-on-box-single-leg-lifts', g:'Box work',      L:3},
    {v:'knees-on-box-knee-lift-offs',  g:'Box work',       L:4},
  ],
  /* Pushing More */
  2:[
    {v:'wall-scapula-shrugs',               g:'Strength',       L:1},
    {v:'p-plank-slides',               g:'Strength',       L:2},
    {v:'single-leg-take-off',          g:'Off the wall',   L:2},
    {v:'single-leg-wall-removals',     g:'Off the wall',   L:2},
    {v:'slide-away',                   g:'Off the wall',   L:3},
    {v:'single-leg-tuck-take-offs',    g:'Off the wall',   L:4},
    {v:'tuck-slides',                  g:'Slides',         L:3},
    {v:'single-leg-tuck-slides',       g:'Slides',         L:3},
    {v:'lateral-slide-outs',           g:'Slides',         L:3},
    {v:'knees-on-box',                 g:'Box work',       L:3},
    {v:'knees-on-box-single-leg-lifts', g:'Box work',      L:3},
    {v:'knees-on-box-knee-lift-offs',  g:'Box work',       L:4},
    {v:'chair-assisted-step-ups',      g:'Box work',       L:2},
    {v:'tuck-entries',                 g:'Entries',        L:2},
    {v:'straddle-entries',             g:'Entries',        L:3},
    {v:'straight-entries',             g:'Entries',        L:3},
    {v:'wall-shape-changes',           g:'Shapes',         L:3},
  ],
};
/* drill levels run 1 to 4; the bands above map them onto three workouts */
/* which grouping a drill belongs to on the stage it is being trained on */
/* The coach can add a drill to a stage from the dashboard, which lands in
   settings rather than in this file. Merged in here so every caller sees one
   pool rather than each having to remember there are two. */
/* The shipped pool, plus what the coach has added, plus what they have
   changed about a shipped drill. An extra naming a drill the stage already
   has used to be thrown away, so moving a shipped drill to another grouping
   or another level from the dashboard was saved and then ignored. It now
   replaces the shipped row rather than being dropped beside it. */
/* drills merged or retired, and the one that took their place: a
   programme, a dashboard extra or a saved session naming the old one reads
   as the new one, so nothing has to be edited by hand */
const DRILL_ALIAS={'slide-away-2':'slide-away','wrist-circles-prep':'wrist-circles-mob','knees-on-box-pushes':'chair-assisted-handstand-extensions','p-pike-pushups':'pike-press-ups','scapula-shrugs':'wall-scapula-shrugs','p-bench-zombies-lowers':'bench-zombies-lowers','p-tuck-slides':'tuck-slides',
  'p-single-leg-tuck-slides':'single-leg-tuck-slides','lying-crunch-and-contract':'lying-back-engagements'};
const drillAlias=v=>DRILL_ALIAS[v]||v;
function poolFor(stage){
  /* a drill the coach has taken off this stage is not in its pool, so no
     session can pick it up and no workout can hold it */
  const off=new Set((((typeof st!=='undefined' && st.ladderOff)||{})[stage])
    || (((typeof st!=='undefined' && st.ladderOff)||{})[String(stage)]) || []);
  /* and one deleted from the dashboard is off every stage */
  ((typeof st!=='undefined' && st.drillsOff) || []).forEach(v=>off.add(v));
  const base=(POOL[stage]||[]).filter(x=>!off.has(x.v));
  const extra=((st.ladderExtra||{})[stage]||[])
    .filter(x=>x&&x.v&&drillById(drillAlias(x.v)))
    .map(x=>({v:drillAlias(x.v), g:x.g||'Strength', L:Math.max(1,Math.min(4,x.L||1))}));
  if(!extra.length) return base;
  const by={}; extra.forEach(x=>{ by[x.v]=x; });
  const out=base.map(row=>by[row.v] || row);
  const seen=new Set(base.map(x=>x.v));
  return out.concat(extra.filter(x=>!seen.has(x.v) && !off.has(x.v)));
}
/* ── the ladder's own check points, as the coach has them ──────────
   CHECKPOINTS is the shipped list. The coach can change a wording, a
   target, the drill the demo comes from, or add and remove one, and it is
   kept as an overlay keyed by the same k so a shipped one that has not been
   touched stays exactly as it shipped. */
function cpsFor(stage){
  const over=((typeof st!=='undefined' && st.ladderCps)||{})[stage];
  const base=(CHECKPOINTS[stage]||[]);
  if(!over) return base;
  const edits=over.edit||{}, gone=over.off||[], extra=over.add||[];
  const out=[];
  base.forEach(c=>{
    if(gone.indexOf(c.k)>-1) return;
    out.push(edits[c.k] ? Object.assign({}, c, edits[c.k]) : c);
  });
  extra.forEach(c=>{ if(c && c.k && !out.some(x=>x.k===c.k)) out.push(c); });
  /* the coach's order where they have set one */
  if(Array.isArray(over.order) && over.order.length){
    const at=v=>{ const i=over.order.indexOf(v); return i<0 ? 999 : i; };
    out.sort((a,b)=>at(a.k)-at(b.k));
  }
  return out;
}
/* the level shares for a stage and a band: the coach's where they have set
   them, otherwise the shipped mix every stage used to share */
function mixFor(stage, band){
  const own=(((typeof st!=='undefined' && st.ladderMix)||{})[stage]||{})[band];
  if(own && Object.keys(own).length) return own;
  return BAND_MIX[band] || BAND_MIX[2];
}
/* Sets and reps for a drill inside one band. Three places can say, and the
   narrower one wins: the whole workout ("*"), everything at one difficulty
   inside it ("*l3"), then the drill itself. Whatever none of them says
   falls back to the drill's own numbers and then to the dose. */
function bandTimingFor(stage, band, v){
  const bt=(typeof st!=='undefined' && st.bandTiming) || {};
  const forStage=bt[stage] || bt[String(stage)] || {};
  const b=forStage[band] || forStage[String(band)] || {};
  /* the dashboard loads this file too, where there is no st for poolFor
     to read, so asking for the row must never take the page down */
  let row=null;
  try{ row=poolRow(stage, v); }catch(e){ row=null; }
  const byLvl=(row && row.L) ? b['*l'+row.L] : null;
  const out=Object.assign({}, b['*']||{}, byLvl||{}, b[v]||{});
  return Object.keys(out).length ? out : null;
}
/* Which bands a stage offers. Foundations is the one being tuned and has
   three; everywhere else there is one workout and the chooser should not
   pretend otherwise. */
/* Foundations is being tuned and has all three. Wall Work, Pushing More and
   Take-Off have Easier as well, because Easier there means something plain:
   go back a stage for part of the session. Freestanding and Press have one
   workout until they have any drills at all. */
/* Which of Easier, Standard and Harder a stage can build. This was a
   hand written map, and it went stale the moment a stage got a pool:
   Press has fifty drills across all four levels and offered one button,
   and Wall Work has ten at levels three and four that Harder never
   reached. A band is on when the stage has the levels to fill it. */
const BANDS_ON = { 0:[1,2,3], 1:[1,2], 2:[1,2], 3:[1,2] };
/* How much of an Easier session on a later stage is drawn from the stage
   below it, at that stage's hardest. Somebody finding Wall Work hard is
   better served by the top of Foundations than by the bottom of Wall Work. */
const BACK_SHARE = 0.30;
const BACK_MIN_LEVEL = 3;
function bandsFor(stage, rows){
  let pool=rows;
  if(!pool){ try{ pool=poolFor(stage); }catch(e){ pool=POOL[stage]||[]; } }
  const has={};
  (pool||[]).forEach(r=>{ const L=Number(r&&r.L)||0; if(L>0) has[Math.min(4,L)]=1; });
  const n=Object.keys(has).length;
  if(n<2) return [2];
  if(n>=3) return [1,2,3];
  return [1,2];
}
function poolRow(stage, v){ return poolFor(stage).find(x=>x.v===v) || null; }
/* ── Press, seeded ─────────────────────────────────────────────────
   The stage is marked coming soon in the app, and its pool is filled in
   advance so switching it on is a decision rather than a build. The rows
   are the press work from the two written programmes: what the easier one
   uses is level one, what both use is level two, what only the harder one
   uses is level three, and the stage's own press drills are three and four.
   All of it editable from the Workouts tab like any other stage. */
POOL[5]=[
  {v:"pm-jefferson-curls", g:"Take-off", L:1},
  {v:"pm-box-pancake-activations", g:"Take-off", L:1},
  {v:"p-pike-pushups-knees", g:"Take-off", L:1},
  {v:"p-pike-pushups", g:"Take-off", L:2},
  {v:"p-pike-pushup-negs", g:"Take-off", L:3},
  {v:"single-leg-tuck-slides", g:"Take-off", L:2},
  {v:"tuck-slides", g:"Take-off", L:2},
  {v:"p-tuck-handstand", g:"Take-off", L:2},
  {v:"p-bench-zombies", g:"Compression", L:1},
  {v:"p-bench-zombies-lowers", g:"Compression", L:1},
  {v:"pm-curved-sit-up-negatives", g:"Compression", L:1},
  {v:"pancake-leg-lifts", g:"Compression", L:2},
  {v:"pm-straddle-lever-holds", g:"Compression", L:2},
  {v:"pm-float-practice", g:"Compression", L:3},
  {v:"p-plank-slides", g:"Compression", L:3},
  {v:"p-dd-toe-taps", g:"Compression", L:3},
  {v:"pm-partner-press-circles", g:"Unroll", L:2},
  {v:"p-solo-press-circles", g:"Unroll", L:2},
  {v:"pm-wall-press-circles", g:"Unroll", L:2},
  {v:"press-eccentrics", g:"Unroll", L:3},
  {v:"p-back-to-wall", g:"Wall", L:3},
  {v:"p-chest-to-wall", g:"Wall", L:3},
  {v:"pm-swim-throughs", g:"Shoulders", L:1},
  {v:"pm-dish-swim-through", g:"Shoulders", L:1},
  {v:"pm-straight-arm-lifts", g:"Shoulders", L:1},
  {v:"pm-plank-shoulders-forward-and-back", g:"Shoulders", L:1},
  {v:"pm-weighted-sit-up-shoulders-opening", g:"Shoulders", L:1},
  {v:"lolasana-lifts", g:"Compression", L:2},
  {v:"pm-zombie-pulls-plank-to-straddle", g:"Compression", L:2},
  {v:"pm-elephant-lift-press-from-standing", g:"Press entries", L:2},
  {v:"pm-crow-to-handstand", g:"Press entries", L:2},
  {v:"pm-jump-to-straddle-handstand", g:"Press entries", L:2},
  {v:"pm-jump-to-legs-down-straddle", g:"Press entries", L:2},
  {v:"pm-jump-from-knees-through-straddle", g:"Press entries", L:2},
  {v:"pm-single-leg-wall-presses", g:"Assisted press", L:3},
  {v:"pm-press-with-band", g:"Assisted press", L:3},
  {v:"pm-press-with-support", g:"Assisted press", L:3},
  {v:"pm-press-feet-up", g:"Assisted press", L:3},
  {v:"pm-supported-standing-to-low-straddle", g:"Assisted press", L:3},
  {v:"pm-rocks-forward-feet-just-off-floor", g:"Assisted press", L:3},
  {v:"pm-normal-tuck-press", g:"Tuck press", L:3},
  {v:"pm-tuck-straddle-press-knees-apart", g:"Tuck press", L:3},
  {v:"pm-zombie-press", g:"Tuck press", L:3},
  {v:"pm-feet-up-tuck-to-pike-to-straddle", g:"Tuck press", L:3},
  {v:"pm-hold-halfway-lower-toes", g:"Full press", L:4},
  {v:"pm-press-rock-from-elephant", g:"Full press", L:4},
  {v:"pm-full-negative-press", g:"Full press", L:4},
  {v:"pm-full-press-with-support", g:"Full press", L:4},
  {v:"press-walks", g:"Wall", L:2},
  {v:"press-slides", g:"Wall", L:2},
  {v:"sideways-press-walks", g:"Wall", L:2},
  {v:"press-scapula-shrugs", g:"Shoulders", L:1},
  {v:"pancake-lift-combo", g:"Compression", L:2},
  {v:"straddle-leg-lifts", g:"Compression", L:2},
  {v:"pancake-to-wide-standing", g:"Take-off", L:1}
];
/* the press masterclass as the Press stage (10 Oct 2026): three days, each
   pairing the supporting work with one kind of press */
WEEK[5]=[
  {n:'Compression and the tuck press', sub:'Folding tight, then the first presses', focus:['Compression','Tuck press','Shoulders']},
  {n:'Take-off and assisted presses',  sub:'Getting the feet light',               focus:['Take-off','Assisted press','Press entries']},
  {n:'Unroll and the full press',      sub:'Rolling up through the spine',          focus:['Unroll','Full press','Wall']},
];
Object.assign(FREE_DOSE,{"pm-jefferson-curls": "3 × 8, slow", "pm-box-pancake-activations": "3 × 10", "p-pike-pushups-knees": "3 × 10", "p-pike-pushups": "3 × 6 to 8", "p-pike-pushup-negs": "3 × 5, 5s down", "single-leg-tuck-slides": "3 × 5 each side", "tuck-slides": "3 × 5", "p-tuck-handstand": "3 × 10 to 20s", "p-bench-zombies": "3 × 8", "p-bench-zombies-lowers": "3 × 5, slow", "pm-curved-sit-up-negatives": "3 × 6", "pancake-leg-lifts": "3 × 8 each", "pm-straddle-lever-holds": "3 × 10s", "pm-float-practice": "3 × 5 floats", "p-plank-slides": "3 × 6", "p-dd-toe-taps": "3 × 8", "pm-partner-press-circles": "3 × 3 circles", "p-solo-press-circles": "3 × 3 circles", "pm-wall-press-circles": "3 × 3 circles", "press-eccentrics": "3 × 3, slow", "p-back-to-wall": "3 × 3", "p-chest-to-wall": "3 × 2 to 3"});
STAGES[5].soon=true;
/* the press masterclass test (10 Oct 2026): eight steps, the six physical
   ones scored 0 to 3 on strength, mobility and patterning; the lowest is
   the limiter and names its fix, press-<corner>. Observations prescribe
   but do not score, as in the masterclass. */
const PRESS_TEST=[{"id": "o-hands", "kind": "observe", "corner": "", "n": "Your hands go down. Where do they land?", "how": "Stand up, fold forward and put your hands on the floor as if you were about to press. Do not force it,  just see where they naturally land.", "film": "Film from the side. The gap between your hands and your feet is the whole answer.", "means": "Where your hands land sets the price of the whole press. Every centimetre further forward is lean you have to pay for in shoulder strength.", "levels": [{"l": "Miles in front of my feet", "note": "I have to reach a long way forward to get down", "corner": "mobility"}, {"l": "A fair way forward", "note": "Not terrible, but there is a clear gap", "corner": "mobility"}, {"l": "Close-ish to my feet", "note": "A comfortable fold, hands near the toes"}]}, {"id": "o-lean", "kind": "observe", "corner": "", "n": "You lean forward. What happens?", "how": "From that position, shift your weight forward so the shoulders travel past the wrists. Do not jump. Just lean, and notice what gives first.", "film": "Film from the side so you can see whether the shoulders actually pass the wrists before anything else moves.", "means": "The lean is the first thing that happens and the first thing that fails. What gives way here tells us whether you are short of strength, sequencing, or just hopping past the problem.", "levels": [{"l": "My shoulders collapse", "note": "I fold forward and cannot hold the lean", "corner": "strength"}, {"l": "I hold the lean, but the feet will not leave", "note": "No collapse,  but no lift-off either", "corner": "patterning"}, {"l": "Honestly? I sneak in a little jump", "note": "A tiny hop gets me up", "corner": "cheat"}, {"l": "The feet leave cleanly", "note": "I hold the lean and they come up on their own"}]}, {"id": "t-chair", "kind": "test", "corner": "patterning", "n": "Chair-Assisted Handstand Hold", "how": "Feet on a chair, hips stacked over the shoulders, arms straight. Push tall through the shoulders and hold.", "film": "Film from the side so you can see whether your hips are actually over your hands.", "means": "The gate. Scapular strength in a stacked position. Without it you cannot push tall, and if you cannot push tall the hips have nowhere to travel.", "levels": [{"l": "Under 10 seconds", "note": "Or cannot get into the position yet"}, {"l": "10 to 20 seconds", "note": "Gets there, but the shoulders give out"}, {"l": "20 to 30 seconds", "note": "Close,  the shape holds but it is a fight"}, {"l": "30 seconds, comfortably", "note": "Stacked, pushing tall, could talk through it"}]}, {"id": "t-pancake", "kind": "test", "corner": "mobility", "n": "Pancake Reach", "how": "Sit in a straddle, legs straight, and reach your chest towards the floor in front of you. No bouncing.", "film": "Film from the front, low down, so the gap between your chest and the floor is visible.", "means": "Straddle range decides how close your hands can start to your feet. Mobility here makes the press cheaper before it makes it stronger.", "levels": [{"l": "Hands only", "note": "Chest stays well up, back rounds to reach"}, {"l": "Forearms down", "note": "Getting there, but the chest is still high"}, {"l": "Chest close to the floor", "note": "A few centimetres to go"}, {"l": "Chest flat on the floor", "note": "Legs straight, no rounding"}]}, {"id": "t-pike", "kind": "test", "corner": "strength", "n": "Pike Push-Ups", "how": "Feet on the floor, hips high, head travels between the hands. Full range, no half reps. Count only the clean ones.", "film": "Film from the side. Stop counting the moment the range shortens.", "means": "Raw pressing strength through the shoulders,  the capacity that holds the lean once the weight is over your hands.", "levels": [{"l": "0 to 2 reps", "note": "Or only from the knees"}, {"l": "3 to 5 reps", "note": "Full range, but it runs out fast"}, {"l": "6 to 8 reps", "note": "Solid pressing base"}, {"l": "9 or more", "note": "Strength is not what is stopping you"}]}, {"id": "t-compress", "kind": "test", "corner": "strength", "n": "Seated Compression Lift", "how": "Sit with your legs straight in front, hands flat on the floor beside your hips. Without bending the knees, lift your heels off the floor.", "film": "Film from the side, close to floor level,  the lift is small and easy to miss.", "means": "Active compression strength. This is what stops the legs dragging you back to the floor while the hips travel.", "levels": [{"l": "Heels will not leave the floor", "note": "Nothing lifts, however hard you pull"}, {"l": "Heels lift a little", "note": "They come up, but drop straight back"}, {"l": "Lift and hold 5 seconds", "note": "Legs straight throughout"}, {"l": "Lift and hold 10 seconds", "note": "Controlled, legs locked, hips staying tall"}]}, {"id": "t-overhead", "kind": "test", "corner": "mobility", "n": "Overhead Reach Test", "how": "Stand with your back against a wall, heels a little forward, lower back pressed flat. Reach both arms overhead and try to touch the wall with your wrists.", "film": "Film from the side so the gap at your lower back is visible,  that is the part people cheat.", "means": "Overhead range with the ribs down. The unroll finishes here,  if the shoulders cannot open, the last few degrees never arrive.", "levels": [{"l": "Wrists nowhere near", "note": "Or the ribs flare to get there"}, {"l": "Wrists touch, ribs flare", "note": "Only by arching the lower back off the wall"}, {"l": "Wrists touch, small arch", "note": "Nearly clean"}, {"l": "Wrists touch, back flat", "note": "Full overhead range with the ribs down"}]}, {"id": "t-wallpress", "kind": "test", "corner": "patterning", "n": "Chest-to-Wall Descent", "how": "Get into a chest-to-wall handstand. Lower slowly towards the compressed midpoint,  hips folding, legs coming down,  then try to return to the top.", "film": "Film from the side. Watch whether the shoulders open before the legs move on the way back up.", "means": "The whole pattern under support. Lowering and returning tells us whether the sequence is there, with the wall taking some of the load.", "levels": [{"l": "Cannot lower under control", "note": "It becomes a fall, not a descent"}, {"l": "Can lower, cannot return", "note": "Down is fine, up is not happening"}, {"l": "Return, but it is a fight", "note": "Shape breaks somewhere on the way"}, {"l": "Down and up, smoothly", "note": "Shoulders open first, legs rise last"}]}];
const PRESS_CORNERS={"strength": {"n": "Strength", "p": "A muscle group is not yet strong enough to hold or move the position. The shape is available to you,  you just cannot hold it under load yet.", "w": "Strength responds to progressive load and patience. Expect six weeks to move it meaningfully, not two."}, "mobility": {"n": "Mobility", "p": "Your range makes the press cost more than it should. Hands too far from feet means a longer lean, and a longer lean is strength you have to buy.", "w": "Mobility is the cheapest corner to improve,  it often moves fastest, and it makes everything else easier rather than harder."}, "patterning": {"n": "Patterning", "p": "You have the parts. The body does not yet know the order to fire them in. This is the most frustrating limiter because effort alone does not fix it.", "w": "Patterning improves with repetition at low load, not with grinding. Short, frequent, clean reps beat long hard sessions."}};


/* ── a band written out, rather than worked out ────────────────────
   BAND_MIX gives each of the three buttons a share of each difficulty
   level, and the builder spends those shares. It works, and it means the
   only way to change what is in Harder is to move a drill between levels
   and then work out what that did to the other two.

   Where the coach has written the list out instead, that list is the
   session. Returned in the order it was written, because a short session
   takes from the top. Ids that no longer name a drill are dropped rather
   than handed on as holes. */
function bandFor(stage, band){
  const list=(((typeof st!=='undefined' && st.ladderBands)||{})[stage]||{})[band];
  if(!Array.isArray(list) || !list.length) return null;
  const pool=poolFor(stage);
  const out=[];
  list.forEach(v=>{
    const row=pool.find(x=>x.v===v);
    if(row && out.indexOf(row)<0) out.push(row);
  });
  return out.length ? out : null;
}

/* ── moved here from the app ──────────────────────────────────────
   RAMP is the warm-up every free session opens with and STAGE_SECTIONS is
   how each stage lists its drills. Both lived in the app alone, so the
   dashboard's lock could not see them, left them off the free list, and a
   Foundations session played locked films to the free accounts it is for. */
const RAMP = {
  wrists:    ['forearm-massage','wrist-circles-mob','wrist-flexion-ext',
              'wrist-weight-shift','plank-fingertip-lifts'],
  shoulders: ['shoulder-circles','wall-scapula-shrugs','heart-melting-pose',
              'wall-shoulder-opener','downward-dog-pulses'],
  general:   ['upward-dog-to-plank','plank-pose','dolphin-lean-forwards',
              'downward-dog-elbow-lowers','wall-front-side-opener','floor-lateral-stretch'],
};
const RAMP_ALL = [].concat(RAMP.wrists, RAMP.shoulders, RAMP.general);

const STAGE_SECTIONS={"0": [{"title": "Wrist Mobilisation", "sub": "Essential prep before any handstand work", "items": [{"v": "wrist-circles-mob", "n": "Wrist Circles", "d": "30s each way", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/a7cd457020f580093be946524a84c3af/downloads/default.mp4", "cues": ["Circle the wrists with the fingers facing forward, then to the side, then back.", "Look for any areas of tightness as you go.", "Bring the hands closer together to make the stretch more intense."], "desc": "Wrist circles with the fingers facing forward, to the side and back, looking for any tight spots.", "nt": ""}, {"v": "wrist-flexion-ext", "n": "Wrist Flexion and Extension", "d": "2 × 10", "url": "", "cues": ["Use the other hand to assist gently.", "Hold briefly at end range.", "Never force into pain.", "Breathe steadily."], "desc": "Build active range through the wrist joint in both directions to reduce injury risk.", "nt": ""}, {"v": "wrist-weight-shift", "n": "Wrist Weight Shifting", "d": "2 × 30s", "url": "", "cues": ["On all fours, fingers facing forward.", "Shift weight slowly side to side.", "Then front to back.", "Increase pressure gradually."], "desc": "Progressively load the wrists on all fours with gentle shifts to build tolerance for handstand work.", "nt": ""}, {"v": "plank-fingertip-lifts", "n": "Plank Fingertip Lifts", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/5e23544c8db4eac5b2377f400d7ceb8a/downloads/default.mp4", "cues": ["Start in plank, on the knees or in full plank.", "Lift one hand onto the fingertips.", "Bring it back down.", "Then the other hand."], "desc": "In plank, lifting each hand onto its fingertips and back down.", "nt": ""}]}, {"title": "Warm-Up", "sub": "Same opening every session", "items": [{"v": "shoulder-circles", "n": "Shoulder Circles", "d": "10 each way", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/9ad6108b534d2c6375d629bd2f2363ea/downloads/default.mp4", "cues": ["Circle one arm at a time.", "Hold the opposite hand on the chest of the arm that's swinging.", "That steadies the chest so the movement comes from the shoulder."], "desc": "One arm at a time, the other hand on the chest to keep it still.", "nt": ""}, {"v": "shoulder-pulses", "n": "Shoulder Pulses", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/c812fa2fff981dd17bb93580619601f8/downloads/default.mp4", "cues": [], "desc": "Small pulses through the shoulders to open them up before load.", "nt": ""}, {"v": "downward-dog-pulses", "n": "Downward Dog Pulses", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/b98ec8907ff9f1ffed4ae4fa68254d21/downloads/default.mp4", "cues": ["Start in Downward Facing Dog.", "Look back between your legs.", "Bend the knees slightly.", "Pulse the chest toward the back of the room."], "desc": "Start in downward facing dog, look back, bend the knees. Pulse the chest towards the back of the room.", "nt": ""}, {"v": "dolphin-lean-forwards", "n": "Dolphin Lean Forwards", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/469ee75ee03a7834d30993b43fc0900e/downloads/default.mp4", "cues": ["Keep forearms parallel on the floor.", "Shift forward with control.", "Touch nose gently to the floor.", "Push back actively through the shoulders."], "desc": "Start in Dolphin pose with legs bent while arms are as parallel as possible. Shift forwards to touch your nose to the floor between the hands. Push back.", "nt": ""}, {"v": "upward-dog-to-plank", "n": "Upward Dog to Plank", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/32d7acb10d5135328b3632c9d405c7cb/downloads/default.mp4", "cues": ["Biceps rotate forward in upward dog.", "Keep arms straight throughout.", "Look forward in the dog position.", "Flow between positions smoothly."], "desc": "Start in upward facing dog with feet pointed, biceps turned forward looking forward. Keeping arms straight push up into plank.", "nt": ""}, {"v": "forearm-massage", "n": "Forearm Massage", "d": "60s each arm", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/39baddde2e76b2dd1ef4f33b232d2b2d/downloads/default.mp4", "cues": ["Palm-up side: massage the forearm with the bony part of the knee.", "Don't put too much weight through it.", "Other side: use the elbow along the top line of fascia shown in the video."], "desc": "", "nt": ""}, {"v": "wrist-circles-mob", "n": "Wrist Circles", "d": "30s each way", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/a7cd457020f580093be946524a84c3af/downloads/default.mp4", "cues": ["Circle the wrists with the fingers facing forward, then to the side, then back.", "Look for any areas of tightness as you go.", "Bring the hands closer together to make the stretch more intense."], "desc": "Wrist circles with the fingers facing forward, to the side and back, looking for any tight spots.", "nt": ""}, {"v": "plank-pose", "n": "Plank Pose", "d": "2 × 20s", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/90a824ed88a1bca051dceb30dfd5e629/downloads/default.mp4", "cues": ["Start on your knees.", "Turn the biceps to face forward.", "Push into the ground, feeling it through the palms, until you spread the shoulder blades.", "Lift the knees up, keeping the same position, and hold."], "desc": "Pushing the floor away until the shoulder blades spread, then holding it with the knees up.", "nt": ""}, {"v": "knee-to-nose-bounces", "n": "Knee to Nose Bounces", "d": "2 × 8", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/8bca83124064e21a1abe84d1a21ac587/downloads/default.mp4", "cues": ["Start in table top with the knees off the floor.", "Take the knee to the nose.", "Jump in towards it slightly as you do.", "Keep the bounce as light as you can."], "desc": "", "nt": ""}, {"v": "pancake-leg-lifts", "n": "Pancake Leg Lifts", "d": "2 × 8 each", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/99ca791dffe62a152b532c7117109000/downloads/default.mp4", "cues": ["Blocks make it easier.", "Keep the back straight: it doesn't have to be vertical.", "Lean forward to make it harder.", "If it's easy, bring the hands into the centre."], "desc": "", "nt": ""}, {"v": "plank-fingertip-lifts", "n": "Plank Fingertip Lifts", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/5e23544c8db4eac5b2377f400d7ceb8a/downloads/default.mp4", "cues": ["Start in plank, on the knees or in full plank.", "Lift one hand onto the fingertips.", "Bring it back down.", "Then the other hand."], "desc": "In plank, lifting each hand onto its fingertips and back down.", "nt": ""}, {"v": "banded-shoulder-engagement", "n": "Banded Shoulder Engagement", "d": "2 × 10", "url": "", "cues": [], "desc": "", "nt": ""}, {"v": "palm-lifts-table-top", "n": "Palm Lifts in Table Top", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/ffcc972bba57d4229af54b30e1c208a9/downloads/default.mp4", "cues": ["Start in table top.", "Lift the palms and thumb up.", "Lean the shoulders over the hands to increase the difficulty.", "You can also do this in plank pose."], "desc": "", "nt": ""}, {"v": "dd-wrist-taps", "n": "Downward Dog Wrist Taps", "d": "2 × 10", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/d79ada213578ca1993b4cb4b9f3ec4b1/downloads/default.mp4", "cues": [], "desc": "", "nt": ""}]}, {"title": "Shoulder Openers", "sub": "Build overhead range from the ground up", "items": [{"v": "wall-front-side-opener", "n": "Wall Front Side Opener", "d": "30s each side", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/5d5918dbb655c385fc7ee598262eb68d/downloads/default.mp4", "cues": ["Face the wall a soft arms length away.", "Place palms high on the wall.", "Sink the chest forward and down.", "Hold for the full 30 seconds."], "desc": "Start facing the wall a soft arms distance away. Palms on wall above you, sink chest towards and down the wall.", "nt": ""}, {"v": "wall-shoulder-opener", "n": "Wall Shoulder Opener", "d": "10 pulses", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/89bd83f5409f89c13851812e7c08469a/downloads/default.mp4", "cues": ["Hands on the wall at chest height. Keep the arms straight.", "Lower the chest down towards the floor.", "Round the back rather than arching it.", "This is shoulder range, not the front of the body. That is another drill."], "desc": "Hands on the wall, arms straight, chest lowered towards the floor with the back rounded.", "nt": ""}, {"v": "heart-melting-pose", "n": "Heart Melting Pose", "d": "60s", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/08e6b205174da88791e0d9597ad2f657/downloads/default.mp4", "cues": ["Get on your knees.", "Place back of palms and forearms on the floor.", "Pull body back actively.", "Feel the stretch through the entire shoulder girdle."], "desc": "Get on your knees, place the back of your palms and forearms on the floor in parallel, pull the body back focusing on stretching the lats.", "nt": ""}, {"v": "floor-lateral-stretch", "n": "Floor Lateral Stretch", "d": "60s", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/846d5c9cfbe28e8d311620b5bd867359/downloads/default.mp4", "cues": ["Get on your knees.", "Place back of palms and forearms on the floor in parallel.", "Pull the body back.", "Focus on stretching the lats."], "desc": "Get on your knees, place the back of your palms and forearms on the floor in parallel, then pull the body back focusing on stretching the lats.", "nt": ""}]}, {"title": "Kick Ups to the Wall", "sub": "Your first steps upside down", "items": [{"v": "wall-kick-ups", "n": "Wall Kick Ups", "d": "10 each side", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/51a36a15330dd845d7099de1712cf8d2/downloads/default.mp4", "cues": ["Stack shoulders above hands.", "Stack hips above shoulders.", "Jump up, throw hips toward the wall.", "Claw through the hands to exit."], "desc": "Stack shoulders above hands, hips above shoulders. Jump up and throw your hips towards the wall. Claw through the hands to come off the wall.", "nt": ""}, {"v": "wall-kick-ups-progressions", "n": "Wall Kick Ups Progressions", "d": "10 each side", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/41ee75425ffdb75af7c5122ad7823770/downloads/default.mp4", "cues": ["Tuck a foam block between your hip and the thigh of the kicking leg. Bigger than the one in the film if you can.", "It stops the back bending as you go up, which is what makes kick ups hard.", "Kick up as normal with it held there."], "desc": "A foam block tucked between the hip and the thigh, so the back cannot bend as you kick up.", "nt": ""}, {"v": "kick-up-bounces", "n": "Kick Up Bounces", "d": "3 × 10", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/843bc9940391615a0da8bc40fc061572/downloads/default.mp4", "cues": ["Fingers close to the wall.", "Right leg up, straight and engaged.", "Look between hands, shoulders over hips.", "Bounce quickly keeping all engagement points."], "desc": "Start with fingers close to the wall. Right leg up in the air, straight and engaged. Look between hands, shoulders stacked over hips. Bounce on the left foot in quick succession.", "nt": ""}, {"v": "chest-to-wall-bailouts", "n": "Chest-to-Wall Bailouts", "d": "3 × 3 each way", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/362da5a70cede1b49229a635829656ca/downloads/default.mp4", "cues": ["Walk up the wall starting with the hands quite far away, even further than 45 degrees.", "Take one leg out to the side and use it to bring that hip down towards the floor.", "Step one hand out to help you twist out to the side.", "As you get comfortable, walk closer and closer to the wall.", "Keep practising pulling the leg out to bring the hip down and get you back to the floor."], "desc": "Chest to the wall, taking one leg out to the side to pull the hip down and twist out to the floor.", "nt": ""}]}], "1": [{"title": "Warm-Up", "sub": "Same opening every session", "items": [{"v": "wrist-circles-mob", "n": "Wrist Circles", "d": "30s each way", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/a7cd457020f580093be946524a84c3af/downloads/default.mp4", "cues": ["Circle the wrists with the fingers facing forward, then to the side, then back.", "Look for any areas of tightness as you go.", "Bring the hands closer together to make the stretch more intense."], "desc": "Wrist circles with the fingers facing forward, to the side and back, looking for any tight spots.", "nt": ""}, {"v": "plank-fingertip-lifts", "n": "Plank Fingertip Lifts", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/5e23544c8db4eac5b2377f400d7ceb8a/downloads/default.mp4", "cues": ["Start in plank, on the knees or in full plank.", "Lift one hand onto the fingertips.", "Bring it back down.", "Then the other hand."], "desc": "In plank, lifting each hand onto its fingertips and back down.", "nt": ""}, {"v": "shoulder-circles", "n": "Shoulder Circles", "d": "10 each way", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/9ad6108b534d2c6375d629bd2f2363ea/downloads/default.mp4", "cues": ["Circle one arm at a time.", "Hold the opposite hand on the chest of the arm that's swinging.", "That steadies the chest so the movement comes from the shoulder."], "desc": "One arm at a time, the other hand on the chest to keep it still.", "nt": ""}, {"v": "downward-dog-pulses", "n": "Downward Dog Pulses", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/b98ec8907ff9f1ffed4ae4fa68254d21/downloads/default.mp4", "cues": ["Start in Downward Facing Dog.", "Look back between your legs.", "Bend the knees slightly.", "Pulse the chest toward the back of the room."], "desc": "Start in downward facing dog, look back, bend the knees. Pulse the chest towards the back of the room.", "nt": ""}, {"v": "forearm-massage", "n": "Forearm Massage", "d": "60s each arm", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/39baddde2e76b2dd1ef4f33b232d2b2d/downloads/default.mp4", "cues": ["Palm-up side: massage the forearm with the bony part of the knee.", "Don't put too much weight through it.", "Other side: use the elbow along the top line of fascia shown in the video."], "desc": "", "nt": ""}, {"v": "plank-pose", "n": "Plank Pose", "d": "2 × 20s", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/90a824ed88a1bca051dceb30dfd5e629/downloads/default.mp4", "cues": ["Start on your knees.", "Turn the biceps to face forward.", "Push into the ground, feeling it through the palms, until you spread the shoulder blades.", "Lift the knees up, keeping the same position, and hold."], "desc": "Pushing the floor away until the shoulder blades spread, then holding it with the knees up.", "nt": ""}, {"v": "knee-to-nose-bounces", "n": "Knee to Nose Bounces", "d": "2 × 8", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/8bca83124064e21a1abe84d1a21ac587/downloads/default.mp4", "cues": ["Start in table top with the knees off the floor.", "Take the knee to the nose.", "Jump in towards it slightly as you do.", "Keep the bounce as light as you can."], "desc": "", "nt": ""}, {"v": "pancake-leg-lifts", "n": "Pancake Leg Lifts", "d": "2 × 8 each", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/99ca791dffe62a152b532c7117109000/downloads/default.mp4", "cues": ["Blocks make it easier.", "Keep the back straight: it doesn't have to be vertical.", "Lean forward to make it harder.", "If it's easy, bring the hands into the centre."], "desc": "", "nt": ""}, {"v": "shoulder-pulses", "n": "Shoulder Pulses", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/c812fa2fff981dd17bb93580619601f8/downloads/default.mp4", "cues": ["Hands above the head, or out to one side.", "Pulse in that direction without opening through the chest.", "Also try pulling the hands into fists with the thumbs pointing back.", "That gets a different stretch."], "desc": "Small pulses through the shoulders to open them up before load.", "nt": ""}, {"v": "dolphin-lean-forwards", "n": "Dolphin Lean Forwards", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/469ee75ee03a7834d30993b43fc0900e/downloads/default.mp4", "cues": ["Keep forearms parallel on the floor.", "Shift forward with control.", "Touch nose gently to the floor.", "Push back actively through the shoulders."], "desc": "Start in Dolphin pose with legs bent while arms are as parallel as possible. Shift forwards to touch your nose to the floor between the hands. Push back.", "nt": ""}, {"v": "banded-shoulder-engagement", "n": "Banded Shoulder Engagement", "d": "2 × 10", "url": "", "cues": [], "desc": "", "nt": ""}, {"v": "palm-lifts-table-top", "n": "Palm Lifts in Table Top", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/ffcc972bba57d4229af54b30e1c208a9/downloads/default.mp4", "cues": ["Start in table top.", "Lift the palms and thumb up.", "Lean the shoulders over the hands to increase the difficulty.", "You can also do this in plank pose."], "desc": "", "nt": ""}, {"v": "dd-wrist-taps", "n": "Downward Dog Wrist Taps", "d": "2 × 10", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/d79ada213578ca1993b4cb4b9f3ec4b1/downloads/default.mp4", "cues": [], "desc": "", "nt": ""}]}, {"title": "Wall Foundations", "sub": "Getting upside down safely", "items": [{"v": "wall-walks", "n": "Wall Walks", "d": "3 × 3 walks in", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/aa4d27ce00fb663bc340ccac433d2d43/downloads/default.mp4", "cues": ["Walk the feet up smoothly.", "Push tall through the shoulders.", "Keep the core lightly braced.", "Come down with control."], "desc": "Build confidence upside down while opening the shoulders and learning stacked alignment.", "nt": ""}, {"v": "chest-to-wall-handstand", "n": "Chest-to-Wall Handstand", "d": "3 × 20 to 30s", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/58fc55e74e70f2bd27233abfd289d4e8/downloads/default.mp4", "cues": ["Squeeze legs together.", "Reach tall through the toes.", "Push the floor away constantly.", "Keep ribs gently in."], "desc": "Own a straight wall-supported handstand with strong shoulder push and midline control.", "nt": ""}, {"v": "chest-to-wall-bailouts", "n": "Chest-to-Wall Bailouts", "d": "3 × 3 each way", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/362da5a70cede1b49229a635829656ca/downloads/default.mp4", "cues": ["Walk up the wall starting with the hands quite far away, even further than 45 degrees.", "Take one leg out to the side and use it to bring that hip down towards the floor.", "Step one hand out to help you twist out to the side.", "As you get comfortable, walk closer and closer to the wall.", "Keep practising pulling the leg out to bring the hip down and get you back to the floor."], "desc": "Chest to the wall, taking one leg out to the side to pull the hip down and twist out to the floor.", "nt": ""}]}, {"title": "Scapular Strength", "sub": "The foundation of a stable handstand", "items": [{"v": "wall-scapula-shrugs", "n": "Wall Scapula Shrugs", "d": "3 × 10", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/e69abfa23dad01d9994ed22666e4fd97/downloads/default.mp4", "cues": ["Turn the biceps to face the sky.", "Push through the palms until you feel the upper back stretch.", "Release the push, keeping the arms straight.", "Push back again for reps. It should feel like shrugging the shoulders."], "desc": "Straight-arm shoulder shrugs at the wall. It should feel like shrugging the shoulders.", "nt": ""}, {"v": "one-leg-scapula-extensions", "n": "1-Leg Scapula Extensions", "d": "3 × 8 each", "url": "", "cues": ["Keep hips level.", "Push evenly through both hands.", "Move slowly through each rep.", "Stay long through the standing leg."], "desc": "Challenge scapular control with asymmetry to build strength that transfers to balancing.", "nt": ""}, {"v": "pike-press-ups", "n": "Pike Press-Ups", "d": "3 × 8", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/3dc884615d637e2b1cee93aecb79e168/downloads/default.mp4", "cues": ["Start in a pike or downward dog, looking forward.", "Picture a triangle: the two hands, and a point in front of them.", "Bend the elbows, tucked in to your sides.", "Move down and forward on the diagonal, aiming just above the hairline at the top of the triangle.", "Push back along the same diagonal, not straight up."], "desc": "Pressing down and forward on a diagonal, and back along the same line.", "nt": ""}]}, {"title": "Balance Drills", "sub": "Building time and confidence", "items": [{"v": "tuck-slides", "n": "Tuck Slides", "d": "build to 5", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/3749a6dc6abc40ae2627290d1f446d33/downloads/default.mp4", "cues": ["Same start, hands about 1.5 feet from the wall.", "Knees together, lower them both down.", "Don't worry about the rest of the body at first: it's about the movement."], "desc": "Same start, but both knees come down together. The harder version.", "nt": ""}, {"v": "single-leg-tuck-slides", "n": "Single Leg Tuck Slides", "d": "build to 5 each", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/19cf721ee5bf8669c3a0a7aa77db847d/downloads/default.mp4", "cues": ["Chest to wall, hands about 1.5 feet from the wall, feet pointed.", "One foot stays on the wall.", "Take the other knee down towards your chest."], "desc": "Chest to wall, hands 1.5 feet from the wall. One foot stays on the wall, take the other knee down towards your chest.", "nt": ""}, {"v": "lateral-slide-outs", "n": "Lateral Slide Outs", "d": "3 × 6 each", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/76117e863cb1fb17f3d8f719e27990ba/downloads/default.mp4", "cues": ["Walk up the wall, hands less than a foot from it.", "Take one leg out to the side, a single-leg straddle.", "Use that leg to pull the hip down."], "desc": "Chest to the wall with one leg out to the side, a single-leg straddle that pulls the hip down.", "nt": ""}, {"v": "slide-away", "n": "Slide Away", "d": "build to 5", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/0011bde2e0f70364712159d9442d4803/downloads/default.mp4", "cues": ["Lean the shoulders forward.", "Push back actively through the arms.", "Let the feet slide back up the wall.", "Keep the movement smooth and controlled."], "desc": "Lean the shoulders forward and push back, letting the feet slide back up the wall. This version is about grooving the shoulder movement: the feet stay on the wall throughout.", "nt": ""}]}], "2": [{"title": "Warm-Up", "sub": "Wrists and shoulders before you load them", "items": [{"v": "wrist-circles-mob", "n": "Wrist Circles", "d": "30s each way", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/a7cd457020f580093be946524a84c3af/downloads/default.mp4", "cues": ["Circle the wrists with the fingers facing forward, then to the side, then back.", "Look for any areas of tightness as you go.", "Bring the hands closer together to make the stretch more intense."], "desc": "Wrist circles with the fingers facing forward, to the side and back, looking for any tight spots.", "nt": ""}, {"v": "plank-fingertip-lifts", "n": "Plank Fingertip Lifts", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/5e23544c8db4eac5b2377f400d7ceb8a/downloads/default.mp4", "cues": ["Start in plank, on the knees or in full plank.", "Lift one hand onto the fingertips.", "Bring it back down.", "Then the other hand."], "desc": "In plank, lifting each hand onto its fingertips and back down.", "nt": ""}, {"v": "shoulder-circles", "n": "Shoulder Circles", "d": "10 each way", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/9ad6108b534d2c6375d629bd2f2363ea/downloads/default.mp4", "cues": ["Circle one arm at a time.", "Hold the opposite hand on the chest of the arm that's swinging.", "That steadies the chest so the movement comes from the shoulder."], "desc": "One arm at a time, the other hand on the chest to keep it still.", "nt": ""}, {"v": "forearm-massage", "n": "Forearm Massage", "d": "60s each arm", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/39baddde2e76b2dd1ef4f33b232d2b2d/downloads/default.mp4", "cues": ["Palm-up side: massage the forearm with the bony part of the knee.", "Don't put too much weight through it.", "Other side: use the elbow along the top line of fascia shown in the video."], "desc": "", "nt": ""}, {"v": "wall-scapula-shrugs", "n": "Wall Scapula Shrugs", "d": "3 × 10", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/e69abfa23dad01d9994ed22666e4fd97/downloads/default.mp4", "cues": ["Turn the biceps to face the sky.", "Push through the palms until you feel the upper back stretch.", "Release the push, keeping the arms straight.", "Push back again for reps. It should feel like shrugging the shoulders."], "desc": "Straight-arm shoulder shrugs at the wall. It should feel like shrugging the shoulders.", "nt": ""}]}, {"title": "Tuck Slides", "sub": "Weight off the wall, shoulders stacked", "items": [{"v": "tuck-slides", "n": "Tuck Slides", "d": "build to 5", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/3749a6dc6abc40ae2627290d1f446d33/downloads/default.mp4", "cues": ["Same start, hands about 1.5 feet from the wall.", "Knees together, lower them both down.", "Don't worry about the rest of the body at first: it's about the movement."], "desc": "Same start, but both knees come down together. The harder version.", "nt": ""}, {"v": "single-leg-tuck-slides", "n": "Single Leg Tuck Slides", "d": "build to 5 each", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/19cf721ee5bf8669c3a0a7aa77db847d/downloads/default.mp4", "cues": ["Chest to wall, hands about 1.5 feet from the wall, feet pointed.", "One foot stays on the wall.", "Take the other knee down towards your chest."], "desc": "Chest to wall, hands 1.5 feet from the wall. One foot stays on the wall, take the other knee down towards your chest.", "nt": ""}, {"v": "lateral-slide-outs", "n": "Lateral Slide Outs", "d": "3 × 6 each", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/76117e863cb1fb17f3d8f719e27990ba/downloads/default.mp4", "cues": ["Walk up the wall, hands less than a foot from it.", "Take one leg out to the side, a single-leg straddle.", "Use that leg to pull the hip down."], "desc": "Chest to the wall with one leg out to the side, a single-leg straddle that pulls the hip down.", "nt": ""}]}, {"title": "Sliding Away", "sub": "Leaving the wall under control", "items": [{"v": "slide-away", "n": "Slide Away", "d": "build to 5", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/0011bde2e0f70364712159d9442d4803/downloads/default.mp4", "cues": ["Lean the shoulders forward.", "Push back actively through the arms.", "Let the feet slide back up the wall.", "Keep the movement smooth and controlled."], "desc": "Lean the shoulders forward and push back, letting the feet slide back up the wall. This version is about grooving the shoulder movement: the feet stay on the wall throughout.", "nt": ""}, {"v": "p-plank-slides", "n": "Plank Slides to Pike", "d": "3 × 8", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/7e7ebd3d88d2a9fc610a62d556d01ec4/downloads/default.mp4", "cues": ["Start in plank on a slidey floor, socks on, on the backs of the feet with the feet pointed.", "Slide the feet in until you reach a forward fold.", "Slide back out.", "Crunch through the core the whole way to keep yourself in."], "desc": "On a slidey floor in socks, sliding from plank into a forward fold and back, crunching through the core.", "nt": ""}]}, {"title": "Box Progressions", "sub": "Distance and timing off the box", "items": [{"v": "knees-on-box", "n": "Knees on Box", "d": "2 sets · build to 30s", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/3f8d978d6e7c21ae14d376815eb90803/downloads/default.mp4", "cues": ["Box about hip height, knees near the edge.", "Hands right to the edge of the box.", "Push into the ground, look between the hands."], "desc": "Use the box to build overhead loading tolerance and a cleaner stacked shape.", "nt": ""}, {"v": "knees-on-box-single-leg-lifts", "n": "Knees on Box - Single Leg Lifts", "d": "3 × 8 each", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/3b113c75d21425757a1934bc002ff6f0/downloads/default.mp4", "cues": ["Before this: a 20 second knees on box hold, hands a few cm from the edge.", "Start in knees on box.", "Lift one knee and extend the leg up into the air.", "Push down through the palms to keep the scapula elevated as you switch between the two positions.", "Don't lose the engagement or sink into the shoulders."], "desc": "From knees on box, lift one knee and extend the leg to the sky, keeping the shoulders pushed up throughout.", "nt": ""}, {"v": "knees-on-box-knee-lift-offs", "n": "Knees on Box - Knee Lift-Offs", "d": "3 × 5 to 8", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/3b113c75d21425757a1934bc002ff6f0/downloads/default.mp4", "cues": ["Lean forward gradually.", "Stay active in the fingertips.", "Lift for a brief clean moment.", "Reset before the next rep."], "desc": "Progress toward full support by briefly unweighting the box with both knees.", "nt": ""}, {"v": "chair-assisted-step-ups", "n": "Chair-Assisted Step Ups", "d": "", "url": "", "cues": ["Start in the chair-assisted handstand. You may need the hands a bit further from the chair than usual.", "Lift one leg up to the sky.", "Tuck it into your chest.", "Lower the knee to the floor.", "Step back up."], "desc": "From the chair-assisted handstand, one leg to the sky, tucked into the chest, down to the floor and back up."}]}, {"title": "Entries", "sub": "Clean enough to repeat", "items": [{"v": "tuck-entries", "n": "Tuck Entries", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/1215255521e9da9fd966e8b6d7ec128b/downloads/default.mp4", "cues": ["Stack the shoulders over the hands.", "Keep knees together throughout.", "Jump up to a tuck handstand.", "Extend the legs and push the pelvis through to straight."], "desc": "Once the shoulders are stacked, keep the knees together and jump up to a tuck handstand. Extend the legs and push the pelvis through to bring the body into a straight line.", "nt": ""}, {"v": "straddle-entries", "n": "Straddle Entries", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/4be7868ac0a11251d92d447367dceef1/downloads/default.mp4", "cues": ["Start kneeling or in a crouch.", "Shoulders already stacked over the hands.", "Jump up into straddle, bringing the hips over the shoulders.", "As it gets comfortable: open to straddle, go straight into full, then come back down in straddle."], "desc": "From kneeling or a crouch, jumping up into straddle with the shoulders already stacked.", "nt": ""}, {"v": "straight-entries", "n": "Straight Entries", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/2119c2dd78761e507a61728712c5a7ba/downloads/default.mp4", "cues": ["Right leg up, straight and pointed.", "Shoulders stacked over hands, hips high.", "Bounce the lower leg to kick up.", "Bring the legs together, hold 1 second."], "desc": "Start with the right leg in the air, straight with pointed foot, shoulders stacked over hands and hips high. Bounce on the lower leg to kick up, bringing the left leg to meet the right. Hold a second before coming down.", "nt": ""}, {"v": "wall-shape-changes", "n": "wall-shape-changes", "d": "", "url": "", "cues": [], "desc": ""}]}], "3": [{"title": "Warm-Up", "sub": "Same opening every session", "items": [{"v": "wrist-circles-mob", "n": "Wrist Circles", "d": "30s each way", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/a7cd457020f580093be946524a84c3af/downloads/default.mp4", "cues": ["Circle the wrists with the fingers facing forward, then to the side, then back.", "Look for any areas of tightness as you go.", "Bring the hands closer together to make the stretch more intense."], "desc": "Wrist circles with the fingers facing forward, to the side and back, looking for any tight spots.", "nt": ""}, {"v": "plank-fingertip-lifts", "n": "Plank Fingertip Lifts", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/5e23544c8db4eac5b2377f400d7ceb8a/downloads/default.mp4", "cues": ["Start in plank, on the knees or in full plank.", "Lift one hand onto the fingertips.", "Bring it back down.", "Then the other hand."], "desc": "In plank, lifting each hand onto its fingertips and back down.", "nt": ""}, {"v": "shoulder-circles", "n": "Shoulder Circles", "d": "10 each way", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/9ad6108b534d2c6375d629bd2f2363ea/downloads/default.mp4", "cues": ["Circle one arm at a time.", "Hold the opposite hand on the chest of the arm that's swinging.", "That steadies the chest so the movement comes from the shoulder."], "desc": "One arm at a time, the other hand on the chest to keep it still.", "nt": ""}, {"v": "dolphin-lean-forwards", "n": "Dolphin Lean Forwards", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/469ee75ee03a7834d30993b43fc0900e/downloads/default.mp4", "cues": ["Keep forearms parallel on the floor.", "Shift forward with control.", "Touch nose gently to the floor.", "Push back actively through the shoulders."], "desc": "Start in Dolphin pose with legs bent while arms are as parallel as possible. Shift forwards to touch your nose to the floor between the hands. Push back.", "nt": ""}, {"v": "forearm-massage", "n": "Forearm Massage", "d": "60s each arm", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/39baddde2e76b2dd1ef4f33b232d2b2d/downloads/default.mp4", "cues": ["Palm-up side: massage the forearm with the bony part of the knee.", "Don't put too much weight through it.", "Other side: use the elbow along the top line of fascia shown in the video."], "desc": "", "nt": ""}, {"v": "plank-pose", "n": "Plank Pose", "d": "2 × 20s", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/90a824ed88a1bca051dceb30dfd5e629/downloads/default.mp4", "cues": ["Start on your knees.", "Turn the biceps to face forward.", "Push into the ground, feeling it through the palms, until you spread the shoulder blades.", "Lift the knees up, keeping the same position, and hold."], "desc": "Pushing the floor away until the shoulder blades spread, then holding it with the knees up.", "nt": ""}, {"v": "knee-to-nose-bounces", "n": "Knee to Nose Bounces", "d": "2 × 8", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/8bca83124064e21a1abe84d1a21ac587/downloads/default.mp4", "cues": ["Start in table top with the knees off the floor.", "Take the knee to the nose.", "Jump in towards it slightly as you do.", "Keep the bounce as light as you can."], "desc": "", "nt": ""}, {"v": "pancake-leg-lifts", "n": "Pancake Leg Lifts", "d": "2 × 8 each", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/99ca791dffe62a152b532c7117109000/downloads/default.mp4", "cues": ["Blocks make it easier.", "Keep the back straight: it doesn't have to be vertical.", "Lean forward to make it harder.", "If it's easy, bring the hands into the centre."], "desc": "", "nt": ""}, {"v": "shoulder-pulses", "n": "Shoulder Pulses", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/c812fa2fff981dd17bb93580619601f8/downloads/default.mp4", "cues": ["Hands above the head, or out to one side.", "Pulse in that direction without opening through the chest.", "Also try pulling the hands into fists with the thumbs pointing back.", "That gets a different stretch."], "desc": "Small pulses through the shoulders to open them up before load.", "nt": ""}, {"v": "banded-shoulder-engagement", "n": "Banded Shoulder Engagement", "d": "2 × 10", "url": "", "cues": [], "desc": "", "nt": ""}, {"v": "palm-lifts-table-top", "n": "Palm Lifts in Table Top", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/ffcc972bba57d4229af54b30e1c208a9/downloads/default.mp4", "cues": ["Start in table top.", "Lift the palms and thumb up.", "Lean the shoulders over the hands to increase the difficulty.", "You can also do this in plank pose."], "desc": "", "nt": ""}, {"v": "dd-wrist-taps", "n": "Downward Dog Wrist Taps", "d": "2 × 10", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/d79ada213578ca1993b4cb4b9f3ec4b1/downloads/default.mp4", "cues": [], "desc": "", "nt": ""}]}, {"title": "Hover & Take-Off", "sub": "Controlled entries into balance", "items": [{"v": "single-leg-take-off", "n": "Single Leg Take Off", "d": "build to 5", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/bed0e1e90176e790569dc82e8060e158/downloads/default.mp4", "cues": ["Hands about 1.5 feet from the wall.", "Take one leg off the wall.", "Float the second leg just off and hold 1-2 seconds.", "Place back on the wall before you over-balance."], "desc": "With hands about 1.5 feet from the wall, take one leg off, then the other just slightly off, hold 1-2 seconds, then place back. Go too far and you fall out.", "nt": ""}, {"v": "single-leg-wall-removals", "n": "Single Leg Wall Removals", "d": "build to 5", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/97a793aeb7268ea61159163eb5a0c30e/downloads/default.mp4", "cues": ["Start in a chest-to-wall handstand, hands about a foot from the wall.", "Get stacked first: shoulders over hands, hips over shoulders.", "Take one leg off, bring it back, then take the other.", "Isolate the hip. Engage the glutes to pull the leg off.", "One leg at a time. Both legs never come off in this one."], "desc": "Chest to the wall, taking one leg off at a time while everything else stays stacked.", "nt": ""}, {"v": "slide-away", "n": "Slide Away", "d": "build to 5", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/0011bde2e0f70364712159d9442d4803/downloads/default.mp4", "cues": ["Lean the shoulders forward.", "Push back actively through the arms.", "Let the feet slide back up the wall.", "Keep the movement smooth and controlled."], "desc": "Lean the shoulders forward and push back, letting the feet slide back up the wall. This version is about grooving the shoulder movement: the feet stay on the wall throughout.", "nt": ""}]}, {"title": "Tuck Take-Offs", "sub": "Freestanding entry drills", "items": [{"v": "tuck-take-offs", "n": "Tuck Take-Offs", "d": "build to 5", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/b173a66d935153d532b2748227f253bc/downloads/default.mp4", "cues": ["Slide into a tuck against the wall.", "Keep knees tucked tightly, touching.", "Look forward and lean forward.", "Bring the knees off the wall with control."], "desc": "Slide into tuck against the wall, knees tucked tightly together. Look forward and lean forward to bring your knees off the wall.", "nt": ""}, {"v": "single-leg-tuck-take-offs", "n": "Single Leg Tuck Take-Offs", "d": "build to 5", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/bed0e1e90176e790569dc82e8060e158/downloads/default.mp4", "cues": ["Walk up the wall, one leg in the air, toes pointed.", "Slide the second leg down to tuck.", "Lean and look slightly forward as you pull the foot in.", "Hold a moment, then place it back."], "desc": "Walk up the wall with one leg in the air, slide the second leg down into a tuck. Lean and look slightly forward as you pull the second foot in. Hold, then replace. The gap can grow over time.", "nt": ""}]}], "4": [{"title": "Warm-Up", "sub": "Same opening every session", "items": [{"v": "wrist-circles-mob", "n": "Wrist Circles", "d": "30s each way", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/a7cd457020f580093be946524a84c3af/downloads/default.mp4", "cues": ["Circle the wrists with the fingers facing forward, then to the side, then back.", "Look for any areas of tightness as you go.", "Bring the hands closer together to make the stretch more intense."], "desc": "Wrist circles with the fingers facing forward, to the side and back, looking for any tight spots.", "nt": ""}, {"v": "plank-fingertip-lifts", "n": "Plank Fingertip Lifts", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/5e23544c8db4eac5b2377f400d7ceb8a/downloads/default.mp4", "cues": ["Start in plank, on the knees or in full plank.", "Lift one hand onto the fingertips.", "Bring it back down.", "Then the other hand."], "desc": "In plank, lifting each hand onto its fingertips and back down.", "nt": ""}, {"v": "shoulder-circles", "n": "Shoulder Circles", "d": "10 each way", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/9ad6108b534d2c6375d629bd2f2363ea/downloads/default.mp4", "cues": ["Circle one arm at a time.", "Hold the opposite hand on the chest of the arm that's swinging.", "That steadies the chest so the movement comes from the shoulder."], "desc": "One arm at a time, the other hand on the chest to keep it still.", "nt": ""}, {"v": "downward-dog-pulses", "n": "Downward Dog Pulses", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/b98ec8907ff9f1ffed4ae4fa68254d21/downloads/default.mp4", "cues": ["Start in Downward Facing Dog.", "Look back between your legs.", "Bend the knees slightly.", "Pulse the chest toward the back of the room."], "desc": "Start in downward facing dog, look back, bend the knees. Pulse the chest towards the back of the room.", "nt": ""}, {"v": "forearm-massage", "n": "Forearm Massage", "d": "60s each arm", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/39baddde2e76b2dd1ef4f33b232d2b2d/downloads/default.mp4", "cues": ["Palm-up side: massage the forearm with the bony part of the knee.", "Don't put too much weight through it.", "Other side: use the elbow along the top line of fascia shown in the video."], "desc": "", "nt": ""}, {"v": "plank-pose", "n": "Plank Pose", "d": "2 × 20s", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/90a824ed88a1bca051dceb30dfd5e629/downloads/default.mp4", "cues": ["Start on your knees.", "Turn the biceps to face forward.", "Push into the ground, feeling it through the palms, until you spread the shoulder blades.", "Lift the knees up, keeping the same position, and hold."], "desc": "Pushing the floor away until the shoulder blades spread, then holding it with the knees up.", "nt": ""}, {"v": "knee-to-nose-bounces", "n": "Knee to Nose Bounces", "d": "2 × 8", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/8bca83124064e21a1abe84d1a21ac587/downloads/default.mp4", "cues": ["Start in table top with the knees off the floor.", "Take the knee to the nose.", "Jump in towards it slightly as you do.", "Keep the bounce as light as you can."], "desc": "", "nt": ""}, {"v": "pancake-leg-lifts", "n": "Pancake Leg Lifts", "d": "2 × 8 each", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/99ca791dffe62a152b532c7117109000/downloads/default.mp4", "cues": ["Blocks make it easier.", "Keep the back straight: it doesn't have to be vertical.", "Lean forward to make it harder.", "If it's easy, bring the hands into the centre."], "desc": "", "nt": ""}, {"v": "shoulder-pulses", "n": "Shoulder Pulses", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/c812fa2fff981dd17bb93580619601f8/downloads/default.mp4", "cues": ["Hands above the head, or out to one side.", "Pulse in that direction without opening through the chest.", "Also try pulling the hands into fists with the thumbs pointing back.", "That gets a different stretch."], "desc": "Small pulses through the shoulders to open them up before load.", "nt": ""}, {"v": "dolphin-lean-forwards", "n": "Dolphin Lean Forwards", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/469ee75ee03a7834d30993b43fc0900e/downloads/default.mp4", "cues": ["Keep forearms parallel on the floor.", "Shift forward with control.", "Touch nose gently to the floor.", "Push back actively through the shoulders."], "desc": "Start in Dolphin pose with legs bent while arms are as parallel as possible. Shift forwards to touch your nose to the floor between the hands. Push back.", "nt": ""}, {"v": "banded-shoulder-engagement", "n": "Banded Shoulder Engagement", "d": "2 × 10", "url": "", "cues": [], "desc": "", "nt": ""}, {"v": "palm-lifts-table-top", "n": "Palm Lifts in Table Top", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/ffcc972bba57d4229af54b30e1c208a9/downloads/default.mp4", "cues": ["Start in table top.", "Lift the palms and thumb up.", "Lean the shoulders over the hands to increase the difficulty.", "You can also do this in plank pose."], "desc": "", "nt": ""}, {"v": "dd-wrist-taps", "n": "Downward Dog Wrist Taps", "d": "2 × 10", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/d79ada213578ca1993b4cb4b9f3ec4b1/downloads/default.mp4", "cues": [], "desc": "", "nt": ""}]}, {"title": "Entries", "sub": "Consistent ways into a handstand", "items": [{"v": "tuck-entries", "n": "Tuck Entries", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/1215255521e9da9fd966e8b6d7ec128b/downloads/default.mp4", "cues": ["Stack the shoulders over the hands.", "Keep knees together throughout.", "Jump up to a tuck handstand.", "Extend the legs and push the pelvis through to straight."], "desc": "Once the shoulders are stacked, keep the knees together and jump up to a tuck handstand. Extend the legs and push the pelvis through to bring the body into a straight line.", "nt": ""}, {"v": "straight-entries", "n": "Straight Entries", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/2119c2dd78761e507a61728712c5a7ba/downloads/default.mp4", "cues": ["Right leg up, straight and pointed.", "Shoulders stacked over hands, hips high.", "Bounce the lower leg to kick up.", "Bring the legs together, hold 1 second."], "desc": "Start with the right leg in the air, straight with pointed foot, shoulders stacked over hands and hips high. Bounce on the lower leg to kick up, bringing the left leg to meet the right. Hold a second before coming down.", "nt": ""}, {"v": "straddle-entries", "n": "Straddle Entries", "d": "10 reps", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/4be7868ac0a11251d92d447367dceef1/downloads/default.mp4", "cues": ["Start kneeling or in a crouch.", "Shoulders already stacked over the hands.", "Jump up into straddle, bringing the hips over the shoulders.", "As it gets comfortable: open to straddle, go straight into full, then come back down in straddle."], "desc": "From kneeling or a crouch, jumping up into straddle with the shoulders already stacked.", "nt": ""}]}, {"title": "Shape Changes", "sub": "Correcting movement once off the wall", "items": [{"v": "straddle-to-straight", "n": "Straddle to Straight", "d": "build to 6", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/195e5344c3399b8ce0bc91931633ab9f/downloads/default.mp4", "cues": ["Kick up, option against the wall first.", "Lightly touch, then come away.", "Move freestanding once you get a couple of reps.", "Keep the straddle moderate, not excessive."], "desc": "Kick up into handstand (option against the wall), taking the body away from the wall. Lightly touch at first, then not at all. Keep the straddle moderate so it does not throw your balance.", "nt": ""}, {"v": "straight-to-tuck-back", "n": "Straight to Tuck & Back", "d": "build to 6", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/e461fca19fb288c2a004edaa65df8a21/downloads/default.mp4", "cues": ["Kick up with knees together.", "Use hip flexors to pull knees down.", "Keep pushing tall through the shoulders.", "Gradually increase the depth of the tuck."], "desc": "Once kicked up with knees together, actively use the hip flexors to pull the knees down towards you, then back. This needs anterior deltoid and scapular elevation strength to stay up.", "nt": ""}, {"v": "straddle-to-diamond", "n": "Straddle to Diamond", "d": "build to 6", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/40348e20a24a20f8279e1f69119e68cd/downloads/default.mp4", "cues": ["Start in straddle handstand.", "Bring toes together into a diamond.", "Externally rotate the hips to keep it neat.", "Point the toes; option to tuck after."], "desc": "From a straddle handstand, bring the toes together into a diamond, externally rotating the hips to keep it neat. Option to come into tuck after.", "nt": ""}]}, {"title": "Holding It", "sub": "Time upside down", "items": [{"v": "chest-to-wall-handstand", "n": "Chest-to-Wall Handstand", "d": "3 × 20 to 30s", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/58fc55e74e70f2bd27233abfd289d4e8/downloads/default.mp4", "cues": ["Squeeze legs together.", "Reach tall through the toes.", "Push the floor away constantly.", "Keep ribs gently in."], "desc": "Own a straight wall-supported handstand with strong shoulder push and midline control.", "nt": ""}, {"v": "tuck-slides", "n": "Tuck Slides", "d": "build to 5", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/3749a6dc6abc40ae2627290d1f446d33/downloads/default.mp4", "cues": ["Same start, hands about 1.5 feet from the wall.", "Knees together, lower them both down.", "Don't worry about the rest of the body at first: it's about the movement."], "desc": "Same start, but both knees come down together. The harder version.", "nt": ""}, {"v": "knees-on-box", "n": "Knees on Box", "d": "2 sets · build to 30s", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/3f8d978d6e7c21ae14d376815eb90803/downloads/default.mp4", "cues": ["Box about hip height, knees near the edge.", "Hands right to the edge of the box.", "Push into the ground, look between the hands."], "desc": "Use the box to build overhead loading tolerance and a cleaner stacked shape.", "nt": ""}]}], "5": [{"title": "Press · Prep", "sub": "Wrists, shoulders and compression", "items": [{"v": "wrist-circles-mob", "n": "Wrist Circles", "d": "30s each way", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/a7cd457020f580093be946524a84c3af/downloads/default.mp4", "cues": ["Circle the wrists with the fingers facing forward, then to the side, then back.", "Look for any areas of tightness as you go.", "Bring the hands closer together to make the stretch more intense."], "desc": "Wrist circles with the fingers facing forward, to the side and back, looking for any tight spots.", "nt": ""}, {"v": "dd-wrist-taps", "n": "Downward Dog Wrist Taps", "d": "2 × 10", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/d79ada213578ca1993b4cb4b9f3ec4b1/downloads/default.mp4", "cues": [], "desc": "", "nt": ""}]}, {"title": "Press · Take-Off", "sub": "Scapula elevation and strength", "items": [{"v": "knees-on-box", "n": "Knees on Box", "d": "2 sets · build to 30s", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/3f8d978d6e7c21ae14d376815eb90803/downloads/default.mp4", "cues": ["Box about hip height, knees near the edge.", "Hands right to the edge of the box.", "Push into the ground, look between the hands."], "desc": "Use the box to build overhead loading tolerance and a cleaner stacked shape.", "nt": ""}, {"v": "pike-press-ups", "n": "Pike Press-Ups", "d": "3 × 8", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/3dc884615d637e2b1cee93aecb79e168/downloads/default.mp4", "cues": ["Start in a pike or downward dog, looking forward.", "Picture a triangle: the two hands, and a point in front of them.", "Bend the elbows, tucked in to your sides.", "Move down and forward on the diagonal, aiming just above the hairline at the top of the triangle.", "Push back along the same diagonal, not straight up."], "desc": "Pressing down and forward on a diagonal, and back along the same line.", "nt": ""}, {"v": "p-bench-zombies", "n": "Bench Zombies", "d": "2 × 5 to 8", "url": "", "cues": ["Feet on the bench, toes pointed.", "Pull up until the hips stack over the shoulders.", "Keep the lower back engaged."], "desc": "Plank with your feet on a bench, toes pointed. Pull yourself up until the hips are stacked over the shoulders.", "nt": ""}]}, {"title": "Press · Compression", "sub": "Feet, shoulders and hips as one chain", "items": [{"v": "press-walks", "n": "Press Walks", "d": "1 × mat", "url": "", "cues": ["Baby hop the feet forward.", "Press the hips up and back as you lean forward.", "Up and down the mat."], "desc": "Baby hop the feet forward, then press the hips up and back as you lean forward. Walk up and down the mat.", "nt": ""}, {"v": "p-solo-press-circles", "n": "Solo Press Circles", "d": "3 × 6", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/7ab907d930c9749d32486003184bcf23/downloads/default.mp4", "cues": ["Hold the handstand, open the legs.", "Start with small circles.", "Grow them as you get stronger.", "Both directions: speed doesn't matter."], "desc": "In a handstand, open the legs and make small circles. Grow the circles bigger over time, working towards the press position. Speed doesn't matter: work both directions.", "nt": ""}, {"v": "p-plank-slides", "n": "Plank Slides to Pike", "d": "3 × 8", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/7e7ebd3d88d2a9fc610a62d556d01ec4/downloads/default.mp4", "cues": ["Start in plank on a slidey floor, socks on, on the backs of the feet with the feet pointed.", "Slide the feet in until you reach a forward fold.", "Slide back out.", "Crunch through the core the whole way to keep yourself in."], "desc": "On a slidey floor in socks, sliding from plank into a forward fold and back, crunching through the core.", "nt": ""}]}, {"title": "Press · Wall Presses", "sub": "All three stages together", "items": [{"v": "chest-to-wall-toe-taps", "n": "Chest to Wall Toe Taps", "d": "3 × 8", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/da4144ad54ec886963a8e09a8050c7c6/downloads/default.mp4", "cues": ["Hands about 2 feet from the wall.", "One leg stays on the wall.", "Pull the other knee or toe towards the floor.", "Control it down, don't drop."], "desc": "Hands about 2 feet from the wall, one leg on the wall. Take the other leg off and pull the knee or toe down towards the floor.", "nt": ""}, {"v": "p-back-to-wall", "n": "Back to Wall Press", "d": "3 × 5", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/7fdd9f7cceba8dcb31544af7550a0154/downloads/default.mp4", "cues": ["Full upper back AND head on the wall.", "Focus on engaging the hip flexors.", "Keep the back rounded.", "If heavy on the wrists, turn the hands out to the side."], "desc": "HERO DRILL. Teaches the shape and compression with the wall taking some of the load. Make sure your full upper back as well as head is on the wall: this takes more of the weight so you can focus on engaging the hip flexors and keeping the back rounded.", "nt": ""}, {"v": "p-chest-to-wall", "n": "Chest to Wall Press", "d": "3 × 3", "url": "https://customer-pns1oongdltmkjwa.cloudflarestream.com/eef15d6792347cd1aaeb0be71f222aeb/downloads/default.mp4", "cues": ["Take-off into the line.", "Compress with the chain connected.", "Unroll with the shoulders opening first."], "desc": "THE ULTIMATE HERO. Trains all three stages (take-off, compression and unrolling) in a single movement. Your feet cannot go anywhere, so your shoulders cannot either: you either compress and unroll correctly, or the wall rejects you.", "nt": ""}]}]};

/* ── a stage as a story ─────────────────────────────────────────────
   Elliott's chapters for a stage, each one a check point whose demo film
   tells it. The film comes from the check point as the dashboard has it,
   so changing a demo there changes the chapter. A stage with no story
   here shows none, and a chapter whose film is missing or locked is left
   out rather than shown empty. x is where the frame sits across a film
   that is wider than it, 0 its left edge and 100 its right, for a film
   whose person is not in the middle. */
const STAGE_STORY = {
  0:[{t:'Getting upside down',  k:'ch-assist'},
     {t:'Falling off the wall', k:'fall-comfort', x:22},
     {t:'Learning to kick up',  k:'kickup-rate'},
     {t:'Building balance',     k:'crow',         x:60}],
  /* the rest drafted from each stage's own check points and its own words
     for what it is about, for Elliott to change. teaser marks the chapters
     whose films play for somebody who has not opened the stage yet, three a
     stage: a trailer chosen on purpose, the rest locked cards, whether or
     not their drill is free. These are the defaults: Elliott sets his own
     on the dashboard (Workouts, a stage, Preview), kept as ladderStory, and
     the server signs the films he ticks. The defaults' films are in
     STORY_TEASERS in app.mjs. */
  1:[{t:'Owning the wall',               k:'ctw-hold', teaser:1},
     {t:'Pushing through the shoulders', k:'scap-shrugs'},
     {t:'Taking weight off the wall',    k:'sl-tuck', teaser:1},
     {t:'Building pressing strength',    k:'pike-full', teaser:1}],
  2:[{t:'Stacking the shoulders',        k:'tuck-depth', teaser:1},
     {t:'Leaving the wall on purpose',   k:'slide-off'},
     {t:'Balancing on the box',          k:'box-time', teaser:1},
     {t:'Cleaning up your entries',      k:'entry-clean', teaser:1}],
  3:[{t:'Sliding away',                  k:'side-away', teaser:1},
     {t:'Taking off in a tuck',          k:'tuck-takeoff', teaser:1},
     {t:'Lifting off the box',           k:'box-lifts-l', teaser:1}],
  4:[{t:'Finding balance in a tuck',     k:'tuck-entries'},
     {t:'Opening into a straddle',       k:'straddle-entries', teaser:1},
     {t:'Going straight up',             k:'straight-entries', teaser:1},
     {t:'Changing shape in balance',     k:'straddle-to-straight', teaser:1}],
  5:[{t:'Building compression',          k:'compression', teaser:1},
     {t:'Pressing on the wall',          k:'press-wall', teaser:1},
     {t:'Lowering with control',         k:'press-ecc', teaser:1}]
};
/* preview: for somebody the quiz placed above what they can train yet.
   Every chapter shows, so they see all of what the stage teaches, but only
   the ones Elliott chose as its teasers play their films; the others are locked
   cards with their headline, so the locks on the drills still hold. Which
   films the video host happens to leave open does not decide it. */
