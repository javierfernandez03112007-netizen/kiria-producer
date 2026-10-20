"""Portada 1080x1920 de «Ingeniería Informática desde dentro»: fotograma limpio de la habitación de noche
(sin subtítulos) + título. Los textos quedan dentro del recorte 4:5 de la cuadrícula de Instagram."""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import text, paste, chip, halo  # noqa: E402
from engine import post  # noqa: E402

W, H = 1080, 1920
FRAME = int(sys.argv[1]) if len(sys.argv) > 1 else 705
ORANGE = "#FF5A1F"


def main():
    img = cv2.imread(os.path.join(ROOT, "out", "frames", f"f{FRAME:05d}.jpg")).astype(np.float32) / 255
    g = np.linspace(0, 1, H, dtype=np.float32)
    img *= (1 - 0.72 * np.clip((g - 0.5) / 0.3, 0, 1))[:, None, None]     # oscurece la parte del título
    paste(img, chip("INGENIERÍA INFORMÁTICA", 34, "#000000", "#FFFFFF", "bold"), W / 2, 1150)
    halo(img, W / 2, 1330, 360, (1, 0.45, 0.2), 0.10)
    paste(img, text("¿MERECE", 150, "black", "#FFFFFF", shadow=0.8), W / 2, 1270)
    paste(img, text("LA PENA?", 150, "black", ORANGE, shadow=0.8), W / 2, 1420)
    paste(img, text("La carrera, desde dentro", 50, "semi", "#D8D8D8", shadow=0.7), W / 2, 1560)
    post.grain(img, 0, 0.01)
    out = os.path.join(ROOT, "out", "portada.jpg")
    cv2.imwrite(out, post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada →", out)


if __name__ == "__main__":
    main()
