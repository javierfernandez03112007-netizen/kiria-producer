"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «29N, capítulo 0: los cuatro en sus atriles».
Base: plano general del plató con las cuatro pantallas (fotos reales) y los atriles, con la pantalla grande del fondo sin texto (sin interfaz):
    COVER=1 COVER_T=9.9 EVAL="const _w = wallDraw; wallDraw = st => _w({ ...st, cita: 0, man: 0, base: 0, hemi: 0, hemiA: 0 });" FPS=60 node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Título en Impact con contorno, como los subtítulos: la frase del gancho."""
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
RED, GOLD, CYAN = "#FF5A4E", "#FFD76A", "#5CF2E6"


def row(img, parts, cy, size, stroke):
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


def title(img, y, k=1.0):
    paste(img, chip("29N · CAPÍTULO 0", int(44 * k), "#000000", "#FFFFFF", "bold"), W / 2, y + 40 * k)
    row(img, [("EL", None), ("DOMINGO", GOLD)], y + 165 * k, int(128 * k), int(10 * k))
    row(img, [("NO", RED), ("ELIGES", None)], y + 305 * k, int(128 * k), int(10 * k))
    row(img, [("PRESIDENTE", GOLD)], y + 445 * k, int(128 * k), int(10 * k))


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    title(img, 250)
    post.grain(img, 0, 0.006)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    m = base[285:285 + 1350].copy()
    title(m, 40, 0.92)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
