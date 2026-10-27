"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «Bomberados».
Base: los diez cascos justo antes de caer, ocho en rojo y dos en oro (sin HUD):
    COVER=1 COVER_T=2.55 COVER_CAM="0.3,1.5,4.8,0,1.55,0,34" node web/capture.mjs out/cover 0 → out/cover/cover3d.png
Título en Impact con contorno, como los subtítulos (el 8 y PLAZA en rojo, ¿POR QUÉ? en brasa).
Versión con la marca (miniatura_marca.jpg 4:5 y portada_marca.jpg 9:16): BOMBERADOS en una placa dorada con brillo de brasa."""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from PIL import Image, ImageDraw  # noqa: E402
from engine.fin_draw import paste, chip, hex_bgr, canvas, pil_sprite, font, rgba, SS  # noqa: E402
from engine.subs import word_sprite  # noqa: E402
from engine import post  # noqa: E402

W, H = 1080, 1920
RED, EMB, GOLD = "#FF5A4E", "#FF7A2F", "#F2B233"


def row(img, parts, cy, size, stroke):
    """Renglón de palabras [(texto, color o None)] en Impact con contorno negro, centrado en cy."""
    sps = [word_sprite(w, size, stroke, hex_bgr(c) if c else None, "impact") for w, c in parts]
    ws = [a.shape[1] - 2 * pad for _, a, pad in sps]
    sp = size * 0.22
    x = (W - sum(ws) - sp * (len(ws) - 1)) / 2
    for (rgb, a, _), w in zip(sps, ws):
        paste(img, (rgb, a), x + w / 2, cy)
        x += w + sp


def shade(img, y1, k=0.7):
    """Degradado oscuro arriba para que el título se lea."""
    a = np.clip(1 - np.arange(img.shape[0]) / y1, 0, 1)[:, None, None] ** 1.3 * k
    img *= 1 - a


def title(img, y, k=1.0):
    paste(img, chip("oposición a bombero · Madrid", int(40 * k), "#000000", "#FFFFFF", "bold"), W / 2, y)
    row(img, [("8", RED), ("DE", None), ("CADA", None), ("10", None)], y + 175 * k, int(150 * k), int(10 * k))
    row(img, [("SIN", None), ("PLAZA", RED)], y + 335 * k, int(160 * k), int(11 * k))
    row(img, [("¿POR", EMB), ("QUÉ?", EMB)], y + 480 * k, int(96 * k), int(8 * k))


def main():
    base = cv2.imread(os.path.join(ROOT, "out", "cover", "cover3d.png")).astype(np.float32) / 255
    img = base.copy()
    shade(img, 760)
    title(img, 150)
    post.grain(img, 0, 0.008)
    cv2.imwrite(os.path.join(ROOT, "out", "portada.jpg"), post.finish(img), [cv2.IMWRITE_JPEG_QUALITY, 95])
    # miniatura 4:5 (lo que enseña la cuadrícula del perfil): los cascos centrados, reducidos, con los lados fundidos a negro
    y0, s = 0, 0.78
    src = base[y0:y0 + int(1350 / s)]
    small = cv2.resize(src, (int(W * s), 1350), interpolation=cv2.INTER_AREA)
    x0 = (W - small.shape[1]) // 2
    ramp = np.clip(np.minimum(np.arange(small.shape[1]), np.arange(small.shape[1])[::-1]) / 90.0, 0, 1)[None, :, None]
    m = np.zeros((1350, W, 3), np.float32)
    m[:, x0:x0 + small.shape[1]] = small * ramp
    shade(m, 560)
    title(m, 62, 0.82)
    cv2.imwrite(os.path.join(ROOT, "out", "miniatura.jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")
    marca(base)


# ---------------------------------------------------------------- versión con la marca bien visible
def plate(txt, size, padx=48, pady=20):
    """Placa dorada (degradado) con el nombre en Impact casi negro."""
    f = font("impact", size * SS)
    bb = ImageDraw.Draw(Image.new("L", (1, 1))).textbbox((0, 0), txt, font=f)
    w, h = (bb[2] - bb[0]) / SS + 2 * padx, (bb[3] - bb[1]) / SS + 2 * pady
    im, d = canvas(w, h)
    Wp, Hp = im.size
    top, bot = np.array((255, 214, 92)), np.array((232, 140, 30))
    grad = np.zeros((Hp, Wp, 4), np.uint8)
    grad[..., :3] = (top + (bot - top) * (np.arange(Hp) / Hp)[:, None]).astype(np.uint8)[:, None, :]
    grad[..., 3] = 255
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, Wp - 1, Hp - 1), radius=int(Hp * 0.16), fill=255)
    im.paste(Image.fromarray(grad, "RGBA"), (0, 0), mask)
    d.rounded_rectangle((3 * SS, 3 * SS, Wp - 3 * SS, int(Hp * 0.12)), radius=int(Hp * 0.06), fill=(255, 240, 190, 90))   # brillo arriba
    d.text(((Wp - (bb[2] - bb[0])) / 2 - bb[0], (Hp - (bb[3] - bb[1])) / 2 - bb[1]), txt, font=f, fill=rgba("#160F05"))
    return pil_sprite(im)


def glow(sp, sigma=28, col=EMB, k=1.3):
    """Halo de brasa alrededor de un sprite (se suma)."""
    rgb, a = sp
    p = int(sigma * 3)
    ap = cv2.GaussianBlur(np.pad(a, p), (0, 0), sigma) * k
    return np.ones(ap.shape + (3,), np.float32) * np.array(hex_bgr(col), np.float32), np.clip(ap, 0, 1)


def place(dst, base, s, by, dy, fade=90):
    """Pega la escena reducida (factor s), con la altura by de la base en dy del destino y los lados fundidos a negro."""
    small = cv2.resize(base, (int(W * s), int(H * s)), interpolation=cv2.INTER_AREA)
    x0, y0 = (W - small.shape[1]) // 2, int(dy - by * s)
    ramp = np.clip(np.minimum(np.arange(small.shape[1]), np.arange(small.shape[1])[::-1]) / fade, 0, 1)[None, :, None]
    a0, a1 = max(0, -y0), min(small.shape[0], dst.shape[0] - y0)
    dst[y0 + a0:y0 + a1, x0:x0 + small.shape[1]] = small[a0:a1] * ramp


def shade_bottom(img, y0, k=0.85):
    a = np.clip((np.arange(img.shape[0]) - y0) / (img.shape[0] - y0), 0, 1)[:, None, None] ** 0.8 * k
    img *= 1 - a


def marca(base):
    for name, Hc, L in [("miniatura_marca", 1350, dict(chip=58, r1=(185, 124), r2=(312, 132), s=0.65, dy=400, pl=(1138, 150), sub=(1272, 46), sh=(520, 930))),
                        ("portada_marca", 1920, dict(chip=170, r1=(355, 150), r2=(515, 160), s=0.8, dy=640, pl=(1530, 170), sub=(1680, 54), sh=(760, 1330)))]:
        m = np.zeros((Hc, W, 3), np.float32)
        place(m, base, L["s"], 700, L["dy"])
        shade(m, L["sh"][0])
        shade_bottom(m, L["sh"][1])
        k = L["r1"][1] / 150
        paste(m, chip("oposición a bombero · Madrid", int(40 * k * 1.05), "#000000", "#FFFFFF", "bold"), W / 2, L["chip"])
        row(m, [("8", RED), ("DE", None), ("CADA", None), ("10", None)], L["r1"][0], L["r1"][1], int(10 * k))
        row(m, [("SIN", None), ("PLAZA", RED)], L["r2"][0], L["r2"][1], int(11 * k))
        pl = plate("BOMBERADOS", L["pl"][1])
        paste(m, glow(pl), W / 2, L["pl"][0], 0.9, add=True, rot=2.5)
        paste(m, pl, W / 2, L["pl"][0], rot=2.5)
        row(m, [("LA", None), ("APP", GOLD), ("PARA", None), ("OPOSITORES", None), ("A", None), ("BOMBERO", None)], L["sub"][0], L["sub"][1], 5)
        if Hc == H:
            post.grain(m, 0, 0.008)
        cv2.imwrite(os.path.join(ROOT, "out", name + ".jpg"), post.finish(m), [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("con la marca → out/miniatura_marca.jpg · out/portada_marca.jpg")


if __name__ == "__main__":
    main()
