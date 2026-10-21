"""Reel 9:16 «Take the risk»: el clip horizontal centrado sobre negro y la frase en serif fina (Cormorant Garamond)
sobre el cielo del propio vídeo. Cada letra entra por separado: fundido + desenfoque que se enfoca + leve subida,
con un halo suave para que se lea sobre las nubes.

    python3 projects/motivacion/compose_take.py
"""
import os
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "out", "src2.mov")
DST = os.path.join(ROOT, "out", "take_the_risk.mp4")
FONT = os.path.join(ROOT, "..", "..", "engine", "fonts", "CormorantGaramond-400-normal.ttf")
W, H = 1080, 1920
TEXT, SIZE, TRACK = "Take the risk", 84, 4          # tamaño y espaciado extra entre letras (px)
COLOR = (236, 234, 228)
T0, STAGGER, DUR = 0.7, 0.085, 0.6                   # inicio, separación entre letras, duración de la entrada
Y_REL = 0.31                                          # altura dentro del clip (cielo)


def glyphs():
    f = ImageFont.truetype(FONT, SIZE)
    widths = [f.getlength(c) for c in TEXT]
    total = sum(widths) + TRACK * (len(TEXT) - 1)
    out, x = [], 0.0
    asc, desc = f.getmetrics()
    pad = 24
    for c, w in zip(TEXT, widths):
        if c != " ":
            im = Image.new("L", (int(w) + 2 * pad, asc + desc + 2 * pad), 0)
            ImageDraw.Draw(im).text((pad, pad), c, font=f, fill=255)
            out.append((np.asarray(im, np.float32) / 255, x - pad, pad))
        x += w + TRACK
    return out, total, asc + desc


def main():
    cap = cv2.VideoCapture(SRC)
    fps = cap.get(cv2.CAP_PROP_FPS)
    vw, vh = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    nh = round(W * vh / vw / 2) * 2
    top = (H - nh) // 2
    gl, total, th = glyphs()
    x0, y0 = (W - total) / 2, top + nh * Y_REL - th / 2
    n_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", f"{fps}", "-i", "-",
                           "-i", SRC, "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p",
                           "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", DST], stdin=subprocess.PIPE)
    col = np.array(COLOR[::-1], np.float32) / 255
    i = 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        t = i / fps
        img = np.zeros((H, W, 3), np.float32)
        img[top:top + nh] = cv2.resize(fr, (W, nh), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
        alpha = np.zeros((H, W), np.float32)
        out_fade = 1 - np.clip((t - (n_frames / fps - 0.35)) / 0.35, 0, 1)    # se apaga al final para el bucle
        for k, (a, gx, pad) in enumerate(gl):
            p = np.clip((t - (T0 + k * STAGGER)) / DUR, 0, 1)
            if p <= 0:
                continue
            e = 1 - (1 - p) ** 3
            blur = 7 * (1 - e)
            g = cv2.GaussianBlur(a, (0, 0), blur) if blur > 0.3 else a
            yy, xx = int(round(y0 - pad + 10 * (1 - e))), int(round(x0 + gx))
            h2, w2 = g.shape
            alpha[yy:yy + h2, xx:xx + w2] = np.maximum(alpha[yy:yy + h2, xx:xx + w2], g * e * out_fade)
        if alpha.max() > 0:
            glow = cv2.GaussianBlur(alpha, (0, 0), 14)
            img *= (1 - 0.28 * glow)[:, :, None]                   # sombra suave detrás para leer sobre nubes
            img = img * (1 - alpha[:, :, None]) + col * alpha[:, :, None]
            img += (0.10 * glow)[:, :, None] * col                 # halo luminoso muy sutil
        ff.stdin.write((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
        i += 1
    ff.stdin.close()
    ff.wait()
    print("vídeo →", DST, f"({i} fotogramas; frase completa a los {T0 + (len(gl) - 1) * STAGGER + DUR:.1f} s)")


if __name__ == "__main__":
    main()
