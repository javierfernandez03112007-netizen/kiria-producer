"""Compone «El jefe de Nvidia dimite»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(estilo del vídeo de Derecho; Nvidia en verde, lo que se confiesa y las fechas en dorado, la dimisión, la caída y el espionaje en rojo) + la voz de Javi
(su MP3, ElevenLabs, Roger v4, a su velocidad natural) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx), uno por suceso.

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N    (o máquinas de ayuda con render_chunk.sh)
    python3 projects/nvidia_dimision/compose_nvd.py [--test t1 t2 ...] [--sfx]
"""
import json
import os
import subprocess
import sys
from multiprocessing import Pool

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.abspath(os.path.join(ROOT, ".."))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import prog, hex_bgr  # noqa: E402
from engine.subs import Subs, norm  # noqa: E402


FPS, W, H = 60, 1080, 1920
LINES = json.load(open(os.path.join(ROOT, "tiempos.json")))
T_HIT = 0.3
END = LINES[-1]["end"] + 1.2
N = int(END * FPS)
FRAMES = os.environ.get("FRAMES_DIR", os.path.join(ROOT, "out", "frames"))
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
BL, GR, TE, AM, OR, PK = "#8FE6FF", "#7CF0A9", "#62E3D4", "#FFB547", "#FF9A4A", "#FF8FB5"
_K = {1: {"jefe": WH, "nvidia": GR, "dimitido": R, "confesar": WH, "infidelidad": GO},
      2: {"empresa": WH, "investiga": WH, "infiel": GO, "otra": R, "cosa": R, "final": R},
      3: {"jensen": WH, "huang": WH, "33": GO, "años": GO, "nvidia": GR, "valiosa": GO, "mundo": GO},
      4: {"domingo": GO, "empleados": WH, "fui": GO, "infiel": GO, "mujer": GO},
      5: {"consejo": WH, "investigación": GO, "pocos": WH, "dimitió": R},
      6: {"jueves": GO, "bolsa": WH, "hundió": R, "13": R},
      7: {"respuesta": WH, "investigan": WH, "objetivo": GO, "espionaje": R, "extranjero": R},
      8: {"washington": WH, "post": WH, "mujer": WH, "sospechosa": R, "espiar": R, "china": R, "york": WH, "times": WH, "relación": GO, "directiva": GO, "órdenes": GO},
      9: {"infidelidad": GO, "obligar": R, "dimitir": R, "mándaselo": GO, "vida": GO, "privada": GO}}
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


# ---------------------------------------------------------------- efectos: SOLO de la biblioteca de ElevenLabs del canal (projects/<vídeo>/assets/sfx),
# cada uno en el instante en que pasa la cosa y cortado cuando termina (con un fundido corto): no queda nada sonando de fondo.
_CACHE = {}


def sample(name, sr):                             # mono 48 kHz, sin el silencio del principio, pico a 0,5
    if name not in _CACHE:
        proj, n = name.split("/")
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(PROJ, proj, "assets", "sfx", n + ".mp3"), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
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
        x = sample(name, sr)
        if t0 < 0:
            start, t0 = start - t0, 0.0
        x = x[int(start * sr):][:max(1, int(dur * sr))].copy()
        fi = min(len(x), int(0.004 * sr)); x[:fi] *= np.linspace(0, 1, fi)
        fo = min(len(x), int(fade * sr)); x[len(x) - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
        sfx.mix(out, x, max(0.0, t0), g)

    # 1: la alianza cae sobre el chip (golpe) y lo parte; con «ha dimitido», la silla vacía se va rodando
    put("lanzamiento/cae", 0.0, T_HIT, 0.28, 0.05)
    put("lanzamiento/mazo", T_HIT - 0.04, 0.9, 0.6, 0.25)
    put("gta6/raja", T_HIT + 0.01, 0.8, 0.45, 0.25)
    put("lanzamiento/desliza", at("dimitido", 1, 1) - 0.05, 1.4, 0.35, 0.4)
    # 2: sube la vitrina con la carpeta de la investigación; la luz roja y la interrogación
    put("medicina/vitrina", at("empresa", 1, 2) - 0.2, 0.9, 0.42, 0.25)
    put("avion/pregunta", at("otra", 1, 2) - 0.1, 0.8, 0.4, 0.25)
    # 3: retrocede hasta el primer pedestal; la placa; el calendario pasa de 1993 a 2026; suben los fajos; la medalla del n.º 1
    put("avion/whoosh_largo", at("final", 1, 2) + 0.2, 1.3, 0.3, 0.35)
    put("magisterio/madera_toc", at("huang", 1, 3) - 0.15, 0.4, 0.35)
    put("magisterio/calendario", at("33", 1, 3) - 0.25, 1.0, 0.36, 0.25)
    put("robo_banco/fajos", at("nvidia", 1, 3) - 0.1, 0.9, 0.42, 0.25)
    put("economia/medalla", at("valiosa", 1, 3) - 0.12, 0.6, 0.45, 0.2)
    # 4: vuelo a la carta; la frase se escribe a máquina
    put("medicina/whoosh", at("domingo", 1, 4) - 0.25, 0.6, 0.28, 0.2)
    put("lanzamiento/teclea", at("fui", 1, 4) - 0.02, at("mujer", 1, 4) + 0.35 - at("fui", 1, 4), 0.32, 0.12)
    # 5: el documento del consejo; el sello «ABIERTA»; con «dimitió», la placa cae y la silla se va
    put("magisterio/papel", at("consejo", 1, 5) - 0.25, 0.5, 0.35, 0.2)
    put("robo_banco/sello", at("investigación", 1, 5) + 0.17, 0.45, 0.6, 0.15)
    put("magisterio/madera", at("dimitió", 1, 5) + 0.3, 0.5, 0.45, 0.2)
    put("lanzamiento/desliza", at("dimitió", 1, 5) - 0.05, 1.0, 0.22, 0.3)
    # 6: vuelo a la bolsa; la campana de apertura; la acción se desploma y caen los fajos de arriba
    put("avion/whoosh", at("jueves", 1, 6) - 0.25, 0.6, 0.28, 0.2)
    put("economia/ding", at("abrir", 1, 6) - 0.02, 1.2, 0.5, 0.4)
    put("economia/caida", at("hundió", 1, 6) - 0.1, 1.0, 0.45, 0.3)
    put("medicina/caen", at("hundió", 1, 6) + 0.08, 0.9, 0.35, 0.3)
    # 7: vuelo al expediente; la lupa descubre el micrófono
    put("avion/whoosh_largo", at("respuesta", 1, 7) - 0.3, 1.0, 0.28, 0.3)
    put("cripto/espia", at("espionaje", 1, 7) - 0.12, 1.0, 0.42, 0.3)
    # 8: aparece la silueta (se vuelve roja con «sospechosa»); el organigrama, la línea hasta la directiva y la segunda silueta
    put("lanzamiento/asoma", at("mujer", 1, 8) - 0.15, 0.6, 0.38, 0.2)
    put("cerradura/aviso", at("sospechosa", 1, 8) - 0.1, 0.6, 0.35, 0.2)
    put("lanzamiento/tarjeta", at("otra", 1, 8) - 0.3, 0.45, 0.32)
    put("economia/rotulador", at("relación", 1, 8) - 0.05, at("directiva", 1, 8) + 0.35 - at("relación", 1, 8), 0.35, 0.15)
    put("lanzamiento/asoma", at("directiva", 1, 8) - 0.12, 0.6, 0.35, 0.2)
    # 9: vuelo a la balanza, que duda; mándaselo; vuelta al centro: el chip se cierra y la alianza sube (bucle)
    put("medicina/whoosh_largo", at("crees", 1, 9) - 0.3, 1.0, 0.28, 0.3)
    put("cerradura/metal", at("crees", 1, 9) + 0.2, 0.8, 0.3, 0.3)
    put("avion/whoosh_largo", at("mándaselo", 1, 9) - 0.1, 1.1, 0.28, 0.3)
    put("promo_web/rebobina", END - 1.75, 1.2, 0.3, 0.3)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "nvidia_dimision.mp4")):
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
