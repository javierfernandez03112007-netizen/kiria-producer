"""Portada del capítulo 1: el fotograma con el «3,6M» ya fuera de la pared (sin textos del montaje) y el título de la serie.
out/portada.jpg (9:16) y out/miniatura.jpg (4:5, el recorte que enseña la cuadrícula de Instagram)."""
import os, sys, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import montaje as MJ

FONTS = os.path.join(HERE, '..', '..', 'engine', 'fonts') + '/'
T = float(os.environ.get('COVER_T', '3.05'))
W, H = MJ.W, MJ.H

def frame(t):
    MJ.timeline()
    MJ.overlay = lambda kind, f: None
    MJ.glass_rects = lambda f: []
    f = int(round(t * MJ.FPS)); s = MJ.seg_at(t); c = s['clip']
    rd = {c: (MJ.Reader(os.path.join(MJ.WORK, c + '.mov')), MJ.Reader(os.path.join(MJ.WORK, c + '_alpha.mkv'), gray=True))}
    out = MJ.frame_at(f, rd)
    for r in rd[c]: r.close()
    return (out * 255 + .5).astype(np.uint8)

def grad_text(img, xy, text, font, cols):
    """texto con el degradado de Kiria (de izquierda a derecha)."""
    d = ImageDraw.Draw(img); bb = d.textbbox(xy, text, font=font)
    m = Image.new('L', img.size, 0); ImageDraw.Draw(m).text(xy, text, font=font, fill=255)
    x0, x1 = bb[0], bb[2]
    g = np.zeros((img.size[1], img.size[0], 3), np.float32)
    t = np.clip((np.arange(img.size[0]) - x0) / max(1, x1 - x0), 0, 1)
    c = np.array(cols, np.float32) / 255
    seg = np.where(t < .5, 0, 1); u = np.where(t < .5, t / .5, (t - .5) / .5)
    row = c[seg] * (1 - u[:, None]) + c[seg + 1] * u[:, None]
    g[:] = row[None]
    gi = Image.fromarray((g * 255).astype(np.uint8))
    img.paste(gi, (0, 0), m)

def main():
    base = frame(T)
    im = Image.fromarray(base).convert('RGB')
    # degradado oscuro abajo para que se lea el título
    sh = np.zeros((H, W), np.float32); yy = np.arange(H)[:, None]
    sh[:] = np.clip((yy - 960) / 560, 0, 1) ** 1.3 * 0.8
    arr = np.asarray(im).astype(np.float32) * (1 - sh[..., None])
    im = Image.fromarray(arr.astype(np.uint8))
    d = ImageDraw.Draw(im)
    mono = ImageFont.truetype(FONTS + 'JetBrainsMono-700.woff', 34)
    anton = ImageFont.truetype(FONTS + 'Anton-Regular.woff', 210)
    anton2 = ImageFont.truetype(FONTS + 'Anton-Regular.woff', 150)
    serif = ImageFont.truetype(FONTS + 'InstrumentSerif-Italic.woff', 92)
    # etiqueta
    lab = 'RETO · CAPÍTULO 1'
    tw = d.textlength(lab, font=mono); x0 = (W - tw) / 2 - 28
    d.rounded_rectangle((x0, 1086, x0 + tw + 56, 1152), 33, fill=(255, 200, 61))
    d.text(((W - tw) / 2, 1099), lab, font=mono, fill=(17, 17, 17))
    # título
    t1 = '10 CLIENTES'; w1 = d.textlength(t1, font=anton)
    sd = Image.new('RGBA', im.size, (0, 0, 0, 0)); ds = ImageDraw.Draw(sd)
    ds.text(((W - w1) / 2, 1158 + 10), t1, font=anton, fill=(0, 0, 0, 170))
    t2 = 'EN 30 DÍAS'; w2 = d.textlength(t2, font=anton2)
    ds.text(((W - w2) / 2, 1380 + 10), t2, font=anton2, fill=(0, 0, 0, 170))
    sd = sd.filter(ImageFilter.GaussianBlur(14)); im = Image.alpha_composite(im.convert('RGBA'), sd).convert('RGB'); d = ImageDraw.Draw(im)
    d.text(((W - w1) / 2, 1158), t1, font=anton, fill=(247, 243, 234))
    grad_text(im, ((W - w2) / 2, 1380), t2, anton2, [(255, 77, 97), (180, 92, 255), (79, 125, 255)])
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    im.save(os.path.join(HERE, 'out', 'portada.jpg'), quality=94)
    # 4:5 (lo que se ve en la cuadrícula): de y=300 a 1650
    im.crop((0, 300, W, 1650)).save(os.path.join(HERE, 'out', 'miniatura.jpg'), quality=94)
    print('portada lista (t = %.2f s)' % T)

if __name__ == '__main__':
    main()
