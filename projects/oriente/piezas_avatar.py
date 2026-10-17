"""Recorta las piezas del muñeco de las dos hojas (fondo azul marino, rejilla de 300 px con etiqueta)."""
import os

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(ROOT, "assets", "avatar")
OUT = os.path.join(A, "piezas")
CARA = [["cabeza_base", "orejas", "pelo", "nariz", "bigote", "perilla"],
        ["ceja_izquierda", "ceja_derecha", "cejas_sorpresa", "ceja_enfadada_izq", "ojo_izquierdo", "ojo_derecho"],
        ["ojos_centro", "ojos_izquierda", "ojos_derecha", "ojos_arriba", "ojos_abajo", "ojo_cerrado_izquierdo"],
        ["ojo_cerrado_derecho", "boca_sonrisa", "boca_sonrisa_torcida", "boca_seria", "cabeza_sonrisa", "cabeza_seria"]]
CUERPO = [["torso", "cuello", "pantalon", "piernas"],
          ["zapatos", "brazo_izq", "brazo_der", "cuerpo_sin_cabeza"],
          ["mano_puno", "mano_puno_e", "mano_senala", "mano_senala_e"],
          ["mano_abierta", "mano_abierta_e", "mano_pulgar", "mano_pulgar_e"],
          ["mano_barbilla", "mano_barbilla_e", "mano_boca", "mano_boca_e"]]
PAIRS = {"orejas", "ojos_centro", "ojos_izquierda", "ojos_derecha", "ojos_arriba", "ojos_abajo", "piernas", "zapatos"}


def cut(sheet, grid):
    img = np.asarray(Image.open(os.path.join(A, sheet)).convert("RGB")).astype(np.float32)
    bg = img[3, 3]
    for r, row in enumerate(grid):
        for c, name in enumerate(row):
            cell = img[r * 300:r * 300 + 262, c * 300:(c + 1) * 300]
            d = np.linalg.norm(cell - bg, axis=2)
            a = np.clip((d - 14) / 26, 0, 1)
            rgb = cell.copy()
            e = (a > 0) & (a < 1)
            rgb[e] = np.clip((cell[e] - bg * (1 - a[e, None])) / np.maximum(a[e, None], 0.05), 0, 255)
            parts = [(name, a)]
            if name in PAIRS:  # izquierda / derecha por mitades de la caja
                ys, xs = np.where(a > 0.1)
                mid = (xs.min() + xs.max()) // 2
                la, ra = a.copy(), a.copy()
                la[:, mid:] = 0
                ra[:, :mid] = 0
                parts = [(name + "_L", la), (name + "_R", ra)]
            for nm, aa in parts:
                ys, xs = np.where(aa > 0.05)
                y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
                out = np.dstack([rgb[y0:y1, x0:x1], aa[y0:y1, x0:x1] * 255]).astype(np.uint8)
                Image.fromarray(out, "RGBA").save(os.path.join(OUT, nm + ".png"))
                # posición de la pieza dentro de su celda (para referencia)
                print(f"{nm:24s} {x1 - x0:4d}x{y1 - y0:<4d} at ({c * 300 + x0},{r * 300 + y0})")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    cut("hoja_cara.png", CARA)
    cut("hoja_cuerpo.png", CUERPO)
