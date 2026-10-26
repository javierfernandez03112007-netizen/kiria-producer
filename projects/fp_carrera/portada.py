"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «FP o carrera».
Base: los dos muñecos señalando el trofeo con la interrogación, el de la carrera en el podio alto (sin HUD):
    COVER=1 node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Título en Impact con contorno, como los subtítulos (FP en turquesa, CARRERA en ámbar)."""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import paste, chip, halo, hex_bgr  # noqa: E402
from engine.subs import word_sprite  # noqa: E402
from engine import post  # noqa: E402

W, H = 1080, 1920
TEAL, AMBER = "#62E3D4", "#FFB547"


def row(img, parts, cy, size, stroke):
    """Renglón de palabras [(texto, color o None)] en Impact con contorno negro, centrado en cy."""
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


def title(img, y, k=1.0):
    paste(img, chip("a un bando no le va a gustar", int(40 * k), "#000000", "#FFFFFF", "bold"), W / 2, y)
    row(img, [("¿FP", TEAL), ("O", None), ("CARRERA?", AMBER)], y + 175 * k, int(150 * k), int(10 * k))
    row(img, [("EN", None), ("INFORMÁTICA", None)], y + 305 * k, int(66 * k), int(6 * k))


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    halo(img, W / 2, 1100, 460, (0.75, 0.8, 0.85), 0.04)
    title(img, 175)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    # miniatura 4:5 (lo que enseña la cuadrícula del perfil): el plano entero reducido, con los lados fundidos a negro,
    # y el mismo título algo más compacto
    y0, s = 120, 0.8
    src = base[y0:y0 + int(1350 / s)]
    small = cv2.resize(src, (int(W * s), 1350), interpolation=cv2.INTER_AREA)
    x0 = (W - small.shape[1]) // 2
    ramp = np.clip(np.minimum(np.arange(small.shape[1]), np.arange(small.shape[1])[::-1]) / 90.0, 0, 1)[None, :, None]
    m = np.zeros((1350, W, 3), np.float32)
    m[:, x0:x0 + small.shape[1]] = small * ramp
    title(m, 62, 0.86)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
