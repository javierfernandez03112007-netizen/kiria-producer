#!/usr/bin/env python3
"""Recorta un envase fotografiado sobre un fondo LISO DE COLOR (con su sombra) y lo deja con fondo transparente.

  python3 recorta_fondo.py <foto> <salida.png>

Sirve para las fotos de la web de marca que vienen sobre un fondo de color de campaña en vez de sobre blanco.
No inventa nada: solo quita el fondo. El fondo se reconoce porque es el color de las esquinas, más oscuro donde
hay sombra (mismo tono, menos luz), o porque es transparente. Los bordes se suavizan calculando cuánto de cada
píxel del contorno es envase y cuánto fondo.
"""
import sys
from collections import deque
import numpy as np
from PIL import Image

def shift(m, dy, dx):
    """Desplaza una matriz rellenando con el borde (sin dar la vuelta)."""
    out = np.empty_like(m)
    H, W = m.shape[:2]
    ys = np.clip(np.arange(H) - dy, 0, H - 1); xs = np.clip(np.arange(W) - dx, 0, W - 1)
    return m[ys][:, xs]

N8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
def erode(mask, n=1):
    for _ in range(n):
        m = mask.copy()
        for dy, dx in N8: m &= shift(mask, dy, dx)
        mask = m
    return mask

def spread(color, known, steps):
    """Extiende los colores conocidos hacia los píxeles vecinos que no lo son (media de los vecinos conocidos)."""
    color = color.copy(); known = known.copy()
    for _ in range(steps):
        acc = np.zeros_like(color); cnt = np.zeros(known.shape, float)
        for dy, dx in N8:
            k = shift(known, dy, dx); acc += shift(color, dy, dx) * k[..., None]; cnt += k
        new = (~known) & (cnt > 0)
        color[new] = acc[new] / cnt[new][:, None]; known |= new
    return color, known

def cutout(src, dst, res_max=6.0, k_min=0.6, alpha_bg=70, pad=40, hole_min=80, hole_res=1.5):
    a = np.array(Image.open(src).convert('RGBA')).astype(float)
    H, W = a.shape[:2]; rgb, al = a[..., :3], a[..., 3]
    opaque = [a[y, x, :3] for y, x in ((3, 3), (3, W - 4), (H - 4, 3), (H - 4, W - 4)) if a[y, x, 3] > 250]
    if not opaque: raise SystemExit('Las esquinas son transparentes: esta foto no necesita este recorte')
    B = np.median(np.array(opaque), axis=0)
    k = (rgb @ B) / (B @ B); res = np.linalg.norm(rgb - k[..., None] * B, axis=-1)
    cand = ((res < res_max) & (k >= k_min) & (k <= 1.02)) | (al <= alpha_bg)        # fondo, sombra sobre el fondo o transparente
    ys, xs = np.where(~cand)
    y0, y1, x0, x1 = max(0, ys.min() - pad), min(H, ys.max() + pad + 1), max(0, xs.min() - pad), min(W, xs.max() + pad + 1)
    a, rgb, al, cand = a[y0:y1, x0:x1], rgb[y0:y1, x0:x1], al[y0:y1, x0:x1], cand[y0:y1, x0:x1]
    h, w = cand.shape
    # fondo = lo que se alcanza desde el borde pasando solo por píxeles «de fondo»
    bg = np.zeros((h, w), bool); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if cand[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if cand[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and cand[yy, xx] and not bg[yy, xx]: bg[yy, xx] = True; q.append((yy, xx))
    # huecos del envase por los que se ve el fondo (p. ej. entre la boquilla y el cuello): son fondo EXACTO (residuo casi 0) y no
    # letras o dibujos de la etiqueta de un color parecido, que se quedan
    r_c = res[y0:y1, x0:x1]; seen = bg.copy(); holes = 0
    for sy, sx in zip(*np.where(cand & ~bg)):
        if seen[sy, sx]: continue
        seen[sy, sx] = True; q = deque([(sy, sx)]); pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and cand[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; q.append((yy, xx))
        P = np.array(pts)
        if len(pts) >= hole_min and r_c[P[:, 0], P[:, 1]].mean() < hole_res:
            bg[P[:, 0], P[:, 1]] = True; holes += 1
            print(f'  hueco con fondo a la vista: {len(pts)} px en x {P[:,1].min()+x0}..{P[:,1].max()+x0}, y {P[:,0].min()+y0}..{P[:,0].max()+y0}')
    fg = ~bg
    comp = rgb * (al[..., None] / 255) + 255 * (1 - al[..., None] / 255)             # todo sobre blanco: así el fondo transparente con sombra también es «un color»
    inner, outer = erode(fg, 1), erode(bg, 1)
    band = ~inner & ~outer                                                           # el contorno: aquí cada píxel es mezcla de envase y fondo
    F, _ = spread(np.where(inner[..., None], comp, 0), inner, 3)
    G, _ = spread(np.where(outer[..., None], comp, 0), outer, 3)
    d = F - G; den = (d * d).sum(-1)
    t = np.clip(((comp - G) * d).sum(-1) / np.maximum(den, 1e-6), 0, 1)
    t = np.where(den < 30, fg.astype(float), t)                                      # envase y fondo casi iguales: no se puede medir, vale la máscara
    alpha = np.where(inner, 1.0, np.where(outer, 0.0, t))
    un = np.clip((comp - (1 - alpha[..., None]) * G) / np.maximum(alpha[..., None], 1e-3), 0, 255)   # color del envase sin la parte de fondo
    col = np.where(inner[..., None], comp, np.where((alpha > .6)[..., None], un, F))
    out = np.dstack([col, alpha * 255]).round().clip(0, 255).astype('uint8')
    Image.fromarray(out, 'RGBA').save(dst)
    print(f'fondo {tuple(int(v) for v in B)} · envase {int(fg.sum())} px · contorno {int(band.sum())} px · recorte {w}x{h} -> {dst}')

if __name__ == '__main__':
    if len(sys.argv) != 3: print(__doc__); sys.exit(1)
    cutout(sys.argv[1], sys.argv[2])
