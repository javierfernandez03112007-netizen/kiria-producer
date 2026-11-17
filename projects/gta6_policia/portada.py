"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «GTA 6: la policía ya no te busca a ti».
Base: la ropa sola rodeada de patrullas mientras el maniquí se escabulle (sin HUD):
    COVER=1 COVER_T=0.35 node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Título en Impact con contorno, como los subtítulos (la ropa en rosa, el coche en naranja)."""
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
    row(img, [("EN", None), ("GTA", GOLD), ("6", GOLD)], y + 90 * k, int(150 * k), int(11 * k))
    row(img, [("LA", None), ("POLICÍA", None), ("NO", None)], y + 235 * k, int(112 * k), int(10 * k))
    row(img, [("TE", None), ("BUSCA", None), ("A", None), ("TI", None)], y + 360 * k, int(112 * k), int(10 * k))
    paste(img, chip("busca tu ropa y tu coche", int(44 * k), "#000000", "#FFFFFF", "bold"), W / 2, y + 470 * k)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    halo(img, W / 2, 1250, 560, (0.95, 0.8, 0.75), 0.02)
    title(img, 100)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    m = base[470:470 + 1350].copy()
    title(m, 16, 0.78)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
