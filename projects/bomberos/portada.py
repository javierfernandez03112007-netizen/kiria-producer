"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «Bomberados».
Base: los diez cascos justo antes de caer, ocho en rojo y dos en oro (sin HUD):
    COVER=1 COVER_T=2.55 COVER_CAM="0.3,1.5,4.8,0,1.55,0,34" node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Título en Impact con contorno, como los subtítulos (el 8 y PLAZA en rojo, ¿POR QUÉ? en brasa)."""
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
RED, EMB = "#FF5A4E", "#FF7A2F"


def row(img, parts, cy, size, stroke):
    """Renglón de palabras [(texto, color o None)] en Impact con contorno negro, centrado en cy."""
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


def shade(img, y1, k=0.7):
    """Degradado oscuro arriba para que el título se lea."""
    a = np.clip(1 - np.arange(img.shape[0]) / y1, 0, 1)[:, None, None] ** 1.3 * k
    img *= 1 - a


def title(img, y, k=1.0):
    paste(img, chip("oposición a bombero · Madrid", int(40 * k), "#000000", "#FFFFFF", "bold"), W / 2, y)
    row(img, [("8", RED), ("DE", None), ("CADA", None), ("10", None)], y + 175 * k, int(150 * k), int(10 * k))
    row(img, [("SIN", None), ("PLAZA", RED)], y + 335 * k, int(160 * k), int(11 * k))
    row(img, [("¿POR", EMB), ("QUÉ?", EMB)], y + 480 * k, int(96 * k), int(8 * k))


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    shade(img, 760)
    title(img, 150)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    # miniatura 4:5 (lo que enseña la cuadrícula del perfil): los cascos centrados, reducidos, con los lados fundidos a negro
    y0, s = 0, 0.78
    src = base[y0:y0 + int(1350 / s)]
    small = cv2.resize(src, (int(W * s), 1350), interpolation=cv2.INTER_AREA)
    x0 = (W - small.shape[1]) // 2
    ramp = np.clip(np.minimum(np.arange(small.shape[1]), np.arange(small.shape[1])[::-1]) / 90.0, 0, 1)[None, :, None]
    m = np.zeros((1350, W, 3), np.float32)
    m[:, x0:x0 + small.shape[1]] = small * ramp
    shade(m, 560)
    title(m, 62, 0.82)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
