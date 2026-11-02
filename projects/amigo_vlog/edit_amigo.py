"""Edición profesional del vídeo de la maratón (amigo de Javi): cortes, movimientos de cámara digitales (empujes, golpes de zoom,
cámara lenta con interpolación por flujo óptico, temblor, barridos), etalonaje (B/N en el pasado, color que explota en la carrera),
subtítulos nuevos en Impact sobre una franja esmerilada que tapa los antiguos, música original y efectos.

    python3 edit_amigo.py            → out/maraton_editado.mp4 y out/maraton_sin_musica.mp4
    python3 edit_amigo.py --test 1.0 5.0 ...   → fotogramas de prueba en out/test/
"""
import json
import os
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
FPS, W, H = 30, 1080, 1920
SRC = os.path.join(ROOT, "out", "src", "f%05d.jpg")
NSRC = len([f for f in os.listdir(os.path.join(ROOT, "out", "src")) if f.endswith(".jpg")])
IMPACT = os.path.join(ROOT, "..", "..", "engine", "fonts", "impact.ttf")
OLDCAP = {i: n for i, n, _ in json.load(open(os.path.join(ROOT, "out", "oldcaps.json")))}
BAND_Y = 1495                                    # centro de la franja de los subtítulos antiguos (en el original)

# ---------------------------------------------------------------- montaje: segmentos (trozos del original con velocidad, cámara y color)
# piezas: (src_inicio, src_fin, velocidad). cam: 'band' (zoom anclado en la franja de subtítulos) o 'top' (zoom ≥ 1,45 anclado
# arriba: deja los subtítulos antiguos fuera de plano). grade: 'base', 'bw', 'fade' (se apaga), 'vivid'.
SEGS = [
    dict(name="avance", pieces=[(36.55, 37.25, 1.0)], cam="top", s=(1.50, 1.42), grade="vivid", cx=(560, 540), y0=(20, 30)),
    dict(name="intro", pieces=[(0.20, 2.17, 1.0)], cam="top", s=(1.38, 1.44), grade="base", caps=True, y0=(0, 10)),
    dict(name="salida", pieces=[(2.17, 4.27, 1.0)], cam="top", s=(1.40, 1.52), grade="bw", caps=True, y0=(0, 10)),
    dict(name="atardecer", pieces=[(4.27, 7.32, 1.0)], cam="top", s=(1.50, 1.38), grade="bw", caps=True, y0=(20, 0)),
    dict(name="porque", pieces=[(7.62, 11.95, 1.0)], cam="top", s=(1.38, 1.42), grade="base", caps=True, punch=(11.40, 1.12), y0=(0, 8)),
    dict(name="sumo", pieces=[(12.36, 16.45, 1.0)], cam="top", s=(1.45, 1.49), grade="base", caps=True, y0=(10, 0)),
    dict(name="sensacion", pieces=[(16.72, 19.95, 1.0)], cam="top", s=(1.38, 1.46), grade="base", caps=True, y0=(0, 10)),
    dict(name="destino", pieces=[(20.18, 23.05, 1.0)], cam="top", s=(1.40, 1.58), grade="fade", caps=True, shake_end=True, y0=(0, 20)),
    dict(name="corre", pieces=[(23.60, 23.95, 0.45), (23.95, 24.15, 0.7), (24.15, 24.42, 1.0)], cam="top", s=(1.58, 1.46), grade="vivid", y0=(10, 40), ybot=1800),   # aquí no hay subtítulos antiguos: encuadre más bajo
    dict(name="sonrisa", pieces=[(24.45, 26.45, 1.0)], cam="top", s=(1.46, 1.52), grade="vivid", y0=(30, 40), cx=(540, 545)),
    dict(name="pancarta", pieces=[(27.55, 29.25, 1.25)], cam="top", s=(1.48, 1.55), grade="vivid", y0=(40, 30), cx=(712, 700)),
    dict(name="medalla", pieces=[(31.05, 31.65, 1.0), (31.65, 32.45, 0.45), (32.45, 34.40, 1.0)], cam="top", s=(1.46, 1.56), grade="vivid", y0=(30, 40)),
    dict(name="grito", pieces=[(35.65, 37.70, 1.0)], cam="top", s=(1.46, 1.58), grade="vivid", y0=(30, 30), cx=(540, 540)),
]
# barridos entre segmentos (índice del segmento que ENTRA): 'whip' horizontal, 'zoom' (zoom con desenfoque radial), 'flash'
TRANS = {1: "zoom", 3: "whip", 4: "flash", 8: "drop", 9: "whip", 10: "whip", 11: "whip", 12: "flash"}

T = 0.0
for sg in SEGS:
    sg["t0"] = T
    sg["outp"] = []
    for a, b, v in sg["pieces"]:
        d = (b - a) / v
        sg["outp"].append((T, T + d, a, b, v))
        T += d
    sg["t1"] = T
DUR = T
N = int(round(DUR * FPS))


def seg_at(t):
    for i, sg in enumerate(SEGS):
        if t < sg["t1"] or i == len(SEGS) - 1:
            return i, sg
    return len(SEGS) - 1, SEGS[-1]


def src_time(t):
    i, sg = seg_at(t)
    for o0, o1, a, b, v in sg["outp"]:
        if t < o1 or (o0, o1) == sg["outp"][-1][:2]:
            return i, sg, min(b - 1e-3, a + (t - o0) * v)
    return i, sg, sg["pieces"][-1][1] - 1e-3


def out_time(ts):                                 # tiempo del original → tiempo de salida (solo partes a velocidad 1 con voz)
    for sg in SEGS:
        for o0, o1, a, b, v in sg["outp"]:
            if a - 1e-6 <= ts <= b + 1e-6 and sg["name"] != "avance":
                return o0 + (ts - a) / v
    return None


# ---------------------------------------------------------------- texto (transcripción corregida con los tiempos del reconocedor)
WORDS = [("UNA", 0.22), ("MARATÓN", 0.32), ("NO", 0.96), ("SE", 1.04), ("CORRE", 1.12), ("EL", 1.36), ("DÍA", 1.44), ("DE", 1.68), ("LA", 1.84),
         ("CARRERA", 1.92), ("SE", 2.48), ("CONSTRUYE", 2.64), ("MUCHO", 3.20), ("ANTES", 3.52), ("ENTRENO", 4.00), ("A", 4.48), ("ENTRENO", 4.64),
         ("KILÓMETRO", 5.20), ("A", 5.68), ("KILÓMETRO", 5.84), ("CUANDO", 6.48), ("NADIE", 6.72), ("MIRA", 7.04),
         ("PORQUE", 7.68), ("CUANDO", 7.92), ("LO", 8.16), ("DAS", 8.32), ("TODO", 8.56), ("POR", 8.80), ("ALGO", 8.96), ("AUNQUE", 9.44), ("NO", 9.84),
         ("LO", 10.00), ("CONSIGAS", 10.16), ("YA", 10.96), ("HAS", 11.20), ("GANADO", 11.44),
         ("Y", 12.40), ("SI", 12.64), ("A", 12.88), ("ESO", 12.96), ("LE", 13.20), ("SUMO", 13.44), ("QUE", 13.84), ("LAS", 14.04), ("COSAS", 14.16),
         ("SALEN", 14.32), ("TAL", 14.72), ("Y", 14.96), ("COMO", 15.04), ("LA", 15.20), ("TENÍA", 15.36), ("VISUALIZADA", 15.76),
         ("LA", 16.80), ("SENSACIÓN", 17.04), ("NO", 18.16), ("TIENE", 18.40), ("PRECIO", 18.72),
         ("Y", 19.36), ("HOY", 19.60), ("TODO", 20.24), ("ESE", 20.56), ("TRABAJO", 20.80), ("TIENE", 21.68), ("UN", 22.24), ("DESTINO", 22.56)]
GROUPS = [2, 3, 2, 3, 2, 2, 3, 1, 2, 3, 2, 3, 2, 2, 2, 3, 4, 2, 3, 1, 3, 2, 1, 2, 3, 2, 3, 2, 1]
assert sum(GROUPS) == len(WORDS)
GOLD, GREEN, RED, WHITE = (255, 200, 61), (75, 255, 138), (255, 90, 78), (255, 255, 255)
KEYC = {"MARATÓN": GOLD, "CARRERA": GOLD, "CONSTRUYE": GOLD, "ENTRENO": GOLD, "KILÓMETRO": GOLD, "NADIE": RED, "TODO": GOLD, "GANADO": GREEN,
        "VISUALIZADA": GOLD, "SENSACIÓN": GOLD, "PRECIO": GOLD, "HOY": GOLD, "TRABAJO": GOLD, "DESTINO": GOLD, "CONSIGAS": WHITE}
CAPS = []                                         # [(t0, t1, [(palabra, t_salida)])]
k = 0
for g in GROUPS:
    ws = [(w, out_time(ts)) for w, ts in WORDS[k:k + g]]
    CAPS.append([ws[0][1], None, ws])
    k += g
for i, c in enumerate(CAPS):
    last = c[2][-1][1]
    nxt = CAPS[i + 1][0] if i + 1 < len(CAPS) else last + 0.8
    c[1] = min(nxt, last + 0.75) if nxt - last > 0.0 else last + 0.4
    if nxt - c[1] < 0.45:
        c[1] = nxt                                # huecos cortos: la franja no parpadea
T_DESTINO = CAPS[-1][0]
T_DROP = SEGS[8]["t0"]


@lru_cache(64)
def font(sz):
    return ImageFont.truetype(IMPACT, sz)


def caption_sprite(words, cur, big=False):
    """Sprite RGBA de un grupo de palabras: la que se dice ahora, en color y algo más grande."""
    sz = 132 if big else 92
    f = font(sz)
    widths = [f.getbbox(w, stroke_width=8)[2] for w, _ in words]
    gap = int(sz * 0.26)
    tw = sum(widths) + gap * (len(words) - 1) + 40
    th = int(sz * 1.45)
    im = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = 20
    for (w, _), wd, j in zip(words, widths, range(len(words))):
        col = KEYC.get(w, WHITE) if j <= cur else (255, 255, 255)
        if j == cur and w not in KEYC:
            col = (255, 236, 150)
        a = 255 if j <= cur else 150
        d.text((x, int(sz * 0.12)), w, font=f, fill=col + (a,), stroke_width=8, stroke_fill=(0, 0, 0, a))
        x += wd + gap
    return im


# ---------------------------------------------------------------- fotogramas del original (+ interpolación por flujo óptico)
@lru_cache(48)
def src_frame(i):
    i = max(0, min(NSRC - 1, i))
    return cv2.imread(SRC % i)


_dis = None


@lru_cache(16)
def flows(i):
    global _dis
    if _dis is None:
        _dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    a = cv2.cvtColor(cv2.resize(src_frame(i), (540, 960)), cv2.COLOR_BGR2GRAY)
    b = cv2.cvtColor(cv2.resize(src_frame(i + 1), (540, 960)), cv2.COLOR_BGR2GRAY)
    f01 = cv2.resize(_dis.calc(a, b, None), (W, H)) * 2
    f10 = cv2.resize(_dis.calc(b, a, None), (W, H)) * 2
    return f01, f10


_gx, _gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))


def frame_at(ts):
    x = ts * FPS
    i = int(np.floor(x))
    f = x - i
    if f < 0.06 or i + 1 >= NSRC:
        return src_frame(i).copy()
    if f > 0.94:
        return src_frame(i + 1).copy()
    f01, f10 = flows(i)
    ft0 = -(1 - f) * f * f01 + f * f * f10
    ft1 = (1 - f) ** 2 * f01 - f * (1 - f) * f10
    w0 = cv2.remap(src_frame(i), _gx + ft0[..., 0], _gy + ft0[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    w1 = cv2.remap(src_frame(i + 1), _gx + ft1[..., 0], _gy + ft1[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return cv2.addWeighted(w0, 1 - f, w1, f, 0)


# ---------------------------------------------------------------- cámara, color y acabado
def h1(x):
    s = np.sin(x * 127.1 + 311.7) * 43758.5453
    return s - np.floor(s)


def noise1(t, seed):                              # ruido suave para el temblor de cámara
    a = np.floor(t)
    u = t - a
    u = u * u * (3 - 2 * u)
    return (h1(a + seed) * (1 - u) + h1(a + 1 + seed) * u) * 2 - 1


def ease(u):
    return u * u * (3 - 2 * u)


def cam_matrix(t, i, sg):
    u = (t - sg["t0"]) / max(1e-6, sg["t1"] - sg["t0"])
    e = ease(min(1, max(0, u)))
    s = sg["s"][0] + (sg["s"][1] - sg["s"][0]) * e
    rot, dx, dy = 0.0, 0.0, 0.0
    if "punch" in sg:                             # golpe de zoom en una palabra
        tp = out_time(sg["punch"][0])
        if t >= tp:
            k = min(1, (t - tp) / 0.12)
            s = s * (1 + (sg["punch"][1] - 1) * (1 - (1 - k) ** 3))
    shake = 0.0
    if sg["cam"] == "top":
        shake = 5.0
    if sg.get("shake_end") and t > T_DESTINO:
        shake = 14.0 * min(1, (t - T_DESTINO) / 0.25)
    if sg["name"] == "grito":
        shake = 9.0
    if shake:
        dx += shake * noise1(t * 7.0, 1.3)
        dy += shake * noise1(t * 7.0, 7.9)
        rot += shake * 0.06 * noise1(t * 5.0, 3.1)
    if sg["cam"] == "band":
        a, b = (540.0, BAND_Y), (540.0 + dx, BAND_Y + dy)
    else:
        yoff = sg["y0"][0] + (sg["y0"][1] - sg["y0"][0]) * e
        y0 = sg.get("ybot", 1415) - H / s - yoff  # el borde inferior del encuadre queda justo encima de los subtítulos antiguos
        cxs = sg.get("cx", (540, 540))
        cx = cxs[0] + (cxs[1] - cxs[0]) * e
        a, b = (cx, y0), (540.0 + dx, dy)
    R = cv2.getRotationMatrix2D((0, 0), rot, s)
    M = R.copy()
    M[:, 2] = np.array(b) - R[:, :2] @ np.array(a)
    return M, s


def dir_blur(img, L, horiz=True):
    L = int(L)
    if L < 3:
        return img
    k = np.zeros((L, L), np.float32)
    if horiz:
        k[L // 2, :] = 1.0 / L
    else:
        k[:, L // 2] = 1.0 / L
    return cv2.filter2D(img, -1, k)


def zoom_blur(img, amt):
    if amt < 0.01:
        return img
    acc = img.astype(np.float32)
    n = 6
    for j in range(1, n):
        s = 1 + amt * j / n
        M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, s)
        acc += cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return (acc / n).astype(np.uint8)


_yy, _xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIG = (1 - 0.32 * np.clip((np.sqrt(((_xx - W / 2) / (W * 0.62)) ** 2 + ((_yy - H / 2) / (H * 0.62)) ** 2) - 0.45) / 0.65, 0, 1) ** 1.6)[..., None]
_lut_x = np.arange(256, dtype=np.float32) / 255
LUT_S = np.clip(255 * (_lut_x + 0.18 * np.sin((_lut_x - 0.5) * np.pi) * (1 - np.abs(2 * _lut_x - 1)) * 0.9), 0, 255).astype(np.uint8)


def grade(img, mode, t, sg):
    img = cv2.LUT(img, LUT_S)                     # curva en S (contraste)
    f = img.astype(np.float32) / 255
    lum = (f[..., 0] * 0.114 + f[..., 1] * 0.587 + f[..., 2] * 0.299)[..., None]
    sat = {"base": 1.12, "vivid": 1.32, "bw": 0.0, "fade": 1.0}[mode]
    if mode == "fade":                            # se va apagando hasta «destino»
        sat = 1.1 - 0.85 * ease(min(1, max(0, (t - sg["t0"]) / (T_DESTINO + 0.3 - sg["t0"]))))
    if mode == "bw":
        f = np.repeat(lum, 3, axis=2)
        f = np.clip((f - 0.5) * 1.18 + 0.5, 0, 1)
    else:
        f = lum + (f - lum) * sat
        # sombras frías, luces cálidas (B, G, R)
        f += np.array([0.035, 0.008, -0.02], np.float32) * (1 - lum) ** 2 + np.array([-0.03, 0.0, 0.035], np.float32) * lum ** 2
    if mode == "vivid":                           # resplandor suave en las luces
        hi = np.clip((f - 0.72) / 0.28, 0, 1)
        f += cv2.GaussianBlur(hi, (0, 0), 18) * 0.22
    f *= VIG
    g = np.random.default_rng(int(t * 1000) % 2**31).standard_normal((H // 2, W // 2)).astype(np.float32)
    g = cv2.resize(g, (W, H), interpolation=cv2.INTER_LINEAR)[..., None]
    f += g * (0.03 if mode == "bw" else 0.016)
    return np.clip(f * 255, 0, 255).astype(np.uint8)


def rounded_mask(w, h, r):
    m = np.zeros((h, w), np.uint8)
    cv2.rectangle(m, (r, 0), (w - r, h), 255, -1)
    cv2.rectangle(m, (0, r), (w, h - r), 255, -1)
    for cx, cy in [(r, r), (w - r - 1, r), (r, h - r - 1), (w - r - 1, h - r - 1)]:
        cv2.circle(m, (cx, cy), r, 255, -1, cv2.LINE_AA)
    return cv2.GaussianBlur(m, (3, 3), 0).astype(np.float32)[..., None] / 255


def paste_rgba(img, spr, cx, cy, scale=1.0, alpha=1.0):
    if scale != 1.0:
        spr = spr.resize((max(1, int(spr.width * scale)), max(1, int(spr.height * scale))), Image.LANCZOS)
    a = np.asarray(spr).astype(np.float32)
    x0, y0 = int(cx - a.shape[1] / 2), int(cy - a.shape[0] / 2)
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + a.shape[1]), min(H, y0 + a.shape[0])
    if xb <= xa or yb <= ya:
        return
    sub = a[ya - y0:yb - y0, xa - x0:xb - x0]
    al = sub[..., 3:4] / 255 * alpha
    rgb = sub[..., :3][..., ::-1]
    img[ya:yb, xa:xb] = (img[ya:yb, xa:xb] * (1 - al) + rgb * al).astype(np.uint8)


def frosted(img, cx, cy, w, h, alpha):
    w, h = int(w), int(h)
    x0, y0 = int(cx - w / 2), int(cy - h / 2)
    x0, y0 = max(0, x0), max(0, y0)
    w, h = min(W - x0, w), min(H - y0, h)
    reg = img[y0:y0 + h, x0:x0 + w].astype(np.float32)
    bl = cv2.GaussianBlur(reg, (0, 0), 20) * 0.42 + 8
    m = rounded_mask(w, h, min(36, h // 2)) * alpha
    out = reg * (1 - m) + bl * m
    edge = cv2.Canny((m[..., 0] * 255).astype(np.uint8), 50, 150)
    out[edge > 0] = out[edge > 0] * 0.6 + 255 * 0.4 * alpha
    img[y0:y0 + h, x0:x0 + w] = out.astype(np.uint8)


def big_text(img, lines, cy, k, size=150):
    """Rótulo grande (FINISHER, pregunta final): aparece con rebote."""
    if k <= 0.01:
        return
    sc = 0.7 + 0.3 * min(1, k) + 0.08 * np.sin(min(1, k) * np.pi)
    y = cy
    for txt, col in lines:
        f = font(size)
        bb = f.getbbox(txt, stroke_width=10)
        im = Image.new("RGBA", (bb[2] + 40, int(size * 1.4)), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((20, int(size * 0.1)), txt, font=f, fill=col + (255,), stroke_width=10, stroke_fill=(0, 0, 0, 255))
        paste_rgba(img, im, W / 2, y, sc, min(1, k * 2))
        y += size * 1.12


def pill_visible(t):
    for c0, c1, ws in CAPS:
        if c0 - 0.06 <= t <= c1:
            return True
    return False


import captions_amigo as CA
# estilo de cada grupo (índice de CAPS): palabra a palabra, recuadro de selección, titular arriba, apilado, «héroe» en el centro
STY = {0: ("box", "MARATÓN"), 3: ("word", {"CARRERA": CA.GOLD}), 4: ("head",), 5: ("skip",), 6: ("stack",),
       7: ("word", {"KILÓMETRO": CA.GOLD}, ("KILÓMETRO", "🏃")), 8: ("word", {"KILÓMETRO": CA.GOLD}), 9: ("word", {"NADIE": CA.RED}, ("NADIE", "👀")),
       11: ("box", "TODO"), 13: ("dim",), 14: ("dim",), 15: ("hero", "GANADO", CA.GREEN, "🏆"), 22: ("box", "VISUALIZADA", ("VISUALIZADA", "🎯")),
       23: ("word", {"SENSACIÓN": CA.GOLD}), 24: ("head2",), 25: ("hero", "HOY", CA.GOLD, None), 26: ("word", {"TRABAJO": CA.GOLD}),
       28: ("hero", "DESTINO", CA.GOLD, None)}


def draw_caps(img, t, sg):
    for gi, (c0, c1, ws) in enumerate(CAPS):
        st = STY.get(gi, ("word",))
        end = CAPS[gi + 1][1] + 0.2 if st[0] == "head" else c1 + 0.2
        if not (c0 - 0.06 <= t <= end):
            continue
        kind = st[0]
        if kind in ("word", "dim", "box") and t <= c1:
            keyc = st[1] if kind == "word" and len(st) > 1 and isinstance(st[1], dict) else {}
            box = st[1] if kind == "box" else None
            emo = st[2] if len(st) > 2 else None
            CA.line_words(img, t, ws, CA.Y_SUB, 96 if kind != "dim" else 84, keyc, box, kind == "dim", emo)
        elif kind == "stack" and t <= c1:
            CA.stack(img, t, ws, 1290)
        elif kind == "head":                       # «SE CONSTRUYE / MUCHO ANTES» arriba, vibrando
            g5 = CAPS[gi + 1]
            CA.headline(img, t, c0 - 0.03, g5[1] + 0.1, [[("SE", CA.WHITE), ("CONSTRUYE", CA.GOLD)]], 300, 120)
            CA.headline(img, t, g5[0] - 0.03, g5[1] + 0.1, [[("MUCHO", CA.WHITE), ("ANTES", CA.WHITE)]], 430, 120)
        elif kind == "head2":                      # «NO TIENE PRECIO»
            CA.headline(img, t, c0 - 0.03, c1 + 0.15, [[("NO", CA.WHITE), ("TIENE", CA.WHITE), ("PRECIO", CA.GOLD)]], 320, 130)
        elif kind == "hero":
            big, col, emo = st[1], st[2], st[3]
            tb = [tw for w, tw in ws if w == big][0]
            if t < tb - 0.04 and t <= c1:
                CA.line_words(img, t, [(w, tw) for w, tw in ws if w != big], 930, 110)
            else:
                small = " ".join(w for w, _ in ws if w != big) or None
                t_end = min(c1 + 0.15, T_DROP + 0.08) if big == "DESTINO" else c1 + 0.15   # «DESTINO» se va con el golpe del drop
                CA.hero(img, t, tb - 0.04, t_end, small, big, col, 930, emo, 230 if big != "DESTINO" else 250)
    if sg["name"] == "medalla":
        tm = sg["outp"][1][0] + 0.15
        CA.hero(img, t, tm, sg["t1"] + 0.05, None, "FINISHER", CA.GOLD, 360, "🏅", 170)
    if sg["name"] == "grito":
        tq = sg["t1"] - 1.75
        CA.headline(img, t, tq, DUR - 0.1, [[("¿CUÁL", CA.WHITE), ("ES", CA.WHITE), ("TU", CA.WHITE)], [("PRÓXIMO", CA.GOLD), ("RETO?", CA.GOLD)]], 300, 112)
        if t > tq + 0.3:
            CA.paste(img, CA.emoji_img("👇", 110), W / 2, 640 + 10 * np.sin(t * 9), 1.0, min(1, (t - tq - 0.3) / 0.15))


def render(k):
    t = k / FPS
    i, sg, ts = src_time(t)
    img = frame_at(ts)
    M, s = cam_matrix(t, i, sg)
    img = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
    if s > 1.25:                                  # nitidez tras ampliar
        img = cv2.addWeighted(img, 1.35, cv2.GaussianBlur(img, (0, 0), 1.6), -0.35, 0)
    # transiciones
    flash = 0.0
    for j, kind in TRANS.items():
        tb = SEGS[j]["t0"]
        d = t - tb
        if kind == "whip" and -0.14 <= d < 0.14:
            v = 1 - abs(d) / 0.14
            off = -260 * v if d < 0 else 260 * v      # sale hacia la izquierda, entra desde la derecha
            Mw = np.float32([[1, 0, off], [0, 1, 0]])
            img = dir_blur(cv2.warpAffine(img, Mw, (W, H), borderMode=cv2.BORDER_REFLECT), 110 * v)
        if kind == "zoom" and -0.12 <= d < 0.16:
            v = 1 - abs(d) / (0.12 if d < 0 else 0.16)
            img = zoom_blur(img, 0.22 * v)
            flash += 0.25 * v
        if kind == "flash" and 0 <= d < 0.18:
            flash += 0.5 * (1 - d / 0.18)
        if kind == "drop" and 0 <= d < 0.3:
            flash += 0.95 * (1 - d / 0.3) ** 1.5
            img = zoom_blur(img, 0.18 * (1 - d / 0.3))
    if i == 0 and t < 0.12:
        flash += 1.0 - t / 0.12
    tg = out_time(11.44)
    if tg and 0 <= t - tg < 0.2:                  # «GANADO»
        flash += 0.35 * (1 - (t - tg) / 0.2)
    if t > DUR - 0.12:
        flash += (t - (DUR - 0.12)) / 0.12        # fundido a blanco: enlaza con el primer fotograma (bucle)
    img = grade(img, sg["grade"], t, sg)
    if flash > 0:
        img = (img.astype(np.float32) * (1 - min(1, flash)) + 255 * min(1, flash)).astype(np.uint8)
    draw_caps(img, t, sg)
    return img


def render_bytes(k):
    return render(k).tobytes()


# ---------------------------------------------------------------- sonido
def load_audio(path, sr=44100):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "2", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def build_audio(with_music=True, sfx_gain=1.0):
    sys.path.insert(0, ROOT)
    import music_amigo as MU
    import music2_amigo as MU2
    sr = MU.SR
    src = load_audio(os.path.join(ROOT, "assets", "audio_original.wav"), sr)
    n = int((DUR + 0.6) * sr)
    voice = np.zeros((n, 2), np.float32)
    amb = np.zeros((n, 2), np.float32)
    for sg in SEGS:
        for o0, o1, a, b, v in sg["outp"]:
            if abs(v - 1) > 1e-3:
                continue
            i0, i1 = int(a * sr), int(b * sr)
            j0 = int(o0 * sr)
            seg = src[i0:i1].copy()
            fl = min(len(seg) // 2, int(0.012 * sr))
            if fl > 0:
                ramp = np.linspace(0, 1, fl, dtype=np.float32)[:, None]
                seg[:fl] *= ramp
                seg[-fl:] *= ramp[::-1]
            dst = voice if sg.get("caps") else amb
            dst[j0:j0 + len(seg)] += seg[:max(0, n - j0)]
    # la voz: graves fuera y algo de compresión; el ambiente de la carrera: sin el retumbe del viento
    import voice_fx as VF                          # voz tratada: menos ruido, más clara y presente, «s» suaves, compresión
    act = np.zeros(n, bool)
    for c0, c1, ws in CAPS:
        act[int(max(0, c0 - 0.05) * sr):int((ws[-1][1] + 0.55) * sr)] = True
    voice = VF.process_voice(voice, act) * 0.9
    amb = MU.highpass(amb, 160, sr) * 1.5
    venv = MU.envelope(voice, sr) + MU.envelope(amb, sr) * 0.6   # la música baja con la voz y con los gritos
    marks = dict(dur=DUR, destino=T_DESTINO, drop=T_DROP, hoy=out_time(19.36), ganado=out_time(11.44), bw0=SEGS[2]["t0"], color=SEGS[4]["t0"],
                 whips=[SEGS[j]["t0"] for j, k in TRANS.items() if k == "whip"], medal=SEGS[11]["outp"][1][0] + 0.15,
                 slow0=SEGS[11]["outp"][1][0], slow1=SEGS[11]["outp"][1][1], q=SEGS[12]["t1"] - 1.75, teaser=SEGS[1]["t0"], sunset=SEGS[3]["t0"])
    sfx = MU.sfx_track(n, marks)
    out = voice * 1.0 + amb + sfx * sfx_gain
    if with_music:
        mus = MU2.music_track(n, marks)
        duck = 1 - 0.6 * np.clip(venv / 0.08, 0, 1)
        out += mus * duck[:, None]
    return out, sr


def write_wav(path, x, sr):
    import wave
    y = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((y * 32767).astype("<i2").tobytes())


def main():
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    print(f"duración {DUR:.2f} s · {N} fotogramas · drop en {T_DROP:.2f} s")
    vid = os.path.join(ROOT, "out", "video_mudo.mp4")
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", vid], stdin=subprocess.PIPE)
    with Pool(4) as pool:
        for buf in pool.imap(render_bytes, range(N), chunksize=6):
            ff.stdin.write(buf)
    ff.stdin.close()
    ff.wait()
    for name, mus in [("maraton_v3.mp4", True), ("maraton_v3_sin_musica.mp4", False)]:
        a, sr = build_audio(mus, sfx_gain=0.6)
        wav = os.path.join(ROOT, "out", "audio_tmp.wav")
        write_wav(wav, a / max(1e-6, np.abs(a).max()) * 0.9, sr)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", vid, "-i", wav, "-filter_complex", "[1:a]loudnorm=I=-14:TP=-1.2:LRA=9,aresample=48000[a]",
                        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
                        os.path.join(ROOT, "out", name)], check=True)
        print("→", name)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        os.makedirs(os.path.join(ROOT, "out", "test"), exist_ok=True)
        print(f"duración {DUR:.2f} s · drop {T_DROP:.2f} · destino {T_DESTINO:.2f}")
        for tt in [float(x) for x in sys.argv[2:]]:
            cv2.imwrite(os.path.join(ROOT, "out", "test", f"t{tt:05.2f}.jpg"), render(int(round(tt * FPS))), [cv2.IMWRITE_JPEG_QUALITY, 90])
    else:
        main()
