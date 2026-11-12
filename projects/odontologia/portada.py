"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «Odontología por dentro».
Base: la dentadura gigante con brackets en la plaza, recién cerrada (sin HUD):
    COVER=1 COVER_T=0.5 node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Título en Impact con contorno, como los subtítulos («no es especialista» en rojo)."""
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
GOLD = "#FFC24A"
RED = "#FF4136"


def row(img, parts, cy, size, stroke):
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


def title(img, y, k=1.0):
    row(img, [("TU", None), ("ORTODONCISTA", None)], y + 100 * k, int(122 * k), int(11 * k))
    row(img, [("NO", RED), ("ES", RED), ("ESPECIALISTA", RED)], y + 235 * k, int(112 * k), int(10 * k))
    paste(img, chip("odontología por dentro · lo que nadie te cuenta", int(36 * k), "#000000", "#FFFFFF", "bold"), W / 2, y + 345 * k)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    halo(img, W / 2, 1150, 520, (0.85, 0.75, 0.5), 0.04)
    title(img, 120)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    m = base[300:300 + 1350].copy()
    title(m, 30, 0.78)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
