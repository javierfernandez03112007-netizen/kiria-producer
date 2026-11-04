"""Compone «El túnel del Banco Central» (Fortaleza, 2005): fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a
palabra en Impact (cifras en dorado, «cámara acorazada», «falsa» y «agujero» en rojo) + la voz de Danny (ElevenLabs, ajustes de Javi)
+ efectos SOLO de ElevenLabs, uno por suceso y cortados cuando el suceso termina.

    python3 ajustar_voz.py && python3 env_voz.py && python3 sfx_eleven.py
    ./render_local.sh 0 N   (o por trozos con las máquinas de ayuda: render_chunk.sh + fetch_compose.sh)
    python3 compose_robo.py [--test t1 t2 ...] [--sfx]
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
_K = {1: {"túnel": WH, "78": GO, "metros": GO, "cámara": R, "acorazada": R},
      2: {"fortaleza": WH, "brasil": WH, "2005": GO},
      3: {"falsa": R, "césped": GR, "artificial": GR},
      4: {"tierra": AM},
      5: {"vigas": WH, "luz": GO, "ventilación": TE},
      6: {"metro": GO, "diez": GO, "hormigón": WH, "armado": WH},
      7: {"diamante": BL, "capa": GO, "fina": GO, "esperan": R},
      8: {"viernes": WH, "rompen": R, "entran": R},
      9: {"cámaras": R, "sensores": R},
      10: {"50": GO, "usados": WH},
      11: {"toneladas": GO, "164": GO, "millones": GO, "reales": GO},
      12: {"lunes": WH, "agujero": R},
      13: {"mayor": GO, "brasil": WH, "aparecer": R},
      14: {"dónde": GO}}
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

    # 1: el pico en la tierra (primer fotograma); la línea del túnel; la cota de 78 m; se enciende la cámara acorazada
    put("pico", 0.0, 0.8, 0.5, 0.2)
    put("linea", at("túnel") - 0.02, span(at("túnel"), at("debajo") + 0.2), 0.38, 0.2)
    put("regla", at("78") - 0.02, 0.5, 0.4)
    put("luces_camara", at("cámara", 1, 1) - 0.05, 0.9, 0.45, 0.3)
    # 2: Fortaleza, 2005
    put("titulo", at("fortaleza") - 0.05, 1.3, 0.6, 0.4)
    # 3–4: el cartel, «FALSA», los meses, la camioneta con tierra
    put("cartel", at("casa", 1, 3) - 0.05, 0.7, 0.35, 0.2)
    put("sello", at("falsa") - 0.02, 0.45, 0.6)
    put("calendario", at("tres", 1, 4) - 0.02, 0.8, 0.4, 0.2)
    put("camion", at("sale") - 0.3, 2.4, 0.45, 0.6)
    # 5: el túnel avanza: pala, vigas, luz, ventilación
    put("pala", at("bajo") - 0.05, span(at("bajo"), at("vigas")), 0.4, 0.2)
    put("madera", at("vigas") - 0.02, 0.6, 0.5)
    put("bombillas", at("luz") - 0.05, 0.9, 0.45, 0.2)
    put("ventilador", at("ventilación") - 0.05, 1.0, 0.35, 0.3)
    # 6–7: la losa; martillos y disco de diamante hasta la capa fina; la espera
    put("hormigon", at("hormigón") - 0.02, 0.7, 0.6, 0.25)
    put("martillo", at("perforan") - 0.02, span(at("perforan"), at("capa", 1, 7) + 0.1), 0.45, 0.15)
    put("disco", at("discos") - 0.05, span(at("discos"), at("capa", 1, 7) + 0.1), 0.25, 0.15)
    put("reloj", at("esperan") - 0.05, 1.1, 0.5, 0.3)
    # 8: el viernes, el banco cerrado; rompen la capa y entran
    put("calendario", at("viernes") - 0.05, 0.6, 0.35, 0.15)
    put("persiana", at("cerrado") - 0.1, 1.1, 0.45, 0.3)
    put("rotura", at("rompen") + 0.22, 1.1, 0.75, 0.3)
    put("pasos", at("entran") - 0.05, 0.9, 0.4, 0.3)
    # 9–10: cámaras y sensores apagados; los fajos de 50
    put("apagado", at("cámaras") - 0.02, 0.7, 0.45, 0.2)
    put("apagado", at("sensores") - 0.02, 0.7, 0.4, 0.2)
    put("fajos", at("billetes", 1, 10) - 0.02, 0.7, 0.5, 0.2)
    # 11: los billetes por el túnel; los contadores
    put("chorro", at("sacan") - 0.1, span(at("sacan"), at("reales") + 0.6), 0.5, 0.4)
    put("contador", at("toneladas") - 0.05, 1.0, 0.3, 0.25)
    put("contador", at("164") - 0.05, 1.0, 0.3, 0.25)
    # 12: el lunes abren la cámara
    put("calendario", at("lunes") - 0.05, 0.6, 0.35, 0.15)
    put("puerta", at("abren") - 0.05, 1.9, 0.6, 0.4)
    # 13: el mayor robo de Brasil; la sirena lejana
    put("titulo", at("mayor", 1, 13) - 0.05, 1.3, 0.5, 0.4)
    put("sirena", at("dinero") - 0.4, 2.3, 0.22, 0.8)
    # bucle: todo vuelve a su sitio
    put("vuelve", END - 0.85, 0.8, 0.4, 0.05)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "robo_banco.mp4")):
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
