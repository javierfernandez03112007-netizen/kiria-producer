"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «GTA 6 ocupa 212 gigas».
Base: el móvil con la columna de datos y la ciudad encima (sin HUD):
    COVER=1 COVER_T=2.2 COVER_CAM="3.7,1.75,8.4,0.1,2.1,0,34" node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Título en Impact con contorno, como los subtítulos («212 GB» en dorado). Sin precios."""
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
GOLD, RED = "#FFC24A", "#FF5A4E"


def row(img, parts, cy, size, stroke):
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


def title(img, y, k=1.0):
    row(img, [("GTA", None), ("6", GOLD), ("OCUPA", None)], y + 80 * k, int(124 * k), int(9 * k))
    row(img, [("212", GOLD), ("GB", GOLD)], y + 255 * k, int(196 * k), int(12 * k))
    paste(img, chip("y no te cabría en el móvil", int(44 * k), "#000000", "#FFFFFF", "bold"), W / 2, y + 420 * k)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    g = np.clip(1 - np.arange(H) / 900.0, 0, 1)[:, None, None] ** 1.4      # oscurece arriba para que se lea el título
    img *= 1 - 0.62 * g
    title(img, 150)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    m = base[300:300 + 1350].copy()
    g = np.clip(1 - np.arange(1350) / 640.0, 0, 1)[:, None, None] ** 1.4
    m *= 1 - 0.62 * g
    title(m, 20, 0.85)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
