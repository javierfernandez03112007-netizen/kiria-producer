#!/usr/bin/env python3
"""Coloca la foto de un producto en la web.

  python3 tools/foto.py <archivo> <número o id>          foto principal del producto
  python3 tools/foto.py <archivo> <número o id> --extra  otra foto más del mismo producto (galería de la ficha)
  python3 tools/foto.py --lote <carpeta>                 todos los archivos llamados <número>.jpg, <número>-2.png, <id>.webp…

Qué hace con cada foto: la endereza (EXIF), le quita los metadatos, recorta el fondo blanco o transparente que sobra,
la deja a 1.200 px como mucho y la guarda en media/productos/<id>.webp (y una miniatura en media/productos/mini/).
Al terminar regenera el catálogo (data/build.py) y la lista (tools/lista.py). Los números son los de data/numeros.json.
"""
import json, os, re, subprocess, sys
from PIL import Image, ImageOps, ImageChops, ImageFilter
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
MEDIA = os.path.join(root, 'media', 'productos'); MINI = os.path.join(MEDIA, 'mini')
nums = json.load(open(os.path.join(root, 'data', 'numeros.json'), encoding='utf-8'))
by_num = {str(n): i for i, n in nums.items()}
EXT = ('.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp', '.tif', '.tiff', '.heic')

def resolve(key):
    key = str(key).strip().lower()
    if key in by_num: return by_num[key]
    if key in nums: return key
    raise SystemExit(f'No conozco el producto «{key}» (usa el número de la lista o el id)')

def trim(im):
    """Recorta el margen sobrante. Devuelve (imagen, cómo era el fondo)."""
    if im.mode in ('RGBA', 'LA') or 'transparency' in im.info:
        im = im.convert('RGBA'); a = im.getchannel('A')
        if a.getextrema()[0] < 250:                       # tiene transparencia de verdad
            box = a.point(lambda v: 255 if v > 10 else 0).getbbox()
            return (im.crop(box) if box else im), 'transparente'
        im = im.convert('RGB')
    im = im.convert('RGB'); w, h = im.size
    corners = [im.getpixel(xy) for xy in ((2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3))]
    bg = tuple(sorted(c[i] for c in corners)[1] for i in range(3))          # mediana de las esquinas
    if max(max(abs(c[i] - bg[i]) for i in range(3)) for c in corners) > 18: return im, 'no liso (no se recorta)'
    diff = ImageChops.difference(im, Image.new('RGB', im.size, bg)).convert('L').filter(ImageFilter.MedianFilter(5))
    box = diff.point(lambda v: 255 if v > 16 else 0).getbbox()
    if not box: return im, 'liso'
    if min(bg) < 235:                                     # fondo liso pero no blanco: se deja tal cual, sin recortar a ras
        return im, f'liso de color {bg}'
    return im.crop(box), 'blanco'

def process(src, pid, extra=False):
    im = ImageOps.exif_transpose(Image.open(src)); im.load()
    w0, h0 = im.size
    im, bg = trim(im)
    w, h = im.size; m = round(max(w, h) * .03)             # un 3 % de aire alrededor
    canvas = Image.new(im.mode, (w + 2 * m, h + 2 * m), (255, 255, 255, 0) if im.mode == 'RGBA' else (255, 255, 255))
    canvas.paste(im, (m, m)); im = canvas
    if max(im.size) > 1200: im.thumbnail((1200, 1200), Image.LANCZOS)
    os.makedirs(MINI, exist_ok=True)
    name = pid
    if extra:
        k = 2
        while os.path.exists(os.path.join(MEDIA, f'{pid}-{k}.webp')): k += 1
        name = f'{pid}-{k}'
    else:
        for e in ('jpg', 'jpeg', 'png'):                  # una sola foto principal por producto
            f = os.path.join(MEDIA, f'{pid}.{e}')
            if os.path.exists(f): os.remove(f)
    dest = os.path.join(MEDIA, name + '.webp'); im.save(dest, 'WEBP', quality=86, method=6)
    if not extra:
        mini = im.copy(); mini.thumbnail((420, 420), Image.LANCZOS); mini.save(os.path.join(MINI, name + '.webp'), 'WEBP', quality=74, method=6)
    warn = ' ⚠ pequeña (menos de 600 px): se verá borrosa en la ficha' if max(w, h) < 600 else ''
    print(f'  {nums[pid]:>3} · {pid}: {w0}x{h0} → {im.size[0]}x{im.size[1]}, fondo {bg}, {os.path.getsize(dest) // 1024} KB{warn}')
    return dest

def rebuild():
    subprocess.run([sys.executable, os.path.join(root, 'data', 'build.py')], check=True)
    subprocess.run([sys.executable, os.path.join(here, 'lista.py')], check=True)

if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] in ('-h', '--help'): print(__doc__); sys.exit(0)
    if a[0] == '--lote':
        folder = a[1]; pending = []
        for f in sorted(os.listdir(folder)):
            base, ext = os.path.splitext(f)
            if ext.lower() not in EXT: continue
            key, extra = base.strip().lower(), False
            if key not in by_num and key not in nums:      # «23-2» o «ghd-gold-2» = otra foto del mismo producto
                m = re.fullmatch(r'(.+?)[-_ ]+(\d)', key)
                if m: key, extra = m.group(1).strip(), True
            if key in by_num or key in nums: process(os.path.join(folder, f), resolve(key), extra)
            else: pending.append(f)
        if pending: print('  Sin asignar (hay que mirarlas y decir de qué producto son):', ', '.join(pending))
    else:
        process(a[0], resolve(a[1]), '--extra' in a)
    rebuild()
