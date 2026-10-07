#!/usr/bin/env python3
"""Koboldkeller v13 Deko: Kontaktbogen bzw. Vorher/Nachher-Collage aus tests/shots/deko/.
  python3 tools/deko_collage.py sheet vorher hoch            → tests/shots/deko/_sheet_vorher_hoch.jpg (alle Szenen einer Reihe)
  python3 tools/deko_collage.py vergleich vorher nachher hoch → tests/shots/deko/vergleich_hoch.jpg (oben vorher, unten nachher)
  optional 5. Argument: Szenen, kommagetrennt (Standard: alle)"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

D = "tests/shots/deko/"
ORDER = ["menu", "stadt", "moos", "kristall", "zucker", "frost", "glut", "boss", "bossdown", "sieg"]

def load(tag, nm, fmt, h):
    f = f"{D}{tag}_{nm}_{fmt}.png"
    if not os.path.exists(f): return None
    im = Image.open(f).convert("RGB")
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)

def font(sz):
    for p in ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Helvetica.ttc"]:
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

def build(rows, fmt, scenes, out, h):
    imgs = [[load(t, s, fmt, h) for s in scenes] for t, _ in rows]
    w = max((im.width for r in imgs for im in r if im), default=200)
    lab = 30
    sheet = Image.new("RGB", (len(scenes) * (w + 6) + 6, len(rows) * (h + lab + 6) + 6), (24, 16, 32))
    dr = ImageDraw.Draw(sheet); fnt = font(20)
    for ri, ((t, title), r) in enumerate(zip(rows, imgs)):
        for ci, im in enumerate(r):
            x, y = 6 + ci * (w + 6), 6 + ri * (h + lab + 6)
            dr.text((x + 4, y + 4), f"{title} · {scenes[ci]}", fill=(255, 236, 190), font=fnt)
            if im: sheet.paste(im, (x, y + lab))
    sheet.save(out, quality=86)
    print(out, sheet.size)

if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "sheet":
        tag, fmt = sys.argv[2], sys.argv[3]
        sc = sys.argv[4].split(",") if len(sys.argv) > 4 else ORDER
        build([(tag, tag)], fmt, sc, f"{D}_sheet_{tag}_{fmt}.jpg", 640 if fmt == "hoch" else 300)
    else:
        a, b, fmt = sys.argv[2], sys.argv[3], sys.argv[4]
        sc = sys.argv[5].split(",") if len(sys.argv) > 5 else ORDER
        suffix = sys.argv[6] if len(sys.argv) > 6 else ""
        build([(a, "vorher"), (b, "nachher")], fmt, sc, f"{D}vergleich_{fmt}{suffix}.jpg", 640 if fmt == "hoch" else 300)
