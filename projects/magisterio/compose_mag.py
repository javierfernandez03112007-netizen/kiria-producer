"""Compone «Magisterio por dentro»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(lo que llega en dorado, el bulo y los suspensos en rojo) + voz de Danny + efectos: sonidos reales del aula generados con ElevenLabs
(tiza, macarrones, ábaco, peonza, calendario, lápiz, timbre, niños a lo lejos y el ambiente de la clase) y sintetizados (golpes,
campanitas, acordes, chisporroteo de la red de conexiones).

    python3 ajustar_voz.py && python3 env_voz.py && python3 sfx_eleven.py
    WK=3 ./render_local.sh 0 N
    python3 projects/magisterio/compose_mag.py [--test t1 t2 ...] [--sfx]
"""
import importlib.util
import json
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

_spec = importlib.util.spec_from_file_location("compose_bi", os.path.join(ROOT, "..", "bomberados_ia", "compose_bi.py"))
CB = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(CB)

FPS, W, H = 60, 1080, 1920
LINES = json.load(open(os.path.join(ROOT, "tiempos.json")))
END = LINES[-1]["end"] + 1.2
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
_K = {1: {"magisterio": GO, "collares": WH, "macarrones": GO, "verdad": GO},
      2: {"sirven": R, "final": WH},
      3: {"jugar": R, "niños": WH, "realidad": WH, "aprende": GO, "cerebro": GO},
      4: {"psicología": GO, "edad": WH},
      5: {"matemáticas": GO, "sumar": WH, "contar": WH},
      6: {"lengua": GO, "leer": WH, "letra": WH},
      7: {"dislexia": WH, "tdah": WH, "autismo": GO, "misma": GO, "clase": GO},
      8: {"meses": GO, "prácticas": WH, "colegio": WH},
      9: {"fácil": R, "cataluña": WH, "mitad": R, "suspendió": R, "examen": WH},
      10: {"oposición": GO, "canarias": WH, "diecinueve": R, "plaza": GO, "infantil": WH},
      11: {"veinticinco": GO, "niños": WH, "tres": WH, "tú": GO},
      12: {"macarrones": GO, "ensartarlos": WH, "pinza": GO, "dedos": WH, "escribir": GO},
      13: {"blanco": WH, "negro": WH, "serie": GO, "estudio": WH, "cuatro": WH, "matemáticas": GO, "once": GO},
      14: {"cerebro": WH, "millón": GO, "conexiones": GO, "segundo": WH},
      15: {"sí": GO, "magisterio": WH, "collares": WH, "macarrones": WH, "sabiendo": GO, "qué": GO},
      16: {"mándaselo": GO, "fácil": R, "infantil": WH, "primaria": GO}}
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


# ---------------------------------------------------------------- efectos
_t, _lp = CB._t, CB._lp


def knock(sr, f=170.0, d=0.4, seed=1):            # golpe sobre madera
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    body = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (0.06 / m)) for m, a in [(1, 1), (2.3, 0.5), (3.9, 0.25)])
    return (body * 0.8 + (_lp(w, 3) - _lp(w, 20)) * np.exp(-t / 0.012) * 0.9) * np.minimum(1, t / 0.0008)


def metal(sr, f=2200.0, d=0.5, seed=2):           # clic metálico (pinza de la tarjeta)
    t = _t(d, sr)
    y = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (0.09 / m ** 0.7)) for m, a in [(1, 1), (1.47, 0.6), (2.09, 0.4), (2.76, 0.25)])
    w = np.random.default_rng(seed).standard_normal(len(t))
    return (y * 0.35 + (w - _lp(w, 2)) * np.exp(-t / 0.004) * 0.5) * np.minimum(1, t / 0.0005)


def heart(sr):                                    # latido («y tú»)
    t = _t(0.7, sr)
    one = lambda t0: np.sin(2 * np.pi * 52 * (t - t0)) * np.exp(-np.clip(t - t0, 0, None) / 0.07) * (t >= t0)  # noqa: E731
    return (one(0) + 0.7 * one(0.24)) * 0.9


_CACHE = {}


def sample(name, sr, peak=0.5):                   # efecto de ElevenLabs (assets/sfx/<name>.mp3) → mono, 48 kHz
    if name not in _CACHE:
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(ROOT, "assets", "sfx", name + ".mp3"), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).astype(np.float64)
        _CACHE[name] = x / (np.abs(x).max() + 1e-9) * peak
    return _CACHE[name]


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((END + 1) * sr))
    mix = lambda x, t0, g=1.0: sfx.mix(out, x, max(0.0, t0), g)  # noqa: E731
    # fondo: el aula (pájaros a lo lejos) en bucle y un dron muy suave
    amb = sample("aula", sr, 0.5)
    for k in range(int(END / (len(amb) / sr)) + 1):
        mix(amb, k * (len(amb) / sr) - k * 0.5, 0.28)
    mix(sfx.drone(len(out)), 0, 0.3)
    # 1: la chispa del collar; se aleja la cámara; «es verdad»
    mix(CB.shimmer(1.6, sr, 3), 0.0, 0.35)
    mix(sfx.whoosh(0.7), at("collares") - 0.2, 0.5)
    mix(knock(sr, 150, 0.45, 1), at("verdad") + 0.02, 0.9); mix(CB.chord(sr, (523.25, 659.25, 783.99), 1.0), at("verdad") + 0.05, 0.25)
    # 2: los macarrones forman la «?»
    mix(sample("macarrones", sr), at("para") + 0.05, 0.8)
    for i in range(16):
        mix(sfx.clack(200 + i), at("para") + 0.25 + i * 0.025, 0.12)
    mix(CB.blip(700, 400, 0.18, sr), at("final"), 0.4)
    # 3: la clase (niños a lo lejos al decir «jugar»); a la pizarra; la tiza dibuja el cerebro
    mix(sfx.whoosh(1.2), at("crees") - 0.1, 0.7); mix(sample("ninos", sr), at("jugar") - 0.1, 0.25)
    mix(sfx.whoosh(1.0), at("realidad"), 0.7)
    mix(sample("tiza", sr), at("aprender", 1, 3) + 0.05, 0.8); mix(sfx.ding(1046.5, 0.8), at("cerebro", 1, 3) + 0.05, 0.3)
    # transiciones entre rincones (la cámara vuela)
    for li in (4, 5, 6, 7, 8, 9, 10, 11, 12):
        mix(sfx.whoosh(0.7), first(li) - 0.45, 0.6)
    # 4: tallímetro: aparecen los niños de 1, 3 y 6 años
    for i, w in enumerate(("aprender", "niño", "edad")):
        mix(knock(sr, 260 - 40 * i, 0.3, 10 + i), at(w, 1, 4) - 0.05, 0.5)
    # 5: el ábaco suma; contar 1…5
    mix(sample("abaco", sr), at("sumar") - 0.08, 0.9)
    for i in range(5):
        mix(sfx.tick(4 + i), at("contar") + i * 0.07, 0.3)
    # 6: se abre el cuento; las letras de pasta caen una a una
    mix(CB.paper(sr, 0.25, 4, 1.2), at("enseñar", 1, 6), 0.6)
    for i, t0 in enumerate((at("letra", 1, 6), at("letra", 1, 6) + 0.2, at("letra", 1, 6) + 0.4, at("letra", 2, 6))):
        mix(knock(sr, 320 + 30 * i, 0.25, 20 + i), t0, 0.45); mix(sfx.clack(30 + i), t0 + 0.01, 0.2)
    # 7: b/d, la peonza, el ∞; «en la misma clase»
    mix(CB.blip(500, 800, 0.12, sr), at("dislexia"), 0.35); mix(sample("peonza", sr), at("tdah") - 0.05, 0.45)
    mix(CB.shimmer(1.0, sr, 9), at("autismo") - 0.05, 0.4); mix(sfx.whoosh(0.9), at("misma") - 0.1, 0.6)
    # 8: el calendario pasa hojas; la tarjeta de prácticas; el timbre del colegio
    mix(sample("calendario", sr), at("meses") - 0.02, 0.8); mix(metal(sr, 2600, 0.4, 5), at("prácticas") + 0.05, 0.4)
    mix(sample("timbre", sr), at("colegio"), 0.22)
    # 9: tiza «¿FÁCIL?», Cataluña, los 100; se tachan 45
    mix(sample("tiza", sr, 0.45), at("fácil", 1, 9) - 0.02, 0.8); mix(sample("tiza", sr, 0.4), at("este") - 0.05, 0.6)
    mix(sample("tiza_tachar", sr), at("mitad"), 0.9); mix(CB.buzz(0.3, sr, 100), at("suspendió") + 0.05, 0.3)
    # 10: el temario; los 19 muñecos; la plaza dorada
    mix(knock(sr, 140, 0.4, 30), at("oposición") + 0.02, 0.6); mix(sample("madera", sr), at("diecinueve") - 0.1, 0.8)
    mix(CB.shimmer(1.2, sr, 11), at("plaza") - 0.05, 0.5); mix(CB.chord(sr, (440.0, 554.37, 659.25, 880.0), 1.2), at("plaza"), 0.25)
    # 11: aparecen los 25 niños (murmullo); «y tú» (latido)
    mix(sample("ninos", sr), at("veinticinco") - 0.1, 0.45)
    for i in range(10):
        mix(sfx.clack(60 + i), at("veinticinco") + i * 0.045, 0.1)
    mix(heart(sr), at("y", 2, 11), 0.9)
    # 12: los macarrones vuelven al cuenco; ensartar; la pinza; el lápiz
    mix(sample("macarrones_cuenco", sr), at("macarrones", 1, 12) + 0.15, 0.8)
    mix(CB.paper(sr, 0.18, 12, 0.8), at("ensartarlos") + 0.2, 0.5); mix(sfx.clack(77), at("ensartarlos") + 0.35, 0.3)
    mix(metal(sr, 3200, 0.25, 13), at("pinza") + 0.1, 0.25); mix(sample("lapiz", sr), at("escribir"), 0.85)
    # 13: cada macarrón ensartado en la serie; la serie; el estudio; a la pizarra: matemáticas de once años
    for j, t0 in enumerate([at("negro") - 0.12] + [at("negro") + 0.12 + k * 0.1 for k in range(6)]):
        mix(sfx.clack(90 + j), t0 + 0.3, 0.25)
    mix(sfx.ding(1318.5, 0.8), at("serie") + 0.02, 0.3); mix(CB.paper(sr, 0.2, 14, 1.0), at("estudio"), 0.4)
    mix(sfx.whoosh(0.9), at("predice") - 0.05, 0.8); mix(sample("tiza", sr, 0.45), at("matemáticas", 1, 13) - 0.2, 0.7)
    mix(sample("tiza_tachar", sr, 0.35), at("once") - 0.05, 0.5)
    # 14: la red se enciende (chisporroteo que crece) y el millón
    mix(sfx.whoosh(0.8), first(14) - 0.6, 0.6)
    mix(CB.crackle(2.6, sr, 15, 0.002, 0.6), at("crea") - 0.1, 0.5); mix(CB.shimmer(2.4, sr, 16), at("crea"), 0.5)
    mix(CB.chord(sr, (392.0, 493.88, 587.33, 783.99), 1.6), at("millón") + 0.02, 0.35)
    # 15: vuelta al collar; «sí»; «sabiendo por qué»
    mix(sfx.whoosh(1.2), at("así") - 0.2, 0.8); mix(knock(sr, 170, 0.4, 40), at("sí", 1, 15) + 0.02, 0.7)
    mix(CB.shimmer(2.0, sr, 17), at("sabiendo") - 0.1, 0.55); mix(CB.chord(sr, (523.25, 659.25, 783.99, 1046.5), 2.0), at("sabiendo") + 0.05, 0.4)
    # 16: el avión de papel; ¿Infantil o Primaria?; vuelta al principio
    mix(sfx.whoosh(0.6), at("mándaselo") - 0.1, 0.6); mix(CB.blip(600, 900, 0.12, sr), at("infantil", 1, 16), 0.3); mix(CB.blip(900, 1350, 0.12, sr), at("primaria"), 0.3)
    mix(CB.shimmer(1.4, sr, 18), END - 1.6, 0.3)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "magisterio.mp4")):
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    sfxp = os.path.join(ROOT, "out", "sfx.wav")
    sfx_track(sfxp)
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-i", sfxp, "-filter_complex",
           "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo,apad[v];[2:a]volume=0.4[s];[v][s]amix=inputs=2:duration=first:normalize=0,volume=1.6dB,alimiter=limit=0.89:level=false[a]",
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
