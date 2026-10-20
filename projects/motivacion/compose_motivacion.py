"""Reel 9:16 estilo «clip en el centro + frase gris arriba»: el vídeo horizontal va centrado sobre negro y la frase
aparece letra a letra (máquina de escribir suave) encima.

    python3 projects/motivacion/compose_motivacion.py
"""
import os
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "out", "src.mov")
DST = os.path.join(ROOT, "out", "motivacion.mp4")
FONT = os.path.join(ROOT, "..", "..", "engine", "fonts", "Inter-Medium.otf")
W, H = 1080, 1920
LINES = ["el mar no se va a calmar por ti.", "aprende a nadar con olas."]
SIZE, COLOR, LH = 50, (208, 208, 208), 1.45
T0, CPS, PAUSE = 0.5, 17.0, 0.45          # inicio, letras por segundo, pausa entre frases
FADE = 0.14                                # cada letra entra con un fundido corto


def layout(vid_top):
    f = ImageFont.truetype(FONT, SIZE)
    chars, t = [], T0
    y0 = vid_top - 70 - (len(LINES) - 1) * SIZE * LH - SIZE
    for li, ln in enumerate(LINES):
        x = (W - f.getlength(ln)) / 2
        for k, ch in enumerate(ln):
            chars.append((ch, x + f.getlength(ln[:k]), y0 + li * SIZE * LH, t))
            t += 1 / CPS * (2.2 if ch in ".," else 1)
        t += PAUSE
    return f, chars


def main():
    cap = cv2.VideoCapture(SRC)
    fps = cap.get(cv2.CAP_PROP_FPS)
    vw, vh = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    nh = round(W * vh / vw / 2) * 2
    top = (H - nh) // 2
    f, chars = layout(top)
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", f"{fps}", "-i", "-",
                           "-i", SRC, "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
                           "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", DST], stdin=subprocess.PIPE)
    i = 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        t = i / fps
        canvas = np.zeros((H, W, 3), np.uint8)
        canvas[top:top + nh] = cv2.resize(fr, (W, nh), interpolation=cv2.INTER_AREA)
        im = Image.fromarray(canvas[:, :, ::-1])
        d = ImageDraw.Draw(im)
        for ch, x, y, tc in chars:
            a = min(1.0, max(0.0, (t - tc) / FADE))
            if a > 0:
                d.text((x, y + 6 * (1 - a)), ch, font=f, fill=tuple(int(c * a) for c in COLOR))
        ff.stdin.write(np.asarray(im)[:, :, ::-1].tobytes())
        i += 1
    ff.stdin.close()
    ff.wait()
    print("vídeo →", DST, f"({i} fotogramas, letras terminan en {chars[-1][3]:.1f} s)")


if __name__ == "__main__":
    main()
