"""Dar vida a fotos fijas: cámara con paralaje 2,5D sobre un mapa de profundidad, ondas en líquidos,
viento en hojas, niebla que avanza, partículas (polvo, gotas, brasas), destellos y aislamiento de color."""
import os
from functools import lru_cache

import cv2
import numpy as np

from engine.fin_draw import W, H

PLACAS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "placas")
_V, _U = np.mgrid[0:H, 0:W].astype(np.float32)
U, V = _U - W / 2, _V - H / 2


@lru_cache(8)
def placa(name):
    im = cv2.imread(os.path.join(PLACAS, name + ".png")).astype(np.float32) / 255
    return im, np.load(os.path.join(PLACAS, name + "_prof.npy")).astype(np.float32)


def ease(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def eout(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def lerp(a, b, x):
    return a + (b - a) * x


def camara(name, fx, fy, z, par=(0.0, 0.0), dz=0.0, rot=0.0, warp=None):
    """Encuadre de la placa `name` centrado en (fx, fy) (fracciones de la placa) con zoom z.
    par: desplazamiento de paralaje en px (lo cercano se mueve más que lo lejano).
    dz: zoom diferencial (lo cercano crece más: efecto dolly). warp(X, Y, d) -> (dx, dy) en px de placa."""
    img, dep = placa(name)
    ph, pw = dep.shape
    cx, cy = fx * pw, fy * ph
    if rot:
        c, s = np.cos(rot), np.sin(rot)
        uu, vv = c * U - s * V, s * U + c * V
    else:
        uu, vv = U, V
    X = (cx + uu / z).astype(np.float32)
    Y = (cy + vv / z).astype(np.float32)
    d = cv2.remap(dep, X, Y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT) - 0.5
    X = X - par[0] * d - uu / z * dz * d
    Y = Y - par[1] * d - vv / z * dz * d
    if warp is not None:
        dx, dy = warp(X, Y, d + 0.5)
        X, Y = X + dx, Y + dy
    X, Y = X.astype(np.float32), Y.astype(np.float32)
    out = cv2.remap(img, X, Y, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    return np.clip(out, 0, 1), (X, Y, d + 0.5)


def ondas(cx, cy, t, amp=5.0, k=0.045, w=7.0, decay=900.0, y_min=None, sx=1.0, sy=2.6):
    """Ondas concéntricas (elípticas, en perspectiva) que salen de (cx, cy) en px de placa."""
    def f(X, Y, d):
        r = np.hypot((X - cx) * sx, (Y - cy) * sy)
        a = amp * np.sin(r * k - t * w) * np.exp(-r / decay)
        if y_min is not None:
            a = a * np.clip((Y - y_min) / 80.0, 0, 1)
        return a * 0.4, a
    return f


def viento(t, amp=3.0, near_max=0.6):
    """Balanceo suave de lo lejano/medio (hojas), sin tocar lo más cercano (manos)."""
    def f(X, Y, d):
        m = np.clip((near_max - d) / 0.25, 0, 1)
        dx = amp * np.sin(Y * 0.011 + t * 1.9) * np.sin(X * 0.007 + t * 1.3) * m
        dy = amp * 0.6 * np.sin(X * 0.009 + t * 1.6) * m
        return dx, dy
    return f


def combina(*fs):
    def f(X, Y, d):
        dx, dy = 0, 0
        for g in fs:
            a, b = g(X, Y, d)
            dx, dy = dx + a, dy + b
        return dx, dy
    return f


# ------------------------------------------------------------------ capas de luz

@lru_cache(4)
def _ruido(seed, w, h, s):
    rng = np.random.default_rng(seed)
    n = np.zeros((h, w), np.float32)
    for k, a in ((s, 1.0), (s / 2, 0.5), (s / 4, 0.25)):
        g = rng.random((max(2, int(h / k)), max(2, int(w / k)))).astype(np.float32)
        n += a * cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC)
    n -= n.min()
    return n / n.max()


def niebla(img, t, color=(0.85, 0.9, 1.0), a=0.35, speed=(60, -8), y0=0.0, y1=0.55, seed=1, scale=260):
    """Niebla que avanza (dos capas a distinta velocidad) en la franja vertical y0..y1."""
    n1 = _ruido(seed, W * 2, H, scale)
    n2 = _ruido(seed + 1, W * 2, H, scale * 0.6)
    o1 = int(t * speed[0]) % W
    o2 = int(t * speed[0] * 1.7) % W
    f = 0.6 * n1[:, o1:o1 + W] + 0.4 * np.roll(n2[:, o2:o2 + W], int(t * speed[1]), axis=0)
    f = np.clip((f - 0.35) * 1.8, 0, 1)
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    band = np.clip((yy - y0) / 0.12, 0, 1) * np.clip((y1 - yy) / 0.2, 0, 1)
    m = (f * band * a)[..., None]
    img[:] = img * (1 - m) + np.float32(color) * m
    return img


def humo(img, t, a=0.4, color=(0.55, 0.7, 0.9), seed=5, rise=90):
    """Humo que sube y se retuerce."""
    n = _ruido(seed, W, H * 2, 220)
    o = int(t * rise) % H
    f = n[H - o:2 * H - o] if o else n[H:2 * H]
    f = np.clip((f - 0.42) * 2.2, 0, 1)
    m = (f * a)[..., None]
    img[:] = img * (1 - m * 0.6) + np.float32(color) * m
    return img


def destello(img, x, y, r, color=(0.45, 0.75, 1.0), a=0.5):
    """Brillo radial (sol, lámpara) más una estela anamórfica horizontal."""
    xs = (np.arange(W, dtype=np.float32) - x)
    ys = (np.arange(H, dtype=np.float32) - y)
    g = np.exp(-(ys[:, None] ** 2 + xs[None, :] ** 2) / (2 * r * r))
    streak = np.exp(-(ys[:, None] ** 2) / (2 * (r * 0.06) ** 2)) * np.exp(-np.abs(xs[None, :]) / (r * 4))
    img += ((g * a + streak * a * 0.6)[..., None] * np.float32(color))
    return img


def barrido(img, t, a=0.18, color=(0.5, 0.8, 1.0), width=260, ang=0.5):
    """Barrido de luz diagonal que cruza el plano (t 0..1)."""
    pos = (U * np.cos(ang) + V * np.sin(ang))
    c = lerp(-1400, 1400, t)
    m = np.exp(-((pos - c) / width) ** 2) * a
    img += m[..., None] * np.float32(color)
    return img


class Particulas:
    """Partículas 2D con velocidad, gravedad y parpadeo, dibujadas a media resolución y desenfocadas."""

    def __init__(self, n, seed, area=(0, 0, W, H), vel=((-15, 15), (-25, 5)), r=(1.5, 6), grav=0.0,
                 color=(0.35, 0.7, 1.0), a=0.6, blur=2.0, life=None, origin=None):
        rng = np.random.default_rng(seed)
        self.n = n
        if origin is None:
            self.x = rng.uniform(area[0], area[2], n)
            self.y = rng.uniform(area[1], area[3], n)
        else:
            self.x = np.full(n, origin[0], float) + rng.normal(0, 25, n)
            self.y = np.full(n, origin[1], float) + rng.normal(0, 10, n)
        self.vx = rng.uniform(*vel[0], n)
        self.vy = rng.uniform(*vel[1], n)
        self.r = rng.uniform(*r, n)
        self.ph = rng.uniform(0, 6.28, n)
        self.grav, self.color, self.a, self.blur, self.life = grav, color, a, blur, life
        self.wrap = origin is None

    def draw(self, img, t, alpha=1.0, dx=0.0, dy=0.0):
        if alpha <= 0.01:
            return img
        h2, w2 = H // 2, W // 2
        lay = np.zeros((h2, w2), np.float32)
        x = self.x + self.vx * t + dx
        y = self.y + self.vy * t + 0.5 * self.grav * t * t + dy
        if self.wrap:
            x, y = x % W, y % H
        for k in range(self.n):
            fl = 0.55 + 0.45 * np.sin(self.ph[k] + t * 5)
            if self.life is not None:
                fl *= max(0.0, 1 - t / self.life)
            cv2.circle(lay, (int(x[k] / 2), int(y[k] / 2)), max(1, int(self.r[k] / 2)), float(fl), -1, cv2.LINE_AA)
        if self.blur:
            lay = cv2.GaussianBlur(lay, (0, 0), self.blur)
        lay = cv2.resize(lay, (W, H), interpolation=cv2.INTER_LINEAR)
        img += lay[..., None] * np.float32(self.color) * (self.a * alpha)
        return img


def chispas_brillo(img, base, t, n=40, seed=3, thr=0.92, a=0.8):
    """Destellos que titilan sobre los puntos más brillantes del encuadre (gotas de rocío)."""
    g = cv2.cvtColor(base, cv2.COLOR_BGR2GRAY)
    small = cv2.resize(g, (W // 8, H // 8), interpolation=cv2.INTER_AREA)
    ys, xs = np.where(small > np.quantile(small, thr))
    if len(xs) == 0:
        return img
    rng = np.random.default_rng(seed)
    idx = rng.choice(len(xs), min(n, len(xs)), replace=False)
    lay = np.zeros((H, W), np.float32)
    for k, i in enumerate(idx):
        f = max(0.0, np.sin(t * (3 + k % 5) + k * 1.7)) ** 6
        if f < 0.05:
            continue
        x, y = int(xs[i] * 8 + 4), int(ys[i] * 8 + 4)
        L = int(10 + 22 * f)
        cv2.line(lay, (x - L, y), (x + L, y), f, 2, cv2.LINE_AA)
        cv2.line(lay, (x, y - L), (x, y + L), f, 2, cv2.LINE_AA)
        cv2.circle(lay, (x, y), 3, f, -1, cv2.LINE_AA)
    lay = cv2.GaussianBlur(lay, (0, 0), 1.6)
    img += lay[..., None] * np.float32([0.85, 0.95, 1.0]) * a
    return img


def aislar_rojo(img, amount):
    """Blanco y negro salvo los rojos (las cerezas de café)."""
    if amount <= 0.01:
        return img
    hsv = cv2.cvtColor(np.clip(img, 0, 1), cv2.COLOR_BGR2HSV)
    h, s = hsv[..., 0], hsv[..., 1]
    red = ((h < 14) | (h > 340)) & (s > 0.35)
    m = cv2.GaussianBlur(red.astype(np.float32), (0, 0), 3)[..., None]
    g = cv2.cvtColor(np.clip(img, 0, 1), cv2.COLOR_BGR2GRAY)[..., None]
    g = (g - 0.5) * 1.15 + 0.45
    bw = np.repeat(g, 3, axis=2)
    out = bw * (1 - m) + img * m
    img[:] = img * (1 - amount) + out * amount
    return img


def etalonar(img, teal=0.07, amber=0.08, contrast=1.1, sat=1.08):
    """Etalonado de la serie: sombras verde azulado, altas luces ámbar."""
    lum = img.mean(axis=2, keepdims=True)
    sh = np.clip(1 - lum * 2.2, 0, 1)
    hi = np.clip(lum * 2 - 0.9, 0, 1)
    img += sh * np.float32([teal, teal * 0.45, -teal * 0.4]) + hi * np.float32([-amber * 0.7, amber * 0.25, amber])
    g = img.mean(axis=2, keepdims=True)
    img[:] = g + (img - g) * sat
    img[:] = (img - 0.42) * contrast + 0.42
    return img


def bloom(img, thr=0.72, a=0.45):
    small = cv2.resize(img, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    hi = np.clip(small - thr, 0, None)
    hi = cv2.GaussianBlur(hi, (0, 0), 9)
    img += cv2.resize(hi, (W, H), interpolation=cv2.INTER_LINEAR) * a
    return img


def desenfoque_mov(img, dx, dy, n=6):
    """Desenfoque de movimiento lineal (barridos rápidos de cámara)."""
    if abs(dx) + abs(dy) < 1:
        return img
    acc = np.zeros_like(img)
    for i in range(n):
        f = (i / (n - 1) - 0.5)
        M = np.float32([[1, 0, dx * f], [0, 1, dy * f]])
        acc += cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REFLECT)
    return acc / n
