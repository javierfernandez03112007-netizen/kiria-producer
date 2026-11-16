"""Compone «Así funciona: el microondas»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(el peligro en rojo, el agua y las burbujas en celeste, el calor en naranja, el truco en verde, los datos en dorado) + la voz de Javi (su MP3 de
ElevenLabs, a tempo 1,0) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx), uno por suceso y cortados al terminar.

    python3 ajustar_voz.py && python3 env_voz.py
    (render con las máquinas de ayuda → out/frames)
    python3 projects/microondas/compose_microondas.py [--test t1 t2 ...] [--sfx]
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
GO, R, WH = "#FFC24A", "#FF5A4E", "#EEF2F6"
BL, GR, TE, AM, OR = "#8FE6FF", "#7CF0A9", "#62E3D4", "#FFB547", "#FF9A4A"
_K = {1: {"cuidado": R, "agua": BL, "microondas": WH, "saltar": R, "cara": R},
      2: {"magnetrón": OR, "radares": GO, "segunda": GO, "guerra": GO, "mundial": GO},
      3: {"ondas": TE, "2.450": GO, "millones": GO, "segundo": GO},
      4: {"agua": BL, "moléculas": BL, "giran": TE, "calor": OR},
      5: {"cazo": WH, "calor": OR, "abajo": OR, "burbujas": BL, "rayitas": GO, "fondo": GO},
      6: {"agua": OR, "taza": BL, "lisa": GO, "burbuja": BL, "nacer": BL},
      7: {"cien": R, "grados": R, "quieta": BL},
      8: {"mueves": WH, "café": AM, "hierve": R, "golpe": R, "salta": R, "fuera": R},
      9: {"fda": WH, "quemaduras": R, "graves": R, "manos": R, "cara": R},
      10: {"truco": GR, "más": GR, "palito": GR, "madera": GR, "vetas": GO, "burbujas": BL},
      11: {"micro": WH, "cazo": OR, "mándaselo": GR, "café": AM}}
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

    # 1: el micro en marcha; el agua estalla hacia la cámara y sale el vapor; la cámara sale por la puerta
    put("avion/ventilador", 0.75, 1.7, 0.3, 0.45)
    put("tapas/vierte", at("saltar") - 0.08, 0.8, 0.6, 0.25)
    put("quimica/vapor", at("cara", 1, 1) - 0.12, 0.9, 0.45, 0.3)
    put("avion/whoosh", at("tu", 1, 2) - 0.05, 0.55, 0.3)
    # 2–3: el magnetrón se despieza; se enciende (zumbido), salen las ondas, la cuenta sube
    put("robot_neuronas/despiece", at("magnetrón") + 0.05, 1.2, 0.5, 0.3)
    put("robot_neuronas/zumbido", at("dispara") - 0.05, 1.2, 0.5, 0.3)
    put("avion/onda", at("ondas") - 0.05, 1.0, 0.4, 0.3)
    put("tapas/medidor", at("2.450") - 0.05, 1.1, 0.35, 0.3)
    # 4: la cámara se mete en el agua; las moléculas
    put("cerradura/zambullida", at("agua", 1, 4) - 0.12, 0.8, 0.45, 0.25)
    put("quimica/molecula", at("moléculas") - 0.05, 0.9, 0.4, 0.25)
    # 5: la placa al rojo; las burbujas en las rayitas del fondo
    put("gafas/vaho", at("calor", 1, 5) - 0.05, 1.0, 0.35, 0.3)
    put("quimica/burbujas", at("burbujas", 1, 5) - 0.05, 1.2, 0.4, 0.3)
    # 6: la cámara térmica (y el silencio de la taza lisa)
    put("economia/pantalla", at("microondas", 1, 6) - 0.08, 0.5, 0.4)
    # 7: pasa de cien grados
    put("tapas/medidor", at("cien") - 0.05, 1.0, 0.4, 0.25)
    # 8: se abre la puerta, cae el café, hierve de golpe y salta fuera
    put("cerradura/clic_abre", at("pero") - 0.08, 1.0, 0.5, 0.25)
    put("tapas/sal", at("echas") - 0.05, 1.0, 0.45, 0.3)
    put("quimica/vapor", at("hierve") - 0.1, 0.9, 0.55, 0.25)
    put("tapas/vierte", at("salta", 1, 8) - 0.06, 0.8, 0.55, 0.25)
    # 9: la ficha de la FDA; el agua salta a la mano
    put("lanzamiento/tarjeta", at("fda") + 0.15, 0.5, 0.4)
    put("gafas/quemar", at("quemaduras") - 0.25, 0.8, 0.5, 0.25)
    # 10: el truco: las teclas; el palito; las burbujitas en sus vetas
    put("lanzamiento/teclas", at("truco") - 0.05, 0.6, 0.4)
    put("magisterio/madera_toc", at("palito") - 0.05, 0.5, 0.5)
    put("quimica/burbujas", at("burbujas", 1, 10) - 0.05, 1.0, 0.3, 0.3)
    # 11: ¡ding! del micro; el cazo hierve; vuelta al horno y el hervor que empieza otra vez (bucle con el primer fotograma)
    put("avion/ding", at("micro") - 0.03, 0.6, 0.45)
    put("quimica/burbujas", at("cazo", 1, 11) - 0.03, 0.6, 0.35, 0.2)
    put("avion/whoosh_largo", at("mándaselo") - 0.1, 1.2, 0.3, 0.3)
    put("lanzamiento/tension", at("microondas", 1, 11) - 0.05, END - at("microondas", 1, 11), 0.45, 0.05)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "microondas.mp4")):
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
