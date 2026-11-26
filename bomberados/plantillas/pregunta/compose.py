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
_cfg = os.path.join(PROJ, "pregunta.json")
Q = json.load(open(_cfg if os.path.exists(_cfg) else os.path.join(PROJ, "video.json")))
LINES = json.load(open(os.path.join(PROJ, "tiempos.json")))
END = LINES[-1]["end"] + 1.2
N = int(END * FPS)
FRAMES = os.path.join(PROJ, "out", "frames")
AUDIO = os.environ.get("VOZ") or os.path.join(PROJ, "assets", "voz.mp3")   # VOZ=…: otra pista (p. ej. silencio para un avance sin voz)
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


def _to(x, db):                       # escala un efecto a un nivel RMS (dBFS) de su parte activa (como mucho +24 dB:
    return x * 10 ** (min(24.0, db - _rms_db(x)) / 20)   # si ElevenLabs devuelve casi silencio, no se convierte en ruido)


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



# ---------------------------------------------------------------- intro «leyes» (fondo «escritorio», leyes.js)
# Regla de Javi: cada sonido empieza cuando empieza en pantalla lo que lo produce y ACABA cuando acaba esa situación.
# Los tiempos son los mismos que DK en leyes.js.
def _onset(x, db=30):                 # quita el silencio inicial: el golpe del efecto cae justo en su instante
    m = np.abs(x).max(1)
    i = int(np.argmax(m > m.max() * 10 ** (-db / 20)))
    return x[max(0, i - int(0.004 * sfx.SR)):]


def _tramo(x, dur, fade_in=0.01, fade_out=0.08, xf=0.25):
    """Ajusta un efecto a un tramo exacto: si es corto se repite (con fundido cruzado) y si es largo se corta; con fundido
    de salida para que se apague justo cuando acaba en pantalla."""
    n = int(dur * sfx.SR)
    y = (_loop(x, dur, min(xf, len(x) / sfx.SR / 3)) if len(x) < n else x[:n]).copy()
    fi, fo = min(len(y), int(fade_in * sfx.SR)), min(len(y), int(fade_out * sfx.SR))
    if fi > 0:
        y[:fi] *= np.linspace(0, 1, fi)[:, None]
    if fo > 0:
        y[-fo:] *= np.linspace(1, 0, fo)[:, None]
    return y


def sfx_track_leyes(path):
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: (at(v) if not isinstance(v[0], list) else [at(s) for s in v]) for k, v in Q["cues"].items()}
    land = [0.05 + 0.1 * i for i in range(4)]
    tT, tB, tCam = c["trampa"], c["civil0"], c["enunciado"] - 0.12
    tS, tc, t1 = c["derogada"], c["cuenta"], c["letras"][0] - 0.1
    P = (t1 - tc) / 5
    tM = c["marca"]
    tBurn, tOff = tM - 0.45, tM - 0.2
    tFade = tBurn + 0.35 + 0.6                  # el escritorio ya se ha fundido con las brasas
    # libros: un golpe seco al tocar la mesa (lo que dura el rebote)
    lib = _onset(_load("libro"))
    for i, tl in enumerate(land):
        _put(out, _tramo(_to(lib, -19), 0.32, 0.002, 0.1), tl - 0.004, [1.0, 0.8, 0.9, 0.75][i])
    # cepo: el golpe metálico cuando se tocan las mandíbulas; dura lo que su vibración
    _put(out, _tramo(_to(_onset(_load("cepo")), -15), 0.42, 0.001, 0.12), tT + 0.075)
    # papeles: desde que despegan hasta que aterriza el último (dos capas para cubrir todo el vuelo)
    pap = _onset(_load("papeles"))
    vuelo = 0.12 + 1.25
    _put(out, _tramo(_to(pap, -27), vuelo, 0.02, 0.18), tT + 0.06)
    _put(out, _tramo(_to(pap, -31), vuelo - 0.6, 0.05, 0.18), tT + 0.66)
    # rotativo: suena mientras está encendido
    _put(amb, _tramo(_to(_load("rotativo"), -34), tOff + 0.15 - tB, 0.01, 0.15), tB)
    # cámara que sube y tarjetas que entran
    wh = _onset(_load("whoosh"))
    _put(out, _tramo(_to(wh, -31), 0.32, 0.01, 0.08), tCam + 0.28)
    for tw in (c["enunciado"], c["opciones"], c["descripcion"]):
        _put(out, _tramo(_to(wh, -31), 0.32, 0.01, 0.08), tw - 0.02)
    # sello: baja (0,38 s), salta de libro en libro con cada número (0,28 s) y se va (0,45 s)
    _put(out, _tramo(_to(_onset(_load("sello_baja")), -25), 0.36, 0.005, 0.1), tS - 0.05)
    sm = _onset(_load("sello_mueve"))
    for k in range(5):
        _put(out, _tramo(_to(sm, -30), 0.28, 0.005, 0.08), tc + k * P - 0.05, 0.9 if k < 4 else 0.7)
    _put(out, _tramo(_to(sm, -28), 0.45, 0.01, 0.15), t1 + 0.05)
    # cuenta atrás: un tic por número y una campanita al acabar
    tic = _onset(_load("tic"))
    for k in range(5):
        _put(out, _tramo(_to(tic, -18), 0.12, 0.001, 0.04), tc + k * P - 0.003)
    _put(out, np.repeat(bell(523.25, 0.7)[:, None], 2, axis=1), t1, 0.15)
    # letras y burbujas de «comenta»
    toq = _onset(_load("toque"))
    for tl in c["letras"]:
        _put(out, _tramo(_to(toq, -26), 0.15, 0.001, 0.05), tl + 0.04)
    if "comenta" in c:
        bu = _onset(_load("burbuja"))
        for i in range(4):
            _put(out, _tramo(_to(bu, -25), 0.12, 0.001, 0.04), c["comenta"] + 0.04 * i, 1 - 0.1 * i)
    # momentos de venta: destello; el avión de papel suena mientras vuela (1,2 s)
    de = _onset(_load("destello"))
    for k in ("compartir", "marca", "prueba"):
        if k in c:
            _put(out, _tramo(_to(de, -24), 0.6, 0.002, 0.2), c[k] - 0.04)
    if "compartir" in c:
        av = _onset(_load("avion"))
        _put(out, _tramo(_to(av, -28), 0.62, 0.02, 0.1), c["compartir"])
        _put(out, _tramo(_to(av, -30), 0.6, 0.08, 0.15), c["compartir"] + 0.6)
        _put(out, _tramo(_to(_onset(_load("burbuja")), -24), 0.12, 0.001, 0.04), c["compartir"] + 1.2)
    # los libros arden (desde que prenden hasta que el escritorio se funde) y quedan las brasas hasta el final
    fu = _load("fuego")
    fu = fu[int(0.3 * sfx.SR):]
    _put(out, _tramo(_to(fu, -26), tFade + 0.2 - tBurn, 0.02, 0.35), tBurn)
    _put(amb, _tramo(_to(_load("brasas"), -36), END - (tFade - 0.3), 0.4, 0.3), tFade - 0.3)
    _put(out, _tramo(_to(_onset(_load("marca")), -26), 1.0, 0.002, 0.25), tM - 0.05)
    # los ambientes bajan 6 dB mientras habla la voz
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())



# ---------------------------------------------------------------- formato «¿Qué nota sacarías?» (dominadas.js)
def _pitch(x, f):                     # sube el tono (y acorta) un efecto: f > 1 más agudo
    idx = np.arange(0, len(x) - 1, f)
    return np.stack([np.interp(idx, np.arange(len(x)), x[:, c]) for c in range(2)], 1)


def sfx_track_prueba(path):
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    # misma línea de tiempo que PB en dominadas.js
    d0, d1 = LINES[1]["end"] + 0.12, LINES[2]["start"] - 0.25
    raw = [1.15 - 0.1 * (k - 1) if k <= 3 else 0.8 - 0.07 * (k - 3) if k <= 8 else 0.3 if k <= 27 else [0.45, 0.65, 0.95][k - 28] for k in range(1, 31)]
    span = d1 - d0 - 1.1
    durs = [x * span / sum(raw) for x in raw]
    ends = list(d0 + np.cumsum(durs))
    tops = [e - 0.58 * d for e, d in zip(ends, durs)]          # cuando la barbilla pasa la barra (cuenta la repetición)
    T = Q.get("tabla", {"hombres": [12, 16, 20, 24, 26, 30]})
    tic = _onset(_load("tic"))
    # gancho: la 11 en «once», sello y zumbido en «suspendes», cae al suelo y vuelve a la barra en «mira»
    _put(out, _tramo(_to(tic, -26), 0.18, 0.001, 0.06), c["once"])
    _put(out, _tramo(_to(_onset(_load("sello")), -17), 0.3, 0.001, 0.1), c["suspendes"] + 0.08)
    _put(out, _tramo(_to(_onset(_load("fallo")), -27), 0.6, 0.002, 0.15), c["suspendes"] + 0.1)
    _put(out, _tramo(_to(_onset(_load("caida")), -21), 0.3, 0.002, 0.1), c["suspendes"] + 0.48)
    _put(out, _tramo(_to(_onset(_load("salto")), -22), 0.26, 0.002, 0.08), c["mira"] + 0.38)
    # parte sin voz: música solo mientras dura la demostración, un tic por repetición, la nota que sube y el 10
    _put(amb, _tramo(_to(_load("musica"), -22), d1 + 0.25 - d0, 0.15, 0.45), d0)
    for k, tp in enumerate(tops):
        _put(out, _tramo(_to(tic, -27), 0.12, 0.001, 0.05), tp, 0.8 if 3 <= k < 27 else 1.0)
    br = _onset(_load("barra"))
    for k in range(3):
        _put(out, _tramo(_to(br, -30), 0.25, 0.005, 0.08), ends[k] - durs[k] + 0.05)
    nota = _onset(_load("nota"))
    for i, n in enumerate(T["hombres"][:-1]):
        _put(out, _tramo(_to(_pitch(nota, 1 + 0.07 * i), -22), 0.5, 0.002, 0.15), tops[n - 1])
    _put(out, _tramo(_to(_onset(_load("diez")), -18), 1.15, 0.002, 0.3), tops[29])
    av = _onset(_load("avance"))
    _put(out, _tramo(_to(av, -28), min(len(av) / sfx.SR, ends[27] - ends[3]), 0.05, 0.3), ends[3])
    # técnica: ✗ y ✓ cuando aparece cada uno
    for k, good in (("ojo", False), ("barbilla", True), ("brazos", True), ("balanceo", False)):
        if k in c:
            snd = _onset(_load("acierto" if good else "fallo"))
            _put(out, _tramo(_to(snd, -25 if good else -27), 0.3 if good else 0.45, 0.002, 0.1), c[k] + 0.45)
    # venta: burbujas, avión mientras vuela, destellos, fuego al pasar a las brasas y la marca
    bu = _onset(_load("burbuja"))
    for k in ("cuantas", "comenta"):
        if k in c:
            _put(out, _tramo(_to(bu, -25), 0.12, 0.001, 0.04), c[k])
    de = _onset(_load("destello"))
    for k in ("compartir", "marca", "prueba"):
        if k in c:
            _put(out, _tramo(_to(de, -24), 0.6, 0.002, 0.2), c[k] - 0.04)
    if "compartir" in c:
        av2 = _onset(_load("avion"))
        _put(out, _tramo(_to(av2, -28), 0.62, 0.02, 0.1), c["compartir"])
        _put(out, _tramo(_to(av2, -30), 0.6, 0.08, 0.15), c["compartir"] + 0.6)
        _put(out, _tramo(_to(bu, -24), 0.12, 0.001, 0.04), c["compartir"] + 1.2)
    tM = c["marca"]
    fu = _load("fuego")[int(0.3 * sfx.SR):]
    _put(out, _tramo(_to(fu, -27), 0.9, 0.02, 0.3), tM - 0.3)
    _put(amb, _tramo(_to(_load("brasas"), -36), END - (tM + 0.2), 0.4, 0.3), tM + 0.2)
    _put(out, _tramo(_to(_onset(_load("marca")), -26), 1.0, 0.002, 0.25), tM - 0.05)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())

# ---------------------------------------------------------------- formato «tetraedro» (tetraedro.js, «Explicado en 30 s»)
# Efectos de ElevenLabs ya generados para otros vídeos (copiados en assets/sfx). Misma línea de tiempo que TT en
# tetraedro.js: cada sonido empieza cuando empieza su imagen y acaba cuando acaba (_tramo).
def sfx_track_tetra(path):
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))           # la llama que arde y las brasas: bajan cuando habla la voz
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(f1=c["triangulo"] + 0.22, ign=c["fuego"] - 0.05, lift=c["falta"] - 0.05, q=c["pieza"], cual=c["cual"],
             b=[c["combustible"], c["oxigeno"], c["calor"]], quita=c["quita"] + 0.05, out1=c["apaga"] + 0.3,
             noz=c["polvo"] - 0.12, spray0=c["extintor"] + 0.06, spray1=c["otra"] + 0.2, die2=c["apaga2"] - 0.05,
             out2=c["llamas"] + 0.35, red=c["otra"], zoom=c["cuarta"] - 0.15, feed=c["alimente"] - 0.1, lab=c["reaccion"],
             jet=c["polvo2"] - 0.05, cut=c["corta"] + 0.04, back=c["triangulo2"] - 0.35, no=c["triangulo2"],
             tet=c["tetraedro"] - 0.08, triO=c["op_tri"], tetO=c["op_tet"], com=c["comenta"], share=c["compartir"],
             marca=c["marca"])
    T["ret"] = min(c["polvo"] - 0.5, LINES[2]["end"] + 0.1)
    T["relit"] = T["ret"] + 0.2
    fuego, brasas, vapor = _load("fuego"), _load("brasas"), _load("vapor")
    ign, bub, bar = _onset(fuego), _onset(_load("burbuja")), _onset(_load("barra"))
    burn = fuego[int(1.2 * sfx.SR):int(2.6 * sfx.SR)]          # tramo continuo de la llama

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), t0, g)

    def flame(a, b, fade=0.3):                                # la llama del centro mientras se ve
        if b - a > 0.1:
            put(burn, a, -30, b - a, 0.15, fade, track=amb)

    # 1) gancho: la mecha chisporrotea hasta que se apagan sus llamitas; el triángulo se cierra
    put(brasas, 0.0, -27, T["f1"] + 0.6, 0.002, 0.4)
    put(vapor[int(1.0 * sfx.SR):], 0.0, -35, T["f1"] + 0.3, 0.002, 0.3)
    put("whoosh2", T["f1"] - 0.35, -27, 0.9)
    # 2) prende la llama del centro y arde
    put(ign, T["ign"] - 0.05, -25, 0.9, 0.01, 0.3)
    flame(T["ign"] + 0.3, T["out1"])
    # 3) se despega en 3D, salta el «?» y late en «cuál»
    put("whoosh", T["lift"], -27, 0.7)
    put("nota", T["q"], -25, 0.9)
    put("toque", T["cual"] + 0.05, -26, 0.4)
    # 4) insignias: combustible, oxígeno, calor
    for i, tb in enumerate(T["b"]):
        put(_pitch(bub, 1 + 0.08 * i), tb, -25, 0.3)
    # 5) «quita»: el calor sale despedido, la llama se apaga y humea; vuelve y prende otra vez
    put("whoosh2", T["quita"] - 0.1, -25, 0.7)
    put(vapor, T["out1"] - 0.2, -33, 1.9, 0.2, 0.8)
    put("whoosh", T["ret"], -29, 0.5)
    put(ign, T["relit"] - 0.05, -27, 0.6, 0.01, 0.2)
    flame(T["relit"] + 0.2, T["out2"])
    # 6) extintor: llega la boquilla, el chorro dura lo que se ve y queda un poco de humo; el «?» en rojo
    put(bar, T["noz"] + 0.3, -30, 0.3)
    put(vapor, T["spray0"], -25, T["spray1"] - T["spray0"], 0.01, 0.15)
    put(vapor, T["out2"] - 0.15, -36, 1.6, 0.2, 0.6)
    put("latido", T["red"], -24, 0.45)
    # 7) la cuarta pieza: zoom, eslabones que se enganchan, la cadena que se alimenta y el rótulo
    put("whoosh2", T["zoom"] - 0.15, -25, 0.8)
    for i in range(5):
        put(_pitch(bar, 1.15 + 0.07 * i), T["zoom"] + 0.15 + 0.07 * i, -33, 0.18)
    flame(T["zoom"] + 0.2, T["cut"] + 0.5, 0.35)
    put(brasas, T["feed"], -27, T["cut"] - T["feed"], 0.3, 0.15, track=amb)
    put("diez", T["lab"], -27, 1.2, 0.005, 0.4)
    # 8) «corta»: chorro de polvo, el eslabón se parte, todo se apaga y humea
    put(vapor, T["jet"], -25, T["cut"] + 0.2 - T["jet"], 0.01, 0.12)
    put("cepo", T["cut"] - 0.02, -15, 0.8, 0.002, 0.3)
    put(vapor, T["cut"] + 0.35, -34, 1.9, 0.2, 0.8)
    # 9) vuelve el triángulo, parpadeo rojo, se arma el tetraedro (golpe con su onda) y arde dentro
    put("whoosh", T["back"], -29, 0.5)
    put("fallo", T["no"] + 0.1, -31, 0.4, 0.005, 0.15)
    put(ign, T["back"] + 0.1, -29, 0.6, 0.01, 0.2)
    flame(T["back"] + 0.35, T["marca"] - 0.3)
    put("golpe", T["tet"] - 0.35, -21, 1.7, 0.01, 0.4)
    put("destello", T["tet"] + 0.28, -26, 0.8)
    # 10) encuesta: cada opción aparece y se vuelven bocadillos en «comenta»
    for k in ("triO", "tetO"):
        put(bub, T[k], -24, 0.3)
    put(bub, T["com"], -24, 0.3)
    put(_pitch(bub, 1.12), T["com"] + 0.12, -25, 0.3)
    # 11) venta: destellos, avión de papel, estallido en brasas y la marca
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    av = _onset(_load("avion"))
    put(av, T["share"], -28, 0.62, 0.02, 0.1)
    put(av, T["share"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, T["share"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = T["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put(brasas, tM + 0.2, -36, END - (tM + 0.2), 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    # la llama y las brasas bajan cuando habla la voz
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())

# ---------------------------------------------------------------- formato «salones» (salones.js): abuelos contra hoy
# Efectos de ElevenLabs ya generados para otros vídeos (copiados en assets/sfx). Misma línea de tiempo que SL en
# salones.js: cada sonido empieza cuando empieza su imagen y acaba cuando acaba (_tramo).
def sfx_track_salones(path):
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))           # fondos (tensión, fuego que arde): bajan cuando habla la voz
    c = {k: at(v) for k, v in Q["cues"].items()}
    race0 = c["quemaron"] - 0.05
    foNew = c["horno"] + 0.04
    foOld = max(foNew + 1.2, c.get("hora2", LINES[5]["end"]) - 0.25)
    bed0 = LINES[6]["start"] - 0.05
    close = c["cierra"] + 0.02
    split = c["ensayo2"] - 0.15
    fuego, brasas, vapor = _load("fuego"), _load("brasas"), _load("vapor")
    ign, bub, tic = _onset(fuego), _onset(_load("burbuja")), _onset(_load("tic"))
    burn = fuego[int(1.2 * sfx.SR):int(2.6 * sfx.SR)]

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), t0, g)

    def ramp(x, t0, t1, db0, db1, track):           # fondo que sube de volumen de db0 a db1
        y = _tramo(_to(x, db1), max(0.05, t1 - t0), 0.2, 0.25)
        y = _env(y, [(0, 10 ** ((db0 - db1) / 20)), (t1 - t0, 1.0)])
        _put(track, y, t0)

    # 1) gancho: prende la llamita, tensión de fondo, las dos cuentas atrás (con latido en la tuya)
    put(ign, 0.0, -30, 0.8, 0.005, 0.3)
    put(brasas, 0.0, -38, race0, 0.1, 0.3, track=amb)
    put("tension", 0.5, -30, foOld + 0.4 - 0.5, 0.8, 0.5, track=amb)
    put("toque", c["media"], -26, 0.4)
    put("toque", c["cuatro"], -26, 0.4)
    put("latido", c["cuatro"] + 0.05, -21, 1.1, 0.005, 0.2)
    for k in range(2):
        put(tic, c["sabes"] + 0.1 + 0.3 * k, -27, 0.15, 0.001, 0.05)
    # 2) las lupas: algodón, espuma y la gota de petróleo
    put(bub, c["algodon"], -26, 0.3)
    put(bub, c["espuma"], -26, 0.3)
    put(_pitch(_onset(_load("nota")), 0.75), c["petroleo"], -27, 0.9, 0.005, 0.3)
    # 3) el ensayo: reloj, fuego que crece, flashover del tuyo y después el de los abuelos
    put("whoosh2", race0 - 0.3, -25, 0.9)
    tt = race0
    while tt < foNew:
        put(tic, tt, -30, 0.12, 0.001, 0.04)
        tt += 0.25
    while tt < foOld:
        put(tic, tt, -34, 0.1, 0.001, 0.04)
        tt += 0.2
    ramp(brasas, race0, foNew, -40, -25, amb)
    ramp(burn, race0 + 0.5, foNew, -42, -27, amb)
    put("golpe", foNew - 0.55, -21, 1.4, 0.01, 0.4)
    put(ign, foNew - 0.1, -24, 1.2, 0.01, 0.4)
    put("trueno", foNew, -29, 2.0, 0.01, 0.8)
    put(burn, foNew + 0.3, -28, bed0 - foNew - 0.3, 0.2, 0.35, track=amb)
    put("golpe", foOld - 0.55, -24, 1.2, 0.01, 0.4)
    put(ign, foOld - 0.1, -25, 1.0, 0.01, 0.35)
    # 4) el dormitorio: el pasillo arde mientras la puerta está abierta; al cerrarse, solo se oye apagado
    put("whoosh", bed0, -28, 0.6)
    put(brasas, bed0 + 0.1, -30, close + 0.6 - bed0 - 0.1, 0.2, 0.08, track=amb)
    put(brasas, close + 0.6, -44, split - close - 0.6, 0.05, 0.3, track=amb)
    put("caida", close + 0.52, -19, 0.6, 0.002, 0.25)
    put(tic, close + 0.6, -27, 0.12, 0.001, 0.04)
    # 5) dos dormitorios: puerta cerrada (38 °C, tranquilo) y abierta (260 °C, alarma)
    put("whoosh", split, -28, 0.6)
    put(brasas, split + 0.3, -31, c["compartir"] - split - 0.4, 0.4, 0.3, track=amb)
    put("nota", c["treinta"] + 0.9, -27, 0.9, 0.005, 0.3)
    put("fallo", c["doscientos"] + 1.1, -29, 0.5, 0.005, 0.15)
    put("latido", c["doscientos"] + 1.15, -22, 1.1, 0.005, 0.2)
    # 6) venta: destellos, avión de papel, fuego de la marca
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put(brasas, tM + 0.2, -36, END - (tM + 0.2), 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())

# ---------------------------------------------------------------- formato «profeia» (profeia.js): anuncio de Profe IA
# Efectos de ElevenLabs ya generados para otros vídeos (copiados en assets/sfx). Misma línea de tiempo que PI en profeia.js.
def sfx_track_profeia(path):
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    q0, calm, phone = c["encuentras"] - 0.1, c["facil"] - 0.1, c["pasas"] - 0.45
    ok, exp_, pag, tem = c["correcta"], c["explicacion"], c["pagina"], c["temario"]
    page, marca = LINES[4]["start"] - 0.15, c["marca"]
    l3end = LINES[2]["end"]
    bub, tic = _onset(_load("burbuja")), _onset(_load("tic"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), t0)

    # 1) el sello cae, Albacete 2026, la pregunta, la confusión y «¡imposible!»
    put("sello_baja", 0.12, -16, 0.6, 0.002, 0.25)
    put("tension", 0.0, -32, calm + 0.2, 0.3, 0.4, track=amb)
    put("toque", c["albacete"], -27, 0.4)
    put("destello", c["anio"], -26, 0.6)
    put("whoosh", q0, -28, 0.6)
    for k in range(3):
        put(_pitch(bub, 1 + 0.1 * k), c["que"] + 0.12 * k, -28, 0.25)
    put("fallo", c["imposible"] + 0.05, -25, 0.5, 0.005, 0.15)
    put("latido", c["imposible"] + 0.1, -23, 1.0, 0.005, 0.2)
    # 2) copiar, el móvil, los toques en la app y la espera acelerada
    put(tic, c["copias"] + 0.2, -24, 0.15, 0.001, 0.05)
    put("whoosh2", c["copias"] + 0.45, -27, 0.7)
    put("whoosh", phone, -28, 0.6)
    for tt in (phone + 0.4, phone + 0.85, max(phone + 1.55, l3end)):
        put(tic, tt, -27, 0.12, 0.001, 0.04)
    seg = c["segundos"]
    if ok - 0.3 - seg > 0.2:
        put("avance", seg, -31, ok - 0.3 - seg, 0.05, 0.15)
    put("musica", calm + 0.2, -35, marca - 0.3 - calm - 0.2, 0.6, 0.6, track=amb)
    # 3) correcta, explicación, página exacta y la página del manual
    put("acierto", ok, -22, 0.6, 0.002, 0.2)
    put("toque", exp_ + 0.05, -27, 0.4)
    put("nota", pag + 0.45, -25, 0.8, 0.005, 0.3)
    put("papeles", tem + 0.05, -28, 0.8, 0.01, 0.3)
    put("papeles", page, -31, 0.8, 0.01, 0.3)
    put("destello", c["pregunta2"] - 0.05, -25, 0.7)
    for k in ("pregunta2", "entiende", "avanzando"):
        put(bub, c[k], -27, 0.25)
    # 4) venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    put(_load("fuego")[int(0.3 * sfx.SR):], marca - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", marca + 0.2, -36, END - (marca + 0.2), 0.4, 0.3, track=amb)
    put("marca", marca - 0.05, -26, 1.0, 0.002, 0.25)
    put("sello_baja", marca + 0.3, -26, 0.4, 0.002, 0.15)                 # la etiqueta PRO
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())

# ---------------------------------------------------------------- formato «extintor» (extintor.js, 3D cinematográfico)
# Efectos de ElevenLabs ya generados para otros vídeos (copiados en assets/sfx). Misma línea de tiempo que T en
# extintor.js: cada sonido empieza cuando empieza su imagen y acaba cuando acaba (_tramo). En el tiempo congelado del
# gancho el fuego suena grave y apagado; vuelve a sonar normal cuando el tiempo arranca.
def sfx_track_extintor(path):
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))           # fuegos y tensión de fondo: bajan cuando habla la voz
    c = {k: at(v) for k, v in Q["cues"].items()}
    l3e, l4s = LINES[2]["end"], LINES[3]["start"]
    T = dict(c)
    T["count0"], T["count1"] = l3e + 0.05, l4s - 0.05
    T["w1"] = c["leerlo"] - 0.1; T["macro"] = T["w1"] + 0.5
    T["out"] = max(c["codigo"] + 0.55, T["macro"] + 1.3); T["cardsIn"] = T["out"] + 0.3
    T["lab"] = c["esla"] + 0.62; T["w2"] = c["bandeja"] - 0.3; T["w3"] = c["cuanto"] - 0.25; T["fin"] = c["compartir"] - 0.2
    fuego, vapor, brasas, bub = _load("fuego"), _load("vapor"), _load("brasas"), _onset(_load("burbuja"))
    burn = fuego[int(1.2 * sfx.SR):int(2.6 * sfx.SR)]

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), t0, g)

    # 1) gancho: tiempo congelado (fuego grave y lejano, tensión), el anillo de 15 m, el tiempo arranca y barrido a la etiqueta
    put(_pitch(burn, 0.55), 0.0, -31, c["nadie"] + 0.1, 0.25, 0.3, track=amb)
    put("tension", 0.0, -30, T["w1"] + 0.2, 0.4, 0.3, track=amb)
    put("latido", 0.15, -29, 0.5)
    put("destello", c["metros"] - 0.25, -27, 0.9, 0.005, 0.3)
    put(_pitch(_onset(_load("whoosh")), 0.8), c["metros"] - 0.3, -31, 0.7)
    put(burn, c["nadie"] - 0.05, -30, T["out"] - c["nadie"], 0.5, 0.4, track=amb)
    put(vapor, c["nadie"], -35, T["w1"] - c["nadie"] + 0.2, 0.4, 0.2, track=amb)
    put("whoosh2", T["w1"] - 0.12, -23, 0.75)
    # 2) el código se enciende; las cuatro tarjetas entran; «comenta»; cuenta atrás 3-2-1 con tensión
    put("destello", c["codigo"] - 0.12, -25, 0.8, 0.005, 0.3)
    put("nota", c["codigo"] - 0.05, -28, 0.9)
    put("whoosh", T["out"] + 0.2, -30, 0.6)
    for i in range(4):
        put(_pitch(bub, 1 + 0.06 * i), T["cardsIn"] + 0.11 * i + 0.12, -27, 0.25)
    put("toque", c["comenta"] - 0.05, -27, 0.35)
    put("tension", T["count0"] - 0.2, -27, T["count1"] - T["count0"] + 0.3, 0.3, 0.1)
    for k in range(3):
        put("tic", T["count0"] + k * (T["count1"] - T["count0"]) / 3, -22 + 2 * k, 0.3)
    # 3) «es la A»: acierto, la cámara atraviesa la tarjeta (destello) y entra en el laboratorio con el fuego rugiendo
    put("acierto", c["esla"] - 0.02, -24, 0.8, 0.002, 0.3)
    put("whoosh2", c["esla"] + 0.18, -24, 0.6)
    put("golpe", T["lab"] - 0.06, -22, 1.0, 0.005, 0.5)
    hit = c["apago"] + 0.05
    put(burn, T["lab"], -24, hit - T["lab"] + 0.25, 0.05, 0.6, track=amb)
    # 4) «apagó»: entra la boquilla, cámara lenta (golpe grave) y el chorro de polvo; luego humea
    put("whoosh", c["apago"] - 0.6, -30, 0.5)
    put(_pitch(_onset(_load("golpe")), 0.7), c["apago"] - 0.15, -24, 1.1, 0.005, 0.5)
    put(_pitch(vapor, 0.75), hit - 0.3, -24, 1.25, 0.01, 0.3)
    put(vapor, hit + 0.95, -28, 0.6, 0.05, 0.3)
    put(vapor[int(1.0 * sfx.SR):], hit + 1.2, -36, 1.4, 0.3, 0.8, track=amb)
    # 5) la cinta métrica corre (clics) y sale el «21A»
    d0, d1 = c["dos"] - 0.15, c["dos"] - 0.15 + max(0.6, c["diez"] - c["dos"] + 0.25)
    rele = _onset(_load("rele"))
    for k in range(int((d1 - d0) / 0.07)):
        put(_pitch(rele, 1.6), d0 + 0.07 * k, -33, 0.05, 0.001, 0.02)
    put("golpe", c["a21"] - 0.1, -23, 0.9, 0.005, 0.4)
    put("destello", c["a21"] - 0.05, -27, 0.7)
    # 6) barrido a la bandeja: el fuego grande ruge; la probeta se llena (agua y heptano) y salen 113 L y 113B
    put("whoosh2", T["w2"] - 0.05, -23, 0.6)
    put(fuego, T["w2"] + 0.25, -23, T["w3"] - T["w2"], 0.15, 0.3, track=amb)
    for k in range(4):
        put(_pitch(bub, 0.7 + 0.05 * k), c["litros"] - 0.2 + 0.18 * k, -27, 0.2)
    put("toque", c["litros"] + 0.25, -27, 0.35)
    put("golpe", c["b113"] - 0.1, -23, 0.9, 0.005, 0.4)
    put("destello", c["b113"] - 0.05, -27, 0.7)
    # 7) más número, más fuego: barrido y un golpe con llamarada en cada salto
    put("whoosh", T["w3"] - 0.05, -25, 0.6)
    steps = [c["cuanto"] - 0.1, c["cuanto"] + 0.35, c["numero"] - 0.05, c["fuego"] - 0.2, c["fuego"] + 0.25]
    for k, ts in enumerate(steps):
        put(_pitch(_onset(_load("golpe")), 1.15 - 0.08 * k), ts, -30 + 1.5 * k, 0.5, 0.005, 0.25)
        put(fuego[int(0.3 * sfx.SR):], ts, -31 + 1.5 * k, 0.6, 0.02, 0.3)
    put(burn, T["w3"] + 0.3, -26, T["fin"] - T["w3"], 0.2, 0.4, track=amb)
    # 8) venta: destellos, avión de papel, la marca con su estallido y brasas
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put(brasas, T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())


# ---------------------------------------------------------------- formato «acoplamiento» (acoplamiento.js, 3D de noche)
# Misma línea de tiempo que T en acoplamiento.js: el agua que corre suena (vapor) solo mientras corre; cada rótulo con su toque.
def sfx_track_acoplamiento(path):
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["l6e"], T["l8s"] = LINES[5]["end"], LINES[7]["start"]
    T["sOn"], T["sOff"], T["pOn"], T["fin"] = c["serie"] - 0.1, c["paralelo"] - 0.35, c["paralelo"] - 0.05, c["compartir"] - 0.25
    fuego, vapor, bub = _load("fuego"), _load("vapor"), _onset(_load("burbuja"))
    burn = fuego[int(1.2 * sfx.SR):int(2.6 * sfx.SR)]

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), t0, g)

    # noche de intervención: fuego de fondo y la sirena/rotativo lejos al principio
    put(burn, 0.0, -31, END, 0.4, 0.6, track=amb)
    put("rotativo", 0.0, -33, c["conectes"] + 0.3, 0.3, 0.6, track=amb)
    put("tension", 0.0, -34, c["serie"], 0.5, 0.5, track=amb)
    put("whoosh", c["todo"] - 0.35, -28, 0.6)
    put("toque", c["presion"] - 0.05, -27, 0.35)
    put("toque", c["agua"] - 0.05, -27, 0.35)
    # EN SERIE: las mangueras se tienden, el agua corre por la 1 y luego por la 2, el chorro arriba
    put("destello", c["serie"] - 0.1, -26, 0.7)
    put("whoosh2", T["sOn"] + 0.1, -28, 0.8)
    put(bub, c["bomba1"] - 0.05, -27, 0.25); put(_pitch(bub, 1.1), c["otra"] - 0.05, -27, 0.25)
    put(vapor, c["bomba1"], -36, T["sOff"] - c["bomba1"], 0.3, 0.3, track=amb)
    put(vapor, c["otra"] + 0.8, -30, T["sOff"] + 0.2 - c["otra"] - 0.8, 0.2, 0.3)
    put("toque", c["ocho1"] - 0.05, -27, 0.35)
    put("golpe", c["dieciseis"] - 0.05, -24, 0.9, 0.005, 0.4)
    put(_pitch(bub, 0.9), c["caudal"] - 0.05, -28, 0.25)
    put("whoosh", c["alto"] - 0.4, -30, 0.6)
    # EN PARALELO: barrido, las dos líneas a la vez, el chorro gordo sobre la nave
    put("whoosh2", c["paralelo"] - 0.3, -25, 0.7)
    put("destello", c["paralelo"] - 0.05, -26, 0.7)
    put(vapor, c["vez"], -35, END - c["vez"], 0.3, 0.6, track=amb)
    put(vapor, c["linea"] + 0.7, -27, T["fin"] - c["linea"] - 0.7, 0.2, 0.5)
    put(_pitch(bub, 1.0), c["mil1"] - 0.05, -27, 0.25); put(_pitch(bub, 1.1), c["mil2"] - 0.05, -27, 0.25)
    put("golpe", c["dosmil"] - 0.05, -24, 0.9, 0.005, 0.4)
    # la trampa
    put("tension", c["trampa"] - 0.2, -29, T["l8s"] - c["trampa"], 0.2, 0.3)
    put("acierto", c["noserie"] - 0.15, -29, 0.5); put("fallo", c["noserie"] + 0.6, -30, 0.4)
    put("acierto", c["noparalelo"] - 0.15, -29, 0.5); put("fallo", c["noparalelo"] + 0.6, -30, 0.4)
    # piso 20: la cámara sube, se enciende la planta, los botones y los bocadillos
    put("whoosh", T["l8s"] - 0.1, -28, 0.8)
    put("nota", c["veinte"] - 0.05, -27, 0.9)
    put(bub, T["l8s"] + 0.95, -27, 0.25); put(_pitch(bub, 1.1), T["l8s"] + 1.05, -27, 0.25)
    put(bub, c["comenta"] - 0.05, -25, 0.25); put(_pitch(bub, 1.15), c["comenta"] + 0.08, -26, 0.25)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())


def sfx_track_botella(path):
    """«¿Cuánto aire te queda?»: respiración del ERA sincronizada con las bocanadas (normal → rápida en la cuenta y la alarma
    → normal tras el rebobinado), fuego de fondo, cuenta 1→5 con bocina en el 5, silbato de reserva, relleno de aire, reloj."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["l2e"], T["l3e"] = LINES[2]["end"], LINES[3]["end"]
    T["count0"] = T["l3e"] + 0.05; T["count1"] = T["count0"] + 4.0
    T["cardsIn"] = T["l2e"] - 0.55; T["fin"] = c["compartir"] - 0.25
    fuego, vapor, bub = _load("fuego"), _load("vapor"), _onset(_load("burbuja"))
    burn = fuego[int(1.2 * sfx.SR):int(2.6 * sfx.SR)]

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), t0, g)

    # respiración: cada ciclo en su sitio exacto (como las bocanadas de la escena)
    rn, rf = _load("respiracion"), _load("respiracion_rapida")
    cyc_n, cyc_f = _to(rn[: int(3.0 * sfx.SR)], -27), _to(rf[: int(1.55 * sfx.SR)], -25)
    for a, b, cyc, per in ((0.0, T["count0"], cyc_n, 3.0), (T["count0"], c["dentro"], cyc_f, 1.55), (c["reserva2"], T["fin"], cyc_n, 3.0)):
        k = 0
        while a + k * per < b - 0.3:
            seg = cyc[: int(min(per, b - (a + k * per)) * sfx.SR)].copy()
            n = min(len(seg), int(0.03 * sfx.SR)); seg[-n:] *= np.linspace(1, 0, n)[:, None]
            _put(amb, seg, a + k * per)
            k += 1
    # fuego de fondo todo el vídeo; latido y destello en el gancho
    put(burn, 0.0, -30, END, 0.4, 0.6, track=amb)
    put("latido", 0.1, -29, 0.6)
    put("destello", 0.05, -31, 0.8, 0.005, 0.3)
    put("whoosh", c["botella"] - 0.3, -31, 0.6)
    # el manómetro sale del hombro; los datos con su golpe
    put("whoosh2", c["cuantos"] - 0.15, -26, 0.7)
    put("toque", c["cuantos"] + 0.15, -27, 0.35)
    put("golpe", c["bares"] - 0.08, -27, 0.6, 0.005, 0.3)
    put(bub, c["litros"] - 0.05, -26, 0.25)
    put(_pitch(_onset(_load("nota")), 0.7), c["sesenta"] - 0.05, -28, 0.9)
    put(_pitch(_onset(_load("rele")), 0.9), c["sesenta"] + 0.05, -27, 0.2)
    put(vapor, c["t35"] - 0.05, -33, 0.7, 0.05, 0.3)
    # tarjetas, comenta y la cuenta 1 → 5 (bocina en el 5)
    put("whoosh", T["cardsIn"] - 0.1, -29, 0.6)
    for i in range(4):
        put(_pitch(bub, 1 + 0.06 * i), T["cardsIn"] + 0.1 * i + 0.1, -27, 0.25)
    put("toque", c["comenta"] - 0.05, -27, 0.35)
    put("tension", T["count0"] - 0.2, -27, c["tiempo"] - T["count0"] + 0.4, 0.3, 0.15)
    for k in range(4):
        put("tic", T["count0"] + k, -22 + 1.5 * k, 0.3)
    put("bocina", T["count1"] - 0.02, -19, 0.9, 0.003, 0.12)
    put("golpe", T["count1"] - 0.02, -24, 0.7, 0.005, 0.3)
    # «¡Tiempo!»: la A en rojo; la aguja cae a 0, silbato de reserva y «SIN AIRE»
    put("fallo", c["tiempo"] + 0.12, -25, 0.5)
    put(_pitch(_onset(_load("caida")), 0.85), c["cuarenta"] - 0.1, -28, c["dentro"] - c["cuarenta"] + 0.3, 0.02, 0.2)
    put("silbato", c["sin"] - 0.35, -25, c["reserva2"] - c["sin"] + 0.1, 0.05, 0.25, track=amb)
    put("golpe", c["dentro"] - 0.08, -23, 0.9, 0.005, 0.4)
    # rebobinado: la botella se rellena; candado de la reserva; la SALIDA se enciende
    put(_pitch(_onset(_load("whoosh2")), 1.3), c["reserva2"] - 0.25, -27, 0.6)
    put("aire", c["reserva2"] - 0.2, -29, 0.8, 0.02, 0.3)
    put(_pitch(_onset(_load("rele")), 0.8), c["toca"] - 0.03, -25, 0.25)
    put("acierto", c["salir"] - 0.1, -27, 0.7)
    put("destello", c["salir"] - 0.15, -30, 0.7)
    # la cuenta: golpes en cada resultado, el aire llena el cubo, el reloj corre hasta 34:00
    put("toque", c["d230b"] - 0.05, -28, 0.35); put(_pitch(_onset(_load("toque")), 0.85), c["menos"] - 0.05, -28, 0.35)
    put("golpe", c["ciento"] - 0.08, -26, 0.7, 0.005, 0.3)
    put("toque", c["por7"] - 0.05, -28, 0.35); put(_pitch(_onset(_load("toque")), 1.15), c["siete2"] - 0.05, -28, 0.35)
    put("aire", c["mil"] - 0.3, -24, max(1.0, c["aire2"] + 0.4 - c["mil"]), 0.02, 0.35)
    put("golpe", c["mil"] + 0.25, -26, 0.7, 0.005, 0.3)
    put("toque", c["entre"] - 0.05, -28, 0.35)
    put("reloj", c["t35b"], -25, max(0.6, c["t34"] - c["t35b"]), 0.01, 0.05)
    put("golpe", c["t34"] - 0.05, -21, 1.0, 0.005, 0.4)
    put("destello", c["t34"] - 0.05, -26, 0.7)
    put("whoosh2", c["esla"] - 0.25, -28, 0.6)
    put("acierto", c["esla"] - 0.02, -22, 0.8, 0.002, 0.3)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_presion(path):
    """«¿Qué presión llega a la lanza?»: motor de la autobomba y rotativos abajo, agua que llena la manguera al subir la
    cámara, llave de la lanza al cerrarse, fuego arriba, cuenta 1→5 con bocina, una nota que sube en cada 10 m y el final
    que pide la respuesta en comentarios (sin darla)."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["l1e"], T["l2e"] = LINES[1]["end"], LINES[2]["end"]
    T["count0"] = T["l2e"] + 0.05; T["count1"] = T["count0"] + 4.0
    T["fin"] = c["compartir"] - 0.25
    fuego, bub, nota, toque = _load("fuego"), _onset(_load("burbuja")), _onset(_load("nota")), _onset(_load("toque"))
    burn = fuego[int(1.2 * sfx.SR):int(2.6 * sfx.SR)]
    motor = _load("motor")

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), t0, g)

    # abajo: motor al ralentí y rotativos; arriba: el fuego. El motor vuelve cuando la cámara baja a la bomba.
    put(motor, 0.0, -25, c["cincuenta0"] + 0.3, 0.05, 0.9, track=amb)
    put("rotativo", 0.0, -31, c["cincuenta0"], 0.05, 0.8, track=amb)
    put(motor, c["marcab"] - 0.35, -26, c["lanza"] - c["marcab"] + 0.3, 0.15, 0.35, track=amb)
    put("rotativo", c["marcab"] - 0.35, -33, c["lanza"] - c["marcab"] + 0.3, 0.15, 0.35, track=amb)
    put(motor, c["lanza"] - 0.1, -38, END - c["lanza"], 0.3, 0.8, track=amb)
    put(burn, 0.0, -31, END, 0.4, 0.6, track=amb)
    put("latido", 0.1, -29, 0.6)
    put("destello", 0.05, -31, 0.8, 0.005, 0.3)
    # «Tu compañero, cincuenta metros más arriba»: la cámara sube con el agua que llena la manguera
    put("whoosh2", c["companero"] - 0.25, -29, 0.9)
    put("agua", c["companero"] - 0.15, -28, 2.6, 0.01, 0.4)
    put(_pitch(nota, 1.12), c["cincuenta0"] - 0.03, -28, 0.9)
    put(fuego[int(0.3 * sfx.SR):], c["arriba"] - 0.25, -27, 1.3, 0.1, 0.4)
    # la bomba marca 8 bares (la aguja sube), sello del examen; la lanza CERRADA (llave); el manómetro de la lanza con «?»
    put("whoosh", c["marcab"] - 0.4, -28, 0.6)
    put("whoosh2", c["marcab"] - 0.05, -28, 0.7)
    put(toque, c["marcab"] + 0.1, -29, 0.35)
    put(_pitch(_onset(_load("caida")), 0.6)[::-1].copy(), c["marcab"] + 0.1, -33, 0.6, 0.02, 0.1)
    put("golpe", c["ocho0"] - 0.06, -27, 0.6, 0.005, 0.3)
    put("whoosh2", c["lanza"] - 0.3, -28, 0.7)
    put("llave", c["cerrada"] - 0.02, -21, 0.6, 0.001, 0.1)
    put("golpe", c["cerrada"], -30, 0.5, 0.005, 0.25)
    put("whoosh2", c["presion"] - 0.15, -29, 0.7)
    put(_pitch(nota, 1.3), c["presion"] + 0.1, -31, 0.8)
    # tarjetas, comenta y la cuenta 1 → 5 (bocina en el 5)
    put("whoosh", T["l1e"] - 0.45, -29, 0.6)
    for i in range(4):
        put(_pitch(bub, 1 + 0.06 * i), T["l1e"] - 0.3 + 0.08 * i, -27, 0.25)
    put(toque, c["comenta"] - 0.05, -28, 0.35)
    put("tension", T["count0"] - 0.2, -27, c["tiempo"] - T["count0"] + 0.4, 0.3, 0.15)
    for k in range(4):
        put("tic", T["count0"] + k, -22 + 1.5 * k, 0.3)
    put("bocina", T["count1"] - 0.02, -19, 0.9, 0.003, 0.12)
    put("golpe", T["count1"] - 0.02, -24, 0.7, 0.005, 0.3)
    # «¡Tiempo! Si has dicho ocho…»: la D en rojo; «la ALTURA»: la regla de 50 m
    put("fallo", c["tiempo"] + 0.12, -26, 0.5)
    put("whoosh2", c["tiempo"] + 0.2, -30, 0.7)
    put(toque, c["ocho1"] - 0.05, -29, 0.35)
    put("golpe", c["altura"] - 0.06, -27, 0.6, 0.005, 0.3)
    # la subida: una nota más aguda en cada marca de 10 m (y el −1, −2… −5 BAR), golpe en «Cinco bares menos»
    put("whoosh", c["cada"] - 0.35, -28, 0.6)
    put(toque, c["pierde"] - 0.05, -29, 0.35)
    for k, key in enumerate(("d10", "d20", "d30", "d40", "d50")):
        put(_pitch(nota, 1.0 * 1.122 ** k), c[key] - 0.03, -28 + 0.5 * k, 0.8)
        put(_pitch(toque, 1.1 + 0.05 * k), c[key] + 0.02, -31, 0.3)
    put("whoosh2", c["d10"] - 0.2, -31, c["d50"] - c["d10"] + 0.3, 0.2, 0.2, track=amb)
    put("golpe", c["menos5"] - 0.08, -23, 0.9, 0.005, 0.4)
    put("destello", c["menos5"] - 0.1, -27, 0.7)
    # lanza cerrada: el agua no corre (se para, «glup») → rozamiento 0
    put("llave", c["como"] + 0.35, -27, 0.6, 0.001, 0.1)
    put(_pitch(bub, 0.55), c["corre"] - 0.05, -26, 0.4)
    put(_pitch(_onset(_load("rele")), 0.9), c["rozamiento"] - 0.05, -27, 0.25)
    put(toque, c["rozamiento"] + 0.1, -29, 0.35)
    # «Escribe en comentarios cuál crees que es la correcta»: 8 − 5 − 0 = ? y vuelven las tarjetas
    put("whoosh2", c["escribe"] - 0.2, -27, 0.7)
    for k, t0 in enumerate((c["escribe"], c["escribe"] + 0.3, c["comentarios"] + 0.05)):
        put(_pitch(toque, 1.0 + 0.1 * k), t0 - 0.03, -28, 0.3)
    put("whoosh", c["comentarios"] - 0.35, -29, 0.6)
    for i in range(4):
        put(_pitch(bub, 1 + 0.06 * i), c["comentarios"] - 0.2 + 0.07 * i, -28, 0.25)
    put(_pitch(nota, 1.5), c["cual"] - 0.03, -27, 0.9)
    put("tension", c["cual"] - 0.1, -31, T["fin"] - c["cual"] + 0.1, 0.2, 0.25)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_sueldos(path):
    """«¿Cuánto gana un bombero en Madrid y en Granada?»: noche con fuego y rotativos, nóminas que caen, sellos, monedas
    cuando crecen las columnas de oro, reloj de las horas, cinco golpes de las guardias de Granada, €/hora, la columna de
    Madrid que baja y vuelve a subir (+10 % en 2024) y el cierre de venta."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    T["antes"] = c["subio"] - 0.75
    fuego, bub, nota, toque = _load("fuego"), _onset(_load("burbuja")), _onset(_load("nota")), _onset(_load("toque"))
    burn = fuego[int(1.2 * sfx.SR):int(2.6 * sfx.SR)]

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), t0, g)

    # noche: fuego al fondo todo el vídeo, rotativos al principio
    put(burn, 0.0, -31, END, 0.4, 0.6, track=amb)
    put("rotativo", 0.0, -33, c["igual"], 0.1, 1.2, track=amb)
    put("latido", 0.1, -29, 0.6)
    put("destello", 0.05, -31, 0.8, 0.005, 0.3)
    put(toque, c["casco"] - 0.03, -31, 0.3)
    put(fuego[int(0.3 * sfx.SR):], c["fuego"] - 0.15, -27, 1.1, 0.05, 0.4)
    put(_pitch(toque, 1.1), c["oposicion"] - 0.03, -31, 0.3)
    # «pero no cobran lo mismo»: caen las nóminas y el sello
    put("papeles", c["cobran"] - 0.2, -27, 0.8, 0.01, 0.2)
    put("sello", c["mismo3"] - 0.25, -24, 0.7, 0.002, 0.2)
    put(_pitch(nota, 1.0), c["madrid0"] - 0.03, -29, 0.8)
    put(_pitch(nota, 1.12), c["granada0"] - 0.03, -29, 0.8)
    # sueldo base: las dos columnas crecen igual; sello del Estado; 900 €/mes
    put("whoosh2", c["base"] - 0.3, -29, 0.7)
    put("monedas", c["base"] - 0.1, -25, 1.0, 0.01, 0.2)
    put("sello", c["estado"] - 0.2, -24, 0.7, 0.002, 0.2)
    put("moneda", c["novecientos"] - 0.03, -25, 0.6)
    put(toque, c["espana"] - 0.03, -30, 0.3)
    # complemento específico: Madrid 27.800, Granada 25.400
    put("whoosh2", c["especifico"] - 0.25, -28, 0.7)
    put("destello", c["especifico"] - 0.1, -30, 0.7)
    put("monedas", c["madrid1"] - 0.05, -24, 1.4, 0.01, 0.25)
    put(_pitch(nota, 1.26), c["madrid1"] + 1.25, -29, 0.8)
    put("monedas", c["granada1"] - 0.05, -25, 1.4, 0.01, 0.25)
    put(_pitch(nota, 1.12), c["granada1"] + 1.25, -29, 0.8)
    # el total
    put("whoosh", c["total"] - 0.35, -29, 0.6)
    put("golpe", c["t47"] - 0.06, -27, 0.6, 0.005, 0.3)
    put(_pitch(_onset(_load("golpe")), 0.9), c["t44"] - 0.06, -28, 0.6, 0.005, 0.3)
    put(toque, c["parece"] - 0.03, -30, 0.3)
    # las horas: reloj; cinco guardias que caen en Granada
    put("reloj", c["horas"] - 0.1, -28, max(0.6, c["cinco"] - c["horas"]), 0.02, 0.1)
    put(toque, c["trabajan"] - 0.03, -30, 0.3)
    for i in range(5):
        put(_pitch(_onset(_load("golpe")), 1.05 + 0.04 * i), c["cinco"] - 0.1 + i * 0.14 + 0.43, -24, 0.45, 0.002, 0.2)
    put("sello", c["guardias"] - 0.15, -25, 0.7, 0.002, 0.2)
    # por hora
    put("moneda", c["h31"] - 0.05, -25, 0.6)
    put(_pitch(nota, 1.12), c["h31"] - 0.03, -30, 0.8)
    put(_pitch(nota, 0.84), c["h27"] - 0.03, -28, 0.9)
    # por qué: cada ayuntamiento, su presupuesto y su negociación; Madrid baja a lo de antes y sube un 10 %
    put("whoosh", c["ypq"] - 0.35, -29, 0.6)
    put(toque, c["paga"] - 0.03, -30, 0.3)
    put("papeles", c["presupuesto"] - 0.1, -31, 0.6, 0.01, 0.2)
    put(_pitch(toque, 1.15), c["negocia"] - 0.03, -30, 0.3)
    put(_pitch(_onset(_load("caida")), 0.9), T["antes"] - 0.05, -28, 0.6, 0.01, 0.2)
    put("monedas", c["subio"] - 0.05, -24, 0.9, 0.01, 0.2)
    put("sello", c["diez"] - 0.15, -23, 0.7, 0.002, 0.2)
    put("destello", c["diez"] - 0.1, -28, 0.7)
    # ¿Madrid o Granada?
    put("tension", c["justo"] - 0.2, -31, T["fin"] - c["justo"] + 0.2, 0.2, 0.25)
    put("whoosh", c["justo"] - 0.3, -29, 0.6)
    put(bub, c["madrid3"] - 0.02, -26, 0.25)
    put(_pitch(bub, 1.12), c["granada3"] - 0.02, -26, 0.25)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_espuma(path):
    """«¿Cuánta agua necesitas?» (espuma): fuego dentro del local que la espuma tapa, rugido del generador mientras sube
    hasta el techo, datos con su golpe, cuenta 1→5 con bocina, «¡Tiempo!», cuentas (90 m³, ×150, ÷150 = 600 L, 9 L) y venta."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["l1e"], T["l2e"] = LINES[1]["end"], LINES[2]["end"]
    T["count0"] = T["l2e"] + 0.05; T["count1"] = T["count0"] + 4.0
    T["fin"] = c["compartir"] - 0.25
    fuego, bub, nota, toque = _load("fuego"), _onset(_load("burbuja")), _onset(_load("nota")), _onset(_load("toque"))
    burn = fuego[int(1.2 * sfx.SR):int(2.6 * sfx.SR)]

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), t0, g)

    # dentro: el fuego (lo tapa la espuma) y el generador rugiendo mientras sube hasta el techo
    put(burn, 0.0, -27, c["techo"] - 0.2, 0.05, 0.8, track=amb)
    put("generador", 0.0, -23, c["techo"] + 1.2, 0.05, 1.0, track=amb)
    put("burbujeo", 0.3, -29, c["techo"] + 0.6, 0.2, 0.6, track=amb)
    put("rotativo", c["techo"], -35, T["count0"] - c["techo"], 0.4, 0.8, track=amb)
    put("latido", 0.1, -29, 0.6)
    put("destello", 0.05, -31, 0.8, 0.005, 0.3)
    put("golpe", c["techo"] - 0.08, -27, 0.7, 0.005, 0.3)
    # los datos
    put(toque, c["cuadrados"] - 0.03, -29, 0.3)
    put(_pitch(toque, 1.12), c["alto"] - 0.03, -29, 0.3)
    put(_pitch(bub, 0.8), c["espumogeno0"] - 0.02, -27, 0.3)
    put("whoosh2", c["expansion0"] - 0.2, -28, 0.7)
    put(_pitch(nota, 1.2), c["cuanta0"] - 0.03, -28, 0.8)
    # tarjetas, comenta y la cuenta 1 → 5 (bocina en el 5)
    put("whoosh", T["l1e"] - 0.45, -29, 0.6)
    for i in range(4):
        put(_pitch(bub, 1 + 0.06 * i), T["l1e"] - 0.3 + 0.08 * i, -27, 0.25)
    put(toque, c["comenta"] - 0.05, -28, 0.35)
    put("tension", T["count0"] - 0.2, -27, c["tiempo"] - T["count0"] + 0.4, 0.3, 0.15)
    for k in range(4):
        put("tic", T["count0"] + k, -22 + 1.5 * k, 0.3)
    put("bocina", T["count1"] - 0.02, -19, 0.9, 0.003, 0.12)
    put("golpe", T["count1"] - 0.02, -24, 0.7, 0.005, 0.3)
    # «¡Tiempo! Si has dicho seiscientos… te has olvidado del espumógeno»
    put("fallo", c["seiscientos0"] + 0.05, -26, 0.5)
    put(_pitch(_onset(_load("rele")), 0.9), c["espumogeno1"] - 0.03, -27, 0.25)
    put("destello", c["espumogeno1"] - 0.05, -30, 0.7)
    # las cuentas
    put(toque, c["treinta1"] - 0.03, -29, 0.3); put(_pitch(toque, 1.1), c["tres1"] - 0.03, -29, 0.3)
    put("golpe", c["noventa0"] - 0.06, -27, 0.6, 0.005, 0.3)
    put(bub, c["litro"] - 0.02, -26, 0.3)
    put("whoosh2", c["ciento1"] - 0.15, -27, 0.8)
    put("burbujeo", c["ciento1"], -28, 0.9, 0.05, 0.3)
    put("whoosh", c["noventa1"] - 0.2, -28, 0.7)
    put(toque, c["entre"] - 0.03, -29, 0.3)
    put("agua", c["seiscientos1"] - 0.3, -27, 1.0, 0.02, 0.3)
    put("golpe", c["seiscientos1"] - 0.06, -27, 0.6, 0.005, 0.3)
    put(toque, c["agua1"] - 0.03, -29, 0.3); put(_pitch(toque, 1.15), c["espumogeno2"] - 0.03, -29, 0.3)
    put(_pitch(nota, 1.12), c["nueve"] - 0.03, -27, 0.8)
    put("destello", c["nueve"] - 0.05, -30, 0.7)
    # ¿cuánta agua? (no se dice: se pide en comentarios)
    put("whoosh", c["entonces"] - 0.3, -29, 0.6)
    put(_pitch(nota, 1.5), c["agua2"] - 0.03, -27, 0.9)
    put(bub, c["escribe"] - 0.02, -27, 0.25)
    put("tension", c["agua2"] - 0.1, -31, T["fin"] - c["agua2"] + 0.1, 0.2, 0.25)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_guardia(path):
    """«Un día de bombero: 24 h de guardia»: reloj acelerado del «time-lapse» (autobombas que salen con la sirena), relevo,
    revisión con su lista (✓), tazas, prácticas con agua, ciudad y motor, timbre + radio + sirena de la salida, fuego y agua,
    accidente (cristales, vapor), marcha atrás al volver, pesas, páginas, cena, contenedor, grillos de madrugada, pasos a
    casa, el calendario de descanso y la venta. Los planos empiezan en los mismos instantes que en guardia.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    S = dict(relevo=c["l2"] - 0.15, rev=c["revision"] - 0.1, mang=c["mangueras"] - 0.12, bot=c["aire"] - 0.3, desayuno=c["desayuno"] - 0.1,
             pract=c["entrenar"] - 0.45, recon=c["mediodia"] - 0.1, salida=c["salida"] - 0.08, casa=c["incendio"] - 0.1, acc=c["tarde"] - 0.1,
             vuelta=c["vuelta"] - 0.1, limpiar=c["limpiar"] - 0.1, pesas=c["entrenar2"] - 0.1, estudiar=c["estudiar"] - 0.12, cenar=c["cenar"] - 0.1,
             cont=c["once"] - 0.1, noche=c["madrugada"] - 0.1, listos=c["camiones2"] - 0.2, relevo2=c["ocho2"] - 0.1, casa2=c["veinti2"] - 0.1,
             ser=c["ser"] - 0.1, fin=c["compartir"] - 0.3)
    order = sorted(S.items(), key=lambda kv: kv[1])
    E = {k: (order[i + 1][1] if i + 1 < len(order) else END) for i, (k, _) in enumerate(order)}
    fuego, bub, toque, agua = _load("fuego"), _onset(_load("burbuja")), _onset(_load("toque")), _load("agua")
    sirena, motor = _load("sirena"), _load("motor")

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), t0, g)

    def cut(k, db=-31):                                   # golpecito suave en cada corte de plano
        put(_pitch(toque, 0.9 + 0.2 * (sum(map(ord, k)) % 5) / 4), S[k] - 0.01, db, 0.3)

    # gancho: el día entero en 5 s (tic-tac rápido); las autobombas salen con la sirena; de noche, grillos; «24 H»
    H = S["relevo"]
    th = lambda h: (h - 8) / 24 * H
    put("reloj_rapido", 0.0, -27, H, 0.02, 0.25)
    put("whoosh2", 0.0, -30, 0.8)
    for h0, db in [(9.2, -27), (16.2, -28), (23.0, -27)]:
        put(_pitch(sirena, 1.25), th(h0) - 0.05, db, 0.55, 0.01, 0.2)
        put(_pitch(motor, 1.5), th(h0) - 0.1, -30, 0.5, 0.02, 0.2)
    put("grillos", th(20.5), -36, th(30.5) - th(20.5), 0.3, 0.3, track=amb)
    put("golpe", c["veinti0"] - 0.06, -24, 0.7, 0.002, 0.3)
    put("destello", c["veinti0"] - 0.1, -28, 0.8)
    put("ciudad", 0.0, -40, END, 0.5, 0.5, track=amb)
    # relevo y revisión: lista con ✓
    cut("relevo")
    put(_pitch(_onset(_load("nota")), 1.0), c["relevo1"] - 0.03, -31, 0.8)
    cut("rev"); put("rele", S["rev"], -32, E["rev"] - S["rev"], 0.01, 0.1)
    for k in ("camiones", "mangueras", "botella"):
        put("acierto", c[k] - 0.03, -27, 0.6)
    cut("mang", -33)
    put("aire", c["aire"] - 0.05, -31, 1.0, 0.05, 0.3)
    put("llave", S["bot"] + 0.05, -30, 0.5)
    # desayuno y prácticas
    cut("desayuno"); put("tazas", S["desayuno"] + 0.05, -29, E["desayuno"] - S["desayuno"], 0.01, 0.2)
    cut("pract"); put(agua, S["pract"] + 0.05, -28, E["pract"] - S["pract"], 0.05, 0.2)
    put("silbato", S["pract"] + 0.1, -33, 0.5, 0.01, 0.2)
    # reconocimiento: motor de la autobomba por la calle, ciudad, el aro del hidrante
    cut("recon"); put(motor, S["recon"], -29, E["recon"] - S["recon"], 0.1, 0.15)
    put("ciudad", S["recon"], -31, E["recon"] - S["recon"], 0.2, 0.15)
    put(_pitch(bub, 0.8), c["ciudad"] - 0.25, -28, 0.3)
    put("destello", c["ciudad"] - 0.1, -31, 0.6)
    # ¡salida!: timbre, radio, sirena y motor; contador de salidas
    put("alarma", S["salida"] - 0.3, -26, 1.0, 0.005, 0.2)
    put("radio", c["salida"] + 0.1, -31, 0.9)
    put(sirena, c["salida"] + 0.12, -28, E["casa"] - c["salida"] - 0.1, 0.05, 1.2)
    put(_pitch(motor, 1.2), S["salida"], -27, E["salida"] - S["salida"] + 0.3, 0.02, 0.3)
    for k in ("salida", "accidente", "arde"):
        put(_pitch(_onset(_load("golpe")), 1.15), c[k] - 0.02, -30, 0.4, 0.002, 0.2)
    # vivienda: fuego y agua
    cut("casa"); put(fuego, S["casa"], -26, E["casa"] - S["casa"], 0.05, 0.3)
    put(agua, S["casa"] + 0.2, -29, E["casa"] - S["casa"] - 0.2, 0.1, 0.3)
    # accidente: cristales, vapor del motor, sirena lejana
    cut("acc"); put("cristales", S["acc"] + 0.05, -29, 1.0)
    put("vapor", S["acc"], -33, E["acc"] - S["acc"], 0.05, 0.2)
    put("rotativo", S["acc"], -35, E["acc"] - S["acc"], 0.1, 0.3)
    # vuelta al parque (marcha atrás), limpiar, pesas, estudiar, cenar
    cut("vuelta"); put("marcha_atras", S["vuelta"], -31, E["vuelta"] - S["vuelta"], 0.01, 0.1)
    put(_pitch(motor, 0.85), S["vuelta"], -31, E["vuelta"] - S["vuelta"], 0.05, 0.15)
    put("vapor", E["vuelta"] - 0.35, -30, 0.5, 0.01, 0.2)
    cut("limpiar"); put(_pitch(agua, 1.25), S["limpiar"], -30, E["limpiar"] - S["limpiar"], 0.03, 0.15)
    cut("pesas"); put("pesas", S["pesas"] + 0.05, -27, E["pesas"] - S["pesas"], 0.005, 0.15)
    cut("estudiar"); put("papeles", S["estudiar"] + 0.05, -29, E["estudiar"] - S["estudiar"], 0.01, 0.15)
    cut("cenar"); put(_pitch(_load("tazas"), 0.9), S["cenar"], -29, E["cenar"] - S["cenar"], 0.01, 0.15)
    # contenedor: sirena que llega, fuego y agua
    put(_pitch(sirena, 0.95), S["cont"] - 0.2, -32, 1.2, 0.05, 0.6)
    cut("cont"); put(fuego, S["cont"], -26, E["cont"] - S["cont"], 0.05, 0.3)
    put(agua, S["cont"] + 0.3, -30, E["cont"] - S["cont"] - 0.3, 0.1, 0.3)
    # madrugada: el parque en silencio (grillos y un reloj lento)
    cut("noche", -34)
    put("grillos", S["noche"], -30, E["listos"] - S["noche"], 0.4, 0.4)
    put("reloj", S["noche"] + 0.2, -36, E["noche"] - S["noche"], 0.2, 0.3)
    cut("listos", -33)
    # relevo: guardia cumplida; a casa (pasos); calendario de descanso
    cut("relevo2")
    put("acierto", c["relevo2"] - 0.03, -26, 0.6)
    put("destello", c["relevo2"] - 0.08, -30, 0.7)
    cut("casa2"); put("pasos", S["casa2"] + 0.1, -29, E["casa2"] - S["casa2"] - 0.1, 0.05, 0.3)
    for i in range(6):
        put(_pitch(toque, 1.0 + 0.06 * i), c["cuatro"] - 0.1 + i * 0.08, -29, 0.25)
    put(_pitch(_onset(_load("nota")), 1.12), c["servicio"] - 0.03, -30, 0.8)
    # «Ser bombero no es solo apagar fuegos»
    put("whoosh", S["ser"] - 0.25, -29, 0.6)
    for i in range(3):
        put(_pitch(_onset(_load("golpe")), 1.0 + 0.08 * i), c["ser"] + i * 0.25 - 0.02, -28, 0.45, 0.002, 0.2)
    put("tension", c["ser"], -33, T["fin"] - c["ser"], 0.3, 0.3)
    put(toque, c["teves"] - 0.03, -29, 0.3)
    put(_pitch(toque, 1.15), c["escribelo"] - 0.03, -29, 0.3)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_autobus(path):
    """«Cada minuto cuenta» (el opositor en la parada): reloj acelerado y coches que pasan zumbando en el gancho, ciudad de
    fondo, el móvil que sube y baja, toque en «Flashcards», tarjetas que giran, reto diario (tic por pregunta, monedas y
    fanfarria), la ruleta del 1 vs 1 y su cuenta atrás, el autobús que llega (motor, frenos, puertas) y se va, y la venta.
    Los planos empiezan en los mismos instantes que en autobus.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    S = dict(saca=c["l2"] - 0.1, menu=c["abres"] - 0.15, flash1=c["cuantos"] - 0.1, flash2=c["tetraedro"] - 0.1, espera=c["l6"] - 0.1,
             reto=c["reto"] - 0.25, duelo=c["l7"] - 0.1, bus=c["llega"] - 0.1, sube=c["l9"] - 0.1, vacia=c["esperas"] - 0.1, fin=c["compartir"] - 0.3)
    order = sorted(S.items(), key=lambda kv: kv[1])
    E = {k: (order[i + 1][1] if i + 1 < len(order) else END) for i, (k, _) in enumerate(order)}
    bub, toque, motor = _onset(_load("burbuja")), _onset(_load("toque")), _load("motor")

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), t0, g)

    # gancho: el tiempo se escapa (reloj rápido) y los coches pasan zumbando por delante
    put("reloj_rapido", 0.0, -29, S["saca"], 0.02, 0.25)
    for i, tc in enumerate([0.35, 0.8, 1.25, 1.7, 2.3, 2.75, 3.3, 3.8]):
        if tc < S["saca"] - 0.2:
            put(_pitch(_load("coche_pasa"), 0.92 + 0.06 * (i % 3)), tc - 0.65, -27, 1.3, 0.01, 0.2)
    put("ciudad", 0.0, -33, END, 0.4, 0.5, track=amb)
    put("golpe", c["minutos"] - 0.06, -27, 0.6, 0.002, 0.3)
    # el móvil sube y baja
    for t0 in (S["menu"], S["reto"]):
        put("whoosh2", t0 - 0.05, -28, 0.6)
    for t0 in (c["l6"] - 0.35, c["llega"] - 0.35):
        put(_pitch(_onset(_load("whoosh")), 0.85), t0, -30, 0.5)
    put(toque, S["menu"] + 0.7 * (E["menu"] - S["menu"]), -25, 0.3)
    # flashcards: giran y salen las respuestas
    put("flip", c["ciento"] - 0.14, -24, 0.4)
    put("acierto", c["ciento"] + 0.2, -29, 0.6)
    put("flip", c["combustible"] - 0.14, -24, 0.4)
    for i, k in enumerate(("combustible", "comburente", "calor", "reaccion")):
        put(_pitch(toque, 1.0 + 0.1 * i), c[k] - 0.03, -28, 0.3)
    # «el autobús no llega»: reloj lento
    put("reloj", S["espera"], -31, E["espera"] - S["espera"], 0.05, 0.1)
    # reto diario: un tic por pregunta, monedas y fanfarria
    d = E["reto"] - S["reto"]
    for q in range(10):
        put(_pitch(_onset(_load("tic")), 1.0 + 0.04 * q), S["reto"] + 0.2 + d * 0.62 * (q + 1) / 10, -29, 0.2)
    put("monedas", S["reto"] + 0.3, -32, d * 0.55, 0.05, 0.2)
    put("logro", S["reto"] + 0.2 + d * 0.66, -24, 1.3)
    # 1 vs 1: la ruleta gira y frena; luego la cuenta atrás
    d = E["duelo"] - S["duelo"]
    put("ruleta", S["duelo"] + 0.05, -26, d * 0.55, 0.01, 0.08)
    put(_pitch(toque, 1.2), S["duelo"] + d * 0.55, -26, 0.3)
    for k in range(4):
        put(_pitch(_onset(_load("tic")), 0.8), S["duelo"] + d * 0.58 + k * d * 0.1, -27, 0.2)
    # llega el autobús: motor, frenos y puertas; sube; se cierran; se va
    stop = c["llega"] - 0.3 + 1.7
    put(_pitch(motor, 0.8), c["llega"] - 0.5, -26, stop - c["llega"] + 0.6, 0.3, 0.4)
    put("vapor", stop - 0.15, -27, 0.7, 0.01, 0.3)
    put("puertas", stop + 0.02, -25, 1.4)
    for k, w_ in enumerate((c["estudiado"] - 0.25, c["estudiado"] - 0.05, c["estudiado"] + 0.15)):
        put("acierto", w_ - 0.03, -28, 0.6)
    put("pasos", c["l9"] + 0.05, -29, 0.75, 0.01, 0.1)
    put(_pitch(_load("puertas"), 1.15), c["l9"] + 0.8, -27, 1.0)
    put(_pitch(motor, 1.0), c["l9"] + 1.4, -25, 2.2, 0.2, 0.8)
    put("golpe", c["l9"] + 0.55, -28, 0.6, 0.002, 0.3)
    # parada vacía: el panel vuelve a «14 MIN»
    put(_pitch(_onset(_load("nota")), 1.0), S["vacia"] + 0.1, -31, 0.8)
    put(toque, c["esperas"] - 0.03, -29, 0.3)
    put(_pitch(toque, 1.15), c["escribelo"] - 0.03, -29, 0.3)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    fuego = _load("fuego")
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_fomo(path):
    """«FOMO Bomberados»: cuarto en silencio (reloj, página), chispazos y encendido de la arena, ruleta, golpes de los modos,
    el mapa que se enciende (pops y barridos), convocatorias/callejero, Profe IA, menú y ranking (fanfarria), el FOMO (se
    apaga todo y suenan avisos de móviles), la ruleta que frena en «TU PLAZA» y la venta. Planos como en fomo.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    bub, toque = _onset(_load("burbuja")), _onset(_load("toque"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # el cuarto: silencio, reloj y una página; dos chispazos; la arena se enciende en «así»
    put("reloj", 0.0, -31, c["asi"] - 0.1, 0.05, 0.1)
    put("papeles", 0.1, -32, 0.7, 0.01, 0.2)
    for t0 in (0.55, 0.72):
        put("glitch", t0, -27, 0.12, 0.002, 0.02)
    put("encendido", c["asi"] - 0.55, -22, 1.6, 0.005, 0.3)
    put("destello", c["asi"] - 0.05, -27, 0.8)
    put("tension", c["asi"], -33, c["mientras"] - c["asi"], 0.3, 0.2, track=amb)
    # ruleta del temario
    put("ruleta", c["giras"], -27, 3.0, 0.01, 0.2)
    put(_pitch(toque, 1.2), c["temario"] - 0.03, -28, 0.3)
    # modos y mapa de España
    for i, k in enumerate(("solo", "uno1", "directo")):
        put(_pitch(_onset(_load("golpe")), 1.0 + 0.1 * i), c[k] - 0.02, -26, 0.45, 0.002, 0.2)
    for i in range(12):
        put(_pitch(bub, 0.9 + 0.05 * (i % 5)), c["directo"] - 0.3 + i * 0.08, -32, 0.2)
    put("whoosh", c["directo"] + 0.1, -30, 0.6)
    put("destello", c["espana"] - 0.05, -28, 0.7)
    # convocatorias, callejero, Profe IA
    put("whoosh2", c["preguntas"] - 0.15, -29, 0.6)
    put(toque, c["convocatorias"] - 0.03, -28, 0.3)
    put("acierto", c["callejero"] - 0.03, -27, 0.6)
    put(_pitch(_onset(_load("nota")), 1.0), c["profe"] - 0.03, -29, 0.8)
    put("papeles", c["manual"] - 0.1, -30, 0.7, 0.01, 0.2)
    # herramientas y ranking
    put(toque, c["flashcards"] - 0.03, -28, 0.3)
    put(_pitch(toque, 1.15), c["simulacros"] - 0.03, -28, 0.3)
    put("logro", c["ranking"] - 0.05, -25, 1.3)
    # FOMO: se apaga la arena, reloj lento y avisos de móviles que se encienden
    put(_pitch(_onset(_load("glitch")), 0.6), c["mientras"] - 0.12, -28, 0.12, 0.002, 0.02)
    put("reloj", c["mientras"], -29, c["nojuego"] - c["mientras"] - 0.1, 0.05, 0.2)
    for i in range(14):
        put(_pitch(bub, 1.1 + 0.07 * (i % 6)), c["otros2"] - 0.3 + i * 0.09, -30, 0.18)
    # lema: la ruleta frena y cae en «TU PLAZA»
    put("encendido", c["nojuego"] - 0.6, -26, 1.4, 0.005, 0.3)
    put("tension", c["nojuego"], -33, T["fin"] - c["nojuego"], 0.3, 0.3, track=amb)
    d = c["plaza"] + 0.1 - (c["nojuego"] - 0.1)
    put(_pitch(_load("ruleta"), 3.2 / max(1.0, d)), c["nojuego"] - 0.1, -27, d, 0.01, 0.05)
    put("golpe", c["plaza"] + 0.05, -24, 0.7, 0.002, 0.3)
    put("logro", c["plaza"] + 0.08, -25, 1.3)
    put(toque, c["retarias"] - 0.03, -29, 0.3)
    put(_pitch(toque, 1.15), c["escribelo"] - 0.03, -29, 0.3)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    fuego = _load("fuego")
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_mangueras(path):
    """«¿Qué manguera pierde más presión?» (versión 2): gancho de alarma (fuego que ruge, el chorro que silba y se ahoga,
    latido y alarma), el dron que vuela (barridos), motor de la bomba y rotativos, los manómetros «?», las tres líneas y las
    tarjetas, la cuenta 1 → 5 con bocina, «¡Tiempo!» con la D tachada, los «rayos X» (el agua corriendo, el roce que
    chisporrotea más en la de 25, el «×7,8»), las letras finales y la venta. Cámara como en mangueras.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    T["count0"] = LINES[3]["end"] + 0.05; T["count1"] = T["count0"] + 4.0
    fuego, bub, nota, toque = _load("fuego"), _onset(_load("burbuja")), _onset(_load("nota")), _onset(_load("toque"))
    burn = fuego[int(1.2 * sfx.SR):int(2.6 * sfx.SR)]
    motor, agua = _load("motor"), _load("agua")

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # gancho: el fuego ruge cerca, el chorro silba fuerte y se ahoga; latido y golpe en «SIN FUERZA»
    put(burn, 0.0, -22, c["tres"] + 0.4, 0.01, 0.5, track=amb)
    put(agua, 0.0, -21, c["fuerza"] + 0.1, 0.01, 0.25)
    put(_pitch(agua, 0.7), c["fuerza"] - 0.1, -27, 1.0, 0.1, 0.5)
    put(_pitch(_onset(_load("caida")), 0.8), c["avanza"], -26, 1.2, 0.02, 0.3)
    put("latido", 0.05, -24, 0.7)
    put("latido", c["fuerza"] - 0.1, -24, 0.7)
    put("golpe", c["fuerza"] - 0.05, -22, 0.8, 0.005, 0.35)
    put("fallo", c["fuerza"] + 0.05, -27, 0.5)
    # el dron sube a la plaza: motor de la bomba, rotativos y el fuego de fondo hasta el final
    put("whoosh2", c["tres"] - 0.4, -24, 1.0)
    put(motor, c["tres"] - 0.3, -27, END - c["tres"], 0.3, 0.8, track=amb)
    put("rotativo", c["tres"] - 0.3, -33, c["perdida"] - c["tres"] + 0.3, 0.3, 0.4, track=amb)
    put(burn, c["tres"] + 0.3, -32, END - c["tres"], 0.4, 0.6, track=amb)
    put("llave", c["bomba"] - 0.05, -28, 0.5, 0.001, 0.1)
    put(_pitch(agua, 1.0), c["agua"] - 0.2, -29, 1.4, 0.05, 0.5)
    put("whoosh", c["cual"] - 0.35, -28, 0.7)
    for i in range(3):
        put(_pitch(toque, 1.0 + 0.12 * i), c["cual"] + 0.08 + 0.09 * i, -28, 0.3)
    put(_pitch(nota, 1.3), c["presion"] - 0.03, -30, 0.9)
    # las tres líneas y sus tarjetas (una nota por opción)
    put("whoosh2", c["v25"] - 0.35, -29, 0.8)
    for k, key in enumerate(("v25", "v45", "v70", "igual")):
        put(_pitch(nota, 1.0 * 1.122 ** k), c[key] - 0.03, -29, 0.7)
        put(_pitch(bub, 1.0 + 0.1 * k), c[key] - 0.1, -27, 0.2)
    # cuenta 1 → 5 con bocina; «¡Tiempo!»: la D roja y tachada
    put(toque, c["comenta"] - 0.05, -28, 0.35)
    put("tension", T["count0"] - 0.2, -27, c["tiempo"] - T["count0"] + 0.4, 0.3, 0.15)
    for k in range(4):
        put("tic", T["count0"] + k, -22 + 1.5 * k, 0.3)
    put("bocina", T["count1"] - 0.02, -19, 0.9, 0.003, 0.12)
    put("golpe", T["count1"] - 0.02, -24, 0.7, 0.005, 0.3)
    put("fallo", c["tiempo"] + 0.12, -26, 0.5)
    put("whoosh2", c["tiempo"] + 0.2, -29, 0.8)
    put(toque, c["trampa"] - 0.05, -28, 0.35)
    # los «rayos X» (explicación de Adrián): aparecen, el agua corre y roza (consigo misma y con las paredes); cada factor que
    # la aumenta, un toque; el doble de velocidad (el agua sube de tono), «1/D⁵» y «no depende de la presión»
    put("destello", c["perdida"] - 0.15, -26, 0.7)
    put(_pitch(bub, 0.6), c["perdida"], -26, 0.5)
    put(agua, c["perdida"], -30, c["doble"] - c["perdida"], 0.3, 0.3, track=amb)
    put(_pitch(agua, 1.5), c["doble"] - 0.1, -30, c["escribe"] - c["doble"], 0.4, 0.4, track=amb)
    put("vapor", c["roza"] - 0.1, -32, c["aumenta"] - c["roza"] + 0.3, 0.3, 0.4, track=amb)
    put("golpe", c["perdida"] - 0.06, -24, 0.8, 0.005, 0.35)
    put("whoosh", c["aumenta"] - 0.3, -28, 0.6)
    for k, key in enumerate(("longitud", "caudal", "diametro", "codos", "valvulas", "rugosidad", "viscosidad")):
        put(_pitch(toque, 1.0 + 0.07 * k), c[key] - 0.03, -28, 0.35)
    put(_pitch(_onset(_load("whoosh2")), 0.8), c["longitud"] - 0.05, -30, 0.9)
    put("golpe", c["cuatro"] - 0.05, -23, 0.8, 0.005, 0.35)
    put("destello", c["cuatro"] - 0.08, -27, 0.6)
    put("golpe", c["quinta"] - 0.05, -22, 0.9, 0.005, 0.4)
    put("destello", c["quinta"] - 0.08, -26, 0.7)
    put("fallo", c["depende"] - 0.05, -27, 0.5)
    put("golpe", c["depende"] + 0.05, -25, 0.7, 0.005, 0.3)
    # «Escribe en comentarios…»: el dron sube y vuelven las letras
    put("whoosh2", c["escribe"] - 0.3, -27, 0.8)
    for i in range(4):
        put(_pitch(bub, 1 + 0.06 * i), c["escribe"] - 0.2 + 0.07 * i, -27, 0.25)
    put(_pitch(nota, 1.5), c["correcta"] - 0.03, -29, 0.9)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_quiz(path):
    """«¿Cuántas aciertas?» (6 preguntas, 3 s): la alarma del parque (timbre, sirena, luces) y las puertas que suben; el dron
    que vuela de un objeto a otro (barridos); en cada pregunta, un golpe y la cuenta 3-2-1 con tic-tac y tensión; en cada
    respuesta, el acierto y el sonido de su objeto (libro, neón, fuego, agua, equipo, sello); las notas finales y la venta."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    qi, ai = [1, 3, 5, 7, 9, 11], [2, 4, 6, 8, 10, 12]
    Tq = [LINES[i]["start"] for i in qi]; Tc = [LINES[i]["end"] + 0.05 for i in qi]; Ta = [LINES[i]["start"] for i in ai]
    tclose = LINES[13]["start"]
    bub, nota, toque = _onset(_load("burbuja")), _onset(_load("nota")), _onset(_load("toque"))
    fuego = _load("fuego")

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # la alarma: timbre y sirena del parque, motor y rotativos; las puertas suben
    alarma = _load("alarma")
    put(alarma, 0.0, -20, 0.9, 0.005, 0.15)
    put(alarma[int(0.9 * sfx.SR):], 0.9, -22, LINES[0]["end"] - 0.3, 0.05, 0.5, track=amb)
    put("sirena", 0.3, -27, LINES[0]["end"] + 0.4, 0.2, 0.6, track=amb)
    put("latido", 0.05, -24, 0.7)
    put("destello", 0.02, -26, 0.7)
    for k in range(3):
        put(_pitch(_onset(_load("caida")), 0.7)[::-1].copy(), 0.35 + 0.12 * k, -31, 1.2, 0.05, 0.3)
    put("motor", 0.5, -33, END - 0.5, 0.6, 0.8, track=amb)
    put("rotativo", 0.5, -36, END - 0.5, 0.6, 0.8, track=amb)
    sounds = [("golpe", -24), ("rele", -26), (fuego[int(0.3 * sfx.SR):], -26), ("burbuja", -24), ("llave", -25), ("golpe", -19)]
    for i in range(6):
        # vuela al siguiente objeto; golpe de pregunta; cuenta 3-2-1 con tensión
        put("whoosh2", Tq[i] - 0.35, -27, 0.8)
        put(_pitch(toque, 1.0 + 0.06 * i), Tq[i] - 0.02, -27, 0.35)
        put("tension", Tc[i] - 0.1, -29, 3.2, 0.2, 0.1)
        for k in range(3):
            put("tic", Tc[i] + k, -21 + 1.5 * k, 0.3)
        # respuesta: acierto + destello + su objeto
        put("acierto", Ta[i] - 0.03, -22, 0.9, 0.003, 0.3)
        put("destello", Ta[i] - 0.05, -26, 0.6)
        x, db = sounds[i]
        put(x, Ta[i] + 0.05, db, 0.9, 0.005, 0.3)
    put("fallo", Tq[5] - 0.1, -30, 0.5)                    # «La difícil»
    # notas finales y «comenta tu número»
    put("whoosh2", tclose - 0.3, -27, 0.8)
    for k in range(3):
        put(_pitch(nota, 1.0 * 1.122 ** k), tclose + 0.3 + 0.25 * k, -28, 0.7)
    put(toque, c["comenta"] - 0.05, -27, 0.35)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_seguridad(path):
    """«¿Qué te salva antes del golpe?» (seguridad activa y pasiva): lluvia y motor a 90 km/h, ¡FRENA! (frenazo que se
    estira en la cámara lenta, latido y tensión), las tarjetas y la cuenta 1 → 5 con bocina, «¡Tiempo!» con la B tachada;
    la ACTIVA pieza a pieza (ABS que traquetea, ESP, agua de las ruedas, dirección, suspensión, largas) y el coche que se para
    a 1 m; la PASIVA en «rayos X» (rebobinado, cinturón, airbags, reposacabezas, el golpe que arruga el morro, la jaula);
    la autobomba que llega con la sirena, la radio y la cizalla, el aviso del airbag sin saltar, las letras y la venta.
    Tiempos como en seguridad.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    T["count0"] = LINES[3]["end"] + 0.05; T["count1"] = T["count0"] + 4.0
    T["stop"] = c["luces"] + 0.2
    T["tb"] = min(c["frena"] + 0.22, c["coche"] - 0.15)
    T["truck0"] = c["pasiva"] + 0.6; T["truck1"] = c["habitaculo"] + 0.4
    nota, toque, bub = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja"))
    lluvia, motor, fren = _load("lluvia_fuera"), _load("motor"), _onset(_load("frenazo"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # lluvia todo el vídeo (más fuerte en el gancho); motor a 90 km/h hasta que frena, y grave en la cámara lenta
    put(_loop(lluvia, END + 0.5), 0.0, -27, END + 0.5, 0.01, 0.6, track=amb)
    put(_loop(lluvia, 4.0), 0.0, -29, c["como"], 0.01, 0.8)
    put(_loop(motor, 4.0), 0.0, -28, T["tb"] + 0.4, 0.01, 0.3)
    put(_loop(_pitch(motor, 0.55), T["stop"] - T["tb"] + 1.0), T["tb"] + 0.2, -31, T["stop"] - T["tb"], 0.4, 0.5, track=amb)
    # ¡FRENA!: frenazo (y luego estirado y grave: cámara lenta), latido y tensión
    put(fren, T["tb"] - 0.06, -22, 1.3, 0.003, 0.4)
    put("golpe", T["tb"] - 0.04, -26, 0.7, 0.003, 0.3)
    slow = _pitch(fren, 0.5)
    put(slow, c["coche"] + 0.4, -27, min(3.0, c["como"] - c["coche"]), 0.2, 0.8)
    t = c["coche"] + 0.3
    while t < c["optA"]:
        put("latido", t, -24, 0.7); t += 0.95
    put("tension", c["coche"], -30, c["tiempo"] - c["coche"] + 0.3, 0.6, 0.2, track=amb)
    put("whoosh", c["como"] - 0.3, -28, 0.7)
    put(_pitch(nota, 1.3), c["impacto"] - 0.03, -30, 0.9)
    # opciones (una nota por tarjeta), cuenta 1 → 5 con bocina, «¡Tiempo!» con la B tachada
    for k, key in enumerate(("optA", "optB", "optC")):
        put(_pitch(nota, 1.0 * 1.122 ** k), c[key] - 0.03, -29, 0.7)
        put(_pitch(bub, 1.0 + 0.1 * k), c[key] - 0.1, -27, 0.2)
    put(toque, c["comenta"] - 0.05, -28, 0.35)
    for k in range(4):
        put("tic", T["count0"] + k, -22 + 1.5 * k, 0.3)
    put("bocina", T["count1"] - 0.02, -19, 0.9, 0.003, 0.12)
    put("golpe", T["count1"] - 0.02, -24, 0.7, 0.005, 0.3)
    put("fallo", c["tiempo"] + 0.12, -26, 0.5)
    put("whoosh2", c["tiempo"] + 0.2, -29, 0.8)
    put(toque, c["trampa"] - 0.05, -28, 0.35)
    # ACTIVA: cada pieza al nombrarla; el coche se para a 1 m en «luces»
    put("destello", c["activa"] - 0.12, -27, 0.6)
    put("whoosh", c["frenos"] - 0.3, -29, 0.6)
    rele = _onset(_load("rele"))
    for k in range(7):
        put(rele, c["abs"] - 0.02 + k * 0.11, -27 - (k % 2) * 2, 0.1, 0.002, 0.03)
    put("whoosh2", c["control"] - 0.2, -29, 0.8)
    put(_pitch(_load("agua"), 1.2), c["neumaticos"] - 0.1, -28, 0.9, 0.05, 0.3)
    put("llave", c["direccion"] - 0.03, -28, 0.4)
    put(_pitch(_onset(_load("golpe")), 0.7), c["suspension"] - 0.03, -28, 0.6, 0.003, 0.3)
    for k, key in enumerate(("frenos", "control", "neumaticos", "direccion", "suspension", "luces")):
        put(_pitch(toque, 1.0 + 0.07 * k), c[key] + 0.02, -30, 0.3)
    put("destello", c["luces"] - 0.06, -25, 0.6)
    put(_pitch(_onset(_load("golpe")), 0.6), T["stop"] - 0.02, -24, 0.8, 0.003, 0.4)
    put("acierto", T["stop"] + 0.02, -27, 0.8)
    # PASIVA en «rayos X»: rebobinado y el golpe pieza a pieza
    rew = _onset(_load("whoosh2"))[::-1].copy()
    put(rew, c["pasiva"] - 0.45, -27, 0.6, 0.05, 0.05)
    put("glitch", c["pasiva"] - 0.05, -31, 0.3)
    put("llave", c["cinturon"] - 0.03, -24, 0.4)
    put(_pitch(_onset(_load("golpe")), 1.5), c["airbags"] - 0.04, -21, 0.4, 0.002, 0.2)
    put("aire", c["airbags"] - 0.02, -25, 0.6, 0.005, 0.3)
    put(_pitch(toque, 0.9), c["reposa"] - 0.02, -28, 0.35)
    put("golpe", c["deforma"] - 0.02, -18, 1.0, 0.002, 0.45)
    put("cristales", c["deforma"] + 0.02, -24, 1.0)
    put("destello", c["habitaculo"] - 0.08, -26, 0.7)
    put(_pitch(nota, 1.5), c["habitaculo"] + 0.05, -30, 0.8)
    # la autobomba llega con la sirena (y se apaga al aparcar); resumen
    sir = _load("sirena")
    put(_loop(sir, T["truck1"] - T["truck0"] + 1.0), T["truck0"] - 0.3, -29, T["truck1"] - T["truck0"] + 0.8, 0.8, 0.6, track=amb)
    put(_loop(_pitch(motor, 0.8), T["truck1"] - T["truck0"] + 1.5), T["truck0"], -31, T["truck1"] - T["truck0"] + 1.0, 0.8, 0.8, track=amb)
    put(toque, c["activa2"] - 0.03, -27, 0.35)
    put(_pitch(toque, 1.2), c["pasiva2"] - 0.03, -27, 0.35)
    # ojo, bombero: radio, la cizalla y el aviso del airbag sin saltar
    put("radio", c["activa2"] + 0.3, -33, 1.5, 0.05, 0.3, track=amb)
    put(_loop(_pitch(motor, 1.7), 3.0), c["ojo"] - 0.3, -32, c["saltar2"] - c["ojo"] + 0.3, 0.2, 0.2)
    for k in range(3):
        put(_pitch(nota, 2.0), c["airbag"] + k * 0.22, -27, 0.18)
    put("alarma", c["saltar2"] - 0.05, -28, 0.9, 0.005, 0.3)
    put("golpe", c["saltar2"] - 0.03, -24, 0.6, 0.003, 0.3)
    # «Escribe en comentarios…»: el dron sube y vuelven las letras
    put("whoosh2", c["escribe"] - 0.3, -27, 0.8)
    for i in range(3):
        put(_pitch(bub, 1 + 0.06 * i), c["escribe"] - 0.2 + 0.07 * i, -27, 0.25)
    put(_pitch(nota, 1.5), c["correcta"] - 0.03, -29, 0.9)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    fuego = _load("fuego")
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_escala(path):
    """«¿A qué escala está el plano?»: ciudad de noche, el fuego y la tensión del gancho (alguien atrapado arriba), el plano que
    se despliega y la cota que sube, las 4 tarjetas, la cuenta 1 → 5 con bocina, «¡Tiempo!» con la A tachada y el edificio que
    encoge (y vuelve), cada planta que se enciende con su nota mientras la autoescala sube (hidráulica) y llega, el último paso
    («¿? cm»), las letras y la venta. Tiempos como en escala.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    T["count0"] = LINES[3]["end"] + 0.05; T["count1"] = T["count0"] + 4.0
    T["shrink0"] = c["treinta5"] - 0.05; T["shrink1"] = c["mira"] - 0.35
    fl = [c["uno7"], c["dos7"], c["tres7"]]
    a, b = c["tres7"] + 0.35, max(c["tres7"] + 1.15, c["pisos7"] + 0.1)
    fl += [a + k * (b - a) / 4 for k in range(4)]
    nota, toque, bub = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja"))
    fuego, motor = _load("fuego"), _load("motor")

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # ciudad de noche todo el vídeo; el fuego crepita hasta que se aclara el humo
    put(_loop(_load("ciudad"), END + 0.5), 0.0, -31, END + 0.5, 0.01, 0.6, track=amb)
    put(_loop(fuego, c["mira"] + 1.0), 0.0, -27, c["mira"], 0.01, 1.2, track=amb)
    put("rotativo", 0.0, -33, c["escala"], 0.3, 0.8, track=amb)
    # gancho: golpe, latido y tensión
    put("golpe", c["hay"] - 0.02, -24, 0.8, 0.003, 0.35)
    put("latido", 0.05, -24, 0.7)
    put("latido", c["humo"] - 0.05, -24, 0.7)
    put("tension", c["hay"] + 0.3, -31, c["tiempo"] - c["hay"], 0.6, 0.2, track=amb)
    # el plano y la cota de 21 m
    put("papeles", c["plano"] - 0.12, -23, 0.8)
    put(_pitch(toque, 1.2), c["siete"] - 0.02, -27, 0.3)
    put("whoosh", c["veintiun"] - 0.25, -28, 0.7)
    put(_pitch(nota, 1.3), c["metros"] - 0.03, -30, 0.9)
    # las cuatro tarjetas, la cuenta con bocina y «¡Tiempo!»
    put("whoosh2", c["escala"] - 0.3, -29, 0.8)
    for k, key in enumerate(("o30", "o300", "o3000", "o150")):
        put(_pitch(nota, 1.0 * 1.122 ** k), c[key] - 0.03, -29, 0.7)
        put(_pitch(bub, 1.0 + 0.1 * k), c[key] - 0.1, -27, 0.2)
    put(toque, c["comenta"] - 0.05, -28, 0.35)
    for k in range(4):
        put("tic", T["count0"] + k, -22 + 1.5 * k, 0.3)
    put("bocina", T["count1"] - 0.02, -19, 0.9, 0.003, 0.12)
    put("golpe", T["count1"] - 0.02, -24, 0.7, 0.005, 0.3)
    put("fallo", c["tiempo"] + 0.12, -26, 0.5)
    # con 1:30, el edificio encoge hasta una caseta (y vuelve)
    put(_pitch(_onset(_load("whoosh2")), 1.6), T["shrink0"], -25, 0.6)
    put(_pitch(_onset(_load("caida")), 1.3), T["shrink0"] + 0.05, -27, 0.6)
    put(_pitch(bub, 0.7), T["shrink0"] + 0.45, -24, 0.25)
    put(_pitch(_onset(_load("whoosh2")), 0.8), T["shrink1"], -27, 0.7)
    # la explicación: cada planta con su nota (sube) y la autoescala hidráulica hasta la ventana
    put("papeles", c["mira"] - 0.1, -25, 0.7)
    put(toque, c["centimetro"] - 0.02, -27, 0.35)
    put(_loop(_pitch(motor, 1.5), 8.0), c["uno7"] - 0.25, -29, c["llega"] - c["uno7"] + 0.2, 0.3, 0.3)
    for k, t0 in enumerate(fl):
        put(_pitch(nota, 1.0 * 1.06 ** k), t0 - 0.02, -27, 0.5)
    put("destello", c["veintiun7"] - 0.06, -25, 0.6)
    put("golpe", c["veintiun7"] - 0.02, -25, 0.6, 0.003, 0.3)
    put("acierto", c["llega"] - 0.02, -24, 0.9)
    put("llave", c["llega"] + 0.1, -27, 0.4)
    # el último paso, para el que lo ve
    put(_pitch(nota, 1.5), c["centimetros8"] - 0.03, -29, 0.8)
    put("destello", c["escala8"] - 0.08, -26, 0.6)
    # final: vuelven las letras y «¿te has comido algún cero?»
    put("whoosh2", c["escribe"] - 0.3, -27, 0.8)
    for i in range(4):
        put(_pitch(bub, 1 + 0.06 * i), c["escribe"] - 0.2 + 0.07 * i, -27, 0.25)
    put(_pitch(toque, 1.3), c["cero"] - 0.03, -27, 0.35)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_reto(path):
    """«Reta a otro opositor» (1 vs 1 con un coche en llamas): el fuego y los rotativos de fondo, la ruleta que cae en VEHÍCULOS,
    el rival que ya ha contestado, los tres caminos y las tarjetas, la cuenta 1 → 5 con bocina, el rival (holograma) que va de
    frente, ¡pum! y el amortiguador a cámara lenta (grave y estirado), el +1, las zonas de disparo, tus pasos por la diagonal,
    el agua de la lanza y el vapor, Madrid y los cuatro rivales, las letras y la venta (con la ruleta de la grabación real).
    Tiempos como en reto.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    T["count0"] = LINES[2]["end"] + 0.05; T["count1"] = T["count0"] + 4.0
    T["l0"] = c["disparado"] + 0.02
    T["walk0"] = c["rival4"] - 0.1; T["walk1"] = T["l0"] - 0.1
    T["go0"] = c["esquina"] - 1.3; T["go1"] = c["grados"] - 0.15
    nota, toque, bub = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja"))
    fuego, glitch = _load("fuego"), _onset(_load("glitch"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # fondo: el fuego todo el vídeo (baja con el agua), la autovía y los rotativos
    put(_loop(fuego, END + 0.5), 0.0, -25, c["madrid"] + 1.0, 0.01, 1.5, track=amb)
    put(_loop(fuego, END + 0.5), c["madrid"], -31, END - c["madrid"], 1.0, 0.6, track=amb)
    put(_loop(_load("ciudad"), END + 0.5), 0.0, -34, END + 0.5, 0.01, 0.6, track=amb)
    put("rotativo", 0.0, -33, T["count1"], 0.3, 0.8, track=amb)
    # gancho: golpe, latido, la ruleta que cae en VEHÍCULOS y el rival que ya ha contestado
    put("golpe", c["coche"] - 0.02, -23, 0.8, 0.003, 0.35)
    put("latido", 0.05, -24, 0.7)
    put("ruleta", 0.0, -27, 1.1, 0.01, 0.15)
    put(_pitch(nota, 1.25), 1.03, -27, 0.6)
    put(_pitch(toque, 1.4), c["contestado"] - 0.05, -25, 0.35)
    put("tension", c["rival1"], -31, c["tiempo"] - c["rival1"], 0.6, 0.2, track=amb)
    # los tres caminos y las tarjetas, la cuenta con bocina y «¡Tiempo!»
    put("whoosh2", c["oA"] - 0.3, -29, 0.8)
    for k, key in enumerate(("oA", "oB", "oC")):
        put(_pitch(nota, 1.0 * 1.122 ** k), c[key] - 0.03, -29, 0.7)
        put(_pitch(bub, 1.0 + 0.1 * k), c[key] - 0.1, -27, 0.2)
    put(toque, c["comenta"] - 0.05, -28, 0.35)
    for k in range(4):
        put("tic", T["count0"] + k, -22 + 1.5 * k, 0.3)
    put("bocina", T["count1"] - 0.02, -19, 0.9, 0.003, 0.12)
    put("golpe", T["count1"] - 0.02, -24, 0.7, 0.005, 0.3)
    # el rival: aparece (holograma), va de frente (pasos), los amortiguadores al rojo y… ¡pum! a cámara lenta
    put(glitch, c["tiempo"] + 0.1, -27, 0.6)
    put(_loop(_load("pasos"), 6.0), T["walk0"], -31, T["walk1"] - T["walk0"], 0.2, 0.2)
    put("rele", c["amortiguador"] - 0.1, -27, 0.3)
    put("latido", c["amortiguador"] + 0.2, -23, 0.7)
    put("latido", c["parachoques"] + 0.2, -22, 0.7)
    put("golpe", T["l0"] - 0.01, -16, 0.9, 0.002, 0.4)
    put(_pitch(_onset(_load("trueno")), 0.7), T["l0"] - 0.01, -20, 1.6, 0.003, 0.8)
    put(_pitch(_onset(_load("whoosh")), 0.55), T["l0"] + 0.05, -23, 1.5, 0.05, 0.4)
    put(_pitch(_onset(_load("latido")), 0.75), T["l0"] + 0.5, -24, 0.9)
    put("whoosh2", T["l0"] + 1.5, -24, 0.6)
    put("fallo", T["l0"] + 0.7, -26, 0.5)
    put(glitch, T["l0"] + 0.75, -28, 0.5)
    # el +1 y la explicación: las zonas de disparo, tus pasos por la diagonal, los 45° y el agua
    put("acierto", c["punto"] - 0.02, -22, 0.9)
    put("logro", c["punto"] + 0.05, -27, 0.8)
    put("whoosh", c["punto"] - 0.4, -29, 0.7)
    put("rele", c["delante"] - 0.05, -27, 0.3)
    put(_pitch(nota, 0.9), c["delante"] - 0.03, -28, 0.6)
    put("rele", c["detras5"] - 0.05, -27, 0.3)
    put(_pitch(nota, 0.85), c["detras5"] - 0.03, -28, 0.6)
    put(_pitch(_onset(_load("whoosh2")), 1.5), c["piezas"] - 0.1, -28, 0.4)
    put(_pitch(_onset(_load("whoosh2")), 1.7), c["piezas"] + 0.2, -29, 0.4)
    put(_loop(_load("pasos"), 6.0), T["go0"], -29, T["go1"] - T["go0"], 0.2, 0.2)
    put("destello", c["cuarenta"] - 0.06, -26, 0.6)
    put(_pitch(nota, 1.5), c["cuarenta"] - 0.03, -28, 0.8)
    put(_loop(_load("agua"), 25.0), c["grados"] + 0.1, -26, c["compartir"] - c["grados"], 0.05, 0.8, track=amb)
    put("vapor", c["grados"] + 0.6, -28, 3.0, 0.3, 1.0)
    # Madrid: casi cinco por plaza; los cuatro rivales
    put("papeles", c["madrid"] - 0.1, -26, 0.6)
    put(_pitch(nota, 1.2), c["cinco6"] - 0.03, -27, 0.7)
    put("destello", c["cinco6"] - 0.06, -27, 0.5)
    put(glitch, c["unrival"] - 0.3, -27, 0.6)
    for i in range(3):
        put(glitch, c["cuatro"] - 0.25 + 0.12 * i, -27, 0.5)
    put("golpe", c["cuatro"] - 0.02, -25, 0.6, 0.003, 0.3)
    # final: vuelven las letras y «confiésalo»
    put("whoosh2", c["habrias"] - 0.3, -27, 0.8)
    for i in range(3):
        put(_pitch(bub, 1 + 0.06 * i), c["habrias"] - 0.2 + 0.07 * i, -27, 0.25)
    put(_pitch(toque, 1.3), c["confiesalo"] - 0.03, -27, 0.35)
    # venta: el avión, la grabación real (la ruleta gira) y la marca
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    sp0 = c["compartir"] + 0.3 + (5.0 - 2.1) / (7.4 - 2.1) * (c["descripcion"] - c["compartir"] - 0.2)
    put("ruleta", sp0, -29, 1.4, 0.02, 0.3)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_alfabeto(path):
    """«¿Por qué los bomberos dicen "Bravo" y "Delta"?»: la calle de noche con el fuego, la radio (clic al pulsar, ruido y
    fallos cuando «be» y «de» se confunden), las sirenas y la bomba, el equipo que entra, el reloj en la puerta equivocada y el
    acierto en la buena, una nota por cada letra del alfabeto, el reto de la Q con la cuenta y la bocina, Quebec y las banderas,
    «ANA» letra a letra y la venta. Tiempos como en alfabeto.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    T["count0"] = LINES[7]["end"] + 0.05; T["count1"] = T["count0"] + 4.0
    T["in0"] = c["postureo"] - 0.2; T["in1"] = c["tercero"] + 0.3
    T["d0"] = c["puerta"] - 0.1; T["d1"] = c["poreso"] + 0.2; T["b0"] = c["bravo5"] + 0.3
    let0 = c["cada"] + 0.1; let1 = max(c["zulu6"] + 0.25, let0 + 2.4)
    nota, toque, bub = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja"))
    fuego, glitch, rele = _load("fuego"), _onset(_load("glitch")), _onset(_load("rele"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # fondo: la calle, el fuego y, a lo lejos, una sirena
    put(_loop(_load("ciudad"), END + 0.5), 0.0, -32, END + 0.5, 0.01, 0.6, track=amb)
    put(_loop(fuego, END + 0.5), 0.0, -26, T["fin"], 0.01, 1.2, track=amb)
    put("rotativo", 0.0, -34, T["count1"], 0.3, 0.8, track=amb)
    # gancho: golpe y latido (alguien atrapado junto al fuego)
    put("golpe", 0.0, -24, 0.8, 0.003, 0.35)
    put("latido", 0.1, -24, 0.7)
    # la radio: clic al pulsar y la voz que llega; con sirenas y la bomba, ruido y fallos en «be» / «de»
    for t0 in (c["bravo1"] - 0.35, c["sirenas"] - 0.3, c["bravo5"] - 0.3):
        put(rele, t0, -24, 0.2)
    put("radio", c["bravo1"] - 0.3, -30, c["radio"] - c["bravo1"] + 0.5, 0.05, 0.2)
    put("sirena", c["sirenas"] - 0.2, -25, 3.2, 0.3, 0.8)
    put(_loop(_load("motor"), 8.0), c["motor"] - 0.2, -27, 2.8, 0.2, 0.6)
    put("radio", c["sirenas"] - 0.2, -25, c["igual"] - c["sirenas"] + 0.6, 0.05, 0.3)
    put(glitch, c["be3"] - 0.03, -24, 0.4)
    put(glitch, c["de3"] - 0.03, -24, 0.4)
    # el equipo entra, va a la puerta equivocada (el reloj corre) y, con «Bravo», a la buena
    put(_loop(_load("pasos"), 6.0), T["in0"], -31, T["in1"] - T["in0"], 0.2, 0.2)
    put("fallo", c["equivocada"] - 0.02, -24, 0.5)
    put("reloj_rapido", T["d0"] + 0.6, -29, T["d1"] - T["d0"] - 0.4, 0.1, 0.2)
    put("radio", c["bravo5"] - 0.25, -31, c["imposibles"] - c["bravo5"] + 0.3, 0.05, 0.2)
    put(_pitch(toque, 1.2), c["bravo5"] - 0.03, -27, 0.3)
    put(_pitch(toque, 1.35), c["delta5"] - 0.03, -27, 0.3)
    put("acierto", c["imposibles"] - 0.02, -23, 0.9)
    put("llave", c["imposibles"] + 0.15, -28, 0.4)
    # el alfabeto: una nota que sube por cada letra (y la ventana que se enciende); «guárdalo»
    put("whoosh2", c["cada"] - 0.3, -28, 0.7)
    for n in range(26):
        put(_pitch(nota, 0.8 * 1.035 ** n), let0 + n * (let1 - let0) / 25 - 0.02, -32, 0.25)
    put("destello", c["pilotos"] - 0.06, -25, 0.6)
    # el reto de la Q: tarjetas, cuenta con bocina y «¡Tiempo!»
    put("whoosh2", c["oA"] - 0.3, -29, 0.8)
    for k, key in enumerate(("oA", "oB", "oC")):
        put(_pitch(nota, 1.0 * 1.122 ** k), c[key] - 0.03, -29, 0.7)
        put(_pitch(bub, 1.0 + 0.1 * k), c[key] - 0.1, -27, 0.2)
    for k in range(4):
        put("tic", T["count0"] + k, -22 + 1.5 * k, 0.3)
    put("bocina", T["count1"] - 0.02, -19, 0.9, 0.003, 0.12)
    put("golpe", T["count1"] - 0.02, -24, 0.7, 0.005, 0.3)
    put("fallo", c["tiempo"] + 0.12, -26, 0.5)
    put("acierto", c["quebec9"] - 0.02, -23, 0.9)
    for key in ("ingles", "frances", "espanol"):
        put(_pitch(toque, 1.2), c[key] - 0.03, -28, 0.3)
    # tu nombre: ANA = ALFA · NOVEMBER · ALFA
    for i in range(3):
        put(_pitch(nota, 1.2 + 0.12 * i), c["ahora"] + 0.4 + 0.35 * i, -29, 0.4)
    put(_pitch(toque, 1.3), c["nombre"] - 0.03, -27, 0.35)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_techo(path):
    """«¿Por qué el bombero echa el agua al techo?»: el fuego del salón, cada golpe corto de agua con su silbido de vapor,
    «¿error?» / «técnica», el humo que se calienta (tensión), la combustión súbita (estallido grave y el fuego que ruge) y el
    rebobinado, los golpes que enfrían, el reto con la cuenta y la bocina, 1 L → 1.700 L de vapor, el chorro con el vapor
    que baja, las letras y la venta. Tiempos como en techo.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    T["count0"] = LINES[5]["end"] + 0.05; T["count1"] = T["count0"] + 4.0
    T["ign0"] = c["golpe3"] - 0.15; T["room0"] = c["arde"] - 0.1; T["rew0"] = c["poreso"] - 0.45; T["rew1"] = c["poreso"] + 0.05
    pulses = [0.15, 0.95, 1.75, c["golpes4"], c["golpes4"] + 0.55, c["golpes4"] + 1.1]
    T["jet0"] = c["chorro"] - 0.05; T["jet1"] = c["quema"] + 0.6
    nota, toque, bub = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja"))
    fuego, agua, vapor = _load("fuego"), _onset(_load("agua")), _onset(_load("vapor"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    def bed(x, dur, seed, a=0.45, b=2.45, seg=(0.7, 1.3), xf=0.25):
        # ambiente sin repetición: trozos al azar del efecto con fundido de igual potencia y los chasquidos sueltos
        # rebajados (el fuego de 3 s repetido cada 2 s daba un «pop» a compás)
        rng = np.random.default_rng(seed)
        n, k = int(dur * sfx.SR), int(xf * sfx.SR)
        fi_, fo_ = np.sqrt(np.linspace(0, 1, k))[:, None], np.sqrt(np.linspace(1, 0, k))[:, None]
        y = np.zeros((0, 2))
        while len(y) < n:
            L = rng.uniform(*seg); s0 = rng.uniform(a, b - L)
            z = x[int(s0 * sfx.SR): int((s0 + L) * sfx.SR)] * 10 ** (rng.uniform(-2, 2) / 20)
            if len(y) >= k:
                z = z.copy(); z[:k] = y[-k:] * fo_ + z[:k] * fi_
                y = np.concatenate([y[:-k], z])
            else:
                y = z.copy()
        y = y[:n]
        w = 480; nf = len(y) // w
        e = np.sqrt((y[:nf * w].mean(1).reshape(nf, w) ** 2).mean(1)) + 1e-9
        gr = np.minimum(1, np.median(e) * 10 ** (7 / 20) / e)
        gr = np.min(np.stack([np.roll(gr, d) for d in range(-3, 4)]), 0)
        gr = np.convolve(gr, np.ones(5) / 5, "same")
        return y * np.interp(np.arange(len(y)), np.arange(nf) * w + w / 2, gr)[:, None]

    # el fuego del salón todo el vídeo (más fuerte en la combustión súbita) y una tensión de fondo
    put(bed(fuego, END + 0.5, 7), 0.0, -28, T["fin"], 0.01, 1.2, track=amb)
    put(bed(fuego, 6.0, 3), T["room0"] - 0.1, -22, T["rew0"] - T["room0"] + 0.2, 0.05, 0.15, track=amb)
    put("tension", c["arriba"] - 0.2, -30, T["ign0"] - c["arriba"] + 0.4, 0.5, 0.2, track=amb)
    # gancho: golpe y latido; cada golpe corto de agua con su silbido de vapor
    put("golpe", 0.0, -24, 0.8, 0.003, 0.35)
    put("latido", 0.1, -25, 0.7)
    for t0 in pulses:
        put(agua, t0, -28, 0.32, 0.01, 0.08)
        put(vapor, t0 + 0.12, -33, 0.7, 0.05, 0.4)
    # «¿error?» → «técnica»
    put(_pitch(toque, 0.8), c["equivocado"] - 0.03, -27, 0.3)
    put("acierto", c["tecnica"] - 0.02, -24, 0.8)
    # el humo se calienta… y prende: estallido grave, ruido del fuego y rebobinado
    put(_pitch(_onset(_load("whoosh")), 0.7), c["seiscientos"] - 0.2, -30, 0.8)
    put("golpe", T["ign0"], -21, 0.9, 0.002, 0.4)
    put(_pitch(_onset(_load("trueno")), 0.75), T["ign0"], -23, 1.6, 0.003, 0.8)
    put(_pitch(_onset(_load("whoosh2")), 0.7), T["room0"] - 0.05, -26, 0.9)
    wr = _onset(_load("whoosh2"))[::-1].copy()
    put(wr, T["rew0"], -25, 0.5, 0.05, 0.05)
    put("destello", T["rew1"] - 0.05, -25, 0.5)
    put(_pitch(nota, 1.3), c["enfrian"] - 0.03, -28, 0.7)
    # el reto: tarjetas, cuenta con bocina y «¡Tiempo!»
    put("whoosh2", c["oA"] - 0.3, -29, 0.8)
    for k, key in enumerate(("oA", "oB", "oC")):
        put(_pitch(nota, 1.0 * 1.122 ** k), c[key] - 0.03, -29, 0.7)
        put(_pitch(bub, 1.0 + 0.1 * k), c[key] - 0.1, -27, 0.2)
    for k in range(4):
        put("tic", T["count0"] + k, -22 + 1.5 * k, 0.3)
    put("bocina", T["count1"] - 0.02, -21, 0.9, 0.003, 0.12)
    put("golpe", T["count1"] - 0.02, -24, 0.7, 0.005, 0.3)
    put("fallo", c["tiempo"] + 0.12, -26, 0.5)
    put("acierto", c["cocerse7"] - 0.02, -23, 0.9)
    # 1 litro → 1.700 litros de vapor
    put(_pitch(bub, 0.8), c["litro"] - 0.05, -25, 0.3)
    put(vapor, c["mil"] - 0.05, -27, 1.4, 0.05, 0.6, track=amb)
    put("destello", c["mil"] + 0.35, -26, 0.6)
    # a chorro: el agua sin parar y el vapor que baja
    put(_loop(agua, 6.0), T["jet0"], -25, T["jet1"] - T["jet0"], 0.05, 0.3, track=amb)
    put(_loop(vapor, 6.0), T["jet0"] + 0.3, -26, c["habrias"] - T["jet0"], 0.4, 0.8, track=amb)
    put("latido", c["quema"] - 0.05, -25, 0.7)
    # final: vuelven las letras y «confiésalo»
    put("whoosh2", c["habrias"] - 0.3, -27, 0.8)
    for i in range(3):
        put(_pitch(bub, 1 + 0.06 * i), c["habrias"] - 0.2 + 0.07 * i, -27, 0.25)
    put(_pitch(toque, 1.3), c["confiesalo"] - 0.03, -27, 0.35)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_paneles(path):
    """«¿Qué lleva esta cisterna?» (panel naranja): la autovía de noche (sirena al llegar, motor de la autobomba, el relé de
    los intermitentes de la cisterna), el dron que vuela (barridos), el panel que rueda como una tragaperras y se para en
    cada número, la cuenta 3-2-1 de cada ronda con su acierto; gasolina (chispa y espuma), propano (fuego, tensión y latido,
    el cañón de agua y el vapor donde cae), ácido (burbujeo y el traje que te cubre), la trampa del 1202, las letras y la
    venta. Tiempos como en paneles.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    Tc = [LINES[i]["end"] + 0.05 for i in (1, 3, 5)]
    Tr = [c["gasolina"], c["propano"], c["acido"]]
    Tf = [c["n1"] - 0.2, c["n2"] - 0.2, c["n3"] - 0.2, c["n4"] - 0.15]
    nota, toque, bub = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja"))
    fuego, agua, vapor, ruleta, flip = _load("fuego"), _onset(_load("agua")), _onset(_load("vapor")), _onset(_load("ruleta")), _onset(_load("flip"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    def bed(x, dur, seed, a=0.45, b=2.45, seg=(0.7, 1.3), xf=0.25):      # ambiente sin repetición (como en el del techo)
        rng = np.random.default_rng(seed)
        n, k = int(dur * sfx.SR), int(xf * sfx.SR)
        fi_, fo_ = np.sqrt(np.linspace(0, 1, k))[:, None], np.sqrt(np.linspace(1, 0, k))[:, None]
        y = np.zeros((0, 2))
        while len(y) < n:
            L = rng.uniform(*seg); s0 = rng.uniform(a, b - L)
            z = x[int(s0 * sfx.SR): int((s0 + L) * sfx.SR)] * 10 ** (rng.uniform(-2, 2) / 20)
            if len(y) >= k:
                z = z.copy(); z[:k] = y[-k:] * fo_ + z[:k] * fi_
                y = np.concatenate([y[:-k], z])
            else:
                y = z.copy()
        y = y[:n]
        w = 480; nf = len(y) // w
        e = np.sqrt((y[:nf * w].mean(1).reshape(nf, w) ** 2).mean(1)) + 1e-9
        gr = np.minimum(1, np.median(e) * 10 ** (7 / 20) / e)
        gr = np.min(np.stack([np.roll(gr, d) for d in range(-3, 4)]), 0)
        gr = np.convolve(gr, np.ones(5) / 5, "same")
        return y * np.interp(np.arange(len(y)), np.arange(nf) * w + w / 2, gr)[:, None]

    # la autovía de noche: sirena al llegar, motor de la autobomba, el relé de los intermitentes (cada 0,4 s) y el goteo
    put("golpe", 0.0, -23, 0.8, 0.003, 0.35)
    put("latido", 0.08, -25, 0.7)
    put("sirena", 0.0, -27, 3.4, 0.05, 0.8, track=amb)
    put("ciudad", 0.0, -38, T["fin"], 0.6, 1.0, track=amb)
    put(_loop(_load("motor"), END + 0.5), 0.3, -37, T["fin"] - 0.3, 0.8, 1.0, track=amb)
    rl = _onset(_load("rele"))[: int(0.07 * sfx.SR)]
    tt = 0.0
    while tt < T["fin"]:
        put(rl, tt, -33, 0.07, 0.002, 0.03, track=amb, g=1.0 if int(tt / 0.4) % 2 == 0 else 0.7)
        tt += 0.4
    put(_loop(agua, 6.0), 0.2, -40, Tf[1] - 0.2, 0.5, 0.4, track=amb)                       # el goteo de la válvula
    put(_pitch(_onset(_load("golpe")), 0.6), 0.05, -27, 1.0, 0.003, 0.5)                   # chapa
    # el dron vuelve hacia ti (viento) y vuela hasta el panel
    put("whoosh", c["antes"] - 0.1, -26, 1.0)
    put("aire", c["lejos"] - 0.2, -31, 1.8, 0.3, 0.6, track=amb)
    put("whoosh2", c["panel"] - 0.3, -26, 0.9)
    # el panel: tragaperras hasta el primer número; en cada ronda rueda y se para
    put(_loop(ruleta, 4.0), c["abajo"] - 0.1, -27, Tf[0] - c["abajo"] + 0.45, 0.05, 0.08)
    for k in range(4):
        if k:
            put(ruleta, Tf[k] - 0.05, -29, 0.5, 0.01, 0.1)
        put(flip, Tf[k] + 0.32, -24, 0.4)
        put(_pitch(toque, 1.0 + 0.08 * k), Tf[k] + 0.34, -28, 0.35)
    # las tres rondas: cuenta 3-2-1 con tensión y el acierto
    for k in range(3):
        put("tension", Tc[k] - 0.1, -30, 3.2, 0.2, 0.1)
        for j in range(3):
            put("tic", Tc[k] + j, -21 + 1.5 * j, 0.3)
        put("acierto", Tr[k] - 0.03, -22, 0.9, 0.003, 0.3)
        put("destello", Tr[k] - 0.05, -26, 0.6)
        for i in range(3):
            put(_pitch(bub, 1.0 + 0.08 * i), c[["n1", "n2", "n3"][k]] + 0.1 + 0.12 * i, -28, 0.2)
    # gasolina: la chispa y la espuma que tapa el charco
    put("glitch", c["chispa"] - 0.02, -29, 0.35)
    put(_loop(agua, 6.0), c["gasolina"] + 0.25, -27, Tf[1] - 0.45 - c["gasolina"] - 0.25, 0.1, 0.3)
    put(_pitch(vapor, 0.7), c["tapa"] - 0.1, -31, Tf[1] - c["tapa"] - 0.2, 0.3, 0.4, track=amb)
    for i in range(5):
        put(_pitch(bub, 0.7 + 0.05 * i), c["tapa"] + 0.15 * i, -32, 0.2)
    # propano: el fuego, la tensión y el latido; el cañón de agua y el vapor donde cae
    put(_pitch(_onset(_load("whoosh2")), 0.7), c["propano"] - 0.2, -24, 0.9)
    put(bed(fuego, Tf[2] - c["propano"] + 0.5, 11), c["propano"] - 0.25, -22, Tf[2] - c["propano"], 0.2, 0.3, track=amb)
    put("tension", c["fuego"] - 0.1, -27, c["reventar"] - c["fuego"] + 0.4, 0.4, 0.2)
    put("latido", c["reventar"] - 0.05, -24, 0.7)
    put("latido", c["reventar"] + 0.55, -26, 0.7)
    put(_pitch(_onset(_load("golpe")), 0.55), c["reventar"] - 0.03, -25, 1.2, 0.003, 0.6)
    put(_loop(agua, 6.0), c["reventar"] + 0.1, -25, Tf[2] - 0.4 - c["reventar"] - 0.1, 0.2, 0.3, track=amb)
    put(vapor, c["enfria"] + 0.55, -27, Tf[2] - c["enfria"] - 0.6, 0.2, 0.5, track=amb)
    # ácido: burbujea y humea; el traje te cubre de abajo arriba
    rng = np.random.default_rng(5)
    tb = Tf[2] + 0.3
    while tb < c["trampa"] - 0.3:
        put(_pitch(bub, rng.uniform(0.55, 0.9)), tb, -33 + rng.uniform(-2, 2), 0.2)
        tb += rng.uniform(0.12, 0.3)
    put(_pitch(vapor, 0.85), Tf[2] + 0.3, -33, c["trampa"] - Tf[2] - 0.5, 0.4, 0.5, track=amb)
    wr = _onset(_load("whoosh2"))[::-1].copy()
    put(wr, c["traje"] - 0.35, -25, 1.0, 0.05, 0.05)
    put("destello", c["quimico"] + 0.3, -25, 0.6)
    # la trampa: 1202, uno menos que la gasolina
    put("glitch", c["trampa"] - 0.05, -28, 0.4)
    put(_pitch(toque, 0.8), c["trampa"] - 0.03, -27, 0.35)
    put(_pitch(nota, 0.9), c["uno"] - 0.05, -27, 0.7)
    put("tension", c["uno"] - 0.1, -31, c["quelleva"] - c["uno"] + 0.2, 0.3, 0.3)
    # las cuatro letras y «comenta tu letra»
    for k, key in enumerate(("oA", "oB", "oC", "oD")):
        put(_pitch(nota, 1.0 * 1.122 ** k), c[key] - 0.03, -29, 0.7)
        put(_pitch(bub, 1.0 + 0.1 * k), c[key] - 0.1, -27, 0.2)
    put(_pitch(toque, 1.3), c["comenta"] - 0.03, -27, 0.35)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_bloqueadores(path):
    """«Si sueltas la cuerda, ¿qué hace la camilla?» (bloqueadores): el barranco de noche (viento, grillos, el motor de la
    autobomba), cada tirón de cuerda con el «clac» del bloqueador, la cuerda que se escapa, la pregunta con sus tarjetas, la
    cuenta de 5 s con la bocina, el «¿y si no lo llevara?» (cae con un silbido y se rebobina), los rayos X (zumbido, la
    cuerda que corre y el mordisco metálico de la leva), el que sube con puño y croll (un clic por paso), las letras y la
    venta. Tiempos como en bloqueadores.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    T["count0"] = LINES[3]["end"] + 0.05; T["count1"] = T["count0"] + 4.0
    T["g0"] = c["tiempo"] + 0.08; T["g1"] = T["g0"] + 0.75; T["rw1"] = T["g1"] + 0.45
    pulls = [c["tirando"] - 0.1, c["tiron"] - 0.05, c["palmo"] - 0.15, c["arriba"] - 0.15, c["tiras"] - 0.1, c["nobaja"] + 0.45, c["colgarias"] - 0.2]
    nota, toque, bub, tic = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja")), _onset(_load("tic"))
    clac = _pitch(_onset(_load("golpe")), 1.9)

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # el barranco: viento, grillos y el motor de la autobomba arriba
    put(_loop(_load("aire"), END + 0.5), 0.0, -31, T["fin"], 0.3, 1.0, track=amb)
    put(_loop(_load("grillos"), END + 0.5), 0.0, -37, T["fin"], 0.6, 1.0, track=amb)
    put(_loop(_load("motor"), END + 0.5), 0.0, -39, T["fin"], 0.6, 1.0, track=amb)
    put("golpe", 0.0, -24, 0.8, 0.003, 0.35)
    put("latido", 0.1, -25, 0.7)
    put(_pitch(_onset(_load("whoosh")), 0.6), c["barranco"] - 0.3, -27, 1.2)
    # cada tirón: la cuerda corre y, al soltar, el «clac» del bloqueador
    for p in pulls:
        put(_pitch(_onset(_load("whoosh2")), 1.6), p, -30, 0.55, 0.02, 0.15)
        put(_pitch(tic, 1.5), p + 0.58, -27, 0.2)
    # se te escapa: la cuerda resbala y el corazón
    put(_pitch(_onset(_load("whoosh2")), 1.9), c["escapa"] - 0.05, -25, 0.4)
    put(clac, c["escapa"] + 0.08, -26, 0.4)
    put("latido", c["escapa"] + 0.15, -23, 0.7)
    # la pregunta: tarjetas, cuenta con bocina
    for k, key in enumerate(("cae", "despacio", "quieta1")):
        put(_pitch(nota, 1.0 * 1.122 ** k), c[key] - 0.03, -29, 0.7)
        put(_pitch(bub, 1.0 + 0.1 * k), c[key] - 0.1, -27, 0.2)
    put("tension", T["count0"] - 0.1, -30, 4.2, 0.2, 0.1)
    for k in range(4):
        put("tic", T["count0"] + k, -22 + 1.5 * k, 0.3)
    put("bocina", T["count1"] - 0.02, -21, 0.9, 0.003, 0.12)
    put("golpe", T["count1"] - 0.02, -24, 0.7, 0.005, 0.3)
    # ¿y si no lo llevara?: cae silbando… y se rebobina; se queda quieta
    put(_pitch(_onset(_load("whoosh")), 0.8), T["g0"], -24, 0.8, 0.01, 0.2)
    put("fallo", T["g0"] + 0.5, -26, 0.5)
    wr = _onset(_load("whoosh2"))[::-1].copy()
    put(wr, T["g1"], -24, 0.5, 0.05, 0.05)
    put("acierto", c["quieta2"] - 0.03, -23, 0.9)
    put("destello", c["bloqueador"] - 0.05, -25, 0.6)
    put(_pitch(toque, 1.2), c["bloqueador"] - 0.02, -27, 0.35)
    # rayos X: zumbido, la cuerda que corre y el mordisco de la leva
    put(_pitch(_onset(_load("glitch")), 0.8), c["leva"] - 0.35, -29, 0.4)
    put("tension", c["leva"] - 0.2, -33, c["poreso"] - c["leva"], 0.3, 0.3, track=amb)
    put(_pitch(nota, 1.3), c["dientes"] - 0.03, -28, 0.6)
    put(clac, c["muerde"] + 0.02, -21, 0.5)
    put(_pitch(_onset(_load("golpe")), 0.8), c["muerde"] + 0.02, -25, 0.6, 0.003, 0.3)
    put("destello", c["muerde"] + 0.05, -26, 0.5)
    # tiras, descansas… y no baja
    put(_pitch(toque, 0.9), c["descansas"] - 0.03, -29, 0.35)
    put("acierto", c["nobaja"] - 0.03, -25, 0.8)
    # el que sube: un clic del croll en cada paso y el del puño
    tk = c["truco"] - 0.4 + 0.5
    while tk < c["colgarias"]:
        put(_pitch(tic, 1.8), tk, -30, 0.15)
        put(_pitch(tic, 1.3), tk + 0.6, -31, 0.15)
        tk += 1.25
    for key in ("puno", "croll"):
        put(_pitch(toque, 1.15), c[key] - 0.03, -28, 0.35)
    # final: «dímelo en comentarios»
    put("whoosh2", c["colgarias"] - 0.3, -27, 0.8)
    put(_pitch(toque, 1.3), c["comentarios"] - 0.03, -27, 0.35)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    fuego = _load("fuego")
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_bloqguia(path):
    """«Los 5 bloqueadores: ¿cuál es cuál?» (bloqguia): el barranco de noche (viento, grillos, motor de la autobomba); el
    mordisco de la leva en el arranque; los cinco iconos que saltan; el que sube (un clic del croll y otro del puño en cada
    paso); la cuerda que corre por el croll y el «clac» al bloquearse; el mapa (subir, izar, bajar); un «ding» más agudo por
    cada aparato que recibe su nombre; los tirones del polipasto; el shunt que frena; la trampa con sus letras; la ficha
    para guardar y la venta. Tiempos como en guia.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    c0 = max(5.5, c["correr"] - 0.2); c1 = max(c0 + 1.2, c["lado"] + 0.5); c2 = max(c1 + 0.8, c["cambia"] - 0.25); tA = c2 + 0.75
    gap = 1.3 + 0.2 + 0.7 + 0.05
    sA = c["izar"] - 0.1; sB = sA + gap; sC = max(c["rescucender"] + 0.2, sB + gap)
    nota, toque, bub, tic = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja")), _onset(_load("tic"))
    clac = _pitch(_onset(_load("golpe")), 1.9)
    w2 = _onset(_load("whoosh2"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # el barranco: viento, grillos y el motor de la autobomba arriba
    put(_loop(_load("aire"), END + 0.5), 0.0, -31, T["fin"], 0.3, 1.0, track=amb)
    put(_loop(_load("grillos"), END + 0.5), 0.0, -38, T["fin"], 0.6, 1.0, track=amb)
    put(_loop(_load("motor"), END + 0.5), 0.0, -40, T["fin"], 0.6, 1.0, track=amb)
    # arranque: la leva muerde la cuerda (golpe metálico), el corazón, y la cámara que se abre sobre el vacío
    put("golpe", 0.0, -22, 0.8, 0.003, 0.35)
    put(clac, 0.02, -22, 0.45)
    put("latido", 0.12, -24, 0.7)
    put(_pitch(_onset(_load("whoosh")), 0.6), 0.35, -26, 1.3)
    put("tension", 0.3, -32, c["todos"] - 0.3, 0.4, 0.5, track=amb)
    for i in range(5):
        put(_pitch(bub, 1.0 + 0.09 * i), c["cinco"] + 0.09 * i, -27, 0.15, 0.001, 0.05)
    put("latido", c["vida"] - 0.05, -23, 0.7)
    for k, key in enumerate(("cual1", "cual2")):
        put(_pitch(nota, 1.0 + 0.19 * k), c[key] - 0.02, -28, 0.5)
    # el que sube: en cada paso, el clic del croll y el del puño
    steps = [1.3 * n for n in range(4)] + [tA + 1.3 * n for n in range(8)]
    for t0 in steps:
        if t0 + 1.2 < c["izar"] + 0.3:
            put(_pitch(tic, 1.8), t0 + 0.55, -32, 0.15)
            put(_pitch(tic, 1.3), t0 + 1.17, -33, 0.15)
    # todos hacen lo mismo: la cuerda corre por el croll… y hacia el otro lado, «clac»
    put(_pitch(_onset(_load("whoosh")), 0.8), c["todos"] - 0.15, -29, 0.9)
    for k in range(3):
        put(_pitch(w2, 1.7), c["correr"] - 0.1 + 0.62 * k, -31, 0.6, 0.05, 0.2)
    put(_pitch(toque, 0.8), c["otro"] + 0.1, -30, 0.35)
    put(clac, c["bloquean"] + 0.0, -20, 0.5)
    put(_pitch(_onset(_load("golpe")), 0.8), c["bloquean"] + 0.0, -24, 0.6, 0.003, 0.3)
    put("destello", c["bloquean"] + 0.04, -27, 0.5)
    # dónde van: la cámara sale al vacío y aparecen las tres maniobras
    put(_pitch(_onset(_load("whoosh")), 0.7), c["cambia"] + 0.0, -26, 1.0)
    for k in range(3):
        put(_pitch(nota, 1.0 * 1.122 ** k), c["donde"] - 0.15 + 0.13 * k, -30, 0.5)
    for key in ("subir", "izar", "bajar"):
        put(_pitch(toque, 0.8), c[key] - 0.02, -25, 0.4)
        put(w2, c[key] - 0.15, -29, 0.6)
    # cada aparato recibe su nombre: un «ding» cada vez más agudo
    for k, key in enumerate(("puno", "croll", "basic", "rescucender", "shunt")):
        put(_pitch(nota, 1.0 * 1.122 ** k), c[key] - 0.03, -25, 0.8)
        put(_pitch(bub, 1.0 + 0.08 * k), c[key] - 0.08, -27, 0.2)
    put(_pitch(toque, 1.2), c["pedal"] - 0.03, -29, 0.35)
    put(_pitch(tic, 1.2), c["pie"] + 0.1, -30, 0.2)
    put("destello", c["arnes"] - 0.04, -27, 0.5)
    # izar: los tirones del polipasto (la cuerda corre; al soltar, el clic del Basic), el mango que se borra y la tracción
    for p in (sA, sB, sC):
        put(_pitch(w2, 1.6), p, -30, 0.6, 0.02, 0.15)
        put(_pitch(tic, 1.5), p + 1.38, -27, 0.2)
    put(_pitch(_onset(_load("whoosh")), 0.75), c["herido"] + 0.35, -28, 1.0)
    put(w2[::-1].copy(), c["sinmango"] - 0.1, -27, 0.45, 0.05, 0.05)
    put(_pitch(toque, 1.3), c["mango"] + 0.75, -28, 0.3)
    for k in range(3):
        put(_pitch(tic, 1.2), sC + 0.05 + 0.11 * k, -30, 0.12)
    put(_pitch(toque, 1.1), c["ranurada"] - 0.02, -29, 0.35)
    # bajar: la cuerda corre por el descensor… suelta las manos y el shunt muerde
    put(_pitch(_onset(_load("whoosh")), 0.7), c["bajar"] - 0.25, -27, 1.0)
    put(_loop(_pitch(w2, 0.7), 8.0), c["shunt"], -35, c["sueltas"] - c["shunt"], 0.3, 0.1, track=amb)
    put(_pitch(toque, 1.0), c["descensor"] - 0.02, -29, 0.35)
    put("latido", c["sueltas"] - 0.05, -24, 0.6)
    put(clac, c["sueltas"] + 0.2, -20, 0.5)
    put(_pitch(_onset(_load("golpe")), 0.8), c["sueltas"] + 0.2, -24, 0.6, 0.003, 0.3)
    put("acierto", c["frena"] - 0.03, -24, 0.9)
    # la trampa: tensión, la pregunta, las tres letras y «comenta tu letra»
    put(_pitch(_onset(_load("whoosh")), 0.8), c["trampa"] - 0.1, -27, 1.0)
    put("tension", c["trampa"], -31, c["guardalo"] - c["trampa"] - 0.2, 0.3, 0.3, track=amb)
    put(_pitch(toque, 0.9), c["cual6"] - 0.03, -27, 0.4)
    put(_pitch(toque, 0.7), c["no"] - 0.02, -25, 0.4)
    for k, key in enumerate(("oA", "oB", "oC")):
        put(_pitch(nota, 1.0 * 1.122 ** k), c[key] - 0.2, -28, 0.6)
        put(_pitch(bub, 1.0 + 0.1 * k), c[key] - 0.25, -27, 0.2)
    put(_pitch(toque, 1.3), c["comenta"] - 0.03, -26, 0.35)
    # la ficha para guardar
    put("whoosh2", c["guardalo"] - 0.25, -27, 0.7)
    put("destello", c["guardalo"] + 0.1, -24, 0.6, 0.002, 0.2)
    for k in range(5):
        put(_pitch(tic, 1.4 + 0.1 * k), c["guardalo"] + 0.05 * k + 0.05, -31, 0.1)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    fuego = _load("fuego")
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_puno(path):
    """«El puño: así se sube por una cuerda» (serie una pieza por vídeo, 1): el barranco de noche; el mordisco de la leva
    en el arranque; el clic del croll y el del puño en cada paso; la cuerda que corre al subir el puño y el «clac» cuando
    muerde; el pedal; la bajada al suelo para el dato de examen (la regla que sube, el «90°»); la pregunta del croll y la
    venta. Tiempos como en puno.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    a0 = max(4.7, c["llama"] - 0.45); a1 = max(a0 + 0.9, c["puno"] + 0.5); b0 = max(a1 + 0.3, c["arriba"] - 0.15); b1 = max(b0 + 1.5, c["corre"] + 1.3)
    c0 = max(b1 + 0.6, c["pisas"] + 0.1); c1 = max(c0 + 1.0, c["pie"] + 0.15); d0 = max(c1 + 0.5, c["subes"] - 0.1); d1 = max(d0 + 1.0, c["palmo"] - 0.1); e0 = max(d1 + 0.6, c["dato"] + 0.5)
    nota, toque, bub, tic = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja")), _onset(_load("tic"))
    clac = _pitch(_onset(_load("golpe")), 1.9)
    w2 = _onset(_load("whoosh2"))
    wh = _onset(_load("whoosh"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # el barranco: viento, grillos y, muy arriba, el motor de la autobomba
    put(_loop(_load("aire"), END + 0.5), 0.0, -30, T["fin"], 0.3, 1.0, track=amb)
    put(_loop(_load("grillos"), END + 0.5), 0.0, -37, T["fin"], 0.6, 1.0, track=amb)
    put(_loop(_load("motor"), END + 0.5), 0.0, -43, T["fin"], 0.6, 1.0, track=amb)
    # arranque: la leva muerde la cuerda; la cámara se abre sobre el vacío
    put("golpe", 0.0, -22, 0.8, 0.003, 0.35)
    put(clac, 0.02, -22, 0.45)
    put("latido", 0.12, -24, 0.7)
    put(_pitch(wh, 0.8), c["mano"] - 0.5, -28, 0.8)
    put(_pitch(wh, 0.6), c["sube"] + 0.1, -26, 1.3)
    put("latido", c["entero"] - 0.05, -23, 0.7)
    put("tension", 0.3, -32, c["llama"] - 0.3, 0.4, 0.5, track=amb)
    # los pasos del que sube: clic del croll (al ponerse de pie) y clic del puño (al subirlo)
    for n in range(3):
        put(_pitch(tic, 1.8), 1.5 * n + 0.63, -32, 0.15)
        put(_pitch(tic, 1.3), 1.5 * n + 1.35, -33, 0.15)
    put(_pitch(tic, 1.8), a1, -30, 0.15)
    for n in range(8):
        t0 = e0 + 1.5 * n
        if t0 + 1.4 < T["fin"]:
            put(_pitch(tic, 1.8), t0 + 0.63, -33, 0.15)
            put(_pitch(tic, 1.3), t0 + 1.35, -34, 0.15)
    # se llama puño · hacia arriba, corre · hacia abajo, la muerde: no baja
    put(_pitch(wh, 0.8), c["llama"] - 0.1, -28, 0.9)
    put(nota, c["puno"] - 0.03, -25, 0.8)
    put(bub, c["puno"] - 0.08, -27, 0.2)
    for k in range(3):
        put(_pitch(w2, 1.7), b0 + 0.05 + (b1 - b0) * k / 3, -30, 0.6, 0.05, 0.2)
    put(_pitch(tic, 1.3), b1 + 0.05, -29, 0.15)
    put(_pitch(toque, 0.8), c["abajo"] + 0.05, -29, 0.35)
    put(clac, c["muerde"], -20, 0.5)
    put(_pitch(_onset(_load("golpe")), 0.8), c["muerde"], -24, 0.6, 0.003, 0.3)
    put("destello", c["muerde"] + 0.04, -27, 0.5)
    put(_pitch(toque, 0.7), c["nobaja"] + 0.2, -25, 0.4)
    # el pedal: pisas, te pones de pie, el croll te sujeta y subes el puño otro palmo
    put(_pitch(wh, 0.9), c["cuelga"] - 0.1, -29, 0.8)
    put(_pitch(toque, 1.2), c["pedal"] - 0.03, -28, 0.35)
    put(_pitch(w2, 1.2), c0, -31, 0.7, 0.05, 0.2)
    put(_pitch(tic, 1.8), c1, -28, 0.15)
    put(_pitch(nota, 1.122), c["croll3"] - 0.03, -26, 0.7)
    put(_pitch(bub, 1.1), c["croll3"] - 0.08, -27, 0.2)
    put(_pitch(w2, 1.7), d0, -30, 0.7, 0.05, 0.2)
    put(_pitch(tic, 1.3), d1 + 0.05, -28, 0.15)
    # dato de examen: la cámara baja al suelo; la regla, del suelo al croll; el brazo, a 90°
    put(_pitch(wh, 0.55), c["dato"] - 0.05, -25, 1.3)
    put(_pitch(toque, 0.8), c["dato"] + 0.1, -25, 0.4)
    put("destello", c["examen"] - 0.04, -26, 0.5)
    for k in range(6):
        put(_pitch(tic, 1.0 + 0.12 * k), c["mide"] + 0.12 + 0.09 * k, -30, 0.1)
    put(_pitch(toque, 1.0), c["suelo"] - 0.03, -28, 0.35)
    put(_pitch(nota, 1.122), c["croll4"] - 0.03, -27, 0.6)
    put(_pitch(w2, 1.3), c["brazo"] - 0.1, -30, 0.6)
    put("acierto", c["noventa"] - 0.03, -24, 0.9)
    # ¿y el croll?: vuelve arriba; la pregunta para comentar y la pieza siguiente
    put(_pitch(wh, 0.9), c["ycroll"] - 0.35, -26, 1.0)
    for k in range(2):
        put(_pitch(nota, 1.0 + 0.19 * k), c["ycroll"] + 0.12 * k, -27, 0.5)
    put(w2, c["sabes"] - 0.2, -29, 0.6)
    put(bub, c["sabes"] - 0.05, -26, 0.2)
    put(_pitch(toque, 1.3), c["comenta"] - 0.03, -26, 0.35)
    put("destello", c["enseno"] - 0.04, -27, 0.5)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    fuego = _load("fuego")
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def _motosierra(dur, fkeys, carga, cadena, seed=7):
    """Motosierra sintetizada (motor de dos tiempos): tren de explosiones a la frecuencia fkeys [(t, Hz)…] con su
    irregularidad, escape (ruido que sigue a cada explosión), silbido de la cadena (cadena(t) 0–1) y el roce contra la
    madera (carga(t) 0–1). Estéreo, sin normalizar (≈ ±1)."""
    SR = sfx.SR
    n = int(dur * SR)
    t = np.arange(n) / SR
    rs = np.random.RandomState(seed)
    f = np.interp(t, [k[0] for k in fkeys], [k[1] for k in fkeys])
    wob = np.interp(t, np.arange(0, dur + 0.2, 0.09), rs.randn(int((dur + 0.2) / 0.09) + 1)) * 0.035
    f = f * (1 + wob)
    ph = 2 * np.pi * np.cumsum(f) / SR
    cyc = np.floor(ph / (2 * np.pi)).astype(int)
    amp = 1 + 0.28 * rs.randn(cyc.max() + 2)[cyc]                    # cada explosión, distinta («ring-ding» de dos tiempos)
    fr = ph / (2 * np.pi) - cyc                                       # 0…1 dentro de cada ciclo
    pulso = np.exp(-fr * 5.5)                                         # la explosión y su caída
    tono = np.zeros(n)
    for h in range(1, 15):
        tono += np.sin(h * ph + rs.rand() * 6.283) / h ** 0.85
    tono = np.tanh(tono * 0.9 * amp) * (0.55 + 0.45 * pulso)

    def banda(x, lo, hi):
        X = np.fft.rfft(x); fq = np.fft.rfftfreq(len(x), 1 / SR)
        m = 1 / (1 + (lo / np.maximum(fq, 1)) ** 6) / (1 + (fq / hi) ** 6)
        return np.fft.irfft(X * m, len(x))

    cad = np.array([cadena(x) for x in t[::480]]); cad = np.interp(t, t[::480], cad)
    car = np.array([carga(x) for x in t[::480]]); car = np.interp(t, t[::480], car)
    out = np.zeros((n, 2))
    for c in range(2):
        escape = banda(rs.randn(n), 500, 4200) * (0.25 + 0.75 * pulso) * amp * 0.5
        silbido = banda(np.sign(np.sin(7.3 * ph + 0.6 * np.sin(ph))) * (0.6 + 0.4 * rs.rand(n)), 1400, 5200) * cad * 0.33
        madera = banda(rs.randn(n), 1800, 7000) * car * (0.55 + 0.45 * np.sin(ph * 0.5) ** 2) * 0.6
        y = banda(tono, 70, 3600) * 0.75 + escape + silbido + madera
        out[:, c] = np.roll(np.tanh(y * 1.25), 14 * c)
    return out


def sfx_track_moto(path):
    """«La motosierra: la parte con la que nunca se corta»: la noche del temporal (viento, trueno lejano, el intermitente
    del coche), los golpes en el cristal del que está dentro, la motosierra SINTETIZADA (ralentí, acelerón, a fondo con
    carga en los dos cortes), el tirón y el empuje, el rebote (golpe metálico y la cadena que se para en seco: el motor
    cae al ralentí), el freno, el tronco que cae al suelo, la pregunta y la venta. Tiempos como en moto.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    c0 = c["cortas"] + 0.5; c1 = c["arriba"] - 0.75; u0 = c["arriba"] + 0.1; u1 = c["punta"] - 1.0; k0 = c["rebote"] - 0.07; drop = c["antes"] + 0.45
    m = c["motosierra"]
    nota, toque, bub, tic = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja")), _onset(_load("tic"))
    golpe = _onset(_load("golpe"))
    clac = _pitch(golpe, 1.9)
    w2 = _onset(_load("whoosh2")); wh = _onset(_load("whoosh"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    sm = lambda a, b, x: float(np.clip((x - a) / (b - a), 0, 1)) ** 2 * (3 - 2 * float(np.clip((x - a) / (b - a), 0, 1)))
    cT = lambda x: sm(c0, c0 + 0.15, x) * (1 - sm(c1 - 0.05, c1 + 0.1, x))
    cB = lambda x: sm(u0 + 0.15, u0 + 0.3, x) * (1 - sm(u1 - 0.05, u1 + 0.1, x))
    carga = lambda x: max(cT(x), cB(x))
    # la noche del temporal
    put(_loop(_load("aire"), END + 0.5), 0.0, -29, T["fin"], 0.3, 1.0, track=amb)
    put("trueno", 0.0, -25, 3.2, 0.01, 1.2)
    put("golpe", 0.0, -22, 0.8, 0.003, 0.35)
    put("latido", 0.15, -24, 0.7)
    tk = 0.0
    while tk < T["fin"]:                                            # el intermitente del coche (va con la luz)
        put(_pitch(tic, 0.8), tk, -36, 0.1); put(_pitch(tic, 0.7), tk + 0.45, -38, 0.1); tk += 0.9
    # hay alguien dentro: golpes en el cristal
    for k in range(3):
        put(_pitch(golpe, 2.6), c["dentro"] - 0.12 + 0.17 * k, -27 - k, 0.12, 0.002, 0.06)
    put("latido", c["dentro"] + 0.1, -23, 0.7)
    put(_pitch(wh, 0.8), c["tu"] - 0.25, -27, 1.0)
    # la motosierra (sintetizada): ralentí → acelerón → a medio gas → a fondo en los dos cortes → rebote: se para la cadena y cae al ralentí
    fk = [(0, 42), (m - 0.3, 42), (m - 0.08, 168), (m + 0.16, 84), (m + 0.36, 172), (m + 0.7, 104), (c["cortas"], 104), (c0, 162), (c0 + 0.3, 143), (c1, 147),
          (c1 + 0.2, 72), (u0 + 0.1, 72), (u0 + 0.3, 162), (u0 + 0.5, 143), (u1, 147), (u1 + 0.2, 100), (k0, 126), (k0 + 0.03, 152), (k0 + 0.22, 45), (END + 1, 42)]
    cadena = lambda x: (0.0 if x > k0 + 0.1 else min(1.0, max(0.0, (np.interp(x, [k[0] for k in fk], [k[1] for k in fk]) - 60) / 95)))
    ms = _motosierra(T["fin"] + 0.3, fk, carga, cadena)
    lvl = np.interp(np.arange(len(ms)) / sfx.SR, [0, m - 0.3, m, c["cortas"], c0, c1, c1 + 0.25, u0 + 0.2, u1, u1 + 0.25, k0, k0 + 0.25, T["fin"] - 0.5, T["fin"] + 0.3],
                    [-36, -36, -25, -30, -25, -25, -31, -25, -25, -30, -26, -37, -39, -60])
    _put(amb, _to(ms, 0.0) * (10 ** (lvl / 20))[:, None], 0.0)
    put(_tramo(_to(ms[int((m - 0.1) * sfx.SR):], -21), 0.75, 0.01, 0.2), m - 0.1, -21, 0.75, 0.01, 0.2)      # el acelerón, en primer plano
    # ¿con qué parte nunca?: tres «?»
    for k in range(3):
        put(_pitch(bub, 1.0 + 0.12 * k), c["parte1"] + 0.12 * k, -26, 0.15, 0.001, 0.05)
    put(_pitch(toque, 0.9), c["nunca"] - 0.03, -26, 0.4)
    # la cadena gira siempre así
    put(_pitch(nota, 1.0), c["cadena"] + 0.1, -29, 0.6)
    # abajo: tira de ti · arriba: te empuja
    put(_pitch(toque, 1.1), c["abajo"] - 0.03, -28, 0.35)
    put(_pitch(wh, 1.3), c["tira"] - 0.1, -24, 0.5, 0.01, 0.15)
    put(_pitch(golpe, 0.75), c["tira"] + 0.12, -24, 0.5, 0.003, 0.25)
    put(_pitch(toque, 1.25), c["arriba"] - 0.03, -28, 0.35)
    put(_pitch(wh, 1.3)[::-1].copy(), c["empuja"] - 0.12, -24, 0.5, 0.05, 0.05)
    put(_pitch(golpe, 0.75), c["empuja"] + 0.12, -24, 0.5, 0.003, 0.25)
    # ¿y con la punta? ¡rebote!
    put("tension", c["punta"] - 0.3, -28, k0 - c["punta"] + 0.3, 0.2, 0.03)
    put("latido", c["punta"] - 0.05, -23, 0.6)
    put(clac, k0, -17, 0.5)
    put(_pitch(_onset(_load("barra")), 1.2), k0, -21, 0.7, 0.002, 0.3)
    put(_pitch(wh, 1.8), k0, -21, 0.3, 0.005, 0.1)
    put(_pitch(golpe, 0.7), k0 + 0.02, -21, 0.6, 0.003, 0.3)
    put("latido", c["salta"] - 0.05, -21, 0.6)
    put("latido", c["cara"] - 0.05, -21, 0.6)
    # te salva el freno, que para la cadena en seco
    put(_onset(_load("rele")), c["freno"] - 0.05, -22, 0.25)
    put(_pitch(toque, 1.0), c["freno"] - 0.02, -27, 0.35)
    put("acierto", c["para"] + 0.25, -24, 0.9)
    # el tronco cortado cae al suelo
    put(_pitch(golpe, 0.55), drop + 0.27, -19, 0.9, 0.003, 0.4)
    put(_pitch(_onset(_load("papeles")), 0.6), drop + 0.2, -27, 0.9, 0.01, 0.4)
    # la pregunta: ¿puesto o quitado?
    put(w2, c["antes"] - 0.2, -28, 0.6)
    for k, key in enumerate(("puesto", "quitado")):
        put(_pitch(nota, 1.0 * 1.19 ** k), c[key] - 0.2, -27, 0.6)
        put(_pitch(bub, 1.0 + 0.12 * k), c[key] - 0.25, -26, 0.2)
    put(_pitch(toque, 1.3), c["comenta"] - 0.03, -25, 0.35)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    fuego = _load("fuego")
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_rsciei(path):
    """«¿A, B, C o D? Lo que decide es el vecino» (RSCIEI): el polígono de noche con la nave ardiendo (fuego sin
    repeticiones, viento, la autobomba), la vecina que se acerca y se funde en un solo edificio (golpe metálico), que se
    separa (un tic por metro), los metros libres, las paredes que se van volando (aire libre), la regla A-B-C-D (una nota
    por letra), los palés que caen en el hueco, la pregunta y la venta. Tiempos como en rsciei.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    nota, toque, bub, tic = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja")), _onset(_load("tic"))
    golpe = _onset(_load("golpe"))
    w2 = _onset(_load("whoosh2")); wh = _onset(_load("whoosh"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    def bed(x, dur, seed, a=0.45, b=2.45, seg=(0.7, 1.3), xf=0.25):      # ambiente sin repetición (como en el del techo)
        rng = np.random.default_rng(seed)
        n, k = int(dur * sfx.SR), int(xf * sfx.SR)
        fi_, fo_ = np.sqrt(np.linspace(0, 1, k))[:, None], np.sqrt(np.linspace(1, 0, k))[:, None]
        y = np.zeros((0, 2))
        while len(y) < n:
            L = rng.uniform(*seg); s0 = rng.uniform(a, b - L)
            z = x[int(s0 * sfx.SR): int((s0 + L) * sfx.SR)] * 10 ** (rng.uniform(-2, 2) / 20)
            if len(y) >= k:
                z = z.copy(); z[:k] = y[-k:] * fo_ + z[:k] * fi_
                y = np.concatenate([y[:-k], z])
            else:
                y = z.copy()
        y = y[:n]
        w = 480; nf = len(y) // w
        e = np.sqrt((y[:nf * w].mean(1).reshape(nf, w) ** 2).mean(1)) + 1e-9
        gr = np.minimum(1, np.median(e) * 10 ** (7 / 20) / e)
        gr = np.min(np.stack([np.roll(gr, d) for d in range(-3, 4)]), 0)
        gr = np.convolve(gr, np.ones(5) / 5, "same")
        return y * np.interp(np.arange(len(y)), np.arange(nf) * w + w / 2, gr)[:, None]

    # la noche del polígono: la nave ardiendo, el viento y la autobomba
    fuego = _load("fuego")
    put(bed(fuego, T["fin"] + 0.3, 5), 0.0, -26, T["fin"], 0.05, 1.0, track=amb)
    put(_loop(_load("aire"), END + 0.5), 0.0, -33, T["fin"], 0.3, 1.0, track=amb)
    put(_loop(_load("motor"), END + 0.5), 0.0, -41, T["fin"], 0.6, 1.0, track=amb)
    put("golpe", 0.0, -21, 0.8, 0.003, 0.35)
    put(fuego[int(0.3 * sfx.SR):], 0.0, -22, 1.4, 0.003, 0.6)
    put("latido", 0.15, -24, 0.7)
    put("sirena", 0.3, -36, 3.5, 0.6, 1.2)
    put(_pitch(toque, 1.0), c["tres1"] - 0.03, -26, 0.4)
    put("latido", c["tres1"] + 0.1, -23, 0.7)
    put(_pitch(bub, 1.0), c["letra1"] - 0.08, -25, 0.2)
    put(_pitch(nota, 0.9), c["letra1"] - 0.02, -27, 0.6)
    # A: la vecina se acerca y se funde en un solo edificio (un solo tejado)
    put(_pitch(wh, 0.8), c["comparten"] - 0.3, -25, 1.0)
    put(_pitch(golpe, 0.6), c["edificio"] + 0.05, -20, 0.9, 0.003, 0.4)
    put(_pitch(_onset(_load("barra")), 0.7), c["edificio"] + 0.05, -26, 0.8, 0.003, 0.4)
    put(_pitch(nota, 1.0), c["tipoA"] - 0.03, -24, 0.8)
    put("destello", c["tipoA"] - 0.05, -26, 0.5)
    # B: se separan (un tic por metro hasta 3)
    put(_pitch(w2, 1.1)[::-1].copy(), c["suyo"] - 0.3, -26, 0.6, 0.05, 0.05)
    put(_pitch(golpe, 0.9), c["suyo"] + 0.3, -26, 0.4, 0.003, 0.2)
    g0, g1 = c["pegadas"] + 0.35, c["menos"] + 0.1
    for m in (1, 2, 3):
        u = np.arccos(1 - 2 * m / 3) / np.pi                     # cuándo pasa por cada metro (la separación sigue una curva suave)
        put(_pitch(tic, 1.0 + 0.15 * m), g0 + (g1 - g0) * u - 0.02, -26, 0.15)
    put(_pitch(nota, 1.122), c["tipoB"] - 0.03, -24, 0.8)
    put("destello", c["tipoB"] - 0.05, -26, 0.5)
    # C: más de 3 metros libres
    for m in (4, 5, 6):
        put(_pitch(tic, 1.0 + 0.15 * m), c["mas4"] + (c["tipoC"] + 0.2 - c["mas4"]) * (m - 3) / 3.4, -27, 0.15)
    put(_pitch(toque, 1.2), c["libres"] - 0.03, -26, 0.35)
    put(_pitch(nota, 1.26), c["tipoC"] - 0.03, -24, 0.8)
    put("destello", c["tipoC"] - 0.05, -26, 0.5)
    # D: las paredes y el tejado se van volando
    put(_pitch(wh, 0.6), c["aire"] - 0.2, -23, 1.3)
    put(_loop(_load("aire"), 3.0), c["aire"], -30, c["lejos"] - c["aire"], 0.2, 0.4)
    put(_pitch(nota, 1.41), c["tipoD"] - 0.03, -24, 0.8)
    put("destello", c["tipoD"] - 0.05, -26, 0.5)
    # la regla: una nota por letra
    put(w2, c["lejos"] - 0.25, -28, 0.6)
    for i in range(4):
        t0 = c["lejos"] + 0.15 + i * (c["avanza"] + 0.3 - c["lejos"] - 0.15) / 3
        put(_pitch(nota, 1.0 * 1.122 ** i), t0 - 0.02, -26, 0.6)
        put(_pitch(bub, 1.0 + 0.1 * i), t0 - 0.06, -27, 0.15)
    # la trampa: vuelve la vecina a 4 m y el hueco se llena de palés
    put(_pitch(wh, 0.75), c["trampa"] - 0.25, -25, 1.0)
    put("tension", c["trampa"], -30, c["compartir"] - c["trampa"] - 0.3, 0.3, 0.3, track=amb)
    put(_pitch(golpe, 0.85), c["cuatro"] + 0.1, -24, 0.5, 0.003, 0.25)
    for i in range(10):
        put(_pitch(golpe, 0.5 + 0.06 * (i % 4)), c["llenos"] - 0.05 + 0.065 * i * 2.1, -27 + (i % 3), 0.35, 0.003, 0.2)
    put(_pitch(toque, 0.9), c["sigue"] - 0.03, -25, 0.4)
    put(_pitch(toque, 0.7), c["c6"] - 0.02, -24, 0.4)
    for k, key in enumerate(("si", "no")):
        put(_pitch(nota, 1.0 * 1.19 ** k), c[key] - 0.2, -26, 0.6)
        put(_pitch(bub, 1.0 + 0.12 * k), c[key] - 0.25, -26, 0.2)
    put(_pitch(toque, 1.3), c["comenta"] - 0.03, -25, 0.35)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_estab(path):
    """«Coche volcado: ¿cuál es la más estable?» (estabilización): la carretera de noche (viento, grillos, el motor de la
    autobomba), el coche de lado que cruje y se balancea (las ruedas aún giran), cristales, el fantasma que lo pone
    derecho (zumbido de error), las cuñas y los calzos que entran (un golpe seco por apoyo, notas que suben al contar),
    los puntales que se levantan, se alargan (carraca) y muerden la chapa, la cinta que tensa, las cuñas bajo el capó, la
    pregunta con las tres letras y la venta. Tiempos como en estab.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    blk = [c["calzos"] + 0.25, c["chasis"] + 0.25, c["tres"] - 0.05, c["apoyos"] + 0.45]
    s0, s1, bite = c["puntales"] - 0.15, c["cuchilla"] + 0.15, c["muerde"] + 0.05
    nota, toque, bub, tic = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja")), _onset(_load("tic"))
    golpe = _onset(_load("golpe")); clac = _pitch(golpe, 1.9); barra = _onset(_load("barra"))
    w2 = _onset(_load("whoosh2")); wh = _onset(_load("whoosh"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # la carretera de noche
    put(_loop(_load("aire"), END + 0.5), 0.0, -31, T["fin"], 0.3, 1.0, track=amb)
    put(_loop(_load("grillos"), END + 0.5), 0.0, -37, T["fin"], 0.6, 1.0, track=amb)
    put(_loop(_load("motor"), END + 0.5), 0.0, -40, T["fin"], 0.6, 1.0, track=amb)
    tk = 0.0
    while tk < T["fin"]:                                           # los intermitentes de los coches
        put(_pitch(tic, 0.8), tk, -37, 0.1); put(_pitch(tic, 0.7), tk + 0.45, -39, 0.1); tk += 0.9
    # arranque: el golpe, los cristales y la chapa que cruje mientras se balancea
    put("golpe", 0.0, -20, 0.9, 0.003, 0.4)
    put(_pitch(golpe, 0.6), 0.03, -22, 0.9, 0.003, 0.4)
    put("cristales", 0.05, -24, 1.6, 0.003, 0.6)
    put("latido", 0.2, -24, 0.7)
    for k, t0 in enumerate(np.arange(0.9, c["puntales"] + 0.6, 1.0)):
        g = 1.0 if t0 < c["puntales"] else 0.5
        put(_pitch(barra, 0.45 + 0.05 * (k % 3)), t0 + 0.2 * np.sin(k), -31 + 5 * (1 - g), 0.7, 0.02, 0.3)
    put(_loop(_pitch(w2, 0.5), 6.0), 0.0, -36, 5.0, 0.01, 2.5, track=amb)      # las ruedas que aún giran
    put("latido", c["dentro"] - 0.05, -22, 0.7)
    for k in range(3):
        put(_pitch(golpe, 2.6), c["dentro"] + 0.25 + 0.17 * k, -28 - k, 0.12, 0.002, 0.06)
    put(_pitch(toque, 0.8), c["mover"] - 0.03, -27, 0.4)
    put(_pitch(toque, 0.7), c["milimetro"] - 0.02, -25, 0.4)
    # nunca lo pones derecho: el fantasma… error; tal como lo encuentras: bien
    put(_pitch(wh, 0.8), c["nunca"] - 0.1, -26, 1.0)
    put("fallo", c["derecho"] + 0.25, -23, 0.6)
    put("acierto", c["estabiliza"] - 0.03, -24, 0.9)
    # A: cuñas y calzos (un golpe por apoyo; notas que suben)
    put(_pitch(wh, 0.75), c["ruedas"] - 0.35, -26, 1.0)
    for i in range(2):
        put(_pitch(golpe, 1.5), c["cunas3"] - 0.15 + 0.35 * i + 0.45, -22, 0.4, 0.003, 0.2)
    for i, t0 in enumerate(blk):
        put(_pitch(w2, 1.6), t0 - 0.45, -31, 0.4, 0.02, 0.1)
        put(_pitch(golpe, 1.25), t0, -21, 0.45, 0.003, 0.25)
        put(_pitch(nota, 1.0 * 1.122 ** i), t0 + 0.02, -27, 0.6)
    put("acierto", blk[2] + 0.05, -27, 0.8)
    # B: los puntales se levantan, se alargan (carraca), muerden la chapa y la cinta tensa
    put(_pitch(wh, 0.75), c["lado"] - 0.35, -26, 1.0)
    for d in (0.0, 0.3):
        put(_pitch(barra, 0.9), s0 + d, -24, 0.6, 0.005, 0.3)
        n = 9
        for k in range(n):
            put(_pitch(tic, 2.0), s0 + d + 0.6 + k * (s1 - s0 - 0.6) / n, -31, 0.08)
    put(clac, bite, -18, 0.5)
    put(_pitch(_onset(_load("golpe")), 0.8), bite, -22, 0.6, 0.003, 0.3)
    put("destello", bite + 0.03, -25, 0.5)
    for d in (0.0, 0.3):
        for k in range(5):
            put(_pitch(tic, 1.4), bite + d + 0.1 + 0.07 * k, -29, 0.08)
    put("acierto", bite + 0.3, -24, 0.9)
    # C: las cuñas entre el capó y el suelo
    put(_pitch(wh, 0.75), c["boca"] - 0.35, -26, 1.0)
    for i in range(4):
        put(_pitch(w2, 1.5), c["cunas5"] - 0.15 + 0.25 * i, -32, 0.35, 0.02, 0.1)
        put(_pitch(golpe, 1.3), c["cunas5"] - 0.15 + 0.25 * i + 0.5, -22, 0.4, 0.003, 0.2)
    put(_pitch(toque, 1.1), c["capo"] - 0.03, -28, 0.35)
    put(_pitch(toque, 0.9), c["suelo"] - 0.03, -28, 0.35)
    # la pregunta: las tres letras
    put(_pitch(wh, 0.6), c["ahora"] - 0.3, -25, 1.2)
    put("tension", c["ahora"], -31, c["compartir"] - c["ahora"] - 0.3, 0.3, 0.3, track=amb)
    put(_pitch(toque, 0.8), c["estable"] - 0.03, -25, 0.4)
    for k, key in enumerate(("oA", "oB", "oC")):
        put(_pitch(nota, 1.0 * 1.122 ** k), c[key] - 0.25, -26, 0.6)
        put(_pitch(bub, 1.0 + 0.1 * k), c[key] - 0.3, -26, 0.2)
    put(_pitch(toque, 1.3), c["comenta"] - 0.03, -25, 0.35)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    fuego = _load("fuego")
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def _zumbido(dur, seed=3):
    """Zumbido eléctrico (50 Hz y armónicos, con chisporroteo suave), estéreo, ≈ ±1."""
    SR = sfx.SR; n = int(dur * SR); t = np.arange(n) / SR; rs = np.random.RandomState(seed)
    y = sum(np.sin(2 * np.pi * 50 * h * t + rs.rand() * 6) / h ** 0.7 for h in (1, 2, 3, 4, 6, 8))
    y = np.tanh(1.4 * y) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.7 * t))
    cr = (rs.rand(n) < 0.002) * rs.randn(n); cr = np.convolve(cr, np.exp(-np.arange(200) / 30), "same")
    out = np.stack([y + 0.6 * cr, np.roll(y, 9) + 0.6 * np.roll(cr, 13)], 1)
    return out / (np.abs(out).max() + 1e-9)


def _arco(dur, seed=5):
    """Arco eléctrico: chasquidos y crepitar de alta frecuencia, estéreo."""
    SR = sfx.SR; n = int(dur * SR); rs = np.random.RandomState(seed)
    imp = (rs.rand(n) < 0.03) * rs.randn(n) * (1 + 3 * (rs.rand(n) < 0.002))
    k = np.exp(-np.arange(120) / 12) * np.sin(np.arange(120) * 1.7)
    y = np.convolve(imp, k, "same") + 0.25 * rs.randn(n) * (rs.rand(n) < 0.3)
    env = np.exp(-np.linspace(0, 3.5, n)) * (1 - np.exp(-np.linspace(0, 60, n)))
    out = np.stack([y * env, np.roll(y, 7) * env], 1)
    return out / (np.abs(out).max() + 1e-9)


def sfx_track_oro(path):
    """«Has cortado la luz. ¿Ya puedes tocar el cable?» (5 reglas de oro): la noche junto a la nave (viento, incendio
    dentro), el guante que se acerca, el «¡no!», el clac de la palanca que alguien sube, el zumbido de la corriente y el
    chisporroteo del cable pelado, el arco (te mata), las monedas de oro, y cada regla con su sonido: la palanca que abre
    (el zumbido se corta), el candado, el detector que toca tres veces sin pitar, las pinzas y la pica, los conos y la
    cinta; la pregunta y la venta. Tiempos como en oro.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    g0, g1, zap = c["alguien"] + 0.1, c["vuelve"] + 0.35, c["mata"] - 0.02
    o0, o1 = c["abres"] - 0.1, c["abres"] + 0.55
    tt = [c["compruebas"] + 0.05 + i * max(0.35, (c["tension"] + 0.4 - c["compruebas"]) / 3) for i in range(3)]
    cl = [c["cuatro"] - 0.05 + i * 0.32 for i in range(3)]
    nota, toque, bub, tic = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja")), _onset(_load("tic"))
    golpe = _onset(_load("golpe")); barra = _onset(_load("barra")); w2 = _onset(_load("whoosh2")); wh = _onset(_load("whoosh"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # la noche junto a la nave
    put(_loop(_load("aire"), END + 0.5), 0.0, -31, T["fin"], 0.3, 1.0, track=amb)
    put(_loop(_load("fuego"), END + 0.5), 0.0, -41, T["fin"], 0.6, 1.0, track=amb)
    put(_loop(_load("motor"), END + 0.5), 0.0, -42, T["fin"], 0.6, 1.0, track=amb)
    put("tension", 0.0, -31, c["no1"], 0.2, 0.2, track=amb)
    put("latido", 0.25, -24, 0.7); put("latido", 1.25, -24, 0.7)
    put(_pitch(wh, 0.7), 0.1, -29, 1.4)
    # ¡no!
    put("golpe", c["no1"] - 0.02, -20, 0.8, 0.003, 0.35)
    put("fallo", c["no1"] + 0.02, -25, 0.5)
    # alguien la vuelve a dar: la palanca sube (clac), corre la corriente y el arco
    put(_pitch(wh, 1.0), c["alguien"] - 0.3, -27, 0.8)
    put(_pitch(barra, 0.8), g1 - 0.05, -21, 0.7, 0.003, 0.3)
    put(_pitch(golpe, 1.6), g1 - 0.03, -21, 0.4, 0.003, 0.2)
    hum = _zumbido(o1 - g1 + 0.3)
    put(hum, g1, -30, o1 - g1 + 0.05, 0.02, 0.05, track=amb)
    put(_arco(o1 - g1 + 0.3, 9), g1 + 0.2, -33, o1 - g1 - 0.15, 0.05, 0.05, track=amb)
    put(_pitch(w2, 2.2), g1 + 0.05, -27, zap - g1, 0.02, 0.02)
    put(_arco(1.0, 11), zap, -19, 0.9, 0.002, 0.3)
    put(_pitch(golpe, 0.7), zap, -18, 0.8, 0.003, 0.4)
    put("latido", zap + 0.2, -21, 0.7)
    # cinco reglas de oro, en orden
    put(_pitch(wh, 0.7), c["cinco"] - 0.4, -27, 1.0)
    for i in range(5):
        put(_pitch(bub, 1.0 + 0.08 * i), c["cinco"] + 0.08 * i, -28, 0.15, 0.001, 0.05)
    put(w2, c["orden"] - 0.1, -29, 0.6)
    for i, key in enumerate(("abres", "bloqueas", "compruebas", "tierra", "senalizas")):
        put(_pitch(nota, 1.0 * 1.122 ** i), c[key] - 0.03, -26, 0.8)
        put("destello", c[key] - 0.05, -30, 0.5)
    # 1: la palanca baja (el zumbido se corta) y se ve el corte
    put(_pitch(barra, 0.75), o1 - 0.05, -20, 0.8, 0.003, 0.35)
    put(_pitch(golpe, 1.3), o1 - 0.03, -21, 0.4, 0.003, 0.2)
    put(_pitch(toque, 1.2), c["vea"] - 0.03, -28, 0.35)
    # 2: el candado (clic) y el cartel
    put(_pitch(tic, 0.9), c["candado"] + 0.2, -22, 0.15)
    put(_pitch(tic, 1.6), c["candado"] + 0.26, -24, 0.12)
    put(_onset(_load("papeles")), c["cartel"] - 0.1, -29, 0.5)
    # 3: el detector toca los tres bornes… y no pita
    for t0 in tt:
        put(_pitch(tic, 2.2), t0, -27, 0.1)
    put("acierto", c["tension"] + 0.05, -25, 0.8)
    # 4: las pinzas (clic, clic, clic), la pica (dos golpes) y el «algo más»
    for t0 in cl:
        put(_pitch(tic, 1.1), t0 + 0.1, -23, 0.15)
        put(_pitch(golpe, 2.0), t0 + 0.11, -27, 0.2, 0.003, 0.1)
    for k in range(2):
        put(_pitch(golpe, 1.2), c["tierra"] - 0.2 + 0.18 * k, -22, 0.3, 0.003, 0.15)
    put(_pitch(toque, 0.75), c["algo"] + 0.05, -25, 0.4)
    put(_pitch(nota, 0.84), c["olvidan"] - 0.05, -27, 0.6)
    # 5: los conos y la cinta
    for i in range(4):
        put(_pitch(golpe, 1.7), c["cinco7"] + 0.05 + 0.13 * i + 0.1, -26, 0.25, 0.003, 0.12)
    put(_pitch(w2, 1.4), c["senalizas"] + 0.1, -28, 0.8, 0.02, 0.2)
    # la pregunta
    put(_pitch(wh, 0.7), c["falta"] - 0.3, -26, 1.0)
    put("tension", c["falta"], -31, c["compartir"] - c["falta"] - 0.3, 0.3, 0.3, track=amb)
    put(_pitch(toque, 0.8), c["cuarta"] - 0.03, -25, 0.4)
    put(_pitch(toque, 1.3), c["comenta"] - 0.03, -25, 0.35)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    fuego = _load("fuego")
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_forestal(path):
    """«Este incendio tiene cabeza, cola… ¡y dedos!» (partes de un incendio forestal): el rugido del incendio sigue a su
    tamaño (el mismo F(t) que forestal.js: fuerte en el gancho, se rebobina hasta casi nada y vuelve a crecer), viento y
    chasquidos; un toque en cada rótulo, el sello del examen, el rebobinado (al revés), la chispa del origen, la ráfaga de
    viento, el perímetro que se dibuja, la lengua que se escapa, la pavesa que silba y prende fuera, las letras, el papel de
    los apuntes y la venta."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    rw0, rw1 = c["cae"] - 0.05, c["nace"] - 0.12
    j0 = c["pavesa"] + 0.05
    j1 = max(c["fuera"] + 0.12, j0 + 0.8)
    nota, toque, bub, tic = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja")), _onset(_load("tic"))
    golpe = _onset(_load("golpe")); w2 = _onset(_load("whoosh2")); wh = _onset(_load("whoosh")); fuego = _load("fuego")

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # el tamaño del incendio en cada instante (como FK en forestal.js) → volumen del rugido
    FK = [(0, 0.985), (rw0, 1.0), (rw1, 0.0), (c["origen"] + 0.35, 0.03), (c["viento"], 0.055), (c["caliente"] + 0.3, 0.33),
          (c["flancos"] + 0.45, 0.42), (c["despacio"] + 0.4, 0.5), (c["perimetro"] + 0.6, 0.555), (c["dedo"] + 0.45, 0.76),
          (c["bolsa"] + 0.4, 0.82), (c["isla"] + 0.4, 0.86), (j1, 0.904), (c["empiezas"], 0.97), (c["apuntes"], 1.0), (END, 1.03)]
    tk = [FK[0][0]]
    for t0, _ in FK[1:]:
        tk.append(max(t0, tk[-1] + 0.12))
    ts = np.arange(N2) / sfx.SR
    Ft = np.interp(ts, tk, [f for _, f in FK])
    paper = np.clip((ts - c["apuntes"]) / 0.6, 0, 1)
    roar = (0.06 + 0.94 * np.clip(Ft / 0.6, 0, 1) ** 1.3) * (1 - 0.85 * paper)
    fl = _to(_loop(fuego, END + 1.0), -27)[:N2]
    amb[:len(fl)] += fl * roar[:len(fl), None]
    put(_loop(_load("aire"), END + 0.5), 0.0, -32, T["fin"], 0.3, 1.0, track=amb)
    br = _to(_loop(_load("brasas"), END + 1.0), -33)[:N2]
    amb[:len(br)] += br * (0.3 + 0.7 * np.clip(Ft / 0.4, 0, 1))[:len(br), None] * (1 - paper)[:len(br), None]
    # el gancho: cabeza, cola… ¡y dedos!
    put(_pitch(wh, 0.7), 0.05, -28, 1.3)
    for k, f in (("cabeza1", 1.0), ("cola1", 1.12), ("dedos", 1.26)):
        put(_pitch(toque, f), c[k] - 0.02, -24, 0.4)
    put(_pitch(golpe, 1.4), c["dedos"] + 0.05, -26, 0.3, 0.003, 0.15)
    # siempre cae en el examen: el sello; el rebobinado (al revés) hasta la chispa
    put("golpe", c["examen"] + 0.1, -21, 0.7, 0.003, 0.3)
    put(_pitch(w2, 1.3)[::-1].copy(), rw0, -25, max(0.4, rw1 - rw0), 0.05, 0.05)
    put(_pitch(fuego[: int(3 * sfx.SR)], 2.4)[::-1].copy(), rw0 + 0.05, -31, max(0.3, rw1 - rw0 - 0.1), 0.1, 0.05)
    # nace aquí: la chispa
    put("destello", c["nace"] - 0.05, -26, 0.6)
    put(_pitch(tic, 1.8), c["nace"] + 0.1, -26, 0.12)
    put(fuego[int(0.2 * sfx.SR):], c["origen"] - 0.2, -31, 0.9, 0.05, 0.4)
    put(_pitch(toque, 0.9), c["origen"] - 0.02, -24, 0.4)
    # el viento lo empuja; la cabeza, lo más caliente
    put(_pitch(wh, 0.6), c["viento"] - 0.15, -23, 1.4, 0.05, 0.5)
    put(_pitch(w2, 0.8), c["empuja"], -27, 1.0)
    put(_pitch(toque, 1.0), c["cabeza"] - 0.02, -24, 0.4)
    put(fuego[int(0.3 * sfx.SR):], c["caliente"] - 0.25, -24, 1.2, 0.08, 0.5)
    put(_pitch(golpe, 0.75), c["caliente"] - 0.02, -24, 0.6, 0.003, 0.3)
    # los flancos, la cola
    put(_pitch(toque, 1.12), c["flancos"] - 0.02, -24, 0.35)
    put(_pitch(toque, 1.26), c["flancos"] + 0.14, -25, 0.35)
    put(_pitch(nota, 0.75), c["cola"] - 0.02, -26, 0.7)
    # el perímetro se dibuja
    put(_pitch(w2, 1.6), c["borde"] - 0.05, -27, max(0.6, c["perimetro"] + 0.35 - c["borde"]), 0.05, 0.2)
    put(_pitch(nota, 1.12), c["perimetro"] - 0.02, -25, 0.7)
    # la lengua que se estira: un dedo
    put(_pitch(wh, 1.1), c["lengua"] - 0.1, -24, 1.1, 0.02, 0.4)
    put(fuego[int(0.5 * sfx.SR):], c["estira"] - 0.1, -27, 1.0, 0.05, 0.4)
    put(_pitch(toque, 1.33), c["dedo"] - 0.02, -24, 0.4)
    # la bolsa, la isla
    put(_pitch(bub, 0.9), c["bolsa"] - 0.02, -25, 0.15, 0.001, 0.05)
    put(_pitch(toque, 1.0), c["bolsa"] + 0.02, -26, 0.35)
    put(_pitch(bub, 1.2), c["isla"] - 0.02, -25, 0.15, 0.001, 0.05)
    put(_pitch(toque, 1.19), c["isla"] + 0.02, -26, 0.35)
    # la pavesa salta (silbido que sube y baja) y prende fuera
    n = int((j1 - j0) * sfx.SR)
    u = np.linspace(0, 1, max(n, 2))
    fr = 900 + 900 * np.sin(np.pi * u)
    ph = 2 * np.pi * np.cumsum(fr) / sfx.SR
    wsl = (np.sin(ph) * (0.6 + 0.4 * np.random.default_rng(5).random(len(u))) * np.sin(np.pi * u) ** 0.5)[:, None] * np.ones((1, 2))
    put(wsl, j0, -33, j1 - j0, 0.05, 0.05)
    put(_pitch(wh, 1.4), j0, -29, j1 - j0)
    put(_pitch(golpe, 1.8), j1 - 0.02, -27, 0.3, 0.003, 0.15)
    put(fuego[int(0.25 * sfx.SR):], j1, -27, 1.4, 0.03, 0.5)
    put(_pitch(toque, 0.84), c["foco"] - 0.02, -24, 0.4)
    # ¿por dónde empiezas a apagarlo? A, B, C o D
    put(_pitch(wh, 0.7), c["empiezas"] - 0.35, -26, 1.0)
    put("tension", c["empiezas"], -31, c["compartir"] - c["empiezas"] - 0.3, 0.3, 0.3, track=amb)
    for i, k in enumerate(("letA", "letB", "letC", "letD")):
        put(_pitch(bub, 1.0 + 0.12 * i), c[k] - 0.02, -24, 0.14, 0.001, 0.05)
    # los apuntes: el monte se vuelve papel
    put(_onset(_load("papeles")), c["apuntes"] - 0.15, -24, 0.9, 0.01, 0.3)
    put("flip", c["apuntes"] + 0.05, -26, 0.5)
    put(_pitch(nota, 1.26), c["elite"] - 0.02, -27, 0.6)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def _siseo(dur, seed=3):
    """Aire que entra en un cojín: ruido agudo filtrado con un leve temblor."""
    n = int(dur * sfx.SR)
    w = np.random.default_rng(seed).standard_normal(n)
    hp = np.diff(w, prepend=0.0)
    k = 6
    lp = np.convolve(hp, np.ones(k) / k, "same")
    tt = np.arange(n) / sfx.SR
    y = lp * (0.8 + 0.2 * np.sin(2 * np.pi * 7.3 * tt))
    return np.stack([y, y * 0.96], 1)


def sfx_track_cojines(path):
    """«Un coche encima de una pierna… y este cojín lo levanta» (cojines de alta presión): noche en la carretera (viento,
    motor de la autobomba al ralentí), latido en el gancho, el cojín que entra arrastrándose, el aire que sisea mientras se
    hincha cada cojín (delante; luego la pila de atrás; luego la pregunta), el coche que cruje al subir, el manómetro, el
    sello del «¡NO!», los bloques y las cuñas, la pregunta de Bomberados y la venta. Tiempos como en cojines.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    nota, toque, bub, tic = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja")), _onset(_load("tic"))
    golpe = _onset(_load("golpe")); w2 = _onset(_load("whoosh2")); wh = _onset(_load("whoosh"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    put(_loop(_load("aire"), END + 0.5), 0.0, -31, T["fin"], 0.3, 1.0, track=amb)
    put(_loop(_load("motor"), END + 0.5), 0.0, -37, T["fin"], 0.6, 1.0, track=amb)
    put("tension", 0.0, -32, c["levanta1"], 0.2, 0.3, track=amb)
    for k in range(3):
        put("latido", 0.2 + 0.85 * k, -23, 0.7)
    # el cojín entra (se arrastra por el asfalto) y el guante
    sl0, sl1 = c["cojin"] - 0.55, c["cojin"] + 0.6
    put(_pitch(_onset(_load("papeles")), 0.7), sl0, -27, sl1 - sl0, 0.05, 0.15)
    put(_pitch(toque, 1.1), c["libreta"] - 0.02, -26, 0.35)
    # el aire: delante (sube), la pila de atrás, la pregunta
    for t0, t1, db, sd in ((c["levanta1"] - 0.15, c["mucho"] + 0.25, -29, 3), (c["no"] - 0.05, c["pequeno"] + 0.4, -28, 5), (c["infla"] - 0.05, c["letC"] + 0.3, -32, 7)):
        put(_siseo(t1 - t0 + 0.3, sd), t0, db, t1 - t0, 0.08, 0.15)
    # el coche cruje al subir
    for t0 in (c["levanta1"] + 0.1, c["levanta1"] + 0.7, c["mucho"] - 0.3, c["alto"] - 0.1, c["levante"]):
        put(_pitch(golpe, 0.55), t0, -27, 0.5, 0.01, 0.3)
    put(_pitch(tic, 1.5), c["doce"] - 0.02, -26, 0.12); put(_pitch(tic, 1.8), c["doce"] + 0.1, -28, 0.1)
    put(_pitch(nota, 0.84), c["sesenta"] - 0.03, -26, 0.8); put("destello", c["toneladas"] - 0.05, -29, 0.5)
    put(_pitch(toque, 1.26), c["medio"] - 0.02, -26, 0.35)
    # la pila: entran el grande y el pequeño
    put(_pitch(w2, 1.3), c["pones"] - 0.35, -29, 0.7)
    put(_pitch(golpe, 1.6), c["pones"] + 0.38, -27, 0.25, 0.003, 0.12)
    put(_pitch(golpe, 1.9), c["dos"] + 0.53, -27, 0.25, 0.003, 0.12)
    put(_pitch(toque, 0.9), c["doble"] - 0.02, -25, 0.4)
    # ¡no!
    put("golpe", c["no"] - 0.02, -20, 0.8, 0.003, 0.35)
    put("fallo", c["no"] + 0.02, -25, 0.5)
    put(_pitch(nota, 1.12), c["pequeno"] - 0.03, -25, 0.7)
    # el grande abajo (✓) y al revés (✗)
    put("fallo", c["grande"] + 0.05, -29, 0.4)
    put("acierto", c["centrado"] - 0.05, -27, 0.7)
    # bloques y cuñas
    for i in range(3):
        put(_pitch(golpe, 1.3 + 0.15 * i), c["calzas"] - 0.15 + i * 0.22 + 0.55, -24, 0.3, 0.003, 0.15)
    put(_pitch(w2, 0.9), c["sube7"] + 0.15, -30, 1.0)
    # la pregunta de Bomberados
    put(_pitch(wh, 0.7), c["infla"] - 0.35, -26, 1.0)
    put("tension", c["infla"], -31, c["compartir"] - c["infla"] - 0.3, 0.3, 0.3, track=amb)
    for i, k in enumerate(("letA", "letB", "letC")):
        put(_pitch(bub, 1.0 + 0.12 * i), c[k] - 0.02, -24, 0.14, 0.001, 0.05)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    fuego = _load("fuego")
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_track_percutor(path):
    """«¿Sabes qué es esto?» (percutor rompecristales): noche en la carretera, el tintineo del llavero, el chasquido del muelle
    y el cristal que estalla (tres veces: el gancho, sin lámina —con los trocitos cayendo— y con lámina, apagado), el
    rebobinado, la lámina que se pega, el cristal que sale entero, la pregunta y la venta de Élite. Tiempos como en
    percutor.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    T = dict(c)
    T["fin"] = c["compartir"] - 0.25
    tA, rA0, rA1 = c["coche"] - 0.05, c["percutor"] - 0.1, c["rompe"] + 0.35
    tB, fB, rB0 = c["estalla"] - 0.1, c["trocitos"] - 0.1, c["primero"] - 0.35
    tC, pC = c["golpeas"] + 0.05, c["pieza"] - 0.35
    nota, toque, bub, tic = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja")), _onset(_load("tic"))
    golpe = _onset(_load("golpe")); w2 = _onset(_load("whoosh2")); wh = _onset(_load("whoosh")); cris = _onset(_load("cristales"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    put(_loop(_load("aire"), END + 0.5), 0.0, -31, T["fin"], 0.3, 1.0, track=amb)
    put(_loop(_load("motor"), END + 0.5), 0.0, -38, T["fin"], 0.6, 1.0, track=amb)
    put("tension", 0.0, -32, c["revienta"], 0.2, 0.3, track=amb)
    # el llavero
    for k in range(3):
        put(_pitch(tic, 2.4 + 0.3 * k), c["llavero"] + 0.08 * k, -29, 0.08)
    put(_pitch(toque, 1.0), c["esto"] - 0.02, -25, 0.4)
    # 1: revienta (y se rebobina)
    put(_pitch(tic, 1.4), tA - 0.03, -21, 0.1)
    put(cris, tA, -18, 1.1, 0.002, 0.4)
    put(_pitch(golpe, 1.5), tA, -22, 0.3, 0.002, 0.15)
    put(_pitch(w2, 1.3)[::-1].copy(), rA0, -26, rA1 - rA0, 0.05, 0.05)
    put(_pitch(nota, 1.0), c["percutor"] - 0.02, -26, 0.7)
    # el muelle se carga y suelta la punta
    put(_pitch(_load("tension"), 1.6), c["aprietas"], -32, c["punta"] - c["aprietas"], 0.1, 0.02)
    put(_pitch(tic, 0.8), c["punta"] + 0.02, -18, 0.12)
    put(_pitch(golpe, 2.2), c["punta"] + 0.02, -23, 0.2, 0.002, 0.1)
    put(_pitch(toque, 1.26), c["punto"] - 0.02, -26, 0.35)
    # 2: estalla entero; los trocitos caen sobre el herido; rebobinado
    put(_pitch(cris, 0.9), tB, -19, 1.2, 0.002, 0.4)
    put(_pitch(cris, 1.15), fB, -24, 1.6, 0.02, 0.5)
    put("latido", c["herido"] - 0.1, -23, 0.7)
    put(_pitch(w2, 1.3)[::-1].copy(), rB0, -27, 0.7, 0.05, 0.05)
    # 3: la lámina (se pega) y el golpe: se agrieta sin caer y sale de una pieza
    put(_pitch(_onset(_load("papeles")), 1.2), c["lamina"] - 0.05, -25, c["adhesiva"] + 0.55 - c["lamina"], 0.03, 0.15)
    put(_pitch(tic, 1.4), tC - 0.03, -21, 0.1)
    put(_pitch(cris, 0.75), tC, -24, 0.5, 0.002, 0.25)
    put(_pitch(nota, 1.12), c["pegados"] - 0.03, -26, 0.7)
    put(_pitch(wh, 0.8), pC, -27, 1.1)
    put("acierto", c["pieza"] - 0.03, -25, 0.8)
    # la pregunta
    put(_pitch(wh, 0.7), c["parabrisas"] - 0.35, -26, 1.0)
    put("tension", c["parabrisas"], -31, c["compartir"] - c["parabrisas"] - 0.3, 0.3, 0.3, track=amb)
    put(_pitch(bub, 1.0), c["si"] - 0.02, -24, 0.14, 0.001, 0.05)
    put(_pitch(bub, 1.2), c["no"] - 0.02, -24, 0.14, 0.001, 0.05)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", T["fin"] - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    fuego = _load("fuego")
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", T["fin"], -36, END - T["fin"], 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())

def _pass_alarma(dur, seed=1):
    """Alarma personal (bodyguard) de un ERA: pitidos agudos que suben, 4 por segundo."""
    n = int(dur * sfx.SR); tt = np.arange(n) / sfx.SR
    on = ((tt % 0.25) < 0.14).astype(float)
    f = 2700 + 900 * ((tt % 1.0) ** 1.5)
    ph = 2 * np.pi * np.cumsum(f) / sfx.SR
    x = 0.55 * np.sin(ph) + 0.25 * np.sign(np.sin(ph)) + 0.12 * np.sin(2 * ph)
    env = np.convolve(on, np.ones(96) / 96, "same")
    y = x * env
    return np.stack([y, y * 0.97], 1)


def _respira(dur, inspira=True, seed=5):
    """Respiración por el pulmoautomático: al inspirar, siseo de la válvula; al espirar, soplo con el clac de la válvula."""
    n = int(dur * sfx.SR); tt = np.arange(n) / sfx.SR
    w = np.random.default_rng(seed).standard_normal(n)
    if inspira:
        hp = np.diff(w, prepend=0.0); y = np.convolve(hp, np.ones(5) / 5, "same")
        e = np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 0.7
    else:
        y = np.convolve(w, np.ones(18) / 18, "same") * 3.0
        y = y * (1 + 0.35 * np.sin(2 * np.pi * 31 * tt))
        e = np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.2
    y = y * e
    if not inspira:
        k = int(0.012 * sfx.SR); y[:k] += np.hanning(2 * k)[:k] * 0.6 * np.sign(np.random.default_rng(seed + 1).standard_normal(k))
    return np.stack([y, y * 0.95], 1)


def sfx_track_era(path):
    """«Tu botella va a 300 bares» (las 10 piezas del ERA), de día en la calle: ciudad y fuego, el escáner de rayos X, el
    golpe rojo que subiría a la boca y los pulmones que revientan (rebobinado), el grifo que se abre (chorro de aire y el
    silbato que pía un instante), el manorreductor (300 → 7), la de alta y la aguja, el ⏩ hasta la reserva con el SILBATO de
    verdad, la de media, la respiración por el pulmoautomático, la espaldera, dentro del humo la alarma del bodyguard y la
    linterna, las diez a la vez y la venta. Tiempos como en era.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    fin = c["compartir"] - 0.25
    r0, boca = c["llegaran"] - 0.05, c["boca"]
    rw0, rw1 = max(c["pulmones"] + 0.45, c["poreso"] - 0.55), c["poreso"] - 0.02
    h1, h2 = c["grifo"] - 0.05, c["manorreductor"] - 0.05
    a0, a1 = c["manguera"] - 0.05, c["manom"] - 0.05
    tl0, tl1 = c["silbato"] + 0.15, c["pita"] - 0.04
    rv0, rv1 = max(c["pita"] + 1.0, c["media"] - 0.45), c["media"] - 0.12
    m0, m1 = c["media"] - 0.05, c["pulmo"] - 0.02
    ex0, ex1, in0, in1 = c["solo"] - 0.05, c["inspiras"] - 0.15, c["inspiras"] - 0.1, c["mascara"] - 0.05
    al0, al1 = c["pita2"] - 0.05, c["cuantas"] - 0.1
    b0, sumT = c["encuentren"] - 0.25, c["cuantas"] + 0.45
    dentro0, dentro1 = c["bodyguard"] + 0.2, c["cuantas"] + 0.3
    nota, toque, bub, tic = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja")), _onset(_load("tic"))
    golpe = _onset(_load("golpe")); w2 = _onset(_load("whoosh2")); wh = _onset(_load("whoosh")); vapor = _onset(_load("vapor"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # ambiente: la calle (fuera) y el fuego (más fuerte dentro del humo)
    put(_loop(_load("ciudad"), END + 0.5), 0.0, -33, dentro0, 0.3, 0.4, track=amb)
    put(_loop(_load("ciudad"), END + 0.5), dentro1, -34, fin - dentro1, 0.4, 1.0, track=amb)
    put(_loop(_load("fuego"), END + 0.5), 0.0, -31, dentro0, 0.3, 0.3, track=amb)
    put(_loop(_load("fuego"), END + 0.5), dentro0 - 0.2, -24, dentro1 - dentro0 + 0.2, 0.25, 0.35, track=amb)
    put(_loop(_load("fuego"), END + 0.5), dentro1, -32, fin - dentro1, 0.3, 1.0, track=amb)
    put(_loop(_load("motor"), END + 0.5), 0.0, -39, dentro0, 0.5, 0.3, track=amb)
    # el escáner de rayos X y los 300 bar
    put(_pitch(wh, 0.9), 0.0, -30, 0.9, 0.05, 0.2)
    put(_pitch(_load("tension"), 1.5), 0.0, -33, 0.9, 0.05, 0.15)
    put(_pitch(golpe, 0.8), c["trescientos"] - 0.02, -21, 0.5, 0.002, 0.2)
    put(_pitch(nota, 0.9), c["bares"] - 0.03, -27, 0.7)
    # el golpe rojo sube a la boca… y los pulmones revientan; se rebobina
    put(_pitch(w2, 0.85), r0, -25, boca - r0 + 0.05, 0.08, 0.04)
    put(_pitch(golpe, 1.1), boca, -20, 0.35, 0.002, 0.15)
    put(_pitch(vapor, 0.8), c["reventarian"] - 0.25, -27, c["pulmones"] - c["reventarian"] + 0.3, 0.25, 0.02)
    put("latido", c["reventarian"], -24, c["pulmones"] - c["reventarian"] + 0.05, 0.02, 0.05)
    put(_pitch(golpe, 0.6), c["pulmones"] + 0.04, -16, 0.6, 0.002, 0.3)
    put(_pitch(_onset(_load("cristales")), 0.7), c["pulmones"] + 0.05, -27, 0.4, 0.002, 0.2)
    put(_pitch(w2, 1.3)[::-1].copy(), rw0, -25, rw1 - rw0, 0.05, 0.05)
    # el grifo: la mano lo gira, sale el aire (y el silbato pía un instante) y el manorreductor lo baja: 300 → 7
    put(_pitch(_onset(_load("llave")), 0.9), h1 - 0.02, -26, h2 - h1, 0.01, 0.08)
    put(_pitch(vapor, 1.15), c["grifo"] + 0.02, -21, 0.75, 0.003, 0.4)
    put(_pitch(_onset(_load("silbato")), 1.0), c["grifo"] + 0.06, -31, 0.16, 0.005, 0.06)
    put(_pitch(nota, 1.06), c["manorreductor"] - 0.03, -27, 0.6)
    put("reloj_rapido", c["baja"] - 0.03, -28, c["siete"] - c["baja"] + 0.1, 0.01, 0.05)
    put(_pitch(toque, 1.33), c["siete"] - 0.02, -24, 0.5)
    # la de alta: el aire corre hasta el manómetro (la aguja sube a 300)
    put(_pitch(wh, 1.15), a0, -28, a1 - a0 + 0.1, 0.05, 0.1)
    put(_pitch(tic, 1.2), a1, -24, 0.12)
    put(_pitch(nota, 1.12), c["manom"] - 0.03, -27, 0.6)
    put(_pitch(toque, 1.0), c["silbato"] - 0.02, -27, 0.4)
    # ⏩ hasta la reserva… y el SILBATO; ⏪ vuelve a 300
    put("reloj_rapido", tl0, -26, tl1 - tl0, 0.05, 0.03)
    put(_onset(_load("silbato")), c["pita"] - 0.02, -19, rv0 - c["pita"] + 0.05, 0.005, 0.12)
    put(_pitch(w2, 1.35)[::-1].copy(), rv0, -26, rv1 - rv0 + 0.05, 0.03, 0.05)
    # la de media hasta el pulmoautomático (clac); la respiración: espira (no entra aire) e inspira (siseo)
    put(_pitch(wh, 1.3), m0, -29, m1 - m0 + 0.1, 0.05, 0.1)
    put(_pitch(tic, 0.7), c["pulmo"] - 0.01, -20, 0.12)
    put(_respira(max(0.3, ex1 - ex0), False), ex0, -27, ex1 - ex0, 0.02, 0.06)
    put(_respira(max(0.3, in1 + 0.3 - in0), True), in0, -25, in1 + 0.3 - in0, 0.03, 0.12)
    put(_respira(0.7, False, 9), in1 + 0.35, -30, 0.7, 0.02, 0.1)
    put(_pitch(nota, 1.0), c["mascara"] - 0.03, -28, 0.6)
    # la espaldera; el dron vuela hacia la puerta y entra en el humo
    put(_pitch(toque, 0.9), c["espaldera"] - 0.02, -27, 0.4)
    put(_pitch(w2, 0.8), c["espaldera"] + 0.45, -24, dentro0 - c["espaldera"] + 0.2, 0.1, 0.2)
    # dentro: la alarma del bodyguard (hasta que la cámara sale) y la linterna que le encuentra
    put(_pass_alarma(al1 - al0 + 0.6), al0, -24, al1 - al0 + 0.5, 0.02, 0.35)
    put(_pitch(tic, 1.6), b0, -24, 0.1)
    put("destello", b0 + 0.05, -30, 0.5, 0.002, 0.2)
    put(_pitch(w2, 1.0), c["cuantas"] - 0.05, -24, 0.9, 0.05, 0.25)
    # las diez a la vez (una cascada de toques) y «comenta tu número»
    for i in range(10):
        put(_pitch(bub, 1.0 + 0.06 * i), sumT + 0.07 * i, -27, 0.12, 0.001, 0.04)
    put("logro", sumT + 0.75, -27, 0.9)
    put(_pitch(bub, 1.2), c["comentaN"] - 0.02, -24, 0.14, 0.001, 0.05)
    # venta
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", fin - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    tM = c["marca"]
    fuego = _load("fuego")
    put(fuego[int(0.3 * sfx.SR):], tM - 0.3, -27, 0.9, 0.02, 0.3)
    put("brasas", fin, -36, END - fin, 0.4, 0.3, track=amb)
    put("marca", tM - 0.05, -26, 1.0, 0.002, 0.25)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())

def _carraca(dur, rate=16.0, seed=3):
    """Trinquete que carraca al tirar de la cuerda: clics metálicos cortos y regulares."""
    n = int(dur * sfx.SR); y = np.zeros(n); rng = np.random.default_rng(seed)
    k = int(0.006 * sfx.SR); tt = np.arange(k) / sfx.SR
    for i in range(int(dur * rate)):
        a = int((i + 0.15 * rng.random()) / rate * sfx.SR)
        if a + k >= n:
            break
        y[a:a + k] += np.exp(-tt * 900) * (np.sin(2 * np.pi * 3100 * tt) * 0.7 + rng.standard_normal(k) * 0.5)
    return np.stack([y, y * 0.96], 1)


def _cuerda_tensa(dur=0.5, f=180.0):
    """La cuerda que se pone tensa: un «tuang» grave que se apaga."""
    n = int(dur * sfx.SR); tt = np.arange(n) / sfx.SR
    y = np.sin(2 * np.pi * f * tt * (1 + 0.04 * np.exp(-tt * 20))) * np.exp(-tt * 7) + 0.4 * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 12)
    return np.stack([y, y * 0.97], 1)


def sfx_track_trinquete(path):
    """«La puerta se te cierra encima» (el trinquete de seguridad), de día en una carretera en cuesta: tráfico lejano, la
    autobomba al ralentí y la radio, los intermitentes; la puerta que se cierra (chirrido) y el golpe de la mano que la para;
    la tensión de la cuesta; el trinquete en la mano, los dos ganchos (clic), la carraca al tirar, la cuerda tensa, el
    trinquete que bloquea (clac), la puerta quieta (acierto), el collarín, la pregunta y la venta de Élite. Tiempos como en
    trinquete.js."""
    N2 = int((END + 1) * sfx.SR)
    out = np.zeros((N2, 2))
    amb = np.zeros((N2, 2))
    c = {k: at(v) for k, v in Q["cues"].items()}
    fin = c["compartir"] - 0.25
    sw0, sw1 = c["puerta"] - 0.05, c["encima"]
    p0, p1 = c["tiras"] - 0.05, c["suelto"] + 0.55
    nota, toque, bub, tic = _onset(_load("nota")), _onset(_load("toque")), _onset(_load("burbuja")), _onset(_load("tic"))
    golpe = _onset(_load("golpe")); w2 = _onset(_load("whoosh2")); wh = _onset(_load("whoosh")); llave = _onset(_load("llave"))

    def put(x, t0, db, dur, fi=0.005, fo=0.1, track=None, g=1.0):
        x = _onset(_load(x)) if isinstance(x, str) else x
        _put(out if track is None else track, _tramo(_to(x, db), max(0.05, dur), fi, fo), max(0.0, t0), g)

    # ambiente: tráfico lejano, la autobomba al ralentí, la radio y los intermitentes (al ritmo de las luces)
    put(_loop(_load("ciudad"), END + 0.5), 0.0, -36, fin, 0.3, 1.0, track=amb)
    put(_loop(_load("motor"), END + 0.5), 0.0, -37, fin, 0.5, 1.0, track=amb)
    put("radio", 0.35, -33, 2.2, 0.05, 0.3, track=amb)
    for k in range(int(fin * 1.6 * 2)):
        put(_pitch(tic, 0.55), k / 3.2, -40, 0.06, 0.001, 0.03, track=amb)
    # la puerta se cierra (chirrido) y la mano de B la para (golpe)
    put(_pitch(_load("tension"), 0.7), sw0, -30, sw1 - sw0, 0.2, 0.05)
    put(_pitch(wh, 0.6), sw0 + 0.4, -27, sw1 - sw0 - 0.35, 0.1, 0.05)
    put(_pitch(golpe, 1.0), sw1 - 0.02, -18, 0.4, 0.002, 0.2)
    put(_pitch(golpe, 1.8), sw1 + 0.02, -27, 0.2, 0.002, 0.1)
    # la cuesta: la puerta vuelve sola
    put("tension", c["cuesta"] - 0.1, -32, c["sabes"] - c["cuesta"], 0.3, 0.3)
    put(_pitch(_load("tension"), 0.55), c["vuelve"] - 0.1, -30, c["avisa"] - c["vuelve"] + 0.6, 0.15, 0.2)
    # ¿qué es esto? → el trinquete
    put(_pitch(llave, 1.3), c["esto"] - 0.35, -27, 0.4)
    put(_pitch(nota, 1.0), c["esto"] - 0.02, -25, 0.7)
    put(_pitch(toque, 1.2), c["trinquete"] - 0.02, -26, 0.5)
    # los dos ganchos (clic metálico) y la carraca al tirar
    put(_pitch(llave, 1.6), c["gancho"] + 0.3, -22, 0.3)
    put(_pitch(tic, 1.5), c["gancho"] + 0.32, -24, 0.1)
    put(_pitch(llave, 1.5), c["coche2"] + 0.28, -22, 0.3)
    put(_pitch(tic, 1.4), c["coche2"] + 0.3, -24, 0.1)
    put(_carraca(p1 - p0, 15.0), p0 + 0.05, -23, p1 - p0, 0.01, 0.05)
    # la cuerda se tensa; el trinquete bloquea («no la deja volver»); la puerta quieta
    put(_cuerda_tensa(0.6), c["tensa"] - 0.03, -24, 0.6, 0.002, 0.2)
    # la lupa de rayos X: aparece (zas suave) y la polea gira al tirar (clic, clic…) antes de que el trinquete bloquee
    put(_pitch(wh, 1.3), c["cuerda"] + 0.07, -30, 0.45, 0.02, 0.12)
    s0, s1 = c["cuerda"] + 0.3, c["trinquete2"] - 0.15
    put(_carraca(s1 - s0, 24.0, 7), s0, -27, s1 - s0, 0.01, 0.05)
    put(_pitch(tic, 0.9), c["trinquete2"] - 0.02, -24, 0.12)
    put(_pitch(golpe, 2.4), c["volver"] - 0.02, -21, 0.25, 0.002, 0.12)
    put(_pitch(tic, 0.7), c["volver"], -20, 0.12)
    put(_pitch(golpe, 1.4), c["puerta3"] + 0.12, -30, 0.25, 0.002, 0.12)
    put("acierto", c["mueve"] - 0.03, -25, 0.8)
    # el collarín (velcro) y la pregunta
    put(_pitch(_onset(_load("papeles")), 1.4), c["trabajas"] + 0.25, -28, 0.45, 0.01, 0.12)
    put(_pitch(wh, 0.7), c["conocias"] - 0.3, -27, 0.9)
    put(_pitch(bub, 1.0), c["si"] - 0.02, -24, 0.14, 0.001, 0.05)
    put(_pitch(bub, 1.2), c["no"] - 0.02, -24, 0.14, 0.001, 0.05)
    # venta (Élite)
    for k in ("compartir", "marca", "prueba"):
        put("destello", c[k] - 0.04, -24, 0.6, 0.002, 0.2)
    put("whoosh2", fin - 0.1, -28, 0.6)
    av = _onset(_load("avion"))
    put(av, c["compartir"], -28, 0.62, 0.02, 0.1)
    put(av, c["compartir"] + 0.6, -30, 0.6, 0.08, 0.15)
    put(bub, c["compartir"] + 1.2, -24, 0.12, 0.001, 0.04)
    put("marca", c["marca"] - 0.05, -26, 1.0, 0.002, 0.25)
    put(_loop(_load("ciudad"), END + 0.5), fin, -38, END - fin, 0.4, 0.3, track=amb)
    sp = np.zeros(N2 // 480 + 1)
    for w in WORDS:
        sp[int((w["start"] - 0.06) * 100):int((w["end"] + 0.06) * 100)] = 1
    sp = np.convolve(sp, np.ones(14) / 14, "same")
    duck = 1 - 0.5 * np.interp(np.arange(N2) / sfx.SR * 100, np.arange(len(sp)), sp)
    out += amb * duck[:, None]
    y = np.tanh(out) * 0.98
    import wave
    with wave.open(path, "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(sfx.SR)
        wv.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def sfx_any(path):
    if Q.get("formato") == "trinquete":
        return sfx_track_trinquete(path)
    if Q.get("formato") == "era":
        return sfx_track_era(path)
    if Q.get("formato") == "percutor":
        return sfx_track_percutor(path)
    if Q.get("formato") == "cojines":
        return sfx_track_cojines(path)
    if Q.get("formato") == "forestal":
        return sfx_track_forestal(path)
    if Q.get("formato") == "oro":
        return sfx_track_oro(path)
    if Q.get("formato") == "estab":
        return sfx_track_estab(path)
    if Q.get("formato") == "rsciei":
        return sfx_track_rsciei(path)
    if Q.get("formato") == "moto":
        return sfx_track_moto(path)
    if Q.get("formato") == "puno":
        return sfx_track_puno(path)
    if Q.get("formato") == "bloqguia":
        return sfx_track_bloqguia(path)
    if Q.get("formato") == "bloqueadores":
        return sfx_track_bloqueadores(path)
    if Q.get("formato") == "paneles":
        return sfx_track_paneles(path)
    if Q.get("formato") == "techo":
        return sfx_track_techo(path)
    if Q.get("formato") == "alfabeto":
        return sfx_track_alfabeto(path)
    if Q.get("formato") == "reto":
        return sfx_track_reto(path)
    if Q.get("formato") == "escala":
        return sfx_track_escala(path)
    if Q.get("formato") == "seguridad":
        return sfx_track_seguridad(path)
    if Q.get("formato") == "quiz":
        return sfx_track_quiz(path)
    if Q.get("formato") == "mangueras":
        return sfx_track_mangueras(path)
    if Q.get("formato") == "fomo":
        return sfx_track_fomo(path)
    if Q.get("formato") == "autobus":
        return sfx_track_autobus(path)
    if Q.get("formato") == "guardia":
        return sfx_track_guardia(path)
    if Q.get("formato") == "espuma":
        return sfx_track_espuma(path)
    if Q.get("formato") == "sueldos":
        return sfx_track_sueldos(path)
    if Q.get("formato") == "presion":
        return sfx_track_presion(path)
    if Q.get("formato") == "botella":
        return sfx_track_botella(path)
    if Q.get("formato") == "acoplamiento":
        return sfx_track_acoplamiento(path)
    if Q.get("formato") == "extintor":
        return sfx_track_extintor(path)
    if Q.get("formato") == "profeia":
        return sfx_track_profeia(path)
    if Q.get("formato") == "salones":
        return sfx_track_salones(path)
    if Q.get("formato") == "tetraedro":
        return sfx_track_tetra(path)
    if Q.get("formato") == "nota_prueba":
        return sfx_track_prueba(path)
    {"pas": sfx_track_pas, "leyes": sfx_track_leyes}.get(Q.get("intro"), sfx_track)(path)

def realce():
    """Momentos de venta (pregunta.json → "realce": ["compartir", "marca", "prueba"]): desde la palabra del cue hasta el final de
    su frase la voz sube +3 dB y los efectos bajan −8 dB (con rampas de 80 ms). Regla de Javi: «¡Bomberados!», «¡Pruébala gratis!»
    y «compártelo con tu compañero de oposición» son lo más destacado del vídeo."""
    rs = []
    for name in Q.get("realce", []):
        spec = Q["cues"][name]
        rs.append((at(spec) - 0.02, LINES[spec[2] - 1]["end"] + 0.12))
    return rs


def _envelope(rs, amount, ramp=0.08):    # expresión de ffmpeg: 1 fuera de los tramos, 1 + amount dentro
    if not rs:
        return "1"
    terms = "+".join(f"clip((t-{a:.3f})/{ramp},0,1)*clip(({b:.3f}-t)/{ramp},0,1)" for a, b in rs)
    return f"1+{amount}*min(1,{terms})"


def audio_filter():
    sv = Q.get("mezcla", {}).get("sfx", 0.35)
    gan = Q.get("mezcla", {}).get("ganancia", 0.0)          # dB sobre la mezcla final (antes del limitador)
    rs = realce()
    return ("[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,volume='" + _envelope(rs, 0.41) + "':eval=frame,aresample=48000,"
            "aformat=channel_layouts=stereo,apad[v];[2:a]volume=" + str(sv) + ",volume='" + _envelope(rs, -0.6) + "':eval=frame[s];"
            "[v][s]amix=inputs=2:duration=first:normalize=0,volume=" + str(gan) + "dB,alimiter=limit=0.841:level=disabled[a]")


def main():
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    sfxp = os.path.join(PROJ, "out", "sfx.wav")
    sfx_any(sfxp)
    dst = os.path.join(PROJ, "out", os.path.basename(PROJ) + os.environ.get("SUFIJO", "") + ".mp4")
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-i", sfxp, "-filter_complex",
           audio_filter(),
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
        sfx_any(os.path.join(PROJ, "out", "sfx.wav"))
    else:
        main()
