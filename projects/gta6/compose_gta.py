"""Compone «GTA 6 ocupa 212 gigas»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos
palabra a palabra en Impact + la voz de Javi (su MP3 de ElevenLabs, ajustada con ajustar_voz.py) + efectos SOLO de ElevenLabs
(assets/sfx de este proyecto, sfx_eleven.py, y algunos de otros vídeos del canal), uno por suceso y cortados cuando el suceso termina.

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N
    python3 projects/gta6/compose_gta.py [--test t1 t2 ...] [--sfx]
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
END = math.ceil((LINES[-1]["end"] + 1.25) * 2) / 2     # como en web/src/90_tail.js (57 s)
N = int(END * FPS)
FRAMES = os.path.join(ROOT, "out", "frames")
SFX_DIRS = [os.path.join(ROOT, "assets", "sfx")] + [os.path.join(ROOT, "..", p, "assets", "sfx") for p in ("tapas", "ade", "lanzamiento", "economia", "cripto", "cerradura", "medicina", "robot_neuronas", "promo_web", "quimica", "magisterio", "robo_banco")]
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
_K = {1: {"6": GO, "salido": WH, "móvil": R},
      2: {"pesa": GO, "abrirlo": WH, "ocupa": GO},
      3: {"Rockstar": WH, "212": GO, "gigas": GO},
      4: {"50.000": GO, "canciones": GO, "doble": R},
      5: {"300": TE, "megas": TE, "hora": R, "media": R},
      6: {"código": TE, "menos": R},
      7: {"ves": GO, "oyes": GO},
      8: {"pared": WH, "coche": WH, "cara": WH, "enormes": GO, "borrosa": R},
      9: {"voz": WH, "canción": WH, "ruido": WH, "guardado": TE},
      10: {"ciudad": GO, "esperar": TE},
      11: {"juego": R, "ciudad": GO, "ladrillo": GO, "pintado": GO},
      12: {"PlayStation": BL, "Xbox": "#7CF0A9", "hueco": GO}}
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
    # 1: la columna brota del móvil con la ciudad (empieza 1 s antes del 0: el final del vídeo lleva el principio del sonido → bucle)
    put("subida", 0.0, 1.3, 0.32, 0.35, start=0.2)            # el primer segundo, con fuerza
    put("edificios", 0.0, 1.0, 0.2, 0.3)
    put("edificios", END - 0.7, 0.7, 0.18, 0.05)             # al final vuelven a brotar (bucle)
    put("raja", K("móvil", 1), 0.8, 0.4, 0.25)
    put("error", K("móvil", 1) + 0.05, 0.6, 0.24, 0.2)
    # 2: la «?»; la cámara entra en la ciudad
    put("pregunta", K("por", 2), 0.9, 0.22, 0.3)
    put("whoosh_ciudad", K("abrirlo", 2), 1.2, 0.26, 0.4)
    # 3: la torre y su regla: el contador sube a 212
    put("whoosh", K("rockstar", 3), 0.6, 0.2, 0.2)
    put("contador", K("hasta", 3) + 0.05, 1.3, 0.3, 0.3)
    # 4: las canciones caen; Red Dead 2 sube de la mesa
    put("discos", K("50.000", 4) - 0.1, 1.6, 0.32, 0.5)
    put("columna", K("doble", 4), 0.9, 0.3, 0.3)
    # 5: la fibra y el reloj
    put("fibra", K("fibra", 5) - 0.2, 1.6, 0.26, 0.5)
    put("tictac", K("tardarías", 5) - 0.2, 1.5, 0.24, 0.4)
    # 6: a la ciudad, al cubito de código, y se queda diminuto
    put("whoosh", K("crees", 6) + 0.2, 0.6, 0.22, 0.2)
    put("codigo", K("código", 6) - 0.1, 1.0, 0.28, 0.3)
    put("absorbe", K("realidad", 6), 0.8, 0.26, 0.3)
    # 7: baja a la calle; se enciende todo; anillos de sonido
    put("whoosh", K("lo", 7) - 0.1, 0.6, 0.2, 0.2)
    put("letrero_on", K("ves", 7) - 0.05, 1.0, 0.3, 0.3)
    put("onda", K("oyes", 7) - 0.05, 1.0, 0.28, 0.3)
    # 8: se despegan la fachada, el coche y la cara; suben y crecen; vuelven a su sitio
    put("diploma", K("pared", 8), 0.8, 0.34, 0.25)
    put("diploma", K("coche", 8), 0.55, 0.28, 0.2, start=0.1)
    put("diploma", K("cara", 8), 0.4, 0.24, 0.15, start=0.2)
    put("holograma", K("imágenes", 8) - 0.15, 1.0, 0.3, 0.3)
    put("cifra", K("para", 8) + 0.55, 0.5, 0.3, 0.15)
    put("whoosh", K("cerca", 8) - 0.2, 0.5, 0.18, 0.2)
    # 9: la radio del coche, la calle y todo se guarda en la columna
    put("estatica", K("canción", 9), 0.7, 0.22, 0.2)
    put("camion", K("ruido", 9), 1.0, 0.2, 0.4)
    put("absorbe", K("sonido", 9), 0.8, 0.3, 0.3)
    # 10: la ciudad entera; el coche corre y frena
    put("whoosh_ciudad", K("ciudad", 10) - 0.2, 1.2, 0.24, 0.4)
    put("whoosh_largo", K("lista", 10), 1.4, 0.24, 0.4)
    put("frenazo", K("esperar", 10) + 0.2, 0.5, 0.22, 0.15)
    # 11: la respuesta: el mando tachado; la ciudad baja al móvil; el ladrillo
    put("brillo", K("respuesta", 11), 0.9, 0.22, 0.3)
    put("pop", K("no", 11), 0.5, 0.28, 0.15)
    put("denegado", K("juego", 11), 0.45, 0.24, 0.15)
    put("whoosh_largo", K("te", 11, 2), 1.5, 0.26, 0.5)
    put("absorbe", K("ciudad", 11) + 0.15, 0.8, 0.3, 0.3)
    put("carpeta", K("ladrillo", 11) + 0.4, 0.5, 0.3, 0.15)
    put("whoosh", K("playstation", 12) - 0.3, 0.5, 0.16, 0.2)
    # 12: la votación; los iconos salen del móvil («haciendo hueco»)
    put("pop", K("playstation", 12), 0.5, 0.24, 0.15)
    put("pop", K("xbox", 12), 0.5, 0.24, 0.15)
    put("notificaciones", K("haciendo", 12) - 0.25, 1.4, 0.26, 0.4)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "gta6.mp4")):
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
