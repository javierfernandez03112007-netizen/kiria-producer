"""Compone «El domingo por la tarde» (la ansiedad del domingo a las siete): fotogramas 3D a 60 fps (out/frames, ya con los rótulos de las fuentes)
+ subtítulos palabra a palabra en Impact + la voz de Javi (su MP3 de ElevenLabs, a tempo 1,0; solo se recortan silencios largos)
+ efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx), uno por suceso y cortados al terminar. Sin música (regla del canal).

    python3 ajustar_voz.py && python3 env_voz.py
    (render → out/frames)
    python3 projects/domingo_tarde/compose_domingo.py [--test t1 t2 ...] [--sfx]
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
GO, R, WH, GR, CY, AM, OR, PK, VI = "#FFD76A", "#FF5A4E", "#EEF2F6", "#7CF0A9", "#5CF2E6", "#FFB547", "#FF9A3D", "#FF5FB8", "#B58CFF"
_K = {1: {"siete": GO, "domingo": OR, "lunes": GO, "ventana": OR},
      2: {"pesa": R},
      3: {"cuarto": VI, "nada": WH, "pecho": R},
      4: {"pereza": WH, "cerebro": PK, "lunes": GO, "antes": GO},
      5: {"pasado": WH, "alarma": R, "estrés": R},
      6: {"único": GR, "ocho": OR, "diez": OR, "jóvenes": WH},
      7: {"ayuda": GR, "escribe": GR, "papel": WH, "lunes": GO},
      8: {"estudio": CY, "apuntaban": GR, "nueve": OR, "minutos": OR, "antes": OR},
      9: {"mándaselo": GR, "techo": VI}}
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

    A = lambda w, li, k=1: at(w, k, li)
    face, chest, eyes, brain, viv, alarm, al2, only = A("por", 2), A("encoge", 3), A("no", 4), A("cerebro", 4), A("viviendo", 4), A("enciende", 5), A("alarma", 5), A("y", 6)
    casi, diez, helpt, write, est, apunt, dormir, nueve, send = A("casi", 6), A("diez", 6), A("lo", 7), A("escribe", 7), A("en", 8), A("apuntaban", 8), A("dormir", 8), A("nueve", 8), A("mándaselo", 9)
    # 1: el cuarto en silencio (el reloj); el LUNES sale como la luna
    put("robo_banco/reloj", 0.05, 1.15, 0.3, 0.3)
    put("economia/subida", A("lunes", 1) - 0.1, 1.2, 0.34, 0.4)
    # 2: la cámara gira a su cara; «pesa»
    put("avion/whoosh", face - 0.4, 0.6, 0.26)
    put("avion/impacto", A("pesa", 2) - 0.03, 0.8, 0.3, 0.4)
    # 3: el cuarto; la mano al pecho: el nudo aprieta y un latido
    put("avion/whoosh", A("estás", 3) - 0.05, 0.6, 0.18)
    put("lanzamiento/tension", chest - 0.45, 0.9, 0.3, 0.3)
    put("medicina/latido", chest + 0.3, 0.9, 0.5, 0.3)
    # 4: los ojos; el cerebro se enciende y aparecen los pensamientos del lunes
    put("avion/whoosh", eyes - 0.3, 0.6, 0.2)
    put("robot_neuronas/cerebro", brain - 0.25, 1.2, 0.3, 0.5)
    for i in range(3):
        put("avion/pop", viv - 0.05 + i * 0.27, 0.35, 0.4, 0.12)
    # 5: la alarma del estrés y el pulso al pecho
    put("cripto/alarma", alarm - 0.1, 1.35, 0.3, 0.4)
    put("magisterio/latido", al2 + 0.05, 0.6, 0.5, 0.2)
    put("magisterio/latido", al2 + 0.7, 0.6, 0.45, 0.2)
    # 6: la cámara sale por la ventana; se encienden las ventanas de los que están igual
    put("avion/whoosh_largo", only - 0.05, 1.1, 0.3, 0.4)
    put("robo_banco/bombillas", casi - 0.05, 1.0, 0.42, 0.3)
    put("economia/ding", diez + 0.3, 0.6, 0.34, 0.3)
    # 7: vuelve a entrar; escribe: cada preocupación cae a la página y se vuelve un renglón
    put("avion/whoosh_largo", helpt - 0.5, 1.0, 0.28, 0.4)
    put("magisterio/lapiz", write - 0.3, 0.7, 0.4, 0.2)
    for i in range(3):
        put("medicina/lapiz", write + 0.5 + i * 0.72, 0.62, 0.4, 0.15, start=0.1 * i)
        put("lanzamiento/absorbe", write + 0.42 + i * 0.72, 0.4, 0.2, 0.15)
    # 8: el dato del estudio: dos barras y «9 min antes»
    put("economia/barras", est + 0.6, 0.6, 0.3, 0.2)
    put("economia/barras", apunt + 0.2, 0.6, 0.3, 0.2)
    put("avion/brillo", dormir - 0.1, 0.8, 0.22, 0.4)
    put("avion/cifra", nueve - 0.03, 0.4, 0.4, 0.15)
    put("economia/ding", nueve + 0.3, 0.6, 0.34, 0.3)
    # 9: cierra el cuaderno, suelta el aire… y vuelta a la puerta (el LUNES asoma otra vez: bucle)
    put("avion/aire", send + 0.45, 0.8, 0.34, 0.4)
    put("magisterio/libro", send + 1.0, 0.5, 0.36, 0.2)
    put("avion/whoosh", send + 0.7, 0.6, 0.16)
    put("economia/subida", END - 1.6, 1.2, 0.2, 0.6)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "domingo_tarde.mp4")):
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
