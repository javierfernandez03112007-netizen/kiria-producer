"""Compone el anuncio de kiriaai.com («¿Qué hace que alguien se pare?»): fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos
palabra a palabra en Impact + la voz de Javi (su MP3 de ElevenLabs, ajustada con ajustar_voz.py) + efectos SOLO de ElevenLabs
(assets/sfx de este proyecto y los de projects/lanzamiento/assets/sfx), uno por suceso y cortados cuando el suceso termina. Sin precios.

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N
    python3 projects/promo_web/compose_promo.py [--test t1 t2 ...] [--sfx]
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
SFX_DIRS = [os.path.join(ROOT, "assets", "sfx"), os.path.join(ROOT, "..", "lanzamiento", "assets", "sfx"), os.path.join(ROOT, "..", "cripto", "assets", "sfx")]
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
BL, GR = "#8FE6FF", "#7CF0A9"
_K = {1: {"empresa": WH, "producto": WH, "gente": GO},
      2: {"pare": GO, "final": WH},
      3: {"foto": GO, "producto": WH},
      4: {"3D": GO, "luz": WH, "movimiento": WH, "voz": BL},
      5: {"todos": WH, "canal": WH, "cámara": R},
      6: {"7": WH, "días": WH, "3,2": GO, "millones": GO},
      7: {"secreto": WH, "primer": GO, "segundo": GO, "inesperado": GO},
      8: {"este": GO},
      9: {"negocio": WH, "kiriaai.com:": GO, "bio": BL}}
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

    # mismos instantes que web/src/20_anim.js (buildTimes)
    stop = at("pare") + 0.04
    rw0, rw1 = at("como") - 0.03, at("este", 1, 8) + 0.08
    cta0, web, bio = at("quieres") - 0.05, at("entra") - 0.12, at("bio") - 0.25
    # 1: la cinta corre a tirones (cada 0,66 s) y los productos caen al vacío por el borde
    for k in range(int(stop / 0.66) + 1):
        if k * 0.66 < stop - 0.4:
            put("scroll", k * 0.66, 0.4, 0.2, 0.15)
    for t0, g in [(0.0, 0.42), (0.55, 0.3), (1.95, 0.3), (3.35, 0.26)]:
        put("caida", t0, 0.9, g, 0.4, start=0.12 if t0 == 0 else 0.0)
    # 2: se para en seco
    put("frenazo", stop - 0.02, 0.55, 0.5, 0.2)
    # 3: cae la foto, se sube
    put("tarjeta", at("mándanos") - 0.1, 0.45, 0.4, 0.15)
    put("papel", at("foto", 1, 3) + 0.1, 0.45, 0.42, 0.2)
    put("ping", at("producto", 1, 3) + 0.2, 0.45, 0.32, 0.2)
    # 4: la foto se pone de pie, sale la peana, el tarro se hincha y salta; focos; vuelta; voz
    put("voltea", at("convertimos") - 0.05, 0.45, 0.35, 0.15)
    put("sale", at("en", 1, 4) - 0.05, 0.4, 0.35, 0.15)
    put("estira", at("en", 1, 4), 0.6, 0.38, 0.2)
    put("whoosh", at("3D") + 0.18, 0.45, 0.3, 0.15)
    put("solido", at("con", 1, 4) + 0.02, 0.45, 0.45, 0.2)
    put("focos", at("luz") - 0.05, 0.85, 0.5, 0.3)
    put("whoosh", at("movimiento") - 0.02, 0.7, 0.36, 0.25)
    put("onda", at("voz") - 0.03, 0.6, 0.25, 0.25)
    # 5: el estudio se recoge; los vídeos del canal; la cámara aparece y se deshace
    put("absorbe", at("así") - 0.1, 0.5, 0.35, 0.2)
    put("pantalla", at("así") + 0.15, 0.5, 0.3, 0.2)
    put("sale", at("sin") - 0.08, 0.4, 0.35, 0.15)
    put("absorbe", at("cámara") + 0.02, 0.5, 0.4, 0.2)
    put("sello", at("cámara") + 0.07, 0.45, 0.42, 0.15)
    # 6: el contador sube y salen los «3,2 M»
    put("cuenta", at("sumado"), max(0.3, at("millones") + 0.05 - at("sumado")), 0.32, 0.2)
    put("cifra", at("3,2") - 0.03, 0.6, 0.45, 0.25)
    # 7: la barra del vídeo vuelve al primer segundo; la imagen se enciende
    put("tap", at("primer") - 0.02, 0.3, 0.4)
    put("ping", at("primer") + 0.1, 0.45, 0.32, 0.2)
    put("ping", at("inesperado") - 0.03, 0.45, 0.25, 0.2)
    # 8: rebobinado y otra vez el primer segundo (el tarro cae)
    put("rebobina", rw0 - 0.02, rw1 - rw0 + 0.15, 0.55, 0.12)
    put("caida", rw1 + 0.15, 0.8, 0.4, 0.35)
    # 9: la cámara sube; la web; el botón; el enlace de la bio; vuelta al principio (bucle)
    put("whoosh", cta0 + 0.1, 0.7, 0.32, 0.25)
    put("pantalla", web, 0.5, 0.32, 0.2)
    put("tap", web + 0.6, 0.3, 0.35)
    put("ping", bio + 0.25, 0.45, 0.35, 0.2)
    put("whoosh", END - 0.95, 0.7, 0.3, 0.25)
    put("scroll", END - 0.66, 0.4, 0.2, 0.15)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "promo_web.mp4")):
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
