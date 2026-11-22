#!/usr/bin/env python3
"""Learn pages on the website from the explainers written in the app (23 Nov 2026).

Elliott: "add the foundations learn stuff to the website ... that should be our
main lead magnet". Each page is the explainer's own article (EXPLAIN_ARTICLE in
ladder-data.js, his words from the film), its film, the free beginner plan
(learn/plan.js), a Train it box and More to read, laid out like
learn/twice-a-week.html, whose header, styles and footer it reuses.

    python3 tools/build-learn-article.py          writes every page in PAGES
"""
import json, os, re, subprocess, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CDN = 'https://customer-pns1oongdltmkjwa.cloudflarestream.com/'
SITE = 'https://londonhandstandacademy.com'

# slug, explainer uid, kicker, h1 (last part in teal), title, description, thumb second
PAGES = [
    ('do-i-need-to-be-strong', '7467f41353ab66c13b57543f0a7105d6', 'Getting started',
     ('Do I need to be strong to start?', 'In short, no.'),
     'Do You Need to Be Strong to Do a Handstand?',
     'In short, no. Gym strength is not handstand strength. What a handstand needs, how the ladder builds it, and why being very strong can even get in the way.', 6),
    ('how-long-to-learn-a-handstand', 'd692864081a3d4976dbafaaaff314213', 'How long',
     ('How long does it take', 'to learn a handstand?'),
     'How Long Does It Take to Learn a Handstand? An Honest Answer',
     'It depends on you, and here is what it depends on: how often you practise, how much you can commit, your coordination and a little strength. What to expect, stage by stage.', 6),
    ('how-a-handstand-should-feel', 'f84f53ba8026f8bd0348cb6836a46aad', 'The feeling',
     ('How should a handstand feel?', 'Stacked, and relaxed.'),
     'How Should a Handstand Feel? Stacked, and Relaxed',
     'What a good handstand feels like from the inside, from two coaches: shoulders engaged, the rest of the body light, and how to tell when you are holding on too hard.', 6),
    ('where-to-look-in-a-handstand', 'e1ff0eb98d4c9721ede040f7db994acf', 'Where to look',
     ('Where should I look', 'in a handstand?'),
     'Where to Look in a Handstand: Between Your Hands',
     'The biggest thing said in every workshop: look between your hands. Exactly where, why it keeps you straight, and what changes as you get better.', 5),
    ('why-cant-i-balance-off-the-wall', '681e59df476ca15c136c365cbd2cec72', 'Off the wall',
     ('Why can’t I balance', 'off the wall yet?'),
     'Why Can’t I Balance a Handstand Off the Wall Yet?',
     'You can hold the wall, so why not kick up in the middle of the room? What each stage of the wall is building, and why balance comes after it, not instead of it.', 6),
]
# the pages already on the site, for More to read and the Learn index
EXISTING = [
    ('fall-out-of-a-handstand-safely', 'How to fall out of a handstand safely', 'Five steps that make falling out light, then automatic.'),
    ('the-kick-up', 'The kick up', 'Six steps from kick up bounces to the wall, then leaving it.'),
    ('wrists', 'Your wrists carry the whole thing', 'Why they hurt, and the warm up that stops it.'),
    ('twice-a-week', 'Twice a week is the number', 'Fifteen minutes, twice a week, beats one long Sunday.'),
]


def node_json(expr):
    js = (open(os.path.join(ROOT, 'ladder-data.js'), encoding='utf-8').read()
          + ';process.stdout.write(JSON.stringify(' + expr + '));')
    return json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout)


def drill_names():
    src = open(os.path.join(ROOT, 'netlify/functions/programmes.mjs'), encoding='utf-8').read()
    m = re.search(r'"names":(\{.*?\})', src)
    names = json.loads(m.group(1)) if m else {}
    for x in node_json('typeof DRILL_EXTRA!=="undefined"?DRILL_EXTRA:[]'):
        names.setdefault(x.get('v'), x.get('n'))
    return names


def body_html(items, names):
    out, in_list = [], False
    for it in items:
        kind = it[0]
        if kind != 'li' and in_list:
            out.append('</ul>'); in_list = False
        if kind == 'p':
            out.append('<p>' + it[1] + '</p>')
        elif kind == 'h':
            out.append('<h2>' + html.escape(it[1]) + '</h2>')
        elif kind == 'li':
            if not in_list:
                out.append('<ul class="lst">'); in_list = True
            out.append('<li>' + it[1] + '</li>')
        elif kind == 'try':
            ds = [names.get(v, v.replace('-', ' ').capitalize()) for v in it[1]]
            out.append('<div class="points">' + ''.join(
                '<div class="pt"><i>%d</i><span>%s</span></div>' % (i + 1, html.escape(n)) for i, n in enumerate(ds)) + '</div>')
    if in_list:
        out.append('</ul>')
    return '\n'.join(out)


def main():
    tpl = open(os.path.join(ROOT, 'learn/twice-a-week.html'), encoding='utf-8').read()
    head, rest = tpl.split('<main class="wrap">', 1)
    tail = rest.split('</main>', 1)[1]
    tail = re.sub(r'<script type="application/ld\+json">.*?</script>', '%%LD%%', tail, flags=re.S)
    arts = node_json('EXPLAIN_ARTICLE')
    names = drill_names()
    every = [(p[0], p[4].split(':')[0].split('?')[0] + ('?' if '?' in p[4] else ''), p[5]) for p in PAGES]
    for slug, uid, kick, (h1a, h1b), title, desc, at in PAGES:
        items = arts.get(uid)
        if not items:
            print('no article for', slug); continue
        url = SITE + '/learn/' + slug
        thumb = CDN + uid + '/thumbnails/thumbnail.jpg?time=%ds&height=600' % at
        h = head
        h = re.sub(r'<title>.*?</title>', '<title>' + html.escape(title) + '</title>', h)
        h = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="' + html.escape(desc) + '">', h)
        h = re.sub(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="' + url + '">', h)
        h = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="' + html.escape(title) + '">', h)
        h = re.sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="' + html.escape(desc) + '">', h)
        h = re.sub(r'<meta property="og:image" content="[^"]*">', '<meta property="og:image" content="' + thumb + '">', h)
        more = [x for x in EXISTING] + [(s, t, d) for s, t, d in every if s != slug]
        main_html = f'''<main class="wrap">
<article>
<section class="hero"><div class="kick">{html.escape(kick)}</div>
<h1>{html.escape(h1a)} <em>{html.escape(h1b)}</em></h1></section>
<figure><video data-src="{CDN}{uid}/downloads/default.mp4" poster="{thumb}" controls playsinline preload="none"></video><figcaption>The film, from the Handstand Ladder app.</figcaption></figure>
{body_html(items, names)}
<section data-plan></section>
<div class="cta"><div class="kick">Train it</div><h2>Free in the app, <em>and in the room on Saturdays.</em></h2>
<p>The drills are filmed with cues in the Handstand Ladder app, and Foundations is free. Or come to a class at OverGravity, Shadwell, where two coaches watch you do it. Want somebody watching every week? <a href="/handstand-coaching-london" style="color:#8fbeca">Handstand coaching, in London and online</a>.</p>
<a class="btn" href="/lha-app.html?ref=learn">Open the app</a> <a class="btn2" href="/handstand-classes-london">Handstand classes in London</a></div>
<nav class="more" aria-label="More to read"><div class="kick">More to read</div>{''.join(f'<a href="/learn/{s}"><b>{html.escape(t)}</b><span>{html.escape(d)}</span></a>' for s, t, d in more[:6])}</nav>
</article>
</main>'''
        ld = json.dumps({'@context': 'https://schema.org', '@type': 'Article', 'headline': title, 'description': desc,
                         'image': thumb, 'mainEntityOfPage': url,
                         'author': {'@type': 'Person', 'name': 'Elliott Staley', 'url': SITE + '/'},
                         'publisher': {'@type': 'Organization', 'name': 'London Handstand Academy', 'url': SITE + '/'},
                         'datePublished': '2026-11-23'}, ensure_ascii=False)
        page = h + main_html + tail.replace('%%LD%%', '<script type="application/ld+json">' + ld + '</script>')
        page = page.replace('<script src="films.js"></script>', '<script src="films.js"></script>\n<script src="plan.js" defer></script>')
        open(os.path.join(ROOT, 'learn', slug + '.html'), 'w', encoding='utf-8').write(page)
        print('wrote learn/' + slug + '.html', len(page))


if __name__ == '__main__':
    main()
