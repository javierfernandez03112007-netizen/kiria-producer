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


# ---------------------------------------------------------------- intro «pas» (fondo «carretera»): efectos reales de ElevenLabs
# Los efectos están en assets/sfx/*.mp3 (generados con la API de ElevenLabs, ver FUENTES.md). Se colocan con los mismos
# tiempos que la escena (carretera.js): frenazo, parada, latido del chip «1 HERIDO», relé de los intermitentes (su ritmo
# es el de la cuenta atrás) y la lluvia que baja sola cuando habla la voz.
SFXD = os.path.join(PROJ, "assets", "sfx")


def _load(name):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(SFXD, name + ".mp3"), "-ac", "2", "-ar", str(sfx.SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def _rms_db(x):
    m = x.mean(1)
    fr = m[: len(m) // 480 * 480].reshape(-1, 480)
    e = np.sqrt((fr ** 2).mean(1))
    act = e[e > 10 ** (-50 / 20)]
    return 20 * np.log10(np.sqrt((act ** 2).mean()) + 1e-12) if len(act) else -120


def _to(x, db):                       # escala un efecto a un nivel RMS (dBFS) de su parte activa
    return x * 10 ** ((db - _rms_db(x)) / 20)


def _cut(x, a, b=None, fade=0.004):   # trozo [a, b) s con fundidos cortos
    y = x[int(a * sfx.SR): None if b is None else int(b * sfx.SR)].copy()
    n = max(1, int(fade * sfx.SR))
    if len(y) > 2 * n:
        y[:n] *= np.linspace(0, 1, n)[:, None]
        y[-n:] *= np.linspace(1, 0, n)[:, None]
    return y


def _loop(x, dur, xf=1.0):            # repite un ambiente con fundido cruzado hasta dur s
    n, k = int(dur * sfx.SR), int(xf * sfx.SR)
    out = x.copy()
    while len(out) < n:
        a = out[-k:] * np.linspace(1, 0, k)[:, None] + x[:k] * np.linspace(0, 1, k)[:, None]
        out = np.concatenate([out[:-k], a, x[k:]])
    return out[:n]


def _env(x, pts):                     # envolvente por puntos [(t, ganancia), ...] (t relativo al inicio del efecto)
    t = np.arange(len(x)) / sfx.SR
    ts, gs = zip(*pts)
    return x * np.interp(t, ts, gs)[:, None]


def _put(out, x, at, g=1.0):
    s0 = int(round(at * sfx.SR))
    if s0 < 0:
        x, s0 = x[-s0:], 0
    e = min(len(out), s0 + len(x))
    if e > s0:
        out[s0:e] += x[: e - s0] * g


def sfx_track_pas(path):
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))           # ambientes (lluvia, tensión): bajan cuando habla la voz
    c = {k: (at(v) if not isinstance(v[0], list) else [at(s) for s in v]) for k, v in Q["cues"].items()}
    tA = c["accidente"] - 0.04; tS = tA + 1.15                      # frenazo y parada (igual que carretera.js)
    tc, t1 = c["cuenta"], c["letras"][0] - 0.1; P = (t1 - tc) / 5  # intermitentes = cuenta atrás
    tM = c["marca"]
    th, ti = c["herido"], c.get("instinto", 1e9)
    mono = lambda y: np.repeat(np.asarray(y, float)[:, None], 2, axis=1)  # noqa: E731

    # 1) relámpago + trueno en el primer fotograma
    _put(out, _to(_load("trueno"), -27), -0.06)
    # 2) dentro del coche a 72 km/h con lluvia; el rodar se apaga al frenar
    lc = _loop(_to(_load("lluvia_coche"), -29), tS + 0.8)
    _put(amb, _env(lc, [(0, 1), (tA, 1), (tS, 0.45), (tS + 0.8, 0)]), 0)
    # 3) frenazo con ABS y golpe de parada
    _put(out, _to(_load("frenazo"), -24), tA - 0.1)
    _put(out, mono(boom(0.6, 70)), tS - 0.02, 0.22)
    # 4) fuera: lluvia en el asfalto hasta la marca; vapor del motor
    lf = _loop(_to(_load("lluvia_fuera"), -31), tM + 1.0 - (tS - 0.3), 1.2)
    _put(amb, _env(lf, [(0, 0), (0.7, 1), (tM - (tS - 0.3), 1), (tM + 0.7 - (tS - 0.3), 0)]), tS - 0.3)
    _put(amb, _env(_to(_load("vapor"), -35), [(0, 0), (0.4, 1), (4.5, 1), (5, 0)]), tS + 0.15)
    # 5) aviso, encuadre y chip: sonidos de interfaz suaves
    _put(out, mono(sfx.ding(1318.5, 0.6)), c.get("primero0", 0.45), 0.25)
    _put(out, mono(blip(900, 1500, 0.12)), tA + 0.25, 0.35)
    _put(out, mono(blip(700, 1200, 0.12)), th, 0.3)
    # 6) latido (al ritmo del electrocardiograma del chip): 112 lpm y 138 tras «instinto»
    lat = _load("latido")
    lub = _to(_cut(lat, 0.17, 0.55, 0.01), -23)
    dub = _to(_cut(lat, 0.17, 0.45, 0.01), -29)
    dub = dub[np.arange(0, len(dub) - 1, 1.15).astype(int)]          # «dub»: algo más agudo y corto que el «lub»
    t, beats = th, []
    while t < tc - 0.15:
        beats.append(t)
        per = 60 / (138 if t > ti else 112)
        t += per
        if beats[-1] <= ti < t:                                      # al cambiar de ritmo, la fase sigue la del chip
            k = int(np.ceil((ti - th) / (60 / 138)))
            t = th + k * 60 / 138
    for b in beats:
        _put(out, lub, b - 0.03)
        _put(out, dub, b + 0.2, 0.6)
    # 7) relé de los intermitentes: tic al encender, tac al apagar (más fuerte en la cuenta atrás)
    rel = _load("rele")
    tic, tac = _cut(rel, 0.433, 0.52), _cut(rel, 0.215, 0.29)
    tic, tac = tic / np.abs(tic).max(), tac / np.abs(tac).max()     # pico 1
    k0 = int(np.floor((tS + 0.3 - tc) / P))
    k = k0
    while True:
        ton = tc + k * P
        if ton > tM - 0.3:
            break
        loud = tc - 0.02 <= ton <= t1 + 0.02
        if ton >= tS + 0.3:
            _put(out, tic, ton - 0.003, 0.34 if loud else 0.07)
            _put(out, tac, ton + P / 2 - 0.003, 0.24 if loud else 0.05)
        k += 1
    _put(out, mono(bell(523.25, 0.9)), t1, 0.18)
    # 8) «el instinto te la juega»: golpe con subida que llega a la cuenta atrás
    _put(out, _to(_load("golpe"), -25), ti - 0.02)
    # 9) fondo de tensión: su punto álgido cae al final de la cuenta atrás
    ten = _to(_load("tension"), -30)
    _put(amb, ten, t1 - 13.0)
    # 10) transiciones de las tarjetas, letras y el avión de papel
    wh = _to(_load("whoosh"), -31)
    for tw in (c["enunciado"], c["opciones"], c["descripcion"]):
        _put(out, wh, tw - 0.48)
    for i in range(4):
        _put(out, mono(sfx.clack(i)), c["opciones"] + 0.07 * i + 0.1, 0.35)
    for i, tl in enumerate(c["letras"]):
        _put(out, mono(blip(800 + 150 * i, 1100 + 150 * i, 0.09)), tl + 0.05, 0.4)
    if "compartir" in c:
        _put(out, _to(_load("whoosh"), -32), c["compartir"] - 0.25)
    # 11) la lluvia se vuelve brasas y aparece la marca
    _put(out, _to(_load("brasas"), -30), tM - 0.45)
    _put(out, _to(_load("marca"), -28), tM - 0.25)
    _put(out, mono(sfx.ding(1568.0, 0.8)), c["prueba"] - 0.05, 0.45)
    _put(out, mono(sfx.ding(2093.0, 1.0)), c["prueba"] + 0.4, 0.35)
    # los ambientes bajan 6 dB mientras habla la voz
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.6 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out * 1.0) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())


def main():
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    sfxp = os.path.join(PROJ, "out", "sfx.wav")
    (sfx_track_pas if Q.get("intro") == "pas" else sfx_track)(sfxp)
    sv = Q.get("mezcla", {}).get("sfx", 0.35)
    dst = os.path.join(PROJ, "out", os.path.basename(PROJ) + ".mp4")
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-i", sfxp, "-filter_complex",
           "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo,apad[v];[2:a]volume=" + str(sv) + "[s];[v][s]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.94:level=disabled[a]",
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
        (sfx_track_pas if Q.get("intro") == "pas" else sfx_track)(os.path.join(PROJ, "out", "sfx.wav"))
    else:
        main()
