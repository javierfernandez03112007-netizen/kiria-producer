"""Hojas de contacto (vertical): python3 web/lab/sheets.py <dir> [fps=60] [cols=4] [rows=2]"""
from PIL import Image, ImageDraw
import glob, os, sys
d = sys.argv[1]; fps = float(sys.argv[2]) if len(sys.argv) > 2 else 60; C = int(sys.argv[3]) if len(sys.argv) > 3 else 4; R = int(sys.argv[4]) if len(sys.argv) > 4 else 2
fs = sorted(glob.glob(d + '/f*.jpg')); n = C * R; W = 1920 // C; H = W * 16 // 9
for s in range(0, len(fs), n):
    part = fs[s:s + n]; sheet = Image.new('RGB', (C * W, R * H), (0, 0, 0)); dr = ImageDraw.Draw(sheet)
    for i, f in enumerate(part):
        im = Image.open(f).resize((W, H)); x, y = (i % C) * W, (i // C) * H; sheet.paste(im, (x, y))
        dr.rectangle((x, y, x + 50, y + 14), fill=(0, 0, 0)); dr.text((x + 4, y + 2), f"{int(os.path.basename(f)[1:6]) / fps:.2f}s", fill=(255, 255, 0))
    sheet.save(f'{d}/sheet_{s // n}.jpg', quality=88)
print(len(fs))
