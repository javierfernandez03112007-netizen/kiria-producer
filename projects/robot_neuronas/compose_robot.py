"""Compone «El perro robot con neuronas humanas»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos
palabra a palabra en Impact + la voz de Javi (su MP3 de ElevenLabs, ajustada con ajustar_voz.py) + efectos SOLO de ElevenLabs
(assets/sfx de este proyecto, sfx_eleven.py, y algunos de otros vídeos del canal), uno por suceso y cortados cuando el suceso termina. Sin precios.

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N
    python3 projects/robot_neuronas/compose_robot.py [--test t1 t2 ...] [--sfx]
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
END = float(math.ceil(LINES[-1]["end"] + 2.6))          # como en web/src/90_tail.js: Math.ceil(fin + 2,6)
N = int(END * FPS)
FRAMES = os.path.join(ROOT, "out", "frames")
SFX_DIRS = [os.path.join(ROOT, "assets", "sfx")] + [os.path.join(ROOT, "..", p, "assets", "sfx") for p in ("lanzamiento", "cripto", "medicina", "gafas", "cerradura", "promo_web")]
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
_K = {1: {"robot": WH, "cerebro": R, "neuronas": PK, "humanas": PK, "vivas": PK},
      2: {"aprendido": GO, "final": WH},
      3: {"cortical": WH, "labs": WH, "australia": TE},
      4: {"chip": WH, "electrodos": BL, "crecen": PK, "neuronas": PK, "laboratorio": WH},
      5: {"señales": BL, "eléctricas": BL, "responden": PK},
      6: {"programa": TE, "pasos": GO, "izquierda": GO, "derecha": GO, "adelante": GO},
      7: {"solo": WH, "objetivo": R, "mapa": TE},
      8: {"ojo": GO, "cerebro": R, "86000": PK, "millones": PK, "puñado": PK},
      9: {"chip": WH, "programa": TE, "motores": GO, "máquina": WH},
      10: {"revisado": R},
      11: {"aprendido": GO, "pong": GO, "doom": GO},
      12: {"derechos": GO, "máquina": WH, "humanas": PK}}
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

    # mismos instantes que web/src/20_anim.js (buildTimes) y 30_camera.js
    K = lambda w, li, k=1: at(w, k, li)
    w0, fb = K("neuronas", 12) + 0.05, K("mapa", 7) - 0.08
    # 1: el perro anda hacia ti (y al final vuelve a andar: el mismo paseo); «no tiene cerebro»; las neuronas se encienden
    loop("pasos", 0.0, 4.3, 0.2)
    put("denegado", K("cerebro", 1) + 0.02, 0.5, 0.22, 0.2)
    put("zumbido", K("neuronas", 1) - 0.05, 1.6, 0.3, 0.5)
    # 2: la pantalla con la pregunta; el candado («al final te lo digo»)
    put("estatica", K("aprendido", 2) - 0.05, 0.5, 0.3, 0.2)
    put("pantalla", K("aprendido", 2) - 0.02, 0.5, 0.22, 0.2)
    put("candado", K("final", 2) - 0.03, 0.6, 0.35, 0.2)
    put("whoosh", K("digo", 2) + 0.15, 0.5, 0.22, 0.2)
    # 3: la cámara sube; Australia se dibuja; Melbourne
    put("sube", K("cortical", 3) - 0.45, 1.0, 0.3, 0.3)
    put("dibujo", K("empresa", 3) - 0.05, 1.1, 0.32, 0.3)
    put("ping", K("australia", 3) + 0.22, 0.45, 0.28, 0.2)
    # 4: en picado al chip; los electrodos se encienden; crecen las neuronas; el medio de cultivo
    put("picado", K("en", 4) - 0.1, 0.8, 0.38, 0.25)
    put("barrido", K("electrodos", 4) + 0.02, 0.7, 0.3, 0.25)
    put("crecen", K("crecen", 4), 1.4, 0.36, 0.4)
    put("petri", K("cultivadas", 4) - 0.02, 0.7, 0.28, 0.25)
    # 5: el chip estimula; las neuronas responden
    put("estimulo", K("manda", 5) + 0.1, K("escucha", 5) + 0.1 - K("manda", 5), 0.3, 0.25)
    put("respuesta", K("responden", 5) - 0.02, 1.1, 0.38, 0.35)
    # 6: el programa; los motores; izquierda, derecha, adelante (con sus pasos)
    put("programa", K("programa", 6) + 0.12, 1.0, 0.26, 0.3)
    put("servo", K("pasos", 6) - 0.02, 0.6, 0.32, 0.2)
    for w in ("izquierda", "derecha", "adelante"):
        put("flecha", K(w, 6) - 0.02, 0.45, 0.3, 0.15)
        put("servo", K(w, 6) + 0.05, 0.5, 0.2, 0.2)
    loop("pasos", K("izquierda", 6) + 0.05, fb - K("izquierda", 6) + 0.1, 0.18)
    # 7: el objetivo; llega; la cámara sube a ver el mapa
    put("objetivo", K("objetivo", 7) - 0.03, 1.0, 0.3, 0.3)
    put("llegada", fb, 0.8, 0.34, 0.3)
    put("sube", K("mapa", 7) + 0.02, 0.9, 0.22, 0.3)
    # 8: «ojo»; el cerebro; los 86.000 millones; baja en picado a «un puñado»
    put("ojo", K("ojo", 8) - 0.02, 0.8, 0.42, 0.3)
    put("cerebro", K("cerebro", 8) - 0.05, 1.8, 0.36, 0.5)
    put("cuenta", K("86000", 8) - 0.1, K("millones", 8) + 0.25 - K("86000", 8), 0.28, 0.2)
    put("picado", K("aquí", 8) - 0.12, 0.7, 0.3, 0.25)
    put("zumbido", K("puñado", 8) - 0.05, 0.9, 0.28, 0.4)
    # 9: el despiece: chip, programa, motores; se vuelve a montar
    put("despiece", K("chip", 9) - 0.15, 1.0, 0.36, 0.3)
    put("programa", K("programa", 9) - 0.02, 0.6, 0.2, 0.2)
    put("servo", K("motores", 9) - 0.02, 0.6, 0.34, 0.2)
    put("monta", K("máquina", 9) + 0.75, 0.6, 0.38, 0.2)
    # 10: sin revisar
    put("sello", K("revisado", 10) - 0.02, 0.5, 0.42, 0.15)
    # 11: la pantalla vuelve; Pong; el pasillo (dos disparos)
    put("estatica", K("aprendido", 11) - 0.08, 0.5, 0.28, 0.2)
    put("pantalla", K("aprendido", 11) - 0.05, 0.5, 0.2, 0.2)
    put("pong", K("jugaron", 11), K("doom", 11) - 0.05 - K("jugaron", 11), 0.3, 0.12)
    put("disparo", K("doom", 11), 0.6, 0.32, 0.25)
    put("disparo", K("doom", 11) + 0.5, 0.5, 0.22, 0.25)
    put("whoosh", K("le", 12) - 0.02, 0.6, 0.22, 0.25)
    # 12: gira la cabeza hacia ti; vuelve a andar (el paseo del principio: bucle)
    put("mira", K("derechos", 12) - 0.12, 0.9, 0.34, 0.3)
    loop("pasos", w0, END - w0 + 0.05, 0.2)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "robot_neuronas.mp4")):
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
