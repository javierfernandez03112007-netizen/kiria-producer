"""Portada 1080x1920 de «Soy Kiria»: un fotograma limpio de la fábrica de datos (sin subtítulos) + título."""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import text, paste, chip, halo, WHITE  # noqa: E402
from engine import post  # noqa: E402

W, H = 1080, 1920
FRAME = int(sys.argv[1]) if len(sys.argv) > 1 else 500


def main():
    img = cv2.imread(os.path.join(ROOT, "out", "frames", f"f{FRAME:05d}.jpg")).astype(np.float32) / 255
    g = np.linspace(0, 1, H, dtype=np.float32)
    img *= (1 - 0.45 * np.clip((g - 0.55) / 0.45, 0, 1))[:, None, None]
    cy = H / 2
    paste(img, chip("PRESENTACIÓN", 34, "#000000", "#FFFFFF", "bold"), W / 2, cy + 230)
    halo(img, W / 2, cy + 390, 300, WHITE, 0.10)
    paste(img, text("SOY KIRIA", 150, "black", "#FFFFFF", shadow=0.8), W / 2, cy + 390)
    paste(img, text("La IA que lee la economía por ti", 48, "semi", "#D8D8D8", shadow=0.7), W / 2, cy + 520)
    paste(img, text("kiria.ai", 50, "black", "#FFFFFF", shadow=0.6), W / 2, cy + 640)
    post.grain(img, 0, 0.012)
    out = os.path.join(ROOT, "out", "portada.jpg")
    cv2.imwrite(out, post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada →", out)


if __name__ == "__main__":
    main()
