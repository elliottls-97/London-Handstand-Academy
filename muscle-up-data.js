/* The Muscle Up Ladder, as data. Nothing in here calls anything.

   Same shapes as ladder-data.js, so the app can lay this ladder over the
   handstand one and every screen that reads STAGES, POOL, WEEK and
   CHECKPOINTS serves whichever ladder is showing. Drafted 23 Oct 2026 from
   the clips Suryava filmed that day, named by Elliott. Rebuilt 26 Oct 2026
   from Suryava's own sheet (Muscle_Up_Ladder_filled_draft.xlsx): his stages,
   drills, doses, rests, cues, week and check points.

   Every drill id starts mu- so none can collide with a handstand drill.
   Where one of his clips shows the drill, the id is still the clip's file
   name, so the clip and any film already on Stream stay with it; a drill
   with no clip yet is mu- plus his own id. */

const MU_STAGES=[
 {n:'Foundations', sum:'Strong, controlled pull ups and dips.',
  rec:'We recommend two to three sessions a week.', goal:'Comfortable and explosive pull ups and comfortable dips with good range of motion and an understanding of the false grip.', hold:'',
  intro:'Every muscle up starts with pulling you can trust and pushing that is strong. This stage builds it. We also look at the false grip and the wrist positions, which matter most for ring muscle ups.',
  ch:'Ten and ten', chSub:'Ten strict pull ups and ten dips. Get both and you are ready for stage two.'},
 {n:'Expanding the Ranges', sum:'Focus on a pull up for the muscle up.',
  rec:'We recommend two to three sessions a week.', goal:'We start building the pull up to go higher, to go in the correct trajectory and a swing to aid the next stage.', hold:'',
  intro:'Here we build height on the pull ups, because a good muscle up needs a high pull up. We also change the trajectory of the pull up to give space for the conversion, and learn to swing in the pull up to help with the next stage.',
  ch:'Bar to chest', chSub:'Five high pull ups, bar touching the lower chest every rep. No kicking.'},
 {n:'Pull to Push', sum:'The transition, with help.',
  rec:'We recommend two to three sessions a week.', goal:'Understanding the movement and the wrist positions.', hold:'',
  intro:'This is the stage where we introduce the muscle up movement with assistance and build the strength around the conversion.',
  ch:'The turnover', chSub:'Five full Russian dips, then five jumping muscle ups. Smooth every time.'},
 {n:'The Muscle Up', sum:'Start assisted, then from swing, then from free hang.',
  rec:'We recommend two to three sessions a week.', goal:'To be able to go from assisted to free muscle ups.', hold:'',
  intro:'Here we do the full muscle up: first with a band, then with a swing, then strict, then slow and controlled.',
  ch:'The muscle up', chSub:'One clean muscle up from a dead hang. No band, no swing. That is the ladder.'},
];

/* the drills themselves: what the library holds for a handstand drill,
   and from Suryava's sheet the rest of each row: w is his work seconds for
   one set, sets his sets in an hour, r his rest, kit what you need, diff his
   difficulty out of five (kept, nothing reads it yet) */
const MU_DRILLS=[
 {v:'mu-false-grip-on-bar', n:'False Grip Setup', kit:'Low bar or low rings', w:10, sets:5, r:30, diff:1,
  desc:'Set the false grip on a low bar or rings with your feet on the floor and hold the wrist position.',
  cues:['Heel of the hand on top','Wrist bent over the bar','Squeeze the grip','Reset if the wrist slips']},
 {v:'mu-supported-active-hang-false-grip', n:'False Grip Hangs', kit:'Bar or rings at full hang height', w:30, sets:4, r:90, diff:3,
  desc:'Hang from the bar or rings in a false grip with active shoulders.',
  cues:['Wrists stay over the bar','Shoulders down, away from the ears','Legs together, no swing','Step down before the grip slips']},
 {v:'mu-pull-ups', n:'Pull Ups', kit:'Bar at full hang height', w:30, sets:4, r:120, diff:3,
  desc:'Strict pull ups from a dead hang to chin over the bar, pulling fast on the way up.',
  cues:['Start from a dead hang','Drive the elbows down','Chin over the bar','Lower under control']},
 {v:'mu-straight-bar-hold', n:'Bar Front Support', kit:'Straight bar or parallel bars', w:30, sets:4, r:60, diff:1,
  desc:'Hold the top of a dip on the bar with arms locked and body straight.',
  cues:['Arms locked','Shoulders pushed down','Body straight','Squeeze the glutes']},
 {v:'mu-ring-support-hold', n:'Rings Front Support', kit:'Rings', w:30, sets:4, r:90, diff:3,
  desc:'Hold the top of a dip on the rings with arms locked and the rings tight to the body.',
  cues:['Arms locked','Rings close to the hips','Turn the rings out slightly','Calm the shaking']},
 {v:'mu-parallel-bars-dips', n:'Parallel Bar Dips', kit:'Parallel bars', w:30, sets:4, r:90, diff:2,
  desc:'Full range dips on parallel bars, shoulders below the elbows at the bottom.',
  cues:['Lean slightly forward','Shoulders below the elbows','Lock out at the top','Lower under control']},
 {v:'mu-straight-bar-dips', n:'Straight Bar Dips', kit:'Straight bar', w:30, sets:4, r:90, diff:3,
  desc:'Dips on a single straight bar with the bar staying close to the body.',
  cues:['Bar close to the hips','Elbows go back, not out','Chest over the bar','Lock out at the top']},
 {v:'mu-ring-dips', n:'Ring Dips', kit:'Rings', w:30, sets:4, r:120, diff:4,
  desc:'Full range dips on rings, keeping the rings close and steady.',
  cues:['Rings close to the body','Elbows tucked','Turn the rings out at the top','Lower slowly']},
 {v:'mu-high-pull-ups', n:'High C Pull Ups', kit:'Bar at full hang height', w:30, sets:4, r:120, diff:3,
  desc:'Pull ups that move back from under the bar so the bar finishes at the lower chest.',
  cues:['Lean back as you pull','Pull the bar to the lower chest','Drive the elbows behind you','Lower under control']},
 {v:'mu-intro-swings', n:'Swinging C Pulls', kit:'Bar at full hang height', w:30, sets:4, r:120, diff:3,
  desc:'Build a controlled swing, then pull on the back swing in a C shape towards the bar.',
  cues:['Swing from the shoulders','Hollow to arch, then pull','Pull as the feet go forward','Keep the swing small']},
 {v:'mu-swings-to-high-pull', n:'Swinging High Pulls', kit:'Bar at full hang height', w:30, sets:4, r:120, diff:4,
  desc:'Use the swing to pull as high as possible, aiming the hips towards the bar.',
  cues:['Time the pull with the swing','Hips towards the bar','Pull to the lower chest or higher','Control the drop']},
 {v:'mu-false-gripped-chest-to-bar-pulls', n:'False Grip High C Pull Ups', kit:'Bar or rings', w:30, sets:4, r:150, diff:4,
  desc:'High C pull ups while keeping the false grip from bottom to top.',
  cues:['Set the false grip first','Wrists stay over the bar','Pull the bar to the lower chest','Lower slowly']},
 {v:'mu-ring-pull-ups', n:'Rings Levered Pull Ups', kit:'Rings', w:30, sets:4, r:120, diff:4,
  desc:'Pull ups on rings, leaning back so the rings come to the lower ribs.',
  cues:['Lean back as you pull','Rings to the lower ribs','Elbows tight to the sides','Lower under control']},
 {v:'mu-russian-dips-negative', n:'Russian Dip Negatives', kit:'Parallel bars or straight bar', w:30, sets:4, r:90, diff:3,
  desc:'From the top of a dip, lower slowly until the forearms rest on the bar.',
  cues:['Start locked out on top','Lower slowly','Elbows go back','Land softly on the forearms']},
 {v:'mu-full-russian-dips', n:'Full Russian Dips', kit:'Parallel bars or straight bar', w:30, sets:4, r:120, diff:4,
  desc:'Lower to the forearms, then push back up from the forearms to the top of a dip.',
  cues:['Lower under control','Lean forward to come off the forearms','Push through the hands','Lock out at the top']},
 {v:'mu-straight-bar-dips-hold-at-bottom', n:'Low Dip Hold', kit:'Straight bar', w:20, sets:4, r:90, diff:2,
  desc:'Hold the bottom of a dip on the straight bar, the position you land in after the turnover.',
  cues:['Chest over the bar','Bar close to the body','Elbows back','Breathe and stay tight']},
 {v:'mu-ring-dips-with-hold-at-bottom', n:'Low Dip Hold on Rings', kit:'Rings', w:15, sets:4, r:90, diff:3,
  desc:'Hold the bottom of a dip on rings, keeping the rings close and the false grip set.',
  cues:['Rings close to the chest','Wrists over the rings','Elbows tucked','Stay still']},
 {v:'mu-supported-muscle-up-transition-on-bar-with-box', n:'Feet Assisted Bar Muscle Up', kit:'Low bar', w:30, sets:4, r:90, diff:2,
  desc:'On a low bar with feet on the floor, pull high and turn over into the top of a dip.',
  cues:['Pull to the chest first','Lean over the bar','Use the legs as little as possible','Finish locked out']},
 {v:'mu-box-supported-ring-muscle-ups', n:'Feet Assisted Ring Muscle Up', kit:'Low rings', w:30, sets:4, r:90, diff:3,
  desc:'On low rings with feet on the floor, pull in a false grip and turn over into the top of a dip.',
  cues:['False grip set','Rings to the chest','Elbows go back fast','Finish locked out']},
 {v:'mu-jumping-muscle-ups', n:'Jumping Muscle Up', kit:'Bar and box', w:30, sets:4, r:120, diff:3,
  desc:'Use a small jump to help the pull, then turn over and push to the top.',
  cues:['Small jump, big pull','Pull to the chest','Lean over quickly','Lower down slowly']},
 {v:'mu-banded-muscle-ups', n:'Banded Muscle Up', kit:'Bar or rings and a band', w:30, sets:4, r:120, diff:3,
  desc:'Full muscle ups with a band taking some of the weight.',
  cues:['Band under the knees or feet','Pull high, not just up','Turn over fast','Lock out at the top']},
 {v:'mu-negative-muscle-up-on-bar', n:'Muscle Up Negatives', kit:'Bar or rings and a box', w:30, sets:4, r:120, diff:3,
  desc:'Start at the top and lower slowly through the turnover to a dead hang.',
  cues:['Start locked out on top','Lower slowly through the dip','Stay close through the turnover','Control to a dead hang']},
 {v:'mu-swing-to-muscle-up', n:'Swinging Muscle Up', kit:'Bar at full hang height', w:30, sets:4, r:150, diff:4,
  desc:'Use a controlled swing to pull high and turn over into the top of a dip.',
  cues:['Small, controlled swing','Pull on the back swing','Hips to the bar','Turn over and lock out']},
 {v:'mu-full-ring-muscle-up', n:'Ring Muscle Up', kit:'Rings at full hang height', w:30, sets:4, r:180, diff:5,
  desc:'Muscle ups on rings from a false grip dead hang.',
  cues:['False grip set before you pull','Rings to the chest','Elbows back fast','Turn the rings out at the top']},
 {v:'mu-slow-muscle-up-rings', n:'Slow Ring Muscle Up', kit:'Rings at full hang height', w:30, sets:3, r:180, diff:5,
  desc:'A strict, slow ring muscle up from a dead hang with no swing.',
  cues:['No swing at all','Slow, steady pull','Smooth turnover','Hold the top for two seconds']},
 {v:'mu-slow-muscle-up-bars', n:'Slow Bar Muscle Up', kit:'Bar at full hang height', w:30, sets:3, r:180, diff:5,
  desc:'A strict, slow bar muscle up from a dead hang with no swing.',
  cues:['No swing at all','Pull the bar to the hips','Smooth turnover','Hold the top for two seconds']},
];

/* The film each drill plays, by the name it exports under in Downloads/
   Muscle up drills/edit: Suryava's drill name, with his name and cues on the
   film (~/lha-reels/tools/build-mu-drills.py). Six have no clip yet. Stream
   uids replace these once uploaded. */
const MU_FILMS={
 'mu-false-grip-on-bar':'False grip setup.mp4',
 'mu-supported-active-hang-false-grip':'False grip hangs.mp4',
 'mu-pull-ups':'Pull ups.mp4',
 'mu-straight-bar-hold':'Bar front support.mp4',
 'mu-ring-support-hold':'Rings front support.mp4',
 'mu-parallel-bars-dips':'Parallel bar dips.mp4',
 'mu-straight-bar-dips':'Straight bar dips.mp4',
 'mu-ring-dips':'Ring dips.mp4',
 'mu-high-pull-ups':'High C pull ups.mp4',
 'mu-intro-swings':'Swinging C pulls.mp4',
 'mu-swings-to-high-pull':'Swinging high pulls.mp4',
 'mu-false-gripped-chest-to-bar-pulls':'False grip high C pull ups.mp4',
 'mu-ring-pull-ups':'Rings levered pull ups.mp4',
 'mu-russian-dips-negative':'Russian dip negatives.mp4',
 'mu-full-russian-dips':'Full Russian dips.mp4',
 'mu-straight-bar-dips-hold-at-bottom':'Low dip hold.mp4',
 'mu-ring-dips-with-hold-at-bottom':'Low dip hold on rings.mp4',
 'mu-supported-muscle-up-transition-on-bar-with-box':'Feet assisted bar muscle up.mp4',
 'mu-box-supported-ring-muscle-ups':'Feet assisted ring muscle up.mp4',
 'mu-jumping-muscle-ups':'Jumping muscle up.mp4',
 'mu-banded-muscle-ups':'Banded muscle up.mp4',
 'mu-negative-muscle-up-on-bar':'Muscle up negatives.mp4',
 'mu-swing-to-muscle-up':'Swinging muscle up.mp4',
 'mu-full-ring-muscle-up':'Ring muscle up.mp4',
 'mu-slow-muscle-up-rings':'Slow ring muscle up.mp4',
 'mu-slow-muscle-up-bars':'Slow bar muscle up.mp4',
};
const MU_TEACH=[];

const MU_DOSE={
 'mu-false-grip-on-bar':'5 × 10s setups',
 'mu-supported-active-hang-false-grip':'4 × 15 to 30s hold',
 'mu-pull-ups':'4 × 5 to 8',
 'mu-straight-bar-hold':'4 × 20 to 30s hold',
 'mu-ring-support-hold':'4 × 15 to 30s hold',
 'mu-parallel-bars-dips':'4 × 6 to 10',
 'mu-straight-bar-dips':'4 × 5 to 8',
 'mu-ring-dips':'4 × 3 to 6',
 'mu-high-pull-ups':'4 × 4 to 6',
 'mu-intro-swings':'4 × 3 to 5',
 'mu-swings-to-high-pull':'4 × 3 to 5',
 'mu-false-gripped-chest-to-bar-pulls':'4 × 3 to 5',
 'mu-ring-pull-ups':'4 × 4 to 6',
 'mu-russian-dips-negative':'4 × 3 slow reps',
 'mu-full-russian-dips':'4 × 3 to 5',
 'mu-straight-bar-dips-hold-at-bottom':'4 × 10 to 20s hold',
 'mu-ring-dips-with-hold-at-bottom':'4 × 10 to 15s hold',
 'mu-supported-muscle-up-transition-on-bar-with-box':'4 × 4 to 6',
 'mu-box-supported-ring-muscle-ups':'4 × 4 to 6',
 'mu-jumping-muscle-ups':'4 × 3 to 5',
 'mu-banded-muscle-ups':'4 × 3 to 5',
 'mu-negative-muscle-up-on-bar':'4 × 2 to 3 slow reps',
 'mu-swing-to-muscle-up':'4 × 2 to 4',
 'mu-full-ring-muscle-up':'4 × 1 to 3',
 'mu-slow-muscle-up-rings':'3 × 1 to 2',
 'mu-slow-muscle-up-bars':'3 × 1 to 2',
};

/* Stream uids, uploaded from the edits: drill id to uid. Locked to the
   subscription (requireSignedURLs) and MP4 downloads on. The false grip
   five went up on 24 Oct 2026; the rest follow as they are exported. */
/* All twenty matched films went up on 26 Oct 2026 (mu-films.json has the
   other eight, named by their file). They still carry the old draft's
   titles and cues: Suryava names them in the dashboard's Films tab, and
   they are exported again with his words once he has. */
const MU_UIDS={
 'mu-false-grip-on-bar':'f4239cba98e33d1cf7a3ce6e66ae8aa3',
 'mu-supported-active-hang-false-grip':'954a564b1807055e16ff7b58ca7128f1',
 'mu-straight-bar-hold':'bdb716aaef719eb4b2cba5e75c11ff7d',
 'mu-ring-support-hold':'cae81b90dafea9340c28d05fea703f09',
 'mu-straight-bar-dips':'ecf744fdb995a46357156ed2391bf4fe',
 'mu-ring-dips':'6f3aaa208e1201d4bc666b9cc40059f7',
 'mu-high-pull-ups':'59c77778dba35e2e6b2a11b628f2c042',
 'mu-intro-swings':'fab5ccf69ba928d5fb6908a1a5cffbd1',
 'mu-swings-to-high-pull':'3df1ca69eaa029e52ea4096fa2c10fb2',
 'mu-false-gripped-chest-to-bar-pulls':'493b8f355015ccd9495ee6d4908b8372',
 'mu-ring-pull-ups':'d5546efa6caf5739581b87294eeb5561',
 'mu-straight-bar-dips-hold-at-bottom':'b54aa8d0c9d304e7a8a56ead0ac252ee',
 'mu-ring-dips-with-hold-at-bottom':'9db7997dfd79619fa6854d46c57f2d3c',
 'mu-supported-muscle-up-transition-on-bar-with-box':'5395c237fea23a632b0696acb8b6bf9b',
 'mu-box-supported-ring-muscle-ups':'903a23a974c2bf2e754fadaaa28cb974',
 'mu-jumping-muscle-ups':'42f88d3bd0aede9d086832f0260e81cc',
 'mu-banded-muscle-ups':'39328a491e7980c55360fea2a49d7baa',
 'mu-negative-muscle-up-on-bar':'85edf57173f2b230dcf598125b839fbb',
 'mu-swing-to-muscle-up':'fff6d7e0d06837c50e05725e08875637',
 'mu-full-ring-muscle-up':'71c55a6edd1ae28626789b779b8c1450',
};

/* Four stages, as Suryava wrote them (26 Oct 2026). The two warm-up drills
   open every session, as on the handstand ladder. */
const MU_POOL={
 0:[
  {v:'wrist-circles-mob', g:'Warm-up', L:1},
  {v:'shoulder-circles', g:'Warm-up', L:1},
  {v:'mu-false-grip-on-bar', g:'Grip', L:1},
  {v:'mu-supported-active-hang-false-grip', g:'Grip', L:2},
  {v:'mu-pull-ups', g:'Pulling', L:2},
  {v:'mu-straight-bar-hold', g:'Support', L:1},
  {v:'mu-ring-support-hold', g:'Support', L:2},
  {v:'mu-parallel-bars-dips', g:'Pushing', L:1},
  {v:'mu-straight-bar-dips', g:'Pushing', L:3},
  {v:'mu-ring-dips', g:'Pushing', L:4},
 ],
 1:[
  {v:'wrist-circles-mob', g:'Warm-up', L:1},
  {v:'shoulder-circles', g:'Warm-up', L:1},
  {v:'mu-high-pull-ups', g:'Pulling', L:1},
  {v:'mu-intro-swings', g:'Swing', L:2},
  {v:'mu-swings-to-high-pull', g:'Swing', L:3},
  {v:'mu-false-gripped-chest-to-bar-pulls', g:'Pulling', L:4},
  {v:'mu-ring-pull-ups', g:'Pulling', L:3},
 ],
 2:[
  {v:'wrist-circles-mob', g:'Warm-up', L:1},
  {v:'shoulder-circles', g:'Warm-up', L:1},
  {v:'mu-russian-dips-negative', g:'Transition', L:2},
  {v:'mu-full-russian-dips', g:'Transition', L:4},
  {v:'mu-straight-bar-dips-hold-at-bottom', g:'Pushing', L:1},
  {v:'mu-ring-dips-with-hold-at-bottom', g:'Pushing', L:2},
  {v:'mu-supported-muscle-up-transition-on-bar-with-box', g:'Muscle up', L:1},
  {v:'mu-box-supported-ring-muscle-ups', g:'Muscle up', L:2},
  {v:'mu-jumping-muscle-ups', g:'Muscle up', L:3},
 ],
 3:[
  {v:'wrist-circles-mob', g:'Warm-up', L:1},
  {v:'shoulder-circles', g:'Warm-up', L:1},
  {v:'mu-banded-muscle-ups', g:'Muscle up', L:1},
  {v:'mu-negative-muscle-up-on-bar', g:'Control', L:1},
  {v:'mu-swing-to-muscle-up', g:'Muscle up', L:2},
  {v:'mu-full-ring-muscle-up', g:'Muscle up', L:3},
  {v:'mu-slow-muscle-up-rings', g:'Control', L:4},
  {v:'mu-slow-muscle-up-bars', g:'Control', L:4},
 ],
};

const MU_WEEK={
 0:[{n:'Pull day', sub:'Strict pulling and the false grip', focus:['Pulling','Grip']},
    {n:'Push day', sub:'Dips and support holds', focus:['Pushing','Support']},
    {n:'Mixed day', sub:'A bit of everything', focus:['Pulling','Pushing','Grip','Support']}],
 1:[{n:'Height day', sub:'Pull higher in a C shape', focus:['Pulling']},
    {n:'Swing day', sub:'Learn to swing and pull', focus:['Swing']},
    {n:'Mixed day', sub:'Height and swing together', focus:['Pulling','Swing']}],
 2:[{n:'Transition day', sub:'Russian dips and the low dip', focus:['Transition','Pushing']},
    {n:'Turnover day', sub:'Assisted muscle ups', focus:['Muscle up','Transition']},
    {n:'Mixed day', sub:'Turnover and pushing strength', focus:['Muscle up','Pushing']}],
 3:[{n:'Assisted day', sub:'Bands and negatives', focus:['Muscle up','Control']},
    {n:'Swing day', sub:'Muscle ups from a swing', focus:['Muscle up']},
    {n:'Control day', sub:'Slow, strict reps', focus:['Control','Muscle up']}],
};

const MU_CHECKPOINTS={
 0:[
  {k:'mu-false-grip-setup', n:'False grip setup', kind:'yn', demo:'mu-false-grip-on-bar', note:'Can set a false grip on bar and rings without looking.'},
  {k:'mu-false-grip-hang', n:'False grip hang', kind:'secs', target:20, demo:'mu-supported-active-hang-false-grip', note:'Wrists stay over the bar, shoulders down.'},
  {k:'mu-strict-pull-ups', n:'Strict pull ups', kind:'count', target:10, demo:'mu-pull-ups', note:'Dead hang to chin over the bar, no kicking.'},
  {k:'mu-bar-dips', n:'Parallel bar dips', kind:'count', target:10, demo:'mu-parallel-bars-dips', note:'Shoulders below the elbows, full lockout.'},
  {k:'mu-straight-bar-dips', n:'Straight bar dips', kind:'count', target:6, demo:'mu-straight-bar-dips', note:'Bar close to the hips throughout.'},
  {k:'mu-rings-support', n:'Rings support hold', kind:'secs', target:30, demo:'mu-ring-support-hold', note:'Arms locked, rings still and close.'},
  {k:'mu-rings-dips', n:'Ring dips', kind:'count', target:5, demo:'mu-ring-dips', note:'Full range, rings steady at the top.'},
 ],
 1:[
  {k:'mu-high-c-pull-ups', n:'High C pull ups', kind:'count', target:5, demo:'mu-high-pull-ups', note:'Bar touches the lower chest every rep.'},
  {k:'mu-high-pull-total', n:'Fifteen high pull ups', kind:'breaks', target:3, demo:'mu-high-pull-ups', note:'Fifteen high C pull ups in as few goes as possible.'},
  {k:'mu-controlled-swing', n:'Controlled swing', kind:'yn', demo:'mu-intro-swings', note:'Swing builds and stops when you choose.'},
  {k:'mu-swinging-high-pulls', n:'Swinging high pulls', kind:'count', target:5, demo:'mu-swings-to-high-pull', note:'Hips come close to the bar on every rep.'},
  {k:'mu-rings-levered', n:'Rings levered pull ups', kind:'count', target:5, demo:'mu-ring-pull-ups', note:'Rings reach the lower ribs.'},
  {k:'mu-false-grip-c-pulls', n:'False grip high C pull ups', kind:'count', target:3, demo:'mu-false-gripped-chest-to-bar-pulls', note:'False grip held from bottom to top.'},
 ],
 2:[
  {k:'mu-russian-negative', n:'Russian dip negative', kind:'secs', target:5, demo:'mu-russian-dips-negative', note:'Slow, even lowering onto the forearms.'},
  {k:'mu-full-russian-dips', n:'Full Russian dips', kind:'count', target:5, demo:'mu-full-russian-dips', note:'Off the forearms without a bounce.'},
  {k:'mu-low-dip-hold', n:'Low dip hold', kind:'secs', target:20, demo:'mu-straight-bar-dips-hold-at-bottom', note:'Chest over the bar, still and tight.'},
  {k:'mu-low-dip-hold-rings', n:'Low dip hold on rings', kind:'secs', target:15, demo:'mu-ring-dips-with-hold-at-bottom', note:'Rings close, false grip held.'},
  {k:'mu-feet-assisted-bar', n:'Feet assisted bar muscle ups', kind:'count', target:8, demo:'mu-supported-muscle-up-transition-on-bar-with-box', note:'Smooth turnover, legs barely helping.'},
  {k:'mu-feet-assisted-rings', n:'Feet assisted ring muscle ups', kind:'count', target:6, demo:'mu-box-supported-ring-muscle-ups', note:'False grip kept through the turnover.'},
  {k:'mu-jumping-mu', n:'Jumping muscle ups', kind:'count', target:5, demo:'mu-jumping-muscle-ups', note:'Small jump, smooth turnover, lockout at the top.'},
 ],
 3:[
  {k:'mu-banded-mu', n:'Banded muscle ups', kind:'count', target:5, demo:'mu-banded-muscle-ups', note:'Full lockout, no chicken wing.'},
  {k:'mu-negative', n:'Muscle up negative', kind:'secs', target:5, demo:'mu-negative-muscle-up-on-bar', note:'Slow and controlled all the way to a dead hang.'},
  {k:'mu-swinging-mu', n:'Swinging muscle ups', kind:'count', target:3, demo:'mu-swing-to-muscle-up', note:'Small swing, both arms turn over together.'},
  {k:'mu-first-rings-mu', n:'First ring muscle up', kind:'yn', demo:'mu-full-ring-muscle-up', note:'One ring muscle up from a false grip dead hang.'},
  {k:'mu-total', n:'Ten muscle ups', kind:'breaks', target:4, demo:'mu-swing-to-muscle-up', note:'Ten muscle ups in as few goes as possible.'},
  {k:'mu-slow-mu-bar', n:'Slow bar muscle ups', kind:'count', target:2, demo:'mu-slow-muscle-up-bars', note:'No swing, two second hold at the top.'},
  {k:'mu-slow-mu-rings', n:'Slow ring muscle ups', kind:'count', target:2, demo:'mu-slow-muscle-up-rings', note:'No swing, two second hold at the top.'},
 ],
};
MU_STAGES.forEach((s,i)=>{ s.drillIds=[...new Set((MU_POOL[i]||[]).map(x=>x.v).filter(v=>v.indexOf('mu-')===0))]; });

/* Where the quiz starts someone: pull ups, a false grip hang, and a banded
   muscle up. A banded muscle up means the turnover is there, and with ten
   pull ups and the grip, the muscle up itself is next. Ten pull ups is
   past the first stage. */
const MU_PULLS=['None yet','1 to 4','5 to 9','10 or more'];
function muPlace(pulls, falseGrip, banded){
  const p=Number(pulls)||0;
  if(banded) return (p>=3 && falseGrip) ? 3 : 2;
  /* his first stage ends at ten strict pull ups and ten dips */
  return p>=3 ? 1 : 0;
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
