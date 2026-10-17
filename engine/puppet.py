"""Marioneta 2D del avatar a partir de piezas PNG: cabeza articulada, parpadeo, mirada, cejas,
boca sincronizada con la voz y brazos que giran desde el hombro con distintas manos.

Coordenadas del lienzo de la marioneta: CW x CH px (escala 1). Cada pieza: (archivo, x, y, escala)
con (x, y) = esquina superior izquierda en el lienzo.
"""
import os
from functools import lru_cache

import cv2
import numpy as np
from PIL import Image

CW, CH = 460, 640
CX = CW / 2
HEAD = dict(x=CX - 90, y=40)               # la cabeza se compone en su propio lienzo de 180 x 244
NECK_PIVOT = (CX, 278)               # giro de la cabeza
BODY_S = 1.28                         # escala de las piezas del cuerpo (referencia 148 x 243)
BODY_O = (CX - 148 * BODY_S / 2, 272)

# piezas de la cara en el lienzo de la cabeza (180 x 244): nombre → (x, y, ancho deseado)
FACE = {
    "orejas_L": (1, 133, 17), "orejas_R": (162, 133, 17),
    "cabeza_base": (14, 62, 152),
    "nariz": (77, 140, 25),
    "bigote": (64, 187, 50), "perilla": (77, 209, 26),
    "pelo": (8, 0, 168),
}
EYES = {"L": (40, 124, 43), "R": (98, 124, 43)}        # ojos_<dir>_L/R
CLOSED = {"L": (40, 128, 43), "R": (98, 128, 43)}      # ojo_cerrado_izquierdo / derecho
BROWS = {"L": (41, 112, 41), "R": (98, 112, 41)}
MOUTH = (74, 201, 32)
# cuerpo en coordenadas de la referencia (148 x 243): nombre → (x, y, ancho)
BODY = {
    "piernas_L": (28, 180, 27), "piernas_R": (93, 180, 27),
    "zapatos_L": (26, 226, 33), "zapatos_R": (91, 226, 33),
    "pantalon": (14, 118, 119),
    "torso": (0, 13, 148),
    "cuello": (52, 0, 45),
}
# brazos: hombro (pivote) y muñeca en coordenadas de la pieza normalizadas (0-1)
ARMS = {
    "L": dict(file="brazo_izq", x=-6, y=12, w=34, pivot=(0.66, 0.12), wrist=(0.22, 0.95)),
    "R": dict(file="brazo_der", x=120, y=12, w=34, pivot=(0.34, 0.12), wrist=(0.78, 0.95)),
}
# manos: punto de agarre (muñeca) y ángulo de su eje propio (grados, imagen: 0 = derecha, 90 = abajo)
HANDS = {
    "puno": dict(file="mano_puno", grip=(0.5, 0.15), axis=90, w=34),
    "puno_e": dict(file="mano_puno_e", grip=(0.5, 0.15), axis=90, w=34),
    "senala": dict(file="mano_senala", grip=(0.25, 0.8), axis=-45, w=46),
    "senala_e": dict(file="mano_senala_e", grip=(0.75, 0.8), axis=-135, w=46),
    "abierta": dict(file="mano_abierta", grip=(0.5, 0.85), axis=-90, w=44),
    "abierta_e": dict(file="mano_abierta_e", grip=(0.5, 0.85), axis=-90, w=44),
    "pulgar": dict(file="mano_pulgar", grip=(0.5, 0.95), axis=-90, w=30),
    "pulgar_e": dict(file="mano_pulgar_e", grip=(0.5, 0.95), axis=-90, w=30),
}


class Puppet:
    def __init__(self, folder):
        self.dir = folder

    @lru_cache(None)
    def part(self, name, width):
        a = np.asarray(Image.open(os.path.join(self.dir, name + ".png"))).astype(np.float32) / 255
        s = width / a.shape[1]
        a = cv2.resize(a, (max(1, round(a.shape[1] * s)), max(1, round(a.shape[0] * s))), interpolation=cv2.INTER_AREA)
        return a  # RGBA (RGB orden PIL)

    # --- composición -------------------------------------------------------
    @staticmethod
    def _over(dst, src, x, y, alpha=1.0):
        h, w = src.shape[:2]
        x, y = int(round(x)), int(round(y))
        x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, dst.shape[1]), min(y + h, dst.shape[0])
        if x0 >= x1 or y0 >= y1:
            return
        s = src[y0 - y:y1 - y, x0 - x:x1 - x]
        a = s[..., 3:4] * alpha
        d = dst[y0:y1, x0:x1]
        d[..., :3] = d[..., :3] * (1 - a) + s[..., :3] * a
        d[..., 3:4] = d[..., 3:4] * (1 - a) + a

    @staticmethod
    def _rot(src, deg, pivot):
        """Rota src (RGBA) alrededor de pivot (px) en un lienzo ampliado; devuelve (img, nuevo pivot)."""
        h, w = src.shape[:2]
        d = int(np.hypot(w, h) * 2) + 4
        M = cv2.getRotationMatrix2D(pivot, -deg, 1.0)
        M[0, 2] += d / 2 - pivot[0]
        M[1, 2] += d / 2 - pivot[1]
        return cv2.warpAffine(src, M, (d, d), flags=cv2.INTER_LINEAR), (d / 2, d / 2), M

    def head(self, st):
        c = np.zeros((244, 180, 4), np.float32)
        for n in ("orejas_L", "orejas_R", "cabeza_base"):
            x, y, w = FACE[n]
            self._over(c, self.part(n, w), x, y)
        look = st.get("look", "centro")
        for k in ("L", "R"):
            if st.get("blink", 0) > 0.5:
                x, y, w = CLOSED[k]
                self._over(c, self.part("ojo_cerrado_" + ("izquierdo" if k == "L" else "derecho"), w), x, y)
            else:
                x, y, w = EYES[k]
                self._over(c, self.part(f"ojos_{look}_{k}", w), x, y)
        brow = st.get("brow", "normal")
        lift = st.get("brow_lift", 0.0)
        if brow == "sorpresa":
            self._over(c, self.part("cejas_sorpresa", 100), 40, 104 - lift)
        else:
            for k in ("L", "R"):
                x, y, w = BROWS[k]
                name = "ceja_izquierda" if k == "L" else "ceja_derecha"
                p = self.part(name, w)
                if brow == "enfado" and k == "L":
                    p = self.part("ceja_enfadada_izq", w)
                if brow == "enfado" and k == "R":
                    p = self.part("ceja_enfadada_izq", w)[:, ::-1]
                self._over(c, p, x, y - lift)
        x, y, w = FACE["nariz"]
        self._over(c, self.part("nariz", w), x, y)
        x, y, w = FACE["bigote"]
        self._over(c, self.part("bigote", w), x, y)
        mouth = st.get("mouth", "seria")
        op = st.get("open", 0.0)
        mx, my, mw = MOUTH
        if mouth == "sonrisa":
            m = self.part("boca_sonrisa", mw)
        elif mouth == "torcida":
            m = self.part("boca_sonrisa_torcida", mw)
        else:
            m = self.part("boca_seria", mw)
        if op > 0.02:  # boca abierta al hablar: se estira en vertical
            nh = int(m.shape[0] * (1 + 1.4 * op))
            m = cv2.resize(m, (m.shape[1], nh), interpolation=cv2.INTER_LINEAR)
        self._over(c, m, mx, my)
        x, y, w = FACE["perilla"]
        self._over(c, self.part("perilla", w), x, y + 3 * op)
        x, y, w = FACE["pelo"]
        self._over(c, self.part("pelo", w), x, y)
        return c

    def arm(self, canvas, side, angle, hand):
        a = ARMS[side]
        img = self.part(a["file"], a["w"])
        h, w = img.shape[:2]
        piv = (a["pivot"][0] * w, a["pivot"][1] * h)
        wr = np.array([a["wrist"][0] * w, a["wrist"][1] * h, 1.0])
        rimg, rp, M = self._rot(img, angle, piv)
        # posición del hombro en el lienzo
        sx = BODY_O[0] + a["x"] * BODY_S + piv[0]
        sy = BODY_O[1] + a["y"] * BODY_S + piv[1]
        self._over(canvas, rimg, sx - rp[0], sy - rp[1])
        # mano en la muñeca girada
        wx, wy = M @ wr
        wx, wy = sx - rp[0] + wx, sy - rp[1] + wy
        hd = HANDS[hand]
        himg = self.part(hd["file"], hd["w"])
        hh, hw = himg.shape[:2]
        arm_dir = np.degrees(np.arctan2(wy - sy, wx - sx))
        rot = arm_dir - hd["axis"]
        g = (hd["grip"][0] * hw, hd["grip"][1] * hh)
        rh, rg, _ = self._rot(himg, rot, g)
        self._over(canvas, rh, wx - rg[0], wy - rg[1])

    def render(self, st):
        """st: dict con look, blink, brow, brow_lift, mouth, open, head_tilt, head_nod, arm_L, arm_R,
        hand_L, hand_R, bob. Devuelve RGBA float (CH x CW)."""
        c = np.zeros((CH, CW, 4), np.float32)
        ox, oy = BODY_O
        for n in ("piernas_L", "piernas_R", "zapatos_L", "zapatos_R"):
            x, y, w = BODY[n]
            self._over(c, self.part(n, w * BODY_S), ox + x * BODY_S, oy + y * BODY_S)
        up = c.copy() * 0
        bob = st.get("bob", 0.0)
        for n in ("pantalon", "torso", "cuello"):
            x, y, w = BODY[n]
            self._over(up, self.part(n, w * BODY_S), ox + x * BODY_S, oy + y * BODY_S)
        # brazos detrás o delante según el gesto: se dibujan delante del torso
        self.arm(up, "L", st.get("arm_L", 0.0), st.get("hand_L", "puno"))
        self.arm(up, "R", st.get("arm_R", 0.0), st.get("hand_R", "puno_e"))
        hd = self.head(st)
        tilt = st.get("head_tilt", 0.0)
        nod = st.get("head_nod", 0.0)
        piv = (NECK_PIVOT[0] - HEAD["x"], NECK_PIVOT[1] - HEAD["y"])
        rh, rp, _ = self._rot(hd, tilt, piv)
        self._over(up, rh, NECK_PIVOT[0] - rp[0], NECK_PIVOT[1] - rp[1] + nod)
        # el tronco sube y baja un poco (respiración)
        self._over(c, up, 0, -bob)
        return c
