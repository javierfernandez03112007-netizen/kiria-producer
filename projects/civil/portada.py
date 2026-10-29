"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «Ingeniería Civil».
Base: el puente desplegado sobre el plano y la casa delante (sin HUD):
    COVER=1 COVER_T=3.4 COVER_CAM="3.45,0.85,2.2,0.75,0.38,-0.05,32" node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Título en Impact con contorno, como los subtítulos (CAMINOS en ámbar, el «NO» en rojo); etiquetas «ARQUITECTO ✓» sobre el
puente y el sello rojo «NO» sobre la casa."""
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
TEAL, AMBER, RED = "#62E3D4", "#FFB547", "#FF5247"


def row(img, parts, cy, size, stroke):
    """Renglón de palabras [(texto, color o None)] en Impact con contorno negro, centrado en cy."""
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


def stamp(img, txt, cx, cy, size, col, rot=-8, k=1.0):
    """Sello: recuadro y texto en Impact del mismo color, girado."""
    rgb, a, pad = word_sprite(txt, int(size * k), int(6 * k), hex_bgr(col), "impact")
    h, w = a.shape[:2]
    m = int(26 * k)
    S = np.zeros((h + 2 * m, w + 2 * m, 3), np.float32); A = np.zeros((h + 2 * m, w + 2 * m), np.float32)
    S[m:m + h, m:m + w] = rgb; A[m:m + h, m:m + w] = a
    c = np.array(hex_bgr(col), np.float32) / 255 if max(hex_bgr(col)) > 1 else np.array(hex_bgr(col), np.float32)
    lw = int(12 * k)
    ys, xs = np.where(A > 0.2)
    cv2.rectangle(A, (int(xs.min() - 22 * k), int(ys.min() - 16 * k)), (int(xs.max() + 22 * k), int(ys.max() + 16 * k)), 1.0, lw)
    S[(A > 0) & (S.sum(-1) == 0)] = c
    M = cv2.getRotationMatrix2D((S.shape[1] / 2, S.shape[0] / 2), rot, 1.0)
    big = (int(S.shape[1] * 1.2), int(S.shape[0] * 1.6))
    M[0, 2] += (big[0] - S.shape[1]) / 2; M[1, 2] += (big[1] - S.shape[0]) / 2
    S = cv2.warpAffine(S, M, big); A = cv2.warpAffine(A, M, big)
    paste(img, (S, A), cx, cy)


def title(img, y, k=1.0):
    paste(img, chip("lo dicen una ley y el Supremo", int(40 * k), "#000000", "#FFFFFF", "bold"), W / 2, y)
    row(img, [("¿POR", None), ("QUÉ", None), ("UN", None), ("INGENIERO", None)], y + 140 * k, int(92 * k), int(8 * k))
    row(img, [("DE", None), ("CAMINOS", AMBER)], y + 270 * k, int(140 * k), int(10 * k))
    row(img, [("NO", RED), ("PUEDE", None), ("PROYECTAR", None), ("TU", None), ("CASA?", None)], y + 395 * k, int(80 * k), int(7 * k))


def labels(img, dy=0, k=1.0):
    paste(img, chip("ARQUITECTO ✓", int(38 * k), "#000000", TEAL, "bold"), 330 * 1.0, 1010 * k + dy)
    stamp(img, "NO", 850, 1430 * k + dy, 150, RED, -10, k)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    halo(img, W / 2, 1250, 520, (0.75, 0.8, 0.85), 0.05)
    title(img, 150)
    labels(img)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    # miniatura 4:5: el plano reducido, con los lados fundidos a negro, y el título algo más compacto
    y0, s = 300, 0.82
    src = base[y0:y0 + int(1350 / s)]
    small = cv2.resize(src, (int(W * s), int(src.shape[0] * s)), interpolation=cv2.INTER_AREA)[:1350]
    x0 = (W - small.shape[1]) // 2
    ramp = np.clip(np.minimum(np.arange(small.shape[1]), np.arange(small.shape[1])[::-1]) / 90.0, 0, 1)[None, :, None]
    m = np.zeros((1350, W, 3), np.float32)
    m[:small.shape[0], x0:x0 + small.shape[1]] = small * ramp
    title(m, 62, 0.86)
    paste(m, chip("ARQUITECTO ✓", 34, "#000000", TEAL, "bold"), 340, 640)
    stamp(m, "NO", 800, 1010, 130, RED, -10, 0.9)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
