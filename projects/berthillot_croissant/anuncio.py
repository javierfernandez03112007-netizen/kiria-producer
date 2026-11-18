"""Anuncio vertical (1080x1920, 60 fps) del croissant relleno de Maison Berthillot (Granada), hecho SOLO con la foto que pasó Javi
(assets/foto.webp, 806x460: no se amplía más de ≈ 1,6×) + tipografía + grafismo animado + efectos de la biblioteca del canal.
Sin precio en el texto, sin logotipos, sin música (no hay ninguna con licencia). Si existe assets/voz.mp3 (locución), se mezcla.

    python3 projects/berthillot_croissant/anuncio.py [--test t1 t2 ...]
"""
import math
import os
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.abspath(os.path.join(ROOT, ".."))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
FONTS = os.path.join(ROOT, "..", "..", "engine", "fonts")
W, H, FPS = 1080, 1920, 60
# ---- tiempos (s). Con locución se ajustan a ella (TIMES.json); sin ella, a ritmo de lectura.
T = dict(a=0.35, b=2.9, zoom=2.7, este=3.75, s3=5.4, h1=5.6, h2=7.7, f1=8.2, f2=8.9, f3=9.6, eliges=10.5, s4=11.7, cafe=11.95, fin=14.3, end=17.6)
if os.path.exists(os.path.join(ROOT, "TIMES.json")):
    import json
    T.update(json.load(open(os.path.join(ROOT, "TIMES.json"))))
END = T["end"]
N = int(END * FPS)
CREAM, ESP, GOLD, PIS, CHOC, CAR = (247, 240, 228), (42, 27, 18), (224, 170, 66), (157, 187, 90), (92, 52, 28), (206, 140, 72)

clamp = lambda x, a=0.0, b=1.0: min(b, max(a, x))
lerp = lambda a, b, u: a + (b - a) * u
seg = lambda t, a, b: clamp((t - a) / (b - a))
eo = lambda x: 1 - (1 - clamp(x)) ** 3
eio = lambda x: (lambda u: 4 * u ** 3 if u < 0.5 else 1 - (-2 * u + 2) ** 3 / 2)(clamp(x))
def pop(x):                                         # aparece con un pequeño rebote
    x = clamp(x)
    return 0.0 if x <= 0 else 1.0 if x >= 1 else 1 + math.sin(x * math.pi * 1.15) * (1 - x) * 0.45 + (eo(x) - 1)


def font(name, px):
    return ImageFont.truetype(os.path.join(FONTS, name), int(px))
SERIF, ITAL, SANS = "CormorantGaramond-500-normal.ttf", "InstrumentSerif-Italic.woff", "Inter-SemiBold.otf"
_SP = {}


def text(txt, f, px, col, ls=0, shadow=0.0):       # texto → (rgb premultiplicado, alfa) float32; con interletraje y sombra suave opcional
    key = (txt, f, px, col, ls, shadow)
    if key not in _SP:
        fo = font(f, px); ws = [fo.getlength(c) for c in txt]; w = int(sum(ws) + ls * (len(txt) - 1) + px * 0.6); h = int(px * 1.6)
        im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im); x = px * 0.3
        for c, cw in zip(txt, ws):
            d.text((x, px * 0.2), c, font=fo, fill=col + (255,)); x += cw + ls
        if shadow:
            sh = Image.new("RGBA", (w, h), (0, 0, 0, 0)); sh.paste((0, 0, 0, int(255 * shadow)), mask=im.split()[3]); sh = sh.filter(ImageFilter.GaussianBlur(px * 0.12))
            im = Image.alpha_composite(sh, im)
        a = np.asarray(im, np.float32) / 255
        _SP[key] = (a[..., [2, 1, 0]] * a[..., 3:], a[..., 3:])
    return _SP[key]


def put(img, sp, cx, cy, a=1.0, s=1.0, anchor="c"):  # pega un sprite centrado en (cx, cy) con opacidad y escala
    rgb, al = sp
    if a <= 0.004 or s <= 0.01:
        return
    if abs(s - 1) > 1e-3:
        w, h = max(2, int(rgb.shape[1] * s + 0.5)), max(2, int(rgb.shape[0] * s + 0.5)); it = cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC
        rgb = cv2.resize(rgb, (w, h), interpolation=it); al = cv2.resize(al, (w, h), interpolation=it)[..., None]
    h, w = rgb.shape[:2]; x0 = int(round(cx - (w / 2 if anchor == "c" else 0))); y0 = int(round(cy - h / 2))
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if xa >= xb or ya >= yb:
        return
    sl = (slice(ya - y0, yb - y0), slice(xa - x0, xb - x0))
    img[ya:yb, xa:xb] = img[ya:yb, xa:xb] * (1 - al[sl] * a) + rgb[sl] * a


def words(img, parts, cy, t, t0, dt=0.16, a=1.0, gap=0.28):   # frase palabra a palabra: parts = [(texto, fuente, px, color)]
    sps = [text(p[0], p[1], p[2], p[3], shadow=p[4] if len(p) > 4 else 0.5) for p in parts]
    ws = [s[0].shape[1] - parts[i][2] * 0.6 for i, s in enumerate(sps)]; sp = parts[0][2] * gap; x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for i, (s, w) in enumerate(zip(sps, ws)):
        k = eo(seg(t, t0 + i * dt, t0 + i * dt + 0.32))
        put(img, s, x + w / 2, cy + (1 - k) * 26, a * k); x += w + sp


# ---------------------------------------------------------------- la foto: se limpia un poco (nitidez, calidez) y se preparan fondo, tarjeta y recortes
SRC = cv2.imread(os.path.join(ROOT, "assets", "foto.webp")).astype(np.float32) / 255      # 806 x 460 (BGR)
def enhance(im, k):
    im = cv2.resize(im, None, fx=k, fy=k, interpolation=cv2.INTER_LANCZOS4); bl = cv2.GaussianBlur(im, (0, 0), 1.6 * k / 2)
    im = np.clip(im + (im - bl) * 0.75, 0, 1); g = im.mean(2, keepdims=True); im = np.clip(g + (im - g) * 1.12, 0, 1)        # nitidez y un punto de color
    return np.clip((im - 0.5) * 1.06 + 0.5 + np.array([-0.012, 0.004, 0.016], np.float32), 0, 1)                              # contraste y calidez
PH = enhance(SRC, 1.7)                              # 1370 x 782
PHK = PH.shape[1] / 806
BG = cv2.GaussianBlur(cv2.resize(SRC, (int(1920 * 806 / 460 * 1.12), int(1920 * 1.12)), interpolation=cv2.INTER_CUBIC), (0, 0), 38)
BG = np.clip(BG * np.array([0.5, 0.56, 0.62], np.float32) + np.array([0.02, 0.03, 0.05], np.float32), 0, 1)
rng = np.random.default_rng(7)
GRAIN = [(rng.standard_normal((H // 2, W // 2, 1)).astype(np.float32) * 0.022) for _ in range(6)]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIG = (1 - 0.34 * np.clip(((xx - W / 2) / (W * 0.72)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2, 0, 1))[..., None]


def rounded(w, h, r):
    m = Image.new("L", (w * 2, h * 2), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w * 2 - 1, h * 2 - 1), radius=r * 2, fill=255)
    return np.asarray(m.resize((w, h), Image.LANCZOS), np.float32)[..., None] / 255


_MASK = {}
def card(img, crop, cx, cy, w, a=1.0, rot=0.0, sweep=-1.0):   # tarjeta con la foto: recorte (x0, y0, x1, y1 en píxeles de la foto original), sombra, borde crema
    x0, y0, x1, y1 = [v * PHK for v in crop]; h = int(round(w * (y1 - y0) / (x1 - x0))); w = int(round(w))
    M = np.float32([[(x1 - x0) / w, 0, x0], [0, (y1 - y0) / h, y0]])
    ph = cv2.warpAffine(PH, M, (w, h), flags=cv2.INTER_AREA | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
    if sweep >= 0:                                 # un brillo que cruza la foto
        gx = (np.arange(w, dtype=np.float32)[None, :] + np.arange(h, dtype=np.float32)[:, None] * 0.35) / (w + h * 0.35)
        ph = np.clip(ph + (np.exp(-((gx - sweep) / 0.07) ** 2) * 0.22)[..., None], 0, 1)
    B = 12; key = (w, h)
    if key not in _MASK:
        fr = rounded(w + 2 * B, h + 2 * B, 34); sh = cv2.GaussianBlur(np.pad(fr[..., 0], 70), (0, 0), 26)[..., None]
        _MASK[key] = (fr, rounded(w, h, 24), sh)
    fr, inner, sh = _MASK[key]
    fw, fh = w + 2 * B, h + 2 * B; rgb = np.empty((fh, fw, 3), np.float32); rgb[:] = np.array(CREAM[::-1], np.float32) / 255
    rgb[B:B + h, B:B + w] = rgb[B:B + h, B:B + w] * (1 - inner) + ph * inner
    shs = (np.zeros((sh.shape[0], sh.shape[1], 3), np.float32), sh * 0.42)
    put(img, shs, cx, cy + 26, a); put(img, (rgb * fr, fr), cx, cy, a)
    return h


def steam(img, cx, cy, t, a):                      # vapor: volutas blancas que suben y se deshacen
    if a <= 0.01:
        return
    ov = np.zeros((520, 360), np.float32)
    for k in range(5):
        ph = (t * 0.33 + k / 5) % 1; x = 180 + math.sin(k * 2.1) * 34; pts = []
        for i in range(26):
            u = i / 25; y = 500 - (ph * 320 + u * 150); xw = x + math.sin(u * 5 + t * 1.6 + k * 1.7) * (10 + 26 * (ph + u * 0.4)); pts.append([xw, y])
        cv2.polylines(ov, [np.int32(pts)], False, float(0.5 * math.sin(ph * math.pi)), thickness=int(9 + 12 * ph), lineType=cv2.LINE_AA)
    ov = cv2.GaussianBlur(ov, (0, 0), 9)[..., None] * a
    put(img, (np.ones((520, 360, 3), np.float32) * ov, ov), cx, cy - 250)


_BLOB = {}
def blob(col, r=125):                               # bola de crema brillante (relleno) con su remolino
    if col not in _BLOB:
        S = 3; n = (r * 2 + 80) * S; im = Image.new("RGBA", (n, n), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = n // 2; R = r * S
        for i in range(60):                        # degradado radial hecho a capas
            u = i / 59; rr = R * (1 - u * 0.96); k = 0.72 + 0.5 * u; d.ellipse((c - rr - R * 0.12 * u, c - rr - R * 0.16 * u, c + rr - R * 0.12 * u, c + rr - R * 0.16 * u), fill=tuple(int(min(255, v * k)) for v in col) + (255,))
        d.ellipse((c - R, c - R, c + R, c + R), outline=tuple(int(v * 0.55) for v in col) + (255,), width=4 * S)
        pts = [(c + math.cos(a) * R * 0.62 * (1 - a / 14), c + math.sin(a) * R * 0.62 * (1 - a / 14) - R * 0.04) for a in np.linspace(0.4, 11.5, 90)]
        d.line(pts, fill=tuple(int(min(255, v * 1.28 + 18)) for v in col) + (235,), width=9 * S, joint="curve")
        d.arc((c - R * 0.78, c - R * 0.78, c + R * 0.78, c + R * 0.78), 198, 252, fill=(255, 255, 255, 200), width=7 * S)
        im = im.filter(ImageFilter.GaussianBlur(1.2 * S)).resize((n // S, n // S), Image.LANCZOS); a = np.asarray(im, np.float32) / 255
        sh = cv2.GaussianBlur(np.pad(a[..., 3], 0), (0, 0), 16)[..., None] * 0.35
        _BLOB[col] = ((a[..., [2, 1, 0]] * a[..., 3:], a[..., 3:]), (np.zeros_like(a[..., :3]), sh))
    return _BLOB[col]


def stroke(img, pts, col, wd, k):                   # trazo dibujado poco a poco (subrayado a mano)
    if k <= 0.01:
        return
    n = max(2, int(len(pts) * clamp(k))); ov = np.zeros((H, W), np.float32)
    cv2.polylines(ov, [np.int32(pts[:n])], False, 1.0, thickness=wd, lineType=cv2.LINE_AA); ov = cv2.GaussianBlur(ov, (0, 0), 0.8)[..., None]
    img[:] = img * (1 - ov) + np.array(col[::-1], np.float32) / 255 * ov


def spark(img, cx, cy, r, a):                       # destello de cuatro puntas
    if a <= 0.01 or r < 2:
        return
    ov = np.zeros((int(r * 2 + 8), int(r * 2 + 8)), np.float32); c = ov.shape[0] / 2
    for ang in (0, math.pi / 2):
        p = np.float32([[c + math.cos(ang) * r, c + math.sin(ang) * r], [c + math.cos(ang + math.pi / 2) * r * 0.13, c + math.sin(ang + math.pi / 2) * r * 0.13], [c - math.cos(ang) * r, c - math.sin(ang) * r], [c - math.cos(ang + math.pi / 2) * r * 0.13, c - math.sin(ang + math.pi / 2) * r * 0.13]])
        cv2.fillPoly(ov, [np.int32(p)], 1.0, lineType=cv2.LINE_AA)
    ov = cv2.GaussianBlur(ov, (0, 0), 1.0)[..., None] * a; put(img, (np.ones(ov.shape[:2] + (3,), np.float32) * np.array([0.72, 0.9, 1.0], np.float32) * ov, ov), cx, cy)


FULL = (0, 0, 806, 460); ZCR = (6, 96, 636, 455.5); ZCUP = (186, 52, 806, 406)       # recortes: toda la foto · los croissants · la taza a la derecha


def frame(fi):
    t = fi / FPS; img = np.empty((H, W, 3), np.float32)
    fin = eio(seg(t, T["fin"], T["fin"] + 0.7))
    if fin < 1:
        # ---- fondo: la propia foto, muy desenfocada y oscurecida, moviéndose despacio
        z = 1 + 0.06 * (t / END); bw, bh = BG.shape[1], BG.shape[0]; ch = bh / z; cw = ch * W / H
        ox = (bw - cw) / 2 + 60 * math.sin(t * 0.21); oy = (bh - ch) / 2
        img[:] = cv2.warpAffine(BG, np.float32([[cw / W, 0, ox], [0, ch / H, oy]]), (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
        k3 = eio(seg(t, T["s3"], T["s3"] + 0.75)) * (1 - eio(seg(t, T["s4"], T["s4"] + 0.7)))       # 0 = tarjeta grande en el centro · 1 = tarjeta pequeña arriba (sabores)
        kz = eio(seg(t, T["zoom"], T["zoom"] + 1.5)) * (1 - eio(seg(t, T["s3"] - 0.1, T["s3"] + 0.7)))   # acercamiento a los croissants
        kc = eio(seg(t, T["s4"], T["s4"] + 0.9))                                                         # hacia la taza
        crop = [lerp(lerp(FULL[i], ZCR[i], kz), ZCUP[i], kc) for i in range(4)]
        ent = eo(seg(t, 0, 0.9)); cw2 = lerp(lerp(1000, 780, k3), 1000, 0) * (1.1 - 0.1 * ent) * (1 + 0.025 * math.sin(t * 0.5)); cy = lerp(1140, 835, k3) + (1 - ent) * 60
        hgt = card(img, crop, W / 2, cy, cw2, ent, sweep=(t - T["este"]) / 0.9 if T["este"] <= t < T["este"] + 0.9 else -1.0)
        # vapor sobre la taza (al hablar del café)
        if kc > 0.02:
            sx = W / 2 + ((648 - crop[0]) / (crop[2] - crop[0]) - 0.5) * cw2; sy = cy + ((178 - crop[1]) / (crop[3] - crop[1]) - 0.5) * hgt; steam(img, sx, sy, t, kc * (1 - fin))
        # ---- rótulo fijo de arriba
        a0 = eo(seg(t, 0.2, 0.9)); put(img, text("MAISON BERTHILLOT", SANS, 30, GOLD, ls=11, shadow=0.5), W / 2, 236, a0); img[262:264, W // 2 - 60:W // 2 + 60] = img[262:264, W // 2 - 60:W // 2 + 60] * (1 - a0 * 0.8) + np.array(GOLD[::-1], np.float32) / 255 * a0 * 0.8
        ap = a0 * (1 - k3) * (1 - fin)
        if ap > 0.01:
            put(img, text("BOLLERÍA DE MANTEQUILLA", SANS, 27, (255, 255, 255), ls=9, shadow=0.5), W / 2, 1556, ap * 0.92); put(img, text("CAFÉ DE ESPECIALIDAD · GRANADA", SANS, 23, GOLD, ls=8, shadow=0.5), W / 2, 1606, ap * 0.92)
        # ---- 1 · «Hay cruasanes…» · 2 · «…y luego está este.»
        a1 = 1 - eo(seg(t, T["b"] - 0.35, T["b"] - 0.05)); words(img, [("Hay", ITAL, 132, (255, 255, 255)), ("cruasanes…", ITAL, 132, (255, 255, 255))], 590, t, T["a"], 0.22, a1)
        a2 = 1 - eo(seg(t, T["s3"] - 0.3, T["s3"])); words(img, [("…y", ITAL, 104, (255, 255, 255)), ("luego", ITAL, 104, (255, 255, 255)), ("está", ITAL, 104, (255, 255, 255))], 480, t, T["b"], 0.18, a2)
        ke = pop(seg(t, T["este"], T["este"] + 0.4)); put(img, text("este.", ITAL, 196, GOLD, shadow=0.55), W / 2, 655, a2 * clamp(ke * 2), 0.7 + 0.3 * ke)
        us = [(W / 2 - 190 + i * 9.5, 760 + 9 * math.sin(i * 0.33) + i * 0.1) for i in range(41)]; stroke(img, us, GOLD, 7, seg(t, T["este"] + 0.25, T["este"] + 0.75) * (a2 > 0.5))
        for j, (dx, dy, r) in enumerate([(-250, -80, 34), (268, -44, 24), (228, 70, 16)]):
            u = seg(t, T["este"] + 0.15 + j * 0.12, T["este"] + 0.95 + j * 0.12); spark(img, W / 2 + dx, 655 + dy, r * math.sin(u * math.pi) * 1.4, math.sin(u * math.pi) * a2)
        # ---- 3 · «Mantequilla. Capas que crujen.» · «Y por dentro…» · los tres rellenos · «Tú eliges.»
        ah = eo(seg(t, T["h1"], T["h1"] + 0.3)) * (1 - eo(seg(t, T["h2"] - 0.35, T["h2"] - 0.05)))
        if ah > 0.01:
            words(img, [("Mantequilla.", SERIF, 104, (255, 255, 255))], 345, t, T["h1"], 0.2, ah); words(img, [("Capas", ITAL, 92, GOLD), ("que", ITAL, 92, GOLD), ("crujen.", ITAL, 92, GOLD)], 455, t, T["h1"] + 0.75, 0.18, ah)
        ah2 = eo(seg(t, T["h2"], T["h2"] + 0.3)) * (1 - eo(seg(t, T["s4"] - 0.3, T["s4"])))
        if ah2 > 0.01:
            words(img, [("Y", SERIF, 112, (255, 255, 255)), ("por", SERIF, 112, (255, 255, 255)), ("dentro…", ITAL, 124, GOLD)], 392, t, T["h2"], 0.17, ah2)
            for j, (nm, col, tk) in enumerate([("Nutella", CHOC, "f1"), ("Biscoff", CAR, "f2"), ("Pistacho", PIS, "f3")]):
                k = pop(seg(t, T[tk], T[tk] + 0.45)); x = 200 + j * 340; y = 1290 + 5 * math.sin(t * 2 + j * 2); b, sh = blob(col)
                if k > 0.01:
                    put(img, sh, x + 8, y + 22, ah2 * clamp(k), k); put(img, b, x, y, ah2 * clamp(k * 2), k * (1 + 0.02 * math.sin(t * 3 + j)))
                    put(img, text(nm, SERIF, 72, (255, 255, 255), shadow=0.55), x, 1488, ah2 * eo(seg(t, T[tk] + 0.15, T[tk] + 0.5)))
            ke2 = pop(seg(t, T["eliges"], T["eliges"] + 0.4)); put(img, text("Tú eliges.", ITAL, 132, GOLD, shadow=0.55), W / 2, 1650, ah2 * clamp(ke2 * 2), 0.75 + 0.25 * ke2)
        # ---- 4 · «Nosotros ponemos el café de especialidad.»
        a4 = eo(seg(t, T["cafe"], T["cafe"] + 0.3)) * (1 - fin)
        if a4 > 0.01:
            words(img, [("Nosotros", SERIF, 96, (255, 255, 255)), ("ponemos", SERIF, 96, (255, 255, 255))], 500, t, T["cafe"], 0.2, a4)
            words(img, [("el", ITAL, 108, GOLD), ("café", ITAL, 108, GOLD), ("de", ITAL, 108, GOLD), ("especialidad.", ITAL, 108, GOLD)], 630, t, T["cafe"] + 0.5, 0.16, a4)
        img *= VIG
    # ---- 5 · cierre: fondo crema, el nombre, Granada y lo que es
    if fin > 0:
        end = np.empty((H, W, 3), np.float32); end[:] = np.array(CREAM[::-1], np.float32) / 255; te = t - T["fin"]
        k = pop(seg(te, 0.35, 0.95)); R = 225
        if k > 0.01:                               # la foto del croissant en un círculo con aro dorado
            key = ("circ",)
            if key not in _MASK:
                c = cv2.warpAffine(PH, np.float32([[330 * PHK / (2 * R), 0, 12 * PHK], [0, 330 * PHK / (2 * R), 118 * PHK]]), (2 * R, 2 * R), flags=cv2.INTER_AREA | cv2.WARP_INVERSE_MAP)
                m = Image.new("L", (4 * R, 4 * R), 0); ImageDraw.Draw(m).ellipse((0, 0, 4 * R - 1, 4 * R - 1), fill=255); m = np.asarray(m.resize((2 * R, 2 * R), Image.LANCZOS), np.float32)[..., None] / 255
                rg = Image.new("L", (4 * R + 80, 4 * R + 80), 0); ImageDraw.Draw(rg).ellipse((6, 6, 4 * R + 73, 4 * R + 73), outline=255, width=10); rg = np.asarray(rg.resize((2 * R + 40, 2 * R + 40), Image.LANCZOS), np.float32)[..., None] / 255
                _MASK[key] = ((c * m, m), (np.ones(rg.shape[:2] + (3,), np.float32) * np.array(GOLD[::-1], np.float32) / 255 * rg, rg))
            put(end, _MASK[key][0], W / 2, 600, clamp(k * 2), k); put(end, _MASK[key][1], W / 2, 600, clamp(k * 2), k * (1 + 0.012 * math.sin(te * 3)))
        words(end, [("Maison", SERIF, 150, ESP, 0), ("Berthillot", SERIF, 150, ESP, 0)], 1010, te, 0.75, 0.22)
        kl = eo(seg(te, 1.25, 1.75)); x0 = int(W / 2 - 150 * kl); end[1108:1111, x0:W - x0] = np.array(GOLD[::-1], np.float32) / 255
        put(end, text("GRANADA", SANS, 38, GOLD, ls=20), W / 2, 1168, eo(seg(te, 1.35, 1.8)))
        put(end, text("Croissant relleno de", ITAL, 62, ESP), W / 2, 1320, eo(seg(te, 1.65, 2.05)))
        put(end, text("Nutella, Biscoff o pistacho", ITAL, 70, CHOC), W / 2, 1400, eo(seg(te, 1.8, 2.2)))
        kp = pop(seg(te, 2.2, 2.65))
        if kp > 0.01:
            key = ("cta",)
            if key not in _MASK:
                m = rounded(470, 104, 52); _MASK[key] = (np.ones((104, 470, 3), np.float32) * np.array(ESP[::-1], np.float32) / 255 * m, m)
            put(end, _MASK[key], W / 2, 1590, clamp(kp * 2), kp); put(end, text("Ven a probarlo", SANS, 40, CREAM, ls=2), W / 2, 1590, clamp(kp * 2), kp)
        if fin < 1:                                # la crema sube como una cortina
            yb = int(H * (1 - fin)); img[yb:] = end[yb:]
        else:
            img = end
    g = cv2.resize(GRAIN[fi % len(GRAIN)], (W, H), interpolation=cv2.INTER_LINEAR)[..., None] if GRAIN[0].ndim == 2 else cv2.resize(GRAIN[fi % len(GRAIN)], (W, H), interpolation=cv2.INTER_LINEAR)[..., None]
    img = img + g * (0.6 if fin >= 1 else 1.0)
    img *= eo(seg(t, 0, 0.35))                      # entra desde negro
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes()


# ---------------------------------------------------------------- sonido: efectos SOLO de la biblioteca de ElevenLabs del canal (projects/*/assets/sfx)
def sfx_track(path):
    from engine import sfx
    sr = sfx.SR; out = np.zeros(int((END + 1) * sr)); cache = {}

    def put_s(name, t0, dur, g=1.0, fade=0.1, start=0.0):
        if name not in cache:
            p, n = name.split("/"); raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(PROJ, p, "assets", "sfx", n + ".mp3"), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, check=True).stdout
            x = np.frombuffer(raw, np.float32).astype(np.float64); x = x / (np.abs(x).max() + 1e-9) * 0.5; on = np.flatnonzero(np.abs(x) > 0.02); cache[name] = x[max(0, on[0] - int(0.004 * sr)):] if len(on) else x
        x = cache[name][int(start * sr):][:max(1, int(dur * sr))].copy(); fi = min(len(x), int(0.004 * sr)); x[:fi] *= np.linspace(0, 1, fi); fo = min(len(x), int(fade * sr)); x[len(x) - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
        sfx.mix(out, x, max(0.0, t0), g)

    put_s("avion/whoosh_largo", 0.05, 1.1, 0.26, 0.4)                # entra la foto
    put_s("avion/whoosh", T["zoom"], 0.6, 0.2)                       # se acerca a los croissants
    put_s("avion/brillo", T["este"] - 0.02, 1.0, 0.34, 0.4)          # «este.»
    put_s("avion/whoosh", T["s3"], 0.6, 0.2)
    for k in ("f1", "f2", "f3"):
        put_s("lanzamiento/burbuja", T[k] - 0.02, 0.45, 0.4, 0.2)    # cada relleno
    put_s("avion/ding", T["eliges"] + 0.02, 0.7, 0.26, 0.3)          # «Tú eliges.»
    put_s("avion/whoosh", T["s4"], 0.6, 0.2)
    put_s("quimica/vapor", T["cafe"] - 0.1, 0.9, 0.2, 0.4)           # el vapor del café
    put_s("avion/whoosh_largo", T["fin"] - 0.05, 1.1, 0.24, 0.4)     # cierre
    put_s("economia/medalla", T["fin"] + 0.75, 1.0, 0.3, 0.4)        # el nombre
    sfx.write(path, out, drive=1.0, level=0.9)


def main():
    from multiprocessing import Pool
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True); sp = os.path.join(ROOT, "out", "sfx.wav"); sfx_track(sp); voz = os.path.join(ROOT, "assets", "voz.mp3"); dst = os.path.join(ROOT, "out", "berthillot_croissant.mp4")
    if os.path.exists(voz):
        fc = "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo,apad[v];[2:a]volume=0.75[s];[v][s]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.89:level=false[a]"; ins = ["-i", voz, "-i", sp]
    else:
        fc = "[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo[a]"; ins = ["-i", sp]
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", *ins, "-filter_complex", fc, "-map", "0:v", "-map", "[a]",
           "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-maxrate", "10M", "-bufsize", "20M", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", f"{END:.3f}", "-movflags", "+faststart", dst]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(int(os.environ.get("PROCS", 4))) as pool:
        for buf in pool.imap(frame, range(N), chunksize=6):
            ff.stdin.write(buf)
    ff.stdin.close(); ff.wait(); print("vídeo →", dst)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        os.makedirs(os.path.join(ROOT, "out", "test"), exist_ok=True)
        for tt in [float(x) for x in sys.argv[2:]]:
            fr = np.frombuffer(frame(int(round(tt * FPS))), np.uint8).reshape(H, W, 3); cv2.imwrite(os.path.join(ROOT, "out", "test", f"t{tt:05.2f}.jpg"), fr, [cv2.IMWRITE_JPEG_QUALITY, 92])
    else:
        main()
