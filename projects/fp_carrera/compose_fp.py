"""Compone «FP o carrera»: fotogramas 3D a 60 fps (out/frames, ya con el HUD y el marcador) + subtítulos palabra a palabra
(palabras de FP en turquesa y de la carrera en ámbar) + voz + efectos sintetizados (tarjetas, campana, puntos, puertas, cohete).

    python3 ajustar_voz.py
    ./render_local.sh                                   (o trozos en varias máquinas + merge_chunks.sh)
    python3 projects/fp_carrera/compose_fp.py [--test t1 t2 ...]
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
from engine.fin_draw import prog, hex_bgr  # noqa: E402
from engine.subs import Subs, norm  # noqa: E402

FPS, W, H = 60, 1080, 1920
LINES = json.load(open(os.path.join(ROOT, "tiempos.json")))
END = LINES[-1]["end"] + 1.2
N = int(END * FPS)
FRAMES = os.path.join(ROOT, "out", "frames")
AUDIO = os.path.join(ROOT, "assets", "voz.mp3")
AMBER = "#FFB547"
WORDS = [dict(w, n=norm(w["w"]), line=i + 1) for i, l in enumerate(LINES) for w in l["words"]]


def at(word, k=1, line=None):
    c = 0
    for w in WORDS:
        if (line is None or w["line"] == line) and w["n"] == norm(word):
            c += 1
            if c == k:
                return w["start"] - 0.03
    raise KeyError(word)


T, A, WH = "#62E3D4", "#FFB547", "#EEF2F6"
KEY = {1: {"cinco": T, "fp": T, "carrera": A, "dos": A}, 2: {"fp": T, "nivel": A}, 3: {"bando": WH}, 4: {"fp": T, "dos": T, "prácticas": T, "cuatro": A, "teoría": A},
       5: {"carrera": A, "herramientas": T, "debajo": A}, 6: {"datos": WH}, 7: {"ningún": T, "título": T, "regulada": A}, 8: {"fp": T},
       9: {"carrera": A, "fp": T}, 10: {"máster": A}, 11: {"carrera": A}, 12: {"razón": WH}, 13: {"fp": T, "carrera": A}, 14: {"dos": WH, "fp": T, "carrera": A, "convalidado": T},
       15: {"fp": T, "carrera": A, "comentarios": WH}}
SUBS = None


def compose(fi):
    t = fi / FPS
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    SUBS.draw(img, t, 1 - prog(t, END - 0.5, 0.3))
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global SUBS
    SUBS = Subs(LINES, KEY, {}, y=330, size=96, style="accent", accent=hex_bgr(WH), stroke=8, face="impact")


# ---------------------------------------------------------------- efectos sintetizados
def _t(d, sr):
    return np.arange(int(d * sr)) / sr


def hum(d, sr, f=100.0):          # zumbido eléctrico de la bobina (sube y baja suave)
    t = _t(d, sr)
    y = 0.55 * np.sin(2 * np.pi * f * t) + 0.28 * np.sin(2 * np.pi * 2 * f * t + 0.4) + 0.12 * np.sin(2 * np.pi * 3 * f * t + 1.1)
    a = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.35)
    return y * a * 0.18


def ping(f, d, sr, drop=0.03):     # sonar: seno con caída de tono y cola
    t = _t(d, sr)
    ph = 2 * np.pi * f * (t - drop * t * t / (2 * d))
    return (np.sin(ph) + 0.25 * np.sin(2 * ph)) * np.exp(-t / (d * 0.28)) * np.minimum(1, t / 0.003) * 0.3


def blip(f0, f1, d, sr):           # paquete: chirrido corto que sube o baja
    t = _t(d, sr)
    f = np.linspace(f0, f1, len(t))
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t / (d * 0.5)) * np.minimum(1, t / 0.002) * 0.28


def chatter(d, sr, seed=0):        # «hablan»: ráfaga de pitiditos tipo módem, muy bajitos
    rng = np.random.default_rng(seed)
    out = np.zeros(int(d * sr))
    x = 0.0
    while x < d - 0.05:
        b = blip(rng.uniform(900, 2400), rng.uniform(900, 2400), rng.uniform(0.025, 0.06), sr)
        s = int(x * sr)
        out[s:s + len(b)] += b[:len(out) - s] * 0.6
        x += rng.uniform(0.04, 0.09)
    return out * np.minimum(1, _t(d, sr) / 0.1)[:len(out)]


def sizzle(d, sr, seed=1):         # calor: chisporroteo de ruido que crece
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    n = rng.standard_normal(len(t))
    hp = n - np.convolve(n, np.ones(6) / 6, "same")
    crack = (rng.random(len(t)) < 0.0015) * rng.uniform(0.5, 1.0, len(t))
    crack = np.convolve(crack, np.exp(-np.arange(200) / 30), "same")
    return (hp * 0.08 + crack * 0.25) * np.minimum(1, t / d * 1.4) * np.minimum(1, (d - t) / 0.2)


def powerdown(d, sr):              # corte: el zumbido cae de tono y se apaga + golpe seco
    t = _t(d, sr)
    f = 260 * np.exp(-t / (d * 0.35)) + 30
    y = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t / (d * 0.45)) * 0.5
    y += np.sin(2 * np.pi * 55 * t) * np.exp(-t / 0.12) * 0.6
    return y


def buzz(d, sr):                   # «no cuadra»: aviso grave
    t = _t(d, sr)
    return np.sign(np.sin(2 * np.pi * 140 * t)) * 0.12 * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.03)


def bell(sr, f=1046.5, d=2.2):     # campana de combate
    t = _t(d, sr)
    y = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d * 0.3 / m ** 0.4)) for m, a in [(1, 1), (2.0, 0.5), (2.76, 0.35), (5.4, 0.15)])
    return y * np.minimum(1, t / 0.002) * 0.3


def boom(sr, d=0.9):               # golpe grave («nunca estará a su nivel»)
    t = _t(d, sr)
    return (np.sin(2 * np.pi * (60 * np.exp(-t * 2) + 35) * t) * np.exp(-t / 0.3) * 0.8 + np.random.default_rng(3).standard_normal(len(t)) * np.exp(-t / 0.04) * 0.15)


def shatter(sr, d=1.0, seed=2):    # los títulos se rompen: ruido agudo y cristalitos
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    n = rng.standard_normal(len(t))
    hp = n - np.convolve(n, np.ones(4) / 4, "same")
    out = hp * np.exp(-t / 0.18) * 0.5
    for _ in range(26):
        s = int(rng.uniform(0, 0.6) * sr)
        b = blip(rng.uniform(3000, 7000), rng.uniform(2500, 6000), rng.uniform(0.02, 0.06), sr)
        out[s:s + len(b)] += b[:len(out) - s] * 0.5
    return out


def chord(sr, fs=(523.25, 659.25, 783.99, 1046.5), d=1.6):   # victoria (las dos)
    return sum(sfx_ding(f, d, sr) for f in fs) * 0.6


def sfx_ding(f, d, sr):
    t = _t(d, sr)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d * 0.35 / m ** 0.5)) for m, a in [(1, 1), (2.76, 0.4), (5.4, 0.18)]) * np.minimum(1, t / 0.002) * 0.22


def rocket(sr, d=1.1):             # el cohete de FP sale
    t = _t(d, sr)
    n = np.random.default_rng(7).standard_normal(len(t))
    lp = np.convolve(n, np.ones(30) / 30, "same")
    return lp * np.minimum(1, t / 0.08) * np.exp(-np.maximum(0, t - 0.3) / 0.5) * 1.2


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((END + 1) * sr))
    mix = lambda x, t0, g=1.0: sfx.mix(out, x, max(0.0, t0), g)  # noqa: E731
    mix(sfx.drone(len(out)), 0, 0.8)
    # apertura: lluvia de ofertas y las tarjetas que se tiñen
    mix(sfx.whoosh(1.0), 0.0, 0.7)
    rng = np.random.default_rng(11)
    for k in range(18):
        mix(sfx.tick(int(rng.integers(0, 12))), rng.uniform(0.0, 1.0), 0.18)
    for i in range(5):
        mix(sfx.ding(1046.5 * 2 ** (i / 12 * 2), 0.6), at("cinco") + i * 0.12, 0.28)
    for i in range(2):
        mix(sfx.ding(784.0 * 2 ** (i / 12 * 3), 0.6), at("carrera", 1, 1) + i * 0.12, 0.3)
    mix(sfx.whoosh(0.9), at("y", 1, 2) - 0.2, 0.8)                      # vuelo a la arena
    mix(bell(sr), at("aun"), 0.5)                                       # campana: empieza el combate
    mix(boom(sr), at("nunca"), 0.8)
    mix(sfx.clack(3), at("nunca") + 0.02, 0.5)
    mix(sfx.ding(1318.5, 0.8), at("tienen"), 0.25)
    mix(sfx.whoosh(0.7), at("los", 1, 4) - 0.25, 0.4)
    for k in range(2):
        mix(sfx.clack(k), at("dos", 1, 4) + k * 0.13, 0.7)
    mix(sfx.clack(5), at("prácticas") + 0.05, 0.5)
    mix(sfx.whoosh(0.6), at("vosotros") - 0.1, 0.35)
    for k in range(4):
        mix(sfx.clack(k + 2), at("cuatro") + k * 0.1, 0.7)
    for k in range(3):
        mix(sfx.tick(5 + k), at("teoría") + k * 0.12, 0.35)
    mix(sfx.whoosh(0.6), at("herramientas") - 0.1, 0.35)
    mix(sfx.whoosh(0.8), at("debajo") - 0.3, 0.5)
    mix(sfx.whoosh(1.0), at("vamos") - 0.1, 0.8)                         # vuelo a los datos
    mix(sfx.ding(1567.98, 0.8), at("datos"), 0.3)
    mix(shatter(sr), at("exige"), 0.9)
    mix(sfx.clack(6), at("título") + 0.05, 0.7)                          # sello
    mix(buzz(0.25, sr), at("regulada") + 0.05, 0.45)
    mix(sfx.ding(1760.0, 0.7), at("industrial") + 0.05, 0.35)
    mix(sfx.ding(1975.5, 0.7), at("teleco") + 0.05, 0.35)
    for f, d0 in ((1318.5, 0.0), (1760.0, 0.12)):
        mix(sfx.ding(f, 1.0), at("punto", 1, 8) + 0.25 + d0, 0.5)
    mix(sfx.whoosh(1.0), at("pero", 1, 9) - 0.1, 0.8)                      # vuelo a las oposiciones
    for k in range(5):
        mix(sfx.tick(3 + k), at("oposiciones") + 0.3 + k * 0.35, 0.3)
    mix(sfx.clack(8), at("exigen"), 0.7)
    mix(sfx.ding(1567.98, 0.8), at("exigen") + 0.1, 0.35)
    for k in range(3):
        mix(sfx.tick(2 + k), at("con", 1, 9) + 0.25 + k * 0.3, 0.3)
    mix(buzz(0.3, sr), at("b", 1, 9), 0.55)
    mix(buzz(0.3, sr), at("máster"), 0.5)
    mix(sfx.clack(9), at("universitario"), 0.7)
    mix(sfx.ding(1567.98, 0.9), at("universitario") + 0.1, 0.35)
    for f, d0 in ((1046.5, 0.0), (1396.9, 0.12)):
        mix(sfx.ding(f, 1.0), at("punto", 1, 11) + 0.25 + d0, 0.5)
    mix(sfx.whoosh(1.1), at("punto", 1, 11) + 0.6, 0.8)                    # vuelta a la arena
    mix(sfx.ding(1318.5, 0.8), at("quién"), 0.25)
    mix(rocket(sr), at("antes"), 0.6)
    for k in range(3):
        mix(sfx.ding(1174.7 * 2 ** (k / 12 * 4), 0.7), at("abiertas") + k * 0.08, 0.3)
    mix(chord(sr), at("las"), 0.9)
    mix(sfx.whoosh(0.9), at("primero") - 0.1, 0.5)
    mix(sfx.clack(4), at("selectividad") + 0.05, 0.6)
    mix(sfx.ding(2093.0, 0.8), at("medio") + 0.05, 0.35)
    mix(sfx.clack(1), at("fp", 1, 15) + 0.02, 0.8)
    mix(sfx.clack(2), at("carrera", 1, 15) + 0.02, 0.8)
    mix(bell(sr, 880.0, 1.6), at("defiéndelo"), 0.35)
    mix(sfx.whoosh(1.2), END - 1.2, 0.6)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "fp_carrera.mp4")):
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    sfxp = os.path.join(ROOT, "out", "sfx.wav")
    sfx_track(sfxp)
    # 60 fps reales con el peso controlado (≈45 MB como mucho) para que se pueda descargar
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-i", sfxp, "-filter_complex",
           "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo,apad[v];[2:a]volume=0.35[s];[v][s]amix=inputs=2:duration=first:normalize=0[a]",
           "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-maxrate", "6M", "-bufsize", "12M", "-pix_fmt", "yuv420p",
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
    elif len(sys.argv) > 1 and sys.argv[1] == "--sfx":
        sfx_track(os.path.join(ROOT, "out", "sfx.wav"))
    else:
        main()
