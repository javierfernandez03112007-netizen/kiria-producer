"""Compone «Ni una sola cámara» (lanzamiento de la web del estudio): fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos
palabra a palabra en Impact (cifras y precios en dorado o verde, «cámara» y «oyes» en rojo, la voz en celeste) + la voz de Danny
(ElevenLabs, el MP3 de Javi) + efectos SOLO de ElevenLabs, uno por suceso y cortados cuando el suceso termina.

    python3 ajustar_voz.py && python3 env_voz.py && python3 sfx_eleven.py
    WK=3 ./render_local.sh 0 N
    python3 projects/lanzamiento/compose_lan.py [--test t1 t2 ...] [--sfx]
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
END = float(int(LINES[-1]["end"] + 2.6) + (0 if (LINES[-1]["end"] + 2.6).is_integer() else 1))   # como en web/src/90_tail.js: Math.ceil(fin + 2,6)
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


def first(line):
    return LINES[line - 1]["words"][0]["start"] - 0.03


# ---------------------------------------------------------------- subtítulos
GO, R, WH = "#FFC24A", "#FF5A4E", "#EEF2F6"
BL, GR, TE, AM = "#8FE6FF", "#7CF0A9", "#62E3D4", "#FFB547"
_K = {1: {"3,2": GO, "millones": GO, "7": WH, "días": WH, "cámara": R},
      2: {"guion": WH, "primer": GO, "segundo": GO},
      3: {"voz": BL},
      4: {"3D": GO, "oyes": R},
      5: {"subtítulos": WH},
      6: {"sonido": BL},
      7: {"cuenta": WH, "negocio": WH, "kiria": GO}}
KEY = {li: {norm(w): c for w, c in d.items()} for li, d in _K.items()}
SUBS = None


def compose(fi):
    t = fi / FPS
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    SUBS.draw(img, t, 1 - prog(t, END - 0.5, 0.3))
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global SUBS
    SUBS = Subs(LINES, KEY, {}, y=330, size=96, style="accent", accent=hex_bgr(WH), stroke=8, face="impact")


# ---------------------------------------------------------------- efectos: SOLO de ElevenLabs (assets/sfx, ver sfx_eleven.py), cada uno en el
# instante en que pasa la cosa y cortado cuando termina (con un fundido corto): no queda nada sonando de fondo.
_CACHE = {}


def sample(name, sr):                             # mono 48 kHz, sin el silencio del principio, pico a 0,5
    if name not in _CACHE:
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(ROOT, "assets", "sfx", name + ".mp3"), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).astype(np.float64)
        x = x / (np.abs(x).max() + 1e-9) * 0.5
        on = np.flatnonzero(np.abs(x) > 0.02)
        _CACHE[name] = x[max(0, on[0] - int(0.004 * sr)):] if len(on) else x
    return _CACHE[name]


def times():                                       # los mismos instantes que web/src/20_anim.js (buildTimes)
    k32 = at("3,2")
    T = {"glyph": [k32 + 0.17, k32 + 0.34, k32 + 0.62, at("millones") + 0.05],
         "land": at("cámara") + 0.03, "slam": at("oyes") + 0.03, "suck": at("si") + 0.02,
         "words": [at("subtítulos") + 0.03, at("palabra") + 0.03, at("a", 1, 5) + 0.03, at("palabra", 2) + 0.03]}
    T["morph0"] = at("cámara") + 0.43
    return T


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((END + 1) * sr))

    def put(name, t0, dur, g=1.0, fade=0.08, start=0.0):
        x = sample(name, sr)[int(start * sr):][:max(1, int(dur * sr))].copy()
        fi = min(len(x), int(0.004 * sr)); x[:fi] *= np.linspace(0, 1, fi)
        fo = min(len(x), int(fade * sr)); x[len(x) - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
        sfx.mix(out, x, max(0.0, t0), g)

    def span(t0, t1):
        return max(0.15, t1 - t0)

    T = times()
    # 1: el cristal de la pantalla estalla y los objetos forman «3,2 M»; las ▶ suben; los 7 días; cae la cámara de cine y se queda en aristas
    put("estallido", 0.0, 1.1, 0.55, 0.35)
    for i, tg in enumerate(T["glyph"]):
        put("cifra", tg - 0.04, 0.4, 0.55 if i != 3 else 0.7, 0.15)
    put("notificaciones", at("visualizaciones") + 0.05, 1.0, 0.35, 0.3)
    put("dias", at("7") + 0.02, 0.7, 0.45, 0.2)
    put("cae", at("ni") - 0.2, span(at("ni") - 0.2, T["land"]), 0.4, 0.06)
    put("camara_suelo", T["land"] - 0.02, 0.7, 0.65, 0.25)
    put("glitch", T["land"] + 0.12, 0.45, 0.35, 0.2)
    # 2: las aristas forman el guion; se escribe; el gancho, en el primer segundo
    put("laser", T["morph0"] - 0.02, span(T["morph0"] - 0.02, at("guion") + 0.15), 0.4, 0.2)
    put("papel", at("guion") - 0.08, 0.5, 0.4, 0.2)
    put("teclea", at("que", 1, 2), 0.85, 0.32, 0.15)
    put("marcador", at("desde") - 0.02, 0.45, 0.4)
    put("cronometro", at("segundo") - 0.02, 0.35, 0.45)
    # 3: las líneas son la onda de la voz; 4: se construye el mazo en 3D y golpea en «oyes»
    put("onda", at("una", 1, 3) - 0.05, 0.75, 0.35, 0.25)
    put("construye", at("cada") - 0.02, span(at("cada") - 0.02, at("3D") + 0.05), 0.35, 0.2)
    put("solido", at("3D") - 0.02, 0.55, 0.45, 0.2)
    put("taco", at("que", 1, 4) - 0.02, 0.35, 0.4)
    put("tension", at("que", 1, 4) + 0.1, span(at("que", 1, 4) + 0.1, T["slam"] - 0.04), 0.35, 0.1)
    put("mazo", T["slam"] - 0.01, 1.0, 0.95, 0.35)
    # 5: las palabras caen una a una; 6: el sonido, efecto a efecto
    for i, tw in enumerate(T["words"]):
        put("palabra", tw - 0.01, 0.35, 0.5 if i else 0.6)
    for te in [at("sonido"), at("efecto"), at("a", 1, 6), at("efecto", 2)]:
        put("ping", te - 0.01, 0.5, 0.4, 0.2)
    # 7: todo se mete en el móvil; los resultados; tu negocio (toldo); comenta KIRIA
    put("absorbe", T["suck"] - 0.02, 0.55, 0.45, 0.2)
    put("contador", at("vídeos") + 0.0, 0.95, 0.35, 0.25)
    put("toldo", at("negocio") + 0.0, 0.65, 0.45, 0.2)
    put("burbuja", at("comenta") - 0.02, 0.35, 0.5)
    put("teclas", at("kiria") - 0.02, 0.5, 0.45, 0.15)
    put("enviado", at("kiria") + 0.73, 0.55, 0.4, 0.2)
    # bucle: los objetos vuelven a salir de la pantalla
    put("vuelve", END - 0.8, 0.8, 0.4, 0.05)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "lanzamiento.mp4")):
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    sfxp = os.path.join(ROOT, "out", "sfx.wav")
    sfx_track(sfxp)
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-i", sfxp, "-filter_complex",
           "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo,apad[v];[2:a]volume=0.8[s];[v][s]amix=inputs=2:duration=first:normalize=0,volume=1.6dB,alimiter=limit=0.89:level=false[a]",
           "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-maxrate", "7M", "-bufsize", "14M", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart", dst]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(int(os.environ.get("PROCS", 4)), initializer=init) as pool:
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
