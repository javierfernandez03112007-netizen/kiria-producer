# Hojas de contacto: foto descargada + nuestro número y nombre, para revisar a ojo que cada una es su producto.
import json, sys, os
from PIL import Image, ImageDraw, ImageFont
img_dir, products_js, nums_json, out_prefix = sys.argv[1:5]
per = int(sys.argv[5]) if len(sys.argv) > 5 else 30
t = open(products_js, encoding='utf-8').read(); P = {p['id']: p for p in json.loads(t[t.index('['):t.rindex(']') + 1])}
nums = json.load(open(nums_json))
ids = sorted([f[:-4] for f in os.listdir(img_dir) if f.endswith('.png') and f[:-4] in P], key=lambda i: nums[i])
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13); bold = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
except Exception: font = bold = ImageFont.load_default()
W, H, cols = 200, 250, 6
for s in range(0, len(ids), per):
    chunk = ids[s:s + per]; rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * W, rows * H), (236, 231, 224)); d = ImageDraw.Draw(sheet)
    for k, pid in enumerate(chunk):
        x, y = (k % cols) * W, (k // cols) * H
        im = Image.open(os.path.join(img_dir, pid + '.png')).convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); im = bg.convert('RGB')
        im.thumbnail((W - 8, 196)); sheet.paste(im, (x + (W - im.width) // 2, y + 2))
        p = P[pid]; name = p['name'].replace('Bonacure ', 'BC ').replace('Session Label ', 'SL ').replace('Fibre Clinix', 'FC').replace('Bond Repair', 'BR')
        d.text((x + 4, y + 200), f"{nums[pid]}", font=bold, fill=(150, 30, 30))
        line1, line2 = name[:26], name[26:52]
        d.text((x + 34, y + 200), line1, font=font, fill=(20, 20, 20)); d.text((x + 4, y + 217), (line2 + '  ' if line2 else '') + p['size'], font=font, fill=(90, 80, 70))
    sheet.save(f'{out_prefix}{s // per + 1}.jpg', quality=82); print(f'{out_prefix}{s // per + 1}.jpg', len(chunk))
