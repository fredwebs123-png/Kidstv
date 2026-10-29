#!/usr/bin/env python3
"""Draws the three Kidstv scenes: rainbow (a sunny day), candy (a pink sunset with balloons) and
stars (bedtime, a purple night with the moon). Each is made the way the built-in scenes are:

  backgrounds/scene-<id>.jpg        the picture, 1920x1080
  backgrounds/scene-<id>-glass.jpg  a blurred, brighter copy, the clock's frosted fill
  backgrounds/scene-<id>-fg.webp    the hills alone (transparent sky), drawn over the clock

Everything is drawn here with Pillow, so there are no photo credits to keep. Run it again after
changing a colour:  python3 tv-home/tools/make-kids-scenes.py
"""
import math
import os
import random

from PIL import Image, ImageChops, ImageDraw, ImageFilter

W, H = 1920, 1080
S = 2   # drawn at twice the size, then shrunk, for smooth edges
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web", "backgrounds")


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


# drawn on RGB (not RGBA) so the see-through fills blend with what is under them
def sky(stops):
    """A vertical gradient through (position 0..1, colour) stops."""
    im = Image.new("RGB", (W * S, H * S))
    d = ImageDraw.Draw(im)
    for y in range(H * S):
        t = y / (H * S - 1)
        for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
            if p0 <= t <= p1:
                d.line([(0, y), (W * S, y)], fill=lerp(c0, c1, (t - p0) / (p1 - p0 or 1)))
                break
    return im


def hill(layer, crest, amp, waves, phase, colour, shade=None):
    """A rolling hill whose top sits at crest (a share of the height), filled to the bottom."""
    d = ImageDraw.Draw(layer)
    pts = []
    for x in range(0, W * S + 8, 8):
        u = x / (W * S)
        y = crest + amp * (math.sin(u * math.pi * waves + phase) * 0.7 + math.sin(u * math.pi * waves * 2.3 + phase * 1.7) * 0.3)
        pts.append((x, y * H * S))
    d.polygon(pts + [(W * S, H * S), (0, H * S)], fill=colour)
    if shade:   # a soft lighter band along the top of the hill
        d.line(pts, fill=shade, width=10 * S)


def glow(im, x, y, r, colour, strength=150):
    """A soft round glow (a sun's or the moon's), blurred so it has no rings."""
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=strength)
    mask = mask.filter(ImageFilter.GaussianBlur(r * 0.35 * S))
    im.paste(Image.new("RGB", im.size, colour), (0, 0), mask)


def cloud(d, x, y, r, colour):
    for dx, dy, k in ((0, 0, 1), (-1.1, 0.25, 0.75), (1.1, 0.25, 0.8), (-0.5, -0.45, 0.8), (0.55, -0.35, 0.7), (1.9, 0.45, 0.5), (-1.9, 0.5, 0.5)):
        rr = r * k
        cx, cy = (x + dx * r) * S, (y + dy * r) * S
        d.ellipse([cx - rr * S, cy - rr * S, cx + rr * S, cy + rr * S], fill=colour)


def star(d, x, y, r, colour, points=5):
    pts = []
    for i in range(points * 2):
        a = math.pi / points * i - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.45
        pts.append(((x + math.cos(a) * rr) * S, (y + math.sin(a) * rr) * S))
    d.polygon(pts, fill=colour)


def flowers(layer, crest, amp, waves, phase, rng, n, colours):
    """Little flowers dotted on a hill, below its top edge."""
    d = ImageDraw.Draw(layer)
    for _ in range(n):
        x = rng.uniform(0, W)
        u = x / W
        top = crest + amp * (math.sin(u * math.pi * waves + phase) * 0.7 + math.sin(u * math.pi * waves * 2.3 + phase * 1.7) * 0.3)
        y = rng.uniform(top * H + 30, H - 10)
        r = rng.uniform(5, 10) * (0.6 + 0.6 * (y / H))
        c = rng.choice(colours)
        for k in range(5):
            a = k * math.pi * 2 / 5
            px, py = x + math.cos(a) * r, y + math.sin(a) * r
            d.ellipse([(px - r * 0.7) * S, (py - r * 0.7) * S, (px + r * 0.7) * S, (py + r * 0.7) * S], fill=c)
        d.ellipse([(x - r * 0.5) * S, (y - r * 0.5) * S, (x + r * 0.5) * S, (y + r * 0.5) * S], fill=(255, 226, 92))


def save(id_, back, front, glass_boost=1.25):
    back = back.resize((W, H), Image.LANCZOS)
    front = front.resize((W, H), Image.LANCZOS)
    full = back.convert("RGBA")
    full.alpha_composite(front)
    full = full.convert("RGB")
    full.save(os.path.join(OUT, f"scene-{id_}.jpg"), quality=88, optimize=True, progressive=True)
    glass = full.filter(ImageFilter.GaussianBlur(28))
    glass = Image.eval(glass, lambda v: min(255, int(v * glass_boost)))
    glass.save(os.path.join(OUT, f"scene-{id_}-glass.jpg"), quality=82, optimize=True)
    front.save(os.path.join(OUT, f"scene-{id_}-fg.webp"), quality=86, method=6)
    print("made", id_)


def rainbow():
    rng = random.Random(7)
    back = sky([(0, (86, 182, 255)), (0.55, (170, 222, 255)), (1, (214, 240, 255))])
    d = ImageDraw.Draw(back, "RGBA")
    # the sun, left, under the people switch, with a soft glow
    glow(back, 250, 330, 170, (255, 236, 150), 170)
    d.ellipse([155 * S, 235 * S, 345 * S, 425 * S], fill=(255, 214, 64))
    # the rainbow, behind the clock
    bands = [(255, 92, 92), (255, 160, 70), (255, 220, 80), (110, 210, 110), (80, 170, 255), (150, 120, 240)]
    cx, cy, r0 = 960, 760, 720
    for i, c in enumerate(bands):
        r = r0 - i * 34
        d.arc([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], 180, 360, fill=c + (220,), width=34 * S)
    for x, y, r in ((1560, 190, 60), (560, 250, 44), (1700, 420, 40), (120, 520, 36)):
        cloud(d, x, y, r, (255, 255, 255))
    front = Image.new("RGBA", back.size, (0, 0, 0, 0))
    hill(front, 0.43, 0.035, 2.2, 0.6, (140, 214, 110, 255), (176, 232, 140, 255))
    hill(front, 0.56, 0.03, 3.1, 2.2, (98, 190, 90, 255), (130, 212, 112, 255))
    hill(front, 0.72, 0.025, 2.6, 4.0, (70, 160, 76, 255), (96, 186, 96, 255))
    flowers(front, 0.56, 0.03, 3.1, 2.2, rng, 70, [(255, 120, 170), (255, 255, 255), (190, 140, 255), (255, 170, 80)])
    save("rainbow", back.convert("RGB"), front)


def candy():
    rng = random.Random(11)
    back = sky([(0, (255, 140, 190)), (0.45, (255, 186, 160)), (0.75, (255, 220, 160)), (1, (255, 236, 190))])
    d = ImageDraw.Draw(back, "RGBA")
    # a big low sun
    glow(back, 1440, 520, 280, (255, 240, 170), 190)
    d.ellipse([1270 * S, 350 * S, 1610 * S, 690 * S], fill=(255, 238, 150))
    for x, y, r in ((300, 140, 50), (1400, 80, 36), (760, 520, 36)):
        cloud(d, x, y, r, (255, 236, 244))
    # hot air balloons
    for x, y, r, c1, c2 in ((360, 330, 70, (120, 200, 255), (255, 255, 255)), (1660, 210, 52, (190, 130, 255), (255, 214, 90))):
        for k in range(6):
            c = c1 if k % 2 == 0 else c2
            d.pieslice([(x - r) * S, (y - r) * S, (x + r) * S, (y + r * 1.15) * S], 180 + k * 30, 210 + k * 30, fill=c)
        d.chord([(x - r) * S, (y - r * 0.6) * S, (x + r) * S, (y + r * 1.15) * S], 0, 180, fill=c1)
        d.line([((x - r * 0.45) * S, (y + r * 1.05) * S), ((x - r * 0.2) * S, (y + r * 1.5) * S)], fill=(120, 80, 60), width=2 * S)
        d.line([((x + r * 0.45) * S, (y + r * 1.05) * S), ((x + r * 0.2) * S, (y + r * 1.5) * S)], fill=(120, 80, 60), width=2 * S)
        d.rectangle([(x - r * 0.22) * S, (y + r * 1.5) * S, (x + r * 0.22) * S, (y + r * 1.8) * S], fill=(170, 110, 70))
    front = Image.new("RGBA", back.size, (0, 0, 0, 0))
    hill(front, 0.45, 0.04, 1.8, 1.2, (214, 120, 190, 255), (236, 152, 210, 255))
    hill(front, 0.58, 0.03, 2.8, 3.0, (170, 96, 180, 255), (196, 124, 204, 255))
    hill(front, 0.73, 0.025, 2.2, 5.0, (126, 72, 160, 255), (150, 96, 184, 255))
    flowers(front, 0.58, 0.03, 2.8, 3.0, rng, 50, [(255, 214, 90), (255, 255, 255), (140, 220, 255)])
    save("candy", back.convert("RGB"), front, glass_boost=1.15)


def stars():
    rng = random.Random(3)
    back = sky([(0, (32, 22, 84)), (0.5, (78, 50, 140)), (1, (150, 96, 190))])
    d = ImageDraw.Draw(back, "RGBA")
    for _ in range(260):   # tiny stars
        x, y, r = rng.uniform(0, W), rng.uniform(0, H * 0.62), rng.uniform(0.8, 2.4)
        d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=(255, 255, 255, rng.randint(140, 255)))
    for x, y, r in ((180, 120, 16), (720, 90, 12), (1250, 70, 14), (1780, 330, 13), (90, 420, 11), (1500, 470, 10), (540, 470, 10)):
        star(d, x, y, r, (255, 236, 150, 255))
    # the moon, top right, a smiling crescent
    glow(back, 1610, 170, 170, (255, 240, 190), 90)
    # the crescent: a full moon with a bite of plain sky taken out of it
    plain = sky([(0, (32, 22, 84)), (0.5, (78, 50, 140)), (1, (150, 96, 190))])
    d.ellipse([1510 * S, 70 * S, 1710 * S, 270 * S], fill=(255, 238, 170, 255))
    bite = Image.new("L", back.size, 0)
    ImageDraw.Draw(bite).ellipse([1450 * S, 46 * S, 1640 * S, 236 * S], fill=255)
    moon = Image.new("L", back.size, 0)
    ImageDraw.Draw(moon).ellipse([1510 * S, 70 * S, 1710 * S, 270 * S], fill=255)
    back.paste(plain, (0, 0), ImageChops.multiply(bite, moon))   # only the moon is bitten, the glow stays
    for x, y, r in ((420, 260, 38), (1180, 230, 30)):
        cloud(d, x, y, r, (112, 86, 172))
    front = Image.new("RGBA", back.size, (0, 0, 0, 0))
    hill(front, 0.46, 0.035, 2.0, 0.4, (70, 52, 132, 255), (96, 74, 160, 255))
    hill(front, 0.6, 0.03, 3.0, 2.6, (52, 38, 104, 255), (72, 56, 130, 255))
    # little houses with warm windows on the middle hill
    fd = ImageDraw.Draw(front)
    for x in (300, 760, 1500):
        u = x / W
        top = 0.6 + 0.03 * (math.sin(u * math.pi * 3.0 + 2.6) * 0.7 + math.sin(u * math.pi * 6.9 + 4.42) * 0.3)
        y = top * H + 40
        fd.rectangle([(x - 34) * S, (y - 40) * S, (x + 34) * S, (y + 30) * S], fill=(40, 30, 86, 255))
        fd.polygon([((x - 46) * S, (y - 38) * S), (x * S, (y - 84) * S), ((x + 46) * S, (y - 38) * S)], fill=(34, 24, 74, 255))
        fd.rectangle([(x - 18) * S, (y - 22) * S, (x - 2) * S, (y - 6) * S], fill=(255, 214, 110, 255))
        fd.rectangle([(x + 6) * S, (y - 22) * S, (x + 22) * S, (y - 6) * S], fill=(255, 214, 110, 255))
    hill(front, 0.74, 0.025, 2.4, 4.4, (36, 26, 76, 255), (52, 40, 100, 255))
    save("stars", back.convert("RGB"), front, glass_boost=1.6)


if __name__ == "__main__":
    rainbow()
    candy()
    stars()
