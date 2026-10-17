"""Primitivas 2D para los reels de kiria.ai.

Convenciones:
- El fotograma es un array float32 BGR en [0, 1] de H x W x 3 (se recorta a [0, 1] al final).
- Un "sprite" es una tupla (rgb, a): rgb float32 h x w x 3 (BGR) y a float32 h x w en [0, 1].
- Los dibujos vectoriales se hacen con PIL a 3x y se reducen (antialiasing), y se cachean.
"""
import os
from functools import lru_cache

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
FONTS = os.path.join(os.path.dirname(__file__), "fonts")
SS = 3  # supersampling de los dibujos vectoriales


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hex_bgr(h):
    r, g, b = hex_rgb(h)
    return (b / 255, g / 255, r / 255)


# Paleta de marca (BGR 0-1 para cv2/numpy, hex para PIL)
HEX = dict(navy="#0B1F3A", mint="#2EE6A6", amber="#FFB547", white="#FFFFFF",
           ink="#06101F", slate="#1C3557", steel="#2B4A75", mist="#9FB3CC")
NAVY, MINT, AMBER = hex_bgr(HEX["navy"]), hex_bgr(HEX["mint"]), hex_bgr(HEX["amber"])
WHITE, INK, SLATE, STEEL, MIST = (1., 1., 1.), hex_bgr(HEX["ink"]), hex_bgr(HEX["slate"]), \
    hex_bgr(HEX["steel"]), hex_bgr(HEX["mist"])


# ---------------------------------------------------------------- tiempo / easing
def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def prog(t, t0, d):
    return clamp((t - t0) / d) if d > 0 else float(t >= t0)


def eo(x):
    return 1 - (1 - x) ** 3


def eio(x):
    return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2


def eback(x, s=1.6):
    x -= 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2


def env(t, t0, t1, fi=.25, fo=.25):
    """Opacidad 0→1→0 entre t0 y t1 con fundidos."""
    if t < t0 or t > t1:
        return 0.0
    return min(eo(prog(t, t0, fi)), 1 - eo(prog(t, t1 - fo, fo)) if fo > 0 else 1.0)


def lerp(a, b, x):
    return a + (b - a) * x


# ---------------------------------------------------------------- composición
def blend(dst, x, y, rgb, a, alpha=1.0, add=False):
    """Compone un sprite con esquina superior izquierda en (x, y), recortando a los bordes."""
    if alpha <= 0.003:
        return
    h, w = a.shape
    x, y = int(round(x)), int(round(y))
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, dst.shape[1]), min(y + h, dst.shape[0])
    if x0 >= x1 or y0 >= y1:
        return
    sa = a[y0 - y:y1 - y, x0 - x:x1 - x, None] * alpha
    src = rgb[y0 - y:y1 - y, x0 - x:x1 - x]
    roi = dst[y0:y1, x0:x1]
    if add:
        roi += src * sa
    else:
        roi *= 1 - sa
        roi += src * sa


def scaled(sp, sx, sy=None):
    sy = sx if sy is None else sy
    rgb, a = sp
    h, w = a.shape
    nw, nh = max(1, int(w * sx)), max(1, int(h * sy))
    if (nw, nh) == (w, h):
        return sp
    interp = cv2.INTER_AREA if sx < 1 else cv2.INTER_LINEAR
    return cv2.resize(rgb, (nw, nh), interpolation=interp), cv2.resize(a, (nw, nh), interpolation=interp)


def paste(dst, sp, cx, cy, alpha=1.0, scale=1.0, sx=None, anchor="c", add=False, rot=0.0):
    """Pega un sprite. anchor: c (centro), l (izq-centro), r (der-centro), tl (sup-izq), b (abajo-centro)."""
    if alpha <= 0.003 or scale <= 0.01:
        return
    if scale != 1.0 or sx is not None:
        sp = scaled(sp, scale * (1 if sx is None else sx), scale)
    if rot:
        sp = rotated(sp, rot)
    h, w = sp[1].shape
    ox = {"c": w / 2, "l": 0, "r": w, "tl": 0, "b": w / 2, "tr": w}[anchor]
    oy = {"c": h / 2, "l": h / 2, "r": h / 2, "tl": 0, "b": h, "tr": 0}[anchor]
    blend(dst, cx - ox, cy - oy, sp[0], sp[1], alpha, add)


def rotated(sp, deg):
    rgb, a = sp
    h, w = a.shape
    d = int(np.hypot(w, h)) + 2
    M = cv2.getRotationMatrix2D((w / 2, h / 2), deg, 1.0)
    M[0, 2] += (d - w) / 2
    M[1, 2] += (d - h) / 2
    return (cv2.warpAffine(rgb, M, (d, d), flags=cv2.INTER_LINEAR),
            cv2.warpAffine(a, M, (d, d), flags=cv2.INTER_LINEAR))


def solid(w, h, color, a=None):
    rgb = np.empty((h, w, 3), np.float32)
    rgb[:] = color
    return rgb, (np.ones((h, w), np.float32) if a is None else a)


def pil_sprite(im):
    """PIL RGBA (a SSx) → sprite reducido."""
    w, h = im.size
    im = im.resize((max(1, w // SS), max(1, h // SS)), Image.LANCZOS)
    arr = np.asarray(im, np.float32) / 255
    a = arr[..., 3].copy()
    rgb = np.ascontiguousarray(arr[..., 2::-1])
    return rgb, a


def canvas(w, h):
    im = Image.new("RGBA", (int(w * SS), int(h * SS)), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def rgba(hexc, a=1.0):
    return hex_rgb(hexc) + (int(255 * a),)


# ---------------------------------------------------------------- texto
WEIGHTS = {"black": "Inter-Black.otf", "bold": "Inter-Bold.otf", "semi": "Inter-SemiBold.otf",
           "med": "Inter-Medium.otf", "mono": "DejaVuSansMono-Bold.ttf"}


@lru_cache(64)
def font(weight, size):
    return ImageFont.truetype(os.path.join(FONTS, WEIGHTS[weight]), size)


@lru_cache(2048)
def text(txt, size, weight="bold", color=HEX["white"], tracking=0.0, shadow=0.45, lines_gap=1.12,
         align="c"):
    """Sprite de texto (admite '\\n'). tracking en fracción del tamaño. Sombra suave incorporada."""
    f = font(weight, size)
    lines = txt.split("\n")
    asc, desc = f.getmetrics()
    lh = int(size * lines_gap)

    def width(s):
        if not tracking:
            return f.getlength(s)
        return sum(f.getlength(c) for c in s) + tracking * size * max(len(s) - 1, 0)

    ws = [width(s) for s in lines]
    pad = int(size * 0.35) + 4
    tw, th = int(max(ws + [1])) + 2 * pad, lh * (len(lines) - 1) + asc + desc + 2 * pad
    im = Image.new("L", (tw, th), 0)
    d = ImageDraw.Draw(im)
    for i, s in enumerate(lines):
        x = pad + {"c": (max(ws) - ws[i]) / 2, "l": 0, "r": max(ws) - ws[i]}[align]
        y = pad + i * lh
        if not tracking:
            d.text((x, y), s, font=f, fill=255)
        else:
            for c in s:
                d.text((x, y), c, font=f, fill=255)
                x += f.getlength(c) + tracking * size
    a = np.asarray(im, np.float32) / 255
    rgb = np.empty((th, tw, 3), np.float32)
    rgb[:] = hex_bgr(color)
    if shadow:
        sh = cv2.GaussianBlur(a, (0, 0), size * 0.08 + 1.5)
        sh = np.roll(sh, int(size * 0.05) + 1, axis=0) * shadow
        out_a = a + sh * (1 - a)
        rgb = (rgb * a[..., None] + np.array(INK, np.float32) * (sh * (1 - a))[..., None]) / \
            np.maximum(out_a, 1e-4)[..., None]
        a = out_a
    return rgb.astype(np.float32), a.astype(np.float32)


def text_w(txt, size, weight="bold"):
    return font(weight, size).getlength(txt)


def wrap(txt, size, weight, maxw):
    out, cur = [], ""
    for wd in txt.split():
        t = (cur + " " + wd).strip()
        if text_w(t, size, weight) > maxw and cur:
            out.append(cur)
            cur = wd
        else:
            cur = t
    out.append(cur)
    return "\n".join(out)


# ---------------------------------------------------------------- formas
@lru_cache(256)
def rrect_mask(w, h, r, inset=0.0):
    im = Image.new("L", (w * SS, h * SS), 0)
    i = inset * SS
    ImageDraw.Draw(im).rounded_rectangle((i, i, w * SS - 1 - i, h * SS - 1 - i), radius=max(0, r - inset) * SS,
                                         fill=255)
    return np.asarray(im.resize((w, h), Image.LANCZOS), np.float32) / 255


@lru_cache(64)
def ring_mask(w, h, r, width=2.0):
    return np.clip(rrect_mask(w, h, r) - rrect_mask(w, h, r, width), 0, 1)


@lru_cache(64)
def _shadow_mask(w, h, r, blur):
    pad = int(blur * 2.5)
    m = np.zeros((h + 2 * pad, w + 2 * pad), np.float32)
    m[pad:pad + h, pad:pad + w] = rrect_mask(w, h, r)
    return cv2.GaussianBlur(m, (0, 0), blur), pad


def rrect(dst, x, y, w, h, r, color, alpha=1.0, add=False):
    w, h = int(w), int(h)
    if w < 2 or h < 2:
        return
    rgb, a = solid(w, h, color, rrect_mask(w, h, int(min(r, w // 2, h // 2))))
    blend(dst, x, y, rgb, a, alpha, add)


def shadow(dst, x, y, w, h, r, alpha=0.45, blur=26, dy=18):
    m, pad = _shadow_mask(int(w), int(h), int(r), blur)
    rgb = np.zeros(m.shape + (3,), np.float32)
    rgb[:] = INK
    blend(dst, x - pad, y - pad + dy, rgb, m, alpha)


def glass(dst, x, y, w, h, r=40, tint=NAVY, ta=0.62, border=WHITE, ba=0.22, alpha=1.0, blur=22,
          shade=True, glow=None):
    """Panel de cristal esmerilado: desenfoca lo que hay detrás, lo tiñe y añade borde y brillo."""
    if alpha <= 0.003:
        return
    x, y, w, h = int(x), int(y), int(w), int(h)
    r = int(min(r, w // 2, h // 2))
    if shade:
        shadow(dst, x, y, w, h, r, 0.5 * alpha)
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, W), min(y + h, H)
    if x0 >= x1 or y0 >= y1:
        return
    roi = dst[y0:y1, x0:x1]
    sw, sh = max(1, (x1 - x0) // 6), max(1, (y1 - y0) // 6)
    b = cv2.resize(roi, (sw, sh), interpolation=cv2.INTER_AREA)
    b = cv2.GaussianBlur(b, (0, 0), blur / 6)
    b = cv2.resize(b, (x1 - x0, y1 - y0), interpolation=cv2.INTER_LINEAR)
    g = b * (1 - ta) + np.array(tint, np.float32) * ta
    # brillo superior suave
    grad = np.linspace(0.07, 0.0, y1 - y0, dtype=np.float32)[:, None, None]
    g = g + grad
    m = rrect_mask(w, h, r)[y0 - y:y1 - y, x0 - x:x1 - x]
    blend(dst, x0, y0, g, m, alpha)
    if ba > 0:
        ring = ring_mask(w, h, r, 2.0)
        bc = solid(w, h, border, ring)
        blend(dst, x, y, bc[0], bc[1], ba * alpha)
    if glow is not None:
        ring = ring_mask(w, h, r, 3.0)
        bc = solid(w, h, glow, ring)
        blend(dst, x, y, bc[0], bc[1], 0.85 * alpha)


@lru_cache(32)
def _blob(r):
    s = int(r * 2)
    yy, xx = np.mgrid[0:s, 0:s].astype(np.float32)
    d = np.hypot(xx - r, yy - r) / r
    return np.exp(-(d ** 2) * 3.2).astype(np.float32)


def halo(dst, cx, cy, r, color, a=0.5):
    r = int(max(4, r))
    m = _blob(r)
    rgb = np.empty(m.shape + (3,), np.float32)
    rgb[:] = color
    blend(dst, cx - r, cy - r, rgb, m, a, add=True)


def line(dst, p0, p1, color, th=3, alpha=1.0):
    ov = np.zeros_like(dst)
    cv2.line(ov, (int(p0[0] * 4), int(p0[1] * 4)), (int(p1[0] * 4), int(p1[1] * 4)), color, th, cv2.LINE_AA, 2)
    m = ov.max(axis=2) > 0
    dst[m] = dst[m] * (1 - alpha) + ov[m] * alpha


def chip(txt, size=34, fg=HEX["navy"], bg=HEX["mint"], weight="bold", padx=None, pady=None, bga=1.0):
    """Etiqueta redondeada con texto."""
    padx = int(size * 0.7) if padx is None else padx
    pady = int(size * 0.38) if pady is None else pady
    f = font(weight, size)
    tw = int(f.getlength(txt))
    asc, desc = f.getmetrics()
    w, h = tw + 2 * padx, asc + desc + 2 * pady - int(size * 0.15)
    im, d = canvas(w, h)
    d.rounded_rectangle((0, 0, w * SS - 1, h * SS - 1), radius=h * SS // 2, fill=rgba(bg, bga))
    d.text((padx * SS, (pady - size * 0.1) * SS), txt, font=font(weight, size * SS), fill=rgba(fg))
    return pil_sprite(im)


chip = lru_cache(256)(chip)


# ---------------------------------------------------------------- iconos y objetos
@lru_cache(32)
def coin(r, symbol="€"):
    s = 2 * r + 4
    im, d = canvas(s, s)
    k = SS
    c = (s * k) / 2
    d.ellipse((c - r * k, c - r * k, c + r * k, c + r * k), fill=rgba("#C98A2E"))
    d.ellipse((c - r * k * .9, c - r * k * .9, c + r * k * .9, c + r * k * .9), fill=rgba(HEX["amber"]))
    d.ellipse((c - r * k * .72, c - r * k * .72, c + r * k * .72, c + r * k * .72), outline=rgba("#E59A2F"),
              width=int(r * k * .07))
    f = font("black", int(r * 1.1 * k))
    tw = f.getlength(symbol)
    d.text((c - tw / 2, c - r * 1.1 * k * .62), symbol, font=f, fill=rgba("#B9761F"))
    return pil_sprite(im)


@lru_cache(64)
def icon(name, s, color=HEX["white"], accent=HEX["mint"]):
    """Iconos vectoriales simples en un espacio de 100x100."""
    im, d = canvas(s, s)
    k = s * SS / 100

    def P(*pts):
        return [(x * k, y * k) for x, y in zip(pts[::2], pts[1::2])]

    lw = int(6 * k)
    col, acc = rgba(color), rgba(accent)
    if name == "cup":
        d.rounded_rectangle(P(18, 40, 70, 88), radius=int(10 * k), fill=col)
        d.ellipse(P(62, 48, 88, 74), outline=col, width=lw)
        for i, x in enumerate((30, 44, 58)):
            d.arc(P(x - 6, 8 + i % 2 * 4, x + 6, 34), 100, 260, fill=acc, width=int(4 * k))
        d.rounded_rectangle(P(10, 88, 80, 94), radius=int(3 * k), fill=col)
    elif name == "truck":
        d.rounded_rectangle(P(4, 30, 62, 74), radius=int(5 * k), fill=col)
        d.polygon(P(64, 42, 84, 42, 96, 58, 96, 74, 64, 74), fill=col)
        d.polygon(P(70, 47, 82, 47, 89, 58, 70, 58), fill=rgba(HEX["navy"]))
        for x in (22, 78):
            d.ellipse(P(x - 11, 64, x + 11, 86), fill=rgba(HEX["navy"]))
            d.ellipse(P(x - 6, 69, x + 6, 81), fill=acc)
    elif name == "fuel":
        d.rounded_rectangle(P(14, 12, 60, 92), radius=int(6 * k), fill=col)
        d.rounded_rectangle(P(22, 22, 52, 44), radius=int(3 * k), fill=rgba(HEX["navy"]))
        d.line(P(60, 30, 78, 40, 78, 76, 86, 76, 86, 46), fill=col, width=lw)
        d.polygon(P(37, 54, 46, 68, 37, 80, 28, 68), fill=acc)
    elif name == "fork":
        d.rounded_rectangle(P(26, 46, 34, 94), radius=int(4 * k), fill=col)
        for x in (18, 30, 42):
            d.rounded_rectangle(P(x - 3, 8, x + 3, 40), radius=int(3 * k), fill=col)
        d.rounded_rectangle(P(15, 34, 45, 50), radius=int(7 * k), fill=col)
        d.chord(P(56, 6, 86, 70), 270, 90, fill=col)
        d.rounded_rectangle(P(66, 40, 76, 94), radius=int(4 * k), fill=col)
    elif name == "piggy":
        d.ellipse(P(10, 26, 84, 82), fill=col)
        d.polygon(P(26, 34, 32, 12, 46, 30), fill=col)
        d.rounded_rectangle(P(80, 44, 96, 62), radius=int(6 * k), fill=col)
        for x in (24, 62):
            d.rounded_rectangle(P(x, 74, x + 12, 94), radius=int(4 * k), fill=col)
        d.rounded_rectangle(P(36, 30, 60, 35), radius=int(2 * k), fill=rgba(HEX["navy"]))
        d.ellipse(P(66, 44, 72, 50), fill=rgba(HEX["navy"]))
    elif name == "phone":
        d.rounded_rectangle(P(22, 2, 78, 98), radius=int(12 * k), fill=col)
        d.rounded_rectangle(P(27, 9, 73, 91), radius=int(8 * k), fill=rgba(HEX["navy"]))
    elif name == "book":
        d.polygon(P(6, 22, 48, 30, 48, 90, 6, 82), fill=col)
        d.polygon(P(94, 22, 52, 30, 52, 90, 94, 82), fill=col)
        d.line(P(14, 40, 40, 45), fill=acc, width=int(4 * k))
        d.line(P(60, 45, 86, 40), fill=acc, width=int(4 * k))
    elif name == "q":
        d.ellipse(P(4, 4, 96, 96), outline=acc, width=lw)
        f = font("black", int(64 * k))
        tw = f.getlength("?")
        d.text((50 * k - tw / 2, 12 * k), "?", font=f, fill=col)
    elif name == "arrow_up":
        d.polygon(P(50, 6, 90, 50, 64, 50, 64, 94, 36, 94, 36, 50, 10, 50), fill=col)
    elif name == "arrow_down":
        d.polygon(P(50, 94, 90, 50, 64, 50, 64, 6, 36, 6, 36, 50, 10, 50), fill=col)
    elif name == "heart":
        d.ellipse(P(6, 12, 52, 56), fill=col)
        d.ellipse(P(48, 12, 94, 56), fill=col)
        d.polygon(P(9, 42, 50, 92, 91, 42), fill=col)
    return pil_sprite(im)


@lru_cache(16)
def crate(w, h, fruit=HEX["amber"], fruit2=None, seed=0):
    """Caja de fruta vista de frente con piezas encima."""
    im, d = canvas(w, h)
    k = SS
    rng = np.random.default_rng(seed)
    fr = int(w * 0.12)
    top = h * 0.38
    cols = [fruit] if fruit2 is None else [fruit, fruit2]
    for row in range(2):
        n = 5 - row
        for i in range(n):
            cx = w * (0.14 + i * 0.18 + row * 0.09) + rng.uniform(-4, 4)
            cy = top - row * fr * 1.1 + rng.uniform(-3, 3)
            c = cols[(i + row) % len(cols)]
            d.ellipse(((cx - fr) * k, (cy - fr) * k, (cx + fr) * k, (cy + fr) * k), fill=rgba(c))
            d.ellipse(((cx - fr * .5) * k, (cy - fr * .7) * k, (cx - fr * .1) * k, (cy - fr * .3) * k),
                      fill=rgba("#FFFFFF", .35))
    d.rounded_rectangle((0, top * k, w * k - 1, h * k - 1), radius=int(10 * k), fill=rgba("#8A6A45"))
    for i in range(3):
        y = top + (h - top) * (0.18 + i * 0.3)
        d.rectangle((6 * k, y * k, (w - 6) * k, (y + (h - top) * 0.16) * k), fill=rgba("#A9845A"))
    return pil_sprite(im)


# ---------------------------------------------------------------- personajes (NPC)
ROLES = ("camarero", "frutero", "cocinero", "obrero", "maestro_obra", "maestra")


@lru_cache(16)
def npc(role, h):
    """NPC en silueta estilo videojuego, sin rasgos faciales, con luz de borde menta y accesorios."""
    bw, bh = 300, 640
    s = h / bh
    w = int(bw * s) + 8
    k = SS * s
    sil = Image.new("L", (w * SS, int(h * SS) + 8 * SS), 0)
    ds = ImageDraw.Draw(sil)

    def P(*pts):
        return [(x * k + 4 * SS, y * k) for x, y in zip(pts[::2], pts[1::2])]

    fem = role == "maestra"
    # cabeza, cuello, torso, brazos, piernas
    ds.ellipse(P(95, 40, 205, 160), fill=255)
    if fem:
        ds.ellipse(P(86, 30, 214, 150), fill=255)
        ds.rounded_rectangle(P(84, 90, 216, 210), radius=int(40 * k), fill=255)
    ds.rounded_rectangle(P(130, 140, 170, 190), radius=int(10 * k), fill=255)
    ds.rounded_rectangle(P(62, 178, 238, 440), radius=int(52 * k), fill=255)
    ds.rounded_rectangle(P(30, 190, 82, 420), radius=int(26 * k), fill=255)
    ds.rounded_rectangle(P(218, 190, 270, 420), radius=int(26 * k), fill=255)
    if fem:
        ds.polygon(P(74, 380, 226, 380, 246, 520, 54, 520), fill=255)
        ds.rounded_rectangle(P(98, 500, 140, 630), radius=int(18 * k), fill=255)
        ds.rounded_rectangle(P(160, 500, 202, 630), radius=int(18 * k), fill=255)
    else:
        ds.rounded_rectangle(P(84, 400, 146, 630), radius=int(24 * k), fill=255)
        ds.rounded_rectangle(P(154, 400, 216, 630), radius=int(24 * k), fill=255)
    m = np.asarray(sil, np.float32) / 255
    # cuerpo con degradado vertical + luz de borde menta (lado derecho) y fría (izquierdo)
    hh, ww = m.shape
    grad = np.linspace(0, 1, hh, dtype=np.float32)[:, None]
    body = np.array(hex_bgr("#2A4B78"), np.float32) * (1 - grad[..., None] * .45) + \
        np.array(hex_bgr("#152A47"), np.float32) * (grad[..., None] * .45)
    body = np.broadcast_to(body, (hh, ww, 3)).copy()
    sh = int(10 * SS * s * 1.6)
    rim_r = np.clip(m - np.roll(m, -sh, axis=1), 0, 1)
    rim_l = np.clip(m - np.roll(m, sh // 2, axis=1), 0, 1)
    body = body * (1 - rim_r[..., None]) + np.array(MINT, np.float32) * rim_r[..., None]
    body = body * (1 - rim_l[..., None] * .5) + np.array(hex_bgr("#6F8FB8"), np.float32) * (rim_l[..., None] * .5)
    # accesorios
    acc = Image.new("RGBA", (ww, hh), (0, 0, 0, 0))
    da = ImageDraw.Draw(acc)
    white, amber, mint, navy = rgba("#F2F5F9"), rgba(HEX["amber"]), rgba(HEX["mint"]), rgba(HEX["navy"])
    if role in ("camarero", "frutero", "cocinero"):
        da.rounded_rectangle(P(88, 290, 212, 470), radius=int(16 * k), fill=white if role != "frutero" else rgba("#3FAF7F"))
        da.line(P(88, 300, 140, 250), fill=white if role != "frutero" else rgba("#3FAF7F"), width=int(8 * k))
        da.line(P(212, 300, 160, 250), fill=white if role != "frutero" else rgba("#3FAF7F"), width=int(8 * k))
    if role == "camarero":
        da.polygon(P(132, 182, 150, 196, 168, 182, 168, 208, 150, 196, 132, 208), fill=navy)  # pajarita
        da.rounded_rectangle(P(222, 168, 300, 180), radius=int(5 * k), fill=white)  # bandeja
        da.rounded_rectangle(P(240, 132, 272, 168), radius=int(6 * k), fill=white)  # taza
    if role == "frutero":
        da.chord(P(88, 28, 212, 120), 180, 360, fill=rgba("#3FAF7F"))
        da.rounded_rectangle(P(150, 66, 240, 82), radius=int(8 * k), fill=rgba("#3FAF7F"))
    if role == "cocinero":
        da.rounded_rectangle(P(100, 30, 200, 70), radius=int(10 * k), fill=white)
        for x in (100, 135, 165):
            da.ellipse(P(x - 4, -20, x + 44, 50), fill=white)
        for y in (220, 260):
            da.ellipse(P(144, y, 156, y + 12), fill=navy)
    if role in ("obrero", "maestro_obra"):
        hc = amber if role == "obrero" else white
        da.chord(P(86, 22, 214, 140), 180, 360, fill=hc)
        da.rounded_rectangle(P(78, 74, 222, 90), radius=int(8 * k), fill=hc)
        da.rounded_rectangle(P(70, 190, 230, 420), radius=int(44 * k), fill=rgba(HEX["amber"], .92) if role == "obrero" else rgba("#3A5F8F"))
        for y in (280, 340):
            da.rectangle(P(70, y, 230, y + 14), fill=rgba("#F2F5F9", .9))
        if role == "maestro_obra":
            da.rounded_rectangle(P(-6, 250, 64, 340), radius=int(6 * k), fill=white)
            da.rectangle(P(14, 242, 44, 256), fill=mint)
    if role == "maestra":
        da.rounded_rectangle(P(-10, 250, 74, 330), radius=int(6 * k), fill=rgba(HEX["mint"]))
        da.rectangle(P(28, 250, 34, 330), fill=rgba("#1F9C73"))
        da.line(P(240, 300, 300, 150), fill=white, width=int(6 * k))
    aa = np.asarray(acc, np.float32) / 255
    a_acc = aa[..., 3:4]
    body = body * (1 - a_acc) + aa[..., 2::-1] * a_acc
    alpha = np.maximum(m, aa[..., 3])
    nw, nh = ww // SS, hh // SS
    return (cv2.resize(np.ascontiguousarray(body), (nw, nh), interpolation=cv2.INTER_AREA),
            cv2.resize(alpha, (nw, nh), interpolation=cv2.INTER_AREA))


# ---------------------------------------------------------------- fondos
def _gradient(w, h, top, bottom):
    g = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    img = np.array(top, np.float32) * (1 - g) + np.array(bottom, np.float32) * g
    return np.broadcast_to(img, (h, w, 3)).copy()


def _bokeh(img, rng, n, colors, rmin, rmax, a=(0.05, 0.22)):
    h, w = img.shape[:2]
    for _ in range(n):
        r = int(rng.uniform(rmin, rmax))
        cx, cy = rng.uniform(0, w), rng.uniform(0, h)
        c = colors[rng.integers(len(colors))]
        ov = np.zeros_like(img)
        cv2.circle(ov, (int(cx), int(cy)), r, c, -1, cv2.LINE_AA)
        img += ov * rng.uniform(*a)


def scenery(kind, seed=1, margin=1.2):
    """Fondo procedimental "de cine" (desenfocado, azul marino, bajo contraste) cuando no hay foto.
    Devuelve un lienzo más grande que el fotograma (margin) para mover la cámara."""
    bw, bh = int(W * margin), int(H * margin)
    rng = np.random.default_rng(seed)
    warm, cool = hex_bgr("#3A3550"), hex_bgr("#10284A")
    base = _gradient(bw, bh, hex_bgr("#13305A"), hex_bgr("#081629"))
    props = np.zeros_like(base)

    def R(x0, y0, x1, y1, c, a=1.0):
        ov = np.zeros_like(props)
        cv2.rectangle(ov, (int(x0 * bw), int(y0 * bh)), (int(x1 * bw), int(y1 * bh)), c, -1)
        m = ov.max(2) > 0
        props[m] = props[m] * (1 - a) + ov[m] * a

    def C(x, y, r, c, a=1.0):
        ov = np.zeros_like(props)
        cv2.circle(ov, (int(x * bw), int(y * bh)), int(r * bw), c, -1, cv2.LINE_AA)
        m = ov.max(2) > 0
        props[m] = props[m] * (1 - a) + ov[m] * a

    lamp = [AMBER, hex_bgr("#FFD9A0")]
    if kind == "cafeteria":
        base = _gradient(bw, bh, hex_bgr("#2A2F4F"), hex_bgr("#0A1830"))
        for y in (0.30, 0.42):
            R(0.05, y, 0.95, y + 0.012, hex_bgr("#6B5A4A"))
            for i in range(9):
                x = 0.08 + i * 0.1
                R(x, y - 0.05, x + 0.05, y, hex_bgr("#C7B9A6") if i % 2 else hex_bgr("#7F6A58"), 0.8)
        R(0.0, 0.66, 1.0, 1.0, hex_bgr("#3B2C25"))
        R(0.0, 0.64, 1.0, 0.67, hex_bgr("#8C6B4E"))
        for x in (0.2, 0.5, 0.8):
            R(x - 0.002, 0.0, x + 0.002, 0.12, hex_bgr("#555555"))
            C(x, 0.13, 0.05, lamp[0], 0.9)
        _bokeh(props, rng, 40, lamp + [WHITE], 10, 60)
    elif kind == "fruteria":
        base = _gradient(bw, bh, hex_bgr("#1E3A4A"), hex_bgr("#0A1A2C"))
        R(0.0, 0.0, 1.0, 0.08, hex_bgr("#2E8F6E"))
        for i in range(8):
            R(i * 0.125, 0.08, i * 0.125 + 0.0625, 0.13, hex_bgr("#E8E2D0"), 0.7)
        for row, y in enumerate((0.45, 0.6, 0.75)):
            for i in range(5):
                x = 0.02 + i * 0.2
                R(x, y, x + 0.18, y + 0.1, hex_bgr("#7A5B3E"))
                for j in range(6):
                    C(x + 0.02 + j * 0.028, y - 0.004, 0.018,
                      [AMBER, hex_bgr("#7FD36B"), hex_bgr("#E0A33A"), hex_bgr("#F2D14B")][(i + row + j) % 4], 0.9)
        _bokeh(props, rng, 30, lamp + [MINT], 10, 50)
    elif kind == "restaurante":
        base = _gradient(bw, bh, hex_bgr("#24284A"), hex_bgr("#0A1428"))
        for x in (0.15, 0.4, 0.65, 0.9):
            R(x - 0.002, 0.0, x + 0.002, 0.2, hex_bgr("#444444"))
            C(x, 0.21, 0.04, lamp[0], 0.95)
        for x in (0.1, 0.55):
            R(x, 0.62, x + 0.35, 0.64, hex_bgr("#D9D2C5"))
            R(x + 0.03, 0.64, x + 0.05, 0.85, hex_bgr("#3A2E2A"))
            R(x + 0.3, 0.64, x + 0.32, 0.85, hex_bgr("#3A2E2A"))
            for j in range(3):
                C(x + 0.08 + j * 0.1, 0.6, 0.015, WHITE, 0.6)
        _bokeh(props, rng, 45, lamp + [WHITE], 8, 70)
    elif kind == "obra":
        base = _gradient(bw, bh, hex_bgr("#2C4A72"), hex_bgr("#0C1C34"))
        for i in range(6):
            for j in range(10):
                R(0.1 + i * 0.13, 0.25 + j * 0.06, 0.1 + i * 0.13 + 0.006, 0.25 + j * 0.06 + 0.06, hex_bgr("#8FA3BD"), .6)
            R(0.1, 0.25 + i * 0.12, 0.8, 0.25 + i * 0.12 + 0.005, hex_bgr("#8FA3BD"), .6)
        R(0.84, 0.05, 0.86, 0.9, hex_bgr("#C99A3E"))
        R(0.3, 0.05, 0.95, 0.065, hex_bgr("#C99A3E"))
        R(0.0, 0.88, 1.0, 1.0, hex_bgr("#3E3A36"))
        _bokeh(props, rng, 20, [AMBER, WHITE], 10, 40)
    elif kind == "aula":
        base = _gradient(bw, bh, hex_bgr("#1E3B52"), hex_bgr("#0A182C"))
        R(0.08, 0.18, 0.92, 0.42, hex_bgr("#21483D"))
        R(0.07, 0.17, 0.93, 0.18, hex_bgr("#9C7B55"))
        R(0.07, 0.42, 0.93, 0.435, hex_bgr("#9C7B55"))
        for i in range(5):
            R(0.12 + i * 0.14, 0.26, 0.12 + i * 0.14 + 0.09, 0.265, WHITE, .35)
        for row in range(3):
            for i in range(3):
                x = 0.08 + i * 0.32
                y = 0.6 + row * 0.13
                R(x, y, x + 0.22, y + 0.02, hex_bgr("#B08A5C"))
                R(x + 0.02, y + 0.02, x + 0.035, y + 0.09, hex_bgr("#555555"))
        _bokeh(props, rng, 25, [WHITE, hex_bgr("#FFE3B0")], 10, 50)
    elif kind == "ciudad":
        base = _gradient(bw, bh, hex_bgr("#1B3866"), hex_bgr("#07152A"))
        x = 0.0
        while x < 1.0:
            bwid = rng.uniform(0.07, 0.16)
            top = rng.uniform(0.25, 0.55)
            R(x, top, x + bwid - 0.01, 1.0, hex_bgr("#0E2140"))
            for wy in np.arange(top + 0.02, 1.0, 0.025):
                for wx in np.arange(x + 0.012, x + bwid - 0.02, 0.022):
                    if rng.random() < 0.35:
                        R(wx, wy, wx + 0.01, wy + 0.01, lamp[rng.integers(2)], rng.uniform(.4, .9))
            x += bwid
        _bokeh(props, rng, 40, lamp + [MINT, WHITE], 8, 60)
    else:  # "juego": suelo de rejilla en perspectiva + bokeh
        base = _gradient(bw, bh, hex_bgr("#0E2547"), hex_bgr("#050E1E"))
        hz = 0.52
        for i in range(-14, 15):
            ov = np.zeros_like(props)
            cv2.line(ov, (int(bw / 2 + i * bw * 0.02), int(hz * bh)), (int(bw / 2 + i * bw * 0.22), bh), MINT, 3,
                     cv2.LINE_AA)
            props += ov * 0.5
        for j in range(1, 16):
            y = hz + (1 - hz) * (j / 16) ** 1.9
            ov = np.zeros_like(props)
            cv2.line(ov, (0, int(y * bh)), (bw, int(y * bh)), MINT, 3, cv2.LINE_AA)
            props += ov * 0.45
        _bokeh(props, rng, 50, [MINT, AMBER, WHITE], 6, 50)
    img = base + props
    img = cv2.GaussianBlur(img, (0, 0), 7 if kind != "juego" else 2.5)  # profundidad de campo
    return grade(img)


def grade(img, tint=0.32, contrast=0.72):
    """Tono azul marino y contraste bajo para que los datos se lean."""
    m = img.mean()
    img = (img - m) * contrast + m
    img = img * (1 - tint) + np.array(NAVY, np.float32) * tint
    return np.clip(img * 0.85, 0, 1).astype(np.float32)


def photo(path, margin=1.2, blur=5.0):
    """Foto de fondo: encaje 9:16 por altura (con margen para cámara), desenfoque y tono de marca."""
    im = cv2.imread(path, cv2.IMREAD_COLOR)
    if im is None:
        return None
    bw, bh = int(W * margin), int(H * margin)
    h, w = im.shape[:2]
    s = max(bh / h, bw / w)
    im = cv2.resize(im, (int(w * s) + 1, int(h * s) + 1), interpolation=cv2.INTER_AREA)
    y0, x0 = (im.shape[0] - bh) // 2, (im.shape[1] - bw) // 2
    im = im[y0:y0 + bh, x0:x0 + bw].astype(np.float32) / 255
    im = cv2.GaussianBlur(im, (0, 0), blur)
    return grade(im, tint=0.42, contrast=0.6)


def camera(bg, t, d, z0=1.0, z1=1.07, pan=(0, 0)):
    """Encuadre con zoom/pan suave de un fondo de tamaño margin*W x margin*H."""
    bh, bw = bg.shape[:2]
    x = eio(clamp(t / d)) if d > 0 else 0
    s = lerp(z0, z1, x)
    px, py = pan[0] * (x - .5) * 2, pan[1] * (x - .5) * 2
    M = np.float32([[s, 0, W / 2 - s * (bw / 2 + px)], [0, s, H / 2 - s * (bh / 2 + py)]])
    return cv2.warpAffine(bg, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
