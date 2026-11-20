"""Compone «Kiria World, día 3» (el rey firma la ley del homenaje semanal; sushi, pastelería y veterinario): fotogramas 3D a 60 fps (out/frames)
+ el NOMBRE de los seguidores encima de su cabeza (solo en local: la lista no se sube al repo; los cuatro que nombra la voz van en dorado)
+ subtítulos en Impact + la voz de Javi (tempo 1,0) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx).

    python3 ajustar_voz.py && python3 env_voz.py
    node web/labels.mjs out/labels.jsonl 2899        (posiciones de los rótulos; local, sin render)
    (render → out/frames)
    python3 projects/ciudad_seguidores_ep3/compose_ciudad.py [--test t1 t2 ...] [--sfx]
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
JOBS_F = os.path.join(ROOT, "out", "jobs.json")                 # quién es quién (lo escribe web/labels.mjs: {índice: {k, vip}})
WHO = {}
VIPTXT = {"king": ("@iannyanezz_", "rey"), "lydiaa.rc": ("@lydiaa.rc", "dueña"), "salvadormatthias34": ("@salvadormatthias34", "pastelero"), "zamii.luu": ("@zamii.luu", "veterinaria")}
JOBTXT = {"chefSushi": "cocinero", "guard": "guardia real", "owner2": "su dueño", "court": None}
LABELS_F = os.path.join(ROOT, "out", "labels.jsonl")
NAMES, HIDE, LABELS, _TAG, _FONT, _FONT_S = None, set(), None, {}, None, None
TOP = 430                                           # por encima de esta altura no hay nombres (subtítulos)
BASE = 44                                           # tamaño de letra de la etiqueta base (luego se escala)


def name_of(i):                                     # nombre fijo de la persona i (sorteo estable sobre la lista de seguidores, sin los ocultos)
    n = len(NAMES)
    for k in range(50):
        j = (313 + i * 977 + k * 131) % n
        if j not in HIDE:
            return NAMES[j]
    return NAMES[0]


def tag(i):                                         # etiqueta «@nombre · oficio»: píldora oscura; dorada para los cuatro que nombra la voz
    if i not in _TAG:
        w0 = WHO.get(i, {}); vipk = w0.get("vip")
        if vipk:
            txt, job = VIPTXT[vipk]
        else:
            txt, job = "@" + name_of(i), JOBTXT.get(w0.get("k"))
        vip = bool(vipk)
        l, t, r, b = _FONT.getbbox(txt); jw = (_FONT_S.getbbox(job)[2] + 16) if job else 0
        w, h = r - l + 36 + jw, 66
        im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle((0, 0, w - 1, h - 1), radius=h // 2, fill=(255, 208, 74, 245) if vip else (18, 24, 34, 225))
        d.text((18 - l, 9), txt, font=_FONT, fill=(40, 28, 0, 255) if vip else (255, 255, 255, 255))
        if job:
            d.text((18 + r - l + 14, 17), job, font=_FONT_S, fill=(90, 62, 0, 255) if vip else (124, 224, 160, 255))
        a = np.asarray(im, np.float32) / 255
        _TAG[i] = (a[..., [2, 1, 0]] * a[..., 3:], a[..., 3:], vip)
    return _TAG[i]


def paste(img, rgb, al, x0, y0):
    h, w = rgb.shape[:2]
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if xa >= xb or ya >= yb:
        return
    sl = (slice(ya - y0, yb - y0), slice(xa - x0, xb - x0))
    img[ya:yb, xa:xb] = img[ya:yb, xa:xb] * (1 - al[sl]) + rgb[sl]


def scaled(sp, s, a):
    rgb, al = sp[0], sp[1]
    w, h = max(2, int(rgb.shape[1] * s + 0.5)), max(2, int(rgb.shape[0] * s + 0.5))
    return cv2.resize(rgb, (w, h), interpolation=cv2.INTER_AREA) * a, cv2.resize(al, (w, h), interpolation=cv2.INTER_AREA)[..., None] * a


def draw_tags(img, fi):
    if LABELS is None or fi >= len(LABELS):
        return
    L = LABELS[fi]
    placed = []                                      # rectángulos ya ocupados: los nombres no se pisan (se suben un piso o se quedan fuera)
    for i, x, y, p10 in sorted(L["p"], key=lambda e: (not tag(e[0])[2], -e[3])):   # primero los dorados, luego los más cercanos
        vip = tag(i)[2]
        ppm = p10 / 10; s = min(36.0, max(16.0, ppm * 0.075)) / BASE * (1.3 if vip else 1.0); h = 66 * s
        rgb0, al0 = scaled(tag(i), s, 1.0); w = rgb0.shape[1]
        x0 = x - w / 2
        if vip:
            x0 = min(max(x0, 14), W - w - 14)
        y0 = y - h - 6
        for _ in range(4):
            hit = [r for r in placed if not (x0 + w < r[0] or x0 > r[2] or y0 + h < r[1] or y0 > r[3])]
            if not hit:
                break
            y0 = min(r[1] for r in hit) - h - 4
        else:
            continue
        a = min(1.0, (ppm - 95) / 30) * min(1.0, max(0.0, (y0 - TOP) / 60))
        if a <= 0.02:
            continue
        placed.append((x0 - 4, y0 - 2, x0 + w + 4, y0 + h + 2))
        paste(img, rgb0 * a, al0 * a, int(x0), int(y0))


# ---------------------------------------------------------------- subtítulos
GO, R, WH, GR, CY, AM, OR, PK = "#FFD76A", "#FF5A4E", "#EEF2F6", "#7CF0A9", "#5CF2E6", "#FFB547", "#FF9A3D", "#FF5FB8"
_K = {1: {"rey": GO, "kiria": GR, "world": GR, "ley": GO, "ti": CY},
      2: {"iannyanezz": GO, "trono": GO, "ley": GO, "semana": CY, "homenajeará": GR, "mejor": GO, "seguidor": GO},
      3: {"final": CY, "tú": GO},
      4: {"kiria": GR, "world": GR, "crece": GR, "pedís": CY},
      5: {"lydiaa.rc": GO, "sushi": R, "mesa": OR},
      6: {"pastelería": PK, "salvadormatthias34": GO, "tartas": PK, "escaparate": PK, "cola": OR, "esquina": OR},
      7: {"zamii.luu": GO, "veterinario": GR, "perro": OR, "vacunar": R},
      8: {"plaza": CY, "pedestal": GO, "vacío": WH},
      9: {"comentario": CY, "gusta": PK, "semana": CY, "construirá": GR, "nombre": GO, "estatua": GO, "oro": GO},
      10: {"mándaselo": GR, "estatua": GO}}
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
    global WHO
    d = json.load(open(NAMES_F)); NAMES, HIDE = d["names"], set(d["hide"])
    WHO = {int(k): v for k, v in json.load(open(JOBS_F)).items()}
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

    stamp = at("firmar") + 0.25
    # 1: el sello de oro cae sobre la ley (chispas); 2: el rey, la ley, el aplauso
    put("avion/sello", stamp - 0.02, 0.6, 0.46, 0.25)
    put("magisterio/chispa", stamp + 0.02, 0.8, 0.3, 0.3)
    put("avion/brillo", at("trono") - 0.15, 1.0, 0.32, 0.4)
    put("lanzamiento/papel", at("ley", 1, 2) - 0.05, 0.6, 0.34, 0.2)
    put("ade/multitud", at("seguidor") + 0.1, 1.8, 0.22, 0.7)
    # 3: «cómo ser tú»: el rey señala; 4: sale volando por la puerta a la plaza
    put("lanzamiento/ping", at("tú", 1, 3) - 0.02, 0.5, 0.3, 0.2)
    put("avion/whoosh_largo", at("mientras") - 0.2, 1.2, 0.3, 0.4)
    # 5: el sushi lleno y el cartel que gira a COMPLETO
    put("tapas/plato", at("sushi") - 0.05, 0.6, 0.3, 0.25)
    put("lanzamiento/voltea", at("mesa") + 0.35, 0.6, 0.38, 0.2)
    # 6: el toldo de la pastelería, las tartas, la cola hasta la esquina
    put("lanzamiento/toldo", at("pastelería") - 0.1, 0.8, 0.32, 0.3)
    put("tapas/pop", at("tartas") - 0.02, 0.4, 0.32, 0.15)
    put("avion/whoosh", at("cola") - 0.2, 0.6, 0.26)
    # 7: el veterinario; el perro salta de la camilla y corre
    put("medicina/instrumental", at("veterinario") - 0.1, 0.8, 0.28, 0.3)
    put("cripto/salto", at("vacunar") - 0.47, 0.6, 0.38, 0.2)
    put("robo_banco/pasos", at("vacunar") + 0.1, 0.7, 0.24, 0.2)
    # 8: vuela a la plaza: el pedestal vacío con su foco
    put("avion/whoosh_largo", at("plaza") - 0.6, 1.2, 0.28, 0.4)
    put("promo_web/focos", at("pedestal") - 0.05, 1.0, 0.36, 0.4)
    # 9: el comentario y sus «me gusta»; se construirá; la placa con el nombre; la estatua de oro (aplausos)
    put("lanzamiento/mensaje", at("comentario") - 0.05, 0.6, 0.36, 0.2)
    put("lanzamiento/corazon", at("gusta") - 0.15, 0.9, 0.38, 0.3)
    put("lanzamiento/contador", at("gusta") + 0.1, 1.2, 0.26, 0.4)
    put("avion/construye", at("construirá") - 0.1, 1.0, 0.3, 0.4)
    put("economia/medalla", at("nombre") - 0.05, 0.8, 0.34, 0.3)
    put("medicina/dorado", at("estatua", 1, 9) - 0.1, 1.2, 0.38, 0.4)
    put("ade/multitud", at("oro") + 0.1, 1.6, 0.24, 0.6)
    # 10: vuelve volando al salón del trono (bucle con el primer fotograma)
    put("avion/whoosh_largo", at("mándaselo") + 0.05, 1.2, 0.28, 0.4)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "ciudad_seguidores_ep3.mp4")):
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
