"""Compone «Ingeniería Aeroespacial»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(palabra clave en amarillo, como en «Industrial»; los «no» en rojo) + titulares que vibran en la respuesta («Te falta el máster»)
y en la pregunta final + voz + efectos sintetizados (el birrete que se pliega, el avión que pasa, el altímetro, el fuselaje,
el túnel de viento, el ala que cruje, la turbina que arranca, el cohete, la órbita, el radar, la formación y el máster que encaja).

    python3 ajustar_voz.py && python3 env_voz.py
    WK=3 ./render_local.sh 0 1030      (y los otros trozos en otras máquinas) → ./merge_chunks.sh
    python3 projects/aeroespacial/compose_aero.py [--test t1 t2 ...] [--sfx]
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
YELLOW, R, WH = "#FFC83D", "#FF5A4E", "#EEF2F6"
_K = {1: {"aeroespacial": YELLOW, "no": R, "aeronáutico": YELLOW}, 2: {"falta": YELLOW},
      3: {"12,484": YELLOW, "14": WH}, 4: {"aviones": WH, "todo": YELLOW, "vuela": YELLOW, "dentro": YELLOW},
      5: {"base": YELLOW, "cálculo": WH, "álgebra": WH, "física": WH, "química": WH, "dibujo": WH},
      6: {"aerodinámica": YELLOW, "toneladas": WH, "sostiene": YELLOW}, 7: {"estructuras": YELLOW, "doblan": WH, "romperse": R, "fibra": YELLOW, "carbono": YELLOW},
      8: {"propulsión": YELLOW, "reacción": WH, "cohetes": WH}, 9: {"orbital": YELLOW, "satélite": WH, "órbita": WH, "cae": R},
      10: {"navegación": YELLOW, "aeropuertos": YELLOW, "miles": WH, "chocar": R},
      11: {"aviones": WH, "motores": WH, "cohetes": WH, "satélites": WH, "seguro": YELLOW},
      12: {"falta": YELLOW, "máster": YELLOW}, 13: {"regulada": YELLOW, "técnico": WH, "máster": YELLOW, "habilitante": YELLOW, "4": WH, "2": YELLOW},
      14: {"6": YELLOW, "años": YELLOW, "vuela": YELLOW}, 15: {"guárdalo": YELLOW, "atreverías": YELLOW}}
KEY = {li: {norm(w): c for w, c in d.items()} for li, d in _K.items()}
HEAD = [
    (at("máster", 1, 12), at("profesión") - 0.05, [("Te falta ", "#FFFFFF"), ("el máster", YELLOW)]),
    (at("cuéntame"), END - 0.4, [("¿Te ", "#FFFFFF"), ("atreverías", YELLOW), ("?", "#FFFFFF")]),
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
    SUBS = Subs(LINES, KEY, {}, y=330, size=96, style="accent", accent=hex_bgr(YELLOW), stroke=8, face="impact")


# ---------------------------------------------------------------- efectos propios (el resto, de compose_bi y engine/sfx)
_t, _lp = CB._t, CB._lp


def flyby(d, sr, f0=2400.0, seed=1, low=1.0):     # avión que pasa: rugido + silbido de turbina con efecto Doppler
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    u = t / d
    amp = np.exp(-((u - 0.5) / 0.22) ** 2)
    f = f0 * (1.08 - 0.16 / (1 + np.exp(-(u - 0.5) * 12)))
    whine = np.sin(2 * np.pi * np.cumsum(f) / sr) * 0.12 + np.sin(2 * np.pi * np.cumsum(f * 1.51) / sr) * 0.05
    rum = (_lp(w, 25) - _lp(w, 260) * 0.5) * 1.6 * low
    return (rum + whine) * amp


def spool(d, sr, f0=300.0, f1=2600.0):            # la turbina que arranca: silbido que sube
    t = _t(d, sr)
    k = np.clip(t / (d * 0.8), 0, 1) ** 1.6
    f = f0 + (f1 - f0) * k
    w = np.random.default_rng(9).standard_normal(len(t))
    y = np.sin(2 * np.pi * np.cumsum(f) / sr) * 0.16 + np.sin(2 * np.pi * np.cumsum(f * 2.02) / sr) * 0.05 + (_lp(w, 6) - _lp(w, 40)) * 0.25 * k
    return y * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.15)


def rocket(d, sr, seed=5):                        # motor cohete: estruendo grave con chasquidos
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    lo = (_lp(w, 60) * 4 + (_lp(w, 8) - _lp(w, 30)) * 0.6) * (0.85 + 0.15 * np.sin(2 * np.pi * 7 * t))
    return (lo + CB.crackle(d, sr, seed + 1, 0.004, 1.2)) * np.minimum(1, t / 0.06) * np.minimum(1, (d - t) / 0.4)


def wind(d, sr, seed=6):                          # túnel de viento
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    am = 0.7 + 0.3 * np.sin(2 * np.pi * 0.8 * t + 1) ** 2
    return (_lp(w, 6) - _lp(w, 45)) * am * np.minimum(1, t / 0.3) * np.minimum(1, (d - t) / 0.4) * 1.1


def creak(d, sr, f0=55.0):                        # el ala que se dobla
    t = _t(d, sr)
    f = f0 * (1 + 0.3 * np.sin(2 * np.pi * 2.3 * t) + 0.5 * t / d)
    saw = 2 * ((np.cumsum(f) / sr) % 1) - 1
    return _lp(saw, 14) * np.sin(np.pi * np.clip(t / d, 0, 1)) * 0.45


def radar(sr, f=1400.0):                          # pitido de radar
    t = _t(0.18, sr)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.05) * np.minimum(1, t / 0.003) * 0.25


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((END + 1) * sr))
    mix = lambda x, t0, g=1.0: sfx.mix(out, x, max(0.0, t0), g)  # noqa: E731
    mix(sfx.drone(len(out)), 0, 0.4)
    mix(wind(END, sr, 1), 0, 0.12)                                       # aire de fondo (estamos sobre las nubes)
    # 1: el birrete se pliega en avión de papel; el avión de verdad; las alas que no llegan
    t0 = at("aeroespacial")
    mix(CB.paper(sr, 0.3, 3, 1.4), t0 - 0.15, 0.9)
    mix(sfx.whoosh(0.6), t0 + 0.05, 0.8)
    mix(flyby(1.6, sr, 2300, 1), t0 + 0.2, 1.0)
    mix(CB.boom(sr, 0.8, 60), t0 + 0.42, 0.5)
    mix(sfx.whoosh(0.8), at("acabas") + 0.1, 0.6)
    tno = at("no", 1, 1) + 0.08
    mix(sfx.clack(3), tno, 0.8)
    mix(CB.buzz(0.25, sr, 120), tno, 0.4)
    mix(sfx.clack(4), at("aeronáutico", 1, 1) + 0.02, 0.6)
    mix(CB.buzz(0.2, sr, 130), at("aeronáutico", 1, 1) + 0.02, 0.3)
    mix(CB.blip(500, 900, 0.1, sr), at("qué", 1, 2) + 0.05, 0.4)
    # 3: el avión sale de las nubes y sube; el altímetro se para en 12,484
    mix(sfx.whoosh(1.2), at("y", 1, 3) - 0.1, 0.7)
    mix(flyby(4.5, sr, 1900, 2, 1.3), at("politécnica") - 0.9, 1.0)
    for i in range(10):
        mix(sfx.tick(i), at("politécnica") + 0.25 + i * 0.2, 0.25)
    mix(sfx.ding(1567.98, 1.0), at("12,484") + 0.1, 0.5)
    mix(sfx.ding(2093.0, 0.9), at("sobre") + 0.02, 0.35)
    # 4: crucero; helicóptero, dron, cohete, satélite; picado al fuselaje
    mix(flyby(2.2, sr, 2100, 3), at("crees") - 0.3, 0.6)
    mix(sfx.whoosh(0.7), at("va", 2, 4) - 0.3, 0.6)
    mix(CB.blip(300, 260, 0.6, sr) * 0.6, at("va", 2, 4), 0.5)
    mix(CB.blip(1800, 2400, 0.12, sr), at("todo", 1, 4), 0.35)
    mix(rocket(1.4, sr, 5), at("lo", 1, 4) - 0.3, 0.5)
    mix(CB.shimmer(0.8, sr, 3), at("vuela", 1, 4), 0.35)
    mix(sfx.whoosh(0.5), at("así") - 0.05, 0.9)
    # 5: dentro del fuselaje, los bloques
    for w in ("cálculo", "álgebra", "física", "química", "dibujo"):
        mix(sfx.clack(hash(w) % 7), at(w) + 0.05, 0.6)
        mix(sfx.whoosh(0.3), at(w) - 0.1, 0.25)
    # 6: túnel de viento
    mix(sfx.whoosh(0.8), at("aerodinámica") - 0.3, 0.7)
    mix(wind(at("estructuras") - at("aerodinámica") + 0.2, sr, 7), at("aerodinámica") - 0.1, 0.7)
    mix(flyby(1.2, sr, 2000, 4), at("avión", 1, 6) - 0.6, 0.5)
    mix(CB.boom(sr, 0.7, 55), at("toneladas") + 0.05, 0.5)
    mix(CB.chord(sr, (523.25, 659.25, 783.99), 1.0), at("sostiene") + 0.05, 0.3)
    # 7: el ala se dobla sin romperse; fibra de carbono
    mix(sfx.whoosh(0.8), at("estructuras") - 0.2, 0.6)
    mix(creak(1.3, sr, 52), at("alas") + 0.0, 0.9)
    mix(creak(0.8, sr, 64), at("sin", 1, 7) + 0.05, 0.5)
    mix(CB.paper(sr, 0.25, 7, 1.2), at("fibra") + 0.05, 0.6)
    for i in range(4):
        mix(sfx.clack(10 + i), at("carbono") + 0.05 + i * 0.07, 0.3)
    # 8: turbina que arranca y se abre; el cohete
    mix(sfx.whoosh(0.7), at("propulsión") - 0.3, 0.8)
    mix(spool(2.0, sr), at("propulsión") + 0.0, 0.8)
    mix(sfx.clack(20), at("motores", 1, 8) + 0.2, 0.5)
    mix(CB.fwoom(0.8, sr, 4) if hasattr(CB, "fwoom") else CB.boom(sr, 0.8, 60), at("reacción") + 0.0, 0.6)
    mix(rocket(1.6, sr, 8), at("cohetes", 1, 8) - 0.2, 1.0)
    mix(CB.boom(sr, 1.0, 45), at("cohetes", 1, 8) - 0.15, 0.7)
    mix(sfx.whoosh(0.5), at("mecánica") - 0.35, 0.7)
    # 9: el cohete pone el satélite en órbita
    mix(rocket(2.2, sr, 11), at("mecánica") - 0.05, 0.6)
    mix(sfx.clack(30), at("cómo") + 0.25, 0.5)
    mix(CB.blip(700, 1100, 0.12, sr), at("satélite") - 0.05, 0.35)
    mix(CB.shimmer(1.2, sr, 5), at("órbita") - 0.05, 0.4)
    mix(CB.blip(900, 500, 0.3, sr), at("cae") + 0.02, 0.3)
    # 10: radar y llegadas
    for i in range(6):
        mix(radar(sr, 1400 + 60 * (i % 2)), at("navegación") + i * 0.55, 0.35)
    mix(sfx.ding(1318.5, 0.6), at("aeropuertos") + 0.05, 0.3)
    mix(CB.chord(sr, (659.25, 783.99, 987.77), 0.9), at("chocar") + 0.05, 0.25)
    mix(sfx.whoosh(0.6), at("de", 1, 11) - 0.3, 0.8)
    # 11: la formación
    mix(flyby(1.4, sr, 2200, 12), at("aviones", 1, 11) - 0.7, 1.0)
    mix(spool(0.9, sr, 1800, 2600), at("motores", 1, 11) - 0.2, 0.6)
    mix(rocket(1.6, sr, 13), at("cohetes", 1, 11) - 0.3, 0.6)
    mix(CB.shimmer(0.7, sr, 6), at("satélites") - 0.05, 0.35)
    mix(flyby(2.4, sr, 2000, 14, 0.8), at("y", 1, 11) - 0.2, 0.6)
    # 12-13: el máster encaja; profesión regulada; la llave; los años
    tland = at("máster", 1, 12) + 0.42
    mix(sfx.whoosh(0.5), at("máster", 1, 12) - 0.1, 0.6)
    mix(sfx.clack(5), tland, 0.9)
    mix(sfx.ding(1567.98, 1.2), tland + 0.02, 0.7)
    mix(sfx.ding(2093.0, 1.0), tland + 0.14, 0.45)
    mix(CB.boom(sr, 0.7, 70), at("profesión") + 0.15, 0.6)
    mix(sfx.clack(6), at("grado") + 0.05, 0.5)
    mix(sfx.clack(7), at("máster", 1, 13) + 0.2, 0.6)
    mix(sfx.clack(8), at("habilitante") + 0.12, 0.7)
    mix(sfx.ding(1760.0, 0.9), at("habilitante") + 0.2, 0.5)
    for i, w in enumerate(("4", "4", "4", "4", "2", "2")):
        mix(sfx.tick(i + 2), at("4") + i * 0.09 if i < 4 else at("2") + (i - 4) * 0.1, 0.35)
    mix(CB.chord(sr, (523.25, 659.25, 783.99, 1046.5), 1.4), at("6") + 0.05, 0.5)
    mix(flyby(1.8, sr, 2100, 15), at("6") + 0.3, 0.8)
    mix(rocket(1.4, sr, 16), at("todo", 1, 14) - 0.3, 0.4)
    # 15: marcapáginas, bocadillo y el birrete al aire (bucle)
    mix(sfx.clack(9), at("guárdalo") + 0.05, 0.6)
    mix(CB.blip(600, 1200, 0.12, sr), at("cuéntame") + 0.05, 0.4)
    mix(sfx.whoosh(1.2), at("te", 1, 15) + 0.1, 0.7)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "ingenieria_aeroespacial.mp4")):
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
