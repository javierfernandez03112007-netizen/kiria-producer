"""Compone «Tu producto, en 3D» (lanzamiento 2 de la web del estudio): fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos
palabra a palabra en Impact (presentaciones y «3D» en dorado, «foto» en rojo, la web y las redes en celeste) + la voz (ElevenLabs, engine/tts.py)
+ efectos SOLO de ElevenLabs (los de projects/lanzamiento/assets/sfx), uno por suceso y cortados cuando el suceso termina. Sin precios.

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N
    python3 projects/lanzamiento2/compose_l2.py [--test t1 t2 ...] [--sfx]
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
SFX_DIR = os.path.join(ROOT, "..", "lanzamiento", "assets", "sfx")      # los efectos de ElevenLabs del lanzamiento 1
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
_K = {1: {"foto": R},
      2: {"producto": WH, "3D": GO},
      3: {"foto": WH, "caja": GO, "bolsa": GO, "tarro": GO, "botella": GO, "lata": GO, "taza": GO},
      4: {"web": BL, "dedo": WH, "redes": BL, "vídeo": BL},
      5: {"domingo": GO, "tuyo": GR},
      6: {"kiria": GO, "enlace": GR, "privado": WH}}
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
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(SFX_DIR, name + ".mp3"), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).astype(np.float64)
        x = x / (np.abs(x).max() + 1e-9) * 0.5
        on = np.flatnonzero(np.abs(x) > 0.02)
        _CACHE[name] = x[max(0, on[0] - int(0.004 * sr)):] if len(on) else x
    return _CACHE[name]


def times():
    T = {"detach": at("foto", 1, 1) + 0.12, "land": at("es", 1, 2) + 0.02, "whip": at("3D", 1, 2), "pedUp": at("una", 1, 1),
         "dev0": at("subes") + 0.05, "fly0": at("foto", 1, 3) + 0.18, "upIn": at("ves") + 0.12,
         "phone0": at("en", 1, 4) - 0.2, "drag0": at("giran") + 0.02, "drag1": at("dedo") + 0.2, "tap": at("comprarlo") + 0.12,
         "reel": at("y", 1, 4) + 0.05, "heart": at("redes") + 0.02, "tryP": at("el", 1, 5) - 0.1, "cal": at("domingo") - 0.02, "tapUp": at("probarlo") + 0.15,
         "q": at("tuyo") + 0.03}
    priv = at("privado")
    T.update(back0=priv + 1.3, phoneDown0=priv + 1.25, fotoUp0=priv + 1.5, jarIn0=END - 1.55, pedDown0=END - 0.85)
    T["sw"] = [at(w) + 0.05 for w in ("caja", "bolsa", "tarro", "botella", "lata", "taza")]
    return T


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((END + 1) * sr))

    def put(name, t0, dur, g=1.0, fade=0.08, start=0.0):
        x = sample(name, sr)[int(start * sr):][:max(1, int(dur * sr))].copy()
        fi = min(len(x), int(0.004 * sr)); x[:fi] *= np.linspace(0, 1, fi)
        fo = min(len(x), int(fade * sr)); x[len(x) - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
        sfx.mix(out, x, max(0.0, t0), g)

    T = times()
    # 1: el tarro sale del papel (se hincha), sube la peana y el tarro salta a ella
    put("estira", 0.0, 0.9, 0.42, 0.25)
    put("sale", T["pedUp"] - 0.02, 0.45, 0.35, 0.15)
    put("whoosh", T["detach"] - 0.05, 0.6, 0.35, 0.2)
    put("solido", T["land"] - 0.02, 0.5, 0.5, 0.2)
    # 2: «3D», vuelta entera
    put("whoosh", T["whip"] - 0.03, 0.7, 0.4, 0.25)
    put("ping", T["whip"] + 0.05, 0.45, 0.3, 0.2)
    # 3: la foto se revela, se pulsa «Sube la foto», vuela y entra en la peana; cada presentación aparece de golpe
    put("papel", T["dev0"], 0.5, 0.35, 0.2)
    put("tap", at("foto", 1, 3) - 0.01, 0.3, 0.45)
    put("tarjeta", T["fly0"] - 0.02, 0.5, 0.4, 0.15)
    put("absorbe", T["upIn"] - 0.05, 0.5, 0.42, 0.2)
    for i, ts in enumerate(T["sw"]):
        put("burbuja", ts - 0.02, 0.38, 0.5 if i % 2 == 0 else 0.44, 0.15)
    # 4: sube el móvil (tu web); se gira con el dedo; «Añadir a la cesta»; en redes (me gusta)
    put("sale", T["phone0"], 0.5, 0.38, 0.2)
    put("desliza", T["drag0"] - 0.02, min(0.75, T["drag1"] - T["drag0"] + 0.1), 0.4, 0.2)
    put("tap", T["tap"] - 0.02, 0.3, 0.45)
    put("ping", T["tap"] + 0.06, 0.45, 0.32, 0.2)
    put("desliza", T["reel"] - 0.03, 0.4, 0.32, 0.12)
    put("corazon", T["heart"] - 0.01, 0.45, 0.5, 0.15)
    # 5: «Pruébalo con el tuyo»; el domingo; ¿el tuyo?
    put("desliza", T["tryP"] - 0.03, 0.4, 0.32, 0.12)
    put("dias", T["cal"], 0.55, 0.42, 0.2)
    put("tap", T["tapUp"] - 0.02, 0.3, 0.45)
    put("burbuja", T["q"] - 0.02, 0.38, 0.5, 0.15)
    # 6: comenta KIRIA; el avión de papel lleva el enlace por privado
    put("burbuja", at("comenta") - 0.02, 0.35, 0.45)
    put("teclas", at("kiria") - 0.02, 0.5, 0.42, 0.15)
    put("enviado", at("kiria") + 0.58, 0.5, 0.35, 0.2)
    put("avion", at("paso") - 0.05, max(0.15, at("privado") + 0.25 - at("paso") + 0.05), 0.4, 0.15)
    put("mensaje", at("privado") + 0.22, 0.6, 0.5, 0.2)
    # bucle: el tarro vuelve, baja el móvil, sube la polaroid y el tarro se mete otra vez en la foto
    put("burbuja", T["back0"] - 0.02, 0.35, 0.4, 0.15)
    put("absorbe", T["phoneDown0"], 0.5, 0.3, 0.2)
    put("sale", T["fotoUp0"], 0.45, 0.32, 0.15)
    put("vuelve", T["jarIn0"], 0.9, 0.38, 0.25)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "lanzamiento2.mp4")):
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
