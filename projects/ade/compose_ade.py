"""Compone «ADE no tiene salidas»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos
palabra a palabra en Impact + la voz de Javi (su MP3 de ElevenLabs, ajustada con ajustar_voz.py) + efectos SOLO de ElevenLabs
(assets/sfx de este proyecto, sfx_eleven.py, y algunos de otros vídeos del canal), uno por suceso y cortados cuando el suceso termina. Sin precios.

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N
    python3 projects/ade/compose_ade.py [--test t1 t2 ...] [--sfx]
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
END = math.ceil((LINES[-1]["end"] + 1.25) * 2) / 2     # como en web/src/90_tail.js (59 s)
N = int(END * FPS)
FRAMES = os.path.join(ROOT, "out", "frames")
SFX_DIRS = [os.path.join(ROOT, "assets", "sfx")] + [os.path.join(ROOT, "..", p, "assets", "sfx") for p in ("cerradura", "medicina", "magisterio", "economia", "gafas", "cripto", "quimica", "robot_neuronas", "lanzamiento")]
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
_K = {1: {"ADE": GO, "salidas": R},
      2: {"más": GO, "piden": GO, "empresas": WH},
      3: {"trampa": R, "final": WH},
      4: {"ADE": GO, "doble": GO, "ofertas": WH},
      5: {"8": GO, "10": GO, "trabajando": TE},
      6: {"32.000": GO, "euros": GO},
      7: {"feo": R, "4": GO, "10": GO, "universitario": GO},
      8: {"resto": R, "carrera": R},
      9: {"15.000": WH, "graduados": WH, "nuevos": WH},
      10: {"tres": GO, "salidas": TE},
      11: {"auditorías": TE, "3": GO, "años": GO, "examen": WH, "Estado": WH},
      12: {"banco": GO, "certificado": GO},
      13: {"Hacienda": BL, "oposición": R},
      14: {"ninguna": R, "ADE": GO},
      15: {"trampa": R, "ADE": GO, "llave": GO, "portal": GO, "cerradura": R},
      16: {"salidas": TE, "atajos": R, "ninguno": R},
      17: {"mándaselo": GO, "auditoría": TE, "banca": GO}}
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

    # mismos instantes que web/src/20_anim.js (buildTimes): un efecto por suceso, cortado al terminar
    K = lambda w, li, k=1: at(w, k, li)
    tries = [K("ninguna", 14) + 0.1 + j * 0.6 for j in range(3)]
    # 1-2: lluvia de ofertas; la señal de SALIDA se apaga; los folios vuelan a las torres
    put("papeles", 0.0, 2.95, 0.34, 0.5, start=0.4)
    put("letrero_off", K("salidas", 1) + 0.03, 0.8, 0.34, 0.25)
    put("papeles_vuelan", K("y", 2), 1.6, 0.36, 0.35)
    # 3: «tiene trampa» · 4: «más del doble» (la torre fantasma)
    put("pregunta", K("trampa", 3), 0.9, 0.28, 0.3)
    put("holograma", K("doble", 4) - 0.05, 0.9, 0.3, 0.3)
    # 5: las 100 aparecen; el portal se abre; entran 80; se cierra
    put("fichas", K("4", 5) - 0.12, 1.0, 0.32, 0.3)
    put("puerta_abre", K("8", 5) - 0.5, 0.9, 0.3, 0.3)
    put("marcha", K("8", 5), 2.8, 0.28, 0.6)
    put("portazo2", K("media", 6) + 0.62, 0.6, 0.16, 0.25)
    # 6: el sueldo · 7: la fachada se abre (barrido); suben 34 en el ascensor; «4 de cada 10»
    put("contador", K("32.000", 6) - 0.1, 0.85, 0.24, 0.2)
    put("barrido", K("ahora", 7) + 0.04, 1.0, 0.34, 0.3)
    put("ascensor", K("trabajan", 7) + 0.15, 3.2, 0.3, 0.6)
    put("dorado", K("4", 7) - 0.03, 0.9, 0.28, 0.3)
    # 8: se caen los birretes · 9: llegan los nuevos (y el contador)
    put("birretes", K("trabajos", 8) - 0.05, 1.1, 0.34, 0.3)
    put("multitud", K("cada", 9) - 0.15, 3.3, 0.3, 0.7)
    put("cuenta", K("salen", 9), 1.6, 0.2, 0.3)
    # 10: la cámara sube; se encienden las tres señales
    put("sube", K("fíjate", 10), 0.9, 0.24, 0.3)
    put("letrero_on", K("tres", 10), 0.8, 0.28, 0.25)
    # 11: auditoría (candado, calendario, examen) · 12: banca (candado, certificado) · 13: Hacienda (candado, temario, sello)
    put("candado", K("auditorías", 11), 0.6, 0.34, 0.2)
    put("calendario", K("3", 11) + 0.08, 0.9, 0.3, 0.25)
    put("papel", K("examen", 11) - 0.03, 0.6, 0.3, 0.2)
    put("candado", K("banco", 12), 0.6, 0.34, 0.2)
    put("diploma", K("certificado", 12) - 0.05, 0.8, 0.3, 0.25)
    put("candado", K("hacienda", 13), 0.6, 0.34, 0.2)
    put("libros", K("oposición", 13) - 0.05, 0.7, 0.32, 0.25)
    put("sello", K("oposición", 13) + 0.05, 0.5, 0.36, 0.15)
    # 14: la llave «ADE» no gira en ninguna
    for tr in tries:
        put("llave_entra", tr, 0.35, 0.3, 0.1)
        put("denegado", tr + 0.26, 0.45, 0.26, 0.15)
    # 15: baja hasta el portal, entra, gira; el portal se abre con luz; entra la gente; candados en cascada
    put("whoosh_largo", K("esa", 15), 1.2, 0.26, 0.4)
    put("llave_entra", K("ade", 15) - 0.06, 0.4, 0.4, 0.1)
    put("giro_llave", K("llave", 15) - 0.3, 0.6, 0.45, 0.2)
    put("puerta_abre", K("portal", 15) - 0.12, 1.0, 0.36, 0.3)
    put("dorado", K("portal", 15) - 0.1, 1.2, 0.28, 0.4)
    put("multitud", K("portal", 15) + 0.0, 3.2, 0.2, 0.8)
    for li in range(6):
        put("candado", K("muchos", 15) - 0.08 + li * 0.2, 0.4, 0.22, 0.12)
    # 16: «Salidas tiene» (se encienden todas) · «Atajos, ninguno» (la escalera aparece, se tacha y se cae)
    put("letrero_on", K("salidas", 16), 1.0, 0.32, 0.3)
    put("escalera", K("atajos", 16) - 0.06, 0.6, 0.32, 0.2)
    put("denegado", K("ninguno", 16), 0.45, 0.28, 0.15)
    put("escalera_cae", K("ninguno", 16) + 0.08, 1.1, 0.34, 0.3)
    # 17: baja a la plaza; el portal se cierra; la pregunta; vuelve la lluvia (bucle)
    put("whoosh_largo", K("mándaselo", 17), 1.5, 0.18, 0.5)
    put("portazo2", K("no", 17) + 0.72, 0.6, 0.18, 0.25)
    put("pop", K("auditoría", 17) - 0.03, 0.3, 0.26, 0.1)
    put("pop", K("auditoría", 17) + 0.12, 0.3, 0.22, 0.1)
    put("papeles", END - 1.6, 1.6, 0.34, 0.05)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "ade.mp4")):
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
