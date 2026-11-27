"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «29N: el debate a cuatro».
Base: plano abierto de los cuatro atriles (fotos reales) con sus relojes de posesión y el marcador de pabellón encima (el reloj del bloque corriendo).
Todo lo importante cabe en el centro 4:5:
    python3 portada.py --render      (saca out/cover/cover3d.png con la cámara de la portada y luego compone)
    python3 portada.py               (solo compone)
Título en Impact con contorno, como los subtítulos."""
import json
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
RED, GOLD, CYAN = "#FF5A4E", "#FFD76A", "#5CF2E6"
CAM = "0,2.75,7.4,0,3.6,-0.6,50"                       # plano abierto algo picado hacia arriba: título, marcador y las cuatro pantallas en el centro 4:5
PAD = ""
MINI_Y = 285                                           # la miniatura 4:5 es el centro de la portada (lo que enseña la cuadrícula de Instagram)


def render():
    lines = json.load(open(os.path.join(ROOT, "tiempos.json")))
    t = [w for w in lines[0]["words"] if w["w"].lower().startswith("baloncesto")][0]["start"] + 0.3      # el reloj del bloque corriendo y los cuatro relojes de posesión a la vista
    env = dict(os.environ, COVER="1", COVER_T=f"{t:.2f}", COVER_CAM=CAM, FPS="60",
               EVAL="0;")
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
    paste(img, chip("29N · DEBATE A CUATRO", int(42 * k), "#000000", "#FFFFFF", "bold"), W / 2, y + 36 * k)
    row(img, [("EL", None), ("DEBATE", GOLD)], y + 140 * k, int(112 * k), int(10 * k))
    row(img, [("EN", None), ("4", CYAN), ("ATAQUES", CYAN)], y + 262 * k, int(112 * k), int(10 * k))
    row(img, [("UNO", None), ("DE", None), ("CADA", None), ("UNO", None)], y + 380 * k, int(96 * k), int(10 * k))


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    title(img, 292)
    post.grain(img, 0, 0.006)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    m = base[MINI_Y:MINI_Y + 1350].copy()
    title(m, 292 - MINI_Y)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    if "--render" in sys.argv:
        render()
    main()
