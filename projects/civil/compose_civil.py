"""Compone «Ingeniería Civil»: fotogramas 3D a 60 fps (out/frames, ya con el HUD) + subtítulos palabra a palabra en Impact
(Caminos en ámbar, Arquitectura en turquesa, los «no» en rojo) + voz + efectos sintetizados (el compás, el plano que se
despliega, el sello, la ley y el mazo, el «?», el lápiz y la viga, la tierra, la torre que cae, el tren, el viento, el agua
y la presa, el mapa, los edificios, el cartel partido, la casa y quien duerme).

    python3 ajustar_voz.py && python3 env_voz.py
    ./render_local.sh                                   (o trozos en varias máquinas + merge_chunks.sh)
    python3 projects/civil/compose_civil.py [--test t1 t2 ...] [--sfx]
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


# ---------------------------------------------------------------- subtítulos
CA, AR, R, WH = "#FFB547", "#62E3D4", "#FF5A4E", "#EEF2F6"
KEY = {1: {"arquitecto": AR, "puente": WH, "caminos": CA, "no": R, "casa": WH},
       2: {"ley": WH, "tribunal": WH, "supremo": WH},
       3: {"final": WH, "nadie": R},
       4: {"caminos": CA, "dibujáis": AR, "caiga": CA},
       5: {"arquitectos": AR, "calculáis": CA, "vivir": AR, "dentro": AR},
       6: {"caminos": CA, "suelos": WH, "pisa": WH, "estructuras": WH, "trenes": WH, "viento": WH, "presas": WH, "ríos": WH},
       7: {"carreteras": WH, "vías": WH, "segunda": CA, "alta": CA, "velocidad": CA},
       8: {"supremo": WH, "polideportivo": CA, "casa": WH, "no": R},
       9: {"1999": WH, "edificio": WH, "vive": AR, "estudia": AR, "cura": AR, "reza": AR, "arquitecto": AR},
       10: {"edificio": WH, "colegio": CA, "caminos": CA, "exclusiva": CA, "supremo": WH, "no": R},
       11: {"calcula": CA, "mejor": CA, "dormir": AR, "dentro": AR},
       12: {"caminos": CA, "arquitectura": AR, "arquitecto": AR}}
SUBS = None


def compose(fi):
    t = fi / FPS
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    SUBS.draw(img, t, 1 - prog(t, END - 0.5, 0.3))
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global SUBS
    SUBS = Subs(LINES, KEY, {}, y=330, size=96, style="accent", accent=hex_bgr(WH), stroke=8, face="impact")


# ---------------------------------------------------------------- efectos propios (el resto, de compose_bi)
_t, _lp = CB._t, CB._lp


def knock(sr, f=210.0, d=0.35, seed=1):          # golpe de madera (mazo)
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    body = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (0.06 / m)) for m, a in [(1, 1), (2.3, 0.5), (3.9, 0.25)])
    return (body * 0.8 + (_lp(w, 3) - _lp(w, 20)) * np.exp(-t / 0.012) * 0.9) * np.minimum(1, t / 0.0008)


def crack(sr, d=0.4, seed=2):                    # algo que se parte
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    hp = w - _lp(w, 6)
    grains = (np.random.default_rng(seed + 1).random(len(t)) < 0.004) * np.exp(-t / 0.12)
    return hp * np.exp(-t / 0.05) * 0.9 + np.convolve(grains, np.exp(-np.arange(200) / 25), "same") * 0.5 * np.sign(w)


def creak(sr, d=0.9, f0=70.0):                   # la torre que cruje al inclinarse
    t = _t(d, sr)
    f = f0 * (1 + 0.25 * np.sin(2 * np.pi * 3.1 * t) + 0.4 * t / d)
    saw = 2 * ((np.cumsum(f) / sr) % 1) - 1
    return _lp(saw, 18) * np.sin(np.pi * np.clip(t / d, 0, 1)) * 0.35


def rumble(d, sr, seed=3, f=48.0):               # tierra / presa que sube
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    return (_lp(w, 300) * 6 + np.sin(2 * np.pi * f * t) * 0.3) * np.sin(np.pi * np.clip(t / d, 0, 1)) * 0.5


def train(d, sr, seed=4):                        # el tren: rodadura + traqueteo
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    out = _lp(w, 60) * 2.2 * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.6
    x = 0.05
    while x < d - 0.1:
        for dx in (0.0, 0.07):
            k = CB.click(sr) * 0.8
            s = int((x + dx) * sr)
            out[s:s + len(k)] += k[:len(out) - s]
        x += 0.24
    return out * 0.6


def wind(d, sr, seed=5):
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 0.9 * t + 1) ** 2
    return (_lp(w, 8) - _lp(w, 40)) * am * np.sin(np.pi * np.clip(t / d, 0, 1)) * 0.9


def water(d, sr, seed=6):                        # el río
    t = _t(d, sr)
    w = np.random.default_rng(seed).standard_normal(len(t))
    bub = CB.crackle(d, sr, seed + 1, 0.003, 0.6)
    return ((_lp(w, 5) - _lp(w, 30)) * 0.55 + bub) * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.5)


def scratch(d, sr, seed=7, rate=16):             # lápiz / compás sobre el papel
    out = np.zeros(int(d * sr))
    rng = np.random.default_rng(seed)
    x = 0.0
    while x < d - 0.1:
        m = CB.marker(sr, rng.uniform(0.06, 0.11), int(rng.integers(1e6)))
        s = int(x * sr)
        out[s:s + len(m)] += m[:len(out) - s]
        x += 1 / rate * rng.uniform(0.7, 1.3)
    return out


def pop(sr, f=700.0):                            # algo que sale (edificio, icono)
    return CB.blip(f, f * 1.9, 0.12, sr) * 1.2


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((END + 1) * sr))
    mix = lambda x, t0, g=1.0: sfx.mix(out, x, max(0.0, t0), g)  # noqa: E731
    mix(sfx.drone(len(out)), 0, 0.45)
    # 1: el compás dibuja, el puente se despliega; la casa y el sello
    mix(CB.boom(sr, 1.0, 55), 0.0, 0.5)
    mix(scratch(0.85, sr, 1, 22), 0.0, 0.9)
    mix(sfx.whoosh(0.8), 0.35, 0.7)
    mix(CB.paper(sr, 0.35, 3, 1.4), 0.5, 0.8)
    mix(sfx.clack(1), 1.18, 0.6)
    mix(sfx.whoosh(0.5), at("puente", 1, 1) - 0.35, 0.5)
    mix(sfx.clack(2), at("puente", 1, 1) + 0.15, 0.6)
    mix(sfx.whoosh(0.7), at("ingeniero") - 0.2, 0.7)
    mix(CB.paper(sr, 0.3, 4, 1.2), at("ingeniero"), 0.6)
    tno = at("no", 1, 1) + 0.02
    mix(sfx.whoosh(0.4), tno - 0.35, 0.6)
    mix(CB.boom(sr, 1.2, 50), tno, 1.0)
    mix(sfx.clack(3), tno, 0.8)
    mix(CB.buzz(0.3, sr, 120), tno + 0.02, 0.45)
    mix(CB.ding(330.0, 0.8, sr), at("tu", 1, 1), 0.3)
    # 2: la ley cae; el mazo
    mix(sfx.whoosh(0.6), at("dicen") - 0.1, 0.6)
    mix(CB.boom(sr, 0.8, 70), at("ley", 1, 2), 0.7)
    mix(CB.paper(sr, 0.3, 5, 1.0), at("ley", 1, 2) + 0.02, 0.6)
    mix(sfx.whoosh(0.35), at("tribunal") - 0.05, 0.4)
    mix(knock(sr, 190, 0.45, 1), at("supremo", 1, 2) + 0.08, 1.0)
    mix(knock(sr, 190, 0.35, 2), at("supremo", 1, 2) + 0.36, 0.35)
    # 3: las barras vuelan del puente al «?»
    tq = at("por", 1, 3) - 0.2
    for i in range(14):
        mix(sfx.clack(10 + i), tq + 0.15 + i * 0.045, 0.25)
    mix(sfx.whoosh(0.9), tq, 0.6)
    mix(sfx.clack(30), at("final") + 0.25, 0.6)
    mix(CB.blip(500, 900, 0.1, sr), at("final") + 0.27, 0.35)
    mix(CB.buzz(0.22, sr, 150), at("nadie"), 0.35)
    # 4-5: el duelo
    mix(sfx.whoosh(1.0), at("caminos", 1, 4) - 0.45, 0.9)
    for i in range(6):
        mix(sfx.clack(40 + i), at("caminos", 1, 4) + 0.2 + i * 0.03, 0.2)
    mix(scratch(at("nosotros", 1, 4) - at("vosotros", 1, 4), sr, 8, 18), at("vosotros", 1, 4), 0.9)
    mix(CB.blip(600, 1200, 0.25, sr), at("hacemos", 1, 4), 0.35)
    mix(creak(sr, 1.0, 85), at("no", 1, 4), 0.8)
    mix(CB.ding(880.0, 0.7, sr), at("caiga") + 0.12, 0.45)
    mix(sfx.whoosh(0.5), at("arquitectos") - 0.15, 0.5)
    mix(CB.blip(900, 1400, 0.12, sr), at("calculáis") - 0.05, 0.4)
    for i in range(5):
        mix(CB.ding(1046.5 + 130 * i, 0.4, sr), at("vivir") - 0.05 + i * 0.07, 0.22)
    mix(CB.ding(1174.7, 0.8, sr), at("dentro", 1, 5) + 0.15, 0.45)
    # 6: bajo tierra, la torre, el puente, el tren, el viento, la presa
    mix(sfx.whoosh(1.3), at("por", 1, 6) - 0.1, 1.0)
    mix(rumble(1.2, sr, 3, 42), at("suelos") - 0.1, 0.8)
    mix(creak(sr, 1.1, 60), at("inclina") - 0.05, 0.9)
    mix(sfx.whoosh(0.5), at("estructuras") - 0.1, 0.7)
    mix(CB.boom(sr, 1.0, 55), at("estructuras") + 0.3, 0.9)
    mix(sfx.clack(50), at("estructuras") + 0.3, 0.7)
    for i in range(3):
        mix(sfx.clack(51 + i), at("estructuras") + 0.45 + i * 0.07, 0.35)
    mix(train(1.8, sr), at("trenes") - 0.5, 0.9)
    mix(wind(1.0, sr), at("viento") - 0.05, 0.9)
    mix(water(at("carreteras") - at("viento") + 0.6, sr), at("viento") - 0.4, 0.7)
    mix(rumble(0.7, sr, 7, 55), at("presas") - 0.05, 0.9)
    mix(CB.boom(sr, 0.8, 60), at("frenan") - 0.05, 0.5)
    # 7: el mapa
    mix(sfx.whoosh(1.0), at("carreteras") - 0.35, 0.8)
    mix(scratch(1.5, sr, 9, 26), at("carreteras") - 0.1, 0.6)
    for i in range(8):
        mix(CB.blip(1500 + i * 90, 2100 + i * 90, 0.05, sr), at("vías") + i * 0.1, 0.25)
    mix(CB.ding(784.0, 0.7, sr), at("segunda") - 0.02, 0.35)
    mix(CB.ding(1046.5, 0.9, sr), at("segunda") + 0.12, 0.4)
    mix(CB.shimmer(1.0, sr, 3), at("alta"), 0.4)
    # 8: el polideportivo sí, tu casa no
    mix(sfx.whoosh(0.8), at("aun") - 0.2, 0.6)
    mix(knock(sr, 220, 0.3, 3), at("supremo", 1, 8) + 0.05, 0.5)
    mix(pop(sr, 600), at("polideportivo") - 0.02, 0.6)
    mix(sfx.clack(60), at("polideportivo") + 0.15, 0.4)
    mix(pop(sr, 520), at("tu", 1, 8) - 0.08, 0.5)
    mix(CB.boom(sr, 0.7, 70), at("no", 1, 8), 0.6)
    mix(CB.buzz(0.25, sr, 130), at("no", 1, 8), 0.4)
    # 9: el libro de la ley y sus edificios
    mix(sfx.whoosh(0.9), at("porque") - 0.35, 0.8)
    mix(CB.paper(sr, 0.5, 12, 1.4), at("ley", 1, 9) - 0.1, 0.8)
    mix(CB.boom(sr, 0.6, 80), at("ley", 1, 9) + 0.4, 0.4)
    mix(CB.ding(659.25, 0.8, sr), at("1999"), 0.3)
    for i, w in enumerate(("vive", "estudia", "cura", "reza")):
        tv = at(w)
        mix(pop(sr, 650 + 120 * i), tv - 0.06, 0.6)
        mix(sfx.whoosh(0.3), tv + 0.3, 0.35)
        mix(sfx.clack(70 + i), tv + 0.55, 0.45)
    mix(scratch(0.6, sr, 11, 24), at("firma") - 0.05, 0.8)
    mix(CB.chord(sr, (440.0, 554.37, 659.25, 880.0), 1.2), at("arquitecto", 1, 9), 0.6)
    # 10: vuelta al puente; el cartel; el mazo lo parte
    mix(sfx.whoosh(1.2), at("arquitecto", 1, 9) + 0.15, 1.0)
    mix(CB.blip(400, 250, 0.2, sr), at("edificio", 1, 10), 0.35)
    mix(pop(sr, 480), at("colegio") - 0.08, 0.6)
    mix(CB.buzz(0.5, sr, 110), at("exclusiva") - 0.03, 0.3)
    mix(sfx.whoosh(0.4), at("supremo", 1, 10) - 0.05, 0.5)
    tk = at("dijo") + 0.04
    mix(knock(sr, 170, 0.5, 4), tk, 1.0)
    mix(crack(sr, 0.5, 5), tk + 0.01, 0.9)
    mix(CB.boom(sr, 0.9, 55), tk, 0.6)
    mix(sfx.clack(80), at("no", 2, 10) + 0.05, 0.6)
    mix(sfx.clack(81), at("no", 2, 10) + 0.14, 0.4)
    # 11: la casa vuelve; las fórmulas; dentro, alguien duerme
    mix(CB.paper(sr, 0.35, 14, 1.2), at("ley", 1, 11) + 0.1, 0.7)
    mix(sfx.clack(90), at("ley", 1, 11) + 0.45, 0.4)
    mix(CB.shimmer(1.4, sr, 5), at("ley", 1, 11), 0.35)
    mix(CB.rewind(sr, 0.5)[::-1].copy(), at("mejor") - 0.05, 0.5)
    mix(sfx.whoosh(0.9), at("mira", 2, 11) - 0.1, 0.6)
    mix(CB.pad(END - at("dormir"), sr, (261.63, 329.63, 392.0), 0.045), at("dormir") - 0.1, 1.0)
    mix(CB.ding(523.25, 1.2, sr), at("dormir") + 0.05, 0.3)
    # 12: el marcador y el cierre
    mix(sfx.whoosh(0.8), at("arquitectura", 1, 12) - 0.2, 0.6)
    mix(CB.ding(880.0, 0.6, sr), at("caminos", 1, 12), 0.35)
    mix(CB.ding(1174.7, 0.6, sr), at("arquitectura", 1, 12), 0.35)
    mix(pop(sr, 900), at("mándaselo") - 0.05, 0.5)
    mix(CB.rewind(sr, 0.65), END - 0.62 - 0.4, 0.6)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "ingenieria_civil.mp4")):
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
