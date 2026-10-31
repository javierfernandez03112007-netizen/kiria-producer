"""Compone «Software vs Informática»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(Software en ámbar, Informática en turquesa, los «no»/«nada» en rojo, como el duelo de «Civil») + titulares que vibran
(«No es una profesión regulada», «¿Software o Informática?») + voz + efectos (campana del ring, guantes, chispas, el BOE que cae,
el código que encaja, el ordenador que se abre, teclas, la ola de móviles, las ramas, las casillas, el marcador, las especialidades,
los cubos, la ley en blanco, los títulos que se van, los sellos y el cinturón).

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 N      (y trozos en otras máquinas) → ./fetch_compose.sh
    python3 projects/software/compose_sw.py [--test t1 t2 ...] [--sfx]
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
from engine.fin_draw import text, paste, prog, eo, eback, hex_bgr  # noqa: E402
from engine.subs import Subs, norm  # noqa: E402

# los sintetizadores de efectos son los de «Bomberados IA»
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


# ---------------------------------------------------------------- subtítulos y titulares
SWC, INC, R, WH = "#FFB547", "#62E3D4", "#FF5A4E", "#EEF2F6"
_K = {1: {"software": SWC, "informática": INC, "rivales": WH, "boe": WH, "parte": SWC},
      2: {"ley": WH, "ninguna": R},
      3: {"informática": INC, "programáis": SWC, "ordenador": INC, "dentro": INC},
      4: {"software": SWC, "montar": INC, "programas": SWC, "millones": SWC},
      5: {"informática": INC, "generalista": INC, "circuitos": WH, "redes": WH, "operativos": WH, "inteligencia": WH, "artificial": WH, "software": SWC},
      6: {"software": SWC, "requisitos": WH, "arquitectura": WH, "pruebas": WH, "semanas": SWC},
      7: {"informática": INC, "10,175": INC, "software": SWC, "10,036": SWC, "décimas": WH},
      8: {"boe": WH, "software": SWC, "cinco": WH, "especialidades": WH, "informática": INC},
      9: {"mitad": WH, "misma": WH, "48": SWC, "especialidad": SWC},
      10: {"ley": WH, "programar": WH, "nada": R},
      11: {"regulada": R, "programar": WH},
      12: {"título": R, "colegio": R},
      13: {"título": WH, "sabe": SWC, "hacerlo": SWC},
      14: {"software": SWC, "informática": INC, "comentarios": WH, "informático": INC}}
KEY = {li: {norm(w): c for w, c in d.items()} for li, d in _K.items()}
HEAD = [
    (at("regulada") - 0.35, at("título", 1, 12) - 0.05, [("No es una profesión ", "#FFFFFF"), ("regulada", R)]),
    (at("equipo", 1, 14), END - 0.4, [("¿Software ", SWC), ("o ", "#FFFFFF"), ("Informática", INC), ("?", "#FFFFFF")]),
]
SUBS = None
def headline(img, t, t0, t1, parts, y=1540, size=108):
    a = eo(prog(t, t0, 0.18)) * (1 - prog(t, t1 - 0.2, 0.2))
    if a < 0.01:
        return
    sprites = [text(s, size, "black", c, shadow=0.75) for s, c in parts]
    widths = [sp[1].shape[1] - int(size * 0.7) for sp in sprites]
    total = sum(widths)
    v = max(0.0, 1 - (t - t0) / 0.5)
    jx, jy = 9 * v * np.sin((t - t0) * 95), 5 * v * np.cos((t - t0) * 120)
    s = 0.88 + 0.12 * eback(prog(t, t0, 0.25))
    s *= min(1.0, (W - 100) / total)          # que nunca se salga de la pantalla
    x = W / 2 - total * s / 2 + jx
    for sp, wdt in zip(sprites, widths):
        paste(img, sp, x + wdt * s / 2, y + jy, a, scale=s)
        x += wdt * s


def compose(fi):
    t = fi / FPS
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    SUBS.draw(img, t, 1 - prog(t, END - 0.5, 0.3))
    for t0, t1, parts in HEAD:
        headline(img, t, t0, t1, parts)
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global SUBS
    SUBS = Subs(LINES, KEY, {}, y=330, size=96, style="accent", accent=hex_bgr(WH), stroke=8, face="impact")


# ---------------------------------------------------------------- efectos propios (el resto, de compose_bi y engine/sfx)
_t, _lp = CB._t, CB._lp


def bell(sr, f=1180.0, d=1.4):                    # campana del ring
    t = _t(d, sr)
    y = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d * 0.28 / m ** 0.4)) for m, a in [(1, 1), (2.32, 0.6), (3.9, 0.35), (5.1, 0.2)])
    return y * np.minimum(1, t / 0.001) * 0.32


def thud(sr, f=95.0, d=0.25, seed=1):             # guante que golpea
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    return (np.sin(2 * np.pi * f * t * np.exp(-t * 6)) * np.exp(-t / 0.05) * 0.9 + (_lp(w, 4) - _lp(w, 30)) * np.exp(-t / 0.015) * 0.7)


def zap(d, sr, seed=3):                           # chispazo eléctrico
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    buzz = np.sign(np.sin(2 * np.pi * 120 * t)) * 0.15 + (w - _lp(w, 3)) * 0.35
    am = (np.random.default_rng(seed + 1).random(int(d * 60) + 1) > 0.4).astype(float).repeat(int(sr / 60) + 1)[:len(t)]
    return buzz * am * np.minimum(1, (d - t) / 0.05) * 0.7


def typing(d, sr, seed=4, rate=14):               # teclado
    out = np.zeros(int(d * sr)); rng = np.random.default_rng(seed); x = 0.0
    while x < d - 0.05:
        k = CB.click(sr) * rng.uniform(0.5, 1.0); s = int(x * sr); out[s:s + len(k)] += k[:len(out) - s]; x += 1 / rate * rng.uniform(0.6, 1.4)
    return out


def knock(sr, f=170.0, d=0.4, seed=1):            # sello / mazo
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    body = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (0.06 / m)) for m, a in [(1, 1), (2.3, 0.5), (3.9, 0.25)])
    return (body * 0.8 + (_lp(w, 3) - _lp(w, 20)) * np.exp(-t / 0.012) * 0.9) * np.minimum(1, t / 0.0008)


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((END + 1) * sr))
    mix = lambda x, t0, g=1.0: sfx.mix(out, x, max(0.0, t0), g)  # noqa: E731
    mix(sfx.drone(len(out)), 0, 0.45)
    # 1: campana, guantes, chispas; cae el BOE; el código encaja en el chip
    mix(bell(sr), 0.0, 0.7); mix(bell(sr), 0.32, 0.5)
    mix(zap(2.6, sr, 3), 0.1, 0.35)
    tr = at("rivales")
    mix(thud(sr, 90, 0.3, 1), tr + 0.05, 1.0); mix(thud(sr, 110, 0.25, 2), tr + 0.12, 0.7); mix(CB.boom(sr, 0.6, 60), tr + 0.08, 0.5)
    mix(sfx.whoosh(0.5), at("boe", 1, 1) - 0.3, 0.7); mix(CB.boom(sr, 1.0, 50), at("boe", 1, 1) + 0.15, 1.0); mix(CB.paper(sr, 0.3, 3, 1.2), at("boe", 1, 1) + 0.17, 0.7)
    mix(CB.blip(500, 900, 0.12, sr), at("una", 1, 1), 0.4); mix(sfx.whoosh(0.4), at("parte") - 0.05, 0.6); mix(sfx.clack(3), at("parte") + 0.32, 0.9); mix(sfx.ding(1567.98, 0.8), at("parte") + 0.34, 0.4)
    # 2: el código vuelve; la «?»; los dos tiemblan
    mix(sfx.whoosh(0.4), at("y", 1, 2), 0.5); mix(CB.blip(600, 1000, 0.1, sr), at("ley", 1, 2) + 0.02, 0.4); mix(CB.buzz(0.3, sr, 110), at("ninguna"), 0.45)
    # 3: el chip habla; el ordenador se abre en despiece
    for i in range(3):
        mix(thud(sr, 120, 0.2, 5 + i), at("vosotros", 1, 3) + i * 0.28, 0.35)
    mix(sfx.whoosh(1.2), at("nosotros", 1, 3) + 0.4, 0.9)
    mix(CB.boom(sr, 0.7, 70), at("por", 1, 3) + 0.05, 0.6)
    for i in range(6):
        mix(sfx.clack(10 + i), at("por", 1, 3) + 0.08 + i * 0.05, 0.4)
    # 4: se monta otra vez; terminal, app y la ola de móviles
    for i in range(6):
        mix(sfx.clack(20 + i), at("montar") + 0.1 + i * 0.07, 0.5)
    mix(sfx.whoosh(0.7), at("nosotros", 1, 4) - 0.3, 0.6); mix(typing(1.0, sr, 4), at("nosotros", 1, 4) - 0.3, 0.6)
    mix(CB.blip(700, 1400, 0.14, sr), at("construimos") + 0.25, 0.4); mix(sfx.clack(30), at("programas") + 0.5, 0.6)
    mix(CB.shimmer(1.4, sr, 3), at("millones") - 0.2, 0.6); mix(CB.chord(sr, (523.25, 659.25, 783.99, 1046.5), 1.2), at("millones") + 0.1, 0.3)
    # 5: las cinco ramas
    mix(sfx.whoosh(0.8), at("generalista") - 0.6, 0.7)
    for i, w in enumerate(("circuitos", "redes", "sistemas", "inteligencia", "software")):
        mix(CB.blip(500 + 120 * i, 900 + 160 * i, 0.12, sr), at(w, 1, 5) - 0.02, 0.4)
    # 6: casillas, cajas, pruebas en verde y versiones
    mix(sfx.whoosh(0.7), at("software", 1, 6) - 0.3, 0.6)
    for i in range(3):
        mix(sfx.tick(6 + i), at("requisitos") + 0.2 * i, 0.4)
    for i in range(3):
        mix(sfx.clack(40 + i), at("arquitectura") + 0.1 * i, 0.45)
    for i in range(5):
        mix(sfx.ding(1318.5 + 80 * i, 0.4), at("pruebas") + 0.14 * i, 0.22)
    for i in range(4):
        mix(CB.blip(900, 1600, 0.1, sr), at("entregan") + 0.42 * i, 0.3)
    # 7: el marcador
    mix(sfx.whoosh(0.8), at("politécnica") - 0.3, 0.6)
    for i in range(10):
        mix(sfx.tick(i), at("10,175") - 0.2 + i * 0.11, 0.25)
    for i in range(10):
        mix(sfx.tick(i), at("10,036") - 0.2 + i * 0.11, 0.25)
    mix(CB.buzz(0.25, sr, 150), at("ni", 1, 7), 0.35); mix(sfx.whoosh(0.4), at("décimas") - 0.1, 0.4)
    # 8: el BOE se abre; las 5 especialidades; la del software sale
    mix(CB.paper(sr, 0.4, 7, 1.3), at("boe", 1, 8) + 0.1, 0.8); mix(sfx.clack(50), at("cinco") + 0.05, 0.5); mix(sfx.ding(1567.98, 0.9), at("especialidades") + 0.2, 0.45)
    # 9: los cubos
    for i in range(12):
        mix(sfx.clack(60 + i), at("mitad") + i * 0.05, 0.22)
    for i in range(5):
        mix(sfx.clack(80 + i), at("48") + i * 0.07, 0.4)
    # 10: la ley se abre… en blanco
    mix(CB.paper(sr, 0.5, 9, 1.3), at("programar", 1, 10) - 0.05, 0.8); mix(CB.boom(sr, 1.2, 42), at("nada") + 0.02, 0.8)
    # 11-12: los títulos se van; el portátil compila igual; sellos
    mix(typing(2.6, sr, 6), at("profesión"), 0.5); mix(sfx.whoosh(0.5), at("una", 2, 11) - 0.05, 0.7); mix(sfx.whoosh(0.5), at("otra", 1, 11) - 0.05, 0.7)
    mix(sfx.ding(1760.0, 0.7), at("otra", 1, 11) + 0.2, 0.35)
    mix(knock(sr, 160, 0.45, 1), at("título", 1, 12) + 0.05, 1.0); mix(knock(sr, 150, 0.45, 2), at("colegio") + 0.05, 1.0)
    # 13: vuelta al ring; el cinturón para quien sabe hacerlo
    mix(sfx.whoosh(1.3), at("así") - 0.1, 0.9); mix(typing(1.6, sr, 8), at("pelea"), 0.4)
    mix(bell(sr, 1180.0, 1.6), at("hacerlo") - 0.05, 0.6); mix(CB.chord(sr, (523.25, 659.25, 783.99, 1046.5), 1.6), at("hacerlo"), 0.45)
    # 14: cada equipo; comentarios; y vuelta a la campana (bucle)
    mix(thud(sr, 110, 0.25, 9), at("software", 1, 14) + 0.02, 0.6); mix(thud(sr, 95, 0.25, 10), at("informática", 1, 14) + 0.02, 0.6)
    mix(CB.blip(600, 1200, 0.12, sr), at("comentarios") + 0.05, 0.4); mix(sfx.whoosh(0.6), at("mándaselo") + 0.05, 0.5)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "software_vs_informatica.mp4")):
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    sfxp = os.path.join(ROOT, "out", "sfx.wav")
    sfx_track(sfxp)
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-i", sfxp, "-filter_complex",
           "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo,apad[v];[2:a]volume=0.35[s];[v][s]amix=inputs=2:duration=first:normalize=0[a]",
           "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-maxrate", "6M", "-bufsize", "12M", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart", dst]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(4, initializer=init) as pool:
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
