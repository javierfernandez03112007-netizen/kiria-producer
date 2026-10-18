"""Compone «Soy Kiria»: fotogramas 3D (out/frames) + subtítulos palabra a palabra + clic en «Seguir» + marca + voz.

    python3 ajustar_voz.py
    node web/capture.mjs out/frames --range 0 <N> <w> 4     (4 procesos en paralelo)
    python3 projects/presentacion/compose_presentacion.py [--test t1 t2 ...]
"""
import json
import os
import subprocess
import sys
from multiprocessing import Pool

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import text, paste, prog, eo, eio, lerp  # noqa: E402
from engine.subs import Subs  # noqa: E402

FPS, W, H = 30, 1080, 1920
TK = json.load(open(os.path.join(ROOT, "tiempos_k.json")))
K, END = TK["K"], TK["END"]
N = int(END * FPS)
FRAMES = os.path.join(ROOT, "out", "frames")
AUDIO = os.path.join(ROOT, "assets", "voz.mp3")
KEY = {1: ["kiria"], 2: ["economía"], 3: ["afecta"], 4: ["minuto"], 5: ["humo"], 6: ["entender"], 7: ["quédate"], 8: ["ti"]}
EMOJI = {(2, "informes"): "📄", (2, "datos"): "📊", (2, "noticias"): "📰", (3, "hipoteca"): "🏠", (3, "ahorros"): "💶",
         (3, "súper"): "🛒", (4, "minuto"): "⏱️", (4, "fuentes"): "🔎", (5, "humo"): "🚫", (8, "ti"): "👁️"}
SUBS = None


def cursor_sprite():
    pts = np.array([[6, 6], [6, 66], [22, 52], [34, 78], [46, 72], [34, 48], [56, 48]], np.int32)
    inner = cv2.fillPoly(np.zeros((88, 66), np.float32), [pts], 1, cv2.LINE_AA)
    edge = cv2.dilate(inner, np.ones((7, 7), np.uint8))
    return np.repeat((1 - inner * 0.95)[..., None], 3, axis=2).astype(np.float32), np.maximum(edge, inner)


def glow(img, thr=0.86, k=0.45):
    """Brillo (bloom) barato: lo más claro, desenfocado a varias escalas y sumado (solo en las partes de fondo negro)."""
    if img.mean() > 0.45:
        return img
    hi = np.clip(img - thr, 0, None) / (1 - thr)
    small = cv2.resize(hi, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    g = cv2.GaussianBlur(small, (0, 0), 6) * 0.6 + cv2.GaussianBlur(small, (0, 0), 20) * 0.4
    return img + k * cv2.resize(g, (W, H), interpolation=cv2.INTER_LINEAR)


def compose(fi):
    t = fi / FPS
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    img = glow(img)
    SUBS.draw(img, t, 1 - prog(t, END - 0.6, 0.3))
    # el cursor entra y pulsa «Seguir»
    t0 = K["sigueme"] - 0.2
    if t0 <= t < END - 0.4:
        u = eio(prog(t, t0, 0.75))
        cx, cy = lerp(900, 600, u), lerp(1780, 1500, u)
        tap = K["sigueme"] + 0.6
        if t >= tap:
            r = 30 + 110 * prog(t, tap, 0.5)
            ring = cv2.circle(np.zeros((300, 300), np.float32), (150, 150), int(r), 1, 4, cv2.LINE_AA)
            paste(img, (np.ones((300, 300, 3), np.float32), ring), cx, cy, 1 - prog(t, tap, 0.5))
        a = eo(prog(t, t0, 0.25)) * (1 - prog(t, END - 0.7, 0.3))
        paste(img, cursor_sprite(), cx, cy, a, scale=0.85 if tap <= t < tap + 0.15 else 1.0, anchor="tl")
    paste(img, text("kiria.ai", 38, "semi", "#FFFFFF", shadow=0.5), W - 56, H - 70, 0.85 * (1 - prog(t, END - 0.4, 0.3)), anchor="r")
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global SUBS
    SUBS = Subs(json.load(open(os.path.join(ROOT, "tiempos.json"))), KEY, EMOJI)


def main(dst=os.path.join(ROOT, "out", "presentacion.mp4")):
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-filter_complex", "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,apad[a]",
           "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart", dst]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(4, initializer=init) as pool:
        for buf in pool.imap(compose, range(N), chunksize=8):
            ff.stdin.write(buf)
    ff.stdin.close()
    ff.wait()
    print("vídeo →", dst)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        init()
        os.makedirs(os.path.join(ROOT, "out", "ctest"), exist_ok=True)
        for t in [float(x) for x in sys.argv[2:]]:
            fr = np.frombuffer(compose(int(round(t * FPS))), np.uint8).reshape(H, W, 3)
            cv2.imwrite(os.path.join(ROOT, "out", "ctest", f"c{t:05.2f}.jpg"), fr)
    else:
        main()
