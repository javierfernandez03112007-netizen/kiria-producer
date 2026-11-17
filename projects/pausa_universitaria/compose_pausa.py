"""Compone el spot «La pausa universitaria» (16:9, 40 s): fotogramas 3D a 60 fps (out/frames, ya con «Otra clase más…» y el eslogan)
+ subtítulos de todo lo que se dice (el eslogan final va como rótulo, no como subtítulo) + la voz (un solo MP3, cada frase en su segundo del guion)
+ efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx). Sin música (no hay ninguna con licencia).

    python3 build_voz.py && python3 env_voz.py
    (render → out/frames)
    python3 projects/pausa_universitaria/compose_pausa.py [--test t1 t2 ...] [--sfx]
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


FPS, W, H = 60, 1920, 1080
LINES = json.load(open(os.path.join(ROOT, "tiempos.json")))
END = 40.0
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


# ---------------------------------------------------------------- subtítulos (abajo, centrados). «Entre clase y clase, recarga.» ya está en pantalla como eslogan.
SUB_LINES = [dict(l, words=[w for w in l["words"]]) for l in LINES]
SUB_LINES[5]["words"] = SUB_LINES[5]["words"][:9]
SUBS = None


def compose(fi):
    t = fi / FPS
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    SUBS.draw(img, t, 1.0)
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global SUBS
    SUBS = Subs(SUB_LINES, {}, {}, y=978, size=62, maxw=1640, max_words=9, max_chars=46, W=W, style="accent", accent=hex_bgr("#FFFFFF"), stroke=6, face="black")


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

    # 0–4 · el aula: ambiente, el cuaderno se cierra, el reloj, el timbre y se levanta
    put("magisterio/aula", 0.0, 3.7, 0.22, 0.9)
    put("magisterio/libro", 1.42, 0.6, 0.5, 0.2)
    put("robo_banco/reloj", 1.95, 0.95, 0.3, 0.3)
    put("magisterio/timbre", 2.9, 1.04, 0.42, 0.3)
    put("robo_banco/pasos", 3.6, 1.0, 0.28, 0.3)
    # 4–9 · el pasillo (solo las voces) y barrido hacia la barra
    put("avion/whoosh", 8.8, 0.6, 0.25)
    # 9–16 · la barra: la cafetera, el café, la leche, salta la tostada, cae en el plato, el tomate, el aceite y la taza se arrima
    put("quimica/vapor", 9.45, 0.9, 0.22, 0.3)
    put("tapas/vierte", 9.62, 0.83, 0.42, 0.2)
    put("tapas/vierte", 10.72, 0.75, 0.36, 0.25, start=0.08)
    put("avion/pop", 12.0, 0.45, 0.45, 0.15)
    put("tapas/plato", 12.5, 0.6, 0.38, 0.3)
    put("lanzamiento/desliza", 12.95, 0.52, 0.3, 0.2)
    put("quimica/gota", 14.2, 0.5, 0.32, 0.2)
    put("quimica/gota", 14.8, 0.5, 0.28, 0.2)
    put("lanzamiento/desliza", 15.32, 0.5, 0.32, 0.2)
    put("avion/whoosh", 15.95, 0.6, 0.22)
    # 16–25 · la mesa: ambiente de cafetería, el sorbo y la taza en su plato
    for t0 in (16.4, 19.0, 21.6):
        put("ade/multitud", t0, 3.0, 0.11, 0.7)
    put("tapas/trago", 18.25, 0.9, 0.4, 0.3)
    put("tapas/plato", 19.18, 0.35, 0.22, 0.2)
    # 25–33 · se levantan (sillas) y vuelven andando
    put("magisterio/madera_toc", 25.3, 0.5, 0.3, 0.2)
    for t0 in (26.0, 27.3, 28.6, 29.9, 31.2):
        put("robo_banco/pasos", t0, 1.0, 0.2, 0.3)
    put("avion/whoosh_largo", 32.6, 1.1, 0.24, 0.4)
    # 33–40 · plano final: aparece el eslogan
    put("avion/brillo", 35.8, 1.0, 0.32, 0.4)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "pausa_universitaria.mp4")):
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
