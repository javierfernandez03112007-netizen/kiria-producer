"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «Bomberados IA».
Base: la sartén en llamas con la V y la F de fuego (sin HUD):
    COVER=1 COVER_T=5.0 COVER_CAM="0,0.42,2.6,0,0.36,0,32" node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Arriba la pregunta en Impact (como los subtítulos); abajo BOMBERADOS en la placa dorada con brillo de brasa
(las piezas son las de la portada de «Bomberados»: projects/bomberos/portada.py)."""
import importlib.util
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.fin_draw import paste, chip  # noqa: E402
from engine import post  # noqa: E402

_spec = importlib.util.spec_from_file_location("portada_bomberos", os.path.join(ROOT, "..", "bomberos", "portada.py"))
PB = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(PB)
W, H, GOLD = 1080, 1920, "#F2B233"


def build(m, L):
    k = L["k"]
    paste(m, chip("oposición a bombero", int(40 * k), "#000000", "#FFFFFF", "bold"), W / 2, L["chip"])
    PB.row(m, [("UN", None), ("FUEGO", None), ("DE", None), ("ACEITE", GOLD)], L["r1"], int(84 * k), int(8 * k))
    PB.row(m, [("¿ES", None), ("CLASE", None), ("B?", GOLD)], L["r2"], int(124 * k), int(10 * k))
    pl = PB.plate("BOMBERADOS", int(150 * k))
    paste(m, PB.glow(pl), W / 2, L["pl"], 0.9, add=True, rot=2.5)
    paste(m, pl, W / 2, L["pl"], rot=2.5)
    PB.row(m, [("LA", None), ("APP", GOLD), ("PARA", None), ("OPOSITORES", None), ("A", None), ("BOMBERO", None)], L["sub"], int(50 * k), 5)


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    PB.shade(img, 620, 0.8)
    PB.shade_bottom(img, 1380, 0.8)
    build(img, dict(k=1.0, chip=96, r1=196, r2=312, pl=1535, sub=1668))
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    # miniatura 4:5: la escena reducida bajo el título y la placa debajo de la sartén
    m = np.zeros((1350, W, 3), np.float32)
    PB.place(m, base, 0.62, 430, 405)
    PB.shade(m, 470, 0.8)
    PB.shade_bottom(m, 980, 0.85)
    build(m, dict(k=0.84, chip=58, r1=150, r2=262, pl=1125, sub=1240))
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    main()
