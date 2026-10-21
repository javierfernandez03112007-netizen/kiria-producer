"""Portada 1080x1920 de «Ordenamiento burbuja»: fotograma de un intercambio (dos barras verdes cruzándose) + título
en la franja entre el monitor y las barras, dentro del recorte 4:5 de la cuadrícula de Instagram."""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import text, paste, chip, halo  # noqa: E402
from engine import post  # noqa: E402

W, H = 1080, 1920
FRAME = int(sys.argv[1]) if len(sys.argv) > 1 else 296
GREEN = "#2EE68C"


def main():
    img = cv2.imread(os.path.join(ROOT, "out", "frames", f"f{FRAME:05d}.jpg")).astype(np.float32) / 255
    y = np.arange(H, dtype=np.float32)
    band = np.exp(-((y - 985) / 170) ** 2) * 0.75          # franja oscura suave detrás del título
    img *= (1 - band)[:, None, None]
    halo(img, W / 2, 990, 380, (0.2, 0.9, 0.55), 0.10)
    paste(img, text("ORDENAMIENTO", 70, "black", "#FFFFFF", shadow=0.8), W / 2, 880)
    paste(img, text("BURBUJA", 190, "black", GREEN, shadow=0.8), W / 2, 1005)
    paste(img, chip("el doble for, explicado en C++", 32, "#000000", "#FFFFFF", "bold"), W / 2, 1125)
    post.grain(img, 0, 0.008)
    out = os.path.join(ROOT, "out", "portada.jpg")
    cv2.imwrite(out, post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada →", out)


if __name__ == "__main__":
    main()
