"""Portada (1080x1920) y miniatura de la cuadrícula (1080x1350, recorte 4:5) de «Ingeniería Mecánica desde dentro».
Base: fotograma de cerca del gancho (un maniquí cayendo a la piscina), renderizado con cámara propia:
    node <cover.mjs> out/cover 1.34   →  out/cover_base.jpg
"""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import text, paste, chip, halo  # noqa: E402
from engine import post  # noqa: E402

W, H = 1080, 1920
ORANGE = "#FF5A1F"


def main():
    img = cv2.imread(os.path.join(ROOT, "out", "cover_base.jpg")).astype(np.float32) / 255
    g = np.linspace(0, 1, H, dtype=np.float32)
    img *= (1 - 0.55 * np.clip((0.42 - g) / 0.2, 0, 1))[:, None, None]        # cielo algo más oscuro tras el título
    paste(img, chip("INGENIERÍA MECÁNICA", 34, "#000000", "#FFFFFF", "bold"), W / 2, 400)
    halo(img, W / 2, 560, 360, (1, 0.45, 0.2), 0.10)
    paste(img, text("¿MERECE", 150, "black", "#FFFFFF", shadow=0.8), W / 2, 510)
    paste(img, text("LA PENA?", 150, "black", ORANGE, shadow=0.8), W / 2, 660)
    paste(img, text("La carrera, desde dentro", 50, "semi", "#D8D8D8", shadow=0.7), W / 2, 790)
    post.grain(img, 0, 0.01)
    out = post.finish(img)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), out, [cv2.IMWRITE_JPEG_QUALITY, 95])
    # miniatura 4:5 (cuadrícula del perfil): se baja el encuadre para que se vea la caída y el título va en una línea
    base = cv2.imread(os.path.join(ROOT, "out", "cover_base.jpg")).astype(np.float32) / 255
    m = base[H - 1350:].copy(); gm = np.linspace(0, 1, 1350, dtype=np.float32)
    m *= (1 - 0.6 * np.clip((0.3 - gm) / 0.3, 0, 1))[:, None, None]
    paste(m, chip("INGENIERÍA MECÁNICA", 30, "#000000", "#FFFFFF", "bold"), W / 2, 70)
    halo(m, W / 2, 175, 300, (1, 0.45, 0.2), 0.10)
    s1, s2 = text("¿MERECE ", 96, "black", "#FFFFFF", shadow=0.8), text("LA PENA?", 96, "black", ORANGE, shadow=0.8)
    w1, w2 = s1[1].shape[1] - 67, s2[1].shape[1] - 67; x = W / 2 - (w1 + w2) / 2
    paste(m, s1, x + w1 / 2, 175); paste(m, s2, x + w1 + w2 / 2, 175)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada →", os.path.join(ROOT, "out", "portada.jpg"), "· miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
