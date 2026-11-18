"""Compone «La ciudad de los seguidores», episodio 1: fotogramas 3D a 60 fps (out/frames, ya con la interfaz de juego) + el NOMBRE de cada
seguidor encima de su figurita (solo en local: out/names.json y out/labels.jsonl no se suben al repo) + subtítulos en Impact + la voz de Javi
(tempo 1,0) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx).

    python3 ajustar_voz.py && python3 env_voz.py
    node web/labels.mjs out/labels.jsonl 2205        (posiciones de los rótulos; local, sin render)
    (render → out/frames)
    python3 projects/ciudad_seguidores/compose_ciudad.py [--test t1 t2 ...] [--sfx]
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


from PIL import Image, ImageDraw, ImageFont  # noqa: E402

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


# ---------------------------------------------------------------- nombres de los seguidores (en local)
NAMES_F = os.environ.get("NAMES", os.path.join(ROOT, "out", "names.json"))
LABELS_F = os.path.join(ROOT, "out", "labels.jsonl")
NAMES, HIDE, LABELS, _TAG, _FONT, _FONT_S = None, set(), None, {}, None, None
TOP = 410                                           # por encima de esta altura no hay nombres (barra de arriba y subtítulos)
BASE = 44                                           # tamaño de letra de la etiqueta base (luego se escala)


def tag(i):                                         # etiqueta «@nombre»: píldora oscura con letra blanca (BGR premultiplicado, alfa)
    if i not in _TAG:
        txt = "@" + NAMES[i]
        l, t, r, b = _FONT.getbbox(txt)
        w, h = r - l + 36, 66
        im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle((0, 0, w - 1, h - 1), radius=h // 2, fill=(18, 24, 34, 225))
        d.text((18 - l, 9), txt, font=_FONT, fill=(255, 255, 255, 255))
        a = np.asarray(im, np.float32) / 255
        _TAG[i] = (a[..., [2, 1, 0]] * a[..., 3:], a[..., 3:])
    return _TAG[i]


def paste(img, rgb, al, x0, y0):
    h, w = rgb.shape[:2]
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if xa >= xb or ya >= yb:
        return
    sl = (slice(ya - y0, yb - y0), slice(xa - x0, xb - x0))
    img[ya:yb, xa:xb] = img[ya:yb, xa:xb] * (1 - al[sl]) + rgb[sl]


def home(n):                                        # cartel del hogar n: sus 5 seguidores (5n … 5n+4), con una casita arriba
    key = ("h", n)
    if key not in _TAG:
        who = [NAMES[i] for i in range(5 * n, min(len(NAMES), 5 * n + 5)) if i not in HIDE]
        fs = _FONT_S; ws = [fs.getbbox("@" + x)[2] for x in who]
        w, lh = max(ws + [120]) + 44, 44; h = 58 + lh * len(who) + 14
        im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle((0, 0, w - 1, h - 1), radius=22, fill=(255, 255, 255, 238))
        cx = w // 2; d.polygon([(cx - 22, 34), (cx, 12), (cx + 22, 34)], fill=(226, 72, 61, 255)); d.rectangle((cx - 15, 34, cx + 15, 50), fill=(47, 111, 208, 255))
        for k, x in enumerate(who):
            d.text((22, 58 + k * lh), "@" + x, font=fs, fill=(28, 36, 48, 255))
        a = np.asarray(im, np.float32) / 255
        _TAG[key] = (a[..., [2, 1, 0]] * a[..., 3:], a[..., 3:])
    return _TAG[key]


def scaled(sp, s, a):
    rgb, al = sp
    w, h = max(2, int(rgb.shape[1] * s + 0.5)), max(2, int(rgb.shape[0] * s + 0.5))
    return cv2.resize(rgb, (w, h), interpolation=cv2.INTER_AREA) * a, cv2.resize(al, (w, h), interpolation=cv2.INTER_AREA)[..., None] * a


def draw_tags(img, fi):
    if LABELS is None or fi >= len(LABELS):
        return
    L = LABELS[fi]
    for n, x, y, p10 in sorted(L["h"], key=lambda e: e[2]):       # primero los hogares (quedan debajo de los nombres de la gente)
        ppm = p10 / 10; s = min(0.8, max(0.45, ppm * 0.0052)); hh = home(n)[0].shape[0] * s
        a = min(1.0, (ppm - 80) / 15) * min(1.0, max(0.0, (y - hh - TOP) / 70))
        if a <= 0.02:
            continue
        rgb, al = scaled(home(n), s, a)
        paste(img, rgb, al, int(x - rgb.shape[1] / 2), int(y - rgb.shape[0]))
    for i, x, y, p10 in sorted(L["p"], key=lambda e: e[2]):
        if i in HIDE:
            continue
        ppm = p10 / 10; s = min(34.0, max(18.0, ppm * 0.24)) / BASE; h = 66 * s; y0 = y - h - 4 - (i % 3) * h * 1.06
        a = min(1.0, (ppm - 70) / 14) * min(1.0, max(0.0, (y0 - TOP) / 70))
        if a <= 0.02:
            continue
        rgb, al = scaled(tag(i), s, a)
        paste(img, rgb, al, int(x - rgb.shape[1] / 2), int(y0))


# ---------------------------------------------------------------- subtítulos
GO, R, WH, GR, CY, AM, OR, PK = "#FFD76A", "#FF5A4E", "#EEF2F6", "#7CF0A9", "#5CF2E6", "#FFB547", "#FF9A3D", "#FF5FB8"
_K = {1: {"seis": GO, "mil": GO, "personas": GO, "tú": GR},
      2: {"seguidor": CY, "habitante": CY, "nombre": GO, "casa": R, "existe": R},
      3: {"campamento": AM, "crece": GR, "pueblo": GR, "ciudad": GR, "mercado": OR, "banco": GO, "impuestos": R},
      4: {"sequía": AM, "precios": R, "crisis": R, "decidir": WH},
      5: {"trono": GO, "comentario": CY, "gusta": PK, "nombre": GR, "reina": GO},
      6: {"mándaselo": GR, "reinar": GO}}
KEY = {li: {norm(w): c for w, c in d.items()} for li, d in _K.items()}
SUBS = None


def compose(fi):
    t = fi / FPS
    img = cv2.imread(os.path.join(FRAMES, f"f{fi:05d}.jpg")).astype(np.float32) / 255
    draw_tags(img, fi)
    SUBS.draw(img, t, 1 - prog(t, END - 0.5, 0.3))
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


def init():
    global SUBS, NAMES, HIDE, LABELS, _FONT, _FONT_S
    SUBS = Subs(LINES, KEY, {}, y=330, size=96, style="accent", accent=hex_bgr(WH), stroke=8, face="impact")
    d = json.load(open(NAMES_F)); NAMES, HIDE = d["names"], set(d["hide"])
    LABELS = [json.loads(l) for l in open(LABELS_F)]
    _FONT = ImageFont.truetype(os.path.join(ROOT, "..", "..", "engine", "fonts", "Inter-Bold.otf"), BASE)
    _FONT_S = ImageFont.truetype(os.path.join(ROOT, "..", "..", "engine", "fonts", "Inter-Bold.otf"), 34)


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

    # 1: toda la población desde arriba; la cámara baja hasta un grupo y salen los nombres
    put("ade/multitud", 0.0, 2.6, 0.2, 0.8)
    put("avion/whoosh_largo", 2.5, 1.2, 0.3, 0.4)
    put("lanzamiento/burbuja", at("una", 1, 1) + 0.05, 0.5, 0.4, 0.2)
    # 2: cada seguidor, con su nombre encima; el solar vacío
    for i in range(4):
        put("avion/tap", at("nombre", 1, 2) - 0.02 + i * 0.12, 0.2, 0.35, 0.08)
    put("avion/pregunta", at("casa") - 0.05, 1.0, 0.3, 0.3)
    # 3: el campamento desde arriba; llegan más (+1, +1…); pueblo, ciudad, mercado, banco, impuestos
    put("avion/whoosh_largo", at("hoy") - 0.05, 1.2, 0.28, 0.4)
    for i in range(8):
        put("avion/tap", at("cuantos") + 0.1 + i * 0.23, 0.2, 0.32, 0.08)
    put("avion/construye", at("pueblo") - 0.1, 0.9, 0.4, 0.3)
    put("economia/torre", at("ciudad", 1, 3) - 0.1, 0.9, 0.4, 0.3)
    put("avion/pop", at("mercado") - 0.02, 0.4, 0.4, 0.15)
    put("economia/moneda_sola", at("banco") - 0.02, 0.6, 0.4, 0.2)
    put("economia/monedas_caen", at("impuestos") + 0.05, 1.1, 0.38, 0.3)
    # 4: sequía, subida de precios, crisis; vuelve a hoy (rebobina)
    put("avion/aire", at("sequía") - 0.05, 0.9, 0.3, 0.4)
    put("economia/precio_sube", at("subida") - 0.02, 0.9, 0.38, 0.3)
    put("avion/impacto", at("crisis") - 0.03, 0.7, 0.42, 0.3)
    put("promo_web/rebobina", at("y", 1, 4), 1.4, 0.32, 0.4)
    # 5: el trono vacío; el comentario y su «me gusta»; el cartel sin nombre; baja la corona y la gente salta
    put("avion/pregunta", at("quién") - 0.02, 1.0, 0.3, 0.3)
    put("lanzamiento/mensaje", at("comentario") - 0.05, 0.6, 0.4, 0.2)
    put("lanzamiento/corazon", at("gusta") - 0.25, 0.9, 0.4, 0.3)
    put("ade/letrero_on", at("nombre", 1, 5) - 0.08, 0.8, 0.4, 0.3)
    put("avion/brillo", at("reina") - 0.1, 1.0, 0.4, 0.4)
    put("ade/multitud", at("reina") + 0.4, 2.6, 0.3, 0.9)
    # 6: la cámara vuelve arriba (bucle con el primer fotograma)
    put("avion/whoosh_largo", END - 1.4, 1.2, 0.26, 0.4)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "ciudad_seguidores_ep1.mp4")):
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
