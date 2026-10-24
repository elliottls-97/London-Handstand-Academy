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
 {n:'First Pull Up and Dip', sum:'Your first strict pull up and dip, a steady hang, and holding yourself above the bar.',
  rec:'We recommend two to three sessions a week.', goal:'A strict pull up, a dip, and a steady support above the bar.', hold:'20s',
  intro:'Every muscle up is a pull and a push. This stage builds both halves separately: a hang that stays active, pull ups that reach the bar, and the support and dips that finish on top. The false grip starts here too, little and often.',
  ch:'Pull up and dip', chSub:'Three strict pull ups, then five dips on the bar. Do it with me.'},
 {n:'High Pull and Strength', sum:'A controlled swing, a pull that reaches your waist, and dips that are strong at the bottom.',
  rec:'We recommend two to three sessions a week.', goal:'Pull the bar to your waist and dip deep with control.', hold:'',
  intro:'A muscle up needs the bar much lower on the body than a pull up does. The swing gives you the speed and the high pull takes the bar to your waist, while deep dips make the bottom of the muscle up somewhere you are strong.',
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
 {v:'mu-false-grip-on-bar', n:'False Grip on the Bar', kit:'bar',
  desc:'Set the wrist over the bar so the hand is already on top before you pull.',
  cues:['Heel of the hand on top of the bar','Wrist bent over the bar','Hold it as you hang']},
 {v:'mu-false-grip-on-rings', n:'False Grip on the Rings', kit:'rings',
  desc:'Setting the false grip on the rings: the ring deep in the crease of the wrist, the palm over the top.',
  cues:['Ring in the crease of the wrist','Palm over the top, thumb around','Wrist stays bent as you hang']},
 {v:'mu-rings-false-grip', n:'Supported False Grip Hang on the Rings', kit:'rings',
  desc:'A false grip hang on the rings with the feet on the box, so the wrists get used to it.',
  cues:['Set the grip standing up','Sit back, feet stay down','Wrists stay bent over the rings']},
 {v:'mu-supported-active-hang-false-grip', n:'False Grip Hang on the Bar', kit:'bar, box',
  desc:'A false grip hang on the bar with the feet helping, so the wrists get used to it.',
  cues:['Wrists stay bent over the bar','Feet take what the hands can\'t']},
 {v:'mu-active-hang', n:'Active Hang', kit:'bar',
  desc:'Hang from the bar and draw the shoulders down away from the ears, arms straight.',
  cues:['Arms stay straight','Shoulders down, away from the ears']},
 {v:'mu-ring-support-hold', n:'Ring Support Hold', kit:'rings',
  desc:'Hold yourself above the rings with straight arms, rings by your hips.',
  cues:['Arms locked straight','Rings close to the hips','Shoulders pushed down']},
 {v:'mu-ring-full-support-hold', n:'Ring Support Hold Turned Out', kit:'rings',
  desc:'The harder support hold on the rings, held longer and steadier.',
  cues:['Turn the rings out','Arms locked straight']},
 {v:'mu-straight-bar-hold', n:'Straight Bar Support Hold', kit:'bar',
  desc:'Hold yourself on top of the bar with straight arms, the bar at your hips.',
  cues:['Arms locked straight','Push the bar down']},
 {v:'mu-straight-bar-dips', n:'Straight Bar Dips', kit:'bar',
  desc:'Dips on top of the bar, leaning forward over it.',
  cues:['Lean forward as you go down','Elbows go back','Press to straight arms']},
 {v:'mu-straight-bar-dips-hold-at-bottom', n:'Straight Bar Dips with a Pause', kit:'bar',
  desc:'Straight bar dips with a pause at the bottom, where the muscle up lands.',
  cues:['Lower with control','Pause at the bottom','Press back up']},
 {v:'mu-ring-dips', n:'Ring Dips', kit:'rings',
  desc:'Full range dips on the rings, keeping them close to the body.',
  cues:['Rings close to the body','Elbows go back','Lock out at the top']},
 {v:'mu-ring-dips-with-hold-at-bottom', n:'Ring Dips with a Pause', kit:'rings',
  desc:'Ring dips with a pause in the deepest position.',
  cues:['Lower slowly','Pause at the bottom','Rings stay close']},
 {v:'mu-chest-to-bar-pull-ups', n:'Chest to Bar Pull Ups', kit:'bar',
  desc:'Pull until the chest touches the bar, not just the chin over it.',
  cues:['Pull the chest to the bar','Elbows drive down and back','Full hang between reps']},
 {v:'mu-false-gripped-chest-to-bar-pulls', n:'False Grip Chest to Bar Pulls', kit:'bar',
  desc:'Chest to bar pull ups without losing the false grip.',
  cues:['Keep the false grip','Pull the chest to the bar','Wrists stay over']},
 {v:'mu-ring-pull-ups', n:'Ring Pull Ups', kit:'rings',
  desc:'Strict pull ups on the rings, letting the hands turn as you pull.',
  cues:['Pull the rings to the chest','Elbows down and back','Straight arms at the bottom']},
 {v:'mu-high-pull-ups', n:'High Pull Ups', kit:'bar',
  desc:'Pull as high as you can, aiming the bar at the bottom of your ribs.',
  cues:['Pull as high as you can','Bar to the lower chest','Fast up, slow down']},
 {v:'mu-high-pulls', n:'High Pulls', kit:'bar',
  desc:'Explosive pulls from a small jump, driving the bar towards your waist.',
  cues:['Pull hard and fast','Drive the hips to the bar','Lead with the chest']},
 {v:'mu-intro-swings', n:'Swings', kit:'bar',
  desc:'Controlled swings under the bar, hollow in front and arched behind.',
  cues:['Swing from the shoulders','Hollow in front, arch behind','Arms stay straight']},
 {v:'mu-swings-to-high-pull', n:'Swings to a High Pull', kit:'bar',
  desc:'Use the swing to drive a high pull towards the waist.',
  cues:['Swing to build speed','Pull as the legs come forward']},
 {v:'mu-negative-muscle-up-on-bar', n:'Negative Muscle Up on the Bar', kit:'bar, box',
  desc:'Start on top of the bar and lower slowly through the transition to a hang.',
  cues:['Start at the top','Lower slowly through the transition','Stay over the bar as long as you can']},
 {v:'mu-supported-muscle-up-transition-on-bar-with-box', n:'Supported Transition on the Bar', kit:'bar, box',
  desc:'Practise the turnover on the bar with the feet helping from a box.',
  cues:['Feet on the box for help','Lean the chest over the bar','Push to straight arms']},
 {v:'mu-box-supported-ring-muscle-ups', n:'Box Supported Ring Muscle Up', kit:'rings, box',
  desc:'Ring muscle ups with the feet on a box taking some of the weight.',
  cues:['Feet take some weight','Pull the rings to the chest','Lean over, then push']},
 {v:'mu-jumping-muscle-ups', n:'Jumping Muscle Up', kit:'bar, box',
  desc:'A jump gives the speed so you can practise the turnover over and over.',
  cues:['Jump to help the pull','Pull the bar to the hips','Lean over and press']},
 {v:'mu-banded-muscle-ups', n:'Banded Muscle Up', kit:'bar, band',
  desc:'Setting up a band on the bar and using it to help through the muscle up.',
  cues:['Loop the band round the bar','Feet in the band','The band helps, you finish it']},
 {v:'mu-bar-muscle-up', n:'Bar Muscle Up', kit:'bar',
  desc:'The full muscle up on the bar.',
  cues:['Swing, then pull to the hips','Chest over the bar','Press to straight arms']},
 {v:'mu-swing-to-muscle-up', n:'Swing to Muscle Up', kit:'bar',
  desc:'A bar muscle up from the swing.',
  cues:['Big swing from the shoulders','Pull as the legs swing forward']},
 {v:'mu-ring-muscle-up-with-swing', n:'Ring Muscle Up with a Swing', kit:'rings',
  desc:'A ring muscle up using a swing for speed.',
  cues:['Swing to build the pull','False grip stays on','Pull, turn, then press']},
 {v:'mu-full-ring-muscle-up', n:'Full Ring Muscle Up', kit:'rings',
  desc:'The full muscle up on the rings.',
  cues:['False grip on','Pull the rings to the ribs','Lean in, press to support']},
];

/* The clip each drill plays, by its exported name in Downloads/Muscle up
   drills/edit (Elliott's edits, titles and cues on the film; the cues above
   are the same words). Stream uids replace these once uploaded. */
const MU_FILMS={
 'mu-false-grip-on-bar':'False grip on the bar.mp4',
 'mu-false-grip-on-rings':'False grip on the rings.mp4',
 'mu-rings-false-grip':'Supported false grip hang on the rings.mp4',
 'mu-supported-active-hang-false-grip':'False grip hang on the bar.mp4',
 'mu-active-hang':'Active hang.mp4',
 'mu-ring-support-hold':'Ring support hold.mp4',
 'mu-ring-full-support-hold':'Ring support hold turned out.mp4',
 'mu-straight-bar-hold':'Straight bar support hold.mp4',
 'mu-straight-bar-dips':'Straight bar dips.mp4',
 'mu-straight-bar-dips-hold-at-bottom':'Straight bar dips with a pause.mp4',
 'mu-ring-dips':'Ring dips.mp4',
 'mu-ring-dips-with-hold-at-bottom':'Ring dips with a pause.mp4',
 'mu-chest-to-bar-pull-ups':'Chest to bar pull ups.mp4',
 'mu-false-gripped-chest-to-bar-pulls':'False grip chest to bar pulls.mp4',
 'mu-ring-pull-ups':'Ring pull ups.mp4',
 'mu-high-pull-ups':'High pull ups.mp4',
 'mu-high-pulls':'High pulls.mp4',
 'mu-intro-swings':'Swings.mp4',
 'mu-swings-to-high-pull':'Swings to a high pull.mp4',
 'mu-negative-muscle-up-on-bar':'Negative muscle up on the bar.mp4',
 'mu-supported-muscle-up-transition-on-bar-with-box':'Supported transition on the bar.mp4',
 'mu-box-supported-ring-muscle-ups':'Box supported ring muscle up.mp4',
 'mu-jumping-muscle-ups':'Jumping muscle up.mp4',
 'mu-banded-muscle-ups':'Banded muscle up.mp4',
 'mu-bar-muscle-up':'Bar muscle up.mp4',
 'mu-swing-to-muscle-up':'Swing to muscle up.mp4',
 'mu-ring-muscle-up-with-swing':'Ring muscle up with a swing.mp4',
 'mu-full-ring-muscle-up':'Full ring muscle up.mp4',
};
const MU_TEACH=[];

const MU_DOSE={
 'mu-active-hang':'3 × 20s', 'mu-ring-pull-ups':'3 × 5', 'mu-chest-to-bar-pull-ups':'3 × 3 to 5',
 'mu-high-pull-ups':'3 × 3', 'mu-high-pulls':'3 × 3', 'mu-straight-bar-hold':'3 × 20s',
 'mu-straight-bar-dips':'3 × 5', 'mu-straight-bar-dips-hold-at-bottom':'3 × 3, pause at the bottom',
 'mu-ring-support-hold':'3 × 15s', 'mu-ring-full-support-hold':'3 × 10s', 'mu-ring-dips':'3 × 5',
 'mu-ring-dips-with-hold-at-bottom':'3 × 3, pause at the bottom', 'mu-false-grip-on-bar':'3 × 10s',
 'mu-supported-active-hang-false-grip':'3 × 15s', 'mu-false-gripped-chest-to-bar-pulls':'3 × 3',
 'mu-rings-false-grip':'3 × 15s', 'mu-false-grip-on-rings':'3 × 10s', 'mu-intro-swings':'3 × 6 swings', 'mu-swings-to-high-pull':'3 × 3',
 'mu-negative-muscle-up-on-bar':'3 × 3, slow', 'mu-supported-muscle-up-transition-on-bar-with-box':'3 × 5',
 'mu-box-supported-ring-muscle-ups':'3 × 5', 'mu-banded-muscle-ups':'3 × 3', 'mu-jumping-muscle-ups':'3 × 3',
 'mu-swing-to-muscle-up':'3 × build to 3', 'mu-bar-muscle-up':'3 × 1 to 3',
 'mu-ring-muscle-up-with-swing':'3 × 1 to 3', 'mu-full-ring-muscle-up':'3 × 1 to 3',
};

/* Stream uids, uploaded from the edits: drill id to uid. Locked to the
   subscription (requireSignedURLs) and MP4 downloads on. The false grip
   five went up on 24 Oct 2026; the rest follow as they are exported. */
const MU_UIDS={
 'mu-false-grip-on-bar':'f4239cba98e33d1cf7a3ce6e66ae8aa3',
 'mu-supported-active-hang-false-grip':'954a564b1807055e16ff7b58ca7128f1',
 'mu-false-grip-on-rings':'4f47608890bc591afe04757c867ed65d',
 'mu-rings-false-grip':'40eb6695b30de839d6ae2186ec6d1a65',
 'mu-false-gripped-chest-to-bar-pulls':'493b8f355015ccd9495ee6d4908b8372',
};

/* Four stages (Elliott, 24 Oct 2026: "first pull up and dip, high pull and
   strengthening, transition, muscle up"). The false grip is not a stage:
   it is a Learn article, and its drills run through the first three. */
const MU_POOL={
 0:[
  {v:'wrist-circles-mob', g:'Warm-up', L:1}, {v:'shoulder-circles', g:'Warm-up', L:1},
  {v:'mu-active-hang', g:'Hang', L:1},
  {v:'mu-ring-pull-ups', g:'Pull', L:2}, {v:'mu-chest-to-bar-pull-ups', g:'Pull', L:3},
  {v:'mu-straight-bar-hold', g:'Support', L:1}, {v:'mu-ring-support-hold', g:'Support', L:2},
  {v:'mu-straight-bar-dips', g:'Dips', L:2}, {v:'mu-straight-bar-dips-hold-at-bottom', g:'Dips', L:3}, {v:'mu-ring-dips', g:'Dips', L:4},
  {v:'mu-supported-active-hang-false-grip', g:'False grip', L:1}, {v:'mu-false-grip-on-bar', g:'False grip', L:2},
  {v:'mu-false-grip-on-rings', g:'False grip', L:2}, {v:'mu-rings-false-grip', g:'False grip', L:3},
 ],
 1:[
  {v:'wrist-circles-mob', g:'Warm-up', L:1}, {v:'shoulder-circles', g:'Warm-up', L:1},
  {v:'mu-intro-swings', g:'Swing', L:1}, {v:'mu-swings-to-high-pull', g:'Swing', L:3},
  {v:'mu-chest-to-bar-pull-ups', g:'Pull', L:1}, {v:'mu-high-pull-ups', g:'Pull', L:2}, {v:'mu-high-pulls', g:'Pull', L:3},
  {v:'mu-straight-bar-dips-hold-at-bottom', g:'Dips', L:1}, {v:'mu-ring-dips', g:'Dips', L:2}, {v:'mu-ring-dips-with-hold-at-bottom', g:'Dips', L:3},
  {v:'mu-ring-support-hold', g:'Support', L:1}, {v:'mu-ring-full-support-hold', g:'Support', L:2},
  {v:'mu-false-grip-on-bar', g:'False grip', L:1}, {v:'mu-false-grip-on-rings', g:'False grip', L:1}, {v:'mu-rings-false-grip', g:'False grip', L:2},
  {v:'mu-false-gripped-chest-to-bar-pulls', g:'False grip', L:4},
 ],
 2:[
  {v:'wrist-circles-mob', g:'Warm-up', L:1}, {v:'shoulder-circles', g:'Warm-up', L:1},
  {v:'mu-intro-swings', g:'Swing', L:1}, {v:'mu-swings-to-high-pull', g:'Swing', L:2},
  {v:'mu-supported-muscle-up-transition-on-bar-with-box', g:'Transition', L:1}, {v:'mu-box-supported-ring-muscle-ups', g:'Transition', L:1},
  {v:'mu-negative-muscle-up-on-bar', g:'Transition', L:2}, {v:'mu-banded-muscle-ups', g:'Transition', L:3},
  {v:'mu-jumping-muscle-ups', g:'Transition', L:3}, {v:'mu-swing-to-muscle-up', g:'Transition', L:4},
  {v:'mu-high-pull-ups', g:'Pull', L:1}, {v:'mu-high-pulls', g:'Pull', L:2},
  {v:'mu-straight-bar-dips-hold-at-bottom', g:'Dips', L:1}, {v:'mu-ring-dips', g:'Dips', L:2},
  {v:'mu-rings-false-grip', g:'False grip', L:1}, {v:'mu-false-gripped-chest-to-bar-pulls', g:'False grip', L:2},
 ],
 3:[
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
 0:[{n:'Pull',           sub:'Hang steady, then pull',             focus:['Hang','Pull','False grip']},
    {n:'Dip',            sub:'Above the bar, holding and dipping', focus:['Support','Dips']},
    {n:'Both halves',    sub:'Pull and push in one session',        focus:['Pull','Dips','False grip']}],
 1:[{n:'Pull high',      sub:'The swing, and the bar to your waist', focus:['Swing','Pull']},
    {n:'Strength',       sub:'Deep dips and a still support',      focus:['Dips','Support','False grip']},
    {n:'All of it',      sub:'Pull, grip and dip',                 focus:['Pull','Dips','False grip']}],
 2:[{n:'The turnover',   sub:'Over the bar with help',             focus:['Transition']},
    {n:'Assisted',       sub:'Box, band, and the grip',            focus:['Transition','False grip']},
    {n:'Power',          sub:'Swing into the turnover',            focus:['Swing','Transition','Pull','Dips']}],
 3:[{n:'Muscle ups',     sub:'On the bar',                         focus:['Muscle up','Transition']},
    {n:'Rings',          sub:'False grip, then over',              focus:['Muscle up','Swing']},
    {n:'Strength',       sub:'The pull and the dip behind it',     focus:['Pull','Dips','Transition']}],
};

const MU_CHECKPOINTS={
 0:[
  {k:'mu-hang',        n:'Active hang',                  kind:'secs',  target:30, demo:'mu-active-hang', note:'Shoulders down the whole time.'},
  {k:'mu-first-pull',  n:'First strict pull up',         kind:'yn',    demo:'mu-ring-pull-ups'},
  {k:'mu-pullups',     n:'Strict pull ups',              kind:'count', target:5,  demo:'mu-ring-pull-ups', note:'Chin over, full hang between each.'},
  {k:'mu-bar-support', n:'Straight bar support hold',    kind:'secs',  target:20, demo:'mu-straight-bar-hold'},
  {k:'mu-bar-dips',    n:'Straight bar dips',            kind:'count', target:5,  demo:'mu-straight-bar-dips'},
  {k:'mu-ring-support',n:'Ring support hold',            kind:'secs',  target:15, demo:'mu-ring-support-hold'},
  {k:'mu-fg-supported',n:'Supported false grip hang',    kind:'secs',  target:20, demo:'mu-supported-active-hang-false-grip'},
 ],
 1:[
  {k:'mu-swings',      n:'Swings, ten clean',            kind:'breaks',target:2,  demo:'mu-intro-swings', note:'Goes needed to get ten controlled swings.'},
  {k:'mu-c2b',         n:'Chest to bar pull ups',        kind:'count', target:3,  demo:'mu-chest-to-bar-pull-ups'},
  {k:'mu-high-pull',   n:'High pull ups',                kind:'count', target:5,  demo:'mu-high-pull-ups', note:'Bar to the bottom of the ribs.'},
  {k:'mu-swing-high',  n:'Swing to high pull',           kind:'count', target:5,  demo:'mu-swings-to-high-pull'},
  {k:'mu-ring-dips',   n:'Ring dips',                    kind:'count', target:5,  demo:'mu-ring-dips'},
  {k:'mu-ring-dip-pause', n:'Ring dips, pause at the bottom', kind:'count', target:3, demo:'mu-ring-dips-with-hold-at-bottom'},
  {k:'mu-fg-bar',      n:'False grip hang on the bar',   kind:'secs',  target:15, demo:'mu-false-grip-on-bar'},
 ],
 2:[
  {k:'mu-negatives',   n:'Bar muscle up negatives',      kind:'count', target:3,  demo:'mu-negative-muscle-up-on-bar', note:'Slow through the turnover.'},
  {k:'mu-box-bar',     n:'Box supported transition',     kind:'count', target:5,  demo:'mu-supported-muscle-up-transition-on-bar-with-box'},
  {k:'mu-box-rings',   n:'Box supported ring muscle ups',kind:'count', target:5,  demo:'mu-box-supported-ring-muscle-ups'},
  {k:'mu-banded',      n:'Banded muscle ups',            kind:'count', target:3,  demo:'mu-banded-muscle-ups'},
  {k:'mu-jumping',     n:'Jumping muscle ups',           kind:'count', target:5,  demo:'mu-jumping-muscle-ups'},
  {k:'mu-fg-c2b',      n:'False grip chest to bar pulls',kind:'count', target:3,  demo:'mu-false-gripped-chest-to-bar-pulls'},
  {k:'mu-turnover',    n:'The turnover',                 kind:'face',  note:'How does getting over the bar feel?', faces:['Stuck under it','Sometimes','Smooth']},
 ],
 3:[
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
   muscle up. A banded muscle up means the turnover is there, and with ten
   pull ups and the grip, the muscle up itself is next. Five pull ups is
   past the first stage. */
const MU_PULLS=['None yet','1 to 4','5 to 9','10 or more'];
function muPlace(pulls, falseGrip, banded){
  const p=Number(pulls)||0;
  if(banded) return (p>=3 && falseGrip) ? 3 : 2;
  return p>=2 ? 1 : 0;
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
