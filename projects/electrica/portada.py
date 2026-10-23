"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «Ingeniería Eléctrica».
Base: la ciudad a oscuras, el interruptor gigante y la ingeniera con la bombilla encendida, renderizado con cámara propia:
    COVER=1 node web/capture.mjs out/cover → out/cover/cover3d.png"""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import text, paste, chip, halo  # noqa: E402
from engine import post  # noqa: E402

W, H = 1080, 1920
YELLOW = "#FFD23F"


def title(img, cy, size):
    paste(img, text("INGENIERÍA", size, "black", "#FFFFFF", shadow=0.8), W / 2, cy)
    paste(img, text("ELÉCTRICA", int(size * 1.08), "black", YELLOW, shadow=0.8), W / 2, cy + size * 1.02)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    halo(img, W / 2, 560, 430, (1.0, 0.82, 0.25), 0.07)
    paste(img, chip("¿quién vuelve a encender la luz?", 36, "#000000", "#FFFFFF", "bold"), W / 2, 330)
    title(img, 480, 128)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    # miniatura 4:5 (lo que enseña la cuadrícula del perfil): mismo diseño algo más compacto
    m = base[H - 1350 - 50:H - 50].copy()
    halo(m, W / 2, 300, 380, (1.0, 0.82, 0.25), 0.07)
    paste(m, chip("¿quién vuelve a encender la luz?", 31, "#000000", "#FFFFFF", "bold"), W / 2, 95)
    s1 = 118
    paste(m, text("INGENIERÍA", s1, "black", "#FFFFFF", shadow=0.8), W / 2, 215)
    paste(m, text("ELÉCTRICA", int(s1 * 1.08), "black", YELLOW, shadow=0.8), W / 2, 215 + s1 * 1.02)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
