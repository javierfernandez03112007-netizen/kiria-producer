"""Compone «El mayor robo cripto» (hackeo a Binance): fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra
en Impact (cifras en dorado, lo peligroso en rojo, lo congelado en azul hielo) + la voz de Danny (ElevenLabs, ajustes de Javi)
+ efectos SOLO de ElevenLabs, uno por suceso y cortados cuando el suceso termina.

    python3 ajustar_voz.py && python3 env_voz.py && python3 sfx_eleven.py
    ./render_local.sh 0 N   (o por trozos con las máquinas de ayuda: render_chunk.sh + fetch_compose.sh)
    python3 compose_cripto.py [--test t1 t2 ...] [--sfx]
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
END = float(math.ceil(LINES[-1]["end"] + 2.0))   # como en web/src/90_tail.js: Math.ceil(fin + 2,0)
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
ICE = "#9FDCFF"
_K = {1: {"6.000": GO, "millones": GO, "20": GO, "minutos": GO, "entrevista": WH},
      2: {"recuperado": GO},
      3: {"Binance": WH, "internet": BL},
      4: {"oferta": WH},
      5: {"videollamadas": WH, "existe": R},
      6: {"prueba": WH, "ejecutar": R},
      7: {"espía": R, "antivirus": WH},
      8: {"Esperaron": R},
      9: {"IA": BL, "dos": WH},
      10: {"29": R, "octubre": R, "20": GO, "minutos": GO, "6.000": GO, "millones": GO, "diez": WH},
      11: {"mayor": GO, "cuatro": GO},
      12: {"FBI": WH, "Corea": WH, "Norte": WH, "niegan": R},
      13: {"2.850": ICE, "millones": ICE, "congelado": ICE},
      14: {"Binance": WH, "nada": GR},
      15: {"descargar": R, "sospecha": R}}
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

    # 1–2: las monedas se meten en la pantalla de la videollamada; la pregunta
    put("monedas", 0.0, 2.4, 0.5, 0.45)
    put("pregunta", at("recuperado") - 0.05, 0.9, 0.35, 0.3)
    # 3: la cartera vuelve a estar llena, conectada a internet
    put("llenar", at("binance", 1, 3) - 0.1, 0.95, 0.4, 0.3)
    put("internet", at("conectadas") - 0.02, 0.8, 0.35, 0.25)
    # 4–6: la oferta, las videollamadas, la empresa que no existe, la prueba
    put("correo", at("oferta") - 0.05, 0.55, 0.4)
    put("llamada", at("videollamadas") - 0.02, 0.7, 0.35, 0.2)
    put("glitch", at("existe") - 0.02, 0.5, 0.4, 0.15)
    put("teclea", at("ejecutar") - 0.05, 0.7, 0.32, 0.2)
    # 7–8: el programa espía sale de la pantalla; el antivirus dice que no hay nada; espera
    put("espia", at("programa") - 0.05, 1.1, 0.45, 0.3)
    put("ok", at("antivirus") - 0.02, 0.45, 0.3)
    put("espera", at("esperaron") - 0.05, 1.4, 0.4, 0.5)
    # 9: salta a los otros dos portátiles
    put("salto", at("saltaron") - 0.02, 1.2, 0.4, 0.3)
    # 10: 29 de octubre, alarma, reloj, las monedas salen por diez cadenas
    put("sello", at("29") - 0.02, 0.45, 0.5)
    put("alarma", at("atacan") - 0.02, 1.3, 0.35, 0.35)
    put("reloj", at("20", 1, 10) - 0.05, span(at("20", 1, 10), at("salen") + 0.4), 0.32, 0.2)
    put("estampida", at("salen") - 0.1, 2.4, 0.45, 0.6)
    # 11: las torres del récord (×4)
    put("torre", at("mayor", 1, 11) - 0.02, 1.4, 0.4, 0.3)
    put("duelo", at("cuatro") - 0.05, 0.9, 0.45, 0.35)
    put("torre", at("récord") - 0.02, 0.5, 0.35, 0.2)
    # 12: el FBI · lo niegan
    put("sello", at("fbi") - 0.02, 0.45, 0.4)
    put("sello", at("niegan") - 0.02, 0.45, 0.45)
    # 13–14: congelado; la cartera se vuelve a llenar
    put("hielo", at("congelado") - 0.1, 1.1, 0.5, 0.3)
    put("llenar", at("resto") - 0.02, 1.0, 0.45, 0.3)
    put("check", at("nada", 1, 14) - 0.02, 0.4, 0.35, 0.1)
    # 15: el diálogo de descarga y SOSPECHA; vuelta al principio
    put("aviso", at("descargar") - 0.02, 0.5, 0.35)
    put("sello", at("sospecha") - 0.02, 0.5, 0.55)
    put("vuelve", END - 1.0, 1.0, 0.35, 0.05)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "cripto.mp4")):
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
