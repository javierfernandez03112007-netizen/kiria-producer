"""Retratos de los cuatro candidatos para las pantallas de sus atriles. Son FOTOS REALES de Wikimedia Commons (autor y licencia en FUENTES.md):
se les quita el fondo (assets/fotos/*_recorte.png, hecho con @imgly/background-removal-node, modelo ISNet, sin tocar a la persona), se igualan
(misma distancia entre los ojos y misma altura de ojos: mismo trato) y se ponen sobre un fondo oscuro con el color de su partido.
No se retoca la cara ni el cuerpo: solo recorte, escala, un ajuste suave de luz para que las cuatro se parezcan de tono y un difuminado del
borde de abajo (el busto se funde con la pantalla). También se saca un mapa de relieve (la cabeza sale un poco de la pantalla).

    python3 retratos.py          → web/assets/cand_<id>.jpg (900×1350) y cand_<id>_d.jpg (relieve)
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
W, H = 900, 1350                     # pantalla vertical 2:3: la cara arriba y, debajo, sitio para las medidas (los objetos van delante)
EYE, IOD = (450, 470), 195            # centro entre los ojos y distancia entre ellos, iguales para los cuatro
# ojos en el recorte (izquierdo y derecho de la imagen), medidos con el detector de caras de OpenCV
SRC = {"pp": ((690, 617), (931, 626)), "psoe": ((240, 240), (357, 236)), "vox": ((401, 843), (812, 798)), "fa": ((648, 600), (867, 613))}
COL = {"pp": (0x1f, 0x86, 0xe0), "psoe": (0xe3, 0x06, 0x13), "vox": (0x5d, 0xbb, 0x2a), "fa": (0xff, 0x5a, 0x1f)}   # los mismos de web/src/30_cast.js
LUM = 0.56                            # luz media de la cara (0–1) a la que se acercan las cuatro


def smooth(a, b, x):
    u = np.clip((x - a) / (b - a), 0, 1)
    return u * u * (3 - 2 * u)


def bake(k):
    rgba = np.asarray(Image.open(os.path.join(ROOT, "assets", "fotos", f"{k}_recorte.png")).convert("RGBA")).astype(np.float32) / 255
    rgb, a = rgba[..., :3], rgba[..., 3]
    (x0, y0), (x1, y1) = SRC[k]
    if k == "vox":                      # foto muy cerrada sobre pared blanca: el recorte dejaba medio transparentes la camisa, la corbata y la chaqueta.
        hh, ww = a.shape; yy0 = np.mgrid[0:hh, 0:ww][0].astype(np.float32); low = smooth(1480, 1580, yy0)     # solo por debajo de la barba
        lumv = rgb @ np.float32([0.299, 0.587, 0.114]); dark = cv2.GaussianBlur((lumv < 0.30).astype(np.float32), (0, 0), 2.5)
        a = a * (1 - low) + np.maximum(smooth(0.2, 0.55, a), smooth(0.35, 0.65, dark)) * low
    iod = float(np.hypot(x1 - x0, y1 - y0)); s = IOD / iod; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    # el color del fondo original se queda pegado al borde del pelo: se sustituye por el color de dentro (no se inventa nada: es el del propio pelo/ropa)
    # el recorte automático deja medio transparentes zonas de DENTRO de la persona (una camisa blanca sobre fondo blanco): se cierran;
    # y se quitan los pelos sueltos muy finos, que salían como hilos oscuros
    k9 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (max(3, int(9 / s)) | 1,) * 2); body = cv2.morphologyEx((a > 0.62).astype(np.uint8), cv2.MORPH_CLOSE, k9)
    ff = body.copy(); mask = np.zeros((ff.shape[0] + 2, ff.shape[1] + 2), np.uint8); ffp = cv2.copyMakeBorder(ff, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    mask2 = np.zeros((ffp.shape[0] + 2, ffp.shape[1] + 2), np.uint8); cv2.floodFill(ffp, mask2, (0, 0), 2); holes = (ffp[1:-1, 1:-1] == 0).astype(np.uint8)
    inner = cv2.erode(np.maximum(body, holes), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (max(3, int(7 / s)) | 1,) * 2)).astype(np.float32)
    a = np.maximum(a, inner); a = np.clip((a - 0.30) / 0.70, 0, 1)      # fuera el halo claro del fondo original alrededor del pelo
    a = a * smooth(0.12, 0.45, cv2.GaussianBlur(a, (0, 0), max(1.5, 2.2 / s)))
    solid = (a > 0.92).astype(np.float32); sg = max(2.0, 3.0 / s)
    ext = cv2.GaussianBlur(rgb * solid[..., None], (0, 0), sg) / np.maximum(cv2.GaussianBlur(solid, (0, 0), sg), 1e-4)[..., None]
    rgb = np.where(solid[..., None] > 0, rgb, ext)
    M = np.float32([[s, 0, EYE[0] - cx * s], [0, s, EYE[1] - cy * s]]); inter = cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC
    pm = cv2.warpAffine(rgb * a[..., None], M, (W, H), flags=inter, borderValue=0); al = np.clip(cv2.warpAffine(a, M, (W, H), flags=inter, borderValue=0), 0, 1)
    fg = np.clip(pm / np.maximum(al, 1e-4)[..., None], 0, 1)
    if s > 1.2:                         # foto pequeña (la de Moncloa): algo de nitidez tras ampliarla
        fg = np.clip(fg + 0.6 * (fg - cv2.GaussianBlur(fg, (0, 0), 1.6)), 0, 1)
    # misma luz media en la cara (ganancia suave, sin cambiar colores)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    face = (np.abs(xx - EYE[0]) < IOD * 0.8) & (yy > EYE[1] - IOD * 0.45) & (yy < EYE[1] + IOD * 1.2) & (al > 0.9)
    lum = float((fg[face] @ np.float32([0.299, 0.587, 0.114])).mean()); g = float(np.clip(LUM / lum, 0.85, 1.18)); fg = np.clip(fg * g, 0, 1)
    # el busto se funde con la pantalla por abajo y por los lados de abajo (igual para los cuatro)
    r = np.hypot((xx - EYE[0]) / (W * 0.44), np.maximum(yy - EYE[1] - 40, 0) / (H * 0.40)); vig = 1 - smooth(0.80, 1.06, r); al2 = al * vig
    # fondo: oscuro arriba, el color del partido abajo y un resplandor detrás de la cabeza
    c = np.float32(COL[k]) / 255; v = yy / H; glow = np.exp(-(((xx - EYE[0]) / 430) ** 2 + ((yy - EYE[1] - 30) / 500) ** 2))
    bg = np.float32([0.020, 0.030, 0.062])[None, None, :] * (1 - 0.5 * v[..., None]) + c[None, None, :] * (0.10 + 0.50 * smooth(0.45, 1.05, v)[..., None]) + c[None, None, :] * 0.34 * glow[..., None]
    lines = (np.abs(((xx + yy * 0.55) % 46) - 23) < 0.9).astype(np.float32) * 0.035; bg = np.clip(bg + lines[..., None] * (c[None, None, :] + 0.25), 0, 1)
    out = fg * al2[..., None] + bg * (1 - al2[..., None])
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(ROOT, "web", "assets", f"cand_{k}.jpg"), quality=93)
    # relieve: la silueta redondeada y la cara algo más salida
    d = cv2.GaussianBlur(al2, (0, 0), 46) * 0.55 + cv2.GaussianBlur(al2, (0, 0), 14) * 0.15 + 0.38 * np.exp(-(((xx - EYE[0]) / (IOD * 1.05)) ** 2 + ((yy - EYE[1] - IOD * 0.35) / (IOD * 1.45)) ** 2)) * al2
    d = cv2.GaussianBlur(d, (0, 0), 6); Image.fromarray((np.clip(d / 1.05, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(ROOT, "web", "assets", f"cand_{k}_d.jpg"), quality=90)
    print(k, "escala %.3f" % s, "luz cara %.3f → ×%.2f" % (lum, g))


if __name__ == "__main__":
    for k in (sys.argv[1:] or SRC):
        bake(k)
