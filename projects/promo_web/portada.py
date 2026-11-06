"""Portada (1080x1920) y miniatura 4:5 (1080x1350) del anuncio de kiriaai.com («¿Qué hace que alguien se pare?»).
Base: el primer fotograma (el tarro cae por el borde del móvil gigante), sin HUD:
    COVER=1 COVER_T=0.02 node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Título en Impact con contorno, como los subtítulos («SE PARE» en dorado). Sin precios."""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import paste, chip, hex_bgr  # noqa: E402
from engine.subs import word_sprite  # noqa: E402
from engine import post  # noqa: E402

W, H = 1080, 1920
GOLD = "#FFC24A"


def row(img, parts, cy, size, stroke):
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


def title(img, y, k=1.0):
    row(img, [("¿QUÉ", None), ("HACE", None), ("QUE", None)], y + 80 * k, int(118 * k), int(10 * k))
    row(img, [("ALGUIEN", None), ("SE", GOLD), ("PARE?", GOLD)], y + 215 * k, int(128 * k), int(10 * k))
    paste(img, chip("tu producto, en vídeo · sin cámaras", int(42 * k), "#000000", "#FFFFFF", "bold"), W / 2, y + 350 * k)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    g = np.clip(1 - np.arange(H) / 760.0, 0, 1)[:, None, None] ** 1.5      # oscurece arriba para que se lea el título
    img *= 1 - 0.6 * g
    title(img, 110)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    m = base[200:200 + 1350].copy()
    g = np.clip(1 - np.arange(1350) / 560.0, 0, 1)[:, None, None] ** 1.5
    m *= 1 - 0.6 * g
    title(m, 20, 0.8)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
