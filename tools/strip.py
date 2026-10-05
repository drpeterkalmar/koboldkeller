import sys, glob
from PIL import Image
# Bildfolge nebeneinander (Bericht-Collagen): python3 tools/strip.py <muster> <ziel> [scale]
fs = sorted(glob.glob(sys.argv[1])); s = float(sys.argv[3]) if len(sys.argv) > 3 else 0.45
ims = [Image.open(f).convert("RGB") for f in fs]
w, h = ims[0].size; W, H = int(w * s), int(h * s)
out = Image.new("RGB", (W * len(ims), H))
for i, im in enumerate(ims): out.paste(im.resize((W, H)), (i * W, 0))
out.save(sys.argv[2]); print(len(ims), out.size)
