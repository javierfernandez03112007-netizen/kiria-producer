"""Compone «La ciudad de los seguidores», episodio 2 (Kiria World): fotogramas 3D a 60 fps (out/frames, ya con la interfaz de juego) + el NOMBRE de cada
seguidor encima de su figurita (solo en local: out/names.json y out/labels.jsonl no se suben al repo) + subtítulos en Impact + la voz de Javi
(tempo 1,0) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx).

    python3 ajustar_voz.py && python3 env_voz.py
    node web/labels.mjs out/labels.jsonl 2545        (posiciones de los rótulos; local, sin render)
    (render → out/frames)
    python3 projects/ciudad_seguidores_ep2/compose_ciudad.py [--test t1 t2 ...] [--sfx]
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
NAMES_F = os.environ.get("NAMES", os.path.join(ROOT, "..", "ciudad_seguidores", "out", "names.json"))   # la lista del 17-11 (fuera del repo)
JOBS_F = os.path.join(ROOT, "out", "jobs.json")                 # qué hace cada uno (lo escribe web/labels.mjs)
JOBS, VIPS, KINGI = {}, set(), -1
LABELS_F = os.path.join(ROOT, "out", "labels.jsonl")
NAMES, HIDE, LABELS, _TAG, _FONT, _FONT_S = None, set(), None, {}, None, None
TOP = 410                                           # por encima de esta altura no hay nombres (barra de arriba y subtítulos)
BASE = 44                                           # tamaño de letra de la etiqueta base (luego se escala)


def tag(i):                                         # etiqueta «@nombre» (y, si trabaja o hace algo concreto, qué): píldora oscura; dorada para los que nombra la voz
    if i not in _TAG:
        txt, job, vip = "@" + NAMES[i], JOBS.get(i), i in VIPS
        l, t, r, b = _FONT.getbbox(txt); jw = (_FONT_S.getbbox(job)[2] + 16) if job else 0
        w, h = r - l + 36 + jw, 66
        im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle((0, 0, w - 1, h - 1), radius=h // 2, fill=(255, 208, 74, 245) if vip else (18, 24, 34, 225))
        d.text((18 - l, 9), txt, font=_FONT, fill=(40, 28, 0, 255) if vip else (255, 255, 255, 255))
        if job:
            d.text((18 + r - l + 14, 17), job, font=_FONT_S, fill=(90, 62, 0, 255) if vip else (124, 224, 160, 255))
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
        w, lh = max(ws + [120]) + 44, 44; h = 58 + lh * max(1, len(who)) + 14
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
    for n, x, y, p10 in sorted(L["h"], key=lambda e: e[2]):       # primero las casas (quedan debajo de los nombres de la gente)
        if 5 * n >= len(NAMES):
            continue
        ppm = p10 / 10; s = min(0.8, max(0.45, ppm * 0.0052)); hh = home(n)[0].shape[0] * s
        a = min(1.0, (ppm - 80) / 15) * min(1.0, max(0.0, (y - hh - TOP) / 70))
        if a <= 0.02:
            continue
        rgb, al = scaled(home(n), s, a)
        paste(img, rgb, al, int(x - rgb.shape[1] / 2), int(y - rgb.shape[0]))
    for i, x, y, p10 in sorted(L["p"], key=lambda e: (e[0] in VIPS, e[2])):
        if i in HIDE or i >= len(NAMES) or i == KINGI:
            continue
        ppm = p10 / 10; s = min(34.0, max(18.0, ppm * 0.24)) / BASE * (1.25 if i in VIPS else 1.0); h = 66 * s; y0 = y - h - 4 - (0 if i in VIPS else (i % 3) * h * 1.06)
        a = min(1.0, (ppm - 70) / 14) * min(1.0, max(0.0, (y0 - TOP) / 70))
        if a <= 0.02:
            continue
        rgb, al = scaled(tag(i), s, a)
        x0 = x - rgb.shape[1] / 2
        if i in VIPS:                                # los que nombra la voz no se salen de la pantalla
            x0 = min(max(x0, 14), W - rgb.shape[1] - 14)
        paste(img, rgb, al, int(x0), int(y0))


# ---------------------------------------------------------------- subtítulos
GO, R, WH, GR, CY, AM, OR, PK = "#FFD76A", "#FF5A4E", "#EEF2F6", "#7CF0A9", "#5CF2E6", "#FFB547", "#FF9A3D", "#FF5FB8"
_K = {1: {"kiria": GR, "world": GR, "rey": GO, "iannyanezz": GO, "corona": GO},
      2: {"seis": GO, "mil": GO, "ciento": GO, "veinticuatro": GO, "vida": GR},
      3: {"peluquería": PK, "hugo": GO, "alcaide": GO, "sofía": GO, "sagania": GO},
      4: {"supermercado": GR, "óscar": GO, "bena": GO, "carro": OR, "alanna": GO, "román": GO, "caja": OR},
      5: {"banco": GO, "guardias": CY, "dinero": GR, "furgón": CY},
      6: {"panaderos": AM, "bomberos": R, "taxistas": GO, "profesora": PK, "pescador": CY},
      7: {"leyes": R, "comentarios": CY},
      8: {"gusta": PK, "cumplirá": GR, "nuevo": GO, "rey": GO},
      9: {"mándaselo": GR, "mandar": GO}}
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
    global JOBS, VIPS, KINGI
    d = json.load(open(NAMES_F)); NAMES, HIDE = d["names"], set(d["hide"])
    jj = json.load(open(JOBS_F)); JOBS, VIPS, KINGI = {int(k): v for k, v in jj["jobs"].items()}, set(jj["vip"]), jj["king"]
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

    # 1: el pueblo desde arriba; el nombre; el rey y su corona
    put("ade/multitud", 0.0, 2.2, 0.18, 0.8)
    put("ade/letrero_on", at("kiria") - 0.08, 0.8, 0.42, 0.3)
    put("avion/whoosh_largo", at("y", 1, 1) - 0.3, 1.2, 0.26, 0.4)
    put("avion/brillo", at("rey", 1, 1) - 0.05, 1.0, 0.36, 0.4)
    put("avion/pregunta", at("corona") - 0.1, 0.9, 0.28, 0.3)
    # 2: baja a una manzana de casas: 6.124 habitantes, cada uno a lo suyo
    put("avion/whoosh", at("ya", 1, 2) - 0.25, 0.6, 0.26)
    put("economia/panel", at("seis") - 0.02, 0.8, 0.36, 0.3)
    put("ade/multitud", at("aquí") - 0.1, 1.8, 0.14, 0.7)
    # 3: la peluquería (tijeras)
    put("avion/whoosh", at("en", 1, 3) - 0.15, 0.6, 0.26)
    for i in range(4):
        put("avion/clic", at("corta") - 0.05 + i * 0.22, 0.18, 0.3, 0.06)
    # 4: el supermercado: el carro; la caja (pitidos)
    put("avion/whoosh", at("en", 1, 4) - 0.15, 0.6, 0.26)
    put("lanzamiento/desliza", at("carro") - 0.1, 0.5, 0.32, 0.2)
    for i in range(5):
        put("cerradura/blip", at("alanna") + 0.2 + i * 0.3, 0.14, 0.22, 0.05)
    # 5: el banco: las sacas al furgón
    put("avion/whoosh", at("en", 1, 5) - 0.15, 0.6, 0.26)
    put("economia/monedas_caen", at("dinero") - 0.1, 1.0, 0.34, 0.3)
    put("cerradura/clunk", at("furgón") + 0.15, 0.5, 0.36, 0.2)
    # 6: de sitio en sitio: panadería, bomberos, taxis, colegio, lago
    put("avion/whoosh", at("hay") - 0.05, 0.6, 0.26)
    put("avion/ding", at("panaderos") + 0.1, 0.5, 0.3, 0.25)
    put("avion/whoosh", at("bomberos") - 0.25, 0.6, 0.24)
    put("avion/whoosh", at("taxistas") - 0.25, 0.6, 0.24)
    put("magisterio/ninos", at("profesora") - 0.15, 1.0, 0.26, 0.4)
    put("avion/whoosh", at("pescador") - 0.3, 0.6, 0.24)
    put("quimica/gota", at("lago") - 0.05, 0.5, 0.34, 0.2)
    # 7–8: el tablón de leyes; el comentario y su «me gusta»; se cumple; la corona se levanta: nuevo rey
    put("avion/whoosh_largo", at("pero") - 0.1, 1.2, 0.26, 0.4)
    put("economia/panel", at("leyes") - 0.05, 0.8, 0.38, 0.3)
    put("lanzamiento/mensaje", at("escribe") - 0.02, 0.6, 0.38, 0.2)
    put("lanzamiento/corazon", at("gusta") - 0.3, 0.9, 0.4, 0.3)
    put("avion/sello", at("cumplirá") + 0.05, 0.6, 0.42, 0.25)
    put("avion/brillo", at("nuevo") - 0.25, 1.0, 0.38, 0.4)
    # 9: vuela sobre el polideportivo y vuelve arriba (bucle con el primer fotograma)
    put("avion/whoosh", at("mándaselo") - 0.05, 0.6, 0.24)
    put("avion/whoosh_largo", END - 1.5, 1.2, 0.26, 0.4)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "ciudad_seguidores_ep2.mp4")):
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
