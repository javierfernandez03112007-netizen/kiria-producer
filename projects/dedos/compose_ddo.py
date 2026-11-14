"""Compone «Qué pasa cuando te crujes los dedos»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(estilo del vídeo de Derecho; la burbuja en turquesa, las cifras en dorado, lo que asusta en rojo, la respuesta en verde) + la voz de Javi (su MP3,
ElevenLabs, voz Nico v4, a su velocidad natural) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx), uno por suceso.

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N    (o máquinas de ayuda con render_chunk.sh)
    python3 projects/dedos/compose_ddo.py [--test t1 t2 ...] [--sfx]
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
_K = {1: {"crujirte": GO, "dedos": WH, "artritis": R, "médico": WH, "50": GO, "años": GO},
      2: {"razón": WH, "final": R},
      3: {"nudillo": WH, "cápsula": GO, "líquido": GO, "tirar": WH, "presión": R, "cae": R, "gas": TE, "burbuja": TE},
      4: {"2015": GO, "resonancia": WH, "tercio": GO, "segundo": GO},
      5: {"discute": WH, "ruido": WH, "nacer": TE, "romperse": GO},
      6: {"burbuja": TE, "20": GO, "minutos": GO, "crujir": R},
      7: {"respuesta": WH, "donald": GO, "unger": GO, "sola": WH, "mano": WH, "dos": GO, "veces": GO, "50": GO, "años": GO},
      8: {"ninguna": GR, "mano": WH, "ig": GO, "nobel": GO, "215": WH, "personas": WH, "mismo": GR},
      9: {"crujes": GO, "mándaselo": GO, "artritis": R}}
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

    # 1: el índice abierto cruje por dentro (0,3 s) y la mano se cruje los demás nudillos (un crujido por dedo); el contador de los 50 años
    for tc in [0.3, 0.64, 0.98, 1.34, 1.72]:
        put("medicina/huesos", tc - 0.01, 0.3, 0.55, 0.12)
    put("lanzamiento/dias", at("médico", 1, 1) - 0.05, 0.9, 0.3, 0.3)
    # 2: la interrogación roja
    put("avion/pregunta", at("tenían", 1, 2) - 0.1, 0.8, 0.38, 0.25)
    # 3: la cámara entra en el dedo (se abre la piel); tira del dedo; la presión cae; el gas se junta; ¡crac!: nace la burbuja de golpe
    put("avion/whoosh_largo", at("final", 1, 2) + 0.2, 1.3, 0.3, 0.35)
    put("lanzamiento/estira", at("tirar", 1, 3) - 0.05, 0.6, 0.38, 0.2)
    put("economia/caida", at("presión", 1, 3) - 0.08, 0.9, 0.35, 0.3)
    put("quimica/burbujas", at("gas", 1, 3) - 0.02, 0.6, 0.26, 0.25)
    put("medicina/huesos", at("golpe", 1, 3) - 0.01, 0.3, 0.6, 0.12)
    # 4: la cámara sale del dedo y baja el anillo de la resonancia; la pantalla; el cronómetro llega a 0,31 s
    put("medicina/whoosh", at("2015", 1, 4) - 0.25, 0.6, 0.28, 0.2)
    put("medicina/monitor", at("resonancia", 1, 4) - 0.1, 0.9, 0.3, 0.3)
    put("avion/cronometro", at("menos", 1, 4) - 0.05, 0.9, 0.32, 0.3)
    # 5: los dos círculos del debate: la burbuja que nace y la que se rompe
    put("avion/whoosh", at("discute", 1, 5) - 0.45, 0.6, 0.28, 0.2)
    put("quimica/burbujas", at("nacer", 1, 5) - 0.05, 0.6, 0.4, 0.25)
    put("tapas/pop", at("romperse", 1, 5) - 0.05, 0.4, 0.45, 0.15)
    # 6: el reloj de 20 minutos; «no vuelve a crujir»
    put("lanzamiento/tictac", at("durar", 1, 6) - 0.02, at("minutos", 1, 6) + 1.0 - at("durar", 1, 6), 0.3, 0.3)
    put("cerradura/denegado", at("crujir", 1, 6) - 0.05, 0.6, 0.32, 0.2)
    # 7: la cámara se aleja y entra la mano izquierda de Unger; la izquierda cruje (tres veces, como en la imagen: un ciclo cada 0,7 s) y el contador de 50 años
    put("avion/whoosh_largo", at("respuesta", 1, 7) - 0.3, 1.0, 0.28, 0.3)
    for k in range(3):
        put("medicina/huesos", at("crujió", 1, 7) - 0.3 + k * 0.7 + 0.1 - 0.01, 0.3, 0.38, 0.12)
    put("cripto/contador", at("50", 1, 7) - 0.1, 0.9, 0.28, 0.3)
    # 8: los dos índices se abren, sanos (sin artritis); el premio; las 215 personas
    put("medicina/whoosh", at("tuvo", 1, 8) - 0.25, 0.6, 0.28, 0.2)
    put("quimica/check", at("ninguna", 1, 8) - 0.1, 0.6, 0.4, 0.2)
    put("economia/medalla", at("ig", 1, 8) - 0.12, 0.6, 0.42, 0.2)
    put("magisterio/munecos", at("215", 1, 8) - 0.15, 1.0, 0.35, 0.3)
    # 9: vuelta a la mano, que se cruje otra vez
    put("avion/whoosh_largo", at("tú", 1, 9) - 0.2, 1.2, 0.28, 0.3)
    for i in (1, 3):
        put("medicina/huesos", at("mándaselo", 1, 9) + 0.15 + (i - 1) * 0.14 - 0.01, 0.3, 0.42, 0.12)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "dedos.mp4")):
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
