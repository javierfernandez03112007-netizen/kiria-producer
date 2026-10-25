"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «No te enjuagues».
Base: la boca abierta de frente, llena de bacterias de colores, renderizada con cámara propia:
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
CYAN = "#5FE6FF"


def title(img, cy, size):
    paste(img, text("NO TE", size, "black", "#FFFFFF", shadow=0.8), W / 2, cy)
    paste(img, text("ENJUAGUES", int(size * 1.08), "black", CYAN, shadow=0.8), W / 2, cy + size * 1.02)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    halo(img, W / 2, 560, 430, (0.37, 0.9, 1.0), 0.06)
    paste(img, chip("después de cepillarte", 38, "#000000", "#FFFFFF", "bold"), W / 2, 330)
    title(img, 480, 132)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    # miniatura 4:5 (lo que enseña la cuadrícula del perfil): mismo diseño algo más compacto
    m = base[250:250 + 1350].copy()
    halo(m, W / 2, 300, 380, (0.37, 0.9, 1.0), 0.06)
    paste(m, chip("después de cepillarte", 33, "#000000", "#FFFFFF", "bold"), W / 2, 95)
    s1 = 122
    paste(m, text("NO TE", s1, "black", "#FFFFFF", shadow=0.8), W / 2, 215)
    paste(m, text("ENJUAGUES", int(s1 * 1.08), "black", CYAN, shadow=0.8), W / 2, 215 + s1 * 1.02)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
