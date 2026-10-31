"""Imagen del canal de YouTube: foto de perfil (800x800) y banner (2560x1440, zona segura 1546x423 en el centro).
Perfil: el birrete a contraluz con el sol del amanecer (render de la escena de «Aeroespacial», perfil_base.jpg).
Banner: título en Impact + 5 fotogramas reales de los vídeos (sin subtítulos), y a los lados (solo en TV/escritorio) los mismos, difuminados."""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(ROOT, "..")
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import text, paste, hex_bgr  # noqa: E402
from engine.subs import word_sprite  # noqa: E402
from engine import post  # noqa: E402

YELLOW = "#FFC83D"


def perfil():
    b = cv2.imread(os.path.join(ROOT, "perfil_base.jpg")).astype(np.float32) / 255
    c = b[420:1180, 110:870]
    c = cv2.resize(c, (800, 800), interpolation=cv2.INTER_AREA)
    yy, xx = np.mgrid[0:800, 0:800]; r = np.hypot(xx - 400, yy - 400) / 400
    c *= (1 - 0.35 * np.clip((r - 0.7) / 0.3, 0, 1) ** 2)[..., None]       # viñeta suave (se ve en círculo)
    cv2.imwrite(os.path.join(ROOT, "perfil.png"), post.finish(c))


def card(img, path, cx, cy, w, h, rot=0.0):
    f = cv2.imread(path).astype(np.float32) / 255
    f = cv2.resize(f, (w, h), interpolation=cv2.INTER_AREA)
    a = np.zeros((h, w), np.float32); r = 18
    cv2.rectangle(a, (r, 0), (w - r, h), 1, -1); cv2.rectangle(a, (0, r), (w, h - r), 1, -1)
    for x, y in [(r, r), (w - r, r), (r, h - r), (w - r, h - r)]: cv2.circle(a, (x, y), r, 1, -1, cv2.LINE_AA)
    bd = cv2.dilate(a, np.ones((5, 5), np.uint8)) - cv2.erode(a, np.ones((5, 5), np.uint8))
    f = f * (1 - bd[..., None] * 0.8) + bd[..., None] * 0.9
    pad = 40; S = np.zeros((h + 2 * pad, w + 2 * pad, 3), np.float32); A = np.zeros((h + 2 * pad, w + 2 * pad), np.float32)
    sh = cv2.GaussianBlur(np.pad(a, pad), (0, 0), 14) * 0.7
    A = np.maximum(A, sh); S[pad:pad + h, pad:pad + w] = f; A[pad:pad + h, pad:pad + w] = np.maximum(A[pad:pad + h, pad:pad + w], a)
    S[A > 0] *= 1; S = S * (np.pad(a, pad)[..., None])
    if rot:
        M = cv2.getRotationMatrix2D((S.shape[1] / 2, S.shape[0] / 2), rot, 1.0); S = cv2.warpAffine(S, M, (S.shape[1], S.shape[0])); A = cv2.warpAffine(A, M, (A.shape[1], A.shape[0]))
    paste(img, (S, A), cx, cy)


def banner():
    W, H = 2560, 1440
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    img = np.zeros((H, W, 3), np.float32)
    top, bot = np.array(hex_bgr("#060a14"), np.float32) / 255, np.array(hex_bgr("#101a33"), np.float32) / 255
    img[:] = top + (bot - top) * (yy / H)[..., None]
    # a los lados (solo se ve en TV/escritorio): dos fotogramas grandes difuminados que se funden con el fondo
    for path, x0 in [(os.path.join(P, "aeroespacial/out/frames/f00594.jpg"), 0), (os.path.join(P, "software/out/frames/f00186.jpg"), W - 760)]:
        f = cv2.resize(cv2.imread(path).astype(np.float32) / 255, (760, 1351))[(1351 - H) // 2:(1351 - H) // 2 + H] if 1351 >= H else None
        if f is None: f = cv2.resize(cv2.imread(path).astype(np.float32) / 255, (810, H))[:, 25:785]
        f = cv2.GaussianBlur(f, (0, 0), 6) * 0.55
        ramp = np.clip((np.arange(760) if x0 else np.arange(760)[::-1]) / 760.0 * 1.6, 0, 1) ** 1.5
        img[:, x0:x0 + 760] = img[:, x0:x0 + 760] * (1 - ramp[None, :, None]) + f * ramp[None, :, None]
    # rejilla en perspectiva abajo (como el suelo de los vídeos) y dos brillos
    g = np.zeros((H, W), np.float32); hz = 980
    for i in range(-40, 41): cv2.line(g, (W // 2, hz), (int(W / 2 + i * 160), H), 0.22, 2, cv2.LINE_AA)
    for k in range(1, 14): y = int(hz + (H - hz) * (k / 14) ** 1.8); cv2.line(g, (0, y), (W, y), 0.2, 2, cv2.LINE_AA)
    g *= np.clip((yy - hz) / 300, 0, 1)
    img += g[..., None] * np.array([0.62, 0.68, 0.76], np.float32)[::-1] * 0.5
    for cx, cy, col, s in [(860, 720, (0.25, 0.65, 1.0), 520), (1700, 720, (0.83, 0.89, 0.39), 560)]:
        img += np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * s * s))[..., None] * np.array(col[::-1], np.float32) * 0.07
    # zona segura: título a la izquierda, cinco fotogramas a la derecha
    def row(parts, x, cy, size, stroke):
        for wd, c in parts:
            rgb, a, pad = word_sprite(wd, size, stroke, hex_bgr(c) if c else None, "impact"); w = a.shape[1] - 2 * pad
            paste(img, (rgb, a), x + w / 2, cy); x += w + size * 0.22
    row([("LAS", None), ("CARRERAS,", None)], 560, 625, 100, 8)
    row([("POR", YELLOW), ("DENTRO", YELLOW)], 560, 742, 128, 9)
    for txt, y, col in [("Ingenierías, notas de corte y economía.", 845, "#D8E0EA"), ("En 3D y en menos de un minuto.", 895, "#9AA8BA")]:
        sp = text(txt, 36, "bold", col, shadow=0.7); paste(img, sp, 560 + sp[1].shape[1] / 2 - 18, y)
    F = [("aeroespacial", "f00594"), ("industrial", "f01500"), ("software", "f00186"), ("aeroespacial", "f02172")]
    for i, (p, f) in enumerate(F):
        card(img, os.path.join(P, p, "out/frames", f + ".jpg"), 1440 + i * 166, 720 + (14 if i % 2 else -14), 150, 266, rot=(i - 1.5) * -2.0)
    img += (np.random.default_rng(7).random((H, W, 1)).astype(np.float32) - 0.5) * 0.012      # grano fino
    cv2.imwrite(os.path.join(ROOT, "banner.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    # vista de control: la zona segura marcada (no se sube)
    chk = cv2.imread(os.path.join(ROOT, "banner.jpg")); cv2.rectangle(chk, (507, 508), (2053, 931), (0, 0, 255), 3)
    cv2.imwrite(os.path.join(ROOT, "banner_zona_segura.jpg"), cv2.resize(chk, (1280, 720)))


if __name__ == "__main__":
    perfil(); banner(); print("perfil.png · banner.jpg")
