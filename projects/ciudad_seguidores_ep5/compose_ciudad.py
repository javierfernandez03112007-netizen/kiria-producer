"""Compone «Kiria World, día 3» (el rey firma la ley del homenaje semanal; sushi, pastelería y veterinario): fotogramas 3D a 60 fps (out/frames)
+ el NOMBRE de los seguidores encima de su cabeza (solo en local: la lista no se sube al repo; los cuatro que nombra la voz van en dorado)
+ subtítulos en Impact + la voz de Javi (tempo 1,0) + efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx).

    python3 ajustar_voz.py && python3 env_voz.py
    node web/labels.mjs out/labels.jsonl 2899        (posiciones de los rótulos; local, sin render)
    (render → out/frames)
    python3 projects/ciudad_seguidores_ep5/compose_ciudad.py [--test t1 t2 ...] [--sfx]
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
VIPTXT = {"yugo_gb": ("@yugo_gb", "rey"), "ammmm_mal": ("@ammmm_mal", "dueño del club"), "god_nika0206": ("@god_nika0206", "cine y chino"),
          "luquita.berna": ("@luquita.berna", "el 7"), "victorelcrepeer_mc": ("@victorelcrepeer_mc", "soldado"), "marcos13_08": ("@marcos13_08", "coronel")}
VIPW = {"rojas.esthe": ("@rojas.esthe", "electricista"), "danielxd22114": ("@danielxd22114", "mecánico")}   # pidieron oficio: su nombre de verdad, en blanco
JOBTXT = {"soldier": "soldado", "sentry": "centinela", "hguard": "guardia real", "cham": "mayordomo real", "smith": "herrero", "bouncer": "portero",
          "ticket": "taquillera", "waiter": "camarero", "keeper": "portero", "ref": "árbitro"}
LABELS_F = os.path.join(ROOT, "out", "labels.jsonl")
KEEP = {}
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
        elif w0.get("vipW"):
            txt, job = VIPW[w0["vipW"]]
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
    placed = [(r[0] - 12, r[1] - 12, r[2] + 12, r[3] + 12) for r in KEEP.get(fi, []) + L.get("k", [])]   # ocupados y protegidos (tarjetas, bocadillo):
                                                     # los nombres no se pisan ni las tapan (se suben un piso o se quedan fuera)
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
_K = {1: {"rey": GO, "no": R, "corona": GO},
      2: {"final": CY, "lugar": CY},
      3: {"yugo_gb": GO, "comentario": CY, "dieciocho": PK, "gusta": PK, "condición": R},
      4: {"forjan": OR, "ciudad": GR, "pedisteis": GR},
      5: {"ammmm_mal": GO, "club": PK, "portero": OR, "nadie": R},
      6: {"god_nika0206": GO, "cine": AM, "restaurante": R, "chino": R, "estreno": AM, "rollito": OR},
      7: {"luquita.berna": GO, "club": GR, "fútbol": GR, "siete": GO},
      8: {"victorelcrepeer_mc": GO, "soldado": GR, "rey": GO, "marcos13_08": GO, "adelante": GR},
      9: {"rey": GO, "balcón": CY},
      10: {"máscara": CY, "acero": CY, "refleja": CY, "cielo": CY},
      11: {"corona": GO, "comentario": CY, "gusta": PK, "próximo": GO, "rey": GO},
      12: {"mándaselo": GR, "corona": GO}}
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
    global WHO, KEEP
    d = json.load(open(NAMES_F)); NAMES, HIDE = d["names"], set(d["hide"])
    named = {v[0].lstrip("@").lower() for v in list(VIPTXT.values()) + list(VIPW.values())}   # los que ya salen con su nombre no se repiten en otra persona
    HIDE |= {j for j, n in enumerate(NAMES) if n.lstrip("@").lower() in named}
    WHO = {int(k): v for k, v in json.load(open(JOBS_F)).items()}
    LABELS = [json.loads(l) for l in open(LABELS_F)]
    KEEP = {}                                         # zonas que ningún nombre puede tapar (p. ej. el cartel COMPLETO del sushi), por fotograma
    kf = os.path.join(ROOT, "keepclear.json")         # generado con la cámara (proyección del cartel en cada fotograma)
    if os.path.exists(kf):
        for zona in json.load(open(kf)).values():
            for f, r in zona.items(): KEEP.setdefault(int(f), []).append(r)
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

    E = LINES[-1]["end"] + 1.2
    hit0, fut = LINES[3]["start"] - 4, at("fútbol")                # golpes del herrero: cada 0,62 s desde ahí (igual que en la escena)
    # 1: la corona rueda por el mármol y acaba girando como una moneda; 2: ¿qué se pondrá?
    put("cerradura/rasca", 0.0, 1.0, 0.16, 0.5)
    put("economia/moneda_sola", 2.05, 0.84, 0.34, 0.3)
    put("cripto/pregunta", at("lugar") - 0.05, 0.8, 0.28, 0.3)
    # 3: la tarjeta de @yugo_gb, sus 18 me gusta y la condición
    put("lanzamiento/mensaje", at("comentario", 1) - 0.05, 0.6, 0.34, 0.2)
    put("lanzamiento/corazon", at("gusta", 1) - 0.15, 0.52, 0.34, 0.2)
    put("avion/sello", at("condición") - 0.05, 0.5, 0.3, 0.2)
    # 4: sale del salón; la fragua (martillo y chispas); sube sobre la ciudad
    put("avion/whoosh", at("mientras") + 0.05, 0.6, 0.26, 0.25)
    for k in range(2):
        th = hit0 + 0.62 * (round((at("forjan") - hit0) / 0.62) + k)
        put("cerradura/metal", th - 0.01, 0.45, 0.34 - 0.08 * k, 0.2)
    put("magisterio/chispa", at("forjan") + 0.1, 0.9, 0.26, 0.3)
    put("avion/whoosh_largo", at("ciudad") + 0.1, 1.2, 0.26, 0.4)
    # 5: el club (se enciende el neón) y el portero: «COMPLETO»
    put("ade/letrero_on", at("club", 1, 5) - 0.1, 0.9, 0.3, 0.3)
    put("cerradura/denegado", at("nadie", 1, 5) - 0.1, 0.52, 0.34, 0.15)
    # 6: el cine con estreno (focos) y el último rollito
    put("robo_banco/luces_camara", at("cine") - 0.1, 0.9, 0.28, 0.3)
    put("promo_web/focos", at("estreno") - 0.1, 0.9, 0.3, 0.3)
    put("tapas/plato", at("rollito") + 0.05, 0.8, 0.32, 0.3)
    # 7: el chut, la red y la grada
    put("avion/whoosh", at("luquita.berna") + 0.2, 0.6, 0.24, 0.25)
    put("gafas/impacto", fut + 0.3, 0.6, 0.34, 0.2)
    put("magisterio/red", fut + 0.75, 1.1, 0.32, 0.4)
    put("ade/multitud", fut + 0.85, 2.2, 0.26, 0.8)
    # 8: el cuartel (marcha), el bocadillo «¡Adelante!» y la gorra
    put("ade/marcha", at("soldado") - 0.1, 1.8, 0.26, 0.6)
    put("avion/pop", at("adelante") - 0.15, 0.52, 0.34, 0.15)
    put("magisterio/pop", at("adelante") + 0.88, 0.52, 0.28, 0.15)
    # 9-10: sale del patio hacia el balcón; la gente; la máscara brilla y refleja el cielo
    put("avion/whoosh_largo", at("ahora") + 0.2, 1.2, 0.26, 0.4)
    put("ade/multitud", at("sale") + 0.1, 2.4, 0.24, 0.8)
    put("medicina/brillo", at("máscara") - 0.05, 1.0, 0.3, 0.35)
    put("medicina/dorado", at("refleja") - 0.05, 0.84, 0.3, 0.3)
    # 11: la gente vitorea; la tarjeta del próximo rey
    put("ade/multitud", at("mejor") + 0.4, 2.6, 0.22, 0.9)
    put("lanzamiento/tarjeta", at("comentario", 1, 11) - 0.05, 0.52, 0.32, 0.2)
    put("economia/medalla", at("próximo") - 0.05, 0.63, 0.3, 0.25)
    # 12: mándaselo; vuelve al salón y la corona cae otra vez (enlaza con el principio)
    put("lanzamiento/enviado", at("mándaselo") - 0.05, 0.63, 0.3, 0.25)
    put("avion/whoosh_largo", at("mándaselo") + 0.6, 1.2, 0.22, 0.4)
    put("cerradura/metal", E - 0.77, 0.6, 0.3, 0.3)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "ciudad_seguidores_ep5.mp4")):
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
