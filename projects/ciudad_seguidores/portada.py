"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «La ciudad de los seguidores», episodio 1.
Base: el trono gigante vacío en medio del campamento, rodeado de gente (sin interfaz):
    COVER=1 COVER_T=26.6 node web/capture.mjs out/cover 0 → out/cover/cover3d.png
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
PINK, ORNG, GOLD = "#FF5FB8", "#FF9A3D", "#FFD76A"


def row(img, parts, cy, size, stroke):
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


def title(img, y, k=1.0):
    row(img, [("CADA", None), ("SEGUIDOR", GOLD)], y + 90 * k, int(132 * k), int(11 * k))
    row(img, [("VIVE", None), ("EN", None), ("ESTA", None)], y + 225 * k, int(118 * k), int(10 * k))
    row(img, [("CIUDAD", PINK)], y + 368 * k, int(150 * k), int(11 * k))
    paste(img, chip("¿quién se sienta en el trono?", int(44 * k), "#000000", "#FFFFFF", "bold"), W / 2, y + 490 * k)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    title(img, 90)
    post.grain(img, 0, 0.006)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    m = base[420:420 + 1350].copy()
    title(m, 10, 0.74)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
