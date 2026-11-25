"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «29N: el PP» (capítulo de un partido).
Base: de frente al atril del partido, con su pantalla (foto real) y, encima, el libro del programa abierto por la página «IRPF más bajo según los hijos»
(la columna del cuánto son interrogaciones). Todo lo importante cabe en el centro 4:5:
    python3 portada.py --render      (saca out/cover/cover3d.png con la cámara de la portada y luego compone)
    python3 portada.py               (solo compone)
Título en Impact con contorno, como los subtítulos: la frase del gancho."""
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
CAM = "0.55,2.75,4.6,0.55,2.95,-0.3,52"              # posición, punto de mira y ángulo de la cámara de la portada: de frente al atril del partido
PAD = "S.book.position.set(0.55, 2.9, -0.1); S.book.scale.setScalar(0.66); S.book.rotation.z = 0; S.book.visible = true;"   # el libro, encima de su pantalla (solo en la portada)
MINI_Y = 285                                           # la miniatura 4:5 es el centro de la portada (lo que enseña la cuadrícula de Instagram)


def render():
    lines = json.load(open(os.path.join(ROOT, "tiempos.json")))
    t = [w for w in lines[1]["words"] if w["w"].lower().startswith("¿cuánto")][0]["start"] + 0.2      # las hojas quietas y las tres interrogaciones a la vista
    env = dict(os.environ, COVER="1", COVER_T=f"{t:.2f}", COVER_CAM=CAM, FPS="60",
               EVAL="const _p = bookAt; bookAt = t => { _p(t); " + PAD + " };")
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
    paste(img, chip("29N · VOX", int(42 * k), "#000000", "#FFFFFF", "bold"), W / 2, y + 36 * k)
    row(img, [("BAJAR", None), ("EL", None), ("IRPF", GOLD)], y + 140 * k, int(108 * k), int(10 * k))
    row(img, [("SEGÚN", None), ("LOS", None), ("HIJOS:", GOLD)], y + 260 * k, int(108 * k), int(10 * k))
    row(img, [("¿CUÁNTO?", CYAN)], y + 380 * k, int(108 * k), int(10 * k))


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
