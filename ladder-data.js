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
    {k:'assist-entry',n:'Assisted freestanding entries', kind:'count', target:10}
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
 {n:'Wall Work',goal:'Hold chest-to-wall 45–60s and start moving against the wall.',hold:'45s',intro:'Now you own the wall, get strong and mobile on it. Scapular strength, longer holds, and the first movements that take weight off the wall.',
  ch:'Slide away & hold',chSub:'Slide off the wall and hold your balance as long as you can. Aim for 15 seconds.',
  drillIds:['scapula-shrugs','wall-walks','tuck-slides','single-leg-tuck-slides','lateral-slide-outs','slide-away','pike-press-ups','knees-on-box','wall-kick-ups-progressions','p-tuck-handstand','p-tuck-slides','p-single-leg-tuck-slides','knees-on-box-single-leg-lifts','knees-on-box-knee-lift-offs','shoulder-pulses','p-pike-pushups','chair-assisted-handstand-shoulder-adjustments','chair-assisted-handstand-scapula-shrugs','wall-scapula-shrugs','floor-scapula-push-ups']},
 {n:'Pushing More',goal:'Own the assisted balance — slides, box work and clean entries.',hold:'20s',
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

const FREE_DOSE={'wrist-circles-mob':'30s, both ways','scapula-shrugs':'3 × 10','wall-walks':'3 × 3 walks in',
 'chest-to-wall-bailouts':'3 × 3 each way','tuck-slides':'build to 5','single-leg-tuck-slides':'build to 5 each',
 'lateral-slide-outs':'3 × 6 each','slide-away':'3 × build to 5','pike-press-ups':'3 × 8',
 'knees-on-box':'2 sets · build to 30s','kick-up-bounces':'3 × 10','plank-fingertip-lifts':'10 reps',
 'shoulder-circles':'10 each way','downward-dog-pulses':'10 reps','single-leg-take-off':'build to 5',
 'single-leg-wall-removals':'build to 5','slide-away-2':'build to 5','tuck-take-offs':'build to 5',
 'tuck-entries':'10 reps','straight-entries':'10 reps','straddle-entries':'10 reps',
 'straddle-to-straight':'build to 6','straight-to-tuck-back':'build to 6','straddle-to-diamond':'build to 6',
 'press-walks':'1 × up and down the mat','p-pancake':'3 × 60s','p-bench-zombies':'2 × 5–8',
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

const WRIST_DAY = {n:'Wrists and mobility', sub:'Short, and it is the one that keeps you training',
  drills:['forearm-massage','wrist-circles-mob','dd-wrist-taps','palm-lifts-table-top',
          'shoulder-circles','heart-melting-pose']};

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
function poolFor(stage){
  const base=POOL[stage]||[];
  const extra=((st.ladderExtra||{})[stage]||[])
    .filter(x=>x&&x.v&&drillById(x.v))
    .map(x=>({v:x.v, g:x.g||'Strength', L:Math.max(1,Math.min(4,x.L||1))}));
  if(!extra.length) return base;
  const seen=new Set(base.map(x=>x.v));
  return base.concat(extra.filter(x=>!seen.has(x.v)));
}
function poolRow(stage, v){ return poolFor(stage).find(x=>x.v===v) || null; }
