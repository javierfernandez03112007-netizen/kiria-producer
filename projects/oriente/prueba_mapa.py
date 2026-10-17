"""Dos fotogramas de prueba de estilo (no es el vídeo): rutas desde el Golfo y zoom a Ormuz."""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import W, H, HEX, MINT, AMBER, WHITE, text, paste, halo, chip, glass, hex_bgr  # noqa
from engine.geo import Globe, render_globe, draw_arc  # noqa
from engine import post  # noqa

HORMUZ = (56.4, 26.5)
DEST = {"Europa": (4.5, 51.9), "España": (-5.4, 36.1), "India": (72.8, 19.0), "China": (121.5, 31.2),
        "Japón": (139.7, 35.6), "Singapur": (103.8, 1.3), "África": (18.4, -33.9)}


def space():
    img = np.zeros((H, W, 3), np.float32)
    g = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    img[:] = np.array(hex_bgr("#07132A"), np.float32) * (1 - g) + np.array(hex_bgr("#02060F"), np.float32) * g
    rng = np.random.default_rng(5)
    for _ in range(500):
        x, y = rng.integers(0, W), rng.integers(0, H)
        b = rng.uniform(0.2, 0.9) ** 2
        cv2.circle(img, (int(x), int(y)), 1, (b, b, b), -1, cv2.LINE_AA)
    return img


def frame_rutas(phase=0.35):
    img = space()
    g = Globe(62, 24, 500, W / 2, 1000)
    render_globe(img, g, "50m")
    tips = []
    for i, (name, d) in enumerate(DEST.items()):
        tip, pts = draw_arc(img, g, HORMUZ, d, 1.0, AMBER, 0.2, 3, 8, particles=phase, seed=i)
        for p in pts:
            halo(img, p[0], p[1], 16, WHITE, 0.9)
            halo(img, p[0], p[1], 30, AMBER, 0.6)
        if tip:
            halo(img, tip[0], tip[1], 26, AMBER, 0.9)
            tips.append((name, tip))
    hx, hy, _ = g.project(*HORMUZ)
    for k, r in enumerate((40, 75, 115)):
        cv2.circle(img, (int(hx), int(hy)), r, AMBER, 2, cv2.LINE_AA)
    halo(img, hx, hy, 70, AMBER, 1.0)
    for name, (x, y) in tips:
        paste(img, text(name, 30, "bold", HEX["white"]), x, y - 34, 0.95)
    # tarjeta tipo «estrecho» de la referencia, en nuestro estilo
    glass(img, hx + 40, hy - 330, 300, 190, 30, ta=0.75, glow=AMBER)
    paste(img, text("ESTRECHO DE ORMUZ", 22, "mono", HEX["amber"], tracking=0.08), hx + 190, hy - 290, 1.0)
    paste(img, text("27 %", 76, "black", HEX["white"]), hx + 190, hy - 220, 1.0)
    paste(img, text("del petróleo por mar*", 22, "med", HEX["mist"]), hx + 190, hy - 168, 1.0)
    paste(img, text("TODO PASA POR AQUÍ", 70, "black", HEX["white"]), W / 2, 330, 1.0)
    paste(img, chip("EL PETRÓLEO DEL GOLFO", 30, HEX["navy"], HEX["amber"]), W / 2, 230, 1.0)
    paste(img, text("*dato pendiente de fuente · prueba de estilo", 24, "med", HEX["mist"]), W / 2, 1640, 0.8)
    post.vignette(img)
    post.grain(img, 1, 0.02)
    return post.finish(img)


def frame_ormuz(phase=0.5):
    img = space()
    g = Globe(55.2, 26.4, 9000, W / 2, 960)
    render_globe(img, g, "10m", atmosphere=False, border_a=0.7)
    # rutas por el centro del golfo (sin cruzar tierra) que se juntan en el estrecho
    ports = [(48.6, 29.0), (50.4, 26.9), (51.8, 25.6), (50.9, 26.6), (54.2, 24.9), (49.9, 28.4)]
    trunk = [(52.6, 26.9), (55.0, 26.55), (56.3, 26.55), (57.0, 26.0), (58.8, 24.9)]
    gate = trunk[2]
    for i, p in enumerate(ports):
        path = [p] + trunk
        for a, b in zip(path, path[1:]):
            tip, pts = draw_arc(img, g, a, b, 1.0, AMBER, 0.0005, 3, 6, particles=(phase + i * 0.11) % 1, seed=i)
            for q in pts[:2]:
                halo(img, q[0], q[1], 12, WHITE, 0.9)
                halo(img, q[0], q[1], 26, AMBER, 0.6)
    gx, gy, _ = g.project(*gate)
    halo(img, gx, gy, 140, AMBER, 0.55)
    for r in (60, 110):
        cv2.circle(img, (int(gx), int(gy)), r, AMBER, 2, cv2.LINE_AA)
    for name, ll in (("IRÁN", (55.6, 28.0)), ("OMÁN", (56.3, 25.9)), ("EAU", (54.4, 24.0)),
                     ("GOLFO PÉRSICO", (52.6, 27.5)), ("GOLFO DE OMÁN", (58.2, 24.9))):
        x, y, _ = g.project(*ll)
        sea = "GOLFO" in name
        paste(img, text(name, 30 if sea else 40, "mono" if sea else "black",
                        HEX["mist"] if sea else HEX["white"], tracking=0.15 if sea else 0.05), x, y, 0.9)
    paste(img, chip("CUELLO DE BOTELLA", 34, HEX["navy"], HEX["amber"], "black"), W / 2, 300, 1.0)
    paste(img, text("Estrecho de Ormuz", 64, "black", HEX["white"]), W / 2, 400, 1.0)
    paste(img, text("prueba de estilo", 24, "med", HEX["mist"]), W / 2, 1640, 0.8)
    post.vignette(img)
    post.grain(img, 2, 0.02)
    return post.finish(img)


if __name__ == "__main__":
    out = os.path.join(ROOT, "out")
    os.makedirs(out, exist_ok=True)
    a, b = frame_rutas(), frame_ormuz()
    cv2.imwrite(os.path.join(out, "prueba_rutas.jpg"), a, [cv2.IMWRITE_JPEG_QUALITY, 92])
    cv2.imwrite(os.path.join(out, "prueba_ormuz.jpg"), b, [cv2.IMWRITE_JPEG_QUALITY, 92])
    cv2.imwrite(os.path.join(out, "prueba_mapas.jpg"), np.hstack([a, b]), [cv2.IMWRITE_JPEG_QUALITY, 88])
    print("ok")
