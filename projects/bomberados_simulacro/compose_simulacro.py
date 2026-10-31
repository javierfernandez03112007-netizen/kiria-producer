"""Compone la promo «Simulacro en directo» (Bomberados × Élite Bomberos): fotogramas (out/frames) + subtítulos palabra a
palabra en Impact + voz + efectos sintetizados (rotulador, sello, calendario, caja registradora, toque, ✓…).

    python3 bomberados/plantillas/pregunta/asr.py projects/bomberados_simulacro/assets/voz_original.mp3 projects/bomberados_simulacro/asr_original.json
    python3 bomberados/plantillas/pregunta/ajustar_voz.py projects/bomberados_simulacro
    bomberados/plantillas/pregunta/render.sh projects/bomberados_simulacro
    python3 projects/bomberados_simulacro/compose_simulacro.py [--test t1 t2 ... | --sfx]
"""
import json
import os
import subprocess
import sys
from multiprocessing import Pool

import cv2
import numpy as np

PROJ = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(PROJ, "..", ".."))
sys.path.insert(0, REPO)
from engine import sfx  # noqa: E402
from engine.fin_draw import prog, hex_bgr  # noqa: E402
from engine.subs import Subs, norm  # noqa: E402

FPS, W, H = 60, 1080, 1920
V = json.load(open(os.path.join(PROJ, "video.json")))
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
    key = {int(k): v for k, v in V.get("subs_key", {}).items()}
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


def stamp_hit(seed=12):                 # golpe seco de sello de goma
    t = _t(0.25)
    w = np.random.default_rng(seed).standard_normal(len(t))
    return (_lp(w, 20) * 1.4 + np.sin(2 * np.pi * 140 * t) * 0.6) * np.exp(-t / 0.035)


def scratch(d=0.09, seed=3):            # trazo de rotulador sobre papel
    t = _t(d)
    w = np.random.default_rng(seed).standard_normal(len(t))
    hp = w - _lp(w, 5)
    return hp * np.sin(np.pi * t / d) ** 0.6 * (0.7 + 0.3 * np.sin(2 * np.pi * 90 * t)) * 0.45


def thud(seed=5):                       # libro que cae sobre la pila
    t = _t(0.3)
    w = np.random.default_rng(seed).standard_normal(len(t))
    return (_lp(w, 60) * 4 + np.sin(2 * np.pi * 85 * t) * 0.8) * np.exp(-t / 0.05) * 0.6


def sfx_track(path):
    out = np.zeros(int((END + 1) * sfx.SR))
    mix = lambda x, t0, g=1.0: sfx.mix(out, x, max(0.0, t0), g)  # noqa: E731
    c = {k: at(v) for k, v in V["cues"].items()}
    mix(sfx.drone(len(out)), 0, 0.4)
    # apertura: la ✗ de rotulador en primer plano y la cámara que se aleja
    mix(boom(1.0, 55), 0, 0.6)
    mix(scratch(0.11, 1), 0.0, 0.9)
    mix(scratch(0.11, 2), 0.13, 0.9)
    mix(stamp_hit(7), 0.05, 0.35)
    mix(sfx.whoosh(1.0), 0.32, 0.6)
    for i in range(5):                                      # los manuales
        mix(thud(10 + i), c["estudiar"] - 0.1 + 0.07 * i + 0.22, 0.5)
    for i in [0, 2, 3, 4, 5, 6, 7, 8, 9]:                   # ✗ y ✓ del corrector (la fila 2 ya se tachó en la apertura)
        mix(scratch(0.07, 20 + i), c["fallando"] - 0.05 + 0.065 * i + 0.02, 0.55)
    mix(sfx.whoosh(0.3), c["examen1"] - 0.2, 0.5)           # SUSPENSO
    mix(stamp_hit(), c["examen1"] + 0.1, 1.0)
    mix(boom(1.2, 48), c["examen1"] + 0.1, 0.9)
    # calendario vacío
    mix(sfx.whoosh(0.7), c["academia"] - 0.25, 0.7)
    mix(sfx.clack(1), c["academia"] + 0.25, 0.4)
    mix(blip(330, 170, 0.32), c["simulacro0"] + 0.06, 0.8)  # «ni un simulacro»: zumbido de error
    mix(blip(250, 140, 0.3), c["simulacro0"] + 0.2, 0.5)
    # noviembre: la hoja del calendario pasa, el domingo 1 se rodea y el contador pasa a 1
    mix(sfx.whoosh(0.4), c["domingo"] - 0.12, 0.7)
    mix(sfx.clack(2), c["domingo"] + 0.08, 0.5)
    mix(scratch(0.35, 40), c["uno"] - 0.04, 0.6)
    mix(sfx.ding(1318.5, 0.9), c["uno"] + 0.24, 0.6)
    # SIMULACRO EN DIRECTO
    mix(sfx.whoosh(0.6), c["simulacro"] - 0.3, 0.8)
    mix(boom(1.4, 50), c["simulacro"] + 0.04, 1.0)
    mix(sfx.clack(6), c["simulacro"] + 0.08, 0.7)
    mix(blip(1000, 1000, 0.12), c["directo"] + 0.02, 0.6)
    mix(blip(1000, 1000, 0.12), c["directo"] + 0.17, 0.6)
    mix(sfx.whoosh(0.45), c["adrian"] - 0.18, 0.6)
    mix(bell(784.0, 1.2), c["elite"] + 0.02, 0.4)
    # a casa: el título sube a la cabecera, la casa se dibuja, el reloj del examen y la etiqueta de 10 €
    mix(sfx.whoosh(0.8), c["desde"] - 0.3, 0.7)
    mix(sfx.whoosh(0.5), c["casa"] - 0.12, 0.4)
    mix(sfx.ding(1046.5, 0.7), c["casa"] + 0.2, 0.35)
    for i in range(4):
        mix(tick(i % 2 == 0), c["examen2"] + 0.5 * i, 0.55)
    mix(sfx.clack(3), c["examen2"] + 0.35, 0.5)
    mix(sfx.whoosh(0.35), c["precio"] - 0.2, 0.6)
    mix(sfx.clack(4), c["precio"] + 0.15, 0.6)
    mix(sfx.ding(2093.0, 0.6), c["precio"] + 0.2, 0.55)     # caja registradora
    mix(sfx.ding(2637.0, 0.9), c["precio"] + 0.28, 0.55)
    # APÚNTATE + @elitebomberos
    mix(sfx.whoosh(0.5), c["apuntate"] - 0.2, 0.6)
    mix(blip(700, 1000, 0.08), c["apuntate"] + 0.5, 0.7)    # toque
    mix(sfx.whoosh(0.4), c["apuntate"] + 0.52, 0.35)
    mix(blip(1200, 1500, 0.1), c["instagram"], 0.4)
    for i in range(14):                                     # se escribe el usuario
        mix(tick(i % 3 == 0), c["elite2"] - 0.1 + 0.5 * i / 14, 0.3)
    # repaso: cada ✗ se vuelve ✓
    mix(sfx.whoosh(0.7), c["despues"] - 0.2, 0.7)
    mix(sfx.whoosh(0.9), c["repasa"], 0.35)
    k = 0
    for i, wrong in enumerate([1, 1, 0, 1, 1, 0, 1, 1, 0, 1]):
        if wrong:
            mix(blip(700 + 90 * k, 1000 + 90 * k, 0.09), c["repasa"] + 0.1 + 0.075 * i + 0.11, 0.5)
            k += 1
    # marca
    mix(sfx.whoosh(0.9), c["marca"] - 0.35, 0.7)
    mix(boom(1.4, 50), c["marca"] - 0.08, 0.9)
    mix(bell(784.0, 2.0), c["marca"], 0.45)
    mix(sfx.ding(1568.0, 0.8), c["falla"] + 0.5, 0.45)
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
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        init()
        os.makedirs(os.path.join(PROJ, "out", "ctest"), exist_ok=True)
        for t in [float(x) for x in sys.argv[2:]]:
            fi = int(round(t * FPS))
            img = cv2.imread(os.path.join(PROJ, "out", "test", f"f{fi:05d}.jpg")).astype(np.float32) / 255
            SUBS.draw(img, t, 1)
            cv2.imwrite(os.path.join(PROJ, "out", "ctest", f"c{t:05.2f}.jpg"), (np.clip(img, 0, 1) * 255).astype(np.uint8))
    elif len(sys.argv) > 1 and sys.argv[1] == "--sfx":
        os.makedirs(os.path.join(PROJ, "out"), exist_ok=True)
        sfx_track(os.path.join(PROJ, "out", "sfx.wav"))
    else:
        main()
