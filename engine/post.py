"""Postproducción por fotograma: zoom con desenfoque radial, glitch, viñeteado, grano y marca."""
from functools import lru_cache

import cv2
import numpy as np

from .fin_draw import W, H, NAVY, text, paste, halo, MINT, HEX


def zoom_blur(img, zoom, strength, n=7):
    """Escala la imagen `zoom` veces respecto al centro y añade desenfoque radial (`strength` 0..1)."""
    acc = np.zeros_like(img)
    for i in range(n):
        s = zoom * (1 + strength * 0.22 * i / max(n - 1, 1))
        M = np.float32([[s, 0, W / 2 * (1 - s)], [0, s, H / 2 * (1 - s)]])
        acc += cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return acc / n


def glitch(img, amount, seed):
    """Glitch suave: desplazamiento de bandas horizontales y separación de canales."""
    if amount <= 0.01:
        return img
    rng = np.random.default_rng(seed)
    out = img.copy()
    for _ in range(int(3 + 9 * amount)):
        y = int(rng.uniform(0, H - 40))
        h = int(rng.uniform(8, 70))
        dx = int(rng.uniform(-60, 60) * amount)
        out[y:y + h] = np.roll(out[y:y + h], dx, axis=1)
    s = int(14 * amount)
    if s:
        out[..., 0] = np.roll(out[..., 0], s, axis=1)
        out[..., 2] = np.roll(out[..., 2], -s, axis=1)
    return out


@lru_cache(1)
def _vignette():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)) / np.sqrt(2)
    return (1 - 0.55 * np.clip(r, 0, 1) ** 2.2)[..., None].astype(np.float32)


def vignette(img):
    img *= _vignette()
    return img


@lru_cache(1)
def _grain_bank():
    rng = np.random.default_rng(7)
    bank = []
    for _ in range(8):
        g = rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32)
        g = cv2.resize(g, (W, H), interpolation=cv2.INTER_LINEAR)
        bank.append(g[..., None])
    return bank


def grain(img, fi, amount=0.028):
    img += _grain_bank()[fi % 8] * amount
    return img


def brand(img, alpha=0.85):
    sp = text("kiria.ai", 38, "semi", HEX["white"], shadow=0.5)
    paste(img, sp, W - 56, H - 70, alpha, anchor="r")
    w = sp[1].shape[1]
    halo(img, W - 56 - w + 4, H - 64, 14, MINT, 0.5 * alpha)


def finish(img):
    """Recorta y convierte a uint8 BGR."""
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)
