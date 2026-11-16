#!/usr/bin/env python3
"""Swap the site and the app between the teal (15 Nov 2026) and the old green.

    python3 tools/recolour.py green    # back to the dark green
    python3 tools/recolour.py teal     # the teal again

Each pair is green -> teal. Run it, look, commit, push. Since 16 Nov 2026
it covers everything: the coach dashboard, the review tool, the website
editor, every email, the manifests and the iPhone app's launch screen (which
only changes on the next native build).
"""
import re, sys, glob, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
PAIRS = [
 ('#006663', '#237f95'), ('#0a7a76', '#2f93a9'), ('#00403d', '#1d5566'), ('#00504d', '#236a7d'),
 ('#0a7b74', '#237f96'), ('#0b6a65', '#1f7286'), ('#007a75', '#2f93aa'), ('#00706a', '#237f97'),
 ('#003b38', '#1d5567'), ('#00302e', '#174a59'), ('#19b3aa', '#4fb3c9'), ('#168a83', '#237f98'),
 ('#046e68', '#1f7287'), ('#4d877f', '#4d8c9e'), ('#5a9e95', '#5a9fb2'), ('#0d2420', '#0d222b'),
 ('#0f2420', '#0f222b'), ('#0d2b29', '#0d2933'), ('#0f1a19', '#0f191d'), ('#8fe3d6', '#a3dcea'),
 ('#e3f1ef', '#e3eff3'), ('#f0f5f4', '#f0f4f6'), ('#062522', '#0a2530'), ('#0e2a28', '#0e2833'),
 ('#0c1f1d', '#0c1e26'), ('#3f8f8c', '#3f97a8'),
 ('rgba(0,102,99,', 'rgba(35,127,149,'), ('rgba(0,64,61,', 'rgba(29,85,102,'), ('rgba(10,123,116,', 'rgba(35,127,150,'),
 ('rgba(0,48,46,', 'rgba(23,74,89,'), ('rgba(20,60,56,', 'rgba(20,58,70,'), ('rgba(77,135,127,', 'rgba(77,140,158,'),
 ('rgba(15,36,32,', 'rgba(15,34,42,'), ('rgba(6,37,34,', 'rgba(10,37,48,'), ('rgba(143,227,214,', 'rgba(163,220,234,'),
 ('invert(35%) sepia(22%) saturate(900%) hue-rotate(135deg) brightness(96%)',
  'invert(36%) sepia(30%) saturate(1000%) hue-rotate(144deg) brightness(110%)'),
 # the shadows and tints the first pass missed, hue moved the same way (16 Nov 2026)
 ('#14a89c', '#1491a8'),
 ('#cfe6e3', '#cfe4e6'),
 ('#14918c', '#147991'),
 ('#128274', '#127682'),
 ('#a9e6dc', '#a9e2e6'),
 ('#54cbc1', '#54b9cb'),
 ('#1e7a72', '#1e6c7a'),
 ('#60b6aa', '#60aeb6'),
 ('#8ecec8', '#8ec5ce'),
 ('#dce9e8', '#dce7e9'),
 ('#0a5f5b', '#0a4f5f'),
 ('#aef0d8', '#aef0e7'),
 ('#1f4e4a', '#1f474e'),
 ('#2a6460', '#2a5a64'),
 ('#0a7470', '#0a5f74'),
 ('#7cc9c3', '#7cbdc9'),
 ('#4f9f95', '#4f969f'),
 ('#9fd8d4', '#9fcfd8'),
 ('rgba(10,24,22,', 'rgba(10,23,24,'),
 ('rgba(3,24,22,', 'rgba(3,21,24,'),
 ('rgba(20,168,156,', 'rgba(20,145,168,'),
 ('rgba(0,30,28,', 'rgba(0,25,30,'),
 ('rgba(0,40,38,', 'rgba(0,33,40,'),
 ('rgba(8,26,24,', 'rgba(8,24,26,'),
 ('rgba(0,40,37,', 'rgba(0,34,40,'),
 ('rgba(8,20,18,', 'rgba(8,19,20,'),
 ('rgba(0,42,40,', 'rgba(0,34,42,'),
 ('rgba(10,30,28,', 'rgba(10,27,30,'),
 ('rgba(0,80,76,', 'rgba(0,65,80,'),
 ('rgba(12,32,29,', 'rgba(12,30,32,'),
 ('rgba(10,20,19,', 'rgba(10,19,20,'),
 ('rgba(13,36,32,', 'rgba(13,35,36,'),
 ('rgba(10,20,18,', 'rgba(10,20,20,'),
 ('rgba(124,201,195,', 'rgba(124,189,201,'),
]
FILES = ['lha-app.html', 'app-intro.js', 'index.html', 'handstand-class.html', 'form-check.html', 'site-header.js', 'links.html',
 'six-week-handstand-group.html', 'handstand-coaching-london.html', 'handstand-classes-london.html', 'learn-to-handstand-london.html',
 'session.html', 'call.html', 'workshop.html', 'workshop-card.html', 'booking.html', 'fix.html', 'site-edits.js', 'account.js',
 'stats.js', 'tools/build-learn-story.py', 'learn/films.js',
 'lha-coach.html', 'coach-review.html', 'site-editor.html', 'netlify/functions/app.mjs', 'netlify/functions/emails.mjs',
 'netlify/functions/cycle.mjs', 'shoulder-anim.js', 'voice.js', 'manifest.json', 'coach-manifest.json',
 'native/capacitor.config.json', 'native/www/index.html', 'native/www/offline.html', 'next-steps-angie.html',
 'lha-app-preview.html', 'fix-preview.html'] + sorted(glob.glob('learn/*.html'))
to = (sys.argv[1:] or [''])[0]
if to not in ('green', 'teal'): sys.exit(__doc__)
total = 0
for f in FILES:
    if not os.path.exists(f): continue
    s = open(f).read(); n0 = 0
    for g, t in PAIRS:
        a, b = (t, g) if to == 'green' else (g, t)
        s, n = re.subn(re.escape(a), b, s, flags=re.I); n0 += n
    if n0: open(f, 'w').write(s); total += n0
print(f'{total} colours set to {to}. Bump CACHE_VERSION in sw.js before pushing.')
