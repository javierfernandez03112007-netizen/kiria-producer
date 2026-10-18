"""Portada 1080x1920: giroscopio 3D (render aparte, sin textos) + título. La zona clave cae en el centro
(lo que se ve en la cuadrícula del perfil)."""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import text, paste, chip, halo, WHITE  # noqa: E402
from engine import post  # noqa: E402

W, H = 1080, 1920


def main():
    img = cv2.imread(os.path.join(ROOT, "out", "cover3d.png")).astype(np.float32) / 255
    img = cv2.resize(img, (W, H))
    # oscurecer arriba y abajo para que el texto se lea
    g = np.linspace(0, 1, H, dtype=np.float32)
    shade = 1 - 0.55 * np.clip((0.42 - g) / 0.42, 0, 1) - 0.5 * np.clip((g - 0.72) / 0.28, 0, 1)
    img *= shade[:, None, None]
    cy = H / 2
    paste(img, chip("EURÍBOR · SEPTIEMBRE 2026", 34, "#000000", "#FFFFFF", "bold"), W / 2, cy - 430)
    paste(img, text("TU HIPOTECA\nACABA DE SUBIR", 104, "black", "#FFFFFF", shadow=0.7), W / 2, cy - 260)
    halo(img, W / 2, cy + 330, 260, WHITE, 0.12)
    paste(img, text("3,247 %", 230, "black", "#FFFFFF", shadow=0.8), W / 2, cy + 330)
    paste(img, text("+1,075 puntos en un año", 46, "semi", "#D0D0D0", shadow=0.6), W / 2, cy + 480)
    paste(img, text("kiria.ai", 50, "black", "#FFFFFF", shadow=0.6), W / 2, cy + 600)
    post.grain(img, 0, 0.012)
    out = os.path.join(ROOT, "out", "portada.jpg")
    cv2.imwrite(out, post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada →", out)


if __name__ == "__main__":
    main()
