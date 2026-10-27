"""Compone «Bomberados»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(cifras y lugares en oro, suspensos en rojo, la app en turquesa) + voz + efectos sintetizados (brasas, cascos que caen,
contadores, sellos, lápiz, reloj y alarma, fichas que caen, ruleta, duelo y la marca).

    python3 ajustar_voz.py
    ./render_local.sh                                   (o trozos en varias máquinas + merge_chunks.sh)
    python3 projects/bomberos/compose_bo.py [--test t1 t2 ...] [--sfx]
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
KEY = {1: {"ocho": R, "madrid": G, "plaza": R},
       2: {"comunidad": G, "personas": WH, "plazas": G},
       3: {"valència": G, "aspirantes": WH, "noventa": G, "país": G, "vasco": G, "setenta": R, "suspendió": R},
       4: {"por": E, "qué": E},
       5: {"uno": E, "eliminatorio": R, "enorme": WH, "decenas": WH, "mañana": G, "fallo": R, "resta": R},
       6: {"dos": E, "tiempo": G, "psicotécnico": R, "contestar": R},
       7: {"tres": E, "leerse": WH, "entrenar": G},
       8: {"duro": WH, "física": WH, "cae": R, "test": R},
       9: {"bomberados": G, "app": T},
       10: {"ruleta": T, "test": T, "directo": T, "inteligencia": T, "artificial": T},
       11: {"jugando": T, "reloj": G},
       12: {"bomberados": G, "gratis": T, "cinco": G, "días": G}}
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


def blip(f0, f1, d, sr):           # chirrido corto que sube o baja
    t = _t(d, sr)
    f = np.linspace(f0, f1, len(t))
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t / (d * 0.5)) * np.minimum(1, t / 0.002) * 0.28


def counter(d, sr, n=24, f0=900):  # contador: tics cada vez más agudos
    out = np.zeros(int(d * sr))
    for k in range(n):
        x = k / n * (d - 0.05)
        b = blip(f0 + k * 50, f0 + k * 50, 0.03, sr)
        s = int(x * sr)
        out[s:s + len(b)] += b[:len(out) - s] * 0.7
    return out


def boom(sr, d=1.1, f=70):         # golpe grave
    t = _t(d, sr)
    return (np.sin(2 * np.pi * (f * np.exp(-t * 2.5) + 32) * t) * np.exp(-t / 0.35) * 0.9 + np.random.default_rng(3).standard_normal(len(t)) * np.exp(-t / 0.05) * 0.2)


def tone(f, d, sr, a=0.2, fade=0.04):
    t = _t(d, sr)
    return np.sin(2 * np.pi * f * t) * np.minimum(1, t / fade) * np.minimum(1, (d - t) / fade) * a


def buzz(d, sr, f=140):            # error / suspenso
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


def crackle(d, sr, seed=1, rate=0.0009):   # brasas: chasquidos sueltos y un siseo grave
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    imp = (rng.random(len(t)) < rate) * rng.uniform(0.2, 1.0, len(t)) * np.sign(rng.standard_normal(len(t)))
    pops = np.convolve(imp, np.exp(-np.arange(120) / 14) * np.sin(np.arange(120) * 1.3), "same")
    w = rng.standard_normal(len(t))
    hiss = np.convolve(w, np.ones(30) / 30, "same") * (0.7 + 0.3 * np.sin(2 * np.pi * 0.37 * t))
    return pops * 0.22 + hiss * 0.25


def scratch(sr, seed=0, d=0.09):    # lápiz que rellena una casilla
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    w = rng.standard_normal(len(t))
    hp = w - np.convolve(w, np.ones(5) / 5, "same")
    return hp * (0.5 + 0.5 * np.sin(2 * np.pi * 38 * t)) * np.sin(np.pi * t / d) * 0.22


def clock_tick(sr, hi=True):
    t = _t(0.03, sr)
    return np.sin(2 * np.pi * (3200 if hi else 2400) * t) * np.exp(-t / 0.004) * 0.35


def alarm(d, sr):                   # se acaba el tiempo: pitido cuadrado intermitente
    t = _t(d, sr)
    return np.sign(np.sin(2 * np.pi * 1900 * t)) * (np.sin(2 * np.pi * 9 * t) > 0) * 0.07 * np.minimum(1, (d - t) / 0.05)


def rewind(sr, d=0.6):              # golpe de vuelta (bucle)
    t = _t(d, sr)
    w = np.random.default_rng(9).standard_normal(len(t))
    lp = np.convolve(w, np.ones(12) / 12, "same")
    return lp * (t / d) ** 2 * 1.4 + np.sin(2 * np.pi * (300 + 900 * t / d) * t) * (t / d) ** 3 * 0.15


def wheel_ticks(t0, t1):            # la ruleta: 3 vueltas con frenada (misma curva que la escena), un clic por casilla
    d = max(0.8, t1 - t0)
    u = np.linspace(0, 1, 4000)
    ang = (1 - (1 - (1 - u) ** 3)) * 3 * 8    # en casillas
    ks = np.floor(ang)
    return [t0 + u[i] * d for i in range(1, len(u)) if ks[i] != ks[i - 1]]


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((END + 1) * sr))
    mix = lambda x, t0, g=1.0: sfx.mix(out, x, max(0.0, t0), g)  # noqa: E731
    mix(sfx.drone(len(out)), 0, 0.7)
    mix(crackle(END + 0.5, sr), 0, 0.55)                               # brasas de fondo todo el vídeo
    # 1: diez cascos, ocho se ponen rojos y caen
    mix(boom(sr, 1.2, 60), 0.0, 0.7)
    for i in range(8):
        mix(sfx.tick(8 - i), at("ocho") + (7 - i) * 0.06 + 0.1, 0.45)
    tq = at("quedan")
    mix(sfx.whoosh(0.8), tq - 0.05, 0.5)
    for i in range(8):
        mix(sfx.clack(i), tq + i * 0.05 + 0.62, 0.55)
    mix(boom(sr), tq + 0.3, 0.8)
    mix(bell(sr, 1318.5, 1.2), at("plaza", 1, 1) + 0.05, 0.35)
    # 2-3: las multitudes y los contadores
    mix(sfx.whoosh(1.0), at("última") - 0.4, 0.8)                     # vuelo a Madrid
    ta, tp = at("última") + 0.2, at("personas")
    mix(counter(tp - ta, sr, 36), ta, 0.35)
    td = at("doscientas", 2, 2)
    mix(ding(1567.98, 0.9, sr), td, 0.7)
    mix(sfx.whoosh(1.2), at("valència") - 0.6, 0.5)
    tv, tas = at("valència") - 0.3, at("aspirantes")
    mix(counter(tas - tv, sr, 36), tv, 0.35)
    mix(ding(1396.9, 0.9, sr), at("noventa"), 0.7)
    mix(sfx.whoosh(1.0), at("país", 1, 3) - 0.5, 0.5)
    ts = at("setenta")
    mix(counter(0.6, sr, 14, 700), ts, 0.4)
    mix(boom(sr, 0.9, 55), ts, 0.6)
    mix(buzz(0.3, sr), at("suspendió", 1, 3) + 0.03, 0.5)
    # 4: ¿por qué?
    mix(sfx.whoosh(1.0), at("por", 1, 4) - 0.3, 0.7)
    mix(boom(sr, 1.0, 48), at("por", 1, 4) + 0.02, 0.5)
    # 5: el test (vuelo largo entre brasas)
    mix(sfx.whoosh(1.3), at("uno") - 1.0, 1.0)
    mix(sfx.clack(3), at("eliminatorio") + 0.02, 0.9)
    mix(boom(sr, 0.6, 80), at("eliminatorio") + 0.02, 0.6)
    tdc, tco = at("decenas") - 0.2, at("contestar")
    for k in range(21):
        tk = tdc + (k + 1) / 21.6 * max(0.8, tco - at("decenas"))
        if tk < at("dos", 1, 6):
            mix(scratch(sr, k), tk, 0.8)
    mix(sfx.clack(5), at("sola") + 0.02, 0.6)
    mix(buzz(0.25, sr), at("fallo") - 0.02, 0.5)
    for k in range(6):
        mix(blip(1200 - k * 90, 700 - k * 60, 0.09, sr), at("resta") - 0.1 + k * 0.08, 0.5)
    # 6: el tiempo
    mix(sfx.whoosh(0.9), at("tiempo", 1, 6) - 0.35, 0.7)
    tt0 = at("tiempo", 1, 6) - 0.2
    k = 0
    while tt0 + k * 0.25 < tco:
        mix(clock_tick(sr, k % 2 == 0), tt0 + k * 0.25, 0.6)
        k += 1
    mix(alarm(0.8, sr), tco, 0.8)
    mix(sfx.clack(7), tco + 0.02, 0.6)
    # 7: leer ≠ entrenar
    mix(sfx.whoosh(0.9), at("tres") - 0.2, 0.6)
    mix(sfx.clack(2), at("tres") - 0.2, 0.4)
    mix(sfx.clack(4), at("leerse") - 0.15, 0.5)
    mix(ding(1174.7, 0.8, sr), at("entrenar"), 0.55)
    mix(boom(sr, 0.5, 90), at("entrenar") - 0.1, 0.35)
    # 8: la criba
    mix(sfx.whoosh(1.1), at("examen", 1, 7) + 0.2, 0.9)                # vuelo a las puertas
    tc = at("cae")
    mix(boom(sr), tc, 0.8)
    rng = np.random.default_rng(21)
    for k in range(34):
        mix(sfx.clack(k % 10), tc + rng.uniform(0, 0.7), 0.25)
    mix(ding(1567.98, 0.9, sr), at("antes") + 0.05, 0.4)
    # 9: la marca
    mix(sfx.whoosh(1.2), at("eso", 1, 9) - 0.25, 1.0)
    tb = at("bomberados", 1, 9)
    mix(boom(sr, 1.2, 55), tb, 0.8)
    mix(chord(sr, (392.0, 493.88, 587.33, 783.99)), tb + 0.02, 0.6)
    mix(bell(sr, 784.0), tb + 0.02, 0.4)
    # 10: ruleta, test, duelo, IA
    mix(sfx.whoosh(0.7), at("giras") - 0.3, 0.5)
    for k, tk in enumerate(wheel_ticks(at("giras") - 0.2, at("haces"))):
        mix(clock_tick(sr, k % 2 == 0), tk, 0.55)
    mix(ding(1318.5, 0.8, sr), at("haces") - 0.02, 0.6)
    mix(sfx.clack(1), at("haces") - 0.15, 0.5)
    tt = at("test", 1, 10) + 0.35
    mix(ding(1046.5, 0.5, sr), tt, 0.55)
    mix(ding(1568.0, 0.7, sr), tt + 0.09, 0.55)
    mix(sfx.whoosh(0.8), at("compites") - 0.35, 0.7)
    mix(boom(sr, 0.7, 75), at("compites") - 0.05, 0.6)
    for k in range(8):
        mix(blip(1500 + 200 * (k % 3), 2100, 0.05, sr), at("directo") + k * 0.07, 0.35)
    ti = at("inteligencia")
    mix(blip(400, 2600, 0.45, sr), ti - 0.1, 0.6)
    for k in range(10):
        mix(blip(2600 - k * 120, 1800, 0.04, sr), ti + 0.3 + k * 0.05, 0.3)
    # 11: jugando, contra el reloj
    mix(chord(sr), at("jugando"), 0.5)
    tr = at("reloj") - 0.1
    for k in range(int(max(0, at("bomberados", 1, 12) - 0.2 - tr) / 0.25) + 1):
        mix(clock_tick(sr, k % 2 == 0), tr + k * 0.25, 0.6)
    # 12: Bomberados, pruébala gratis
    t12 = at("bomberados", 1, 12)
    mix(sfx.whoosh(0.9), t12 - 0.35, 0.7)
    mix(boom(sr, 1.4, 50), t12, 0.9)
    mix(chord(sr, (523.25, 659.25, 783.99, 1046.5), 2.0), t12 + 0.02, 0.8)
    mix(bell(sr, 1046.5, 2.0), t12 + 0.02, 0.45)
    mix(ding(1568.0, 0.8, sr), at("pruébala") - 0.05, 0.5)
    mix(ding(2093.0, 1.0, sr), at("gratis") + 0.05, 0.4)
    mix(rewind(sr, 0.65), END - 0.72 - 0.55, 0.6)                    # golpe de vuelta al principio (bucle)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "bomberados.mp4")):
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
