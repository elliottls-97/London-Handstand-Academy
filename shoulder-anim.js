/* The shoulder check's animations (10 Nov 2026). Elliott: "animations should work for the quiz and be used for it",
   on "the background of the app as that is where they will live". Drawn live, so each check shows the movement and
   then, once an answer is picked, what that answer looks like. The same drawings as the shoulder film's
   (~/lha-reels/anim): a back seen from behind in 2D for the shoulder blades, a 3D figure for the ranges (three.js,
   fetched only when one of those checks opens).

   ShAnim.mount(canvas, scene, getAnswer) starts drawing and returns a stop function. getAnswer() returns the picked
   option's index, or undefined; a new answer starts the movement again so it plays out. */
(function(){
  const VW=1200, VH=800, D=Math.PI/180;
  let X=null;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)), lerp=(a,b,k)=>a+(b-a)*k;
  const ease=k=>{ k=clamp(k); return k<.5 ? 4*k*k*k : 1-Math.pow(-2*k+2,3)/2; };
  /* one movement in a loop of P seconds: rest, go, hold, come back */
  const cyc=(t,P=5.6,go=1.6,hold=1.6)=>{ const p=t%P; return clamp(ease((p-.5)/go) - ease((p-.5-go-hold)/(go*.9))); };
  const C={teal:'#006663', deep:'#00403d', amber:'#f3a949', red:'#a4503c', line:'rgba(0,64,61,.16)'};

  /* ── 2D: the back from behind (the film's rig) ───────────────── */
  const P0=[115,-140];
  const BLADE=[[62,-212],[95,-216],[150,-206],[176,-198],[186,-183],[178,-166],[152,-122],[120,-56],[97,-12],[86,-14],[72,-62],[62,-130],[60,-165]];
  const SPINE_S=[[58,-166],[110,-184],[160,-200],[178,-206]];
  const ACROM=[[168,-206],[188,-221],[214,-226],[230,-216],[226,-203],[200,-201],[180,-198]];
  const HEAD=[204,-183];
  function rot(p,deg,c=[0,0]){ const r=deg*D, s=Math.sin(r), co=Math.cos(r), x=p[0]-c[0], y=p[1]-c[1]; return [c[0]+x*co-y*s, c[1]+x*s+y*co]; }
  function pose2(o){ return Object.assign({elev:0,prot:0,rot:0,tilt:0,arm:6,hi:{}},o||{}); }
  function S(p,ps){ let x=p[0], y=p[1];
    if(ps.tilt && y>-150){ y=-150+(y+150)*(1-.12*ps.tilt); x=x+(y+150)*.06*ps.tilt; }
    const r=rot([x,y],-ps.rot,P0); return [r[0]+ps.prot, r[1]-ps.elev]; }
  function Hp(p,ps){ const h=S(HEAD,ps), r=rot(p,-ps.arm); return [h[0]+r[0], h[1]+r[1]]; }
  function smooth(pts,close=true){
    X.beginPath(); const n=pts.length, mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
    if(close){ const m0=mid(pts[n-1],pts[0]); X.moveTo(m0[0],m0[1]);
      for(let i=0;i<n;i++){ const p=pts[i], m=mid(p,pts[(i+1)%n]); X.quadraticCurveTo(p[0],p[1],m[0],m[1]); } X.closePath(); }
    else { X.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<n-1;i++){ const m=mid(pts[i],pts[i+1]); X.quadraticCurveTo(pts[i][0],pts[i][1],m[0],m[1]); }
      X.lineTo(pts[n-1][0],pts[n-1][1]); } }
  const LATS=ps=>[[10,-60],[10,250],[90,292],[200,240],[236,90],[236,-20],Hp([-6,78],ps),Hp([-18,58],ps),[200,-50],S([112,-26],ps),[60,-44]];
  function ribs(){ X.save(); X.strokeStyle='rgba(0,64,61,.13)'; X.lineWidth=7; X.lineCap='round';
    for(let i=0;i<10;i++){ const y=-235+i*45, w=150+70*Math.sin(Math.min(1,(i+1)/7)*Math.PI/2)-(i>7?(i-7)*25:0);
      X.beginPath(); X.moveTo(14,y); X.quadraticCurveTo(w*.95,y-22,w,y+40); X.stroke(); } X.restore(); }
  function spine(){ for(let i=0;i<20;i++){ const y=-400+i*33;
    X.fillStyle='rgba(0,64,61,.13)'; X.beginPath(); X.roundRect(-14,y,28,24,7); X.fill();
    X.fillStyle='rgba(0,64,61,.07)'; X.beginPath(); X.roundRect(-34,y+6,68,10,5); X.fill(); } }
  function body(ps){ X.save(); X.fillStyle='rgba(0,64,61,.045)'; X.strokeStyle='rgba(0,64,61,.16)'; X.lineWidth=2.5;
    const h=S(HEAD,ps), sh=[h[0]+14,h[1]-34];
    X.beginPath(); X.moveTo(0,-330); X.lineTo(52,-330); X.quadraticCurveTo(70,-262,150,-250); X.quadraticCurveTo(sh[0],sh[1],h[0]+40,h[1]+6);
    X.lineTo(230,60); X.quadraticCurveTo(200,190,215,300); X.lineTo(0,300); X.closePath(); X.fill(); X.stroke();
    X.save(); X.translate(h[0],h[1]); X.rotate(-ps.arm*D); X.beginPath(); X.roundRect(-40,-30,80,560,40); X.fill(); X.stroke(); X.restore();
    X.restore(); }
  function headShape(){ X.save(); X.fillStyle='rgba(0,64,61,.045)'; X.strokeStyle='rgba(0,64,61,.16)'; X.lineWidth=2.5;
    X.beginPath(); X.ellipse(0,-430,78,96,0,0,7); X.fill(); X.stroke(); X.restore(); }
  function clavicle(ps){ const ac=S([214,-218],ps); X.save(); X.strokeStyle='#e4d8c2'; X.lineWidth=17; X.lineCap='round';
    X.beginPath(); X.moveTo(26,-262); X.bezierCurveTo(90,-250,140,-262,ac[0],ac[1]); X.stroke(); X.restore(); }
  function scapula(ps){
    const pts=BLADE.map(p=>S(p,ps));
    if(ps.tilt>0.01){ X.save(); X.globalAlpha=.4*ps.tilt; X.fillStyle='#00403d'; X.filter='blur(10px)';
      smooth(pts.map(p=>[p[0]+16*ps.tilt*(p[1]>-120?1:0), p[1]+20*ps.tilt*(p[1]>-120?1:0)])); X.fill(); X.restore(); }
    X.save(); X.shadowColor='rgba(0,64,61,.18)'; X.shadowBlur=16; X.shadowOffsetY=5; smooth(pts); X.fillStyle='#efe6d6'; X.fill(); X.restore();
    const g=X.createLinearGradient(pts[0][0],pts[0][1],pts[8][0],pts[8][1]); g.addColorStop(0,'#f6efe2'); g.addColorStop(1,'#d9ccb4');
    smooth(pts); X.fillStyle=g; X.fill(); X.strokeStyle='#9c8b6c'; X.lineWidth=2.5; X.stroke();
    X.strokeStyle='#cbbb9d'; X.lineWidth=9; X.lineCap='round'; smooth(SPINE_S.map(p=>S(p,ps)),false); X.stroke();
    smooth(ACROM.map(p=>S(p,ps))); X.fillStyle='#efe6d6'; X.fill(); X.strokeStyle='#9c8b6c'; X.lineWidth=2.5; X.stroke();
    if(ps.warn>0.01){ const ia=S([96,-12],ps); X.save(); X.globalAlpha=ps.warn; const gg=X.createRadialGradient(ia[0],ia[1],2,ia[0],ia[1],60);
      gg.addColorStop(0,'rgba(164,80,60,.55)'); gg.addColorStop(1,'rgba(164,80,60,0)'); X.fillStyle=gg; X.beginPath(); X.arc(ia[0],ia[1],60,0,7); X.fill(); X.restore(); }
  }
  function humerus(ps){ const h=S(HEAD,ps);
    X.save(); X.translate(h[0],h[1]); X.rotate(-ps.arm*D); X.fillStyle='#ece2d0'; X.strokeStyle='#9c8b6c'; X.lineWidth=2.5;
    X.beginPath(); X.moveTo(-14,14); X.bezierCurveTo(-12,120,-10,230,-26,300); X.quadraticCurveTo(0,322,28,300); X.bezierCurveTo(12,230,14,120,18,14); X.closePath(); X.fill(); X.stroke();
    X.beginPath(); X.arc(0,0,25,0,7); X.fillStyle='#f3ebdc'; X.fill(); X.stroke(); X.restore(); }
  function back(cx,cy,sc,ps){
    X.save(); X.translate(cx,cy); X.scale(sc,sc); headShape();
    for(const sg of [-1,1]){ X.save(); X.scale(sg,1); body(ps); X.restore(); }
    ribs(); spine();
    for(const sg of [-1,1]){ X.save(); X.scale(sg,1);
      clavicle(ps); scapula(ps); humerus(ps);
      if(ps.hi.lats){ X.save(); X.globalAlpha=.75*ps.hi.lats; smooth(LATS(ps)); X.fillStyle='#4f9f95'; X.fill(); X.restore(); }
      X.restore(); }
    X.restore();
  }
  /* an arrow in the app's amber, on a point of the right blade and its mirror */
  function arrow(x1,y1,x2,y2,a,col=C.amber,w=9){
    if(a<=0.01) return; const an=Math.atan2(y2-y1,x2-x1);
    X.save(); X.globalAlpha=a; X.strokeStyle=col; X.fillStyle=col; X.lineWidth=w; X.lineCap='round';
    X.beginPath(); X.moveTo(x1,y1); X.lineTo(x2-Math.cos(an)*w*1.6,y2-Math.sin(an)*w*1.6); X.stroke();
    X.beginPath(); X.moveTo(x2,y2); X.lineTo(x2-Math.cos(an-.5)*w*3.2,y2-Math.sin(an-.5)*w*3.2); X.lineTo(x2-Math.cos(an+.5)*w*3.2,y2-Math.sin(an+.5)*w*3.2); X.closePath(); X.fill();
    X.restore(); }
  const B={cx:600, cy:655, sc:.7};        // the back, framed in the card with the arms going overhead
  const atB=(p,sd=1)=>[B.cx+sd*p[0]*B.sc, B.cy+p[1]*B.sc];

  /* ── 3D: the figure (three.js, fetched once) ─────────────────── */
  let R=null, threeP=null;
  function load3d(){
    if(window.THREE) return Promise.resolve();
    if(threeP) return threeP;
    threeP=new Promise((ok, no)=>{ const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js'; s.onload=ok; s.onerror=no; document.head.appendChild(s); });
    return threeP;
  }
  function init3(){
    if(R) return R;
    const T=window.THREE; if(T.ColorManagement) T.ColorManagement.legacyMode=false;
    const mat=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:c, roughness:.72, metalness:0}, o||{}));
    const cap=(r,l,m)=>{ const me=new T.Mesh(new T.CapsuleGeometry(r,l,8,20),m); me.castShadow=true; return me; };
    const ball=(r,m,sx=1,sy=1,sz=1)=>{ const me=new T.Mesh(new T.SphereGeometry(r,32,22),m); me.scale.set(sx,sy,sz); me.castShadow=true; return me; };
    const box=(w,h,d,m)=>{ const me=new T.Mesh(new T.BoxGeometry(w,h,d),m); me.castShadow=true; return me; };
    const M={body:mat(0xc3d7d3), arm:mat(0xc3d7d3), hi:mat(0xf3a949,{roughness:.5}), mark:mat(0x006663,{roughness:.4})};
    const put=(par,me,x,y,z)=>{ me.position.set(x,y,z); par.add(me); return me; };
    const root=new T.Group(), bd=new T.Group(); root.add(bd);
    put(bd,ball(.16,M.body,1.12,.62,.78),0,.98,0);
    const ab=put(bd,cap(.13,.16,M.body),0,1.14,0); ab.scale.set(1.08,1,.78);
    put(bd,ball(.2,M.body,1.08,1.12,.66),0,1.33,0);
    const sl=put(bd,cap(.06,.34,M.body),0,1.455,-.01); sl.rotation.z=Math.PI/2;
    put(bd,cap(.048,.07,M.body),0,1.56,0); put(bd,ball(.105,M.body,.92,1.12,1),0,1.71,0); put(bd,ball(.02,M.body),0,1.70,.1);
    const arm=side=>{ const sh=new T.Group(); sh.position.set(.205*side,1.455,0); const ua=new T.Group(); sh.add(ua);
      const up=put(ua,cap(.052,.21,M.arm),0,-.15,0); ua.add(ball(.058,M.arm)); put(ua,box(.018,.17,.012,M.mark),0,-.15,.052);
      const el=put(ua,new T.Group(),0,-.30,0); el.add(ball(.046,M.arm)); const fo=put(el,cap(.042,.19,M.arm),0,-.13,0);
      const hand=put(el,box(.085,.15,.032,M.arm),0,-.32,0); const tip=put(el,new T.Group(),0,-.40,0);
      bd.add(sh); return {sh,ua,el,side,tip,parts:[up,fo,hand]}; };
    const leg=side=>{ const hip=new T.Group(); hip.position.set(.095*side,.95,0); put(hip,cap(.072,.32,M.body),0,-.22,0);
      const kn=put(hip,new T.Group(),0,-.45,0); put(kn,cap(.058,.33,M.body),0,-.22,0); put(kn,box(.09,.05,.22,M.body),0,-.47,.06);
      const toe=put(kn,new T.Group(),0,-.5,.06); bd.add(hip); return {hip,kn,toe}; };
    const A={R:arm(1),L:arm(-1)}, Lg={R:leg(1),L:leg(-1)};
    const sc=new T.Scene(); sc.add(root);
    sc.add(new T.HemisphereLight(0xffffff,0x8fb2ad,.5));
    const key=new T.DirectionalLight(0xfff6ec,1.05); key.position.set(2.2,4.2,3); key.castShadow=true; key.shadow.mapSize.set(1024,1024);
    Object.assign(key.shadow.camera,{left:-2.5,right:2.5,top:2.5,bottom:-2.5,near:.5,far:12}); key.shadow.bias=-.0006; sc.add(key);
    const rim=new T.DirectionalLight(0xcfe6ec,.55); rim.position.set(-3,2.4,-3.2); sc.add(rim);
    const fl=new T.Mesh(new T.CircleGeometry(3.2,64), new T.ShadowMaterial({opacity:.2, color:0x00403d})); fl.rotation.x=-Math.PI/2; fl.receiveShadow=true; sc.add(fl);
    const extras=new T.Group(); sc.add(extras);
    const cv=document.createElement('canvas'); cv.width=VW; cv.height=VH;
    const r=new T.WebGLRenderer({canvas:cv, antialias:true, alpha:true, preserveDrawingBuffer:true});
    r.setPixelRatio(1); r.setSize(VW,VH,false); r.shadowMap.enabled=true; r.shadowMap.type=T.PCFSoftShadowMap; r.outputEncoding=T.sRGBEncoding; r.setClearColor(0,0);
    const cam=new T.PerspectiveCamera(30, VW/VH, .05, 60);
    R={T,r,cv,sc,cam,root,A,Lg,M,extras};
    return R;
  }
  /* {lying, dog, R:{flex,abd,rot,bend}, L:{...}, hi:'R'|'both', hipFlex, knee} */
  function pose3(p){
    const {root,A,Lg,M}=init3();
    if(p.dog){ root.rotation.set(134*D,0,0); } else root.rotation.set(p.lying ? -Math.PI/2 : 0, 0, 0);
    root.position.set(0, p.lying ? .13 : 0, p.lying ? 1.455 : 0);
    for(const k of ['R','L']){ const a=A[k], q=Object.assign({flex:0,abd:0,rot:0,bend:0}, p[k]||{});
      a.sh.rotation.set(0,0,0); a.sh.rotation.order='ZXY'; a.sh.rotation.x=-q.flex*D; a.sh.rotation.z=q.abd*D*a.side;
      a.ua.rotation.set(0,q.rot*D*a.side,0); a.el.rotation.set(-q.bend*D,0,0);
      const m=(p.hi===k || p.hi==='both') ? M.hi : M.arm; a.parts.forEach(x=>x.material=m); }
    for(const k of ['R','L']){ Lg[k].hip.rotation.set(-(p.hipFlex||0)*D,0,0); Lg[k].kn.rotation.set((p.knee||0)*D,0,0); }
    root.updateMatrixWorld(true);
    if(p.dog){ // hands and feet on the floor: lift or drop the body so the lower of them touches it
      const y=o=>{ const v=new R.T.Vector3(); o.getWorldPosition(v); return v.y; };
      const lo=Math.min(y(A.R.tip), y(Lg.R.toe)); root.position.y-=lo-.02; root.position.z=-.25; root.updateMatrixWorld(true); }
  }
  const wp=o=>{ const v=new R.T.Vector3(); o.getWorldPosition(v); return v; };
  function band(c,u,v,r0,r1,a0,a1,color,op){
    const T=R.T, n=40, pos=[], idx=[];
    for(let i=0;i<=n;i++){ const a=(a0+(a1-a0)*i/n)*D, cs=Math.cos(a), sn=Math.sin(a);
      for(const r of [r0,r1]) pos.push(c.x+(u.x*cs+v.x*sn)*r, c.y+(u.y*cs+v.y*sn)*r, c.z+(u.z*cs+v.z*sn)*r); }
    for(let i=0;i<n;i++){ const k=i*2; idx.push(k,k+1,k+2,k+1,k+3,k+2); }
    const g=new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos,3)); g.setIndex(idx);
    R.extras.add(new T.Mesh(g, new T.MeshBasicMaterial({color, transparent:true, opacity:op, side:T.DoubleSide, depthWrite:false})));
  }
  function clear3(){ const e=R.extras; while(e.children.length){ const c=e.children.pop(); c.geometry.dispose(); c.material.dispose(); } }
  const V3=(x,y,z)=>new R.T.Vector3(x,y,z);
  function look(pos,tgt){ R.cam.position.set(...pos); R.cam.lookAt(...tgt); R.cam.updateMatrixWorld(true); }
  function paint3(){ R.r.render(R.sc,R.cam); X.drawImage(R.cv,0,0,VW,VH); }

  /* ── the scenes ──────────────────────────────────────────────── */
  const SC={
    /* the intro and an all clear: both arms up and down, the blades turning with them */
    intro:{draw(t){ const u=cyc(t,6,2,1.4), arm=lerp(8,176,u), bl=arm<=30?0:(arm-30)*60/150;
      back(B.cx,B.cy,B.sc,pose2({arm, rot:bl, elev:bl*.25})); }},
    /* arms overhead, lying with the knees bent: short of the floor, the floor, or easily past it */
    reach:{d3:true, draw(t,a){
      const tgt=a===0?148:a===2?180:180, u=cyc(t,6,2,1.8), fl=lerp(0,tgt,u);
      pose3({lying:true, hipFlex:52, knee:104, R:{flex:fl}, L:{flex:fl}, hi:'both'});
      clear3(); const sh=wp(R.A.R.sh), c=V3(sh.x+.09,sh.y,sh.z), u3=V3(0,0,1), v3=V3(0,1,0);
      band(c,u3,v3,.70,.74,0,fl,0x006663,.3);
      band(c,u3,v3,.62,.80,160,180,0x006663,.22*u);
      if(a===0) band(c,u3,v3,.62,.80,148,180,0xa4503c,.35*u);
      if(a===2) band(c,u3,v3,.62,.80,180,200,0xf3a949,.45*u);
      look([2.55,1.25,.95],[0,.18,.15]); paint3(); }},
    /* turning out: lying, the upper arm out at 90 degrees, the elbow bent to 90, the forearm falling back */
    turn:{d3:true, draw(t,a){
      const tgt=a===1?42:90, u=cyc(t,5.6,1.8,1.6), r=lerp(0,tgt,u);
      pose3({lying:true, R:{abd:90, bend:90, rot:r}, L:{abd:12}, hi:'R'});
      clear3(); const sh=wp(R.A.R.sh), el=wp(R.A.R.el), up=V3(0,1,0), head=V3(0,0,-1);
      band(V3(sh.x,.012,sh.z),V3(1,0,0),V3(0,0,1),.17,.21,0,90,0x00403d,.45);
      band(el,up,head,0,.42,-.5,.5,0x00403d,.45);
      band(el,up,head,0,.40,0,r,0x006663,.2);
      band(el,up,head,.40,.47,80,90,0x006663,.7);
      if(a===1) band(el,up,head,.40,.47,tgt,80,0xa4503c,.5*u);
      look([1.25,2.45,2.25],[.12,.08,.0]); paint3(); }},
    /* the shoulder blades from behind: up, then slowly down; a blade that lifts off the ribs on the way down */
    blades:{draw(t,a){ const P=6.4, p=t%P, up=ease((p-.4)/1.8), dn=clamp((p-3)/2.8), u=up*(1-ease(dn));
      const arm=lerp(8,170,u), bl=arm<=30?0:(arm-30)*60/150, wing=a===1 ? Math.sin(clamp(dn)*Math.PI)*1 : 0;
      back(B.cx,B.cy,B.sc,pose2({arm, rot:bl, elev:bl*.25, tilt:wing, warn:wing}));
      if(a===1 && wing>.2) for(const sd of [1,-1]){ const ia=atB(S([96,-12],pose2({arm,rot:bl,elev:bl*.25,tilt:wing})),sd); arrow(ia[0]+sd*10,ia[1]+50,ia[0]+sd*44,ia[1]+8,wing,C.red,7); } }},
    /* under load, a downward dog side on: arms by the ears, shoulders sinking and elbows bending, or the chest
       sinking through */
    load:{d3:true, draw(t,a){
      const u=cyc(t,5.2,1.4,2), fl=a===1?lerp(180,150,u):a===2?lerp(180,206,u):lerp(172,180,u), bend=a===1?lerp(0,26,u):0;
      pose3({dog:true, hipFlex:105, R:{flex:fl, bend}, L:{flex:fl, bend}, hi:'both'});
      // framed on the middle of hands and feet, so the whole dog is in the card whatever the shoulders do
      clear3(); const hp=wp(R.A.R.tip), fp=wp(R.Lg.R.toe), mz=(hp.z+fp.z)/2; look([3.6,1.0,mz+.15],[0,.42,mz]); paint3(); }},
    /* the results */
    stiff:{draw(t){ const u=cyc(t,6,2,1.6), arm=lerp(8,138,u);
      back(B.cx,B.cy,B.sc,pose2({arm, rot:lerp(0,20,u), elev:lerp(0,-6,u), hi:{lats:1}})); }},
    weak:{d3:true, draw(t){ return SC.load.draw(t,1); }},
    bendy:{draw(t){ const u=cyc(t,6,2,1.6), arm=lerp(8,186,u), ps=pose2({arm, rot:lerp(0,74,u), elev:lerp(0,52,u), prot:lerp(0,30,u)});
      back(B.cx,B.cy,B.sc,ps);
      for(const sd of [1,-1]){ const c0=atB(S([112,-110],ps),sd); arrow(c0[0]-sd*8,c0[1]+30,c0[0]+sd*46,c0[1]-56,clamp(u*1.4)); } }},
    tilt:{draw(t){ const u=cyc(t,6,2,1.6), ps=pose2({arm:lerp(8,150,u), rot:lerp(0,38,u), tilt:lerp(.25,1,u), elev:lerp(0,8,u), warn:u});
      back(B.cx,B.cy,B.sc,ps); }}
  };

  function mount(cv, name, getAns){
    const sc=SC[name]; if(!cv || !sc) return ()=>{};
    let stop=false, last, t0=performance.now(), ready=!sc.d3 || !!window.THREE;
    const fit=()=>{ const r=cv.getBoundingClientRect(), dpr=Math.min(2, window.devicePixelRatio||1);
      const w=Math.max(1,Math.round(r.width*dpr)), h=Math.max(1,Math.round(r.height*dpr)); if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h; } };
    if(sc.d3 && !ready) load3d().then(()=>{ ready=true; }).catch(()=>{ name='intro'; ready=true; });
    const still=window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function frame(now){
      if(stop || !cv.isConnected) return;
      fit(); const a=getAns ? getAns() : undefined;
      if(a!==last){ last=a; t0=now; }
      const t=still ? 2.6 : (now-t0)/1000;
      X=cv.getContext('2d'); X.setTransform(cv.width/VW,0,0,cv.height/VH,0,0); X.clearRect(0,0,VW,VH);
      if(ready){ try{ (SC[name]||SC.intro).draw(t, a); }catch(e){ name='intro'; } }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return ()=>{ stop=true; };
  }
  window.ShAnim={mount, scenes:Object.keys(SC), load3d};
})();
