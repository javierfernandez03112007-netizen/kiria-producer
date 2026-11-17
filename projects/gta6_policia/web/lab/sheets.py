"""Hojas de contacto de una pasada: python3 web/lab/sheets.py out/p1 [cols=6 rows=4]"""
from PIL import Image, ImageDraw
import glob, os, sys
d = sys.argv[1]; fs = sorted(glob.glob(d + '/f*.jpg')); n = 24
for s in range(0, len(fs), n):
    part = fs[s:s + n]; W, H = 240, 427
    sheet = Image.new('RGB', (6 * W, 4 * H), (0, 0, 0)); dr = ImageDraw.Draw(sheet)
    for i, f in enumerate(part):
        im = Image.open(f).resize((W, H)); x, y = (i % 6) * W, (i // 6) * H; sheet.paste(im, (x, y))
        dr.text((x + 4, y + 4), f"{int(os.path.basename(f)[1:6]) / 60:.1f}s", fill=(255, 255, 0))
    sheet.save(f'{d}/sheet_{s // n}.jpg', quality=88)
print(len(fs))
