"""Reel «Del estrecho de Ormuz a tu casa» — kiria.ai

    python3 projects/oriente/render_oriente.py --preview     # fotogramas clave + hoja de contactos
    python3 projects/oriente/render_oriente.py               # render completo 1080x1920 a 30 fps

Tiempos: `python3 -m engine.audio projects/oriente/assets/voz.mp3 projects/oriente/script_tts.txt`.
Estructura en bucle: el último fotograma es el primero (entrada y salida por el mismo camino).
"""
import argparse
import os
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))

from engine.fin_draw import (W, H, FPS, HEX, NAVY, MINT, AMBER, WHITE, INK, clamp, prog, eo, eio, eback, lerp,  # noqa
                             paste, text, glass, rrect, halo, chip, icon, hex_bgr, line)
from engine.geo import Globe, render_globe, draw_arc, GULF  # noqa: E402
from engine import post  # noqa: E402

AUDIO = os.path.join(ROOT, "assets", "voz.mp3")
OUT = os.path.join(ROOT, "out")
END = 60.00

# ------------------------------------------------------------------ tiempos (alineación de la voz)
K = dict(
    arcs=4.03, ormuz_word=11.94, cuarta=13.65, todo_petroleo=15.95,
    paso=18.81, cuello=21.49, tension=23.87, teme=25.28, sube=27.38,
    brent=28.89, setenta=29.9, marzo=32.08, sept=34.39,
    espana=37.43, bce=38.62, transporte=43.10, combustibles=46.42, inflacion=48.47,
    notado=52.11, leo=54.20, porque=55.71,
)
ENTRY_END = 4.15                     # fin del viaje de entrada (τ)
EXIT_START = 55.50                   # empieza la salida (mismo camino al revés)
SCENES = [(4.00, "arcos"), (13.40, "ormuz"), (28.60, "brent"), (37.10, "espana"), (52.00, "pregunta")]
CUTS = [28.60, 37.10, 52.00]         # cortes con zoom-through (el resto es cámara continua)
TR = 0.20

HORMUZ = (56.4, 26.5)
DEST = {"Europa": (4.5, 51.9), "España": (-5.4, 36.1), "India": (72.8, 19.0), "China": (121.5, 31.2),
        "Japón": (139.7, 35.6), "Singapur": (103.8, 1.3), "África": (18.4, -33.9)}
GULF_BBOX = (44, 20, 66, 34)
SPAIN = {("Spain",): (hex_bgr("#12423C"), MINT)}

# ------------------------------------------------------------------ viaje de entrada / salida
NOCHE = os.path.join(ROOT, "assets", "noche")
# (imagen, punto hacia el que se hace zoom, duración en τ)
CHAIN = [("1_tierra", (540, 1176), 0.90), ("2_espana", (502, 1315), 0.80), ("3_granada", (540, 960), 0.70),
         ("4_centro", (540, 960), 0.60), ("5_tejados", (540, 960), 0.50), ("6_ventana", (560, 1050), 0.65)]
ZOOM = 3.0


@lru_cache(None)
def foto(name):
    img = cv2.imread(os.path.join(NOCHE, name + ".jpg")).astype(np.float32) / 255
    if name == "6_ventana":  # se tapa la franja inferior (dirección de la calle en la captura)
        img[1560:] = img[1560:] * 0.0 + img[1559:1560] * 0.6
    return img


def zoom_to(img, s, c):
    M = np.float32([[s, 0, W / 2 - s * c[0]], [0, s, H / 2 - s * c[1]]])
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def chain_frame(tau):
    """Zoom continuo por las fotos: velocidad constante en escala logarítmica + fundidos con desenfoque."""
    a = 0.0
    for i, (name, tgt, d) in enumerate(CHAIN):
        if tau < a + d or i == len(CHAIN) - 1:
            u = clamp((tau - a) / d, 0, 1.4)
            s = ZOOM ** u
            c = (lerp(W / 2, tgt[0], min(u, 1)), lerp(H / 2, tgt[1], min(u, 1)))
            cur = zoom_to(foto(name), s, c)
            # fundido hacia la siguiente foto en el último 25 %
            if i + 1 < len(CHAIN) and u > 0.75:
                k = (u - 0.75) / 0.25
                nxt = zoom_to(foto(CHAIN[i + 1][0]), 0.75 + 0.25 * k, (W / 2, H / 2))
                cur = cur * (1 - eio(k)) + nxt * eio(k)
                cur = post.zoom_blur(cur, 1.0, 0.6 * np.sin(np.pi * k), n=5)
            return cur
        a += d
    return foto(CHAIN[-1][0])


def pixelate(img, block):
    b = max(1, int(block))
    if b <= 1:
        return img
    small = cv2.resize(img, (max(1, W // b), max(1, H // b)), interpolation=cv2.INTER_AREA)
    return cv2.resize(small, (W, H), interpolation=cv2.INTER_NEAREST)


def travel(tau, holo):
    """Fotograma del viaje en el instante τ; a partir de 3,7 se deshace en píxeles hacia el mundo digital."""
    if tau < 3.70:
        return chain_frame(tau)
    if tau < 3.95:
        p = prog(tau, 3.70, 0.25)
        f = pixelate(chain_frame(tau), 2 + 60 * p ** 2)
        return f + p ** 2 * 0.25 * np.array(MINT, np.float32)
    p = prog(tau, 3.95, ENTRY_END - 3.95)
    f = pixelate(holo, 62 * (1 - p) ** 2)
    return f + (1 - p) ** 2 * 0.25 * np.array(MINT, np.float32)


def tau_of(t):
    if t < ENTRY_END:
        return t
    if t >= EXIT_START:
        return (END - t) * ENTRY_END / (END - EXIT_START)
    return None


# ------------------------------------------------------------------ espacio y globo
@lru_cache(1)
def space():
    img = np.zeros((H, W, 3), np.float32)
    g = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    img[:] = np.array(hex_bgr("#07132A"), np.float32) * (1 - g) + np.array(hex_bgr("#02060F"), np.float32) * g
    rng = np.random.default_rng(5)
    for _ in range(600):
        x, y = rng.integers(0, W), rng.integers(0, H)
        b = rng.uniform(0.2, 0.9) ** 2
        cv2.circle(img, (int(x), int(y)), 1, (b, b, b), -1, cv2.LINE_AA)
    return img


def log_lerp(a, b, u):
    return a * (b / a) ** u


def particles(img, pts, big=False):
    for p in pts:
        halo(img, p[0], p[1], 12 if not big else 16, WHITE, 0.9)
        halo(img, p[0], p[1], 26 if not big else 32, AMBER, 0.6)


def globe_world(t):
    """Globo de las escenas de rutas y Ormuz con su cámara continua."""
    img = space().copy()
    if t < 8.2:
        u = prog(t, 4.0, 4.2)
        lon, lat, R = lerp(50, 64, u), lerp(23, 25, u), lerp(430, 520, eio(u))
    elif t < 11.9:
        u = eio(prog(t, 8.2, 3.7))
        lon, lat, R = lerp(64, 54.6, u), lerp(25, 26.3, u), log_lerp(520, 6200, u)
    else:
        u = prog(t, 11.9, 16.7)
        lon, lat, R = lerp(54.6, 55.2, u), 26.3, lerp(6200, 7300, eio(u))
    g = Globe(lon, lat, R, W / 2, 1000 if R < 1500 else 960)
    zoomed = R > 2500
    render_globe(img, g, "10m" if zoomed else "50m", bbox=GULF_BBOX if zoomed else None,
                 hi_fill=hex_bgr("#2A3F63") if zoomed else hex_bgr("#3A3424"), atmosphere=not zoomed, border_a=0.7 if zoomed else 0.45, graticule=not zoomed)
    # arcos que se dibujan uno a uno desde Ormuz
    if R < 4000:
        fade = 1 - prog(R, 2000, 2000)
        for i, (name, d) in enumerate(DEST.items()):
            p = eo(prog(t, K["arcs"] + 0.3 + i * 0.35, 1.1))
            if p <= 0:
                continue
            tip, pts = draw_arc(img, g, HORMUZ, d, p, AMBER, 0.2, 3, 8, particles=t * 0.35, seed=i)
            if fade > 0.05:
                particles(img, pts)
                if tip and p >= 1:
                    halo(img, tip[0], tip[1], 26, AMBER, 0.9 * fade)
                    paste(img, text(name, 30, "bold", HEX["white"]), tip[0], tip[1] - 34, 0.95 * fade)
        hx, hy, _ = g.project(*HORMUZ)
        for k, r in enumerate((40, 75, 115)):
            rr = r * (1 + 0.15 * np.sin(t * 4 - k))
            cv2.circle(img, (int(hx), int(hy)), int(rr), AMBER, 2, cv2.LINE_AA)
        halo(img, hx, hy, 70, AMBER, 1.0)
    else:
        ormuz_close(img, g, t)
    return img


def ormuz_close(img, g, t):
    jam = eo(prog(t, K["teme"], 1.5))
    hot = eo(prog(t, K["tension"], 1.0))
    ports = [(48.6, 29.0), (50.4, 26.9), (51.8, 25.6), (50.9, 26.6), (54.2, 24.9), (49.9, 28.4)]
    trunk = [(52.6, 26.9), (55.0, 26.55), (56.3, 26.55), (57.0, 26.0), (58.8, 24.9)]
    speed = lerp(0.30, 0.07, jam)
    phase = t * speed + 3.0 * jam * 0.0
    for i, p in enumerate(ports):
        path = [p] + trunk
        for j, (a, b) in enumerate(zip(path, path[1:])):
            tip, pts = draw_arc(img, g, a, b, 1.0, AMBER, 0.0005, 3, 6, particles=(phase + i * 0.11) % 1, seed=i)
            particles(img, pts[:2])
    gx, gy, _ = g.project(*trunk[2])
    halo(img, gx, gy, 140 + 60 * hot, AMBER, 0.45 + 0.35 * hot)
    for k, r in enumerate((60, 110, 170)):
        rr = r * (1 + (0.1 + 0.25 * hot) * np.sin(t * (3 + 4 * hot) - k))
        cv2.circle(img, (int(gx), int(gy)), int(rr), AMBER, 2 + int(2 * hot), cv2.LINE_AA)
    # barcos parados a la entrada del estrecho
    if jam > 0:
        rng = np.random.default_rng(9)
        for i in range(14):
            ll = (55.2 + rng.uniform(-0.6, 0.6), 26.6 + rng.uniform(-0.25, 0.25))
            x, y, _ = g.project(*ll)
            halo(img, x, y, 18, AMBER, 0.8 * jam)
            halo(img, x, y, 8, WHITE, 0.9 * jam)
    em = eo(prog(t, K["paso"], 0.4))
    for name, ll, big in (("IRÁN", (55.6, 28.0), True), ("OMÁN", (56.3, 25.75), True), ("EAU", (54.4, 24.0), False),
                          ("GOLFO PÉRSICO", (52.8, 27.6), False), ("GOLFO DE OMÁN", (58.0, 25.2), False)):
        x, y, _ = g.project(*ll)
        sea = "GOLFO" in name
        s = 1 + 0.25 * em * big * (1 - prog(t, K["paso"] + 1.2, 0.6))
        paste(img, text(name, 30 if sea else 46, "mono" if sea else "black",
                        HEX["mist"] if sea else HEX["white"], tracking=0.15 if sea else 0.05), x, y,
              0.9 if not big else 0.6 + 0.4 * em, scale=s)
    if hot > 0:  # bordes calientes de tensión
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2))
        img += (np.clip(d - 0.7, 0, 1) * 0.35 * hot * (0.7 + 0.3 * np.sin(t * 5)))[..., None] * np.array(AMBER)


def overlay_ormuz(img, t):
    a = eo(prog(t, K["ormuz_word"], 0.3))
    title = "CUELLO DE BOTELLA" if t >= K["cuello"] else "ESTRECHO DE ORMUZ"
    t0 = K["cuello"] if t >= K["cuello"] else K["ormuz_word"]
    paste(img, chip(title, 36, HEX["navy"], HEX["amber"], "black"), W / 2, 300, a, scale=eback(prog(t, t0, 0.4)))
    # dato EIA
    ca = eo(prog(t, K["cuarta"], 0.35)) * (1 - prog(t, K["paso"] - 0.3, 0.3))
    if ca > 0:
        glass(img, 110, 1230 + 30 * (1 - ca), 860, 260, 40, ta=0.78, alpha=ca, glow=AMBER)
        paste(img, text("MÁS DE", 30, "mono", HEX["amber"], tracking=0.2), W / 2, 1280, ca)
        paste(img, text("1 de cada 4 barriles", 70, "black", HEX["white"]), W / 2, 1352, ca,
              scale=eback(prog(t, K["cuarta"], 0.45)))
        paste(img, text("de petróleo que viajan por mar", 34, "semi", HEX["white"]), W / 2, 1420,
              eo(prog(t, K["todo_petroleo"], 0.3)) * ca)
        paste(img, text("Fuente: EIA (datos de 2024)", 22, "med", HEX["mist"]), W / 2, 1462, ca)
    sa = eo(prog(t, K["sube"], 0.3))
    if sa > 0:
        glass(img, 170, 1260 + 30 * (1 - sa), 740, 170, 40, ta=0.78, alpha=sa, glow=AMBER)
        paste(img, icon("arrow_up", 80, HEX["amber"]), 270, 1345 - 10 * np.sin(t * 6), sa, scale=eback(sa))
        paste(img, text("PRECIO DEL", 30, "mono", HEX["mist"], tracking=0.15), 340, 1312, sa, anchor="l")
        paste(img, text("PETRÓLEO", 64, "black", HEX["amber"]), 340, 1370, sa, anchor="l")
    ta = eo(prog(t, K["tension"], 0.3)) * (1 - prog(t, K["sube"] - 0.3, 0.3))
    if ta > 0:
        paste(img, chip("TENSIÓN", 40, HEX["navy"], HEX["amber"], "black"), W / 2, 1340, ta,
              scale=1 + 0.05 * np.sin(t * 8))


# ------------------------------------------------------------------ Brent
BRENT = [("FEB", 70, "~70 $", "brent"), ("MAR", 112, "+110 $", "marzo"), ("SEP", 102, "+100 $", "sept")]


def brent_world(t):
    img = space().copy()
    g = Globe(lerp(45, 52, prog(t, 28.6, 8.5)), 28, 1500, W / 2, 1150)
    render_globe(img, g, "50m", atmosphere=True)
    img *= 0.45
    x0, y0, w, h = 70, 470, 940, 820
    a = eo(prog(t, 28.7, 0.4))
    glass(img, x0, y0 + 30 * (1 - a), w, h, 44, ta=0.72, alpha=a)
    paste(img, text("BRENT", 64, "black", HEX["white"]), x0 + 60, y0 + 80, a, anchor="l")
    paste(img, text("dólares por barril", 30, "med", HEX["mist"]), x0 + 60, y0 + 135, a, anchor="l")
    gx0, gx1, gy0, gy1 = x0 + 110, x0 + w - 110, y0 + 230, y0 + h - 120

    def Y(v):
        return gy1 - (v - 50) / (130 - 50) * (gy1 - gy0)
    xs = [gx0, gx0 + (gx1 - gx0) * 0.18, gx1]
    for v in (60, 80, 100, 120):
        line(img, (gx0 - 20, Y(v)), (gx1 + 20, Y(v)), (0.35, 0.45, 0.6), 2, 0.25 * a)
        paste(img, text(str(v), 24, "mono", HEX["mist"], shadow=0), gx0 - 40, Y(v), 0.7 * a, anchor="r")
    for (m, v, lab, key), x in zip(BRENT, xs):
        paste(img, text(m, 28, "mono", HEX["mist"], tracking=0.1), x, gy1 + 50, a)
    # tramo feb→mar (sólido) y mar→sep (discontinuo: meses intermedios no mostrados)
    p1 = eio(prog(t, K["setenta"], K["marzo"] - K["setenta"] + 0.3))
    p2 = eio(prog(t, K["sept"], 1.6))
    P = [(x, Y(v)) for (m, v, lab, key), x in zip(BRENT, xs)]
    if p1 > 0:
        e = (lerp(P[0][0], P[1][0], p1), lerp(P[0][1], P[1][1], p1))
        line(img, P[0], e, AMBER, 8, 1.0)
        halo(img, *e, 34, AMBER, 0.9)
        halo(img, *e, 14, WHITE, 1.0)
    if p2 > 0:
        n = 18
        for i in range(int(n * p2)):
            if i % 2 == 0:
                q0 = (lerp(P[1][0], P[2][0], i / n), lerp(P[1][1], P[2][1], i / n))
                q1 = (lerp(P[1][0], P[2][0], (i + 1) / n), lerp(P[1][1], P[2][1], (i + 1) / n))
                line(img, q0, q1, AMBER, 6, 0.85)
        e = (lerp(P[1][0], P[2][0], p2), lerp(P[1][1], P[2][1], p2))
        halo(img, *e, 30, AMBER, 0.8)
    for (m, v, lab, key), (x, y) in zip(BRENT, P):
        la = eo(prog(t, K[key] + (0.9 if key == "brent" else 0.25 if key == "marzo" else 1.6), 0.3))
        if la > 0:
            halo(img, x, y, 22, AMBER, la)
            paste(img, chip(lab, 40, HEX["navy"], HEX["amber"], "black"), x, y - 70, la, scale=eback(la))
    paste(img, text("Los meses intermedios no se muestran", 22, "med", HEX["mist"]), W / 2, y0 + h - 40,
          0.8 * eo(prog(t, K["sept"], 0.5)))
    return img


# ------------------------------------------------------------------ España
def spain_world(t):
    img = space().copy()
    u = eio(prog(t, 37.1, 1.5))
    lon, lat, R = lerp(40, -3.7, u), lerp(32, 40.0, u), log_lerp(900, 3200, u)
    R *= 1 + 0.05 * prog(t, 38.6, 13)
    g = Globe(lon, lat, R, W / 2, 760)
    render_globe(img, g, "50m", highlight=set(), extra=SPAIN, atmosphere=R < 2000, graticule=R < 2000,
                 bbox=(-25, 25, 30, 60) if R > 1800 else None)
    gx, gy, _ = g.project(-3.6, 37.18)   # Granada
    halo(img, gx, gy, 30 + 6 * np.sin(t * 4), MINT, 0.9 * u)
    halo(img, gx, gy, 10, WHITE, u)
    ta = eo(prog(t, K["espana"], 0.3))
    small = prog(t, K["bce"] - 0.2, 0.4)
    paste(img, text("¿Y EN ESPAÑA?", lerp(110, 54, small), "black", HEX["white"]), W / 2, lerp(1250, 300, eio(small)),
          ta, scale=eback(prog(t, K["espana"], 0.4)))
    cards = [
        (K["bce"], K["transporte"], "SEGÚN EL BCE", "El conflicto está\npresionando los precios", 56, None),
        (K["transporte"], K["inflacion"], "TRANSPORTE", "+10,5 %", 120, "en un año · sobre todo, combustibles · INE"),
        (K["inflacion"], 52.2, "INFLACIÓN", "4,9 %", 130, "IPC septiembre 2026 · INE"),
    ]
    for t0, t1, lab, big, size, sub in cards:
        a = eo(prog(t, t0, 0.35)) * (1 - prog(t, t1 - 0.3, 0.3))
        if a <= 0:
            continue
        y = 1200 + 40 * (1 - eo(prog(t, t0, 0.35)))
        glass(img, 90, y, 900, 300, 44, ta=0.78, alpha=a, glow=MINT if lab != "SEGÚN EL BCE" else None)
        paste(img, chip(lab, 30, HEX["navy"], HEX["mint"], "black"), W / 2, y + 40, a)
        col = HEX["amber"] if "%" in big else HEX["white"]
        paste(img, text(big, size, "black", col), W / 2, y + 150 + (10 if "\n" in big else 0), a,
              scale=eback(prog(t, t0, 0.45)))
        if sub:
            sa = a * (eo(prog(t, K["combustibles"], 0.3)) if lab == "TRANSPORTE" else 1)
            paste(img, text(sub, 26, "med", HEX["mist"]), W / 2, y + 255, sa)
    return img


def pregunta_world(t):
    img = space().copy()
    g = Globe(-3.7 + 6 * prog(t, 52, 4), 40, 1300, W / 2, 1250)
    render_globe(img, g, "50m", highlight=set(), extra=SPAIN)
    img *= 0.5
    a = eo(prog(t, K["notado"], 0.3))
    paste(img, icon("fuel", 140, HEX["white"], HEX["amber"]), W / 2, 560, a, scale=eback(prog(t, K["notado"], 0.4)))
    paste(img, text("¿Lo has notado\nal llenar el depósito?", 76, "black", HEX["white"]), W / 2, 820, a,
          scale=eback(prog(t, K["notado"] + 0.1, 0.4)))
    b = eo(prog(t, K["leo"], 0.3))
    paste(img, text("Te leo en comentarios", 50, "semi", HEX["mint"]), W / 2, 1020, b)
    paste(img, icon("arrow_down", 64, HEX["mint"]), W / 2, 1110 + abs(12 * np.sin(t * 7)), b)
    paste(img, text("No es asesoramiento financiero", 28, "med", HEX["mist"]), W / 2, 1420, 0.85 * a)
    return img


def scene_at(t):
    name = [n for s, n in SCENES if t >= s]
    name = name[-1] if name else "arcos"
    if name in ("arcos", "ormuz"):
        img = globe_world(t)
        if t >= K["ormuz_word"]:
            overlay_ormuz(img, t)
        return img
    return {"brent": brent_world, "espana": spain_world, "pregunta": pregunta_world}[name](t)


# ------------------------------------------------------------------ avatar
POSES = ["pensativo", "senala", "abierto", "sorpresa", "ok"]
SCHEDULE = [(4.30, "senala"), (13.65, "abierto"), (18.81, "senala"), (23.87, "pensativo"), (28.90, "senala"),
            (32.08, "sorpresa"), (37.43, "abierto"), (43.10, "senala"), (52.11, "pensativo"), (54.20, "ok")]
GROW = [(13.70, 1.3), (32.10, 1.4), (52.20, 1.2)]   # momentos en los que se amplía
AV_IN, AV_OUT = 4.30, 55.40
AV_H, AV_X, AV_FOOT = 290, 165, 1795


@lru_cache(None)
def pose_sprite(name, h):
    im = np.asarray(Image.open(os.path.join(ROOT, "assets", "avatar", name + ".png"))).astype(np.float32) / 255
    s = h / im.shape[0]
    im = cv2.resize(im, (max(1, int(im.shape[1] * s)), h), interpolation=cv2.INTER_AREA)
    return np.ascontiguousarray(im[..., 2::-1]), np.ascontiguousarray(im[..., 3])


def avatar(img, t):
    vis = eo(prog(t, AV_IN, 0.35)) * (1 - prog(t, AV_OUT, 0.35))
    if vis <= 0:
        return
    cur = [i for i, (ts, p) in enumerate(SCHEDULE) if t >= ts]
    i = cur[-1] if cur else 0
    ts, pose = SCHEDULE[i]
    prev = SCHEDULE[i - 1][1] if i > 0 else pose
    grow = 1.0
    for tg, gmax in GROW:
        g = prog(t, tg, 0.35) * (1 - prog(t, tg + 1.3, 0.4))
        grow = max(grow, 1 + (gmax - 1) * eback(g) if g < 1 else 1 + (gmax - 1) * g)
    pop = 0.9 + 0.1 * eback(prog(t, ts, 0.3))
    breath = 1 + 0.012 * np.sin(t * 2.4)
    entry = eback(prog(t, AV_IN, 0.45))
    s = grow * pop * entry
    h = int(AV_H * s)
    if h < 8:
        return
    foot = AV_FOOT + 4 * np.sin(t * 1.9)
    x = AV_X + 40 * (grow - 1)
    # sombra de suelo
    sh = np.zeros((40, 260), np.float32)
    cv2.ellipse(sh, (130, 20), (int(95 * s), 12), 0, 0, 360, 1, -1, cv2.LINE_AA)
    sh = cv2.GaussianBlur(sh, (0, 0), 6)
    from engine.fin_draw import blend, solid
    blend(img, x - 130, AV_FOOT - 18, solid(260, 40, INK)[0], sh, 0.55 * vis)
    k = prog(t, ts, 0.14)
    for name, al in ((prev, 1 - k), (pose, k)):
        if al <= 0.01:
            continue
        sp = pose_sprite(name, h)
        hh = int(h * breath)
        sp = (cv2.resize(sp[0], (sp[0].shape[1], hh)), cv2.resize(sp[1], (sp[1].shape[1], hh)))
        paste(img, sp, x, foot, vis * al, anchor="b")


# ------------------------------------------------------------------ fotograma
def render(fi):
    t = fi / FPS
    tau = tau_of(t)
    if tau is not None and tau < 3.95:
        img = travel(tau, None)
    else:
        img = scene_at(t)
        # zoom-through entre escenas con corte
        for c in CUTS:
            if c - TR <= t < c:
                p = prog(t, c - TR, TR)
                img = post.zoom_blur(img, 1 + 0.6 * p ** 2, p)
            elif c <= t < c + TR:
                p = prog(t, c, TR)
                img = post.zoom_blur(img, lerp(1.35, 1.0, eo(p)), 1 - p)
            if abs(t - c) < TR:
                img += (1 - abs(t - c) / TR) ** 2 * 0.14
        if tau is not None:
            img = travel(tau, img)
    post.vignette(img)
    avatar(img, t)
    if tau is not None and tau < 3.70:
        paste(img, text("Imágenes: Google Earth", 22, "med", HEX["mist"]), 40, H - 70, 0.75, anchor="l")
    post.brand(img)
    post.grain(img, fi, 0.022)
    return post.finish(img)


def render_bytes(fi):
    return render(fi).tobytes()


def preview(times):
    os.makedirs(os.path.join(OUT, "preview"), exist_ok=True)
    with Pool(min(4, os.cpu_count() or 2)) as pool:
        frames = pool.map(render, [int(round(x * FPS)) for x in times])
    thumbs = []
    for x, fr in zip(times, frames):
        cv2.imwrite(os.path.join(OUT, "preview", f"t{x:05.2f}.jpg"), fr, [cv2.IMWRITE_JPEG_QUALITY, 90])
        th = cv2.resize(fr, (270, 480), interpolation=cv2.INTER_AREA)
        cv2.putText(th, f"{x:.2f}s", (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)
        thumbs.append(th)
    cols = 6
    while len(thumbs) % cols:
        thumbs.append(np.zeros_like(thumbs[0]))
    sheet = np.vstack([np.hstack(thumbs[r:r + cols]) for r in range(0, len(thumbs), cols)])
    p = os.path.join(OUT, "preview", "hoja_contactos.jpg")
    cv2.imwrite(p, sheet, [cv2.IMWRITE_JPEG_QUALITY, 88])
    print("preview →", p)


def full(dst):
    n = int(END * FPS)
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-filter_complex", "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,apad[a]",
           "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", dst]
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(min(4, os.cpu_count() or 2)) as pool:
        for k, buf in enumerate(pool.imap(render_bytes, range(n), chunksize=6)):
            ff.stdin.write(buf)
            if k % 150 == 0:
                print(f"  {k}/{n} fotogramas", flush=True)
    ff.stdin.close()
    ff.wait()
    print("vídeo →", dst)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--t", type=float, nargs="*")
    ap.add_argument("--out", default=os.path.join(OUT, "oriente.mp4"))
    args = ap.parse_args()
    if args.preview:
        preview(args.t or [0.0, 0.5, 1.2, 2.0, 2.8, 3.4, 3.85, 4.1, 5.5, 7.5, 9.5, 11.0, 12.5, 15.0, 17.0, 20.0,
                           22.5, 25.0, 27.0, 28.2, 30.5, 33.0, 36.0, 38.0, 40.5, 45.0, 50.0, 53.0, 55.0, 55.8,
                           57.0, 58.5, 59.15])
    else:
        full(args.out)
