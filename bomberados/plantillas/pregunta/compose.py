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
    put("rotativo", c["tres"] - 0.3, -33, c["dentro"] - c["tres"] + 0.3, 0.3, 0.4, track=amb)
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
    # los «rayos X»: aparecen, el agua corre (más aguda cuanto más rápido), el roce chisporrotea; «×7,8»
    put("destello", c["dentro"] - 0.15, -26, 0.7)
    put(_pitch(bub, 0.6), c["dentro"], -26, 0.5)
    put(agua, c["dentro"], -30, c["escribe"] - c["dentro"], 0.3, 0.4, track=amb)
    put(_pitch(agua, 1.7), c["deprisa"] - 0.1, -31, c["escribe"] - c["deprisa"], 0.4, 0.4, track=amb)
    put("vapor", c["roza"] - 0.1, -33, c["perdida"] - c["roza"] + 0.4, 0.3, 0.4, track=amb)
    put("golpe", c["perdida"] - 0.06, -24, 0.8, 0.005, 0.35)
    put("destello", c["perdida"] - 0.05, -28, 0.6)
    put("tension", c["estrecha"] - 0.1, -29, c["ocho"] - c["estrecha"] + 0.4, 0.3, 0.2)
    put("golpe", c["ocho"] - 0.05, -22, 0.9, 0.005, 0.4)
    put("destello", c["ocho"] - 0.08, -26, 0.7)
    put("vapor", c["corre"] - 0.1, -27, c["escribe"] - c["corre"], 0.2, 0.3)
    put(_pitch(_onset(_load("rele")), 1.3), c["roza2"] - 0.05, -27, 0.3)
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


def sfx_any(path):
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
