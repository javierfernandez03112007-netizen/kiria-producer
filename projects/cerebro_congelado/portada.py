"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «Por qué te duele la cabeza al comer helado (cerebro congelado)».
Base: el heladero congelado (cara de hielo, ojos como platos, carámbanos en el bigote), sin HUD:
    COVER=1 COVER_T=0.62 COVER_CAM="-1.2,0.1,5.9,-0.1,0.1,0.5,34" node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Título en Impact con contorno, como los subtítulos («¿da artritis?» en dorado)."""
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
ICE = "#8FD3FF"


def row(img, parts, cy, size, stroke, maxw=1000):
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    tot = sum(ws) + sp * (len(ws) - 1)
    if tot > maxw:                                   # si no cabe, la fila se hace más pequeña
        return row(img, parts, cy, int(size * maxw / tot), max(4, int(stroke * maxw / tot)), maxw)
    x = (W - tot) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


def title(img, y, k=1.0):
    row(img, [("¿POR", None), ("QUÉ", None), ("DUELE", None)], y + 95 * k, int(116 * k), int(11 * k), 1000 * k)
    row(img, [("EL", ICE), ("HELADO?", ICE)], y + 235 * k, int(140 * k), int(13 * k), 1000 * k)
    paste(img, chip("tu cerebro, por dentro · y el truco para quitarlo", int(36 * k), "#000000", "#FFFFFF", "bold"), W / 2, y + 360 * k)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    title(img, 120)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    m = base[380:380 + 1350].copy()
    title(m, 20, 0.74)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
