#!/usr/bin/env python3
"""Koboldkeller Technik: A/B-Collagen aus shots/technik/ (Zeilen = Varianten, Spalten = Szenen).
  python3 tools/technik_collage.py ab hoch 0 v13:"v13 (2D)" post:"Endbild" [--szenen=stadt,moos] [--out=…]
      → shots/technik/ab_<fmt>_q<stufe>.jpg
  python3 tools/technik_collage.py lupe hoch 0 stadt v13 post [--x=0.5 --y=0.45 --w=0.32]
      → shots/technik/lupe_<szene>_<fmt>_q<stufe>.jpg (Ausschnitt in 2× Vergrößerung, nebeneinander; Schärfe beurteilen)"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

D = "shots/technik/"
ORDER = ["stadt", "moos", "kristall", "frost", "glut", "boss"]

def opt(k, d):
    for a in sys.argv:
        if a.startswith("--" + k + "="): return a.split("=", 1)[1]
    return d

def font(sz):
    for p in ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Helvetica.ttc"]:
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

def datei(tag, nm, fmt, q): return f"{D}{tag}_{nm}_q{q}_{fmt}.png"

def ab(fmt, q, rows):
    scenes = opt("szenen", ",".join(ORDER)).split(",")
    h = 620 if fmt == "hoch" else 300
    imgs = []
    for tag, _ in rows:
        r = []
        for s in scenes:
            f = datei(tag, s, fmt, q)
            if os.path.exists(f):
                im = Image.open(f).convert("RGB"); r.append(im.resize((round(im.width * h / im.height), h), Image.LANCZOS))
            else: r.append(None)
        imgs.append(r)
    w = max((im.width for r in imgs for im in r if im), default=200)
    lab = 28
    sheet = Image.new("RGB", (len(scenes) * (w + 6) + 6, len(rows) * (h + lab + 6) + 6), (24, 16, 32))
    dr = ImageDraw.Draw(sheet); fnt = font(19)
    for ri, ((t, title), r) in enumerate(zip(rows, imgs)):
        for ci, im in enumerate(r):
            x, y = 6 + ci * (w + 6), 6 + ri * (h + lab + 6)
            dr.text((x + 4, y + 4), f"{title} · {scenes[ci]}", fill=(255, 236, 190), font=fnt)
            if im: sheet.paste(im, (x, y + lab))
    out = opt("out", f"{D}ab_{fmt}_q{q}.jpg")
    sheet.save(out, quality=88); print(out, sheet.size)

def lupe(fmt, q, nm, tags):
    cx, cy, cw = float(opt("x", 0.5)), float(opt("y", 0.45)), float(opt("w", 0.32))
    crops = []
    for t in tags:
        im = Image.open(datei(t, nm, fmt, q)).convert("RGB")
        W, H = im.size; w = round(W * cw); hh = round(w * 0.75)
        x0, y0 = max(0, round(W * cx - w / 2)), max(0, round(H * cy - hh / 2))
        c = im.crop((x0, y0, x0 + w, y0 + hh)); crops.append((t, c.resize((w * 2, hh * 2), Image.NEAREST)))
    lab = 28; w2, h2 = crops[0][1].size
    sheet = Image.new("RGB", (len(crops) * (w2 + 6) + 6, h2 + lab + 12), (24, 16, 32))
    dr = ImageDraw.Draw(sheet); fnt = font(19)
    for i, (t, c) in enumerate(crops):
        x = 6 + i * (w2 + 6); dr.text((x + 4, 6), f"{t} · {nm} (2×)", fill=(255, 236, 190), font=fnt); sheet.paste(c, (x, lab + 6))
    out = opt("out", f"{D}lupe_{nm}_{fmt}_q{q}.jpg")
    sheet.save(out, quality=90); print(out, sheet.size)

if __name__ == "__main__":
    pos = [a for a in sys.argv[1:] if not a.startswith("--")]
    mode, fmt, q = pos[0], pos[1], pos[2]
    if mode == "ab": ab(fmt, q, [tuple(r.split(":", 1)) if ":" in r else (r, r) for r in pos[3:]])
    else: lupe(fmt, q, pos[3], pos[4:])
