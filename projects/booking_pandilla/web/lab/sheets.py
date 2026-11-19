"""Hojas de contacto (horizontal): python3 web/lab/sheets.py <dir> [fps=30] [cols=3] [rows=3]"""
from PIL import Image, ImageDraw
import glob, os, sys
d = sys.argv[1]; fps = float(sys.argv[2]) if len(sys.argv) > 2 else 30; C = int(sys.argv[3]) if len(sys.argv) > 3 else 3; R = int(sys.argv[4]) if len(sys.argv) > 4 else 3
fs = sorted(glob.glob(d + '/f*.jpg')); n = C * R; W, H = 1920 // C, 1080 // C
for s in range(0, len(fs), n):
    part = fs[s:s + n]; sheet = Image.new('RGB', (C * W, R * H), (0, 0, 0)); dr = ImageDraw.Draw(sheet)
    for i, f in enumerate(part):
        im = Image.open(f).resize((W, H)); x, y = (i % C) * W, (i // C) * H; sheet.paste(im, (x, y))
        dr.rectangle((x, y, x + 46, y + 14), fill=(0, 0, 0)); dr.text((x + 4, y + 2), f"{int(os.path.basename(f)[1:6]) / fps:.2f}s", fill=(255, 255, 0))
    sheet.save(f'{d}/sheet_{s // n}.jpg', quality=88)
print(len(fs))
