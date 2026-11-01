"""Subtítulos variados (como en los vídeos de kiria): palabra a palabra con la clave en color, recuadro de selección con
tiradores y medida, titulares que vibran arriba, palabras «héroe» enormes en el centro, apilado tipográfico y emojis en color."""
from functools import lru_cache
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
IMPACT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "engine", "fonts", "impact.ttf")
EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
GOLD, GREEN, RED, WHITE, GREY, CYAN = (255, 200, 61), (75, 255, 138), (255, 90, 78), (255, 255, 255), (200, 205, 212), (80, 200, 255)
Y_SUB = 1455                                       # subtítulos normales: abajo, encima de la zona que tapa Instagram


@lru_cache(64)
def font(sz):
    return ImageFont.truetype(IMPACT, sz)


@lru_cache(32)
def emoji_img(e, size):
    try:
        f = ImageFont.truetype(EMOJI, 109)
    except OSError:
        return None
    im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((10, 10), e, font=f, embedded_color=True)
    bb = im.getbbox()
    if not bb:
        return None
    im = im.crop(bb)
    k = size / max(im.size)
    return im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)


@lru_cache(512)
def word_img(w, size, col, stroke=None):
    """Palabra con contorno negro y sombra suave (como engine/subs.word_sprite)."""
    stroke = stroke or max(5, int(size * 0.085))
    f = font(size)
    bb = f.getbbox(w, stroke_width=stroke)
    pad = int(size * 0.18)
    im = Image.new("RGBA", (bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad + int(size * 0.08)), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).text((pad - bb[0], pad - bb[1] + int(size * 0.07)), w, font=f, fill=(0, 0, 0, 150), stroke_width=stroke, stroke_fill=(0, 0, 0, 150))
    sh = sh.filter(ImageFilter.GaussianBlur(size * 0.06))
    im.alpha_composite(sh)
    ImageDraw.Draw(im).text((pad - bb[0], pad - bb[1]), w, font=f, fill=col + (255,), stroke_width=stroke, stroke_fill=(0, 0, 0, 255))
    return im


def paste(img, spr, cx, cy, scale=1.0, alpha=1.0, rot=0.0):
    if spr is None or alpha <= 0.01:
        return
    if scale != 1.0:
        spr = spr.resize((max(1, int(spr.width * scale)), max(1, int(spr.height * scale))), Image.LANCZOS)
    if rot:
        spr = spr.rotate(rot, resample=Image.BICUBIC, expand=True)
    a = np.asarray(spr).astype(np.float32)
    x0, y0 = int(round(cx - a.shape[1] / 2)), int(round(cy - a.shape[0] / 2))
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + a.shape[1]), min(H, y0 + a.shape[0])
    if xb <= xa or yb <= ya:
        return
    sub = a[ya - y0:yb - y0, xa - x0:xb - x0]
    al = sub[..., 3:4] / 255 * alpha
    img[ya:yb, xa:xb] = (img[ya:yb, xa:xb] * (1 - al) + sub[..., :3][..., ::-1] * al).astype(np.uint8)


def ease_back(u):
    u = min(1.0, max(0.0, u))
    c1 = 1.70158
    return 1 + (c1 + 1) * (u - 1) ** 3 + c1 * (u - 1) ** 2


def jitter(t, t0, amp=9):
    v = max(0.0, 1 - (t - t0) / 0.45)
    return amp * v * np.sin((t - t0) * 95), amp * 0.6 * v * np.cos((t - t0) * 120)


def selection_box(img, x0, y0, x1, y1, a, label):
    """Recuadro de selección estilo Figma (marca de los vídeos de kiria): marco, tiradores y medida."""
    if a <= 0.01:
        return
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    col = CYAN + (int(255 * a),)
    d.rectangle([x0, y0, x1, y1], outline=col, width=4)
    for x, y in [(x0, y0), (x1, y0), (x0, y1), (x1, y1)]:
        d.rectangle([x - 9, y - 9, x + 9, y + 9], fill=(255, 255, 255, int(255 * a)), outline=col, width=3)
    f = ImageFont.truetype(IMPACT, 26)
    tw = d.textlength(label, font=f)
    cx = (x0 + x1) / 2
    d.rounded_rectangle([cx - tw / 2 - 10, y1 + 16, cx + tw / 2 + 10, y1 + 52], 8, fill=CYAN + (int(230 * a),))
    d.text((cx - tw / 2, y1 + 18), label, font=f, fill=(10, 20, 30, int(255 * a)))
    arr = np.asarray(ov).astype(np.float32)
    al = arr[..., 3:4] / 255
    m = al[..., 0] > 0
    img[m] = (img[m] * (1 - al[m]) + arr[..., :3][..., ::-1][m] * al[m]).astype(np.uint8)


def line_words(img, t, ws, y, size=96, keyc=None, box=None, dim=False, emoji=None):
    """Grupo palabra a palabra: cada palabra entra con rebote al decirse; la clave en color o dentro del recuadro."""
    keyc = keyc or {}
    shown = [(w, tw) for w, tw in ws if t >= tw - 0.04]
    if not shown:
        return
    sprs = []
    for w, tw in ws:
        col = keyc.get(w, GREY if dim else WHITE)
        sprs.append(word_img(w, size, col))
    gap = int(size * 0.12)
    widths = [s.width for s in sprs]
    total = sum(widths) - gap * 0 + gap * (len(sprs) - 1)
    emo = emoji_img(emoji[1], int(size * 1.0)) if emoji else None
    if emo is not None:
        total += emo.width + gap
    sc = min(1.0, (W - 60) / total)
    x = W / 2 - total * sc / 2
    for (w, tw), s in zip(ws, sprs):
        if t >= tw - 0.04:
            u = (t - tw + 0.04) / 0.16
            k = 0.82 + 0.18 * ease_back(u)
            paste(img, s, x + s.width * sc / 2, y, sc * k, 0.62 if dim else 1.0)
            if box and w == box and u > 0.2:
                bw, bh = s.width * sc * 0.92, s.height * sc * 0.78
                cx = x + s.width * sc / 2
                selection_box(img, cx - bw / 2, y - bh / 2, cx + bw / 2, y + bh / 2, min(1, (u - 0.2) * 3), f"{int(bw)} × {int(bh)}")
        x += (s.width + gap) * sc
        if emo is not None and w == emoji[0]:
            if t >= tw + 0.05:
                u = (t - tw - 0.05) / 0.2
                paste(img, emo, x + emo.width * sc / 2, y, sc * (0.6 + 0.4 * ease_back(u)), 1.0, rot=8 * np.sin(t * 9))
            x += (emo.width + gap) * sc


def headline(img, t, t0, t1, lines, y=300, size=118):
    """Titular arriba que entra vibrando (como los titulares de los vídeos de kiria)."""
    if t < t0 or t > t1:
        return
    a = min(1, (t - t0) / 0.12) * min(1, (t1 - t) / 0.15)
    jx, jy = jitter(t, t0)
    s = 0.86 + 0.14 * ease_back((t - t0) / 0.25)
    yy = y
    for parts in lines:
        sprs = [word_img(w, size, c) for w, c in parts]
        gap = int(size * 0.14)
        tot = sum(sp.width for sp in sprs) + gap * (len(sprs) - 1)
        sc = min(1.0, (W - 70) / tot) * s
        x = W / 2 - tot * sc / 2 + jx
        for sp in sprs:
            paste(img, sp, x + sp.width * sc / 2, yy + jy, sc, a)
            x += (sp.width + gap) * sc
        yy += size * 1.02 * s


def hero(img, t, t0, t1, small, big, col, y=930, emoji=None, size=230):
    """Palabra enorme en el centro: entra grande, se asienta con rebote y tiembla."""
    if t < t0 or t > t1:
        return
    a = min(1, (t - t0) / 0.06) * min(1, (t1 - t) / 0.12)
    u = (t - t0) / 0.22
    s = 1.45 - 0.45 * ease_back(u)
    jx, jy = jitter(t, t0, 14)
    sp = word_img(big, size, col)
    sc = min(1.0, (W - 80) / sp.width)
    glow = sp.filter(ImageFilter.GaussianBlur(28))
    g = np.asarray(glow).copy()
    g[..., :3] = col
    paste(img, Image.fromarray(g), W / 2 + jx, y + jy, sc * s * 1.05, a * 0.55)
    paste(img, sp, W / 2 + jx, y + jy, sc * s, a)
    if small:
        paste(img, word_img(small, 80, WHITE), W / 2 + jx * 0.5, y - sp.height * sc * s * 0.55 - 30, 1.0, a)
    if emoji:
        e = emoji_img(emoji, 120)
        if e is not None and t > t0 + 0.12:
            paste(img, e, W / 2 + sp.width * sc * s * 0.5 + 40, y - sp.height * sc * 0.35, 0.8 + 0.2 * ease_back((t - t0 - 0.12) / 0.2), a, rot=10 * np.sin(t * 8))


def stack(img, t, ws, y=1330, col=GOLD):
    """ENTRENO / a / ENTRENO apilado: las palabras grandes en color, la pequeña en blanco."""
    yy = y
    for i, (w, tw) in enumerate(ws):
        if t < tw - 0.04:
            break
        small = len(w) <= 2
        sp = word_img(w, 78 if small else 132, WHITE if small else col)
        u = (t - tw + 0.04) / 0.18
        paste(img, sp, W / 2 + (1 - min(1, u)) * (-120 if i % 2 == 0 else 120), yy, 0.85 + 0.15 * ease_back(u), min(1, u * 3))
        nxt_small = i + 1 < len(ws) and len(ws[i + 1][0]) <= 2
        yy += 100 if small else (112 if nxt_small else 150)
