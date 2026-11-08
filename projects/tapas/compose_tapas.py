"""Compone «La tapa gratis no existe»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos
palabra a palabra en Impact + la voz de Javi (su MP3 de ElevenLabs, ajustada con ajustar_voz.py) + efectos SOLO de ElevenLabs
(assets/sfx de este proyecto, sfx_eleven.py, y algunos de otros vídeos del canal), uno por suceso y cortados cuando el suceso termina.

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N
    python3 projects/tapas/compose_tapas.py [--test t1 t2 ...] [--sfx]
"""
import json
import math
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
END = math.ceil((LINES[-1]["end"] + 1.25) * 2) / 2     # como en web/src/90_tail.js (52 s)
N = int(END * FPS)
FRAMES = os.path.join(ROOT, "out", "frames")
SFX_DIRS = [os.path.join(ROOT, "assets", "sfx")] + [os.path.join(ROOT, "..", p, "assets", "sfx") for p in ("ade", "economia", "cripto", "magisterio", "medicina", "cerradura", "gafas", "quimica", "lanzamiento")]
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
GO, R, WH = "#FFC24A", "#FF5A4E", "#EEF2F6"
BL, PK, TE = "#8FC8FF", "#FF5FA8", "#62E3D4"
_K = {1: {"gratis": R, "existe": WH},
      2: {"Granada": GO, "gana": TE, "dinero": TE},
      3: {"dentro": WH, "truco": R},
      4: {"cuenta": WH, "3": GO, "euros": GO},
      5: {"27": GO, "céntimos": GO, "IVA": WH},
      6: {"cerveza": GO, "50": GO, "céntimos": GO},
      7: {"2": TE, "euros": TE, "ganar": TE},
      8: {"primera": WH, "segunda": GO},
      9: {"ronda": WH, "mejor": GO},
      10: {"saladas": WH, "sal": WH, "sed": R, "cañas": GO},
      11: {"verdadero": GO, "truco": GO},
      12: {"regalo": R, "anuncio": GO},
      13: {"publicidad": R, "plato": GO},
      14: {"negocio": WH, "tapa": GO},
      15: {"mándaselo": GO, "gratis": R, "Granada": TE, "Jaén": GO}}
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


# ---------------------------------------------------------------- efectos (los mismos instantes que web/src/20_anim.js, buildTimes)
_CACHE = {}


def sample(name, sr):                             # mono 48 kHz, sin el silencio del principio, pico a 0,5
    if name not in _CACHE:
        src = next(os.path.join(d, name + ".mp3") for d in SFX_DIRS if os.path.exists(os.path.join(d, name + ".mp3")))
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", src, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).astype(np.float64)
        x = x / (np.abs(x).max() + 1e-9) * 0.5
        on = np.flatnonzero(np.abs(x) > 0.02)
        _CACHE[name] = x[max(0, on[0] - int(0.004 * sr)):] if len(on) else x
    return _CACHE[name]


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((END + 1) * sr))

    def put(name, t0, dur, g=1.0, fade=0.08, start=0.0):
        x = sample(name, sr)[int(start * sr):][:max(1, int(dur * sr))].copy()
        fi = min(len(x), int(0.004 * sr)); x[:fi] *= np.linspace(0, 1, fi)
        fo = min(len(x), int(fade * sr)); x[len(x) - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
        sfx.mix(out, x, max(0.0, t0), g)

    def loop(name, t0, dur, g, xf=0.3):          # un efecto largo hecho a trozos que se funden
        x = sample(name, sr); L = len(x) / sr - 0.15; t = t0
        while t < t0 + dur - 0.05:
            d = min(L, t0 + dur - t)
            put(name, t, d + (xf if t + d < t0 + dur - 0.01 else 0), g, fade=xf if t + d < t0 + dur - 0.01 else 0.12, start=0.05)
            t += L - xf

    # mismos instantes que web/src/20_anim.js (buildTimes) y la cámara (30_camera.js): un efecto por suceso, cortado al terminar
    K = lambda w, li, k=1: at(w, k, li)
    # 1: la etiqueta «GRATIS» se raja · 2: la cámara sale a la calle; la caja registradora («el bar gana dinero»)
    put("etiqueta", K("no", 1), 0.8, 0.36, 0.25)
    put("whoosh_largo", K("ponen", 2), 1.4, 0.2, 0.5)
    put("caja", K("gana", 2), 1.2, 0.34, 0.3)
    # 3: vuelve dentro; el «?» del truco
    put("whoosh", K("cómo", 3) + 0.1, 0.6, 0.24, 0.2)
    put("pregunta", K("truco", 3), 0.9, 0.22, 0.3)
    # 4-5: el vaso gigante; «3 euros»; la capa del IVA
    put("vaso_gigante", K("haz", 4), 1.0, 0.3, 0.3)
    put("moneda_sola", K("3", 4), 0.8, 0.26, 0.25)
    put("vierte", K("27", 5), 0.8, 0.3, 0.25)
    # 6: picado a la bodega; la cerveza sube por el tubo; se llena su capa
    put("whoosh", K("cerveza", 6) + 0.1, 0.6, 0.24, 0.2)
    put("tubo", K("cerveza", 6) + 0.2, 1.3, 0.26, 0.35)
    put("llena", K("50", 6) + 0.35, 1.0, 0.2, 0.4)
    # 7: vuelve arriba y se llena «lo que queda»; salen la tapa, el local, los sueldos y la moneda de ganar
    put("subida", K("quedan", 7) - 0.25, 1.1, 0.26, 0.35)
    for w in ("tapa", "local", "sueldos"):
        put("pop", K(w, 7), 0.5, 0.26, 0.15)
    put("moneda_sola", K("ganar", 7), 0.8, 0.3, 0.25)
    # 8-9: el vaso se va; llegan las rondas (cañas y tapas que se deslizan), la mejor brilla
    put("whoosh", K("pero", 8), 0.6, 0.22, 0.2)
    for w, li in (("segunda", 8), ("ronda", 9), ("siguiente", 9), ("mejor", 9)):
        put("ronda", K(w, li), 0.8, 0.3, 0.25)
    put("brillo", K("mejor", 9) + 0.15, 1.0, 0.2, 0.35)
    # 10: la sal; sube la sed; se beben las cañas; la caja cobra la ronda
    put("sal", K("saladas", 10), 1.2, 0.28, 0.35)
    put("medidor", K("sed", 10), 1.0, 0.22, 0.3)
    put("trago", K("paga", 10) - 0.08, 1.0, 0.28, 0.25)
    put("caja", K("cañas", 10), 1.2, 0.32, 0.3)
    # 11: a la calle · 12: la tapa vuela y se queda como letrero; el aro de luz; entra la gente
    put("whoosh_largo", K("pero", 11), 1.2, 0.24, 0.4)
    put("vuela", K("tapa", 12), 1.2, 0.3, 0.35)
    put("letrero", K("tapa", 12) + 1.2, 1.2, 0.34, 0.35)
    put("brillo", K("regalo", 12) + 1.0, 1.0, 0.24, 0.35)
    put("marcha", K("regalo", 12) + 0.25, 2.4, 0.15, 0.6)
    # 13: la cámara se aleja y aparece el anuncio de pago, que se apaga con «ellos te la sirven…»
    put("whoosh_largo", K("bar", 12), 1.2, 0.2, 0.4)
    put("letrero_off", K("ellos", 13), 0.9, 0.3, 0.25)
    # 14: barrido hasta las otras tiendas; sus platos vacíos con «?»
    put("whoosh", K("plato", 13) + 0.15, 0.6, 0.24, 0.2)
    for i in range(2):
        put("pop", K("negocio", 14) + i * 0.18, 0.5, 0.26, 0.15)
    # 15: vuelve a la barra; la votación; el camarero pone otra tapa con su etiqueta (bucle)
    put("whoosh_largo", K("mándaselo", 15), 1.2, 0.2, 0.4)
    put("plato", K("granada", 15) - 0.5, 0.9, 0.3, 0.3)
    put("pop", K("granada", 15), 0.5, 0.24, 0.15)
    put("pop", K("jaén", 15), 0.5, 0.24, 0.15)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "tapas.mp4")):
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
