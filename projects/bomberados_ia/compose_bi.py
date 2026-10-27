"""Compone «Bomberados IA»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(lo que hay que buscar en oro, los fallos en rojo, la app y su IA en turquesa) + voz + efectos sintetizados (fuego, la V que
vuela, plantilla y rotulador, manuales y páginas, la tarde que se va, portátil y clics, la IA, «Falso.», la gota y la marca).

    python3 ajustar_voz.py && python3 env_voz.py
    ./render_local.sh                                   (o trozos en varias máquinas + merge_chunks.sh)
    python3 projects/bomberados_ia/compose_bi.py [--test t1 t2 ...] [--sfx]
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
WORDS = [dict(w, n=norm(w["w"]), line=i + 1) for i, l in enumerate(LINES) for w in l["words"]]


def at(word, k=1, line=None):
    c = 0
    for w in WORDS:
        if (line is None or w["line"] == line) and w["n"] == norm(word):
            c += 1
            if c == k:
                return w["start"] - 0.03
    raise KeyError(word)


# ---------------------------------------------------------------- subtítulos
G, R, T, E, WH = "#F2B233", "#FF5A4E", "#62E3D4", "#FF7A2F", "#EEF2F6"
KEY = {1: {"fuego": E, "aceite": G, "b": G, "verdadero": T, "falso": R, "trampa": R},
       2: {"plantilla": WH, "treinta": R, "siete": R, "rojo": R},
       3: {"buscarla": WH, "manual": G, "tema": G, "página": G},
       4: {"hojas": WH, "índices": WH, "apuntes": WH, "tarde": R},
       5: {"bomberados": G},
       6: {"fallado": R, "inteligencia": T, "artificial": T, "manual": T, "página": T},
       7: {"define": T},
       8: {"compara": T, "parecidas": T, "trampa": R},
       9: {"falso": G},
       10: {"líquido": WH, "líquidos": WH, "cocina": G, "propia": G, "f": G},
       11: {"v": T, "f": G, "comentarios": WH},
       12: {"bomberados": G, "casa": T, "examen": WH},
       13: {"gratis": T, "cinco": G, "días": G}}
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


def _lp(x, k):                     # paso bajo sencillo (media móvil)
    k = max(1, int(k))
    return np.convolve(x, np.ones(k) / k, "same")


def blip(f0, f1, d, sr):
    t = _t(d, sr)
    f = np.linspace(f0, f1, len(t))
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t / (d * 0.5)) * np.minimum(1, t / 0.002) * 0.28


def boom(sr, d=1.1, f=70):
    t = _t(d, sr)
    return (np.sin(2 * np.pi * (f * np.exp(-t * 2.5) + 32) * t) * np.exp(-t / 0.35) * 0.9 + np.random.default_rng(3).standard_normal(len(t)) * np.exp(-t / 0.05) * 0.2)


def tone(f, d, sr, a=0.2, fade=0.04):
    t = _t(d, sr)
    return np.sin(2 * np.pi * f * t) * np.minimum(1, t / fade) * np.minimum(1, (d - t) / fade) * a


def buzz(d, sr, f=140):
    t = _t(d, sr)
    return np.sign(np.sin(2 * np.pi * f * t)) * 0.12 * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.03)


def ding(f, d, sr):
    t = _t(d, sr)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d * 0.35 / m ** 0.5)) for m, a in [(1, 1), (2.76, 0.4), (5.4, 0.18)]) * np.minimum(1, t / 0.002) * 0.22


def chord(sr, fs=(523.25, 659.25, 783.99, 1046.5), d=1.6):
    return sum(ding(f, d, sr) for f in fs) * 0.6


def bell(sr, f=880.0, d=1.6):
    t = _t(d, sr)
    y = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d * 0.3 / m ** 0.4)) for m, a in [(1, 1), (2.0, 0.5), (2.76, 0.35), (5.4, 0.15)])
    return y * np.minimum(1, t / 0.002) * 0.3


def crackle(d, sr, seed=1, rate=0.0012, a=1.0):     # chisporroteo
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    imp = (rng.random(len(t)) < rate) * rng.uniform(0.2, 1.0, len(t)) * np.sign(rng.standard_normal(len(t)))
    return np.convolve(imp, np.exp(-np.arange(120) / 12) * np.sin(np.arange(120) * 1.5), "same") * 0.3 * a


def roar(d, sr, seed=2):           # el fuego de la sartén: ruido grave que respira
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    w = rng.standard_normal(len(t))
    lo = _lp(w, 40) - _lp(w, 400) * 0.6
    am = 0.75 + 0.25 * np.sin(2 * np.pi * 1.3 * t) * np.sin(2 * np.pi * 0.37 * t + 1) + 0.1 * _lp(rng.standard_normal(len(t)), 2000) * 8
    return lo * am * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.4) * 1.6


def fwoom(d, sr, seed=4):          # llamarada: ruido que se abre y se cierra
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    w = rng.standard_normal(len(t))
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return (_lp(w, 6) * 0.6 + _lp(w, 30) * 1.2) * env * 0.7 + np.sin(2 * np.pi * (60 + 40 * t / d) * t) * env * 0.25


def paper(sr, d=0.07, seed=0, a=1.0):   # una hoja que pasa
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    w = rng.standard_normal(len(t))
    hp = w - _lp(w, 8)
    return hp * np.sin(np.pi * t / d) ** 0.7 * 0.35 * a


def riffle(d, sr, rate=11, seed=5):     # pasar páginas muy deprisa
    out = np.zeros(int(d * sr))
    rng = np.random.default_rng(seed)
    x = 0.0
    while x < d - 0.08:
        p = paper(sr, rng.uniform(0.05, 0.09), int(rng.integers(1e6)), rng.uniform(0.6, 1.0))
        s = int(x * sr)
        out[s:s + len(p)] += p[:len(out) - s]
        x += 1 / rate * rng.uniform(0.75, 1.25)
    return out


def swirl(d, sr, seed=6):           # remolino de papeles
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    w = rng.standard_normal(len(t))
    hp = w - _lp(w, 5)
    am = 0.55 + 0.45 * np.sin(2 * np.pi * 7 * t + np.sin(2 * np.pi * 1.3 * t) * 3)
    return hp * am * np.sin(np.pi * t / d) * 0.45 + riffle(d, sr, 22, seed + 1) * 0.6


def marker(sr, d=0.12, seed=0):     # rotulador sobre la hoja
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    w = rng.standard_normal(len(t))
    bp = _lp(w, 3) - _lp(w, 14)
    return (bp * 0.5 + np.sin(2 * np.pi * (1800 + 600 * t / d) * t) * 0.05) * np.sin(np.pi * t / d) * 0.6


def clock_tick(sr, hi=True):
    t = _t(0.03, sr)
    return np.sin(2 * np.pi * (3200 if hi else 2400) * t) * np.exp(-t / 0.004) * 0.35


def click(sr):                      # clic de ratón
    t = _t(0.02, sr)
    return (np.sin(2 * np.pi * 4200 * t) * 0.5 + np.random.default_rng(9).standard_normal(len(t)) * 0.3) * np.exp(-t / 0.0025) * 0.6


def shimmer(d, sr, seed=7):        # la IA pensando
    rng = np.random.default_rng(seed)
    out = np.zeros(int(d * sr))
    x = 0.0
    while x < d - 0.1:
        f = rng.uniform(1800, 4200)
        b = blip(f, f * 1.05, 0.08, sr) * rng.uniform(0.3, 0.7)
        s = int(x * sr)
        out[s:s + len(b)] += b[:len(out) - s]
        x += rng.uniform(0.03, 0.07)
    return out + tone(660, d, sr, 0.05, 0.3) * np.linspace(0.6, 1.4, int(d * sr))[:int(d * sr)]


def plip(sr):                      # gota
    t = _t(0.25, sr)
    f = 600 + 900 * (1 - np.exp(-t / 0.03))
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t / 0.06) * 0.35


def splash(sr, d=0.5, seed=8):
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    w = rng.standard_normal(len(t))
    return (w - _lp(w, 10)) * np.exp(-t / 0.09) * 0.45 + _lp(w, 60) * np.exp(-t / 0.2) * 0.8


def pad(d, sr, fs=(220.0, 277.18, 329.63, 440.0), a=0.05):   # colchón suave mientras trabaja la app
    t = _t(d, sr)
    env = np.minimum(1, t / 1.2) * np.minimum(1, (d - t) / 0.8)
    return sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * 0.2 * t) * 0.6) for f in fs) * env * a


def rewind(sr, d=0.6):
    t = _t(d, sr)
    w = np.random.default_rng(9).standard_normal(len(t))
    lp = np.convolve(w, np.ones(12) / 12, "same")
    return lp * (t / d) ** 2 * 1.4 + np.sin(2 * np.pi * (300 + 900 * t / d) * t) * (t / d) ** 3 * 0.15


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((END + 1) * sr))
    mix = lambda x, t0, g=1.0: sfx.mix(out, x, max(0.0, t0), g)  # noqa: E731
    mix(sfx.drone(len(out)), 0, 0.45)
    tv0 = at("trampa", 1, 1) + 0.5                        # la V sale volando (como en la escena)
    tv1 = tv0 + 0.85
    tf0 = at("falso", 1, 9) - 0.05                        # la F sale de la pantalla
    tf1 = at("falso", 1, 9) + 0.85
    # fuego de la sartén: al principio y en la respuesta
    mix(roar(tv0 + 0.4, sr), 0.0, 0.55)
    mix(crackle(tv0 + 0.4, sr, 1, 0.0015), 0.0, 0.8)
    mix(roar(END - tf1 + 0.6, sr, 3), tf1 - 0.3, 0.55)
    mix(crackle(END - tf1 + 0.6, sr, 4, 0.0015), tf1 - 0.3, 0.8)
    # 1: la pregunta
    mix(fwoom(0.9, sr, 1), 0.0, 0.9)
    mix(boom(sr, 1.0, 55), 0.0, 0.6)
    mix(blip(900, 1300, 0.12, sr), at("clase", 1, 1), 0.5)
    mix(fwoom(0.6, sr, 2), at("verdadero") - 0.1, 0.7)
    mix(fwoom(0.6, sr, 3), at("falso", 1, 1) - 0.1, 0.7)
    tp, tt = at("piénsalo"), at("trampa", 1, 1) - 0.08
    for k in range(3):
        mix(clock_tick(sr, k % 2 == 0), tp + k * (tt - tp) / 3, 0.8)
    mix(buzz(0.28, sr, 160), at("trampa", 1, 1) - 0.03, 0.55)
    mix(boom(sr, 0.6, 90), at("trampa", 1, 1) - 0.03, 0.5)
    # 2: la V vuela a la hoja; la plantilla; ✓ … ✗
    mix(sfx.whoosh(1.1), tv0 - 0.15, 1.0)
    mix(fwoom(0.9, sr, 5), tv0, 0.6)
    mix(crackle(0.9, sr, 6, 0.004), tv0, 1.0)
    mix(sfx.clack(4), tv1 - 0.02, 0.6)
    mix(paper(sr, 0.35, 11, 1.4), tv1 + 0.02, 0.7)
    ttr = at("treinta")
    for i in range(6):
        mix(marker(sr, 0.09, i), tv1 + 0.45 + i * max(0.06, (ttr - tv1 - 0.55) / 6), 0.5)
    mix(marker(sr, 0.12, 20), ttr - 0.02, 1.0)
    mix(marker(sr, 0.12, 21), ttr + 0.1, 1.0)
    mix(boom(sr, 0.8, 60), ttr, 0.6)
    mix(buzz(0.25, sr), ttr + 0.03, 0.4)
    for i in range(8):
        mix(marker(sr, 0.06, 30 + i), ttr + 0.3 + i * 0.05, 0.35)
    mix(ding(392.0, 0.7, sr), at("rojo"), 0.3)
    # 3-4: a mano
    mix(sfx.whoosh(0.8), at("toca") - 0.1, 0.5)
    for i in range(6):
        mix(sfx.clack(i), at("manual", 1, 3) + 0.05 + i * 0.1, 0.3)
    for i in range(5):
        mix(blip(1400 + i * 120, 1800 + i * 120, 0.06, sr), at("tema") - 0.08 + i * 0.07, 0.35)
    mix(paper(sr, 0.25, 40, 1.2), at("página", 1, 3), 0.6)
    mix(riffle(at("apuntes") + 0.3 - at("hojas") + 0.1, sr), at("hojas") - 0.1, 1.0)
    mix(swirl(2.1, sr), at("apuntes") - 0.12, 0.9)
    mix(sfx.whoosh(0.9), at("apuntes") - 0.15, 0.6)
    for tm in (at("manual", 1, 4), at("manual", 2, 4)):
        mix(sfx.whoosh(0.5), tm - 0.15, 0.5)
        for i in range(3):
            mix(sfx.clack(i + 3), tm + i * 0.04, 0.3)
    tva = at("va")
    x, k = tva - 0.35, 0
    while x < at("tarde") + 0.5:                       # el reloj se acelera
        mix(clock_tick(sr, k % 2 == 0), x, 0.5)
        x += max(0.03, 0.22 - 0.06 * k)
        k += 1
    mix(sfx.whoosh(1.0), tva - 0.2, 0.4)
    mix(click(sr), at("tarde") - 0.02, 0.8)            # el flexo se enciende
    mix(paper(sr, 0.4, 50, 0.8), tva, 0.4)
    # 5: el portátil
    mix(sfx.clack(7), at("ahora") + 0.05, 0.5)
    mix(chord(sr, (523.25, 783.99), 0.9), at("ahora") + 0.35, 0.35)
    mix(sfx.whoosh(0.8), at("bomberados", 1, 5) - 0.2, 0.7)
    mix(bell(sr, 784.0, 1.2), at("bomberados", 1, 5), 0.35)
    # 6-8: la app y su IA
    mix(pad(tf0 - at("bomberados", 1, 5), sr), at("bomberados", 1, 5), 0.9)
    mix(click(sr), at("fallado"), 1.0)
    mix(blip(700, 900, 0.08, sr), at("fallado") + 0.08, 0.3)
    mix(click(sr), at("inteligencia"), 1.0)
    mix(shimmer(max(0.6, at("manual", 1, 6) - at("inteligencia") - 0.2), sr), at("inteligencia") + 0.08, 0.6)
    for tc in (at("manual", 1, 6) - 0.22, at("define") - 0.12, at("compara") - 0.12):
        mix(sfx.whoosh(0.35), tc - 0.05, 0.35)
        mix(ding(1318.5, 0.6, sr), tc + 0.05, 0.4)
        for i in range(8):
            mix(clock_tick(sr, i % 2 == 0), tc + 0.15 + i * 0.07, 0.12)
    mix(ding(1567.98, 0.7, sr), at("página", 1, 6), 0.45)
    for i, tr in enumerate((at("compara") + 0.3, at("compara") + 0.75, at("parecidas") + 0.05)):
        mix(blip(1200 + i * 200, 1500 + i * 200, 0.07, sr), tr, 0.45)
    mix(buzz(0.22, sr, 180), at("trampa", 1, 8) + 0.05, 0.35)
    # 9: «Falso.»
    mix(boom(sr, 1.4, 50), tf0 + 0.03, 1.0)
    mix(fwoom(1.0, sr, 9), tf0, 0.9)
    mix(sfx.whoosh(1.0), tf0 + 0.25, 1.0)
    mix(crackle(0.9, sr, 10, 0.004), tf0 + 0.1, 1.0)
    # 10: la gota, la B, la F
    mix(sfx.whoosh(0.5), at("aceite", 1, 10) - 0.1, 0.3)
    mix(plip(sr), at("aceite", 1, 10) + 0.35, 0.8)
    mix(splash(sr), at("b", 1, 10) - 0.08, 0.7)
    mix(blip(500, 300, 0.15, sr), at("b", 1, 10) - 0.05, 0.4)
    mix(sfx.whoosh(0.6), at("pero") - 0.05, 0.5)
    mix(fwoom(0.8, sr, 12), at("f", 1, 10) - 0.08, 1.0)
    mix(boom(sr, 1.0, 60), at("f", 1, 10), 0.7)
    mix(ding(1046.5, 0.9, sr), at("f", 1, 10) + 0.05, 0.4)
    # 11: ¿V o F?
    mix(fwoom(0.6, sr, 13), at("v", 1, 11) - 0.25, 0.6)
    mix(blip(1000, 1400, 0.1, sr), at("comentarios") - 0.05, 0.4)
    # 12-13: la marca
    t12 = at("bomberados", 1, 12)
    mix(sfx.whoosh(0.9), t12 - 0.35, 0.7)
    mix(boom(sr, 1.4, 50), t12 - 0.08, 0.9)
    mix(fwoom(1.0, sr, 14), t12 - 0.1, 0.7)
    mix(chord(sr, (523.25, 659.25, 783.99, 1046.5), 2.0), t12, 0.8)
    mix(bell(sr, 1046.5, 2.0), t12, 0.45)
    mix(sfx.whoosh(0.5), at("falla") - 0.1, 0.35)
    mix(ding(1568.0, 0.8, sr), at("pruébala") - 0.05, 0.5)
    mix(ding(2093.0, 1.0, sr), at("gratis") + 0.05, 0.4)
    mix(rewind(sr, 0.65), END - 0.72 - 0.55, 0.6)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "bomberados_ia.mp4")):
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    sfxp = os.path.join(ROOT, "out", "sfx.wav")
    sfx_track(sfxp)
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
