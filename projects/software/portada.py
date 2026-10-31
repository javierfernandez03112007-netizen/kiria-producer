"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «Software vs Informática».
Base: el choque de guantes en el ring (sin HUD):
    COVER=1 COVER_T=3.05 COVER_CAM="0.0,0.6,2.55,0,0.47,0,32" node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Título en Impact con contorno, como los subtítulos (SOFTWARE en ámbar, INFORMÁTICA en turquesa)."""
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
TEAL, AMBER = "#62E3D4", "#FFB547"


def row(img, parts, cy, size, stroke):
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


def title(img, y, k=1.0):
    paste(img, chip("según el BOE, una es parte de la otra", int(38 * k), "#000000", "#FFFFFF", "bold"), W / 2, y)
    row(img, [("SOFTWARE", AMBER)], y + 160 * k, int(150 * k), int(10 * k))
    row(img, [("VS", None)], y + 290 * k, int(90 * k), int(8 * k))
    row(img, [("INFORMÁTICA", TEAL)], y + 415 * k, int(140 * k), int(10 * k))


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    halo(img, W / 2, 1000, 520, (0.75, 0.8, 0.85), 0.05)
    title(img, 170)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    # miniatura 4:5: el ring algo más abajo y el título compacto arriba
    m = base[220:220 + 1350].copy()
    title(m, 70, 0.8)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
