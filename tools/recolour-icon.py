#!/usr/bin/env python3
"""Moves the app icon's old green into the teal (26 Nov 2026).

Only the icon's own band of greens moves (hue about 160 to 188 degrees),
so the launch picture's navy ground and mint words, already teal, stay as
they are. Hue goes round 18 degrees and saturation up a touch (x1.12): of four
strengths tried side by side with the app's #237f95, #2f93a9 and #5cb8cb,
this one sat with them.

  python3 tools/recolour-icon.py in.png out.png [more pairs...]
"""
import sys
import numpy as np
from PIL import Image

SHIFT, SAT = 18 / 360, 1.12
LO, HI, FEATHER = 162 / 360, 186 / 360, 6 / 360


def rgb_to_hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 0
    rc = np.where(m, (mx - r) / np.where(m, d, 1), 0)
    gc = np.where(m, (mx - g) / np.where(m, d, 1), 0)
    bc = np.where(m, (mx - b) / np.where(m, d, 1), 0)
    h = np.where(mx == r, bc - gc, np.where(mx == g, 2 + rc - bc, 4 + gc - rc))
    h = np.where(m, (h / 6) % 1, 0)
    s = np.where(mx > 0, d / np.where(mx > 0, mx, 1), 0)
    return h, s, mx


def hsv_to_rgb(h, s, v):
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    r = np.choose(i, [v, q, p, p, t, v])
    g = np.choose(i, [t, v, v, q, p, p])
    b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1)


def recolour(src, dst):
    im = Image.open(src)
    mode = im.mode
    rgba = np.asarray(im.convert('RGBA')).astype(np.float64) / 255
    h, s, v = rgb_to_hsv(rgba[..., :3])
    w = np.clip(np.minimum(h - (LO - FEATHER), (HI + FEATHER) - h) / FEATHER, 0, 1) * np.clip(s / 0.06, 0, 1)
    h2 = (h + SHIFT * w) % 1
    s2 = s * (1 - (1 - SAT) * w)
    out = rgba.copy()
    out[..., :3] = hsv_to_rgb(h2, s2, v)
    img = Image.fromarray((out * 255 + 0.5).clip(0, 255).astype(np.uint8))
    img = img.convert(mode if mode in ('RGB', 'RGBA', 'L', 'LA') else 'RGBA')
    img.save(dst, optimize=True)


if __name__ == '__main__':
    a = sys.argv[1:]
    for i in range(0, len(a), 2):
        recolour(a[i], a[i + 1])
        print(a[i], '->', a[i + 1])
