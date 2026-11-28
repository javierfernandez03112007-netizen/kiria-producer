"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «El escalón torcido».
Base: la casa cortada en la isla que flota, con la escalera de bloques torcidos que sale por el tejado hacia el sol (el primer fotograma, sin rótulos).
Todo lo importante cabe en el centro 4:5:
    python3 portada.py --render      (saca out/cover/cover3d.png con la cámara de la portada y luego compone)
    python3 portada.py               (solo compone)
Título en Impact con contorno, como los subtítulos: la frase del gancho."""
import os
import subprocess
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import paste, chip, hex_bgr  # noqa: E402
from engine.subs import word_sprite  # noqa: E402
from engine import post  # noqa: E402

W, H = 1080, 1920
GOLD, BLUE, CYAN = "#FFD76A", "#A9C1E0", "#5CF2E6"
CAM = "0,2.6,13.2,0,3.75,0,52"                         # la casa entera, algo más cerca que el primer fotograma: la escalera llega al título
MINI_Y = 285                                           # la miniatura 4:5 es el centro de la portada (lo que enseña la cuadrícula de Instagram)


def render():
    env = dict(os.environ, COVER="1", COVER_T="0.6", COVER_CAM=CAM, FPS="60", EVAL="0;")
    subprocess.run(["node", "web/capture.mjs", "out/cover", "0"], cwd=ROOT, env=env, check=True)


def row(img, parts, cy, size, stroke):
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


def title(img, y, k=1.0):
    paste(img, chip("EL EFECTO FOCO · CORNELL", int(40 * k), "#000000", "#FFFFFF", "bold"), W / 2, y + 36 * k)
    row(img, [("UN", None), ("AÑO", CYAN), ("PULIENDO", BLUE)], y + 146 * k, int(112 * k), int(10 * k))
    row(img, [("EL", None), ("MISMO", GOLD), ("ESCALÓN", GOLD)], y + 268 * k, int(112 * k), int(10 * k))


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    title(img, 300)
    post.grain(img, 0, 0.006)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    m = base[MINI_Y:MINI_Y + 1350].copy()
    title(m, 300 - MINI_Y)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    if "--render" in sys.argv:
        render()
    main()
