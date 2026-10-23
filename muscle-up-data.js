/* The Muscle Up Ladder, as data. Nothing in here calls anything.

   Same shapes as ladder-data.js, so the app can lay this ladder over the
   handstand one and every screen that reads STAGES, POOL, WEEK and
   CHECKPOINTS serves whichever ladder is showing. Drafted 23 Oct 2026 from
   the clips Suryava filmed that day, named by Elliott. The stages, levels,
   doses, cues and check points are a first draft for Suryava to correct:
   none of it is his wording yet.

   Every drill id starts mu- so none can collide with a handstand drill,
   and the rest of the id is the clip's file name, so the upload can match
   them without a hand written list. */

const MU_STAGES=[
 {n:'Hang and Pull', sum:'A steady hang, strict pulling, and holding yourself up above the bar.',
  rec:'We recommend two to three sessions a week.', goal:'Hang steady, pull to the chest, and hold yourself above the bar.', hold:'20s',
  intro:'Every muscle up is a pull and a push. This stage builds both halves separately: a hang that stays active, pull ups that reach the chest, and the support and dips that finish on top.',
  ch:'Chest to bar', chSub:'Three chest to bar pull ups, a full hang between each. Do it with me.'},
 {n:'False Grip', sum:'Wrists over the bar, so the hands are already on top when you get there.',
  rec:'We recommend two to three sessions a week.', goal:'Hang and pull in a false grip, on the bar and on the rings.', hold:'15s',
  intro:'The false grip puts the wrist over the bar before you pull, so there is far less to turn over at the top. It feels strange on the wrists at first. Little and often wins here.',
  ch:'False grip hang', chSub:'Hang in a false grip for 15 seconds, wrists over the bar.'},
 {n:'Dips', sum:'The push half: strong, deep dips and a support that does not shake.',
  rec:'We recommend two to three sessions a week.', goal:'Dip deep and lock out, on the bar and on the rings.', hold:'20s',
  intro:'Once you are over the bar you are at the bottom of a dip. If that position is weak, the muscle up stalls there. This stage makes the bottom of the dip somewhere you are strong.',
  ch:'Ring dips', chSub:'Five ring dips, all the way down and all the way locked out.'},
 {n:'High Pull', sum:'A controlled swing and a pull that reaches your waist, not your chin.',
  rec:'We recommend two to three sessions a week.', goal:'Swing with control and pull the bar to your waist.', hold:'',
  intro:'A muscle up needs the bar much lower on the body than a pull up does. The swing gives you the speed and the high pull takes the bar to your waist, which is where the turnover can happen.',
  ch:'High pull', chSub:'Swing and pull the bar to your waist, three in a row.'},
 {n:'Transition', sum:'Getting from under the bar to over it, with help until you need none.',
  rec:'We recommend two to three sessions a week.', goal:'Turn over the bar with a box, a band and a jump.', hold:'',
  intro:'The transition is the part nobody can train by doing pull ups and dips. The box, the band and the jump each take some of the weight, so you can practise the turnover many times while you get strong enough to do it alone.',
  ch:'Banded muscle up', chSub:'Three banded muscle ups, turning over the bar each time.'},
 {n:'Muscle Up', sum:'Your first muscle up on the bar, then on the rings.',
  rec:'We recommend two to three sessions a week.', goal:'A clean muscle up on the bar, then on the rings.', hold:'',
  intro:'Everything comes together: the swing, the high pull, the turnover and the dip. First one on the bar, then more than one, then the rings.',
  ch:'Your first muscle up', chSub:'One clean muscle up on the bar. Film it.'},
];

/* the drills themselves: what the library holds for a handstand drill */
const MU_DRILLS=[
 {v:'mu-active-hang', n:'Active Hang', kit:'bar',
  desc:'Hang from the bar and draw the shoulders down away from the ears, arms straight.',
  cues:['Arms straight the whole time.','Shoulders down, away from the ears.','Ribs down, legs together.','Lower back to a hang with control.']},
 {v:'mu-ring-pull-ups', n:'Ring Pull Ups', kit:'rings',
  desc:'Strict pull ups on the rings, letting the hands turn as you pull.',
  cues:['Start from an active hang.','Pull the rings to your chest.','Elbows close to the body.','All the way down to straight arms.']},
 {v:'mu-chest-to-bar-pull-ups', n:'Chest to Bar Pull Ups', kit:'bar',
  desc:'Pull until the chest touches the bar, not just the chin over it.',
  cues:['Lead with the chest, not the chin.','Drive the elbows down and back.','Touch the bar, then lower slowly.','A full hang between reps.']},
 {v:'mu-high-pull-ups', n:'High Pull Ups', kit:'bar',
  desc:'Pull as high as you can, aiming the bar at the bottom of your ribs.',
  cues:['Pull hard from a still hang.','Aim the bar low on the chest.','Lean back a little as you pull.','Control the way down.']},
 {v:'mu-high-pulls', n:'High Pulls', kit:'bar',
  desc:'Explosive pulls from a small jump, driving the bar towards your waist.',
  cues:['Fast from the bottom.','Pull the bar to your waist.','Elbows back, not out.','Land softly and reset.']},
 {v:'mu-straight-bar-hold', n:'Straight Bar Support Hold', kit:'bar',
  desc:'Hold yourself on top of the bar with straight arms, the bar at your hips.',
  cues:['Arms locked.','Shoulders down, away from the ears.','Lean slightly forward.','Legs together and still.']},
 {v:'mu-straight-bar-dips', n:'Straight Bar Dips', kit:'bar',
  desc:'Dips on top of the bar, leaning forward over it.',
  cues:['Lean forward over the bar.','Lower until the bar is near your chest.','Elbows back, not out.','Push to locked arms.']},
 {v:'mu-straight-bar-dips-hold-at-bottom', n:'Straight Bar Dips, Pause at the Bottom', kit:'bar',
  desc:'Straight bar dips with a pause at the bottom, where the muscle up lands.',
  cues:['Lower slowly.','Hold the bottom for three seconds.','Stay tight, do not sink.','Push all the way up.']},
 {v:'mu-ring-support-hold', n:'Ring Support Hold', kit:'rings',
  desc:'Hold yourself above the rings with straight arms, rings by your hips.',
  cues:['Arms straight, rings by your hips.','Squeeze the rings in to stop the shake.','Shoulders down.','Breathe and hold.']},
 {v:'mu-ring-full-support-hold', n:'Ring Support Hold, Level 2', kit:'rings',
  desc:'The harder support hold on the rings, held longer and steadier.',
  cues:['Arms locked.','Turn the rings out a little.','Shoulders down, chest up.','Stillness first, then time.']},
 {v:'mu-ring-dips', n:'Ring Dips', kit:'rings',
  desc:'Full range dips on the rings, keeping them close to the body.',
  cues:['Rings close to your sides.','Lower until the shoulders pass the elbows.','Lean a little forward.','Lock out at the top.']},
 {v:'mu-ring-dips-with-hold-at-bottom', n:'Ring Dips, Pause at the Bottom', kit:'rings',
  desc:'Ring dips with a pause in the deepest position.',
  cues:['Lower slowly.','Hold the bottom for three seconds.','Keep the rings in.','Push all the way to locked arms.']},
 {v:'mu-false-grip-on-bar', n:'False Grip on the Bar', kit:'bar',
  desc:'Set the wrist over the bar so the hand is already on top before you pull.',
  cues:['Wrist over the bar, not under it.','Heel of the hand on top.','Squeeze to keep it there.','Short holds while the wrists adapt.']},
 {v:'mu-supported-active-hang-false-grip', n:'Supported False Grip Hang', kit:'bar, box',
  desc:'A false grip hang with the feet supported, so the wrists can get used to it.',
  cues:['Feet on the box or floor.','Wrists over the bar.','Shoulders down, arms straight.','Take weight off the feet as it gets easier.']},
 {v:'mu-false-gripped-chest-to-bar-pulls', n:'False Grip Chest to Bar Pulls', kit:'bar',
  desc:'Chest to bar pull ups without losing the false grip.',
  cues:['Set the grip before you pull.','Pull the chest to the bar.','Keep the wrists over.','Lower slowly, grip still set.']},
 {v:'mu-rings-false-grip', n:'False Grip on the Rings', kit:'rings',
  desc:'Setting the false grip on the rings, then holding it with the feet supported.',
  cues:['Ring deep in the hand, wrist over.','Set one hand at a time.','Feet supported to start.','Keep the grip as you hold.']},
 {v:'mu-intro-swings', n:'Swings', kit:'bar',
  desc:'Controlled swings under the bar, hollow in front and arched behind.',
  cues:['Arms straight.','Swing from the shoulders.','Hollow in front, arch behind.','Small and controlled first.']},
 {v:'mu-swings-to-high-pull', n:'Swing to High Pull', kit:'bar',
  desc:'Use the swing to drive a high pull towards the waist.',
  cues:['Pull as the swing comes back.','Bar to the waist.','Elbows back.','Lower and reset.']},
 {v:'mu-negative-muscle-up-on-bar', n:'Bar Muscle Up Negatives', kit:'bar, box',
  desc:'Start on top of the bar and lower slowly through the transition to a hang.',
  cues:['Start in a support.','Lower into the dip.','Slow through the turnover.','Keep the bar close.']},
 {v:'mu-supported-muscle-up-transition-on-bar-with-box', n:'Box Supported Transition on the Bar', kit:'bar, box',
  desc:'Practise the turnover on the bar with the feet helping from a box.',
  cues:['Feet on the box.','Pull the bar to your waist.','Lean over and turn the hands.','Press out of the dip.']},
 {v:'mu-box-supported-ring-muscle-ups', n:'Box Supported Ring Muscle Ups', kit:'rings, box',
  desc:'Ring muscle ups with the feet on a box taking some of the weight.',
  cues:['False grip set.','Rings to the chest.','Lean over the rings.','Press out to lock.']},
 {v:'mu-banded-muscle-ups', n:'Banded Muscle Ups', kit:'bar, band',
  desc:'Setting up a band on the bar and using it to help through the muscle up.',
  cues:['Set the band before you start.','Pull to the waist.','Turn over the bar.','Use a lighter band as you get stronger.']},
 {v:'mu-jumping-muscle-ups', n:'Jumping Muscle Ups', kit:'bar, box',
  desc:'A jump gives the speed so you can practise the turnover over and over.',
  cues:['Jump and pull together.','Bar to the waist.','Fast hands over the bar.','Finish in a locked support.']},
 {v:'mu-swing-to-muscle-up', n:'Swing to Muscle Up', kit:'bar',
  desc:'A bar muscle up from the swing.',
  cues:['Swing back, then pull hard.','Bar to the waist.','Hands over fast.','Press out to lock.']},
 {v:'mu-bar-muscle-up', n:'Bar Muscle Up', kit:'bar',
  desc:'The full muscle up on the bar.',
  cues:['Pull to the waist.','Lean over the bar.','Turn both hands together.','Press out to lock.']},
 {v:'mu-ring-muscle-up-with-swing', n:'Ring Muscle Up from the Swing', kit:'rings',
  desc:'A ring muscle up using a swing for speed.',
  cues:['False grip set.','Swing, then pull.','Rings to the chest.','Turn over and press out.']},
 {v:'mu-full-ring-muscle-up', n:'Ring Muscle Up', kit:'rings',
  desc:'The full muscle up on the rings.',
  cues:['False grip set.','Rings to the chest.','Lean over the rings.','Press out to lock.']},
];

const MU_DOSE={
 'mu-active-hang':'3 × 20s', 'mu-ring-pull-ups':'3 × 5', 'mu-chest-to-bar-pull-ups':'3 × 3 to 5',
 'mu-high-pull-ups':'3 × 3', 'mu-high-pulls':'3 × 3', 'mu-straight-bar-hold':'3 × 20s',
 'mu-straight-bar-dips':'3 × 5', 'mu-straight-bar-dips-hold-at-bottom':'3 × 3, pause at the bottom',
 'mu-ring-support-hold':'3 × 15s', 'mu-ring-full-support-hold':'3 × 10s', 'mu-ring-dips':'3 × 5',
 'mu-ring-dips-with-hold-at-bottom':'3 × 3, pause at the bottom', 'mu-false-grip-on-bar':'3 × 10s',
 'mu-supported-active-hang-false-grip':'3 × 15s', 'mu-false-gripped-chest-to-bar-pulls':'3 × 3',
 'mu-rings-false-grip':'3 × 15s', 'mu-intro-swings':'3 × 6 swings', 'mu-swings-to-high-pull':'3 × 3',
 'mu-negative-muscle-up-on-bar':'3 × 3, slow', 'mu-supported-muscle-up-transition-on-bar-with-box':'3 × 5',
 'mu-box-supported-ring-muscle-ups':'3 × 5', 'mu-banded-muscle-ups':'3 × 3', 'mu-jumping-muscle-ups':'3 × 3',
 'mu-swing-to-muscle-up':'3 × build to 3', 'mu-bar-muscle-up':'3 × 1 to 3',
 'mu-ring-muscle-up-with-swing':'3 × 1 to 3', 'mu-full-ring-muscle-up':'3 × 1 to 3',
};

/* The clip each drill plays, by its file name in Downloads/Muscle up
   drills. Stream uids replace these when the edits are finished and
   uploaded; until then a drill has no film and says so. The four teaching
   films are close ups for the Learn article, not drills. */
const MU_FILMS={
 'mu-active-hang':'active-hang.mp4', 'mu-ring-pull-ups':'ring-pull-ups.mp4',
 'mu-chest-to-bar-pull-ups':'chest-to-bar-pull-ups.mp4', 'mu-high-pull-ups':'high-pull-ups.mp4',
 'mu-high-pulls':'high-pulls.mp4', 'mu-straight-bar-hold':'straight-bar-hold.mp4',
 'mu-straight-bar-dips':'straight-bar-dips.mp4', 'mu-straight-bar-dips-hold-at-bottom':'straight-bar-dips-hold-at-bottom.mp4',
 'mu-ring-support-hold':'ring-support-hold.mp4', 'mu-ring-full-support-hold':'ring-full-support-holdlevel2.mp4',
 'mu-ring-dips':'ring-dips.mp4', 'mu-ring-dips-with-hold-at-bottom':'ring-dips-with-hold-at-bottom.mp4',
 'mu-false-grip-on-bar':'false-grip-on-bar.mp4', 'mu-supported-active-hang-false-grip':'supported-active-hang-false-grip.mp4',
 'mu-false-gripped-chest-to-bar-pulls':'false-gripped-chest-to-bar-pulls.mp4',
 'mu-rings-false-grip':'rings-setting up-for-false-grip and supported holds.mp4',
 'mu-intro-swings':'intro-swings.mp4', 'mu-swings-to-high-pull':'swings-to-high-pull.mp4',
 'mu-negative-muscle-up-on-bar':'negative-muscle-up-on-bar.mp4',
 'mu-supported-muscle-up-transition-on-bar-with-box':'supported-muscle-up-transition-on-bar-with-box.mp4',
 'mu-box-supported-ring-muscle-ups':'box-supported-ring-muscle-ups.mp4',
 'mu-banded-muscle-ups':'setting-up-band-and-banded-muscle-ups.mp4', 'mu-jumping-muscle-ups':'jumping-muscle-ups.mp4',
 'mu-swing-to-muscle-up':'swing-to-muscle-up.mp4', 'mu-bar-muscle-up':'bar-muscle-up.mp4',
 'mu-ring-muscle-up-with-swing':'ring-muscle-up-with-swing.mp4', 'mu-full-ring-muscle-up':'full-ring-muscle-up.mp4',
};
const MU_TEACH=['zoomed-in-on-how-to-false-grip.mp4','front-on-how-to-false-grip-on-bar.mp4',
 'false-gripped-chest-to-bar zoomed in on hands.mp4','zooomed-in-how to-get-to-false-grip-rings.mp4'];

/* Stream uids, once uploaded: drill id to uid. Empty until then. */
const MU_UIDS={};

const MU_POOL={
 0:[
  {v:'wrist-circles-mob', g:'Warm-up', L:1}, {v:'shoulder-circles', g:'Warm-up', L:1},
  {v:'mu-active-hang', g:'Hang', L:1},
  {v:'mu-ring-pull-ups', g:'Pull', L:2}, {v:'mu-chest-to-bar-pull-ups', g:'Pull', L:3}, {v:'mu-high-pull-ups', g:'Pull', L:4},
  {v:'mu-straight-bar-hold', g:'Support', L:1}, {v:'mu-ring-support-hold', g:'Support', L:2},
  {v:'mu-straight-bar-dips', g:'Dips', L:2}, {v:'mu-straight-bar-dips-hold-at-bottom', g:'Dips', L:3},
 ],
 1:[
  {v:'wrist-circles-mob', g:'Warm-up', L:1}, {v:'shoulder-circles', g:'Warm-up', L:1},
  {v:'mu-active-hang', g:'Hang', L:1},
  {v:'mu-supported-active-hang-false-grip', g:'False grip', L:1}, {v:'mu-false-grip-on-bar', g:'False grip', L:2},
  {v:'mu-rings-false-grip', g:'False grip', L:2}, {v:'mu-false-gripped-chest-to-bar-pulls', g:'False grip', L:4},
  {v:'mu-ring-pull-ups', g:'Pull', L:1}, {v:'mu-chest-to-bar-pull-ups', g:'Pull', L:2}, {v:'mu-high-pull-ups', g:'Pull', L:3},
  {v:'mu-straight-bar-hold', g:'Support', L:1}, {v:'mu-ring-support-hold', g:'Support', L:1}, {v:'mu-ring-full-support-hold', g:'Support', L:3},
 ],
 2:[
  {v:'wrist-circles-mob', g:'Warm-up', L:1}, {v:'shoulder-circles', g:'Warm-up', L:1},
  {v:'mu-straight-bar-hold', g:'Support', L:1}, {v:'mu-ring-support-hold', g:'Support', L:1}, {v:'mu-ring-full-support-hold', g:'Support', L:2},
  {v:'mu-straight-bar-dips', g:'Dips', L:1}, {v:'mu-straight-bar-dips-hold-at-bottom', g:'Dips', L:2},
  {v:'mu-ring-dips', g:'Dips', L:3}, {v:'mu-ring-dips-with-hold-at-bottom', g:'Dips', L:4},
  {v:'mu-chest-to-bar-pull-ups', g:'Pull', L:2}, {v:'mu-false-gripped-chest-to-bar-pulls', g:'Pull', L:3},
 ],
 3:[
  {v:'wrist-circles-mob', g:'Warm-up', L:1}, {v:'shoulder-circles', g:'Warm-up', L:1},
  {v:'mu-intro-swings', g:'Swing', L:1}, {v:'mu-swings-to-high-pull', g:'Swing', L:3},
  {v:'mu-chest-to-bar-pull-ups', g:'Pull', L:1}, {v:'mu-high-pull-ups', g:'Pull', L:2},
  {v:'mu-false-gripped-chest-to-bar-pulls', g:'Pull', L:2}, {v:'mu-high-pulls', g:'Pull', L:3},
  {v:'mu-false-grip-on-bar', g:'False grip', L:1}, {v:'mu-rings-false-grip', g:'False grip', L:1},
  {v:'mu-straight-bar-dips', g:'Dips', L:1}, {v:'mu-ring-dips', g:'Dips', L:2},
 ],
 4:[
  {v:'wrist-circles-mob', g:'Warm-up', L:1}, {v:'shoulder-circles', g:'Warm-up', L:1},
  {v:'mu-intro-swings', g:'Swing', L:1}, {v:'mu-swings-to-high-pull', g:'Swing', L:2},
  {v:'mu-supported-muscle-up-transition-on-bar-with-box', g:'Transition', L:1}, {v:'mu-box-supported-ring-muscle-ups', g:'Transition', L:1},
  {v:'mu-negative-muscle-up-on-bar', g:'Transition', L:2}, {v:'mu-banded-muscle-ups', g:'Transition', L:3},
  {v:'mu-jumping-muscle-ups', g:'Transition', L:3}, {v:'mu-swing-to-muscle-up', g:'Transition', L:4},
  {v:'mu-high-pull-ups', g:'Pull', L:1}, {v:'mu-high-pulls', g:'Pull', L:2},
  {v:'mu-straight-bar-dips-hold-at-bottom', g:'Dips', L:1}, {v:'mu-ring-dips', g:'Dips', L:2},
 ],
 5:[
  {v:'wrist-circles-mob', g:'Warm-up', L:1}, {v:'shoulder-circles', g:'Warm-up', L:1},
  {v:'mu-intro-swings', g:'Swing', L:1},
  {v:'mu-negative-muscle-up-on-bar', g:'Transition', L:1}, {v:'mu-banded-muscle-ups', g:'Transition', L:1}, {v:'mu-jumping-muscle-ups', g:'Transition', L:2},
  {v:'mu-swing-to-muscle-up', g:'Muscle up', L:2}, {v:'mu-bar-muscle-up', g:'Muscle up', L:3},
  {v:'mu-ring-muscle-up-with-swing', g:'Muscle up', L:3}, {v:'mu-full-ring-muscle-up', g:'Muscle up', L:4},
  {v:'mu-high-pull-ups', g:'Pull', L:1}, {v:'mu-high-pulls', g:'Pull', L:2},
  {v:'mu-ring-dips', g:'Dips', L:1}, {v:'mu-ring-dips-with-hold-at-bottom', g:'Dips', L:2},
 ],
};

const MU_WEEK={
 0:[{n:'Pull',           sub:'Hang steady, then pull',          focus:['Hang','Pull']},
    {n:'Push',           sub:'Above the bar, holding and dipping', focus:['Support','Dips']},
    {n:'Both halves',    sub:'Pull and push in one session',     focus:['Pull','Support','Dips']}],
 1:[{n:'The grip',       sub:'Wrists over the bar',              focus:['False grip','Hang']},
    {n:'Pull in the grip', sub:'Chest to the bar without losing it', focus:['False grip','Pull']},
    {n:'Rings',          sub:'Grip and support on the rings',    focus:['False grip','Support']}],
 2:[{n:'Bar dips',       sub:'Deep, and locked out at the top',  focus:['Dips','Support']},
    {n:'Rings',          sub:'Still rings, then dips on them',   focus:['Support','Dips']},
    {n:'Pull and push',  sub:'Keep the pulling while you dip',   focus:['Pull','Dips']}],
 3:[{n:'The swing',      sub:'Hollow, arch, and control',        focus:['Swing','False grip']},
    {n:'Pull high',      sub:'The bar to your waist',            focus:['Pull','Swing']},
    {n:'All of it',      sub:'Pull, grip and dip',               focus:['Pull','Dips','False grip']}],
 4:[{n:'The turnover',   sub:'Over the bar with help',           focus:['Transition']},
    {n:'Assisted',       sub:'Box, band, and a high pull',       focus:['Transition','Pull']},
    {n:'Power',          sub:'Swing into the turnover',          focus:['Swing','Transition','Dips']}],
 5:[{n:'Muscle ups',     sub:'On the bar',                       focus:['Muscle up','Transition']},
    {n:'Rings',          sub:'False grip, then over',            focus:['Muscle up','Swing']},
    {n:'Strength',       sub:'The pull and the dip behind it',   focus:['Pull','Dips','Transition']}],
};

const MU_CHECKPOINTS={
 0:[
  {k:'mu-hang',        n:'Active hang',                  kind:'secs',  target:30, demo:'mu-active-hang', note:'Shoulders down the whole time.'},
  {k:'mu-pullups',     n:'Strict pull ups',              kind:'count', target:8,  demo:'mu-ring-pull-ups', note:'Chin over, full hang between each.'},
  {k:'mu-c2b',         n:'Chest to bar pull ups',        kind:'count', target:3,  demo:'mu-chest-to-bar-pull-ups'},
  {k:'mu-bar-support', n:'Straight bar support hold',    kind:'secs',  target:20, demo:'mu-straight-bar-hold'},
  {k:'mu-bar-dips',    n:'Straight bar dips',            kind:'count', target:5,  demo:'mu-straight-bar-dips'},
  {k:'mu-ring-support',n:'Ring support hold',            kind:'secs',  target:15, demo:'mu-ring-support-hold'},
 ],
 1:[
  {k:'mu-fg-supported',n:'Supported false grip hang',    kind:'secs',  target:20, demo:'mu-supported-active-hang-false-grip'},
  {k:'mu-fg-bar',      n:'False grip hang on the bar',   kind:'secs',  target:15, demo:'mu-false-grip-on-bar'},
  {k:'mu-fg-rings',    n:'False grip on the rings',      kind:'secs',  target:15, demo:'mu-rings-false-grip'},
  {k:'mu-fg-c2b',      n:'False grip chest to bar pulls',kind:'count', target:3,  demo:'mu-false-gripped-chest-to-bar-pulls'},
  {k:'mu-c2b-5',       n:'Chest to bar pull ups',        kind:'count', target:5,  demo:'mu-chest-to-bar-pull-ups'},
  {k:'mu-fg-wrists',   n:'Wrists in the false grip',     kind:'face',  note:'How do the wrists feel holding it?', faces:['Sore','Getting used to it','Comfortable']},
 ],
 2:[
  {k:'mu-ring-support-2', n:'Ring support hold, level 2', kind:'secs', target:20, demo:'mu-ring-full-support-hold'},
  {k:'mu-bar-dips-10', n:'Straight bar dips',            kind:'count', target:10, demo:'mu-straight-bar-dips'},
  {k:'mu-bar-dip-pause', n:'Bar dips, pause at the bottom', kind:'count', target:5, demo:'mu-straight-bar-dips-hold-at-bottom'},
  {k:'mu-ring-dips',   n:'Ring dips',                    kind:'count', target:5,  demo:'mu-ring-dips'},
  {k:'mu-ring-dip-pause', n:'Ring dips, pause at the bottom', kind:'count', target:3, demo:'mu-ring-dips-with-hold-at-bottom'},
  {k:'mu-dip-bottom',  n:'The bottom of the dip',        kind:'face',  note:'How strong does the deepest point feel?', faces:['Weak','Getting there','Strong']},
 ],
 3:[
  {k:'mu-swings',      n:'Swings, ten clean',            kind:'breaks',target:2,  demo:'mu-intro-swings', note:'Goes needed to get ten controlled swings.'},
  {k:'mu-high-pull',   n:'High pull ups',                kind:'count', target:5,  demo:'mu-high-pull-ups', note:'Bar to the bottom of the ribs.'},
  {k:'mu-swing-high',  n:'Swing to high pull',           kind:'count', target:5,  demo:'mu-swings-to-high-pull'},
  {k:'mu-high-pulls',  n:'High pulls to the waist',      kind:'count', target:3,  demo:'mu-high-pulls'},
  {k:'mu-c2b-6',       n:'Chest to bar pull ups',        kind:'count', target:6,  demo:'mu-chest-to-bar-pull-ups'},
  {k:'mu-pullups-10',  n:'Strict pull ups',              kind:'count', target:10, demo:'mu-ring-pull-ups'},
 ],
 4:[
  {k:'mu-negatives',   n:'Bar muscle up negatives',      kind:'count', target:3,  demo:'mu-negative-muscle-up-on-bar', note:'Slow through the turnover.'},
  {k:'mu-box-bar',     n:'Box supported transition',     kind:'count', target:5,  demo:'mu-supported-muscle-up-transition-on-bar-with-box'},
  {k:'mu-box-rings',   n:'Box supported ring muscle ups',kind:'count', target:5,  demo:'mu-box-supported-ring-muscle-ups'},
  {k:'mu-banded',      n:'Banded muscle ups',            kind:'count', target:3,  demo:'mu-banded-muscle-ups'},
  {k:'mu-jumping',     n:'Jumping muscle ups',           kind:'count', target:5,  demo:'mu-jumping-muscle-ups'},
  {k:'mu-turnover',    n:'The turnover',                 kind:'face',  note:'How does getting over the bar feel?', faces:['Stuck under it','Sometimes','Smooth']},
 ],
 5:[
  {k:'mu-first-bar',   n:'First bar muscle up',          kind:'yn',    demo:'mu-bar-muscle-up'},
  {k:'mu-bar-3',       n:'Bar muscle ups',               kind:'count', target:3,  demo:'mu-bar-muscle-up', note:'In one set.'},
  {k:'mu-swing-mu',    n:'Swing to muscle up',           kind:'count', target:3,  demo:'mu-swing-to-muscle-up'},
  {k:'mu-clean',       n:'Both arms together',           kind:'face',  note:'Do the hands turn over at the same time?', faces:['One arm first','Nearly','Together']},
  {k:'mu-first-ring',  n:'First ring muscle up',         kind:'yn',    demo:'mu-full-ring-muscle-up'},
  {k:'mu-ring-3',      n:'Ring muscle ups',              kind:'count', target:3,  demo:'mu-full-ring-muscle-up', note:'In one set.'},
 ],
};
MU_STAGES.forEach((s,i)=>{ s.drillIds=[...new Set((MU_POOL[i]||[]).map(x=>x.v).filter(v=>v.indexOf('mu-')===0))]; });

/* Where the quiz starts someone: pull ups, a false grip hang, and a banded
   muscle up. A banded muscle up means the turnover is there; the false
   grip decides whether the grip stage can be skipped. */
const MU_PULLS=['None yet','1 to 4','5 to 9','10 or more'];
function muPlace(pulls, falseGrip, banded){
  const p=Number(pulls)||0;
  if(banded) return (p>=3 && falseGrip) ? 5 : 4;
  if(p>=3) return falseGrip ? 3 : 1;
  if(p>=2) return falseGrip ? 2 : 1;
  return 0;
}

/* the doses join the handstand ones, which is where the session builder
   and the dashboard both look: without this every drill was '3 × 8' */
if(typeof FREE_DOSE!=='undefined') Object.assign(FREE_DOSE, MU_DOSE);
/* the drills reach the library through the fallback the handstand extras
   already use, so the app and the dashboard both find them */
if(typeof DRILL_EXTRA!=='undefined') MU_DRILLS.forEach(d=>{
  const uid=MU_UIDS[d.v];
  const url=uid ? 'https://customer-pns1oongdltmkjwa.cloudflarestream.com/'+uid+'/downloads/default.mp4' : '';
  if(!DRILL_EXTRA.some(x=>x.v===d.v)) DRILL_EXTRA.push(Object.assign({nt:'', url}, d));
});
