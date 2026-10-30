"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «Ingeniería Aeroespacial» (mismo diseño que «Industrial»).
Base: el graduado con las alas de ingeniero flotando sin llegar al pecho y la interrogación en el hueco, sobre el mar de nubes:
    COVER=1 COVER_T=5.95 COVER_CAM="-2.2,2.15,4.1,-0.05,1.95,0.35,34" node web/capture.mjs out/cover 0 → out/cover/cover3d.png"""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import text, paste, chip, halo  # noqa: E402
from engine import post  # noqa: E402

W, H = 1080, 1920
YELLOW = "#FFC83D"


def title(img, cy, size):
    paste(img, text("INGENIERÍA", size, "black", "#FFFFFF", shadow=0.8), W / 2, cy)
    paste(img, text("AEROESPACIAL", int(size * 1.02), "black", YELLOW, shadow=0.8), W / 2, cy + size * 1.02)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    halo(img, W / 2, 560, 430, (1.0, 0.8, 0.3), 0.06)
    paste(img, chip("¿qué te falta al acabar?", 38, "#000000", "#FFFFFF", "bold"), W / 2, 330)
    title(img, 480, 112)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    # miniatura 4:5 (lo que enseña la cuadrícula del perfil): mismo diseño algo más compacto
    m = base[330:330 + 1350].copy()
    halo(m, W / 2, 300, 380, (1.0, 0.8, 0.3), 0.06)
    paste(m, chip("¿qué te falta al acabar?", 33, "#000000", "#FFFFFF", "bold"), W / 2, 95)
    s1 = 102
    paste(m, text("INGENIERÍA", s1, "black", "#FFFFFF", shadow=0.8), W / 2, 215)
    paste(m, text("AEROESPACIAL", int(s1 * 1.02), "black", YELLOW, shadow=0.8), W / 2, 215 + s1 * 1.02)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
