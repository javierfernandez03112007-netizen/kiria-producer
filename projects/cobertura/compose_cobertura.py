"""Compone el reel «Cobertura y satélites»: fotogramas 3D (out/frames) + subtítulos palabra a palabra +
interfaces (vibración, caja de comentario) + marioneta + like + marca + audio.

    node web/capture.mjs out/frames --range 0 1800 <w> 4     (4 procesos en paralelo)
    python3 projects/cobertura/compose_cobertura.py [--test t1 t2 ...]
"""
import glob
import json
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
from engine.subs import Subs  # noqa: E402
from engine.fin_draw import rrect, shadow, font  # noqa: E402

FPS, W, H = 30, 1080, 1920
END = 60.0                       # línea de tiempo de la escena (voz a 59,4 s, versión 1)
TS = 1.0741                      # la voz va ahora a velocidad natural (63,8 s): el tiempo real se estira este factor
N = round(END * TS * FPS)        # fotogramas del vídeo final
FRAMES = os.environ.get("FRAMES", os.path.join(ROOT, "out", "frames"))
AUDIO = os.path.join(ROOT, "assets", "voz.mp3")
PUP = Puppet(os.path.join(ROOT, "..", "oriente", "assets", "avatar", "piezas"))   # mismo muñeco
AV_IN, AV_OUT = 1.75, 59.3      # entra tras zambullirse en el móvil y se va antes del bucle
LIKE = 57.55                     # sale de la esquina al centro con el pulgar arriba
SCALE = 0.62
AV_X, AV_FOOT = 175, 1835

G = {
    "rest": (6, "puno", -6, "puno_e"),
    "point_ur": (4, "puno", -148, "senala"),
    "point_r": (8, "puno", -105, "senala"),
    "explain": (34, "abierta_e", -34, "abierta"),
    "small": (22, "abierta_e", -30, "abierta"),
    "surprise": (55, "abierta_e", -55, "abierta"),
    "thumb": (6, "puno", -55, "pulgar"),
}
SCHED = [(1.75, "point_ur"), (4.7, "explain"), (7.3, "point_r"), (9.7, "small"), (12.4, "point_ur"), (14.0, "explain"),
         (15.3, "point_r"), (17.4, "explain"), (19.4, "small"), (20.0, "point_ur"), (22.1, "point_r"), (25.3, "surprise"),
         (26.1, "small"), (27.5, "surprise"), (28.3, "explain"), (30.3, "point_r"), (32.4, "small"), (32.9, "point_ur"),
         (35.0, "explain"), (36.6, "point_ur"), (38.3, "small"), (39.9, "surprise"), (40.4, "explain"), (41.7, "point_r"),
         (43.6, "point_ur"), (45.8, "explain"), (48.0, "point_ur"), (49.7, "small"), (51.2, "explain"), (51.6, "small"),
         (53.6, "point_ur"), (54.6, "explain"), (56.5, "point_r"), (57.55, "thumb")]
LOOK = [(0, "arriba"), (4.7, "derecha"), (9.7, "centro"), (12.4, "derecha"), (17.4, "arriba"), (19.4, "derecha"),
        (26.1, "centro"), (28.3, "derecha"), (32.9, "arriba"), (35.0, "derecha"), (40.4, "centro"), (41.7, "derecha"),
        (45.8, "centro"), (48.0, "arriba"), (49.7, "derecha"), (53.6, "arriba"), (54.6, "centro")]
BROWS = [(1.75, 3.2, "lift"), (11.5, 12.6, "lift"), (25.3, 26.4, "lift"), (27.5, 28.9, "enfado"), (39.9, 41.0, "sorpresa"),
         (47.9, 49.0, "lift"), (53.6, 54.6, "lift")]

# subtítulos: palabras clave (recuadro) y emojis en línea (nº de frase → palabras)
KEY = {1: ["cabeza"], 2: ["quinientos", "kilómetros"], 3: ["suelo"], 4: ["cable"], 5: ["burbuja"], 6: ["fibra", "milisegundos"],
       7: ["montaña"], 8: ["rocas", "caro"], 9: ["treinta", "y", "seis", "mil", "kilómetros"], 10: ["bajo"],
       11: ["sos"], 12: ["cielo"], 13: ["señal"], 14: ["like"]}
EMOJI = {(1, "satélites"): "🛰️", (2, "móvil"): "📱", (3, "suelo"): "⬇️", (4, "cable"): "❌", (4, "antena"): "📡",
         (5, "burbuja"): "🫧", (6, "ciudades"): "🏙️", (6, "milisegundos"): "⚡", (7, "montaña"): "⛰️", (7, "conecta"): "📵",
         (8, "rocas"): "🪨", (8, "caro"): "💸", (9, "clásicos"): "🛰️", (9, "nota"): "🐢", (10, "burbuja"): "🫧",
         (11, "sos"): "🆘", (12, "cielo"): "✨", (13, "comentarios"): "💬", (14, "like"): "❤️"}
SUBS = None

def env_open():
    x = A.load(AUDIO, 16000)
    hop = 16000 // FPS
    n = N
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
    st["mouth"] = "sonrisa" if t >= LIKE else ("torcida" if 27.5 <= t < 29.0 and st["open"] < 0.1 else "seria")
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
    tn = fi / FPS                 # tiempo real (voz y subtítulos)
    t = tn / TS                   # tiempo de la escena
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    if 27.55 <= t < 28.25:   # el móvil vibra: «sin servicio»
        k = 1 - prog(t, 27.55, 0.7)
        img = np.roll(img, (int(9 * k * np.sin(t * 95)), int(5 * k * np.cos(t * 120))), axis=(1, 0))
    comment_box(img, t)
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
    SUBS.draw(img, tn, 1 - prog(t, 59.3, 0.25))
    light = img[H - 110:H - 40, W - 260:W - 40].mean() > 0.6   # fondo blanco (Brent): marca en negro
    paste(img, text("kiria.ai", 38, "semi", "#111111" if light else "#FFFFFF", shadow=0 if light else 0.5), W - 56, H - 70,
          0.85, anchor="r")
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def comment_box(img, t):
    """Caja de comentario estilo app: aparece, el cursor hace clic y parpadea el cursor de texto."""
    a = eo(prog(t, 54.7, 0.35)) * (1 - prog(t, 57.45, 0.3))
    if a < 0.01:
        return
    y0 = 1170 + 40 * (1 - eback(prog(t, 54.7, 0.45)))
    x0, w, h = 110, 860, 128
    shadow(img, x0, y0, w, h, 64, alpha=0.5 * a)
    rrect(img, x0, y0, w, h, 64, (1, 1, 1), a)
    paste(img, (np.zeros((92, 92, 3), np.float32), cv2.circle(np.zeros((92, 92), np.float32), (46, 46), 44, 1, -1, cv2.LINE_AA)), x0 + 70, y0 + h / 2, a)
    paste(img, text("k", 52, "black", "#FFFFFF", shadow=0), x0 + 70, y0 + h / 2 - 2, a)
    click = 56.55
    focus = t >= click
    msg = "Añade un comentario…"
    paste(img, text(msg, 38, "med", "#8A8A8A", shadow=0), x0 + 140, y0 + h / 2, a, anchor="l")
    if focus and int((t - click) * 2.4) % 2 == 0:
        rrect(img, x0 + 136, y0 + 38, 4, 52, 2, (0.1, 0.1, 0.1), a)
    # botón de enviar
    bx = x0 + w - 70
    on = eo(prog(t, click, 0.25)) if focus else 0
    col = lerp(0.82, 0.08, on)
    paste(img, (np.full((84, 84, 3), col, np.float32), cv2.circle(np.zeros((84, 84), np.float32), (42, 42), 40, 1, -1, cv2.LINE_AA)), bx, y0 + h / 2, a)
    paste(img, text("↑", 46, "black", "#FFFFFF", shadow=0), bx, y0 + h / 2 - 3, a)
    # cursor (flecha) que entra y hace clic
    cu = eio(prog(t, 55.7, 0.85))
    if t >= 55.7:
        cx, cy = lerp(930, x0 + 300, cu), lerp(1560, y0 + h / 2 + 10, cu)
        if focus:
            r = 30 + 90 * prog(t, click, 0.45)
            ring = cv2.circle(np.zeros((260, 260), np.float32), (130, 130), int(r), 1, 4, cv2.LINE_AA)
            paste(img, (np.ones((260, 260, 3), np.float32), ring), cx, cy, a * (1 - prog(t, click, 0.45)))
        press = 0.85 if click <= t < click + 0.15 else 1.0
        paste(img, cursor_sprite(), cx, cy, a, scale=press, anchor="tl")


def cursor_sprite():
    """Flecha de ratón negra con borde blanco."""
    pts = np.array([[6, 6], [6, 66], [22, 52], [34, 78], [46, 72], [34, 48], [56, 48]], np.int32)
    inner = cv2.fillPoly(np.zeros((88, 66), np.float32), [pts], 1, cv2.LINE_AA)
    edge = cv2.dilate(inner, np.ones((7, 7), np.uint8))
    rgb = np.repeat((1 - inner * 0.95)[..., None], 3, axis=2).astype(np.float32)
    return rgb, np.maximum(edge, inner)


def init():
    global OPEN, SUBS
    OPEN = env_open()
    SUBS = Subs(json.load(open(os.path.join(ROOT, "tiempos.json"))), KEY, EMOJI)


def main(dst=os.path.join(ROOT, "out", "cobertura.mp4")):
    n = N
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
