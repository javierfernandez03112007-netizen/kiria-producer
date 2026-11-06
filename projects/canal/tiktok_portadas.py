"""Portadas para TikTok: la cuadrícula del perfil recorta las portadas a 3:4 (quita ≈ 240 px arriba y abajo de 1080x1920) y nuestros títulos
están arriba. Se baja la portada 270 px (la franja nueva de arriba es el borde de la imagen estirado y desenfocado) y se recorta abajo.
Uso: python3 projects/canal/tiktok_portadas.py → projects/canal/tiktok/portadas/<vídeo>.jpg (9:16, para «Editar portada → Subir»)"""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(ROOT, "..")
VIDEOS = ["derecho", "cripto", "medicina", "quimica", "cerradura", "robo_banco", "economia", "magisterio", "gafas", "promo_web"]
SHIFT = 270
out = os.path.join(ROOT, "tiktok", "portadas")
os.makedirs(out, exist_ok=True)
prev = []
for v in VIDEOS:
    src = os.path.join(P, v, "out", "portada.jpg")
    if not os.path.exists(src):
        print("sin portada:", v); continue
    im = cv2.imread(src)
    top = cv2.resize(im[:24], (1080, SHIFT + 24))                       # el borde de arriba, estirado
    top = cv2.GaussianBlur(top, (0, 0), 18)
    new = np.vstack([top[:SHIFT], im[:1920 - SHIFT]])
    mix = np.linspace(0, 1, 24)[:, None, None]                          # costura suave
    new[SHIFT:SHIFT + 24] = (top[SHIFT:SHIFT + 24] * (1 - mix) + im[:24] * mix).astype(np.uint8)
    cv2.imwrite(os.path.join(out, v + ".jpg"), new, [cv2.IMWRITE_JPEG_QUALITY, 93])
    prev.append(cv2.resize(new[240:1680], (270, 360)))                   # cómo se ve en la cuadrícula (3:4)
    print("ok", v)
if "--prev" in sys.argv and prev:
    while len(prev) % 5: prev.append(np.zeros_like(prev[0]))
    cv2.imwrite(sys.argv[sys.argv.index("--prev") + 1], np.vstack([np.hstack(prev[i:i + 5]) for i in range(0, len(prev), 5)]))
