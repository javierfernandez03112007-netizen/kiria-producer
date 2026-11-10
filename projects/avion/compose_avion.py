"""Compone «Por qué vuela un avión»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra
en Impact + la voz de Javi (su MP3 de ElevenLabs, ajustada con ajustar_voz.py) + efectos SOLO de ElevenLabs, reutilizados de otros
vídeos del canal (copiados en assets/sfx; «jet» y «helice» son mezclas más graves/agudas de ellos), uno por suceso.

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N
    python3 projects/avion/compose_avion.py [--test t1 t2 ...] [--sfx]
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
END = math.ceil((LINES[-1]["end"] + 1.25) * 2) / 2     # como en web/src/90_tail.js (56,5 s)
N = int(END * FPS)
FRAMES = os.path.join(ROOT, "out", "frames")
SFX_DIRS = [os.path.join(ROOT, "assets", "sfx")]
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
BL, TE = "#7CC8FF", "#62E3D4"
_K = {1: {"colegio": WH, "avión": GO, "mal": R},
      2: {"NASA": WH, "575": GO, "toneladas": GO, "final": TE},
      3: {"curva": GO, "arriba": GO, "camino": GO, "vez": WH},
      4: {"cita": R, "túnel": TE, "viento": TE, "antes": GO, "Mucho": GO},
      5: {"curva": GO, "boca": R, "abajo": R},
      6: {"clave": TE, "inclinada": GO, "empuja": TE, "abajo": TE},
      7: {"Cientos": GO, "toneladas": GO, "segundo": TE},
      8: {"abajo": TE, "arriba": GO},
      9: {"baja": BL, "sube": R, "diferencia": WH, "levanta": GO},
      10: {"flota": R, "empujando": TE, "abajo": TE, "rato": GO},
      11: {"Ventanilla": TE, "pasillo": GO, "física": WH}}
KEY = {li: {norm(w): c for w, c in d.items()} for li, d in _K.items()}
SUBS = None
Y_LOW = (at("está", 1, 1) - 0.08, at("ventanilla", 1, 11) - 0.12)     # al principio y al final, entre el avión y la pizarra


def compose(fi):
    t = fi / FPS
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    SUBS.y = 330
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
    tilt, back, pulse = K("inclinada", 6) - 0.2, K("ventanilla", 11) + 0.3, K("túnel", 4) + 0.3
    # 1: el dron sigue al avión (motor y viento todo el plano; al final vuelve el mismo plano → bucle); el sello «INCORRECTA»
    cut = K("esa", 1) - 0.05                                     # del avión a la pizarra («…y esa explicación»)
    loop("motor", 0.0, cut + 0.1, 0.26, 0.35)
    loop("nubes", 0.0, cut + 0.1, 0.08, 0.35)
    loop("motor", K("ventanilla", 11) - 0.03, END - K("ventanilla", 11) + 0.05, 0.26, 0.35)
    put("whoosh", cut - 0.18, 0.6, 0.3, 0.2)
    put("tiza_tachar", K("mal", 1), 0.9, 0.5, 0.3)
    put("impacto", K("mal", 1), 0.7, 0.24, 0.3)
    # 2: el sello de la NASA; arriba, al avión; las 575 t; la pregunta pendiente; vuelta a la pizarra
    put("sello", K("nasa", 2), 0.5, 0.5, 0.15)
    put("whoosh", K("aire", 2) - 0.6, 0.6, 0.16, 0.2)
    put("whoosh", K("575", 2) - 0.2, 0.6, 0.14, 0.2)
    put("cifra", K("575", 2), 0.5, 0.4, 0.15)
    put("pregunta", K("final", 2), 0.9, 0.18, 0.3)
    # 3: el dibujo de tiza se vuelve sólido y sale volando; «curva por arriba»; las dos bolitas; «a la vez»
    fly1 = K("ala", 3) + 0.22 + 0.85
    put("solido", K("ala", 3), 0.6, 0.42, 0.2)
    put("sale", K("ala", 3) + 0.22, 0.5, 0.3, 0.15)
    put("brillo", fly1 - 0.08, 0.9, 0.3, 0.3)
    put("pop", fly1 + 0.15, 0.4, 0.3, 0.12)
    put("pop", fly1 + 0.23, 0.4, 0.24, 0.12)
    put("tap", K("camino", 3) - 0.1, 0.4, 0.22, 0.12)
    put("ding", K("vez", 3) - 0.05, 0.8, 0.32, 0.4)
    # 4: «cita» tachada; el túnel se monta y el ventilador arranca; el humo; la carrera: A llega antes, B después
    put("error", K("cita", 4), 0.6, 0.28, 0.2)
    put("construye", K("túnel", 4) - 0.05, 1.2, 0.3, 0.4)
    put("ventilador", K("viento", 4), 1.1, 0.3, 0.3)
    loop("ventilador", K("viento", 4) + 1.0, K("si", 5) - K("viento", 4) - 0.9, 0.12, 0.3)
    put("humo", pulse - 0.05, 0.9, 0.24, 0.3)
    put("llegada", K("antes", 4) + 0.03, 0.8, 0.38, 0.3)
    put("cronometro", K("mucho", 4) - 0.05, 0.5, 0.36, 0.15)
    # 5: la avioneta, con su propia cámara; se da la vuelta
    put("whoosh", K("si", 5) - 0.1, 0.6, 0.22, 0.2)
    loop("helice", K("si", 5) - 0.05, K("clave", 6) - K("si", 5) + 0.02, 0.22, 0.15)
    put("whoosh_largo", K("si", 5), 1.2, 0.14, 0.4)
    put("giro", K("boca", 5) - 0.85, 0.5, 0.34, 0.15)
    put("pop", K("boca", 5) - 0.05, 0.4, 0.22, 0.12)
    # 6: el ala se inclina (motor), el ángulo; el humo con el ala inclinada; el aire sale hacia abajo
    put("clic", K("clave", 6) - 0.08, 0.4, 0.2, 0.1)
    put("servo", tilt, 0.6, 0.38, 0.2)
    put("flecha", tilt + 0.15, 0.5, 0.22, 0.15)
    put("humo", tilt + 0.6, 0.9, 0.22, 0.3)
    put("aire", K("empuja", 6), 0.8, 0.3, 0.3)
    put("flecha", K("empuja", 6) + 0.05, 0.5, 0.2, 0.15)
    # 7: el cielo: los bloques de aire caen de las alas
    put("nubes", K("cientos", 7) - 0.03, 1.4, 0.3, 0.5)
    loop("motor", K("cientos", 7) - 0.03, K("si", 8) - K("cientos", 7), 0.14, 0.3)
    put("cae", K("cientos", 7) + 0.1, 0.9, 0.3, 0.3)
    put("cae", K("toneladas", 7) + 0.1, 0.9, 0.26, 0.3)
    put("cae", K("aire", 7) + 0.1, 0.9, 0.24, 0.3)
    put("cifra", K("cientos", 7) + 0.05, 0.5, 0.3, 0.15)
    # 8: acción y reacción: la flecha azul (abajo) y la naranja (arriba)
    put("clic", K("si", 8) - 0.03, 0.4, 0.2, 0.1)
    put("flecha", K("abajo", 8), 0.5, 0.32, 0.15)
    put("cae", K("abajo", 8) + 0.05, 0.6, 0.16, 0.25)
    put("flecha", K("empuja", 8, 2), 0.5, 0.32, 0.15)
    put("sube", K("empuja", 8, 2) + 0.05, 0.8, 0.2, 0.3)
    # 9: la presión en colores; la diferencia levanta el avión entero
    put("onda", K("arriba", 9), 0.8, 0.32, 0.3)
    put("tap", K("baja", 9), 0.4, 0.2, 0.12)
    put("tap", K("sube", 9), 0.4, 0.2, 0.12)
    put("subida", K("levanta", 9) - 0.05, 2.0, 0.36, 0.6)
    loop("motor", K("levanta", 9) - 0.05, K("ventanilla", 11) - K("levanta", 9), 0.14, 0.3)
    # 10: «no flota»; la estela, todo el rato
    put("impacto", K("flota", 10), 0.7, 0.3, 0.3)
    loop("nubes", K("respuesta", 10), K("ventanilla", 11) - K("respuesta", 10), 0.2, 0.35)
    # 11: ¿ventanilla o pasillo?; todo vuelve a la pizarra (bucle)
    put("pop", K("ventanilla", 11), 0.4, 0.26, 0.12)
    put("pop", K("pasillo", 11), 0.4, 0.26, 0.12)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "avion.mp4")):
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
