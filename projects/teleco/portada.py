"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «¿Informática o Teleco?».
Base: fotograma de cerca del tira y afloja (cuerda tensa con chispas), renderizado con cámara propia → out/cover_base.jpg"""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import text, paste, chip, halo  # noqa: E402
from engine import post  # noqa: E402

W, H = 1080, 1920
BLUE, ORNG = "#4FA3FF", "#FF6A1F"


def title(img, cy, size):
    parts = [text("¿INFORMÁTICA", size, "black", BLUE, shadow=0.8), text("o", int(size * 0.8), "black", "#FFFFFF", shadow=0.8), text("TELECO?", size, "black", ORNG, shadow=0.8)]
    paste(img, parts[0], W / 2, cy)
    paste(img, parts[1], W / 2, cy + size * 0.95)
    paste(img, parts[2], W / 2, cy + size * 1.9)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover_base.jpg")).astype(np.float32) / 255
    img = base.copy()
    halo(img, W / 2, 620, 420, (0.3, 0.5, 1.0), 0.08)
    title(img, 480, 122)
    paste(img, chip("dos carreras, una rivalidad", 34, "#000000", "#FFFFFF", "bold"), W / 2, 330)
    post.grain(img, 0, 0.008)
    out = post.finish(img)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), out, [cv2.IMWRITE_JPEG_QUALITY, 95])
    # miniatura 4:5 (lo que enseña la cuadrícula del perfil): mismo diseño algo más compacto
    m = base[H - 1350 - 120:H - 120].copy()
    halo(m, W / 2, 330, 380, (0.3, 0.5, 1.0), 0.08)
    s1 = 112
    p0 = text("¿INFORMÁTICA", s1, "black", BLUE, shadow=0.8); p1 = text("o", int(s1 * 0.8), "black", "#FFFFFF", shadow=0.8); p2 = text("TELECO?", s1, "black", ORNG, shadow=0.8)
    paste(m, chip("dos carreras, una rivalidad", 30, "#000000", "#FFFFFF", "bold"), W / 2, 95)
    paste(m, p0, W / 2, 210); paste(m, p1, W / 2, 316); paste(m, p2, W / 2, 422)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
