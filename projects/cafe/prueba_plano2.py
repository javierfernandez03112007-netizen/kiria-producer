"""Prueba de 5 s: foto fija del agricultor animada como plano de cine (empuje, polvo, destello, etalonado)."""
import os
import subprocess
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from engine.fin_draw import W, H, FPS, HEX, text, paste  # noqa: E402
from engine.post import vignette, grain, brand, finish  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(AQUI, "assets", "plano2a_captura.png")
OUT = os.path.join(AQUI, "out", "prueba_plano2.mp4")
DUR = 5.0
N = int(DUR * FPS)

# Recorte 9:16 de la captura (zona de la foto, centrado en las manos)
img = cv2.imread(SRC).astype(np.float32) / 255
y0, y1 = 351, 1748
cw = int((y1 - y0) * 9 / 16)
cx = 1450
base = img[y0:y1, cx - cw // 2:cx + cw // 2]
base = cv2.resize(base, (int(W * 1.08), int(H * 1.08)), interpolation=cv2.INTER_LANCZOS4)
blur = cv2.GaussianBlur(base, (0, 0), 1.2)
base = np.clip(base * 1.5 - blur * 0.5, 0, 1)  # enfoque suave
BH, BW = base.shape[:2]


def grade(f):
    """Teal en sombras, ámbar en altas luces, algo de contraste."""
    lum = f.mean(axis=2, keepdims=True)
    sh = np.clip(1 - lum * 2, 0, 1)
    hi = np.clip(lum * 2 - 1, 0, 1)
    f = f + sh * np.float32([0.06, 0.03, -0.03]) + hi * np.float32([-0.05, 0.02, 0.07])
    g = f.mean(axis=2, keepdims=True)
    f = g + (f - g) * 1.18
    f = (f - 0.45) * 1.15 + 0.45
    return f


rng = np.random.default_rng(3)
P = 70
px, py = rng.uniform(0, W, P), rng.uniform(0, H, P)
pr = rng.uniform(1.5, 9, P)
pv = rng.uniform(-14, 14, (P, 2)) + [6, -10]
pph = rng.uniform(0, 6.28, P)


def ease(t):
    return t * t * (3 - 2 * t)


def frame(i):
    t = i / N
    z = 1.0 + 0.07 * ease(t)
    ox, oy = -18 * t, -12 * t
    M = np.float32([[z, 0, W / 2 - z * BW / 2 + ox], [0, z, H / 2 - z * BH / 2 + oy]])
    f = cv2.warpAffine(base, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    f = grade(f)

    # Polvo ámbar flotando a contraluz (las motas grandes, desenfocadas)
    layer = np.zeros((H, W), np.float32)
    for k in range(P):
        x = (px[k] + pv[k, 0] * t * DUR) % W
        y = (py[k] + pv[k, 1] * t * DUR + 8 * np.sin(pph[k] + t * 6)) % H
        a = 0.35 + 0.35 * np.sin(pph[k] + t * 9)
        cv2.circle(layer, (int(x), int(y)), int(pr[k]), a, -1, cv2.LINE_AA)
    layer = cv2.GaussianBlur(layer, (0, 0), 2.5)
    f += layer[..., None] * np.float32([0.25, 0.62, 1.0]) * 0.55

    # Destello de sol que respira en la esquina superior
    yy, xx = np.ogrid[0:H, 0:W]
    d = np.hypot(xx - 120, yy - 260) / 900
    glow = np.exp(-d * d * 3) * (0.22 + 0.06 * np.sin(t * 7))
    f += glow[..., None].astype(np.float32) * np.float32([0.3, 0.65, 1.0])

    vignette(f)
    grain(f, i, 0.03)

    # Textos
    a1 = np.clip((t - 0.15) / 0.12, 0, 1)
    paste(f, text("AGRICULTOR", 44, "semi", HEX["white"], tracking=0.25), W // 2, 300, a1)
    paste(f, text("0,06 €", 150, "black", HEX["amber"]), W // 2, 410, a1, scale=1 + 0.25 * (1 - ease(a1)))
    a2 = np.clip((t - 0.45) / 0.1, 0, 1)
    paste(f, text("Recogido a mano…\ngrano a grano.", 62, "bold", HEX["white"]), W // 2, 1330, a2)
    brand(f)
    # Fundido de entrada y salida
    f *= min(1, i / 8, (N - 1 - i) / 8 + 0.0001)
    return finish(f)


ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24",
                       "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "16",
                       "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT],
                      stdin=subprocess.PIPE)
for i in range(N):
    ff.stdin.write(frame(i).tobytes())
ff.stdin.close()
ff.wait()
cv2.imwrite(os.path.join(AQUI, "out", "prueba_plano2.jpg"), frame(int(N * 0.7)))
print(OUT)
