"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «El perro robot con neuronas humanas».
Base: el perro quieto (t = 5 s) visto de frente y algo de lado, sin HUD:
    COVER=1 COVER_T=5.0 COVER_CAM=2.2,0.75,0.92,0.22,0.56,0,34 node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Título en Impact con contorno, como los subtítulos («CEREBRO» en rosa, el color de las neuronas). Sin precios."""
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
PINK = "#FF5FA8"


def row(img, parts, cy, size, stroke):
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


def title(img, y, k=1.0):
    row(img, [("ESTE", None), ("PERRO", None), ("ROBOT", None)], y + 80 * k, int(122 * k), int(10 * k))
    row(img, [("NO", None), ("TIENE", None), ("CEREBRO", PINK)], y + 218 * k, int(132 * k), int(10 * k))
    paste(img, chip("lo guían neuronas humanas vivas", int(44 * k), "#000000", "#FFFFFF", "bold"), W / 2, y + 358 * k)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    g = np.clip(1 - np.arange(H) / 760.0, 0, 1)[:, None, None] ** 1.5      # oscurece arriba para que se lea el título
    img *= 1 - 0.6 * g
    title(img, 150)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    m = base[330:330 + 1350].copy()
    g = np.clip(1 - np.arange(1350) / 560.0, 0, 1)[:, None, None] ** 1.5
    m *= 1 - 0.6 * g
    title(m, 20, 0.8)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
