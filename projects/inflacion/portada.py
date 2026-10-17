"""Portada 1080x1920 (no es un fotograma del vídeo). La zona clave cae en el centro 1080x1080,
que es lo que se ve en la cuadrícula del perfil."""
import os
import sys

import cv2

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import W, H, HEX, AMBER, MINT, text, paste, halo, chip, glass, rrect, scenery, camera  # noqa
from engine import post  # noqa: E402


def main(dst=os.path.join(ROOT, "out", "portada.jpg")):
    img = camera(scenery("juego", seed=3), 0, 1, 1.0, 1.0)
    img = img * 0.6 + 0.4 * img.mean()  # aún menos contraste que en el vídeo
    post.vignette(img)
    cy = H / 2
    paste(img, chip("IPC · SEPTIEMBRE 2026", 34, HEX["navy"], HEX["mint"], "bold"), W / 2, cy - 330)
    paste(img, text("INFLACIÓN", 130, "black", HEX["white"]), W / 2, cy - 200)
    halo(img, W / 2, cy + 20, 420, AMBER, 0.3)
    paste(img, text("4,9 %", 300, "black", HEX["amber"], shadow=0.6), W / 2, cy + 20)
    paste(img, text("El boss final\nde tu cartera", 70, "bold", HEX["white"]), W / 2, cy + 280)
    paste(img, text("kiria.ai", 54, "black", HEX["white"]), W / 2, cy + 470)
    halo(img, W / 2 - 100, cy + 476, 20, MINT, 0.6)
    post.grain(img, 0, 0.018)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    cv2.imwrite(dst, post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada →", dst)


if __name__ == "__main__":
    main()
