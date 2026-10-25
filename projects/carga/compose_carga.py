"""Compone «Carga sin cable»: fotogramas 3D a 60 fps (out/frames, ya con el HUD técnico) + subtítulos palabra a palabra
(palabra clave en ámbar) + voz + efectos de sonido sintetizados (zumbido de la bobina, pings, golpecitos, imanes, corte).

    python3 ajustar_voz.py
    ./render_local.sh                                   (o trozos en varias máquinas + merge_chunks.sh)
    python3 projects/carga/compose_carga.py [--test t1 t2 ...]
"""
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

FPS, W, H = 60, 1080, 1920
LINES = json.load(open(os.path.join(ROOT, "tiempos.json")))
END = LINES[-1]["end"] + 1.2
N = int(END * FPS)
FRAMES = os.path.join(ROOT, "out", "frames")
AUDIO = os.path.join(ROOT, "assets", "voz.mp3")
AMBER = "#FFB547"
WORDS = [dict(w, n=norm(w["w"]), line=i + 1) for i, l in enumerate(LINES) for w in l["words"]]


def at(word, k=1, line=None):
    c = 0
    for w in WORDS:
        if (line is None or w["line"] == line) and w["n"] == norm(word):
            c += 1
            if c == k:
                return w["start"] - 0.03
    raise KeyError(word)


KEY = {1: ["habla"], 2: ["dice"], 3: ["bobina", "cobre"], 4: ["sentido", "100000"], 5: ["campo", "magnético", "corriente"], 6: ["inducción", "faraday"],
       7: ["contacto", "nunca", "tocan"], 8: ["calor"], 9: ["50"], 10: ["imanes"], 11: ["alguien", "compatible"], 12: ["más", "menos"], 13: ["morse"],
       14: ["moneda", "llaves", "corta"], 15: ["hablando", "cable"]}
SUBS = None


def compose(fi):
    t = fi / FPS
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    SUBS.draw(img, t, 1 - prog(t, END - 0.5, 0.3))
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global SUBS
    SUBS = Subs(LINES, KEY, {}, y=330, size=82, style="accent", accent=hex_bgr(AMBER))


# ---------------------------------------------------------------- efectos sintetizados
def _t(d, sr):
    return np.arange(int(d * sr)) / sr


def hum(d, sr, f=100.0):          # zumbido eléctrico de la bobina (sube y baja suave)
    t = _t(d, sr)
    y = 0.55 * np.sin(2 * np.pi * f * t) + 0.28 * np.sin(2 * np.pi * 2 * f * t + 0.4) + 0.12 * np.sin(2 * np.pi * 3 * f * t + 1.1)
    a = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.35)
    return y * a * 0.18


def ping(f, d, sr, drop=0.03):     # sonar: seno con caída de tono y cola
    t = _t(d, sr)
    ph = 2 * np.pi * f * (t - drop * t * t / (2 * d))
    return (np.sin(ph) + 0.25 * np.sin(2 * ph)) * np.exp(-t / (d * 0.28)) * np.minimum(1, t / 0.003) * 0.3


def blip(f0, f1, d, sr):           # paquete: chirrido corto que sube o baja
    t = _t(d, sr)
    f = np.linspace(f0, f1, len(t))
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t / (d * 0.5)) * np.minimum(1, t / 0.002) * 0.28


def chatter(d, sr, seed=0):        # «hablan»: ráfaga de pitiditos tipo módem, muy bajitos
    rng = np.random.default_rng(seed)
    out = np.zeros(int(d * sr))
    x = 0.0
    while x < d - 0.05:
        b = blip(rng.uniform(900, 2400), rng.uniform(900, 2400), rng.uniform(0.025, 0.06), sr)
        s = int(x * sr)
        out[s:s + len(b)] += b[:len(out) - s] * 0.6
        x += rng.uniform(0.04, 0.09)
    return out * np.minimum(1, _t(d, sr) / 0.1)[:len(out)]


def sizzle(d, sr, seed=1):         # calor: chisporroteo de ruido que crece
    rng = np.random.default_rng(seed)
    t = _t(d, sr)
    n = rng.standard_normal(len(t))
    hp = n - np.convolve(n, np.ones(6) / 6, "same")
    crack = (rng.random(len(t)) < 0.0015) * rng.uniform(0.5, 1.0, len(t))
    crack = np.convolve(crack, np.exp(-np.arange(200) / 30), "same")
    return (hp * 0.08 + crack * 0.25) * np.minimum(1, t / d * 1.4) * np.minimum(1, (d - t) / 0.2)


def powerdown(d, sr):              # corte: el zumbido cae de tono y se apaga + golpe seco
    t = _t(d, sr)
    f = 260 * np.exp(-t / (d * 0.35)) + 30
    y = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t / (d * 0.45)) * 0.5
    y += np.sin(2 * np.pi * 55 * t) * np.exp(-t / 0.12) * 0.6
    return y


def buzz(d, sr):                   # «no cuadra»: aviso grave
    t = _t(d, sr)
    return np.sign(np.sin(2 * np.pi * 140 * t)) * 0.12 * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.03)


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((END + 1) * sr))
    mix = lambda x, t0, g=1.0: sfx.mix(out, x, max(0.0, t0), g)  # noqa: E731
    mix(sfx.drone(len(out)), 0, 0.8)
    # apertura: entra volando y el móvil «habla»
    mix(sfx.whoosh(0.9), 0.0, 0.6)
    mix(chatter(1.6, sr, 1), at("habla"), 0.5)
    t_land = at("apoyas") + 0.16
    mix(sfx.clack(1), t_land, 0.9)
    mix(sfx.ding(1567.98, 1.0), t_land + 0.06, 0.4)
    mix(sfx.ding(2349.3, 0.8), t_land + 0.16, 0.25)
    mix(sfx.tick(6), at("y", 1, 2), 0.6)                              # bocadillo
    mix(sfx.whoosh(0.5), at("cuento"), 0.35)                          # el bocadillo se va arriba
    # el truco: picado y el móvil sale disparado
    mix(sfx.whoosh(1.0), at("truco") - 0.15, 0.8)
    mix(sfx.ding(2637.0, 0.6), at("dentro") + 0.1, 0.2)               # rayos X
    mix(sfx.ding(1760.0, 0.8), at("bobina", 1, 3) + 0.05, 0.25)
    # corriente: zumbido + cambios de sentido cada vez más rápidos + contador
    mix(hum(3.3, sr, 100), at("corriente", 1, 4), 1.0)
    tt, d = at("cambia") + 0.05, 0.5
    while tt < at("crea") - 0.15:
        mix(sfx.tick(2 + min(10, int(0.5 / d))), tt, 0.5)
        tt += max(1 / 30, d)
        d *= 0.72
    for k in range(10):
        mix(sfx.tick(10 + k % 3), at("100000") + k * 0.05, 0.25)
    # campo y bobina receptora
    mix(sfx.whoosh(1.2), at("crea") - 0.2, 0.7)
    mix(sfx.whoosh(0.8), at("atraviesa") - 0.2, 0.5)                  # el móvil baja
    mix(hum(1.6, sr, 133), at("aparece"), 0.7)
    # inducción · Faraday
    mix(sfx.ding(1318.5, 1.1), at("inducción") + 0.05, 0.4)
    mix(sfx.whoosh(0.7), at("y", 1, 6) - 0.1, 0.5)
    mix(sfx.clack(3), at("faraday") + 0.02, 0.7)
    mix(sfx.ding(1975.5, 1.0), at("faraday") + 0.05, 0.35)
    # contacto y corte transversal
    mix(sfx.whoosh(0.8), at("parece") - 0.1, 0.5)
    mix(sfx.clack(2), at("contacto") + 0.1, 0.8)
    mix(blip(3000, 400, 0.35, sr), at("realidad"), 0.4)               # el corte
    mix(sfx.tick(12), at("nunca"), 0.5)
    mix(sizzle(1.6, sr), at("calor") - 0.2, 0.7)
    # la prueba: barras
    mix(sfx.whoosh(1.1), at("en", 1, 9) - 0.1, 0.8)
    for i, w in enumerate(("prueba", "gastó")):
        for k in range(6):
            mix(sfx.tick(3 + k + i * 3), at(w) + 0.15 + k * 0.1, 0.3)
    mix(sfx.ding(1567.98, 1.0), at("50") + 0.05, 0.45)
    mix(sfx.whoosh(0.5), at("descentrado") - 0.05, 0.35)
    for k in range(6):
        mix(sfx.tick(6 + k), at("aún") + 0.1 + k * 0.08, 0.3)
    mix(sfx.ding(1174.7, 1.0), at("aún") + 0.45, 0.4)
    # imanes: aparecen y lo centran de golpe
    for k in range(5):
        mix(sfx.clack(5 + k), at("imanes") - 0.15 + k * 0.05, 0.35)
    t_snap = at("centran") + 0.16
    mix(sfx.clack(9), t_snap, 1.0)
    mix(sfx.ding(2093.0, 0.9), t_snap + 0.03, 0.4)
    # la conversación
    mix(sfx.whoosh(1.2), at("y", 1, 11) - 0.1, 0.8)
    for w, f in (("pregunta", 1568), ("hay", 1568), ("sí", 1046), ("compatible", 1046)):
        mix(ping(f, 0.9, sr), at(w, 1, 11) if w != "hay" else at("hay", 1, 11), 0.55)
    tt = at("varias")
    while tt < at("golpecitos") - 0.1:
        mix(blip(1800, 1500, 0.04, sr), tt, 0.25)
        tt += 0.25
    mix(blip(900, 1900, 0.18, sr), at("más", 1, 12), 0.5)
    mix(blip(1900, 800, 0.18, sr), at("menos"), 0.5)
    mix(blip(1300, 1300, 0.14, sr), at("así"), 0.45)
    # golpecitos (morse): mismos tiempos que el campo en la escena
    x = at("golpecitos") - 0.02
    for dd in (0.08, 0.08, 0.22, 0.08, 0.08, 0.08, 0.22, 0.22, 0.08, 0.08, 0.22, 0.08):
        mix(blip(1200, 1200, dd + 0.02, sr), x, 0.45)
        x += dd + 0.07
    # balance de energía, la moneda y el corte
    mix(sfx.tick(8), at("cuenta"), 0.4)
    mix(buzz(0.35, sr), at("cuadra"), 0.6)
    mix(sfx.whoosh(0.6), at("algo") + 0.05, 0.5)
    mix(sfx.clack(4), at("robando") + 0.15, 0.6)
    mix(sizzle(2.6, sr, 3), at("robando") + 0.1, 0.8)
    mix(sfx.clack(7), at("llaves") - 0.1, 0.6)
    t_cut = at("corta")
    mix(powerdown(1.3, sr), t_cut, 1.0)
    mix(sfx.clack(0), t_cut, 1.0)
    # vuelve a apoyarse y «están hablando»
    mix(sfx.whoosh(0.7), at("próxima") + 0.05, 0.5)
    t_re = at("apoyes") + 0.12
    mix(sfx.clack(1), t_re, 0.8)
    mix(sfx.ding(1567.98, 1.0), t_re + 0.06, 0.35)
    mix(chatter(1.2, sr, 5), at("están"), 0.5)
    mix(sfx.tick(9), at("con", 1, 15), 0.4)
    mix(sfx.tick(11), at("sin", 1, 15), 0.4)
    mix(sfx.whoosh(1.1), END - 1.2, 0.6)                               # vuelve al principio (bucle)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "carga.mp4")):
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    sfxp = os.path.join(ROOT, "out", "sfx.wav")
    sfx_track(sfxp)
    # 60 fps reales con el peso controlado (≈45 MB como mucho) para que se pueda descargar
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
