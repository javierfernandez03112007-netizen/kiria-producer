"""Reel «Inflación 4,9 %: el boss final de tu cartera» — kiria.ai

    python3 projects/inflacion/render_inflacion.py --preview     # fotogramas clave + hoja de contactos
    python3 projects/inflacion/render_inflacion.py               # render completo 1080x1920 a 30 fps

Tiempos sacados de `python3 -m engine.audio assets/voz.mp3 script_tts.txt tiempos.json`
(silencios RMS + DP); los cortes de escena caen en mitad de las pausas entre frases.
"""
import argparse
import os
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))

from engine.fin_draw import (W, H, FPS, HEX, NAVY, MINT, AMBER, WHITE, INK, MIST, STEEL, clamp, prog, eo, eio,  # noqa
                             eback, env, lerp, paste, text, wrap, glass, rrect, halo, chip, coin, icon, crate, npc,
                             scenery, photo, camera, solid, blend, line, shadow)
from engine import post  # noqa: E402

# ------------------------------------------------------------------ configuración
AUDIO = os.path.join(ROOT, "assets", "voz.mp3")
OUT = os.path.join(ROOT, "out")
USAR_FOTOS = True  # si existe assets/<fondo>.jpg se usa la foto; si no, el fondo procedimental
FONDOS = ["juego", "cafeteria", "fruteria", "restaurante", "obra", "aula", "ciudad"]

# Cortes de escena (s): mitad de la pausa entre frases
B = [0.0, 2.67, 8.24, 15.75, 21.66, 26.45, 32.86, 36.20, 39.78, 45.99, 51.28, 54.31]
END = 57.90  # la voz acaba en 56.91; se deja el logo en pantalla
TR = 0.20    # media transición (zoom-through total 0,4 s)

# Momentos clave dentro de las frases (pausas internas medidas)
K = dict(
    nueve=3.95, mas_alta=5.53,                                   # frase 2
    cafe=10.12, mas49=11.79, serian=14.37,                       # frase 3
    sitodo=16.9, frutero=19.28, gana=20.78,                      # frase 4
    costes=22.7, menu=24.09, margen=25.44,                       # frase 5
    pesa=27.27, diez=28.43, combustible=31.27,                   # frase 6
    sueldo=33.85,                                                # frase 7
    once=38.0,                                                   # frase 8
    ahora=39.92, diezmil=40.64, pierden=42.58, n467=43.25,       # frase 9
    tres=46.13, q1=47.15, q2=48.34, q3=49.19,                    # frase 10
    esto=51.59, juego=52.40, dinero=53.12,                       # frases 11-12
    como=54.45, leo=55.86,                                       # frase 13
)

# Vida "PODER ADQUISITIVO" (metáfora visual, sin cifra en pantalla): (instante, valor)
HITS = [(0, 100), (4.30, 94), (12.0, 86), (18.0, 79), (24.3, 72), (29.6, 62), (35.0, 55), (38.4, 50), (43.4, 30)]

DISCLAIMER = "No es asesoramiento financiero"


def eur(v, dec=0):
    s = f"{v:,.{dec}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return s + " €"


# ------------------------------------------------------------------ fondos
@lru_cache(None)
def fondo(key):
    if USAR_FOTOS:
        for ext in (".jpg", ".jpeg", ".png", ".webp"):
            p = os.path.join(ROOT, "assets", key + ext)
            if os.path.exists(p):
                img = photo(p)
                if img is not None:
                    return img
    return scenery(key, seed=FONDOS.index(key) + 3)


@lru_cache(1)
def scanlines():
    m = np.zeros((H, W), np.float32)
    m[::4] = 1
    return m


# ------------------------------------------------------------------ piezas de juego
def burst(img, t, t0, x, y, color, n=18, seed=0, spd=520, life=0.9):
    age = t - t0
    if age < 0 or age > life:
        return
    rng = np.random.default_rng(seed)
    for _ in range(n):
        ang = rng.uniform(-np.pi * 0.95, -np.pi * 0.05)
        v = rng.uniform(0.35, 1.0) * spd
        px = x + np.cos(ang) * v * age
        py = y + np.sin(ang) * v * age + 700 * age ** 2
        k = 1 - age / life
        halo(img, px, py, 6 + 12 * k, color, 0.9 * k)


def damage(img, t, t0, txt, x, y, size=96, color=HEX["amber"], life=1.3, rise=170):
    age = (t - t0) / life
    if age < 0 or age > 1:
        return
    sp = text(txt, size, "black", color, shadow=0.6)
    a = 1 - prog(age, 0.7, 0.3)
    paste(img, sp, x, y - rise * eo(age), a, scale=eback(prog(t, t0, 0.28)))


def bob(t, amp=6, f=1.3, ph=0.0):
    return amp * np.sin(2 * np.pi * f * t + ph)


def place_npc(img, role, t, t_in, x, foot, h=540, side=-1):
    a = eo(prog(t, t_in, 0.45))
    if a <= 0:
        return
    sp = npc(role, h)
    dx = side * 160 * (1 - a)
    # sombra de suelo
    sh = np.zeros((40, 300), np.float32)
    cv2.ellipse(sh, (150, 20), (120, 14), 0, 0, 360, 1, -1, cv2.LINE_AA)
    sh = cv2.GaussianBlur(sh, (0, 0), 6)
    blend(img, x - 150 + dx, foot - 22, solid(300, 40, INK)[0], sh, 0.6 * a)
    paste(img, sp, x + dx, foot + bob(t, 4, 0.9), a, anchor="b")
    # marcador de misión sobre la cabeza
    halo(img, x + dx, foot - h - 40 + bob(t, 8, 1.4), 26, AMBER, 0.8 * a)
    paste(img, text("!", 54, "black", HEX["amber"]), x + dx, foot - h - 40 + bob(t, 8, 1.4), a)


def dialog(img, t, t0, name, msg, y=1190, t1=None, cps=30, h=230):
    if t < t0 or (t1 is not None and t > t1):
        return
    a = eo(prog(t, t0, 0.3)) * (1 - prog(t, t1 - 0.25, 0.25) if t1 else 1)
    yy = y + 40 * (1 - eo(prog(t, t0, 0.3)))
    glass(img, 60, yy, 960, h, 34, ta=0.72, alpha=a, border=MINT, ba=0.5)
    paste(img, chip(name, 30, HEX["navy"], HEX["mint"], "bold"), 100, yy - 22, a, anchor="tl")
    wrapped = wrap(msg, 50, "semi", 860)
    n = int((t - t0 - 0.2) * cps)
    if n > 0:
        shown = wrapped[:n]
        paste(img, text(shown, 50, "semi", HEX["white"], align="l", shadow=0.3), 96, yy + 52, a, anchor="tl")
    if n >= len(wrapped) and int(t * 2.5) % 2 == 0:
        tri = np.array([[960, yy + h - 48], [990, yy + h - 48], [975, yy + h - 26]], np.int32)
        ov = img.copy()
        cv2.fillPoly(ov, [tri], MINT, cv2.LINE_AA)
        img[:] = img * (1 - a) + ov * a


def level_card(img, t, t0, label, name, label_col=HEX["mint"], y=640):
    age = t - t0
    if age < 0 or age > 1.75:
        return
    a = eo(prog(age, 0, 0.3)) * (1 - prog(age, 1.45, 0.3))
    s = eback(prog(age, 0, 0.4))
    dy = -40 * prog(age, 1.45, 0.3)
    glass(img, 90, y - 150 + dy, 900, 300, 44, ta=0.9, alpha=a, glow=MINT if label_col == HEX["mint"] else AMBER)
    paste(img, text(label, 40, "mono", label_col, tracking=0.3), W / 2, y - 70 + dy, a, scale=s)
    paste(img, text(name, 100, "black", HEX["white"]), W / 2, y + 40 + dy, a, scale=s)
    w = int(330 * eo(prog(age, 0.1, 0.5)))
    rrect(img, W / 2 - 20 - w - 140, y - 72 + dy, w, 4, 2, MINT, a * 0.7)
    rrect(img, W / 2 + 160, y - 72 + dy, w, 4, 2, MINT, a * 0.7)


def level_tag(img, t, t0, txt, alpha=1.0):
    a = eo(prog(t, t0 + 1.6, 0.4)) * alpha
    paste(img, chip(txt, 28, HEX["white"], HEX["navy"], "bold", bga=0.75), 66, 330, a, anchor="tl")


def counter(v0, v1, t, t0, d):
    return lerp(v0, v1, eio(prog(t, t0, d)))


# ------------------------------------------------------------------ HUD
def hp_at(t, lag=0.0, dur=0.35):
    v = HITS[0][1]
    for (t0, a), (t1, b) in zip(HITS, HITS[1:]):
        if t >= t1 + lag:
            v = b
            continue
        v = lerp(a, b, eio(prog(t, t1 + lag, dur)))
        break
    return v


def hud(img, t, alpha):
    if alpha <= 0.01:
        return
    dy = -60 * (1 - eo(prog(t, 3.0, 0.5)))
    y = 150 + dy
    glass(img, 60, y, 960, 150, 32, ta=0.7, alpha=alpha, ba=0.3)
    paste(img, icon("heart", 34, HEX["mint"]), 100, y + 40, alpha, anchor="l")
    paste(img, text("PODER ADQUISITIVO", 26, "mono", HEX["mint"], tracking=0.12, shadow=0), 142, y + 40, alpha,
          anchor="l")
    bx, by, bw, bh = 100, y + 78, 560, 34
    rrect(img, bx, by, bw, bh, 17, INK, 0.9 * alpha)
    cur, trail = hp_at(t), hp_at(t, lag=0.3, dur=0.9)
    rrect(img, bx + 3, by + 3, (bw - 6) * trail / 100, bh - 6, 14, AMBER, 0.9 * alpha)
    col = MINT if cur > 40 else AMBER
    rrect(img, bx + 3, by + 3, (bw - 6) * cur / 100, bh - 6, 14, col, alpha)
    for i in range(1, 10):
        rrect(img, bx + bw * i / 10 - 1, by + 4, 2, bh - 8, 1, INK, 0.5 * alpha)
    # flash de golpe
    for th, _ in HITS[1:]:
        if 0 <= t - th < 0.25:
            rrect(img, bx, by, bw, bh, 17, WHITE, 0.5 * (1 - (t - th) / 0.25) * alpha, add=True)
    # monedero
    lost = t >= K["pierden"]
    paste(img, text("PODER DE COMPRA" if lost else "TU DINERO", 22, "mono",
                    HEX["amber"] if lost else HEX["mist"], tracking=0.1, shadow=0), 718, y + 40, alpha, anchor="l")
    paste(img, coin(26), 740, y + 100, alpha)
    v = counter(10000, 9533, t, K["pierden"] + 0.1, 1.3)
    paste(img, text(eur(v), 46, "black", HEX["amber"] if lost else HEX["white"]), 776, y + 100, alpha, anchor="l")


# ------------------------------------------------------------------ escenas
def s_titulo(img, t, t0, t1):
    a = eo(prog(t, 0.05, 0.35))
    paste(img, text("IPC · SEPTIEMBRE 2026", 32, "mono", HEX["mist"], tracking=0.25), W / 2, 560, a)
    paste(img, text("INFLACIÓN", 150, "black", HEX["white"], tracking=0.01), W / 2, 760, a, scale=eback(prog(t, 0, .4)))
    halo(img, W / 2, 1000, 330, AMBER, 0.28 * eo(prog(t, 0.4, 0.4)))
    paste(img, text("4,9 %", 270, "black", HEX["amber"]), W / 2, 1000, eo(prog(t, 0.35, 0.3)),
          scale=eback(prog(t, 0.35, 0.45)))
    if int(t * 2.2) % 2 == 0 and t > 0.8:
        paste(img, text("PULSA START", 40, "mono", HEX["white"], tracking=0.3), W / 2, 1290, 0.85)


def s_boss(img, t, t0, t1):
    a = eo(prog(t, t0 + 0.15, 0.3))
    pulse = 0.5 + 0.5 * np.sin(t * 6)
    paste(img, chip("BOSS FINAL", 40, HEX["navy"], HEX["amber"], "black"), W / 2, 450, a,
          scale=eback(prog(t, t0 + 0.15, 0.4)))
    paste(img, text("INFLACIÓN ANUAL", 36, "mono", HEX["mist"], tracking=0.2), W / 2, 545, a)
    ta = prog(t, K["nueve"], 0.3)
    shake = 6 * np.sin(t * 47) * (1 - prog(t, K["nueve"], 1.0))
    halo(img, W / 2, 700, 360, AMBER, (0.22 + 0.1 * pulse) * ta)
    paste(img, text("4,9 %", 300, "black", HEX["amber"]), W / 2 + shake, 700, eo(ta), scale=eback(ta))
    # barra de vida del boss
    by = 950
    paste(img, text("IPC · SEPTIEMBRE 2026", 26, "mono", HEX["white"], tracking=0.15), W / 2, by - 34, a)
    rrect(img, 190, by, 700, 30, 15, INK, 0.9 * a)
    fill = eo(prog(t, K["nueve"], 0.8))
    rrect(img, 193, by + 3, 694 * fill, 24, 12, AMBER, a)
    burst(img, t, K["nueve"], W / 2, 740, AMBER, 26, 1, 700)
    # datos
    gy = 1050
    ga = eo(prog(t, K["mas_alta"], 0.35))
    glass(img, 90, gy + 30 * (1 - ga), 900, 330, 40, alpha=ga)
    paste(img, text("La más alta desde\nfebrero de 2023", 54, "bold", HEX["white"], align="c"), W / 2, gy + 95, ga)
    a2 = eo(prog(t, K["mas_alta"] + 0.9, 0.3))
    paste(img, chip("+6 décimas vs. agosto", 32, HEX["navy"], HEX["amber"]), W / 2 - 190, gy + 210, a2)
    paste(img, chip("Subyacente: 3,1 %", 32, HEX["white"], HEX["slate"]), W / 2 + 215, gy + 210, a2)
    paste(img, text("Fuente: INE, 14/10/2026", 26, "med", HEX["mist"]), W / 2, gy + 290,
          eo(prog(t, K["mas_alta"] + 1.3, 0.3)))


def s_cafeteria(img, t, t0, t1):
    place_npc(img, "camarero", t, t0 + 0.3, 250, 1150, 540)
    level_tag(img, t, t0 + 0.12, "NIVEL 1 · LA CAFETERÍA")
    # ticket
    ta = eo(prog(t, K["cafe"], 0.4))
    if ta > 0:
        lift = -40 * eo(prog(t, K["mas49"], 0.6))
        x, y, w, h = 500, 520 + 60 * (1 - ta) + lift, 480, 560
        shadow(img, x, y, w, h, 24, 0.55 * ta)
        rrect(img, x, y, w, h, 24, (0.92, 0.95, 0.96), ta)
        paste(img, text("TICKET", 30, "mono", HEX["navy"], tracking=0.3, shadow=0), x + w / 2, y + 60, ta)
        paste(img, icon("cup", 120, HEX["navy"], HEX["amber"]), x + w / 2, y + 170, ta)
        paste(img, text("Café", 48, "bold", HEX["navy"], shadow=0), x + 40, y + 300, ta, anchor="l")
        p = counter(1.50, 1.57, t, K["serian"], 0.6)
        up = t >= K["serian"]
        paste(img, text(eur(p, 2), 56, "black", "#C77A12" if up else HEX["navy"], shadow=0), x + w - 40, y + 300,
              ta, anchor="r")
        for i in range(14):
            rrect(img, x + 40 + i * 29, y + 360, 14, 4, 2, (0.6, 0.62, 0.66), ta)
        paste(img, text("+4,9 %", 44, "black", "#C77A12", shadow=0), x + w - 40, y + 425,
              ta * eo(prog(t, K["mas49"], 0.3)), anchor="r")
        paste(img, text("subida", 34, "semi", HEX["slate"], shadow=0), x + 40, y + 425,
              ta * eo(prog(t, K["mas49"], 0.3)), anchor="l")
        paste(img, chip("EJEMPLO", 28, HEX["navy"], HEX["amber"], "black"), x + w - 20, y - 6, ta, anchor="tr")
        burst(img, t, K["mas49"], x + w - 120, y + 300, AMBER, 20, 3)
        burst(img, t, K["serian"], x + w - 120, y + 300, AMBER, 20, 4)
        damage(img, t, K["mas49"], "+4,9 %", x + w / 2, y + 240, 92)
    dialog(img, t, K["mas49"] + 0.5, "CAMARERO", "¡Mi café ya no cuesta lo mismo!", t1=t1)


def s_fruteria(img, t, t0, t1):
    place_npc(img, "frutero", t, t0 + 0.3, 860, 1130, 520, side=1)
    level_tag(img, t, t0 + 0.12, "NIVEL 2 · LA FRUTERÍA")
    fr = [(HEX["amber"], "#F2D14B"), ("#7FD36B", "#4FBF6A"), ("#E0A33A", HEX["amber"])]
    for i, (c1, c2) in enumerate(fr):
        x = 150 + i * 235
        a = eo(prog(t, t0 + 0.5 + i * 0.12, 0.4))
        paste(img, crate(220, 200, c1, c2, i), x, 1130 + 50 * (1 - a), a, anchor="b")
        ti = K["sitodo"] + 0.25 * i
        ta = eback(prog(t, ti, 0.35))
        fl = -30 * eo(prog(t, ti, 1.5)) + bob(t, 5, 1.1, i)
        if t >= ti:
            paste(img, chip("+4,9 %", 34, HEX["navy"], HEX["white"], "black"), x, 840 + fl, 1.0, scale=ta)
            burst(img, t, ti, x, 860, MINT, 12, 10 + i, 380)
    ea = eo(prog(t, K["sitodo"] - 0.4, 0.3))
    paste(img, chip("EJEMPLO · si todo sube un 4,9 %", 30, HEX["navy"], HEX["amber"], "bold"), W / 2, 560, ea)
    dialog(img, t, t0 + 1.0, "FRUTERO", "¿Y ahora qué hago?", t1=K["frutero"] - 0.15)
    # menú de elección tipo RPG
    if t >= K["frutero"]:
        a = eo(prog(t, K["frutero"], 0.3))
        y = 1190
        glass(img, 60, y, 960, 250, 34, ta=0.75, alpha=a, border=MINT, ba=0.5)
        paste(img, chip("FRUTERO", 30, HEX["navy"], HEX["mint"]), 100, y - 22, a, anchor="tl")
        opts = ["Subir precios", "Ganar menos"]
        sel = 1 if t >= K["gana"] else 0
        for i, o in enumerate(opts):
            oy = y + 85 + i * 90
            oa = a * eo(prog(t, K["frutero"] + (0 if i == 0 else K["gana"] - K["frutero"] - 0.3), 0.3))
            on = i == sel
            if on:
                rrect(img, 90, oy - 38, 900, 76, 20, MINT, 0.18 * oa)
                tri = np.array([[118, oy - 18], [118, oy + 18], [146, oy]], np.int32)
                cv2.fillPoly(img, [tri], MINT, cv2.LINE_AA)
            paste(img, text(o, 50, "bold", HEX["white"] if on else HEX["mist"]), 170, oy, oa, anchor="l")


def s_restaurante(img, t, t0, t1):
    place_npc(img, "cocinero", t, t0 + 0.3, 235, 1140, 540)
    level_tag(img, t, t0 + 0.12, "NIVEL 3 · EL RESTAURANTE")
    a = eo(prog(t, t0 + 0.5, 0.4))
    x, y, w, h = 470, 520 + 40 * (1 - a), 540, 630
    glass(img, x, y, w, h, 40, alpha=a, ta=0.7)
    paste(img, icon("fork", 70, HEX["mint"]), x + w / 2, y + 70, a)
    paste(img, text("MENÚ DEL DÍA", 50, "black", HEX["white"]), x + w / 2, y + 150, a)
    for i, s in enumerate(["Primero", "Segundo", "Postre"]):
        paste(img, text(s, 36, "semi", HEX["mist"]), x + w / 2, y + 225 + i * 50, a)
    # precio ↑
    pa = eo(prog(t, K["menu"], 0.3))
    paste(img, text("PRECIO", 34, "mono", HEX["white"], tracking=0.15), x + 50, y + 430, a, anchor="l")
    paste(img, icon("arrow_up", 60, HEX["amber"]), x + w - 80, y + 430 - 14 * eo(pa), pa, scale=eback(pa))
    # margen ↓
    paste(img, text("MARGEN", 34, "mono", HEX["white"], tracking=0.15), x + 50, y + 530, a, anchor="l")
    m = lerp(1.0, 0.32, eio(prog(t, K["margen"], 0.8)))
    rrect(img, x + 50, y + 570, w - 100, 26, 13, INK, 0.9 * a)
    rrect(img, x + 53, y + 573, (w - 106) * m, 20, 10, MINT if m > 0.6 else AMBER, a)
    ca = eo(prog(t, K["costes"], 0.3))
    paste(img, chip("si suben los costes…", 32, HEX["navy"], HEX["amber"]), x + w / 2, 445, ca)
    burst(img, t, K["menu"], x + w - 80, y + 430, AMBER, 14, 21)
    burst(img, t, K["margen"] + 0.6, x + 53 + (w - 106) * 0.32, y + 583, AMBER, 14, 22)
    dialog(img, t, t0 + 1.4, "COCINERO", "Algo tiene que ceder.", t1=t1)


def s_obra(img, t, t0, t1):
    place_npc(img, "obrero", t, t0 + 0.3, 170, 1110, 500)
    place_npc(img, "maestro_obra", t, t0 + 0.5, 395, 1110, 520)
    level_tag(img, t, t0 + 0.12, "NIVEL 4 · LA OBRA")
    a = eo(prog(t, K["pesa"], 0.4))
    x, y, w, h = 560, 470 + 40 * (1 - a), 450, 520
    glass(img, x, y, w, h, 40, alpha=a, ta=0.7, glow=AMBER if t > K["diez"] else None)
    paste(img, icon("truck", 120, HEX["white"], HEX["mint"]), x + w / 2, y + 95, a)
    paste(img, text("TRANSPORTE", 34, "mono", HEX["mist"], tracking=0.15), x + w / 2, y + 195, a)
    v = counter(0, 10.5, t, K["diez"], 1.0)
    na = eo(prog(t, K["diez"], 0.2))
    paste(img, text("+" + f"{v:.1f}".replace(".", ",") + " %", 92, "black", HEX["amber"]), x + w / 2, y + 315, na)
    paste(img, text("tasa anual · INE", 32, "med", HEX["mist"]), x + w / 2, y + 420, na)
    burst(img, t, K["diez"] + 1.0, x + w / 2, y + 315, AMBER, 24, 31, 600)
    fa = eo(prog(t, K["combustible"], 0.3))
    paste(img, icon("fuel", 54, HEX["navy"], HEX["amber"]), x + 30, y + h + 70, fa, anchor="l")
    paste(img, chip("sobre todo, combustibles", 30, HEX["navy"], HEX["amber"]), x + 92, y + h + 70, fa,
          anchor="l", scale=eback(fa))
    dialog(img, t, t0 + 1.2, "MAESTRO DE OBRA", "Cada viaje del camión cuenta.", t1=t1)


def s_colegio(img, t, t0, t1):
    place_npc(img, "maestra", t, t0 + 0.3, 870, 1130, 520, side=1)
    level_tag(img, t, t0 + 0.12, "NIVEL 5 · EL COLEGIO")
    a = eo(prog(t, t0 + 0.4, 0.4))
    x, y, w, h = 70, 480 + 40 * (1 - a), 640, 560
    glass(img, x, y, w, h, 40, alpha=a, ta=0.7)
    paste(img, text("Sueldo vs. precios", 44, "bold", HEX["white"]), x + 40, y + 60, a, anchor="l")
    paste(img, chip("ilustrativo", 24, HEX["white"], HEX["slate"], "semi"), x + w - 40, y + 60, a, anchor="r")
    gx, gy, gw, gh = x + 50, y + 130, w - 100, 330
    line(img, (gx, gy + gh), (gx + gw, gy + gh), MIST, 3, 0.6 * a)
    line(img, (gx, gy), (gx, gy + gh), MIST, 3, 0.6 * a)
    p = eio(prog(t, K["sueldo"], 1.8))
    n = 40
    pts_s = [(gx + gw * i / n, gy + gh * 0.62) for i in range(n + 1)]
    pts_p = [(gx + gw * i / n, gy + gh * (0.62 - 0.5 * (i / n) ** 1.5)) for i in range(n + 1)]
    m = int(n * p)
    for pts, col in ((pts_s, MINT), (pts_p, AMBER)):
        for i in range(m):
            line(img, pts[i], pts[i + 1], col, 7, a)
    if m > 0:
        paste(img, text("PRECIOS", 30, "mono", HEX["amber"]), pts_p[m][0] - 10, pts_p[m][1] - 36, a, anchor="r")
        paste(img, text("SUELDO", 30, "mono", HEX["mint"]), pts_s[m][0] - 10, pts_s[m][1] + 36, a, anchor="r")
        halo(img, *pts_p[m], 22, AMBER, 0.9)
        halo(img, *pts_s[m], 22, MINT, 0.9)
    dialog(img, t, t0 + 1.0, "MAESTRA", "La cesta de la compra no espera.", t1=t1)


def s_ahorro(img, t, t0, t1):
    a = eo(prog(t, t0 + 0.15, 0.35))
    paste(img, chip("MIENTRAS TANTO, EN LOS HOGARES", 30, HEX["white"], HEX["navy"], "bold", bga=0.8), W / 2, 395, a)
    py = 690 + bob(t, 6, 1.0)
    halo(img, W / 2, py, 230, MINT, 0.16 * a)
    paste(img, icon("piggy", 300, HEX["white"], HEX["mint"]), W / 2, py, a, scale=eback(prog(t, t0 + 0.15, 0.45)))
    # monedas que salen
    for i in range(6):
        ti = K["once"] + 0.18 * i
        age = t - ti
        if 0 <= age < 1.2:
            cx = W / 2 + (i - 2.5) * 50
            cy = py + 120 + 600 * age ** 2 * 0.9
            paste(img, coin(30), cx, cy, 1 - age / 1.2, sx=abs(np.cos(age * 8 + i)) + 0.05)
    ga = eo(prog(t, t0 + 0.5, 0.35))
    gy = 920
    glass(img, 90, gy + 30 * (1 - ga), 900, 360, 40, alpha=ga)
    paste(img, text("TASA DE AHORRO DE LOS HOGARES", 30, "mono", HEX["mist"], tracking=0.08), W / 2, gy + 60, ga)
    na = prog(t, K["once"], 0.3)
    paste(img, text("11 %", 160, "black", HEX["white"]), W / 2 - 120, gy + 180, eo(na), scale=eback(na))
    paste(img, text("de la renta", 38, "semi", HEX["white"], align="l"), W / 2 + 70, gy + 150,
          eo(na), anchor="l")
    paste(img, chip("-6 décimas", 32, HEX["navy"], HEX["amber"]), W / 2 + 70, gy + 215, eo(prog(t, K["once"] + .4, .3)),
          anchor="l")
    paste(img, text("2.º trimestre · Funcas", 28, "med", HEX["mist"]), W / 2, gy + 310, ga)


def s_tu(img, t, t0, t1):
    level_tag(img, t, t0 + 0.12, "NIVEL FINAL · TÚ")
    a = eo(prog(t, K["diezmil"] - 0.3, 0.4))
    x, y, w, h = 230, 530 + 50 * (1 - a), 620, 680
    glass(img, x, y, w, h, 70, alpha=a, ta=0.78, ba=0.45)
    rrect(img, x + w / 2 - 70, y + 22, 140, 26, 13, INK, a)
    paste(img, text("Tu cuenta", 38, "semi", HEX["mist"]), x + w / 2, y + 120, a)
    paste(img, text("10.000 €", 110, "black", HEX["white"]), x + w / 2, y + 230, a, scale=eback(prog(t, K["diezmil"], .4)))
    paste(img, chip("parados 1 año", 30, HEX["white"], HEX["slate"]), x + w / 2, y + 330, eo(prog(t, K["diezmil"] + .5, .3)))
    rrect(img, x + 60, y + 400, w - 120, 2, 1, MIST, 0.5 * a)
    pa = eo(prog(t, K["pierden"], 0.3))
    paste(img, text("PODER DE COMPRA", 32, "mono", HEX["amber"], tracking=0.15), x + w / 2, y + 470, pa)
    v = counter(10000, 9533, t, K["pierden"] + 0.1, 1.3)
    paste(img, text(eur(v), 96, "black", HEX["amber"]), x + w / 2, y + 575, pa)
    damage(img, t, K["n467"], "-467 €", W / 2, 470, 120, life=1.6, rise=60)
    burst(img, t, K["n467"], W / 2, 470, AMBER, 34, 41, 800, 1.1)
    ca = eo(prog(t, K["n467"] + 1.2, 0.35))
    glass(img, 120, 1250, 840, 150, 36, alpha=ca, glow=AMBER)
    paste(img, text("≈ -467 € de poder de compra", 44, "bold", HEX["white"]), W / 2, 1305, ca)
    paste(img, text("10.000 € · 1 año · inflación 4,9 %", 30, "med", HEX["mist"]), W / 2, 1360, ca)


def s_preguntas(img, t, t0, t1):
    a = eo(prog(t, K["tres"], 0.3))
    paste(img, text("TRES PREGUNTAS", 66, "black", HEX["white"]), W / 2, 460, a, scale=eback(prog(t, K["tres"], .4)))
    qs = [("1", "¿Cuánto tengo parado?", K["q1"]), ("2", "¿Qué me rinde?", K["q2"]),
          ("3", "¿Cuánto me cuesta\nno decidir?", K["q3"])]
    last = max(i for i, q in enumerate(qs) if t >= q[2] - 0.05) if t >= qs[0][2] - 0.05 else -1
    for i, (n, q, tq) in enumerate(qs):
        f = prog(t, tq - 0.05, 0.4)
        if f <= 0:
            continue
        sx = max(0.02, abs(np.cos((1 - eo(f)) * np.pi / 2)))  # giro de carta
        y = 580 + i * 250
        cw, ch = 900, 210
        # se compone la carta en su propio lienzo y se escala en x para el giro
        layer = img[int(y - 30):int(y + ch + 30), 60:60 + cw + 60].copy()
        glass(layer, 30, 30, cw, ch, 36, alpha=1.0, ta=0.78, shade=False, glow=MINT if i == last else None)
        rrect(layer, 70, 30 + ch / 2 - 50, 100, 100, 50, MINT if i == last else STEEL, 1.0)
        paste(layer, text(n, 60, "black", HEX["navy"] if i == last else HEX["white"], shadow=0), 120, 30 + ch / 2, 1.0)
        paste(layer, text(q, 52, "bold", HEX["white"], align="l"), 210, 30 + ch / 2, 1.0, anchor="l")
        lh, lw = layer.shape[:2]
        nw = max(2, int(lw * sx))
        sq = cv2.resize(layer, (nw, lh))
        m = np.ones((lh, nw), np.float32)
        blend(img, 60 + (lw - nw) / 2, y - 30, sq, m, eo(f))
        if i == last:
            halo(img, 60 + 70 + 50, y + ch / 2, 70, MINT, 0.25 * eo(f))


def s_giro(img, t, t0, t1):
    out = prog(t, K["dinero"] - 0.15, 0.25)
    a1 = eo(prog(t, K["esto"], 0.25)) * (1 - out)
    paste(img, text("ESTO NO ES", 110, "black", HEX["white"]), W / 2, 820 - 40 * out, a1,
          scale=eback(prog(t, K["esto"], .35)))
    a2 = eo(prog(t, K["juego"] - 0.15, 0.2)) * (1 - out)
    paste(img, text("UN JUEGO", 130, "black", HEX["amber"]), W / 2, 960 - 40 * out, a2,
          scale=eback(prog(t, K["juego"] - .15, .35)))
    b = eo(prog(t, K["dinero"], 0.3))
    paste(img, text("ES TU DINERO", 110, "black", HEX["white"]), W / 2, 830, b, scale=eback(prog(t, K["dinero"], .4)))
    halo(img, W / 2, 970, 300, MINT, 0.18 * b)
    paste(img, text("DE VERDAD", 120, "black", HEX["mint"]), W / 2, 970, b, scale=eback(prog(t, K["dinero"] + .2, .4)))
    paste(img, text(DISCLAIMER, 30, "med", HEX["mist"]), W / 2, 1400, 0.85 * eo(prog(t, K["esto"], 0.4)))


def s_cierre(img, t, t0, t1):
    a = eo(prog(t, K["como"], 0.3))
    paste(img, text("¿Cómo te está\nafectando a ti?", 96, "black", HEX["white"]), W / 2, 700, a,
          scale=eback(prog(t, K["como"], .4)))
    b = eo(prog(t, K["leo"], 0.3))
    paste(img, text("Te leo en comentarios", 52, "semi", HEX["mint"]), W / 2, 920, b)
    paste(img, icon("arrow_down", 70, HEX["mint"]), W / 2, 1020 + abs(bob(t, 18, 1.2)), b)
    c = eo(prog(t, K["leo"] + 0.6, 0.4))
    halo(img, W / 2, 1220, 260, MINT, 0.18 * c)
    paste(img, text("kiria.ai", 120, "black", HEX["white"]), W / 2, 1220, c, scale=eback(prog(t, K["leo"] + .6, .5)))
    paste(img, text(DISCLAIMER, 30, "med", HEX["mist"]), W / 2, 1400, 0.85 * a)


# (función, fondo, cámara z0, z1, pan)
SCENES = [
    (s_titulo, "juego", 1.00, 1.08, (0, -30)),
    (s_boss, "juego", 1.10, 1.02, (0, 40)),
    (s_cafeteria, "cafeteria", 1.00, 1.07, (40, 0)),
    (s_fruteria, "fruteria", 1.06, 1.00, (-40, 10)),
    (s_restaurante, "restaurante", 1.00, 1.07, (30, -20)),
    (s_obra, "obra", 1.07, 1.00, (-30, 30)),
    (s_colegio, "aula", 1.00, 1.06, (30, 0)),
    (s_ahorro, "ciudad", 1.00, 1.06, (0, -40)),
    (s_tu, "ciudad", 1.08, 1.01, (-30, 20)),
    (s_preguntas, "juego", 1.00, 1.05, (0, 30)),
    (s_giro, "ciudad", 1.00, 1.04, (20, 0)),
    (s_cierre, "ciudad", 1.04, 1.00, (0, -20)),
]
assert len(SCENES) == len(B)

# rótulos «cambio de nivel» (se dibujan encima de todo lo de la escena)
LEVELS = {2: ("NIVEL 1", "LA CAFETERÍA", HEX["mint"], 640), 3: ("NIVEL 2", "LA FRUTERÍA", HEX["mint"], 640),
          4: ("NIVEL 3", "EL RESTAURANTE", HEX["mint"], 640), 5: ("NIVEL 4", "LA OBRA", HEX["mint"], 640),
          6: ("NIVEL 5", "EL COLEGIO", HEX["mint"], 640), 8: ("NIVEL FINAL", "TÚ", HEX["amber"], 640)}


def world(i, t):
    fn, bg, z0, z1, pan = SCENES[i]
    t0 = B[i]
    t1 = B[i + 1] if i + 1 < len(B) else END
    img = camera(fondo(bg), t - t0, t1 - t0, z0, z1, pan)
    if i == len(SCENES) - 1:
        img *= 0.8
    fn(img, t, t0, t1)
    if i in LEVELS:
        label, name, col, y = LEVELS[i]
        level_card(img, t, t0 + 0.12, label, name, col, y)
    return img


def render(fi):
    t = fi / FPS
    i = max(j for j, b in enumerate(B) if t >= b)
    img = world(i, t)
    # zoom-through de 0,4 s entre escenas
    nb = B[i + 1] if i + 1 < len(B) else None
    if nb is not None and t > nb - TR:
        p = prog(t, nb - TR, TR)
        img = post.zoom_blur(img, 1 + 0.6 * p ** 2, p)
    if i > 0 and t < B[i] + TR:
        p = prog(t, B[i], TR)
        img = post.zoom_blur(img, lerp(1.35, 1.0, eo(p)), 1 - p)
    for b in B[1:]:
        if abs(t - b) < TR:
            img += (1 - abs(t - b) / TR) ** 2 * 0.16
    post.vignette(img)
    # capa de juego: líneas de barrido + HUD; desaparecen con el glitch de «Esto no es un juego»
    game = 1 - prog(t, K["juego"], 0.5)
    if game > 0 and t < K["juego"] + 0.5:
        img *= 1 - 0.05 * game * scanlines()[..., None]
    hud_a = eo(prog(t, 2.9, 0.4)) * game
    hud(img, t, hud_a)
    gl = 0.0
    if t < 0.4:
        gl = 1 - t / 0.4
    for g0 in (1.72, 2.2):
        if 0 <= t - g0 < 0.12:
            gl = max(gl, 0.6)
    if K["juego"] - 0.1 <= t < K["juego"] + 0.55:
        gl = max(gl, 0.9 * (1 - abs(t - K["juego"] - 0.2) / 0.35))
    img = post.glitch(img, clamp(gl), fi)
    if i < len(SCENES) - 1:
        post.brand(img)
    post.grain(img, fi)
    return post.finish(img)


def render_bytes(fi):
    return render(fi).tobytes()


def preview(times):
    os.makedirs(os.path.join(OUT, "preview"), exist_ok=True)
    thumbs = []
    with Pool(min(4, os.cpu_count() or 2)) as pool:
        frames = pool.map(render, [int(round(x * FPS)) for x in times])
    for x, fr in zip(times, frames):
        p = os.path.join(OUT, "preview", f"t{x:05.2f}.jpg")
        cv2.imwrite(p, fr, [cv2.IMWRITE_JPEG_QUALITY, 90])
        th = cv2.resize(fr, (270, 480), interpolation=cv2.INTER_AREA)
        cv2.putText(th, f"{x:.2f}s", (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)
        thumbs.append(th)
    cols = 6
    while len(thumbs) % cols:
        thumbs.append(np.zeros_like(thumbs[0]))
    rows = [np.hstack(thumbs[r:r + cols]) for r in range(0, len(thumbs), cols)]
    sheet = os.path.join(OUT, "preview", "hoja_contactos.jpg")
    cv2.imwrite(sheet, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
    print("preview →", sheet)


def full(dst):
    n = int(END * FPS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", AUDIO, "-filter_complex", "[1:a]loudnorm=I=-15:TP=-1.5:LRA=11,apad[a]",
           "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", dst]
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
    ap.add_argument("--t", type=float, nargs="*", help="instantes concretos para --preview")
    ap.add_argument("--out", default=os.path.join(OUT, "inflacion.mp4"))
    args = ap.parse_args()
    if args.preview:
        ts = args.t or [0.6, 1.9, 4.6, 7.4, 9.0, 13.0, 15.0, 17.6, 20.0, 21.2, 23.0, 25.9, 27.6, 30.3, 32.2,
                        34.0, 35.8, 38.8, 40.3, 43.6, 45.5, 49.8, 52.0, 52.55, 53.8, 57.2]
        preview(ts)
    else:
        full(args.out)
