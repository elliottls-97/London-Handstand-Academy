#!/usr/bin/env python3
"""Swap the site and the app between the teal (15 Nov 2026) and the old green.

    python3 tools/recolour.py green    # back to the dark green
    python3 tools/recolour.py teal     # the teal again

Each pair is green -> teal. Run it, look, commit, push. The coach dashboard,
emails and client pages were never moved, so they are not listed.
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
 ('#0c1f1d', '#0c1e26'),
 ('rgba(0,102,99,', 'rgba(35,127,149,'), ('rgba(0,64,61,', 'rgba(29,85,102,'), ('rgba(10,123,116,', 'rgba(35,127,150,'),
 ('rgba(0,48,46,', 'rgba(23,74,89,'), ('rgba(20,60,56,', 'rgba(20,58,70,'), ('rgba(77,135,127,', 'rgba(77,140,158,'),
 ('rgba(15,36,32,', 'rgba(15,34,42,'), ('rgba(6,37,34,', 'rgba(10,37,48,'), ('rgba(143,227,214,', 'rgba(163,220,234,'),
 ('invert(35%) sepia(22%) saturate(900%) hue-rotate(135deg) brightness(96%)',
  'invert(36%) sepia(30%) saturate(1000%) hue-rotate(144deg) brightness(110%)'),
]
FILES = ['lha-app.html', 'app-intro.js', 'index.html', 'handstand-class.html', 'form-check.html', 'site-header.js', 'links.html',
 'six-week-handstand-group.html', 'handstand-coaching-london.html', 'handstand-classes-london.html', 'learn-to-handstand-london.html',
 'session.html', 'call.html', 'workshop.html', 'workshop-card.html', 'booking.html', 'fix.html', 'site-edits.js', 'account.js',
 'stats.js', 'tools/build-learn-story.py', 'learn/films.js'] + sorted(glob.glob('learn/*.html'))
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
