"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «La ciudad de los seguidores», episodio 2 (Kiria World).
Base: el rey en el trono gigante, con su corona, y el pueblo alrededor (sin interfaz):
    COVER=1 COVER_T=5.6 node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Título en Impact con contorno, como los subtítulos."""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import paste, chip, halo, hex_bgr  # noqa: E402
from engine.subs import word_sprite  # noqa: E402
from engine import post  # noqa: E402

W, H = 1080, 1920
PINK, ORNG, GOLD, GREEN = "#FF5FB8", "#FF9A3D", "#FFD76A", "#7CF0A9"


def row(img, parts, cy, size, stroke):
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


def title(img, y, k=1.0):
    row(img, [("KIRIA", None), ("WORLD", GREEN)], y + 90 * k, int(150 * k), int(11 * k))
    row(img, [("YA", None), ("TIENE", None), ("REY", GOLD)], y + 235 * k, int(124 * k), int(10 * k))
    paste(img, chip("¿qué ley pondrías tú?", int(46 * k), "#000000", "#FFFFFF", "bold"), W / 2, y + 350 * k)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    title(img, 110)
    post.grain(img, 0, 0.006)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    m = base[300:300 + 1350].copy()
    title(m, 16, 0.8)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
