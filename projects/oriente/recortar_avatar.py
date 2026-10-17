"""Recorta las 5 poses del muñeco (fondo azul marino liso) a PNG con transparencia."""
import os

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "assets", "avatar", "munecos.webp")
POSES = ["pensativo", "senala", "abierto", "sorpresa", "ok"]


def main():
    img = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
    bg = img[5, 5]
    d = np.linalg.norm(img - bg, axis=2)
    a = np.clip((d - 18) / 30, 0, 1)            # transición suave en el borde
    a = cv2.morphologyEx(a, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # quitar el halo azul del borde (despill)
    rgb = img.copy()
    edge = (a > 0) & (a < 1)
    rgb[edge] = np.clip((img[edge] - bg * (1 - a[edge, None])) / np.maximum(a[edge, None], 0.05), 0, 255)
    w = img.shape[1] // 5
    for i, name in enumerate(POSES):
        sl = slice(i * w, (i + 1) * w)
        ai = a[:, sl]
        ys, xs = np.where(ai > 0.05)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        out = np.dstack([rgb[y0:y1, sl][:, x0:x1], ai[y0:y1, x0:x1] * 255]).astype(np.uint8)
        Image.fromarray(out, "RGBA").save(os.path.join(ROOT, "assets", "avatar", f"{name}.png"))
        print(name, out.shape)


if __name__ == "__main__":
    main()
