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
    {k:'ctw-hold',    n:'Chest-to-wall handstand',  kind:'secs',  target:45, demo:'chest-to-wall-handstand'},
    {k:'scap-shrugs', n:'Wall scapula shrugs',      kind:'count', target:15, demo:'wall-scapula-shrugs'},
    {k:'sl-tuck',     n:'Single-leg tuck slides',   kind:'count', target:10, demo:'single-leg-tuck-slides', note:'One side. How deep does the knee slide?'},
    {k:'pike-neg',    n:'Pike push-up negatives',   kind:'count', target:8,  demo:'pike-press-ups'},
    {k:'pike-full',   n:'Pike push-ups, full reps', kind:'count', target:5,  demo:'pike-press-ups'},
    {k:'nose-toes',   n:'Nose to toes',             kind:'secs',  target:20, note:'The main drill for this stage.'},
    {k:'assist-entry',n:'Knee to chest kick ups', kind:'count', target:10}
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
    {k:'side-away',   n:'Full slide away',          kind:'secs',  target:5,  demo:'slide-away-2'},
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
  5:[
    {k:'press-wall',  n:'Chest-to-wall press',      kind:'count', target:5,  demo:'p-chest-to-wall'},
    {k:'compression', n:'Pancake compression',      kind:'secs',  target:30, demo:'pancake-lift-combo'},
    {k:'press-ecc',   n:'Press eccentrics',         kind:'count', target:5,  demo:'press-eccentrics'}
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
 {n:'Foundations',goal:'A 15-second chest-to-wall hold and a confident kick up.',hold:'15s',intro:'Everything you need before going upside down for real. Wrist and shoulder resilience, kicking up to the wall, and getting comfortable holding chest-to-wall.',
  ch:'Chest-to-wall hold',chSub:'Kick up to the wall and hold for 30 seconds. Do it with me.',
  drillIds:['wrist-circles-mob','plank-fingertip-lifts','shoulder-circles','downward-dog-pulses','chest-to-wall-bailouts','wall-walks','kick-up-bounces','scapula-shrugs','chest-to-wall-handstand','wall-kick-ups','p-l-handstand','chair-assisted-knee-lifts','chair-assisted-step-ups','dd-float-drills','p-dd-toe-taps','chaturganga-push-ups','p-pike-pushups-knees','dd-wrist-taps','palm-lifts-table-top','bunny-hops','knee-to-chest-kick-ups','fear-of-falling-cartwheel','proper-cartwheel','45-degree-wall-hold','push-ups-on-knees','wall-scapula-shrugs','floor-scapula-push-ups','chair-assisted-handstand-walks','chair-assisted-handstand-shoulder-adjustments','crow-pose','plank-pose']},
 {n:'Wall Work',goal:'Hold chest-to-wall 45 to 60s and start moving against the wall.',hold:'45s',intro:'Now you own the wall, get strong and mobile on it. Scapular strength, longer holds, and the first movements that take weight off the wall.',
  ch:'Slide away & hold',chSub:'Slide off the wall and hold your balance as long as you can. Aim for 15 seconds.',
  drillIds:['scapula-shrugs','wall-walks','tuck-slides','single-leg-tuck-slides','lateral-slide-outs','slide-away','pike-press-ups','knees-on-box','wall-kick-ups-progressions','p-tuck-handstand','p-tuck-slides','p-single-leg-tuck-slides','knees-on-box-single-leg-lifts','knees-on-box-knee-lift-offs','shoulder-pulses','p-pike-pushups','chair-assisted-handstand-shoulder-adjustments','chair-assisted-handstand-scapula-shrugs','wall-scapula-shrugs','floor-scapula-push-ups']},
 {n:'Pushing More',goal:'Own the assisted balance: slides, box work and clean entries.',hold:'20s',
  intro:'A short refining stage. You can hold the wall and now you take weight off it deliberately: tuck slides with the shoulders stacked, sliding away under control, and entries clean enough to repeat. It is the difference between leaving the wall and being pushed off it.',
  ch:'Slide away & hold',chSub:'Slide off the wall and hold what you find. Aim for 20 seconds.',
  drillIds:['tuck-slides','single-leg-tuck-slides','p-tuck-slides','p-single-leg-tuck-slides','lateral-slide-outs','slide-away','knees-on-box','knees-on-box-single-leg-lifts','knees-on-box-knee-lift-offs','chair-assisted-step-ups','tuck-entries','straddle-entries','straight-entries','p-plank-slides','scapula-shrugs','wall-shape-changes']},
 {n:'Take-Off',goal:'Leave the wall into brief moments of freestanding balance.',hold:'5s',intro:'This is where the wall disappears. Single-leg take-offs, box work and tuck take-offs build the control to leave on your own terms.',
  ch:'Free handstand attempt',chSub:'Take off and catch your balance. Hold whatever you find.',
  drillIds:['knees-on-box','single-leg-take-off','single-leg-wall-removals','slide-away-2','tuck-take-offs','single-leg-tuck-take-offs','p-plank-slides']},
 {n:'Freestanding',goal:'Kick up and balance freestanding, consistently.',hold:'30s',intro:'Entries, shapes and corrections. The stage where a handstand becomes something you can repeat rather than catch.',
  ch:'Freestanding hold',chSub:'Kick up and hold freestanding. Aim for 30 seconds clean.',
  drillIds:['tuck-entries','straight-entries','straddle-entries','straddle-to-straight','straight-to-tuck-back','straddle-to-diamond']},
 {n:'Press',goal:'Compress, unroll and press to handstand.',hold:'20s',intro:'The press is strength, compression and patience in one skill. Part of the Press Masterclass.',
  ch:'Chest-to-wall press',chSub:'One clean press attempt from the wall. Compress, unroll, hold.',
  drillIds:['press-walks','p-pancake','knees-on-box','p-bench-zombies','chest-to-wall-toe-taps','p-solo-press-circles','p-back-to-wall','p-chest-to-wall','p-chest-to-wall-negs','press-eccentrics','sideways-press-walks','chair-assisted-puppy-press','chair-press-entries','lolasana-lifts','p-pike-pushup-negs']}];

/* Doses taken from Elliott's own Exercise Timing Master, not invented here.
   Without one a drill fell back to '3 × 8', which labelled a wall hold as
   eight reps. The ones still missing are listed in the open threads: they
   are not in either workbook, so nothing but Elliott can supply them. */
const FREE_DOSE={'wall-kick-ups':'2 × 10 reps each side','crow-pose':'2 × hold 15 to 30s',
 'p-l-handstand':'3 × 30s','chaturganga-push-ups':'2 × 10 reps','p-dd-toe-taps':'3 × 10 reps',
 'p-pike-pushups-knees':'3 × 10 reps','p-tuck-slides':'3 × 8 reps',
 'p-single-leg-tuck-slides':'3 × 6 each side','p-tuck-handstand':'3 × 20s',
 'p-pike-pushups':'3 × 8 reps','wall-kick-ups-progressions':'2 × 10 reps each side',
 'knees-on-box-single-leg-lifts':'3 × 8 each side','knees-on-box-knee-lift-offs':'3 × 5 to 8 reps',
 'p-plank-slides':'3 × 8 reps','single-leg-tuck-take-offs':'3 × build to 5 reps',
 'wrist-circles-mob':'30s, both ways','scapula-shrugs':'3 × 10','wall-walks':'3 × 3 walks in',
 'chest-to-wall-bailouts':'3 × 3 each way','tuck-slides':'build to 5','single-leg-tuck-slides':'build to 5 each',
 'lateral-slide-outs':'3 × 6 each','slide-away':'3 × build to 5','pike-press-ups':'3 × 8',
 'knees-on-box':'2 sets · build to 30s','kick-up-bounces':'3 × 10','plank-fingertip-lifts':'10 reps',
 'shoulder-circles':'10 each way','downward-dog-pulses':'10 reps','single-leg-take-off':'build to 5',
 'single-leg-wall-removals':'build to 5','slide-away-2':'build to 5','tuck-take-offs':'build to 5',
 'tuck-entries':'10 reps','straight-entries':'10 reps','straddle-entries':'10 reps',
 'straddle-to-straight':'build to 6','straight-to-tuck-back':'build to 6','straddle-to-diamond':'build to 6',
 'press-walks':'1 × up and down the mat','p-pancake':'3 × 60s','p-bench-zombies':'2 × 5 to 8',
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
  0: 'ca0c240ddea6010e5b376d7c6147d29c',   /* how the handstand ladder works */
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
    {v:'scapula-shrugs',               g:'Strength',       L:2},
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
    {v:'p-tuck-slides',                g:'Chest to wall',  L:3},
    {v:'p-single-leg-tuck-slides',     g:'Chest to wall',  L:4},
    {v:'slide-away',                   g:'Chest to wall',  L:4},
    {v:'p-tuck-handstand',             g:'Chest to wall',  L:4},
    {v:'scapula-shrugs',               g:'Strength',       L:1},
    {v:'pike-press-ups',               g:'Strength',       L:2},
    {v:'p-pike-pushups',               g:'Strength',       L:3},
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
    {v:'scapula-shrugs',               g:'Strength',       L:1},
    {v:'p-plank-slides',               g:'Strength',       L:2},
    {v:'single-leg-take-off',          g:'Off the wall',   L:2},
    {v:'single-leg-wall-removals',     g:'Off the wall',   L:2},
    {v:'slide-away',                   g:'Off the wall',   L:3},
    {v:'slide-away-2',                 g:'Off the wall',   L:3},
    {v:'single-leg-tuck-take-offs',    g:'Off the wall',   L:4},
    {v:'tuck-slides',                  g:'Slides',         L:3},
    {v:'single-leg-tuck-slides',       g:'Slides',         L:3},
    {v:'p-tuck-slides',                g:'Slides',         L:2},
    {v:'p-single-leg-tuck-slides',     g:'Slides',         L:3},
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
function poolFor(stage){
  /* a drill the coach has taken off this stage is not in its pool, so no
     session can pick it up and no workout can hold it */
  const off=new Set((((typeof st!=='undefined' && st.ladderOff)||{})[stage])
    || (((typeof st!=='undefined' && st.ladderOff)||{})[String(stage)]) || []);
  /* and one deleted from the dashboard is off every stage */
  ((typeof st!=='undefined' && st.drillsOff) || []).forEach(v=>off.add(v));
  const base=(POOL[stage]||[]).filter(x=>!off.has(x.v));
  const extra=((st.ladderExtra||{})[stage]||[])
    .filter(x=>x&&x.v&&drillById(x.v))
    .map(x=>({v:x.v, g:x.g||'Strength', L:Math.max(1,Math.min(4,x.L||1))}));
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
  {v:"forearm-massage", g:"Warm-up", L:1},
  {v:"wrist-circles-mob", g:"Warm-up", L:1},
  {v:"shoulder-circles", g:"Warm-up", L:1},
  {v:"active-hamstring-stretch", g:"Warm-up", L:1},
  {v:"plank-fingertip-lifts", g:"Warm-up", L:1},
  {v:"shoulder-pulses", g:"Warm-up", L:1},
  {v:"dolphin-lean-forwards", g:"Warm-up", L:1},
  {v:"pike-hip-lifts", g:"Warm-up", L:1},
  {v:"palm-lifts-table-top", g:"Warm-up", L:1},
  {v:"dd-wrist-taps", g:"Warm-up", L:1},
  {v:"floor-press-circles", g:"Warm-up", L:1},
  {v:"crow-pose", g:"Strength", L:1},
  {v:"lying-back-engagements", g:"Strength", L:1},
  {v:"chair-assisted-knee-lifts", g:"Chair", L:1},
  {v:"chair-assisted-handstand-shoulder-adjustments", g:"Chair", L:1},
  {v:"chair-assisted-step-ups", g:"Chair", L:1},
  {v:"chair-press-entries", g:"Chair", L:2},
  {v:"chair-assisted-puppy-press", g:"Chair", L:2},
  {v:"press-walks", g:"Press walks", L:2},
  {v:"chair-assisted-handstand-extensions", g:"Chair", L:1},
  {v:"chair-assisted-handstand-walks", g:"Chair", L:1},
  {v:"p-l-handstand", g:"Chair", L:1},
  {v:"chair-assisted-handstand-scapula-shrugs", g:"Chair", L:1},
  {v:"dd-float-drills", g:"Chair", L:2},
  {v:"press-slides", g:"Press walks", L:2},
  {v:"sideways-press-walks", g:"Press walks", L:2},
  {v:"p-bench-zombies", g:"Press", L:2},
  {v:"chaturganga-push-ups", g:"Strength", L:1},
  {v:"push-ups-on-knees", g:"Strength", L:1},
  {v:"crow-to-chaturanga", g:"Strength", L:1},
  {v:"press-scapula-shrugs", g:"Press walks", L:2},
  {v:"lolasana-lifts", g:"Press", L:1},
  {v:"pancake-lift-combo", g:"Pancake", L:3},
  {v:"wall-shape-changes", g:"Shape changes", L:3},
  {v:"straddle-to-straight", g:"Shape changes", L:3},
  {v:"knees-on-box", g:"Tuck", L:3},
  {v:"tuck-slides", g:"Tuck", L:3},
  {v:"floor-scapula-push-ups", g:"Press walks", L:3},
  {v:"p-chest-to-wall", g:"Strength", L:3},
  {v:"chest-to-wall-toe-taps", g:"Strength", L:3},
  {v:"straddle-to-diamond", g:"Shape changes", L:3},
  {v:"p-pike-pushups", g:"Strength", L:3},
  {v:"straddle-leg-lifts", g:"Pancake", L:3},
  {v:"pancake-to-wide-standing", g:"Pancake", L:3},
  {v:"p-pancake", g:"Press", L:3},
  {v:"p-solo-press-circles", g:"Press", L:4},
  {v:"p-back-to-wall", g:"Press", L:3},
  {v:"p-chest-to-wall-negs", g:"Press", L:4},
  {v:"press-eccentrics", g:"Press", L:4},
  {v:"p-pike-pushup-negs", g:"Press", L:4}
];
STAGES[5].soon=true;

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
