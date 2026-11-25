# The advent calendar's picture (25 Nov 2026): Leadenhall Market at
# Christmas with a crowd in handstands and Elliott's one arm in front.
# Run: python3 tools/advent/scene.py  (writes tools/advent/scene.svg and
# prints the base64 to paste into CH_SCENE in lha-app.html)
import random, base64, re, math, os, sys
HERE=os.path.dirname(os.path.abspath(__file__))
random.seed(11)
W,H=400,600
# the arcade: front frame and the far opening; depth t in 0..1
F=dict(l=0,r=400,spring=170,crown=-40,floor=600)
B=dict(l=168,r=232,spring=232,crown=205,floor=352)
lerp=lambda a,b,t:a+(b-a)*t
def fr(t): return {k:lerp(F[k],B[k],t) for k in F}
out=[]
add=out.append
add('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">')
add('''<style>
.snow1{animation:fall 14s linear infinite}.snow2{animation:fall2 24s linear infinite}
.lt{animation:tw 1.8s ease-in-out infinite}.lt2{animation:tw 2.6s ease-in-out .7s infinite}.lt3{animation:tw 2.2s ease-in-out 1.3s infinite}
.glow{animation:gl 3s ease-in-out infinite}
.fig{transform-box:view-box;transform-origin:210px 486px;animation:sway 3.6s ease-in-out infinite}
@keyframes fall{from{transform:translateY(0)}to{transform:translateY(600px)}}
@keyframes fall2{from{transform:translate(0,0)}to{transform:translate(-14px,600px)}}
@keyframes tw{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes gl{0%,100%{opacity:.55}50%{opacity:.85}}
@keyframes sway{0%,100%{transform:rotate(-1.3deg)}50%{transform:rotate(1.3deg)}}
@media (prefers-reduced-motion:reduce){.snow1,.snow2,.lt,.lt2,.lt3,.glow,.fig{animation:none}}
</style>''')
add('''<defs>
<linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d2633"/><stop offset="1" stop-color="#1f4d5c"/></linearGradient>
<linearGradient id="end" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c97a"/><stop offset="1" stop-color="#e59a4a"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8c4cc"/><stop offset=".45" stop-color="#e3eaee"/><stop offset="1" stop-color="#f7fafb"/></linearGradient>
<linearGradient id="faceL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f3e3c1"/><stop offset="1" stop-color="#d9c294"/></linearGradient>
<linearGradient id="faceR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#f3e3c1"/><stop offset="1" stop-color="#d9c294"/></linearGradient>
<radialGradient id="warm" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd58a" stop-opacity=".9"/><stop offset="1" stop-color="#ffd58a" stop-opacity="0"/></radialGradient>
<clipPath id="floorclip"><path d="M0 600 L168 352 L232 352 L400 600 Z"/></clipPath>
</defs>''')
# the roof: night through the glass
add('<rect width="400" height="600" fill="url(#glass)"/>')
for i in range(22):
    add(f'<circle class="{"lt" if i%2 else "lt2"}" cx="{random.uniform(20,380):.0f}" cy="{random.uniform(5,150):.0f}" r="{random.uniform(.7,1.4):.1f}" fill="#fff"/>')
# far end: warm light, and the big tree
add('<rect x="168" y="205" width="64" height="147" fill="url(#end)"/>')
add('<circle class="glow" cx="200" cy="290" r="70" fill="url(#warm)"/>')
tree='''<g>
<path d="M200 214 L224 262 L176 262 Z" fill="#2a6249"/><path d="M200 236 L230 292 L170 292 Z" fill="#245641"/><path d="M200 262 L236 330 L164 330 Z" fill="#1f4d3a"/>
<rect x="195" y="330" width="10" height="14" fill="#5a3b26"/>
<path d="M200 205 l2.6 5.4 5.9.7 -4.4 4 1.1 5.9 -5.2 -2.9 -5.2 2.9 1.1 -5.9 -4.4 -4 5.9 -.7 Z" fill="#ffd36b"/>'''
lights=[(190,252),(206,248),(184,280),(198,276),(214,282),(178,310),(194,306),(210,312),(224,318),(188,324),(204,322)]
cols=['#ffd36b','#c2473a','#fff4d6','#7fd0e0']
for j,(x,y) in enumerate(lights): tree+=f'<circle class="{["lt","lt2","lt3"][j%3]}" cx="{x}" cy="{y}" r="2.2" fill="{cols[j%4]}"/>'
tree+='</g>'
add(tree)
# facades
add('<path d="M0 170 L168 232 L168 352 L0 600 Z" fill="url(#faceL)"/>')
add('<path d="M400 170 L232 232 L232 352 L400 600 Z" fill="url(#faceR)"/>')
# shop fronts: deep green with warm windows, lower part of each side
def side(sign):
    # sign -1 left, +1 right; returns x at depth t on that wall
    return (lambda t: lerp(0,168,t)) if sign<0 else (lambda t: lerp(400,232,t))
for sign in (-1,1):
    X=side(sign)
    top=lambda t: lerp(170,232,t); flr=lambda t: lerp(600,352,t)
    shop=lambda t: lerp(415,300,t)  # top of the shop fronts
    band=lambda t: lerp(300,268,t)  # first floor band
    xs=[X(0),X(1)]
    # cornice and bands, maroon with gold
    add(f'<path d="M{X(0):.1f} {top(0):.1f} L{X(1):.1f} {top(1):.1f} L{X(1):.1f} {top(1)+4:.1f} L{X(0):.1f} {top(0)+16:.1f} Z" fill="#7d2433"/>')
    add(f'<path d="M{X(0):.1f} {top(0)+16:.1f} L{X(1):.1f} {top(1)+4:.1f}" stroke="#d4a64a" stroke-width="2"/>')
    add(f'<path d="M{X(0):.1f} {band(0):.1f} L{X(1):.1f} {band(1):.1f} L{X(1):.1f} {band(1)+3:.1f} L{X(0):.1f} {band(0)+12:.1f} Z" fill="#7d2433"/>')
    add(f'<path d="M{X(0):.1f} {shop(0):.1f} L{X(1):.1f} {shop(1):.1f} L{X(1):.1f} {flr(1):.1f} L{X(0):.1f} {flr(0):.1f} Z" fill="#1f4d3f"/>')
    add(f'<path d="M{X(0):.1f} {shop(0):.1f} L{X(1):.1f} {shop(1):.1f}" stroke="#d4a64a" stroke-width="3"/>')
    ts=[0.0,0.18,0.34,0.48,0.6,0.7,0.79,0.86,0.92,0.97]
    for a,b in zip(ts,ts[1:]):
        xa,xb=X(a),X(b)
        # lit shop window between pilasters
        pad=(xb-xa)*0.16
        x1,x2=xa+pad,xb-pad
        def yat(f,x):
            t=(x-X(0))/(X(1)-X(0)); return f(t)
        y1a=yat(shop,x1)+ (yat(flr,x1)-yat(shop,x1))*0.12; y1b=yat(shop,x1)+(yat(flr,x1)-yat(shop,x1))*0.62
        y2a=yat(shop,x2)+ (yat(flr,x2)-yat(shop,x2))*0.12; y2b=yat(shop,x2)+(yat(flr,x2)-yat(shop,x2))*0.62
        add(f'<path d="M{x1:.1f} {y1a:.1f} L{x2:.1f} {y2a:.1f} L{x2:.1f} {y2b:.1f} L{x1:.1f} {y1b:.1f} Z" fill="#f6c97a" opacity=".92"/>')
        # upper floor arched window
        u1a=yat(band,x1)+ (yat(shop,x1)-yat(band,x1))*0.22; u1b=yat(band,x1)+(yat(shop,x1)-yat(band,x1))*0.82
        u2a=yat(band,x2)+ (yat(shop,x2)-yat(band,x2))*0.22; u2b=yat(band,x2)+(yat(shop,x2)-yat(band,x2))*0.82
        add(f'<path d="M{x1:.1f} {u1b:.1f} L{x1:.1f} {u1a+3:.1f} Q{(x1+x2)/2:.1f} {min(u1a,u2a)-4:.1f} {x2:.1f} {u2a+3:.1f} L{x2:.1f} {u2b:.1f} Z" fill="#33505a" stroke="#7d2433" stroke-width="{max(.6,1.6*(1-a)):.1f}"/>')
        # top floor window, small
        w1a=yat(top,x1)+30*(1-a)+4; w1b=yat(band,x1)-6*(1-a)-2
        w2a=yat(top,x2)+30*(1-b)+4; w2b=yat(band,x2)-6*(1-b)-2
        if w1b>w1a+4: add(f'<path d="M{x1:.1f} {w1a:.1f} L{x2:.1f} {w2a:.1f} L{x2:.1f} {w2b:.1f} L{x1:.1f} {w1b:.1f} Z" fill="#f0c77e" opacity=".75"/>')
    # pilasters
    for t in ts[1:-1]:
        x=X(t); w=max(1.2,7*(1-t))
        add(f'<rect x="{x-w/2:.1f}" y="{top(t)+10*(1-t):.1f}" width="{w:.1f}" height="{flr(t)-top(t)-10*(1-t):.1f}" fill="#7d2433"/>')
        add(f'<rect x="{x-w/2:.1f}" y="{shop(t)-2:.1f}" width="{w:.1f}" height="{max(1,3*(1-t)):.1f}" fill="#d4a64a"/>')
        # a wreath on each near pilaster
        if t<0.62:
            r=10*(1-t)+2; cy=lerp(shop(t),band(t),0.45)
            add(f'<circle cx="{x:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="none" stroke="#2e6b52" stroke-width="{r*0.55:.1f}"/>')
            add(f'<circle cx="{x:.1f}" cy="{cy+r*0.9:.1f}" r="{r*0.32:.1f}" fill="#c2473a"/>')
            for k in range(5):
                ang=k*2*math.pi/5-0.4
                add(f'<circle class="{["lt","lt2","lt3"][k%3]}" cx="{x+r*math.cos(ang):.1f}" cy="{cy+r*math.sin(ang):.1f}" r="{max(.6,r*0.14):.1f}" fill="{cols[k%4]}"/>')
# the glass vault: arches receding, gold on maroon, and ribs to the far end
for t in [0.0,0.14,0.29,0.43,0.56,0.67,0.77,0.86,0.94,1.0]:
    f=fr(t); w=(f['r']-f['l'])/2; ry=f['spring']-f['crown']
    sw=max(.8,5.5*(1-t))
    add(f'<path d="M{f["l"]:.1f} {f["spring"]:.1f} A{w:.1f} {ry:.1f} 0 0 1 {f["r"]:.1f} {f["spring"]:.1f}" fill="none" stroke="#7d2433" stroke-width="{sw:.1f}"/>')
    add(f'<path d="M{f["l"]:.1f} {f["spring"]:.1f} A{w:.1f} {ry:.1f} 0 0 1 {f["r"]:.1f} {f["spring"]:.1f}" fill="none" stroke="#d4a64a" stroke-width="{sw*0.35:.1f}"/>')
for a in [0.18,0.35,0.5,0.65,0.82]:
    ang=math.pi*(1-a)
    pts=[]
    for t in [0.0,1.0]:
        f=fr(t); w=(f['r']-f['l'])/2; ry=f['spring']-f['crown']; cx=(f['l']+f['r'])/2
        pts.append((cx+w*math.cos(ang), f['spring']-ry*math.sin(ang)))
    add(f'<path d="M{pts[0][0]:.1f} {pts[0][1]:.1f} L{pts[1][0]:.1f} {pts[1][1]:.1f}" stroke="#7d2433" stroke-width="1.6" opacity=".8"/>')
# garlands across the arcade, with lights
for gi,t in enumerate([0.12,0.38,0.62]):
    f=fr(t); xl=lerp(0,168,t); xr=lerp(400,232,t); y=lerp(F['spring']+28,B['spring']+6,t); sag=60*(1-t)+8
    add(f'<path d="M{xl:.1f} {y:.1f} Q200 {y+sag*2:.1f} {xr:.1f} {y:.1f}" fill="none" stroke="#2e6b52" stroke-width="{max(1.5,7*(1-t)):.1f}" stroke-linecap="round"/>')
    n=int(14*(1-t))+6
    for k in range(1,n):
        u=k/n; px=(1-u)**2*xl+2*u*(1-u)*200+u**2*xr; py=(1-u)**2*y+2*u*(1-u)*(y+sag*2)+u**2*y
        add(f'<circle class="{["lt","lt2","lt3"][(k+gi)%3]}" cx="{px:.1f}" cy="{py+1:.1f}" r="{max(.8,3*(1-t)):.1f}" fill="{cols[(k+gi)%4]}"/>')
# hanging lanterns down the middle
for t in [0.08,0.3,0.52,0.72]:
    f=fr(t); cy=f['crown']+ (f['spring']-f['crown'])*0.55+40*(1-t); s=1.6*(1-t)+0.5
    top=max(0,f['crown']+6)
    add(f'<path d="M200 {top:.1f} L200 {cy-8*s:.1f}" stroke="#3a2a1a" stroke-width="{max(.6,1.2*s):.1f}"/>')
    add(f'<circle class="glow" cx="200" cy="{cy:.1f}" r="{20*s:.1f}" fill="url(#warm)"/>')
    add(f'<path d="M{200-5*s:.1f} {cy-6*s:.1f} L{200+5*s:.1f} {cy-6*s:.1f} L{200+7*s:.1f} {cy+5*s:.1f} L{200-7*s:.1f} {cy+5*s:.1f} Z" fill="#ffd36b" stroke="#3a2a1a" stroke-width="{max(.5,s):.1f}"/>')
    add(f'<path d="M{200-6*s:.1f} {cy-6*s:.1f} L200 {cy-11*s:.1f} L{200+6*s:.1f} {cy-6*s:.1f} Z" fill="#3a2a1a"/>')
# the floor: snow over cobbles
add('<path d="M0 600 L168 352 L232 352 L400 600 Z" fill="url(#floor)"/>')
g='<g clip-path="url(#floorclip)" stroke="#a9b6bf" stroke-width="1" fill="none" opacity=".7">'
for k in range(1,14):
    y=352+(600-352)*(k/14)**1.6
    g+=f'<path d="M0 {y:.1f} L400 {y:.1f}"/>'
for x in range(-400,801,40):
    g+=f'<path d="M{x} 600 L200 300"/>'
g+='</g>'
add(g)
add('<path d="M0 600 L168 352 L176 352 L40 600 Z" fill="#fff" opacity=".8"/><path d="M400 600 L232 352 L224 352 L360 600 Z" fill="#fff" opacity=".8"/>')
# ── people in handstands down the arcade (Elliott, 25 Nov: "have more
#    people doing handstands in the background") ──
def person(x, gy, h, shape, top, legs, hat):
    k=h/100.0
    P=lambda px,py:(x+px*k, gy+py*k)
    sw=lambda v: max(.6, v*k)
    o=['<g>', f'<ellipse cx="{x:.1f}" cy="{gy+1.5*k:.1f}" rx="{14*k:.1f}" ry="{3*k:.1f}" fill="#a9b6bf" opacity=".55"/>']
    def line(pts, col, w):
        d='M'+' L'.join(f'{a:.1f} {b:.1f}' for a,b in pts)
        o.append(f'<path d="{d}" stroke="{col}" stroke-width="{sw(w):.1f}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
    line([P(-6,0),P(-6,-30)],'#e9b996',6); line([P(6,0),P(6,-30)],'#e9b996',6)
    line([P(0,-32),P(0,-60)],top,15)
    if shape=='straight': line([P(-3,-62),P(-3,-100)],legs,7); line([P(3,-62),P(3,-100)],legs,7)
    elif shape=='straddle': line([P(-3,-62),P(-24,-92)],legs,7); line([P(3,-62),P(24,-92)],legs,7)
    elif shape=='tuck': line([P(-3,-62),P(-10,-80),P(4,-88)],legs,7); line([P(3,-62),P(-4,-80),P(10,-88)],legs,7)
    elif shape=='split': line([P(-3,-62),P(-26,-96)],legs,7); line([P(3,-62),P(20,-52)],legs,7)
    o.append(f'<circle cx="{x:.1f}" cy="{gy-17*k:.1f}" r="{6.5*k:.1f}" fill="#e9b996"/>')
    if hat:
        o.append(f'<path d="M{x-6*k:.1f} {gy-12*k:.1f} L{x+6*k:.1f} {gy-12*k:.1f} L{x+5*k:.1f} {gy-2*k:.1f} Z" fill="#c2473a"/>')
        o.append(f'<rect x="{x-7*k:.1f}" y="{gy-14*k:.1f}" width="{14*k:.1f}" height="{3.5*k:.1f}" rx="{1.6*k:.1f}" fill="#fff"/>')
        o.append(f'<circle cx="{x+5*k:.1f}" cy="{gy-1.5*k:.1f}" r="{2.2*k:.1f}" fill="#fff"/>')
    o.append('</g>')
    add(''.join(o))
crowd=[(0.84,0.0,'straight','#237f95','#12333d',True),
       (0.74,-0.6,'straddle','#c2473a','#3c4a57',False),
       (0.7,0.62,'tuck','#2e6b52','#12333d',True),
       (0.56,-0.7,'straight','#f3a949','#12333d',True),
       (0.52,0.72,'straddle','#7d2433','#3c4a57',True),
       (0.36,-0.78,'split','#1d5566','#6f7f92',True),
       (0.32,0.8,'straight','#c2473a','#12333d',False)]
for t,u,shape,top,legs,hat in crowd:
    gy=lerp(600,352,t); half=lerp(200,32,t); x=200+u*half; h=lerp(150,30,t)
    person(x,gy,h,shape,top,legs,hat)
SNOWMAN='<g transform="translate(352 560) scale(.62) translate(-318 -514)">' \
 '<ellipse cx="318" cy="514" rx="50" ry="9" fill="#a9b6bf" opacity=".6"/>' \
 '<circle cx="318" cy="472" r="42" fill="#fbfdfe"/><circle cx="318" cy="410" r="31" fill="#fbfdfe"/><circle cx="318" cy="362" r="23" fill="#fbfdfe"/>' \
 '<path d="M290 386 Q318 398 346 386 L346 396 Q318 408 290 396 Z" fill="#f3a949"/><rect x="334" y="392" width="10" height="30" rx="4" fill="#f3a949" transform="rotate(-10 339 407)"/>' \
 '<circle cx="318" cy="414" r="3.2" fill="#12333d"/><circle cx="318" cy="430" r="3.2" fill="#12333d"/><circle cx="318" cy="466" r="3.4" fill="#12333d"/>' \
 '<circle cx="310" cy="356" r="2.6" fill="#12333d"/><circle cx="326" cy="356" r="2.6" fill="#12333d"/><path d="M318 362 L340 368 L318 368 Z" fill="#f08a3c"/>' \
 '<path d="M309 372 Q318 378 327 372" stroke="#12333d" stroke-width="2" fill="none" stroke-linecap="round"/>' \
 '<path d="M290 404 L258 372 M266 380 L256 384 M262 376 L262 364" stroke="#6b4a32" stroke-width="4" stroke-linecap="round" fill="none"/>' \
 '<path d="M346 404 L378 372 M370 380 L380 384 M374 376 L374 364" stroke="#6b4a32" stroke-width="4" stroke-linecap="round" fill="none"/>' \
 '<rect x="296" y="334" width="44" height="10" rx="5" fill="#fff"/><path d="M300 336 Q312 296 350 300 L340 336 Z" fill="#c2473a"/><circle cx="352" cy="302" r="7" fill="#fff"/></g>'
add(SNOWMAN)
add('<g><rect x="14" y="548" width="38" height="30" rx="3" fill="#c2473a"/><rect x="30" y="548" width="7" height="30" fill="#f3c77a"/><rect x="14" y="559" width="38" height="7" fill="#f3c77a"/>'
    '<rect x="56" y="560" width="30" height="22" rx="3" fill="#237f95"/><rect x="68" y="560" width="6" height="22" fill="#fff"/><rect x="56" y="568" width="30" height="5" fill="#fff"/></g>')
# Elliott in front: the Leadenhall one arm, bigger, swaying a touch on the hand
sc=open(os.path.join(HERE,'figure.svg')).read()
a=sc.index('<g class="fig"'); b=sc.index('</g>',a)+4
add('<ellipse cx="200" cy="572" rx="40" ry="7" fill="#a9b6bf" opacity=".6"/>')
add('<g transform="translate(200 570) scale(1.28) translate(-210 -478)">'+sc[a:b]+'</g>')
def flakes(n, rmin, rmax):
    return ''.join(f'<circle cx="{random.uniform(4,396):.0f}" cy="{random.uniform(0,600):.0f}" r="{random.uniform(rmin,rmax):.1f}"/>' for _ in range(n))
f1=flakes(28,1.6,2.8); f2=flakes(36,0.9,1.6)
add(f'<g fill="#fff" opacity=".9"><g class="snow1">{f1}<g transform="translate(0 -600)">{f1}</g></g></g>')
add(f'<g fill="#fff" opacity=".6"><g class="snow2">{f2}<g transform="translate(0 -600)">{f2}</g></g></g>')
add('</svg>')
svg='\n'.join(out)
open(os.path.join(HERE,'scene.svg'),'w').write(svg)
sys.stdout.write(base64.b64encode(svg.encode()).decode())
