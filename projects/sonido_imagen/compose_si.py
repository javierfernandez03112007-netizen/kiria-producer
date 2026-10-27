"""Compone «Sonido e Imagen»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(Teleco ámbar, Sonido e Imagen turquesa, FP magenta, lo borrado en rojo) + voz + efectos sintetizados (fallo digital,
explosión de cubos, barras, enchufe, tele sin señal, señal, sala, emisión, público, sellos, y los dos tonos del truco final).

    python3 ajustar_voz.py
    ./render_local.sh                                   (o trozos en varias máquinas + merge_chunks.sh)
    python3 projects/sonido_imagen/compose_si.py [--test t1 t2 ...] [--sfx]
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
T, A, M, R, WH = "#62E3D4", "#FFB547", "#FF7AB8", "#FF5A4E", "#EEF2F6"
KEY = {1: {"engañando": R, "noventa": R, "nueve": R, "borrado": R},
       2: {"notado": WH, "sonido": T, "imagen": T, "teleco": A, "fácil": A},
       3: {"razón": WH, "truco": WH},
       4: {"munición": WH, "teleco": A, "nueve": A, "cuatro": A, "sonido": T, "imagen": T, "ocho": T},
       5: {"fp": M, "cuatro": M, "cables": M},
       6: {"sonido": T, "imagen": T, "serie": T},
       7: {"dentro": WH, "señales": T, "números": T},
       8: {"acústica": WH, "electroacústica": WH, "micrófonos": T, "altavoces": T},
       9: {"vídeo": WH, "millones": T, "pantallas": T},
       10: {"teleco": A, "fácil": A},
       11: {"gente": WH, "difícil": R},
       12: {"misma": WH, "profesión": WH, "máster": WH},
       13: {"fácil": R, "no": R, "apellido": T},
       14: {"truco": WH, "luz": WH, "color": A, "cuatro": A, "menos": A},
       15: {"mueve": WH},
       16: {"fuerte": A, "flojo": T, "tira": R},
       17: {"verlo": WH, "teleco": A, "fácil": A}}
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


def glitch(d, sr, seed=4):         # fallo digital: ráfagas de zumbido cuadrado y ruido «pixelado»
    rng = np.random.default_rng(seed)
    out = np.zeros(int(d * sr))
    for _ in range(int(d * 14)):
        s, n = int(rng.uniform(0, d - 0.07) * sr), int(rng.uniform(0.015, 0.06) * sr)
        tt = np.arange(n) / sr
        if rng.random() < 0.5:
            b = np.sign(np.sin(2 * np.pi * rng.uniform(80, 900) * tt)) * 0.22
        else:
            b = np.repeat(rng.standard_normal(n // 24 + 1), 24)[:n] * 0.25
        out[s:s + n] += b * np.minimum(1, (n - np.arange(n)) / 60)
    return out


def counter(d, sr, n=24):          # el contador del 0 al 99 %: tics cada vez más agudos y seguidos
    out = np.zeros(int(d * sr))
    for k in range(n):
        x = (k / n) ** 0.7 * (d - 0.05)
        b = blip(900 + k * 60, 900 + k * 60, 0.03, sr)
        s = int(x * sr)
        out[s:s + len(b)] += b[:len(out) - s] * 0.7
    return out


def boom(sr, d=1.1):               # golpe grave (la imagen estalla)
    t = _t(d, sr)
    return (np.sin(2 * np.pi * (70 * np.exp(-t * 2.5) + 32) * t) * np.exp(-t / 0.35) * 0.9 + np.random.default_rng(3).standard_normal(len(t)) * np.exp(-t / 0.05) * 0.2)


def shatter(sr, d=1.0, seed=2, n=26):    # cubos que salen volando: ruido agudo y cristalitos
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    w = rng.standard_normal(len(t))
    hp = w - np.convolve(w, np.ones(4) / 4, "same")
    out = hp * np.exp(-t / 0.18) * 0.5
    for _ in range(n):
        s = int(rng.uniform(0, 0.6) * sr)
        b = blip(rng.uniform(2500, 7000), rng.uniform(2000, 6000), rng.uniform(0.02, 0.06), sr)
        out[s:s + len(b)] += b[:len(out) - s] * 0.5
    return out


def rewind(sr, d=0.6):             # los cubos vuelven: ruido que crece y corta en seco
    t = _t(d, sr)
    w = np.random.default_rng(9).standard_normal(len(t))
    lp = np.convolve(w, np.ones(12) / 12, "same")
    return lp * (t / d) ** 2 * 1.4 + np.sin(2 * np.pi * (300 + 900 * t / d) * t) * (t / d) ** 3 * 0.15


def sweep(f0, f1, d, sr, a=0.22):  # barra que sube: tono que sube
    t = _t(d, sr)
    f = f0 * (f1 / f0) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.08) * a


def tone(f, d, sr, a=0.2, fade=0.04):
    t = _t(d, sr)
    return np.sin(2 * np.pi * f * t) * np.minimum(1, t / fade) * np.minimum(1, (d - t) / fade) * a


def static(d, sr, seed=5):         # tele sin señal
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    w = rng.standard_normal(len(t))
    bp = np.convolve(w, np.ones(3) / 3, "same") - np.convolve(w, np.ones(40) / 40, "same")
    return bp * (0.75 + 0.25 * np.sin(2 * np.pi * 60 * t)) * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.15) * 0.35


def sizzle(d, sr, seed=1):         # chispa del enchufe
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    w = rng.standard_normal(len(t))
    hp = w - np.convolve(w, np.ones(6) / 6, "same")
    crack = (rng.random(len(t)) < 0.004) * rng.uniform(0.5, 1.0, len(t))
    crack = np.convolve(crack, np.exp(-np.arange(200) / 30), "same")
    return (hp * 0.12 + crack * 0.3) * np.exp(-t / (d * 0.4))


def chatter(d, sr, seed=0):        # números: ráfaga de pitiditos de datos
    rng = np.random.default_rng(seed)
    out = np.zeros(int(d * sr))
    x = 0.0
    while x < d - 0.05:
        b = blip(rng.uniform(900, 2400), rng.uniform(900, 2400), rng.uniform(0.025, 0.06), sr)
        s = int(x * sr)
        out[s:s + len(b)] += b[:len(out) - s] * 0.6
        x += rng.uniform(0.04, 0.09)
    return out * np.minimum(1, _t(d, sr) / 0.1)[:len(out)]


def room(sr, d=1.3, seed=6):       # palmada en una sala: golpe y cola de reverberación
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    w = rng.standard_normal(len(t))
    lp = np.convolve(w, np.ones(8) / 8, "same")
    return lp * np.exp(-t / 0.28) * 0.5 + w * np.exp(-t / 0.01) * 0.4


def thump(sr, f=55, d=0.35):       # el altavoz empuja aire
    t = _t(d, sr)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.09) * 0.8


def ping(f, d, sr, drop=0.03):     # emisión: seno con caída de tono y cola
    t = _t(d, sr)
    ph = 2 * np.pi * f * (t - drop * t * t / (2 * d))
    return (np.sin(ph) + 0.25 * np.sin(2 * ph)) * np.exp(-t / (d * 0.28)) * np.minimum(1, t / 0.003) * 0.3


def murmur(d, sr, seed=8):         # público: rumor de mucha gente
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    w = rng.standard_normal(len(t))
    bp = np.convolve(w, np.ones(10) / 10, "same") - np.convolve(w, np.ones(60) / 60, "same")
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 1.7 * t + 1)
    return bp * am * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.4) * 0.5


def buzz(d, sr):                   # error / tachado
    t = _t(d, sr)
    return np.sign(np.sin(2 * np.pi * 140 * t)) * 0.12 * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.03)


def sfx_ding(f, d, sr):
    t = _t(d, sr)
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d * 0.35 / m ** 0.5)) for m, a in [(1, 1), (2.76, 0.4), (5.4, 0.18)]) * np.minimum(1, t / 0.002) * 0.22


def chord(sr, fs=(523.25, 659.25, 783.99, 1046.5), d=1.6):   # victoria
    return sum(sfx_ding(f, d, sr) for f in fs) * 0.6


def bell(sr, f=880.0, d=1.6):
    t = _t(d, sr)
    y = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d * 0.3 / m ** 0.4)) for m, a in [(1, 1), (2.0, 0.5), (2.76, 0.35), (5.4, 0.15)])
    return y * np.minimum(1, t / 0.002) * 0.3


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((END + 1) * sr))
    mix = lambda x, t0, g=1.0: sfx.mix(out, x, max(0.0, t0), g)  # noqa: E731
    mix(sfx.drone(len(out)), 0, 0.8)
    # 1: la imagen «sospechosa», el guiño, el contador y la explosión
    mix(glitch(max(0.5, at("más", 1, 1) + 0.1), sr), 0.0, 0.7)
    mix(sfx.clack(2), at("engañando") + 0.25, 0.35)
    mix(counter(max(0.5, at("ciento") - at("más", 1, 1) + 0.25), sr), at("más", 1, 1), 0.5)
    mix(boom(sr), at("borrado"), 0.9)
    mix(shatter(sr, 1.2, n=40), at("borrado"), 0.9)
    mix(sfx.whoosh(0.9), at("borrado") + 0.05, 0.6)
    mix(rewind(sr), at("notado") - 0.55, 0.7)
    mix(sfx.clack(5), at("notado") + 0.02, 0.6)
    # 2-3: el pique
    mix(sfx.whoosh(1.0), at("borra") - 0.25, 0.8)                       # vuelo al duelo
    mix(ping(1568.0, 0.5, sr), at("teleco", 1, 2) + 0.02, 0.35)
    mix(sfx.clack(6), at("fácil", 1, 2) + 0.03, 0.8)
    mix(buzz(0.22, sr), at("fácil", 1, 2) + 0.05, 0.35)
    mix(sfx.whoosh(0.7), at("tienen", 1, 3) - 0.2, 0.45)
    mix(sfx_ding(1318.5, 0.9, sr), at("truco", 1, 3), 0.6)
    # 4: munición (las dos barras)
    mix(sweep(260, 820, max(0.5, at("cuatro", 1, 4) - at("teleco", 1, 4) + 0.2), sr), at("teleco", 1, 4), 0.8)
    mix(sfx_ding(1567.98, 0.9, sr), at("nueve", 1, 4), 0.7)
    mix(sweep(240, 700, max(0.5, at("ocho") - at("sonido", 1, 4) + 0.2), sr), at("sonido", 1, 4), 0.8)
    mix(sfx_ding(1396.9, 0.9, sr), at("ocho"), 0.7)
    # 5-6: FP enchufa el cable; la tele se queda sin señal
    mix(sfx.whoosh(0.6), at("rematan") - 0.15, 0.4)
    mix(sfx.whoosh(0.8), at("cuatro", 1, 5), 0.35)
    mix(sfx.clack(7), at("cables") + 0.1, 0.9)
    mix(sizzle(0.6, sr), at("cables") + 0.1, 0.6)
    mix(sfx.whoosh(0.6), at("responde") - 0.2, 0.35)
    mix(static(1.5, sr), at("veríais"), 0.8)
    mix(thump(sr, 45, 0.3), at("veríais"), 0.6)
    # 7-9: por dentro
    mix(sfx.whoosh(1.1), at("así") - 0.2, 0.8)                           # vuelo a «por dentro»
    mix(tone(440, 1.3, sr, 0.16, 0.25), at("señales"), 0.7)
    for k in range(12):
        mix(sfx.tick(k % 12), at("convierten") + k * 0.05, 0.22)
    mix(chatter(1.0, sr), at("números"), 0.45)
    mix(sfx.whoosh(0.8), at("acústica") - 0.25, 0.5)
    mix(room(sr), at("salas"), 0.5)
    mix(sfx.clack(1), at("micrófonos") + 0.02, 0.4)
    for k in range(3):
        mix(thump(sr), at("altavoces") + k * 0.18, 0.7)
    mix(sfx.whoosh(0.9), at("vídeo", 1, 9) - 0.2, 0.5)
    for k in range(3):
        mix(ping(1046.5, 0.9, sr), at("llega") + k * 0.32, 0.35)
    rng = np.random.default_rng(12)
    for k in range(22):
        mix(blip(rng.uniform(2500, 5000), rng.uniform(2500, 5000), 0.04, sr), at("millones") + rng.uniform(0, 1.2), 0.25)
    # 10-13: veredicto
    mix(sfx.whoosh(1.1), at("entonces") - 0.25, 0.8)                     # vuelta al duelo
    mix(sfx.clack(3), at("fácil", 1, 10) + 0.03, 0.7)
    mix(murmur(max(1.0, at("dos", 1, 12) - at("gente", 1, 11) + 0.3), sr), at("gente", 1, 11) - 0.1, 0.55)
    mix(buzz(0.28, sr), at("difícil") + 0.03, 0.5)
    mix(sfx.clack(8), at("difícil") + 0.03, 0.7)
    mix(sfx.whoosh(0.8), at("dos", 1, 12) - 0.1, 0.45)
    mix(chord(sr), at("profesión"), 0.6)
    mix(sfx.whoosh(0.7), at("máster") - 0.3, 0.45)
    mix(sfx_ding(2093.0, 1.0, sr), at("máster") + 0.1, 0.55)
    mix(buzz(0.3, sr), at("no", 1, 13) + 0.02, 0.55)
    mix(sfx.clack(4), at("no", 1, 13) + 0.02, 0.8)
    mix(sfx.whoosh(0.5), at("apellido") - 0.3, 0.4)
    mix(sfx.clack(9), at("apellido") + 0.05, 0.9)
    mix(chord(sr, (659.25, 783.99, 987.77, 1318.5)), at("apellido") + 0.1, 0.8)
    # 14-16: el truco
    mix(sfx.whoosh(1.1), at("truco", 1, 14) - 0.25, 0.8)                # vuelta al ojo
    mix(sfx.whoosh(0.7), at("luz") - 0.1, 0.5)
    mix(sfx_ding(1174.7, 0.8, sr), at("color", 2, 14), 0.45)
    for k in range(8):
        mix(sfx.tick(4 + k % 6), at("fotogramas") + 0.1 + k * 0.3, 0.2)
    mix(sfx_ding(1567.98, 0.8, sr), at("mueve"), 0.4)
    # los dos tonos: el fuerte tapa al flojo… y el flojo se quita sin que se note
    tf = at("fuerte")
    mix(tone(880.0, max(0.8, at("tira") + 0.9 - tf), sr, 0.2, 0.08), tf, 0.8)
    tw = at("flojo", 1, 16)
    mix(tone(990.0, max(0.3, at("tira") - tw), sr, 0.035, 0.05), tw, 0.8)
    mix(shatter(sr, 0.7, seed=5, n=12), at("tira") + 0.02, 0.5)
    # 17: vuelve a verlo
    mix(rewind(sr, 0.8), at("vuelve") - 0.2, 0.5)
    mix(bell(sr), at("leo"), 0.35)
    mix(sfx.whoosh(1.2), END - 1.2, 0.6)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "sonido_imagen.mp4")):
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
