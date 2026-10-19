"""Reel «¿Cuánto cuesta realmente un café?» (kiria.ai, episodio 01).

Fotos de Dreamina animadas (paralaje 2,5D, ondas, viento, niebla, partículas), el clip del puerto y planos
creados aquí (globo, bolsa, tostador, ticket, torre de monedas, taza cenital, cierre).

    python3 projects/cafe/prep_cafe.py            # una vez: placas, profundidad, grano y clip del puerto
    python3 projects/cafe/render_cafe.py --preview # hoja de contactos en out/preview.jpg
    python3 projects/cafe/render_cafe.py           # out/cafe.mp4
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

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "..", ".."))
sys.path.insert(0, AQUI)
from engine.fin_draw import W, H, FPS, HEX, text, paste, halo, glass, hex_bgr, AMBER  # noqa: E402
from engine.post import zoom_blur, vignette, grain, brand  # noqa: E402
from engine.geo import Globe, render_globe, draw_arc  # noqa: E402
from engine.subs import Subs  # noqa: E402
import fx  # noqa: E402
from fx import ease, eout, lerp, camara  # noqa: E402

OUT = os.path.join(AQUI, "out")
PLACAS = os.path.join(AQUI, "assets", "placas")
VOZ = os.path.join(AQUI, "assets", "voz_original.mp3")
OFF = 59.45          # segunda lectura del guion: segundo del audio original que cae en t = 0
DUR = 60.0
NF = int(DUR * FPS)

GREEN = (0.42, 0.88, 0.30)
RED = (0.30, 0.28, 0.95)
GOLD = (0.30, 0.70, 0.98)

# ------------------------------------------------------------------ voz → subtítulos
LINEAS = ["Seis céntimos.", "Es lo que gana quien cultivó el café que te estás tomando.", "Todo empieza aquí.",
          "En una montaña de Colombia,", "a 2.000 metros.", "Recogido a mano…", "grano a grano.",
          "Un exportador lo compra,", "lo mete en un contenedor", "y cruza el Atlántico.",
          "5 céntimos más que se quedan por el camino.", "Pero su precio ya se ha decidido mucho antes.",
          "En la bolsa de Nueva York.", "Donde gente que nunca ha visto una planta de café",
          "apuesta por lo que valdrá mañana.", "Después llega el tostador.", "Le da el aroma, la marca…",
          "y se queda 20 céntimos.", "Y casi todo lo demás se queda aquí.", "Sueldos, alquiler, leche, luz…",
          "Y Hacienda:", "27 céntimos de IVA.", "3 euros.", "6 céntimos…", "para quien hizo la parte más difícil.",
          "La próxima vez que lo pidas…", "ya sabes lo que estás pagando de verdad.", "¿Qué investigo después?",
          "Te leo en comentarios."]


def tiempos():
    fr = [f for f in json.load(open(os.path.join(AQUI, "frases.json"))) if f["s"] >= OFF]
    assert len(fr) == len(LINEAS), (len(fr), len(LINEAS))
    out = []
    for f, txt in zip(fr, LINEAS):
        s, e = f["s"] - OFF, f["e"] - OFF
        ws = txt.split()
        wt = np.array([len(w) + 2 for w in ws], float)
        edges = s + (e - s) * np.concatenate([[0], np.cumsum(wt) / wt.sum()])
        out.append(dict(text=txt, start=s, end=e,
                        words=[dict(w=w, start=float(edges[i]), end=float(edges[i + 1])) for i, w in enumerate(ws)]))
    return out


TL = tiempos()
T = [ln["start"] for ln in TL]  # T[i]: inicio de la frase i (0..28)
SUBS = Subs(TL, y=1240, size=74, max_words=4, max_chars=22)
SIN_SUBS = {0, 27, 28}


# ------------------------------------------------------------------ rótulos
def cifra(img, t, t0, t1, rol=None, valor=None, y=430, color=HEX["amber"], debajo=None, size=150):
    if t < t0 or t > t1:
        return
    a = min(1.0, (t - t0) / 0.15, (t1 - t) / 0.2)
    x = eout((t - t0) / 0.45)
    oscurecer(img, y - (size * 0.3 if rol else 0), size * 1.25, 0.55 * a)
    if valor:
        halo(img, W // 2, y, 260, AMBER if color == HEX["amber"] else (0.8, 0.8, 0.8), 0.18 * a)
        paste(img, text(valor, size, "black", color), W // 2, y, a, scale=1.3 - 0.3 * x)
    if rol:
        paste(img, text(rol, 38, "semi", HEX["white"], tracking=0.28), W // 2, y - size * 0.62 - 10, a * x)
    if debajo:
        paste(img, text(debajo, 40, "med", HEX["white"]), W // 2, y + size * 0.62 + 6, a * x)


def oscurecer(img, y, s, a):
    """Banda oscura suave detrás de los rótulos para que se lean sobre cielos y luces."""
    yy = np.arange(H, dtype=np.float32)
    img *= (1 - a * np.exp(-((yy - y) / s) ** 2))[:, None, None]


def pantalla(name, fx_, fy_, z, px, py):
    img, dep = fx.placa(name)
    ph, pw = dep.shape
    return (px - fx_) * pw * z + W / 2, (py - fy_) * ph * z + H / 2


# ------------------------------------------------------------------ 1-3: el gancho (fotos de la moneda)
GOTAS = fx.Particulas(70, 4, vel=((-320, 320), (-900, -250)), r=(2, 8), grav=1500, color=(0.35, 0.68, 1.0),
                      a=1.0, blur=1.0, life=1.7, origin=(0, 0))
BOKEH = fx.Particulas(26, 8, vel=((-10, 10), (-30, -8)), r=(8, 20), color=(0.3, 0.62, 1.0), a=0.25, blur=6)
POLVO = fx.Particulas(90, 2, vel=((-12, 18), (-22, 6)), r=(1.5, 5), color=(0.45, 0.75, 1.0), a=0.5, blur=1.6)
BRASAS = fx.Particulas(110, 12, vel=((-30, 30), (-260, -90)), r=(1.5, 4.5), color=(0.15, 0.5, 1.0), a=0.9, blur=1.2)


def s_gancho(tl, D, t):
    x = eout(tl / D)
    name = "moneda3"
    img, dep = fx.placa(name)
    ph, pw = dep.shape
    fx_, fy_, z = lerp(0.60, 0.645, x), lerp(0.43, 0.36, x), lerp(0.94, 1.1, x)
    warp = fx.ondas(0.63 * pw, 0.60 * ph, t, amp=4.5, y_min=0.5 * ph)
    f, _ = camara(name, fx_, fy_, z, par=(lerp(-90, 90, tl / D), 30), dz=0.14, warp=warp)
    sx, sy = pantalla(name, fx_, fy_, z, 0.63, 0.55)
    GOTAS.draw(f, tl, dx=sx, dy=sy)
    cx, cy = pantalla(name, fx_, fy_, z, 0.665, 0.20)
    pulse = np.exp(-((tl - 0.42) / 0.12) ** 2)
    fx.destello(f, cx + 40, cy - 30, 70, (0.55, 0.85, 1.0), 0.15 + 0.9 * pulse)
    if tl < 0.08:
        f *= 0.0
    cifra(f, t, T[0], 1.95, None, "0,06 €", y=470, size=190, debajo="de un café de 3 €")
    return f


def s_grano(tl, D, t):
    x = ease(tl / D)
    name = "moneda2"
    img, dep = fx.placa(name)
    ph, pw = dep.shape
    fx_, fy_, z = lerp(0.30, 0.43, x), lerp(0.52, 0.47, x), lerp(1.04, 1.12, x)
    warp = fx.ondas(0.31 * pw, 0.76 * ph, t, amp=2.5, k=0.05, y_min=0.6 * ph)
    f, _ = camara(name, fx_, fy_, z, par=(lerp(140, -140, x), 0), dz=0.16, warp=warp)
    BOKEH.draw(f, t)
    return f


def s_moneda(tl, D, t):
    x = ease(tl / D)
    name = "moneda1"
    img, dep = fx.placa(name)
    ph, pw = dep.shape
    fx_, fy_, z = lerp(0.63, 0.52, x), lerp(0.28, 0.44, x), lerp(1.32, 1.0, x)
    warp = fx.ondas(0.60 * pw, 0.56 * ph, t, amp=3.5, y_min=0.48 * ph)
    f, _ = camara(name, fx_, fy_, z, par=(0, lerp(-70, 70, x)), dz=0.1, warp=warp, rot=lerp(-0.02, 0.01, x))
    BOKEH.draw(f, t + 3)
    cifra(f, t, 3.55, 5.32, "TU CAFÉ", "3,00 €", color=HEX["white"])
    return f


# ------------------------------------------------------------------ 4-6: Colombia (foto del agricultor)
def s_montana(tl, D, t):
    x = ease(tl / D)
    name = "agricultor"
    fx_, fy_, z = lerp(0.17, 0.37, x), lerp(0.24, 0.33, x), lerp(1.0, 1.06, x)
    f, _ = camara(name, fx_, fy_, z, par=(lerp(170, -170, x), 0), dz=0.1, warp=fx.viento(t, 2.5))
    fx.niebla(f, t, color=(0.82, 0.9, 1.0), a=0.38, speed=(55, -6), y0=0.0, y1=0.6, seed=3)
    sx, sy = pantalla(name, fx_, fy_, z, 0.199, 0.068)
    f *= 0.86
    fx.destello(f, sx, sy, 200, (0.5, 0.8, 1.0), 0.16 + 0.04 * np.sin(t * 3))
    POLVO.draw(f, t)
    a = min(1, max(0, (t - T[3] - 0.1) / 0.4))
    if a > 0:
        oscurecer(f, 700, 110, 0.4 * a)
        paste(f, text("COLOMBIA", 92, "semi", HEX["white"], tracking=0.3), W // 2, 700, a, scale=1 + 0.05 * tl / D)
    return f


def s_altura(tl, D, t):
    x = ease(tl / D)
    name = "agricultor"
    fx_, fy_, z = 0.30, lerp(0.62, 0.22, x), 1.16
    f, _ = camara(name, fx_, fy_, z, par=(0, lerp(-120, 120, x)), dz=0.08, warp=fx.viento(t, 3))
    fx.niebla(f, t * 3, color=(0.82, 0.9, 1.0), a=0.42, speed=(70, -10), y0=0.0, y1=0.7, seed=7)
    # altímetro
    k = eout((t - T[4]) / 0.9)
    m = int(round(2000 * k, -1)) if k > 0 else 0
    xr = 905
    for i in range(-8, 9):
        yy = 960 + i * 70 + (k * 900) % 70
        L = 34 if i % 2 == 0 else 18
        cv2.line(f, (xr - L, int(yy)), (xr, int(yy)), (0.85, 0.9, 0.95), 2, cv2.LINE_AA)
    cv2.line(f, (xr, 360), (xr, 1560), (0.85, 0.9, 0.95), 2, cv2.LINE_AA)
    a = min(1, tl / 0.25)
    paste(f, text("ALTITUD", 34, "semi", HEX["white"], tracking=0.3), xr - 50, 880, a, anchor="r")
    paste(f, text(f"{m:,}".replace(",", ".") + " m", 96, "black", HEX["amber"]), xr - 50, 960, a, anchor="r")
    return f


def s_manos(tl, D, t):
    x = ease(tl / D)
    name = "agricultor"
    fx_, fy_, z = lerp(0.53, 0.57, x), lerp(0.50, 0.46, x), lerp(1.2, 1.32, x)
    f, _ = camara(name, fx_, fy_, z, par=(lerp(-60, 60, x), lerp(25, -25, x)), dz=0.08,
                  warp=fx.viento(t, 3.5, near_max=0.55))
    fx.chispas_brillo(f, f.copy(), t, n=34, seed=5, thr=0.93, a=0.7)
    fx.destello(f, 40, 220, 300, (0.5, 0.8, 1.0), 0.22)
    POLVO.draw(f, t + 5)
    cifra(f, t, T[6], 13.3, "AGRICULTOR", "0,06 €")
    return f


# ------------------------------------------------------------------ 7-9: puerto y Atlántico
@lru_cache(12)
def puerto(i):
    p = os.path.join(PLACAS, "puerto", f"f_{max(1, min(i, 490)):04d}.jpg")
    return cv2.imread(p).astype(np.float32) / 255


def puerto_t(s, z, rot):
    f = puerto(int(s * 60) + 1)
    M = cv2.getRotationMatrix2D((W / 2, H / 2), rot, z)
    return cv2.warpAffine(f, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)


def s_puerto1(tl, D, t):
    x = tl / D
    f = puerto_t(0.1 + tl * 1.12, lerp(1.0, 1.07, x), lerp(0, 0.8, x))
    fx.destello(f, 980, 120, 380, (0.35, 0.7, 1.0), 0.18)
    fx.barrido(f, x, 0.08)
    cifra(f, t, T[7], 16.3, "EXPORTADOR", None, y=380)
    return f


def s_globo(tl, D, t):
    x = ease(tl / D)
    f = np.zeros((H, W, 3), np.float32)
    f[:] = (0.025, 0.018, 0.012)
    g = fx.Particulas(160, 21, vel=((0, 0), (0, 0)), r=(1, 2.6), color=(1, 1, 1), a=0.5, blur=0.6)
    g.draw(f, t)
    gl = Globe(lerp(-52, -36, x), lerp(18, 26, x), lerp(700, 800, x), W / 2, 960)
    render_globe(f, gl, "50m", highlight={"Colombia"}, hi_fill=hex_bgr("#4A3A1C"), hi_line=AMBER,
                 extra={("Spain",): (hex_bgr("#1E3B5C"), hex_bgr("#9FD3FF"))})
    a, b = (-75.5, 4.6), (-0.4, 39.5)
    p = ease((tl - 0.15) / 1.25)
    if p > 0:
        tip, pts = draw_arc(f, gl, a, b, p, AMBER, 0.12, 4, 12, particles=(t * 0.6) % 1)
        if tip is not None:
            halo(f, tip[0], tip[1], 26, AMBER, 0.9)
    for (lon, lat), nom in ((a, "COLOMBIA"), (b, "ESPAÑA")):
        px, py, zz = gl.project(lon, lat)
        if zz > 0:
            halo(f, px, py, 16, AMBER, 0.8)
            paste(f, text(nom, 34, "bold", HEX["white"], tracking=0.15), px, py + 46, min(1, tl / 0.3))
    paste(f, text("≈ 8.000 km", 70, "black", HEX["amber"]), W // 2, 360, min(1, max(0, (tl - 1.0) / 0.3)))
    return f


def s_puerto2(tl, D, t):
    x = tl / D
    s = 3.7 + 4.3 * (1 - (1 - x) ** 1.7)
    f = puerto_t(s, lerp(1.08, 1.0, eout(x)), lerp(-0.6, 0.3, x))
    if x < 0.25:
        f = fx.desenfoque_mov(f, 0, 50 * (1 - x / 0.25))
    fx.destello(f, 120, 160, 420, (0.35, 0.7, 1.0), 0.16)
    cifra(f, t, T[10], 20.9, "EXPORTACIÓN Y TRANSPORTE", "+0,05 €")
    return f


# ------------------------------------------------------------------ 10: la bolsa
@lru_cache(16)
def serie(seed, n=90):
    rng = np.random.default_rng(seed)
    o, h, l, c = [], [], [], []
    p = 100.0
    for i in range(n):
        op = p
        cl = op + rng.normal(0.25, 1.7)
        o.append(op); c.append(cl)
        h.append(max(op, cl) + abs(rng.normal(0, 0.9)))
        l.append(min(op, cl) - abs(rng.normal(0, 0.9)))
        p = cl
    return np.array(o), np.array(h), np.array(l), np.array(c)


def grafico(seed, nvis, w=1600, h=1000, fork=0.0, header=True, n=90):
    f = np.zeros((h, w, 3), np.float32)
    f[:] = (0.07, 0.045, 0.03)
    for i in range(1, 8):
        cv2.line(f, (0, i * h // 8), (w, i * h // 8), (0.2, 0.17, 0.1), 1)
    for i in range(1, 12):
        cv2.line(f, (i * w // 12, 0), (i * w // 12, h), (0.14, 0.12, 0.08), 1)
    o, hi, lo, c = serie(seed, n)
    span = n + (24 if fork else 0)
    cw = (w - 60) / span
    vmin, vmax = lo.min() - 4, hi.max() + 4
    if fork:
        vmin, vmax = vmin - 10, vmax + 10

    def Y(v):
        return int(h - 40 - (v - vmin) / (vmax - vmin) * (h - 140))
    k = int(min(nvis, n))
    for i in range(k):
        x = int(30 + i * cw + cw / 2)
        col = GREEN if c[i] >= o[i] else RED
        cv2.line(f, (x, Y(hi[i])), (x, Y(lo[i])), col, 2, cv2.LINE_AA)
        y0, y1 = sorted((Y(o[i]), Y(c[i])))
        cv2.rectangle(f, (int(x - cw * 0.32), y0), (int(x + cw * 0.32), max(y1, y0 + 2)), col, -1)
    if k > 0:
        yl = Y(c[k - 1])
        for xx in range(0, w, 28):
            cv2.line(f, (xx, yl), (xx + 14, yl), (0.25, 0.65, 0.95), 2)
    if fork and k >= n:
        x0, y0 = 30 + n * cw, Y(c[-1])
        cv2.line(f, (int(x0), 60), (int(x0), h - 20), (0.6, 0.6, 0.6), 1)
        for sgn, col in ((1, GREEN), (-1, RED)):
            m = int(24 * fork)
            pts = [(int(x0 + j * cw), Y(c[-1] + sgn * 1.05 * j + 1.4 * np.sin(j * 0.9 + sgn))) for j in range(m + 1)]
            for j in range(len(pts) - 1):
                if j % 2 == 0:
                    cv2.line(f, pts[j], pts[j + 1], col, 5, cv2.LINE_AA)
    if header:
        paste(f, text("CAFÉ ARÁBICA · FUTUROS", 44, "bold", HEX["white"], tracking=0.08, shadow=0), 40, 50, 0.9,
              anchor="l")
    return f


def plano3d(sw, sh, zc, yaw, cy=H / 2, f=1150.0, xoff=0.0, pitch=0.0):
    pts = []
    for X, Y in ((-sw / 2, -sh / 2), (sw / 2, -sh / 2), (sw / 2, sh / 2), (-sw / 2, sh / 2)):
        x1, z1 = X * np.cos(yaw), X * np.sin(yaw)
        y1, z2 = Y * np.cos(pitch), Y * np.sin(pitch)
        Z = zc + z1 + z2
        pts.append((W / 2 + f * (x1 + xoff) / Z, cy + f * y1 / Z))
    return np.float32(pts)


def proyectar(img, tex, quad, glow=0.6, refl=0.0):
    th, tw = tex.shape[:2]
    src = np.float32([(0, 0), (tw, 0), (tw, th), (0, th)])
    M = cv2.getPerspectiveTransform(src, quad)
    war = cv2.warpPerspective(tex, M, (W, H), flags=cv2.INTER_LINEAR)
    m = cv2.warpPerspective(np.ones((th, tw), np.float32), M, (W, H))[..., None]
    if glow:
        sm = cv2.resize(war, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        sm = cv2.GaussianBlur(sm, (0, 0), 14)
        img += cv2.resize(sm, (W, H)) * glow
    if refl:
        q2 = quad.copy()
        bottom = max(quad[2][1], quad[3][1])
        q2[:, 1] = 2 * bottom - quad[:, 1] + 12
        q2 = q2[[3, 2, 1, 0]]
        M2 = cv2.getPerspectiveTransform(src, q2)
        r = cv2.warpPerspective(tex[::-1].copy(), M2, (W, H))
        r = cv2.GaussianBlur(r, (0, 0), 5)
        img += r * refl
    img[:] = img * (1 - m) + war * m
    return img


@lru_cache(1)
def sala():
    """Fondo de sala de operaciones: luces de pantallas lejanas desenfocadas."""
    rng = np.random.default_rng(31)
    f = np.zeros((H, W, 3), np.float32)
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    f[:] = 0.02 + 0.03 * (1 - yy) * np.float32([1.0, 0.8, 0.5])
    for _ in range(60):
        x, y = rng.uniform(-100, W + 100), rng.uniform(150, 1100)
        w_, h_ = rng.uniform(60, 220), rng.uniform(40, 130)
        col = (0.55, 0.45, 0.15) if rng.random() < 0.6 else ((0.2, 0.25, 0.7) if rng.random() < 0.5 else (0.25, 0.6, 0.2))
        cv2.rectangle(f, (int(x), int(y)), (int(x + w_), int(y + h_)), tuple(c * rng.uniform(0.3, 0.8) for c in col), -1)
    return cv2.GaussianBlur(f, (0, 0), 22)


def s_bolsa1(tl, D, t):
    x = ease(tl / D)
    f = sala().copy()
    tex = grafico(11, 14 + 76 * ease(tl / (D * 0.9)))
    quad = plano3d(1600, 1000, lerp(2900, 1750, x), lerp(0.55, 0.22, x), cy=900, pitch=0.05)
    proyectar(f, tex, quad, glow=0.7, refl=0.18)
    fx.barrido(f, x, 0.06, (0.6, 0.85, 1.0))
    return f


def s_bolsa2(tl, D, t):
    x = ease(tl / D)
    f = sala().copy()
    cw_, ch_, g = 640, 420, 26
    wall = np.zeros((4 * ch_ + 3 * g, 3 * cw_ + 2 * g, 3), np.float32)
    for r in range(4):
        for c in range(3):
            s = 40 + r * 3 + c
            n = 30 + ((t * 18 + s * 7) % 60)
            wall[r * (ch_ + g):r * (ch_ + g) + ch_, c * (cw_ + g):c * (cw_ + g) + cw_] = \
                grafico(s, n, cw_, ch_, header=False, n=60)
    quad = plano3d(wall.shape[1], wall.shape[0], lerp(2400, 2050, x), lerp(-0.42, -0.28, x), cy=900,
                   xoff=lerp(150, -60, x))
    proyectar(f, wall, quad, glow=0.5, refl=0.12)
    a = min(1, max(0, (t - T[12] + 0.1) / 0.3))
    paste(f, text("NUEVA YORK", 128, "black", HEX["white"], tracking=0.12), W // 2, 820, a, scale=1 + 0.04 * x)
    paste(f, text("ICE · MERCADO DE FUTUROS", 38, "semi", HEX["amber"], tracking=0.25), W // 2, 920, a)
    # cinta de cotizaciones
    cinta = text("  CAFÉ ▲   CACAO ▼   AZÚCAR ▲   TRIGO ▼   PETRÓLEO ▲   ORO ▲   CAFÉ ▼   MAÍZ ▲  " * 2, 40, "mono",
                 HEX["white"], shadow=0)
    f[1478:1542] = f[1478:1542] * 0.3 + np.float32([0.05, 0.04, 0.02])
    paste(f, cinta, int(-((t * 260) % (cinta[1].shape[1] / 2))), 1510, 0.95, anchor="l")
    return f


@lru_cache(1)
def glifos():
    fnt = ImageFont.truetype(os.path.join(AQUI, "..", "..", "engine", "fonts", "DejaVuSansMono-Bold.ttf"), 21)
    out = []
    for ch in "0123456789":
        im = Image.new("L", (24, 24), 0)
        ImageDraw.Draw(im).text((5, 0), ch, font=fnt, fill=255)
        out.append(np.asarray(im, np.float32) / 255)
    return np.stack(out)


def s_digitos(tl, D, t):
    x = ease(tl / D)
    base, _ = camara("agricultor", lerp(0.55, 0.57, x), 0.48, lerp(1.08, 1.16, x), par=(lerp(-40, 40, x), 0), dz=0.06)
    cols, rows = W // 24, H // 24
    cell = cv2.resize(base, (cols, rows), interpolation=cv2.INTER_AREA)
    rng = np.random.default_rng(int(t * 12))
    idx = rng.integers(0, 10, (rows, cols))
    G = glifos()[idx]                                   # rows, cols, 24, 24
    mos = G.transpose(0, 2, 1, 3).reshape(rows * 24, cols * 24)
    colr = cv2.resize(np.clip(cell * 2.6 + 0.08, 0, 1), (W, H), interpolation=cv2.INTER_NEAREST)
    lum = cell.mean(axis=2)
    keep = cv2.resize((lum > 0.06).astype(np.float32), (W, H), interpolation=cv2.INTER_NEAREST)
    dig = mos[..., None] * colr * keep[..., None]
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    n = fx._ruido(9, W, H, 120)
    m = np.clip(((tl / D) * 1.9 - 0.25 - yy * 0.8 - n * 0.35) * 5, 0, 1)[..., None]
    f = base * (1 - m) + (dig + base * 0.08) * m
    return f


def s_apuesta(tl, D, t):
    x = ease(tl / D)
    f = sala().copy()
    tex = grafico(11, 90, fork=ease((tl - 0.2) / 1.4))
    quad = plano3d(1600, 1000, lerp(1900, 1650, x), lerp(-0.18, -0.05, x), cy=880, pitch=0.04)
    proyectar(f, tex, quad, glow=0.75, refl=0.15)
    a = min(1, max(0, (tl - 0.9) / 0.3))
    paste(f, text("MAÑANA ▲", 64, "black", "#6CE36B"), W // 2 + 220, 330, a)
    paste(f, text("MAÑANA ▼", 64, "black", "#F2504D"), W // 2 + 220, 1470, a)
    paste(f, text("¿?", 150, "black", HEX["white"]), 230, 900, a * (0.6 + 0.4 * np.sin(t * 8)))
    sh = 6 * np.sin(t * 37) * (1 - x)
    M = np.float32([[1, 0, sh], [0, 1, sh * 0.5]])
    return cv2.warpAffine(f, M, (W, H), borderMode=cv2.BORDER_REFLECT)


# ------------------------------------------------------------------ 11: el tostador
@lru_cache(1)
def grano_base():
    g = cv2.imread(os.path.join(PLACAS, "grano.png"), cv2.IMREAD_UNCHANGED).astype(np.float32) / 255
    return g


@lru_cache(512)
def grano_sp(size, ang):
    g = grano_base()
    s = size / g.shape[0]
    g = cv2.resize(g, (max(2, int(g.shape[1] * s)), max(2, int(g.shape[0] * s))), interpolation=cv2.INTER_AREA)
    d = int(np.hypot(*g.shape[:2])) + 2
    pad = np.zeros((d, d, 4), np.float32)
    y0, x0 = (d - g.shape[0]) // 2, (d - g.shape[1]) // 2
    pad[y0:y0 + g.shape[0], x0:x0 + g.shape[1]] = g
    M = cv2.getRotationMatrix2D((d / 2, d / 2), ang * 15, 1.0)
    r = cv2.warpAffine(pad, M, (d, d), flags=cv2.INTER_LINEAR)
    rgb = np.clip(r[..., :3] * np.float32([0.95, 1.05, 1.2]) * 1.15, 0, 1)
    return rgb, r[..., 3]


@lru_cache(1)
def granos():
    rng = np.random.default_rng(17)
    n = 170
    return dict(a=rng.uniform(0, 6.28, n), r=rng.uniform(80, 980, n), z=rng.uniform(0.35, 1.6, n),
                sp=rng.uniform(-4, 4, n), a0=rng.uniform(0, 24, n), x=rng.uniform(-150, W + 150, n),
                y=rng.uniform(0, H + 600, n), v=rng.uniform(600, 1300, n))


def fondo_tostador(t, glow=1.0):
    f = np.zeros((H, W, 3), np.float32)
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    f[:] = (0.012, 0.016, 0.022)
    fx.destello(f, W / 2, 260, 520, (0.15, 0.45, 1.0), 0.65 * glow)
    fx.humo(f, t, a=0.35, color=(0.28, 0.42, 0.6), seed=5, rise=110)
    f *= (0.8 + 0.2 * (1 - yy))[..., None]
    return f


def dibuja_granos(f, items):
    """items: [(x, y, tamaño, ángulo, z)] de lejos a cerca; los lejanos y los muy cercanos, desenfocados."""
    far = np.zeros_like(f)
    fa = np.zeros((H, W), np.float32)
    near = np.zeros_like(f)
    na = np.zeros((H, W), np.float32)
    for x, y, s, ang, z in items:
        sp = grano_sp(int(s), int(ang) % 24)
        if z < 0.75:
            paste_alpha(far, fa, sp, x, y)
        elif z > 1.35:
            paste_alpha(near, na, sp, x, y)
        else:
            if z < 1.0:
                f[:] = f  # capa media dibujada directamente
            paste(f, sp, x, y, 1.0)
            # luz de contra ámbar en el borde superior
    if fa.max() > 0:
        far = cv2.GaussianBlur(far, (0, 0), 4)
        fa = cv2.GaussianBlur(fa, (0, 0), 4)
        f[:] = f * (1 - fa[..., None] * 0.85) + far * 0.85
    if na.max() > 0:
        near = cv2.GaussianBlur(near, (0, 0), 11)
        na = cv2.GaussianBlur(na, (0, 0), 11)
        f[:] = f * (1 - na[..., None]) + near
    return f


def paste_alpha(rgb_acc, a_acc, sp, cx, cy):
    rgb, a = sp
    h, w = a.shape
    x, y = int(cx - w / 2), int(cy - h / 2)
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, W), min(y + h, H)
    if x0 >= x1 or y0 >= y1:
        return
    sa = a[y0 - y:y1 - y, x0 - x:x1 - x]
    src = rgb[y0 - y:y1 - y, x0 - x:x1 - x]
    rgb_acc[y0:y1, x0:x1] = rgb_acc[y0:y1, x0:x1] * (1 - sa[..., None]) + src * sa[..., None]
    a_acc[y0:y1, x0:x1] = a_acc[y0:y1, x0:x1] * (1 - sa) + sa


def bombo(t, zoom=1.0, w=1.15):
    g = granos()
    items = []
    for i in range(len(g["a"])):
        th = g["a"][i] + w * t
        z = g["z"][i]
        r = g["r"][i]
        x = W / 2 + np.cos(th) * r * zoom
        y = 1050 + np.sin(th) * r * 0.62 * zoom - 90 * np.sin(th * 2 + i) * 0.3
        items.append((x, y, 120 * z * zoom, g["a0"][i] + g["sp"][i] * t * 2, z))
    items.sort(key=lambda it: it[4])
    return items


def s_tostador1(tl, D, t):
    x = ease(tl / D)
    f = fondo_tostador(t)
    dibuja_granos(f, bombo(t, lerp(1.0, 1.12, x)))
    BRASAS.draw(f, t)
    return f


def s_tostador2(tl, D, t):
    f = fondo_tostador(t, 1.15)
    fx.humo(f, t * 1.3, a=0.45, color=(0.35, 0.5, 0.68), seed=6, rise=150)
    g = granos()
    items = []
    for i in range(len(g["a"])):
        z = g["z"][i]
        y = (g["y"][i] + g["v"][i] * z * tl) % (H + 600) - 300
        items.append((g["x"][i], y, 130 * z, g["a0"][i] + g["sp"][i] * tl * 3, z))
    items.sort(key=lambda it: it[4])
    dibuja_granos(f, items)
    BRASAS.draw(f, t + 2)
    a = min(1, max(0, (t - T[16] - 0.4) / 0.3))
    oscurecer(f, 640, 90, 0.5 * a)
    paste(f, text("AROMA · MARCA", 60, "black", HEX["white"], tracking=0.25), W // 2, 640, a * 0.9)
    return f


def s_tostador3(tl, D, t):
    x = ease(tl / D)
    f = fondo_tostador(t, 0.9)
    dibuja_granos(f, bombo(t, lerp(1.2, 1.28, x), w=0.6))
    BRASAS.draw(f, t + 4)
    cifra(f, t, T[17], 37.4, "TOSTADOR", "+0,20 €")
    return f


# ------------------------------------------------------------------ 12: el ticket de la cafetería
TICKET = [("CAFETERÍA", T[18] + 0.05, "c"), ("1 × café ........ 3,00 €", T[18] + 0.35, "l"), ("-" * 24, T[18] + 0.6, "l"),
          ("SUELDOS ........ 0,90 €", T[19] + 0.0, "l"), ("ALQUILER ....... 0,60 €", T[19] + 0.75, "l"),
          ("LECHE Y VASO ... 0,20 €", T[19] + 1.45, "l"), ("LUZ Y AGUA ..... 0,15 €", T[19] + 2.05, "l"),
          ("BENEFICIO ...... 0,57 €", T[19] + 2.6, "l"), ("IVA 10 % ....... 0,27 €", T[21] + 0.05, "l"),
          ("ORIGEN+TOSTADO . 0,31 €", T[21] + 0.9, "l"), ("-" * 24, T[21] + 1.3, "l"),
          ("TOTAL .......... 3,00 €", T[21] + 1.6, "l")]
TW, LH, TOP = 660, 66, 70


@lru_cache(1)
def papel():
    h = TOP + LH * len(TICKET) + 60
    rng = np.random.default_rng(2)
    p = np.ones((h, TW, 3), np.float32) * np.float32([0.86, 0.91, 0.94])
    n = cv2.GaussianBlur(rng.normal(0, 1, (h, TW)).astype(np.float32), (0, 0), 1.2) * 0.02
    p += n[..., None]
    for i, (txt, _, al) in enumerate(TICKET):
        y = TOP + i * LH
        if al == "c":
            paste(p, text(txt, 46, "mono", "#222222", shadow=0), TW // 2, y, 1.0)
        else:
            paste(p, text(txt, 33, "mono", "#2A2A2A", shadow=0), 34, y, 1.0, anchor="l")
    return p


def s_ticket(tl, D, t):
    x = ease(tl / D)
    f = bokeh_cafe(t)
    p = papel()
    k = sum(1 for _, tt, _ in TICKET if t >= tt)
    prev = sum(1 for _, tt, _ in TICKET if t - 0.25 >= tt)
    frac = eout(min(1, (t - TICKET[k - 1][1]) / 0.25)) if k > 0 else 0
    lines = prev + (k - prev) * frac if k else 0
    vis = int(min(p.shape[0], TOP - LH / 2 + lines * LH + 20))
    slot = 1430
    # rendija de la impresora
    cv2.rectangle(f, (180, slot - 6), (900, slot + 60), (0.05, 0.05, 0.06), -1)
    cv2.rectangle(f, (180, slot - 6), (900, slot - 2), (0.35, 0.35, 0.38), -1)
    if vis > 10:
        part = p[:vis]
        # sombra
        sh = np.zeros((H, W), np.float32)
        x0 = W // 2 - TW // 2
        y0 = slot - vis
        cv2.rectangle(sh, (x0 + 18, max(0, y0 + 24)), (x0 + TW + 18, slot), 1.0, -1)
        sh = cv2.GaussianBlur(sh, (0, 0), 22)
        f *= (1 - 0.6 * sh)[..., None]
        ys, ye = max(0, y0), slot
        sub = part[ys - y0:]
        shade = np.linspace(0.82, 1.0, sub.shape[0], dtype=np.float32)[:, None, None]
        xs = np.linspace(-1, 1, TW, dtype=np.float32)
        curl = (1 - 0.12 * xs ** 2)[None, :, None]
        f[ys:ye, x0:x0 + TW] = sub * shade * curl
        # sello de Hacienda
        if t >= T[21] + 0.15:
            a = min(1, (t - T[21] - 0.15) / 0.12)
            sc = 1.6 - 0.6 * eout((t - T[21] - 0.15) / 0.18)
            iy = y0 + TOP + 8 * LH
            paste(f, text("HACIENDA", 64, "black", "#D8322F", tracking=0.12, shadow=0), W // 2 + 170, iy - 20,
                  0.8 * a, scale=sc, rot=-14)
    s = lerp(1.0, 1.07, x)
    M = cv2.getRotationMatrix2D((W / 2, 1000), lerp(-2.5, -1.0, x), s)
    f = cv2.warpAffine(f, M, (W, H), borderMode=cv2.BORDER_REFLECT)
    fx.destello(f, W / 2, -120, 700, (0.55, 0.75, 1.0), 0.12)
    return f


@lru_cache(1)
def _bokeh_base():
    rng = np.random.default_rng(14)
    f = np.zeros((int(H * 1.2), int(W * 1.2), 3), np.float32)
    f[:] = (0.02, 0.03, 0.045)
    for _ in range(55):
        x, y = rng.uniform(0, f.shape[1]), rng.uniform(0, f.shape[0] * 0.7)
        r = rng.uniform(30, 110)
        col = np.float32((0.25, 0.55, 1.0)) * rng.uniform(0.25, 0.7) if rng.random() < 0.75 else \
            np.float32((0.85, 0.75, 0.55)) * rng.uniform(0.15, 0.4)
        cv2.circle(f, (int(x), int(y)), int(r), tuple(float(c) for c in col), -1, cv2.LINE_AA)
    f = cv2.GaussianBlur(f, (0, 0), 6)
    yy = np.linspace(0, 1, f.shape[0], dtype=np.float32)[:, None, None]
    table = np.float32([0.05, 0.08, 0.12]) * np.clip((yy - 0.62) * 4, 0, 1)
    return f * np.clip((0.75 - yy) * 2.5, 0.15, 1) + table


def bokeh_cafe(t):
    b = _bokeh_base()
    ox, oy = int(60 + 40 * np.sin(t * 0.3)), int(90 + 20 * np.cos(t * 0.25))
    return b[oy:oy + H, ox:ox + W].copy()


# ------------------------------------------------------------------ 13: torre de 50 monedas
def moneda_lado(f, x, y, rx=150, ry=44, th=13, luz=1.0):
    rim = tuple(float(c) * luz for c in (0.13, 0.42, 0.70))
    face = tuple(float(c) * luz for c in (0.32, 0.72, 0.97))
    ring = tuple(float(c) * luz for c in (0.22, 0.58, 0.86))
    cv2.ellipse(f, (int(x), int(y)), (rx, ry), 0, 0, 180, rim, -1, cv2.LINE_AA)
    cv2.rectangle(f, (int(x - rx), int(y - th)), (int(x + rx), int(y)), rim, -1)
    cv2.ellipse(f, (int(x), int(y)), (rx, ry), 0, 0, 180, tuple(c * 0.6 for c in rim), 2, cv2.LINE_AA)
    cv2.ellipse(f, (int(x), int(y - th)), (rx, ry), 0, 0, 360, face, -1, cv2.LINE_AA)
    cv2.ellipse(f, (int(x), int(y - th)), (int(rx * 0.78), int(ry * 0.78)), 0, 0, 360, ring, 3, cv2.LINE_AA)


def s_torre(tl, D, t):
    x = ease(tl / D)
    f = np.zeros((H, W, 3), np.float32)
    f[:] = (0.018, 0.02, 0.025)
    floor = 1390
    tx, lx = 360, 830
    dim = 1 - 0.55 * eout((t - T[23]) / 0.4) if t > T[23] else 1.0
    fx.destello(f, tx, floor, 330, (0.3, 0.55, 0.9), 0.35 * dim)
    t0 = T[22] - 0.1
    for k in range(50):
        tk = t0 + k * 0.017
        if t < tk:
            break
        yk = floor - k * 13
        fall = 1 - eout((t - tk) / 0.18)
        moneda_lado(f, tx, yk - fall * 700, luz=dim * (0.75 + 0.25 * k / 50))
    if t >= T[23] - 0.05:
        a = eout((t - T[23] + 0.05) / 0.3)
        fx.destello(f, lx, floor - 10, 140, (0.4, 0.75, 1.0), 0.6 * a)
        moneda_lado(f, lx, floor - (1 - a) * 400, rx=150, ry=44, th=13, luz=1.15)
    # reflejo en el suelo
    r = f[floor - 700:floor][::-1] * 0.18
    f[floor + 50:floor + 50 + 700] += cv2.GaussianBlur(r, (0, 0), 5)[:H - floor - 50]
    if t >= T[22]:
        paste(f, text("3,00 €", 110, "black", HEX["white"]), tx, floor - 50 * 13 - 150, min(1, (t - T[22]) / 0.2) * dim)
    if t >= T[23]:
        a = min(1, (t - T[23]) / 0.2)
        paste(f, text("0,06 €", 110, "black", HEX["amber"]), lx, floor - 230, a)
    if t >= T[23] + 0.6:
        paste(f, text("50 veces menos", 46, "semi", HEX["white"], tracking=0.05), W // 2, 360,
              min(1, (t - T[23] - 0.6) / 0.3))
    M = cv2.getRotationMatrix2D((W / 2, 1100), 0, lerp(1.0, 1.06, x))
    M[0, 2] += lerp(30, -30, x)
    return cv2.warpAffine(f, M, (W, H), borderMode=cv2.BORDER_CONSTANT)


def s_aislado(tl, D, t):
    x = ease(tl / D)
    f, _ = camara("agricultor", lerp(0.55, 0.575, x), lerp(0.49, 0.46, x), lerp(1.12, 1.24, x),
                  par=(lerp(-40, 40, x), 0), dz=0.08, warp=fx.viento(t, 2.5, near_max=0.55))
    fx.aislar_rojo(f, eout(tl / 0.7))
    POLVO.draw(f, t + 9)
    cifra(f, t, T[24] + 0.05, 51.4, "AGRICULTOR", "2 %", debajo="de lo que pagas")
    return f


# ------------------------------------------------------------------ 15: la taza cenital
@lru_cache(1)
def mesa_y_taza():
    S = 2600
    rng = np.random.default_rng(4)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    n = fx._ruido(12, S, S, 400)
    grain_ = 0.5 + 0.5 * np.sin(yy * 0.045 + n * 9 + np.sin(xx * 0.002) * 2)
    fine = cv2.GaussianBlur(rng.normal(0, 1, (S, S)).astype(np.float32), (0, 0), 1.0)
    fine = cv2.resize(cv2.resize(fine, (S // 8, S)), (S, S))
    wood = (0.55 + 0.35 * grain_ + 0.05 * fine)[..., None] * np.float32([0.045, 0.085, 0.14])
    c = S / 2
    r = np.hypot(xx - c, yy - c)
    # platillo
    sau = (r < 470).astype(np.float32)
    sau_col = np.float32([0.58, 0.62, 0.66]) * (0.78 + 0.22 * np.clip(1 - (r - 330) / 140, 0, 1))[..., None]
    sh = cv2.GaussianBlur((r < 480).astype(np.float32), (0, 0), 30)
    img = wood * (1 - 0.65 * sh[..., None])
    img = img * (1 - sau[..., None]) + sau_col * sau[..., None]
    # sombra de la taza y asa
    cup_sh = cv2.GaussianBlur((np.hypot(xx - c - 25, yy - c - 30) < 300).astype(np.float32), (0, 0), 22)
    img *= (1 - 0.35 * cup_sh)[..., None]
    handle = ((np.abs(yy - c) < 46) & (xx > c + 270) & (xx < c + 420)).astype(np.float32)
    handle = cv2.GaussianBlur(handle, (0, 0), 3)
    img = img * (1 - handle[..., None]) + np.float32([0.64, 0.68, 0.71]) * handle[..., None]
    cup = (r < 300).astype(np.float32)
    cup_col = np.float32([0.66, 0.70, 0.73]) * (0.82 + 0.18 * np.clip((300 - r) / 40, 0, 1))[..., None]
    img = img * (1 - cup[..., None]) + cup_col * cup[..., None]
    lip = cv2.GaussianBlur(((r > 262) & (r < 270)).astype(np.float32), (0, 0), 2)
    img = img * (1 - 0.25 * lip[..., None])
    return img.astype(np.float32)


@lru_cache(1)
def cafe_tex():
    R = 262
    S = 2 * R
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    r = np.hypot(xx - R, yy - R)
    n = fx._ruido(13, S, S, 70)
    base = np.float32([0.03, 0.06, 0.11]) + (n * 0.05)[..., None] * np.float32([0.2, 0.5, 1.0])
    crema = np.clip((r - (R - 60)) / 50, 0, 1) * (0.6 + 0.4 * n)
    tex = base * (1 - crema[..., None] * 0.6) + np.float32([0.16, 0.32, 0.52]) * crema[..., None] * 0.6
    # reflejo de una lámpara y de una ventana
    lamp = np.exp(-(((xx - R * 0.72) ** 2 + (yy - R * 0.62) ** 2) / (2 * 22 ** 2)))
    win = ((np.abs(xx - R * 1.25) < 40) & (np.abs(yy - R * 1.2) < 70)).astype(np.float32)
    win = cv2.GaussianBlur(win, (0, 0), 6)
    tex += lamp[..., None] * np.float32([0.45, 0.75, 1.0]) * 0.9 + win[..., None] * 0.22
    return tex.astype(np.float32), (r < R - 1).astype(np.float32)


def s_taza(tl, D, t):
    x = ease(tl / D)
    S = mesa_y_taza().copy()
    tex, mask = cafe_tex()
    R = tex.shape[0] // 2
    yy, xx = np.mgrid[0:2 * R, 0:2 * R].astype(np.float32)
    dx, dy = xx - R * 0.95, yy - R * 1.05
    r = np.hypot(dx, dy) + 1e-3
    amp = 3.5 * np.sin(r * 0.11 - t * 6) * np.exp(-r / 260)
    rip = cv2.remap(tex, xx + dx / r * amp, yy + dy / r * amp, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    shade = (1 + 0.12 * np.cos(r * 0.11 - t * 6) * np.exp(-r / 260))[..., None]
    c = S.shape[0] // 2
    m = mask[..., None]
    S[c - R:c + R, c - R:c + R] = S[c - R:c + R, c - R:c + R] * (1 - m) + rip * shade * m
    ang = lerp(0, 14, x)
    z = lerp(1.0, 1.32, x)
    M = cv2.getRotationMatrix2D((c, c), ang, z)
    M[0, 2] += W / 2 - c
    M[1, 2] += H / 2 - c - 40
    f = cv2.warpAffine(S, M, (W, H), flags=cv2.INTER_LINEAR)
    fx.humo(f, t, a=0.16, color=(0.8, 0.82, 0.85), seed=8, rise=80)
    fx.destello(f, W * 0.15, 200, 600, (0.4, 0.7, 1.0), 0.12)
    return f


# ------------------------------------------------------------------ 16: cierre
@lru_cache(16)
def emoji(e, size):
    f = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 109)
    im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((10, 10), e, font=f, embedded_color=True)
    im = im.crop(im.getbbox())
    s = size / max(im.size)
    im = im.resize((max(1, int(im.size[0] * s)), max(1, int(im.size[1] * s))), Image.LANCZOS)
    a = np.asarray(im, np.float32) / 255
    return a[..., 2::-1].copy(), a[..., 3].copy()


def s_final(tl, D, t):
    x = ease(tl / D)
    f, _ = camara("moneda3", 0.6, 0.42, lerp(1.0, 1.08, x), par=(lerp(-40, 40, x), 0), dz=0.1)
    sm = cv2.GaussianBlur(cv2.resize(f, (W // 4, H // 4)), (0, 0), 5)
    f = cv2.resize(sm, (W, H)) * 0.4
    POLVO.draw(f, t)
    a = eout((t - T[27] + 0.05) / 0.35)
    paste(f, text("¿Qué investigo", 104, "black", HEX["white"]), W // 2, 560, a, scale=1.15 - 0.15 * a)
    paste(f, text("después?", 104, "black", HEX["amber"]), W // 2, 680, a, scale=1.15 - 0.15 * a)
    ops = (("📱", "El iPhone"), ("🥑", "El aguacate"), ("💡", "Tu factura de la luz"))
    for i, (e, lab) in enumerate(ops):
        ti = T[27] + 0.45 + i * 0.22
        if t < ti:
            continue
        b = eout((t - ti) / 0.3)
        y = 860 + i * 130
        xo = (1 - b) * 120
        glass(f, 170 + xo, y - 50, 740, 100, r=50, alpha=b, ta=0.5)
        paste(f, emoji(e, 58), 240 + xo, y, b)
        paste(f, text(lab, 48, "bold", HEX["white"]), 300 + xo, y, b, anchor="l")
    if t >= T[28] - 0.05:
        b = eout((t - T[28] + 0.05) / 0.3)
        paste(f, text("Te leo en comentarios", 58, "bold", HEX["white"]), W // 2 - 30, 1300, b)
        paste(f, emoji("👇", 62), W // 2 + 330, 1300, b)
    return f


# ------------------------------------------------------------------ montaje
CORTES = [
    (0.0, 1.95, s_gancho), (1.95, 3.40, s_grano), (3.40, 5.32, s_moneda),
    (5.32, 8.72, s_montana), (8.72, 10.30, s_altura), (10.30, 13.18, s_manos),
    (13.18, 16.32, s_puerto1), (16.32, 18.10, s_globo), (18.10, 20.95, s_puerto2),
    (20.95, 24.15, s_bolsa1), (24.15, 25.95, s_bolsa2), (25.95, 28.95, s_digitos), (28.95, 31.22, s_apuesta),
    (31.22, 33.20, s_tostador1), (33.20, 35.38, s_tostador2), (35.38, 37.40, s_tostador3),
    (37.40, 46.40, s_ticket), (46.40, 49.00, s_torre), (49.00, 51.42, s_aislado),
    (51.42, 55.80, s_taza), (55.80, DUR, s_final),
]


def frame(i):
    t = i / FPS
    k = next(j for j, c in enumerate(CORTES) if c[0] <= t < c[1] or j == len(CORTES) - 1)
    t0, t1, fn = CORTES[k]
    tl = t - t0
    f = fn(tl, t1 - t0, t).astype(np.float32)
    if k > 0 and tl < 0.2:  # entrada: zoom con desenfoque radial y destello suave
        u = 1 - tl / 0.2
        f = zoom_blur(f, 1 + 0.05 * u, 0.9 * u)
        f += 0.12 * u * u
    fx.etalonar(f)
    fx.bloom(f)
    li = next((j for j, ln in enumerate(TL) if ln["start"] - 0.1 <= t <= ln["end"] + 0.6), None)
    if li is not None and li not in SIN_SUBS:
        SUBS.y = 150 if 37.4 <= t < 46.4 else 1240
        SUBS.draw(f, t)
    vignette(f)
    grain(f, i, 0.03)
    if t < 55.8:
        brand(f)
    f *= min(1.0, (DUR - t) / 0.45)
    return (np.clip(f, 0, 1) * 255 + 0.5).astype(np.uint8)


def trozo(args):
    a, b, path = args
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s",
                           f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "17", "-preset", "slow",
                           "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    for i in range(a, b):
        ff.stdin.write(frame(i).tobytes())
    ff.stdin.close()
    ff.wait()
    return path


def preview():
    ts = []
    for t0, t1, _ in CORTES:
        ts += [t0 + 0.3 * (t1 - t0), t0 + 0.8 * (t1 - t0)]
    tiles = [cv2.resize(frame(int(t * FPS)), (270, 480), interpolation=cv2.INTER_AREA) for t in ts]
    while len(tiles) % 7:
        tiles.append(np.zeros_like(tiles[0]))
    rows = [np.hstack(tiles[i:i + 7]) for i in range(0, len(tiles), 7)]
    os.makedirs(OUT, exist_ok=True)
    cv2.imwrite(os.path.join(OUT, "preview.jpg"), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])


def render(workers=4):
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(OUT, "trozos")
    os.makedirs(tmp, exist_ok=True)
    n = 16
    edges = np.linspace(0, NF, n + 1).astype(int)
    jobs = [(edges[j], edges[j + 1], os.path.join(tmp, f"t{j:02d}.mp4")) for j in range(n)]
    with Pool(workers) as p:
        for path in p.imap(trozo, jobs):
            print("listo", os.path.basename(path), flush=True)
    lst = os.path.join(tmp, "lista.txt")
    open(lst, "w").write("".join(f"file '{j[2]}'\n" for j in jobs))
    video = os.path.join(OUT, "cafe_video.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", video],
                   check=True)
    return video


if __name__ == "__main__":
    if "--preview" in sys.argv:
        preview()
    elif "--frame" in sys.argv:
        t = float(sys.argv[sys.argv.index("--frame") + 1])
        cv2.imwrite(os.path.join(OUT, "frame.jpg"), frame(int(t * FPS)))
    else:
        render()
