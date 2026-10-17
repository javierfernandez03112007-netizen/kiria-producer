"""Compone el reel 3D: fotogramas de three.js (out/frames) + marioneta animada + marca + audio.

    node web/capture.mjs out/frames --range 0 1800 <w> 4     (4 procesos en paralelo)
    python3 projects/oriente/compose_oriente.py
"""
import glob
import os
import subprocess
import sys
from multiprocessing import Pool

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.puppet import Puppet, CW, CH  # noqa: E402
from engine.fin_draw import text, paste, HEX, clamp, prog, eo, eio, lerp, eback, icon, halo, WHITE  # noqa: E402
from engine import audio as A  # noqa: E402

FPS, W, H = 30, 1080, 1920
END = 60.0
FRAMES = os.environ.get("FRAMES", os.path.join(ROOT, "out", "frames"))
AUDIO = os.path.join(ROOT, "assets", "voz.mp3")
PUP = Puppet(os.path.join(ROOT, "assets", "avatar", "piezas"))
AV_IN, AV_OUT = 4.35, 59.35      # al final se queda pidiendo el like y se va justo antes del bucle
LIKE = 55.30                     # sale de la esquina al centro con el pulgar arriba
SCALE = 0.62                      # tamaño del muñeco (lienzo 460x640 → ~285x397 px)
AV_X, AV_FOOT = 175, 1835

# gestos: (t, brazo_izq, mano_izq, brazo_der, mano_der)
G = {
    "rest": (6, "puno", -6, "puno_e"),
    "point_ur": (4, "puno", -148, "senala"),
    "point_r": (8, "puno", -105, "senala"),
    "explain": (34, "abierta_e", -34, "abierta"),
    "small": (22, "abierta_e", -30, "abierta"),
    "surprise": (55, "abierta_e", -55, "abierta"),
    "thumb": (6, "puno", -55, "pulgar"),
}
SCHED = [(4.35, "point_ur"), (7.0, "small"), (8.5, "point_r"), (11.9, "point_ur"), (13.6, "explain"), (16.4, "rest"),
         (18.8, "point_r"), (21.5, "small"), (23.9, "rest"), (27.4, "point_ur"), (29.9, "point_ur"), (32.1, "surprise"),
         (34.4, "point_r"), (37.4, "explain"), (38.6, "point_r"), (43.1, "point_ur"), (46.4, "explain"),
         (48.5, "point_ur"), (51.6, "rest"), (52.1, "small"), (54.2, "thumb")]  # el pulgar se mantiene hasta el final
LOOK = [(0, "derecha"), (11.9, "arriba"), (13.6, "derecha"), (18.8, "derecha"), (23.9, "centro"), (28.6, "arriba"),
        (32.1, "centro"), (34.4, "derecha"), (37.4, "centro"), (38.6, "derecha"), (52.1, "centro")]
BROWS = [(13.6, 15.0, "lift"), (23.9, 27.3, "enfado"), (32.1, 33.8, "sorpresa"), (37.4, 38.4, "lift")]


def env_open():
    x = A.load(AUDIO, 16000)
    hop = 16000 // FPS
    n = int(END * FPS)
    r = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2) + 1e-12) if i * hop < len(x) else 0 for i in range(n)])
    db = 20 * np.log10(r + 1e-9)
    o = np.clip((db - (db.max() - 32)) / 24, 0, 1)
    o = np.convolve(o, [0.25, 0.5, 0.25], mode="same")
    return o


OPEN = None


def state(t, fi):
    st = {}
    st["open"] = float(OPEN[min(fi, len(OPEN) - 1)]) * 0.9
    # parpadeo cada ~3,3 s con algo de variación
    k = int(t / 3.3)
    tb = k * 3.3 + 0.6 * ((k * 7919) % 10) / 10
    st["blink"] = 1.0 if 0 <= t - tb < 0.12 else 0.0
    st["look"] = [l for ts, l in LOOK if t >= ts][-1]
    for a, b, kind in BROWS:
        if a <= t < b:
            if kind == "lift":
                st["brow_lift"] = 4 * eo(prog(t, a, 0.2))
            else:
                st["brow"] = kind
    st["mouth"] = "sonrisa" if t >= 54.2 else ("torcida" if 16.4 <= t < 18.6 and st["open"] < 0.1 else "seria")
    st["head_tilt"] = 2.5 * np.sin(t * 1.3) + (4 if st["look"] == "derecha" else 0)
    st["head_nod"] = 3.5 * st["open"]
    st["bob"] = 3 * np.sin(t * 2.2)
    # brazos: interpolación entre gestos
    i = max(j for j, (ts, g) in enumerate(SCHED) if t >= ts) if t >= SCHED[0][0] else 0
    ts, g = SCHED[i]
    prev = SCHED[i - 1][1] if i > 0 else "rest"
    u = eio(prog(t, ts, 0.32))
    a0, a1 = G[prev], G[g]
    wob = 3 * np.sin(t * 2.7)
    st["arm_L"] = lerp(a0[0], a1[0], u) + wob
    st["arm_R"] = lerp(a0[2], a1[2], u) - wob
    st["hand_L"] = a1[1] if u > 0.5 else a0[1]
    st["hand_R"] = a1[3] if u > 0.5 else a0[3]
    return st


def like(img, t, cx, top, vis):
    """Corazón de «me gusta» que late sobre la cabeza y corazones pequeños que suben."""
    t0 = LIKE + 0.55
    if t < t0 or vis < 0.02:
        return
    p = eback(prog(t, t0, 0.4))
    beat = 1 + 0.12 * max(0.0, np.sin((t - t0) * 7)) ** 6
    hx, hy = cx + 175, top - 30
    halo(img, hx, hy, 120, WHITE, 0.35 * vis * prog(t, t0, 0.3))
    paste(img, icon("heart", 150, "#FFFFFF"), hx, hy, vis, scale=p * beat)
    paste(img, text("¡Dale a like!", 52, "black", "#FFFFFF", shadow=0.6), cx, top - 190, vis * eo(prog(t, t0 + 0.3, 0.3)))
    rng = np.random.default_rng(3)
    for i in range(7):
        ti = t0 + 0.25 + i * 0.32
        age = t - ti
        if 0 <= age < 1.6:
            x = hx + rng.uniform(-120, 120) + 25 * np.sin(age * 5 + i)
            y = hy - 60 - 260 * age
            paste(img, icon("heart", 54, "#FFFFFF"), x, y, vis * (1 - age / 1.6), scale=0.6 + 0.4 * eo(prog(age, 0, 0.3)))


def compose(fi):
    t = fi / FPS
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    vis = eo(prog(t, AV_IN, 0.35)) * (1 - prog(t, AV_OUT, 0.3))
    if vis > 0.01:
        rgba = PUP.render(state(t, fi))
        go = eio(prog(t, LIKE, 0.7))
        s = SCALE * eback(prog(t, AV_IN, 0.45)) * (1 + 0.75 * go) * (1 - 0.3 * prog(t, AV_OUT, 0.3))
        cx, foot = lerp(AV_X, W / 2, go), lerp(AV_FOOT, 1660, go) + 8 * np.sin(t * 3) * go
        w, h = max(2, int(CW * s)), max(2, int(CH * s))
        rgba = cv2.resize(rgba, (w, h), interpolation=cv2.INTER_AREA)
        rgb, a = np.ascontiguousarray(rgba[..., 2::-1]), rgba[..., 3]
        # sombra de suelo
        sh = np.zeros((40, 300), np.float32)
        cv2.ellipse(sh, (150, 20), (int(70 * s / SCALE), 10), 0, 0, 360, 1, -1, cv2.LINE_AA)
        sh = cv2.GaussianBlur(sh, (0, 0), 6)
        y0, x0 = int(foot) - 20, int(cx) - 150
        roi = img[y0:y0 + 40, x0:x0 + 300]
        roi *= (1 - 0.6 * vis * sh[:roi.shape[0], :roi.shape[1]])[..., None]
        paste(img, (rgb, a), cx, foot + int(14 * s), vis, anchor="b")
        like(img, t, cx, foot - h * 0.95, vis)
    if 52.3 <= t < 55.4:
        paste(img, text("No es asesoramiento financiero", 26, "med", "#BDBDBD", shadow=0.5), W / 2, H - 230,
              0.9 * eo(prog(t, 52.3, 0.4)) * (1 - prog(t, 55.1, 0.3)))
    light = img[H - 110:H - 40, W - 260:W - 40].mean() > 0.6   # fondo blanco (Brent): marca en negro
    paste(img, text("kiria.ai", 38, "semi", "#111111" if light else "#FFFFFF", shadow=0 if light else 0.5), W - 56, H - 70,
          0.85, anchor="r")
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global OPEN
    OPEN = env_open()


def main(dst=os.path.join(ROOT, "out", "oriente_3d.mp4")):
    n = int(END * FPS)
    missing = [i for i in range(n) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-filter_complex", "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,apad[a]",
           "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", dst]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(4, initializer=init) as pool:
        for k, buf in enumerate(pool.imap(compose, range(n), chunksize=8)):
            ff.stdin.write(buf)
            if k % 300 == 0:
                print(f"  {k}/{n}", flush=True)
    ff.stdin.close()
    ff.wait()
    print("vídeo →", dst)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        init()
        os.makedirs(os.path.join(ROOT, "out", "ctest"), exist_ok=True)
        for t in [float(x) for x in sys.argv[2:]]:
            fi = int(round(t * FPS))
            fr = np.frombuffer(compose(fi), np.uint8).reshape(H, W, 3)
            cv2.imwrite(os.path.join(ROOT, "out", "ctest", f"c{t:05.2f}.jpg"), fr)
    else:
        main()
