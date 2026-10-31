"""Compone una «Pregunta del día» (Bomberados, formato 3): fotogramas (out/frames) + subtítulos palabra a palabra en
Impact + voz + efectos sintetizados (chorro de agua, tic-tac de la cuenta atrás, letras, la marca).

    cd projects/<p> && python3 ajustar_voz.py
    ../../bomberados/plantillas/pregunta/render.sh projects/<p>
    python3 bomberados/plantillas/pregunta/compose.py projects/<p> [--test t1 t2 ...]
"""
import json
import os
import subprocess
import sys
from multiprocessing import Pool

import cv2
import numpy as np

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
sys.path.insert(0, REPO)
from engine import sfx  # noqa: E402
from engine.fin_draw import prog, hex_bgr  # noqa: E402
from engine.subs import Subs, norm  # noqa: E402

FPS, W, H = 60, 1080, 1920
PROJ = os.path.join(REPO, sys.argv[1])
Q = json.load(open(os.path.join(PROJ, "pregunta.json")))
LINES = json.load(open(os.path.join(PROJ, "tiempos.json")))
END = LINES[-1]["end"] + 1.2
N = int(END * FPS)
FRAMES = os.path.join(PROJ, "out", "frames")
AUDIO = os.path.join(PROJ, "assets", "voz.mp3")
WORDS = [dict(w, n=norm(w["w"]), line=i + 1) for i, l in enumerate(LINES) for w in l["words"]]
SUBS = None


def at(spec):
    word, k, line = spec
    c = 0
    for w in WORDS:
        if w["line"] == line and w["n"] == norm(word):
            c += 1
            if c == k:
                return w["start"] - 0.03
    raise KeyError(spec)


def init():
    global SUBS
    key = {int(k): v for k, v in Q.get("subs_key", {}).items()}
    SUBS = Subs(LINES, key, {}, y=330, size=96, style="accent", accent=hex_bgr("#EEF2F6"), stroke=8, face="impact")


def compose(fi):
    t = fi / FPS
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    SUBS.draw(img, t, 1 - prog(t, END - 0.5, 0.3))
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


# ---------------------------------------------------------------- efectos
def _t(d):
    return np.arange(int(d * sfx.SR)) / sfx.SR


def _lp(x, k):
    return np.convolve(x, np.ones(max(1, int(k))) / max(1, int(k)), "same")


def hiss(d, seed=1):               # chorro de agua: ruido claro que respira
    w = np.random.default_rng(seed).standard_normal(len(_t(d)))
    t = _t(d)
    return (w - _lp(w, 6)) * (0.8 + 0.2 * np.sin(2 * np.pi * 3.1 * t)) * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.3) * 0.35


def tick(hi=True):
    t = _t(0.04)
    return np.sin(2 * np.pi * (2600 if hi else 1900) * t) * np.exp(-t / 0.006) * 0.5


def boom(d=1.0, f=60):
    t = _t(d)
    return np.sin(2 * np.pi * (f * np.exp(-t * 2.5) + 32) * t) * np.exp(-t / 0.35) * 0.9


def bell(f, d=1.2):
    t = _t(d)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d * 0.3 / m ** 0.4)) for m, a in [(1, 1), (2.0, 0.5), (2.76, 0.3)]) * np.minimum(1, t / 0.002) * 0.3


def blip(f0, f1, d=0.1):
    t = _t(d)
    return np.sin(2 * np.pi * np.cumsum(np.linspace(f0, f1, len(t))) / sfx.SR) * np.exp(-t / (d * 0.5)) * 0.3


BREATH_P = 4.2                        # el mismo ciclo que breath() en scene.js


def breathing(d):                      # inspiración (ruido que sube, más claro) y espiración (más grave), con pausa
    t = _t(d)
    u = (t % BREATH_P) / BREATH_P
    ins = np.where(u < 0.4, np.sin(np.pi * np.clip(u / 0.4, 0, 1)), 0.0)
    exp_ = np.where((u >= 0.4) & (u < 0.85), np.sin(np.pi * np.clip((u - 0.4) / 0.45, 0, 1)), 0.0)
    w = np.random.default_rng(11).standard_normal(len(t))
    bright = w - _lp(w, 4)
    dark = _lp(w, 12) - _lp(w, 90)
    return (bright * ins ** 1.5 * 0.18 + dark * exp_ ** 1.5 * 0.35) * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.3)


def rumble(d):                          # motor diésel: graves que laten
    t = _t(d)
    w = np.random.default_rng(13).standard_normal(len(t))
    lo = _lp(w, 120) * 6
    eng = np.sin(2 * np.pi * 38 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
    return (lo * 0.5 + eng * 0.35) * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.4)


def stamp_hit():                       # golpe seco de sello de goma
    t = _t(0.25)
    w = np.random.default_rng(12).standard_normal(len(t))
    return (_lp(w, 20) * 1.4 + np.sin(2 * np.pi * 140 * t) * 0.6) * np.exp(-t / 0.035)


def monitor_beep():
    t = _t(0.14)
    return np.sin(2 * np.pi * 1320 * t) * np.minimum(1, t / 0.005) * np.exp(-t / 0.06) * 0.35


def sfx_track(path):
    out = np.zeros(int((END + 1) * sfx.SR))
    mix = lambda x, t0, g=1.0: sfx.mix(out, x, max(0.0, t0), g)  # noqa: E731
    c = {k: (at(v) if not isinstance(v[0], list) else [at(s) for s in v]) for k, v in Q["cues"].items()}
    mix(sfx.drone(len(out)), 0, 0.4)
    mix(boom(1.0, 55), 0, 0.6)
    if Q["intro"] == "reduccion":
        mix(hiss(c["cuenta"] + 0.2), 0, 0.7)                 # el agua corre hasta la cuenta atrás
        mix(blip(500, 900, 0.18), c["manometro"], 0.6)
        for k in ("d1", "d2"):
            mix(sfx.clack(3), c[k], 0.5)
    if Q["intro"] == "respiracion":
        mix(breathing(c["cuenta"] + 0.3), 0, 0.9)            # la respiración, al ritmo de los pulmones de la escena
        mix(sfx.whoosh(0.5), c["sello"] - 0.25, 0.6)          # el sello cae
        mix(boom(1.2, 48), c["sello"] - 0.02, 1.0)
        mix(stamp_hit(), c["sello"] - 0.02, 0.9)
        for k in ("albacete", "anio"):
            mix(sfx.clack(5), c[k], 0.45)
        mix(blip(1000, 1000, 0.12), c["fr"], 0.5)              # el monitor se enciende
        t = c["fr"] + 0.3
        while t < c["cuenta"] - 0.2:                            # pitido suave en cada respiración (al llenarse)
            k = int(t / BREATH_P)
            tb = k * BREATH_P + 0.4 * BREATH_P
            if tb >= t:
                mix(monitor_beep(), tb, 0.35)
            t = (k + 1) * BREATH_P + 0.01
    if Q["intro"] == "adr":
        mix(boom(1.0, 70), 0.02, 0.5)                          # el título entra
        mix(sfx.whoosh(0.6), c["panel"] - 0.3, 0.8)            # el panel se estampa
        mix(boom(1.2, 50), c["panel"] + 0.05, 0.9)
        mix(sfx.clack(6), c["panel"] + 0.08, 0.8)
        mix(rumble(c["enunciado"] - c["camion"] + 0.6), c["camion"] - 0.2, 0.9)   # la cisterna en marcha
        mix(sfx.whoosh(0.9), c["camion"] - 0.15, 0.7)
        mix(bell(988.0, 0.8), c["numeros"] + 0.12, 0.35)
        mix(bell(1318.5, 0.8), c["numeros"] + 0.42, 0.35)
        mix(blip(900, 1500, 0.16), c["arriba"], 0.6)
    mix(sfx.whoosh(0.8), c["enunciado"] - 0.2, 0.7)
    mix(sfx.whoosh(0.6), c["opciones"] - 0.1, 0.6)
    for i in range(4):
        mix(sfx.clack(i), c["opciones"] + 0.03 * i, 0.4)
    t0, t1 = c["cuenta"], c["letras"][0] - 0.1
    for i in range(5):
        mix(tick(True), t0 + i * (t1 - t0) / 5, 0.9)
        mix(tick(False), t0 + (i + 0.5) * (t1 - t0) / 5, 0.6)
    mix(bell(523.25, 0.9), t1, 0.4)
    for i, tl in enumerate(c["letras"]):
        mix(blip(800 + 150 * i, 1100 + 150 * i, 0.09), tl + 0.05, 0.5)
    mix(sfx.whoosh(0.6), c["descripcion"] - 0.1, 0.5)
    mix(sfx.whoosh(0.9), c["marca"] - 0.35, 0.7)
    mix(boom(1.4, 50), c["marca"] - 0.08, 0.9)
    mix(bell(784.0, 2.0), c["marca"], 0.45)
    mix(sfx.ding(1568.0, 0.8), c["prueba"] - 0.05, 0.5)
    mix(sfx.ding(2093.0, 1.0), c["prueba"] + 0.4, 0.4)
    sfx.write(path, out, drive=1.0, level=0.9)


def main():
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    sfxp = os.path.join(PROJ, "out", "sfx.wav")
    sfx_track(sfxp)
    dst = os.path.join(PROJ, "out", os.path.basename(PROJ) + ".mp4")
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-i", sfxp, "-filter_complex",
           "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo,apad[v];[2:a]volume=0.35[s];[v][s]amix=inputs=2:duration=first:normalize=0[a]",
           "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", f"{N / FPS:.3f}", "-movflags", "+faststart", dst]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(4, initializer=init) as pool:
        for buf in pool.imap(compose, range(N), chunksize=8):
            ff.stdin.write(buf)
    ff.stdin.close()
    ff.wait()
    print("vídeo →", dst)


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[2] == "--test":
        init()
        os.makedirs(os.path.join(PROJ, "out", "ctest"), exist_ok=True)
        for t in [float(x) for x in sys.argv[3:]]:
            fi = int(round(t * FPS))
            img = cv2.imread(os.path.join(PROJ, "out", "test", f"f{fi:05d}.jpg")).astype(np.float32) / 255
            SUBS.draw(img, t, 1)
            cv2.imwrite(os.path.join(PROJ, "out", "ctest", f"c{t:05.2f}.jpg"), (np.clip(img, 0, 1) * 255).astype(np.uint8))
    elif len(sys.argv) > 2 and sys.argv[2] == "--sfx":
        os.makedirs(os.path.join(PROJ, "out"), exist_ok=True)
        sfx_track(os.path.join(PROJ, "out", "sfx.wav"))
    else:
        main()
