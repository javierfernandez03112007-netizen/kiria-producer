"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «Gafas de esquí: la luz, por dentro».
Base: el duelo final, gafas de espejo azul arriba y naranjas abajo, con el esquiador detrás (sin HUD):
    COVER=1 COVER_T=57.6 node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Título en Impact con contorno, como los subtítulos (naranja en naranja, espejo en azul)."""
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


def row(img, parts, cy, size, stroke):
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


OR, BL = "#FF8A2A", "#8FB8FF"


def question(img, y, k=1.0):
    row(img, [("¿NARANJA", OR)], y, int(124 * k), int(12 * k))
    row(img, [("O", None), ("ESPEJO?", BL)], y + 132 * k, int(124 * k), int(12 * k))


def title(img, y, k=1.0):
    row(img, [("GAFAS", None), ("DE", None), ("ESQUÍ", None)], y + 70 * k, int(104 * k), int(10 * k))
    paste(img, chip("la luz, por dentro", int(40 * k), "#000000", "#FFFFFF", "bold"), W / 2, y + 178 * k)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    halo(img, W * 0.5, 960, 420, (0.95, 0.8, 0.6), 0.05)
    title(img, 60)
    question(img, 905)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    m = base[285:285 + 1350].copy()
    question(m, 615, 0.95)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
