"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «Carga sin cable».
Base: el móvil despiezado de pie sobre el cargador, con la onda de voz entre las dos bobinas (sin HUD):
    COVER=1 node web/capture.mjs out/cover 0 → out/cover/cover3d.png"""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import text, paste, chip, halo  # noqa: E402
from engine import post  # noqa: E402

W, H = 1080, 1920
AMBER = "#FFB547"


def title(img, cy, size):
    paste(img, text("TU MÓVIL HABLA", size, "black", "#FFFFFF", shadow=0.85), W / 2, cy)
    paste(img, text("CON EL CARGADOR", size, "black", AMBER, shadow=0.85), W / 2, cy + size * 1.05)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    halo(img, W / 2, 1180, 420, (0.35, 0.9, 0.85), 0.05)
    paste(img, chip("¿y qué le dice?", 40, "#000000", "#FFFFFF", "bold"), W / 2, 205)
    title(img, 345, 104)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    # miniatura 4:5 (lo que enseña la cuadrícula del perfil): el plano entero reducido (cargador incluido), con los lados
    # fundidos a negro, y el mismo título algo más compacto
    src = base[230:1900]
    sh = 1350 / src.shape[0]
    small = cv2.resize(src, (int(src.shape[1] * sh), 1350), interpolation=cv2.INTER_AREA)
    x0 = (W - small.shape[1]) // 2
    ramp = np.clip(np.minimum(np.arange(small.shape[1]), np.arange(small.shape[1])[::-1]) / 90.0, 0, 1)[None, :, None]
    m = np.zeros((1350, W, 3), np.float32)
    m[:, x0:x0 + small.shape[1]] = small * ramp
    halo(m, W / 2, 900, 360, (0.35, 0.9, 0.85), 0.05)
    paste(m, chip("¿y qué le dice?", 34, "#000000", "#FFFFFF", "bold"), W / 2, 72)
    s1 = 90
    paste(m, text("TU MÓVIL HABLA", s1, "black", "#FFFFFF", shadow=0.85), W / 2, 178)
    paste(m, text("CON EL CARGADOR", s1, "black", AMBER, shadow=0.85), W / 2, 178 + s1 * 1.05)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
