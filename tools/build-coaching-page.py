#!/usr/bin/env python3
"""coaching.html from the Coaching design (Claude Design canvas 'LHA conversion pages', Coaching.dc.html),
12 Nov 2026. Static page; the apply form hands over to the homepage's Apply (/#apply).
    python3 tools/build-coaching-page.py SRC.dc.html   writes coaching.html

16 Nov 2026: coaching.html has been edited by hand since (the hero line, the seven step
"How coaching works" with a client's app screens, name off and clips blurred, in
assets/coaching/app). Running this again would undo that."""
import re, sys, os
src = open(sys.argv[1]).read()
body = src[src.index('<x-dc>') + 6: src.index('</x-dc>')]
helmet = re.search(r'<helmet>(.*?)</helmet>', body, re.S).group(1)
body = re.sub(r'<helmet>.*?</helmet>', '', body, flags=re.S)
body = body.replace('{{accent}}', '#006663')
body = body.replace('href="Main.dc.html"', 'href="/form-check"')
body = body.replace('href="#apply"', 'href="/#apply"')

def section(name):
    a = body.index('<!-- ' + name); b = body.index('<!--', a + 5); return a, b

# story photos
a, b = section('STORY')
st = body[a:b]
ph = re.findall(r'<div style="background: #dfe6e5; border: 2px dashed #6f8482;.*?</div>\s*</div>', st, re.S)
assert len(ph) == 2, len(ph)
img = lambda s, alt: f'<img src="{s}" alt="{alt}" loading="lazy" style="width: 100%; aspect-ratio: 3 / 4; object-fit: cover; border-radius: 20px; display: block">'
st = st.replace(ph[0], img('/assets/site/story/2018-09-first-handstand.jpg', 'Elliott&rsquo;s first handstand against the wall, 2018'))
st = st.replace(ph[1], img('/assets/site/story/now-leadenhall.jpg', 'Elliott in a one arm handstand at Leadenhall Market'))
body = body[:a] + st + body[b:]

# results: Hannah's clips and Marina's numbers
a, b = section('RESULTS')
res = body[a:b]
cards = re.findall(r'<div style="display: flex; flex-direction: column; gap: 12px">\s*<div style="display: grid; grid-template-columns: repeat\(2.*?\[NAME\][^<]*</div>\s*</div>', res, re.S)
assert len(cards) == 3, len(cards)
vid = lambda f, label: (f'<figure style="margin: 0; display: flex; flex-direction: column; gap: 6px">'
    f'<video src="/assets/coaching/{f}.mp4" poster="/assets/coaching/{f}.jpg" muted loop playsinline autoplay preload="metadata" '
    f'style="width: 100%; aspect-ratio: 9 / 16; object-fit: cover; border-radius: 14px; background: #0b4542; display: block"></video>'
    f'<figcaption style="font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #CFE6EC">{label}</figcaption></figure>')
hannah = ('<div style="display: flex; flex-direction: column; gap: 12px">\n'
    '<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px">'
    + vid('hannah-before', '9 Sept · before') + vid('hannah-after', '21 Oct · after') + '</div>\n'
    '<div style="font-size: 15px; color: #e6efee"><b style="color: #ffffff">Hannah</b> · from kick ups that didn&rsquo;t get there to 30 second freestanding tucks · six weeks</div>\n'
    '<figure style="margin: 4px 0 0; display: flex; flex-direction: column; gap: 6px; max-width: 420px">'
    '<blockquote style="margin: 0; background: #ffffff; color: #111111; border-radius: 16px 16px 16px 4px; padding: 12px 14px; font-size: 16px; line-height: 1.45">'
    'I know I always complain it&rsquo;s hard but I really do see improvement it&rsquo;s very exciting! Check out these tucks, 2 in a row at 30+ seconds, I&rsquo;m buzzing &#129321; '
    'Maybe my knees are too high though, let me know if form needs to change!</blockquote>'
    '<figcaption style="font-size: 13px; color: #CFE6EC">Hannah, with her clips, 21 Oct</figcaption></figure>\n'
    '<figure style="margin: 4px 0 0; display: flex; flex-direction: column; gap: 6px; max-width: 240px">'
    '<img src="/assets/coaching/hannah-story.webp" alt="Hannah&rsquo;s Instagram story: a straight handstand in her living room, captioned Have been working with @elliottstaley and loving it!" loading="lazy" '
    'style="width: 100%; aspect-ratio: 692 / 1186; object-fit: cover; border-radius: 14px; display: block">'
    '<figcaption style="font-size: 13px; color: #CFE6EC">Hannah&rsquo;s Instagram story</figcaption></figure>\n'
    '</div>')
row = lambda n, v: (f'<li style="display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-top: 1px solid rgba(255,255,255,0.18)">'
    f'<span>{n}</span><b style="font-variant-numeric: tabular-nums; color: #F3A949">{v}</b></li>')
bubble = lambda text, cap: ('<figure style="margin: 4px 0 0; display: flex; flex-direction: column; gap: 6px; max-width: 420px">'
    '<blockquote style="margin: 0; background: #ffffff; color: #111111; border-radius: 16px 16px 16px 4px; padding: 12px 14px; font-size: 16px; line-height: 1.45">'
    + text + '</blockquote><figcaption style="font-size: 13px; color: #CFE6EC">' + cap + '</figcaption></figure>\n')
words = ('<figure style="margin: 0; display: flex; flex-direction: column; gap: 6px">'
    '<div style="aspect-ratio: 9 / 16; border-radius: 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); box-sizing: border-box; padding: 18px 16px; display: flex; flex-direction: column; justify-content: center; gap: 12px">'
    '<span style="font-family: \'Newsreader\', Georgia, serif; font-size: clamp(19px, 2.1vw, 24px); line-height: 1.25">&ldquo;My back is arched because it feels too scary stacking my hips right over the wrists.&rdquo;</span>'
    '<span style="font-size: 13px; color: #CFE6EC">Her first week, in the app chat</span></div>'
    '<figcaption style="font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #CFE6EC">24 Sept · before</figcaption></figure>')
marina = ('<div style="display: flex; flex-direction: column; gap: 12px">\n'
    '<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px">'
    + words + vid('marina-after', '8 Nov · after') + '</div>\n'
    '<div style="font-size: 15px; color: #e6efee"><b style="color: #ffffff">Marina</b> · from too scary to stack over her wrists to single leg tuck slides on the wall · seven weeks</div>\n'
    + bubble('Looked in the mirror during Zombies and hips are looking more stacked than when I first started them. So much so, that I fell forward over my wrists a couple times.', 'Marina, 1 Oct')
    + bubble('Yes! I felt it in the moment that my hands were slightly forward of my shoulders, but was being lazy and didn&rsquo;t alter it &#128517; good that I could feel it though!!', 'Marina, 11 Nov, after her form check')
    + '</div>')
# the template's cards are identical, so swap them in order, one at a time
for card, new in zip(cards, (hannah, marina, '')):
    res = res.replace(card, new, 1)
res = res.replace('"Elliott meets you exactly where you are."</blockquote>',
    '"Elliott meets you exactly where you are. He broke my one-arm work into clear, achievable steps and kept me accountable the whole way."</blockquote>')
res = res.replace('Aman, 1-2-1 coaching client, working on his one arm · [REST OF AMAN\'S QUOTE]', 'Aman, 1-2-1 coaching client, working on his one arm')
body = body[:a] + res + body[b:]

# apply: the form becomes the hand over to the real Apply on the homepage
a, b = section('APPLY')
ap = body[a:b]
f0 = ap.index('<form'); f1 = ap.index('</form>') + 7
ap = ap[:f0] + ('<div style="background: #ffffff; border-radius: 20px; padding: 32px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 1px 2px rgba(0,48,46,0.06), 0 12px 32px rgba(0,48,46,0.08)">'
    '<p style="margin: 0; color: #444444">Your goal, where you are now, and up to three clips if you have them. Two minutes.</p>'
    '<a href="/#apply" style="background: #006663; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 18px; min-height: 58px; border-radius: 14px; display: flex; align-items: center; justify-content: center">Apply for coaching</a>'
    '</div>') + ap[f1:]
body = body[:a] + ap + body[b:]
body = body.replace('href="#top" style="background: #f4f4f5', 'href="/handstand-class" style="background: #f4f4f5', 1)
body = body.replace('href="#top" style="background: #f4f4f5', 'href="/lha-app.html" style="background: #f4f4f5', 1)

head = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    '<title>1-2-1 Handstand Coaching · London Handstand Academy</title>\n'
    '<meta name="robots" content="noindex">\n' + helmet.strip() + '\n'
    '<style>@media (max-width:560px){header nav a:not(:last-child){display:none}header>div{flex-wrap:nowrap!important;padding:12px 16px!important;gap:12px!important}'
    'header>div>a:first-child{font-size:17px!important}header nav a:last-child{font-size:15px!important;padding:10px 14px!important;white-space:nowrap}}</style>\n'
    '</head>\n<body>\n<script src=\"/site-header.js\" data-on=\"co\" data-hide=\"body > div > header\"></script>\n')
out = head + body.strip() + '\n</body>\n</html>\n'
assert '{{' not in out
open(os.path.join(os.path.dirname(__file__), '..', 'coaching.html'), 'w').write(out)
print('ok', len(out), out.count('[') )
