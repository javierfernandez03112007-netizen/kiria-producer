"""Compone «El escalón torcido» (formato «Dos vidas», engine/FORMATO_DOS_VIDAS.md):
fotogramas 3D a 60 fps (out/frames) + subtítulos en Impact (arriba; el de abajo en azul grisáceo, el de arriba en dorado cálido, las cifras en cian)
+ la voz de Javi + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx), uno por suceso. Sin música.

    python3 ajustar_voz.py && python3 env_voz.py
    (render → out/frames)
    python3 projects/escalon_torcido/compose_escalon.py [--test t1 t2 ...] [--sfx]
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
HALF = bool(os.environ.get("HALF"))                    # HALF=1: vista previa con solo los fotogramas pares (30 fps reales)
WORDS = [dict(w, n=norm(w["w"]), line=i + 1) for i, l in enumerate(LINES) for w in l["words"]]


def at(word, k=1, line=None):
    c = 0
    for w in WORDS:
        if (line is None or w["line"] == line) and w["n"] == norm(word):
            c += 1
            if c == k:
                return w["start"] - 0.03
    raise KeyError(word)


GO, R, WH, GR, CY, AM = "#FFD76A", "#FF5A4E", "#EEF2F6", "#7CF0A9", "#5CF2E6", "#FFB547"
BL, WA, PK, YE = "#A9C1E0", "#FFC861", "#FF8FB0", "#FFE11A"          # el de abajo, el de arriba, el cerebro, la camiseta
_K = {1: {"abajo": BL, "año": CY, "puliendo": BL, "mismo": GO, "escalón": GO},
      2: {"arriba": WA, "uno": CY, "cada": CY, "día": CY, "torcidos": AM},
      3: {"abajo": BL, "vago": WH, "cerebro": PK, "trampa": R, "efecto": GO, "foco": GO},
      4: {"todo": AM, "mundo": AM, "mirando": AM, "errores": R},
      5: {"cornell": CY, "estudiantes": WH, "camiseta": YE, "vergonzosa": PK},
      6: {"mitad": AM, "uno": CY, "cuatro": CY},
      7: {"nadie": GR, "miedo": R, "quieto": R},
      8: {"quieto": R, "mejora": GR, "uno": CY, "ciento": CY, "año": CY, "treinta": GO, "siete": GO},
      9: {"torcido": AM, "ridículo": WH, "arriba": WA},
      10: {"mándaselo": GR, "meses": CY, "perfecto": GO}}
KEY = {li: {norm(w): c for w, c in d.items()} for li, d in _K.items()}
SUBS = None


def compose(fi):
    t = fi / FPS
    src = os.path.join(FRAMES, f"f{fi:05d}.jpg")
    if HALF and not os.path.exists(src):               # vista previa a 30 fps: si falta un fotograma impar, se repite el par anterior
        src = os.path.join(FRAMES, f"f{fi - fi % 2:05d}.jpg")
    img = cv2.imread(src).astype(np.float32) / 255
    SUBS.draw(img, t, 1 - prog(t, END - 0.5, 0.3))
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global SUBS
    SUBS = Subs(LINES, KEY, {}, y=330, size=96, style="accent", accent=hex_bgr(WH), stroke=8, face="impact")


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

    L = [l["start"] for l in LINES]; Le = [l["end"] for l in LINES]
    # 1: el de abajo pule (roce) y el bloque brilla
    put("cerradura/rasca", at("puliendo") - 0.05, 0.85, 0.16, 0.3)
    put("magisterio/brillo", at("escalón", 1, 1) - 0.1, 0.9, 0.22, 0.3)
    # 2: la cámara sube; uno, cada, día (tres bloques); los ángulos; mira escalera arriba
    put("avion/whoosh", L[1] - 0.15, 0.6, 0.2, 0.25)
    for w, g in (("uno", 0.26), ("cada", 0.22), ("día", 0.2)):
        put("magisterio/madera_toc", at(w, 1, 2) - 0.04, 0.4, g, 0.15)
    for j in range(4):
        put("avion/tap", at("torcidos") + 0.02 + 0.1 * j, 0.25, 0.17, 0.1)
    put("avion/whoosh_largo", at("casi") + 0.1, 1.1, 0.18, 0.4)
    # 3: baja deprisa; pule rápido; el cerebro; la trampa; el foco
    put("avion/whoosh", L[2] - 0.2, 0.6, 0.22, 0.25)
    put("cerradura/rasca_larga", at("vago") - 0.1, 1.0, 0.16, 0.3)
    put("robot_neuronas/cerebro", at("cerebro") - 0.1, 1.2, 0.26, 0.35)
    put("cerradura/bloqueo", at("trampa") - 0.05, 0.6, 0.28, 0.2)
    put("promo_web/focos", at("foco") - 0.08, 0.9, 0.34, 0.25)
    # 4: aparece la sala (murmullo corto) y las miradas; el error
    put("ade/multitud", at("creemos") - 0.2, 1.4, 0.12, 0.6)
    put("lanzamiento/laser", at("mundo") - 0.05, 0.7, 0.2, 0.25)
    put("avion/error", at("errores") - 0.05, 0.6, 0.26, 0.2)
    # 5: Cornell; el timbre de clase; la camiseta
    put("economia/panel", at("cornell") - 0.1, 0.6, 0.22, 0.2)
    put("magisterio/timbre", at("clase") - 0.1, 0.9, 0.2, 0.3)
    put("avion/pop", at("camiseta") - 0.05, 0.45, 0.3, 0.15)
    # 6: la mitad; se apagan las miradas; uno de cada cuatro
    put("avion/cifra", at("mitad") - 0.1, 0.5, 0.24, 0.2)
    put("gafas/barrido", at("vio") - 0.05, 0.7, 0.18, 0.25)
    put("cripto/check", at("cuatro") - 0.1, 0.45, 0.28, 0.15)
    # 7: la sala se va; el miedo; quieto (se congela)
    put("lanzamiento/absorbe", at("nadie") - 0.05, 0.6, 0.26, 0.2)
    put("lanzamiento/tension", at("miedo") - 0.1, 1.2, 0.18, 0.4)
    put("gafas/congelar", at("quieto", 1, 7) - 0.05, 1.1, 0.3, 0.35)
    # 8: rebobina al día 1; pasan los días; crece; ×37,8
    put("promo_web/rebobina", at("mejorar") - 0.12, 1.1, 0.3, 0.3)
    put("lanzamiento/dias", at("ciento") - 0.1, 0.8, 0.22, 0.3)
    put("robo_banco/calendario", at("día", 1, 8) - 0.1, 0.8, 0.2, 0.3)
    put("quimica/crece", at("año", 1, 8) - 0.1, 1.5, 0.22, 0.4)
    put("avion/subida", at("treinta") - 0.2, 1.6, 0.24, 0.5)
    put("medicina/dorado", at("siete") - 0.05, 0.8, 0.24, 0.3)
    # 9: se abre la trampilla (luz cálida), el latido, deja su escalón, las manos, sube
    put("cerradura/puerta_abre", at("escalón", 1, 9) - 0.15, 1.0, 0.3, 0.3)
    put("avion/brillo", at("escalón", 1, 9) + 0.35, 0.9, 0.18, 0.35)
    put("magisterio/latido", at("ridículo") - 0.05, 0.6, 0.22, 0.2)
    put("magisterio/madera_toc", at("deja", 2, 9) + 0.08, 0.4, 0.28, 0.15)
    put("lanzamiento/corazon", at("poco") - 0.05, 0.5, 0.26, 0.2)
    put("avion/sube", at("arriba", 1, 9) - 0.05, 1.0, 0.26, 0.3)
    put("magisterio/ding", at("arriba", 1, 9) + 0.5, 0.6, 0.22, 0.25)
    # 10: se cierra la trampilla; clic del flexo (otra persona); vuelve a pulir (enlaza con el principio)
    put("cerradura/clunk", at("mándaselo") + 0.5, 0.6, 0.24, 0.2)
    put("avion/clic", at("quien") - 0.06, 0.45, 0.3, 0.15)
    put("cerradura/rasca", at("perfecto") + 0.1, 0.8, 0.13, 0.3)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "escalon_torcido.mp4")):
    missing = [i for i in range(N) if (i % 2 == 0 or not HALF) and not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
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
    elif len(sys.argv) > 1:
        main(os.path.join(ROOT, sys.argv[1]))
    else:
        main()
