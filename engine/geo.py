"""Globo holográfico: países de world-atlas (Natural Earth, dominio público) en proyección ortográfica,
arcos de luz entre puntos y partículas que viajan por ellos."""
import json
import os
from functools import lru_cache

import cv2
import numpy as np

from .fin_draw import W, H, MINT, AMBER, NAVY, hex_bgr

GEO = os.path.join(os.path.dirname(__file__), "geo")
GULF = {"Saudi Arabia", "Iraq", "Iran", "Kuwait", "United Arab Emirates", "Qatar", "Bahrain", "Oman"}


@lru_cache(4)
def countries(res="50m"):
    """[(nombre, [anillos como arrays (n, 2) lon/lat])] decodificando el TopoJSON."""
    d = json.load(open(os.path.join(GEO, f"countries-{res}.json")))
    sx, sy = d["transform"]["scale"]
    tx, ty = d["transform"]["translate"]
    arcs = []
    for a in d["arcs"]:
        q = np.cumsum(np.array(a, np.float64), axis=0)
        arcs.append(np.c_[q[:, 0] * sx + tx, q[:, 1] * sy + ty])

    def ring(idx):
        pts = []
        for i in idx:
            a = arcs[i] if i >= 0 else arcs[~i][::-1]
            pts.append(a if not pts else a[1:])
        return np.vstack(pts)

    out = []
    for g in d["objects"]["countries"]["geometries"]:
        polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]] if g["type"] == "Polygon" else []
        rings = [ring(r) for p in polys for r in p]
        out.append((g["properties"].get("name", ""), rings))
    return out


def sph(lon, lat):
    lon, lat = np.radians(lon), np.radians(lat)
    return np.stack([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)], -1)


class Globe:
    """Cámara ortográfica: centro (lon0, lat0), radio R en px, centro de pantalla (cx, cy)."""

    def __init__(self, lon0, lat0, R, cx=W / 2, cy=H / 2):
        self.R, self.cx, self.cy = R, cx, cy
        self.c = sph(lon0, lat0)
        l, p = np.radians(lon0), np.radians(lat0)
        self.e = np.array([-np.sin(l), np.cos(l), 0.0])
        self.n = np.array([-np.sin(p) * np.cos(l), -np.sin(p) * np.sin(l), np.cos(p)])

    def project3(self, v):
        """v: (..., 3) en unidades de radio terrestre → (x, y, profundidad)."""
        x, y, z = v @ self.e, v @ self.n, v @ self.c
        return self.cx + self.R * x, self.cy - self.R * y, z

    def project(self, lon, lat):
        return self.project3(sph(lon, lat))

    def ring_px(self, r):
        x, y, z = self.project(r[:, 0], r[:, 1])
        if (z <= 0).all():
            return None
        # puntos de la cara oculta: se llevan al horizonte para que el relleno no se rompa
        hid = z <= 0
        if hid.any():
            dx, dy = x - self.cx, y - self.cy
            d = np.hypot(dx, dy) + 1e-9
            x = np.where(hid, self.cx + dx / d * self.R, x)
            y = np.where(hid, self.cy + dy / d * self.R, y)
        return np.c_[x, y]


def _poly(img, pts_list, color, alpha=1.0, fill=True, th=1):
    ov = np.zeros(img.shape[:2], np.float32)
    P = [np.round(p * 8).astype(np.int32) for p in pts_list if p is not None and len(p) > 2]
    # se descartan anillos gigantes fuera de pantalla para no gastar tiempo
    P = [p for p in P if (p[:, 0].max() > -8 * W) and (p[:, 0].min() < 9 * W * 8)]
    if not P:
        return
    if fill:
        cv2.fillPoly(ov, P, 1.0, cv2.LINE_AA, 3)
    else:
        cv2.polylines(ov, P, True, 1.0, th, cv2.LINE_AA, 3)
    m = ov[..., None] * alpha
    img[:] = img * (1 - m) + np.array(color, np.float32) * m


def glow_lines(img, pts_list, color, th=2, glow=10, a=1.0, ga=0.6):
    ov = np.zeros(img.shape[:2], np.float32)
    P = [np.round(p * 8).astype(np.int32) for p in pts_list if p is not None and len(p) > 1]
    if not P:
        return
    cv2.polylines(ov, P, False, 1.0, th, cv2.LINE_AA, 3)
    g = cv2.GaussianBlur(ov, (0, 0), glow)
    col = np.array(color, np.float32)
    img += (g * ga * 3)[..., None] * col
    img[:] = img * (1 - ov[..., None] * a) + (col * 0.6 + 0.4) * ov[..., None] * a


@lru_cache(4)
def _bboxes(res):
    return [[(r[:, 0].min(), r[:, 1].min(), r[:, 0].max(), r[:, 1].max()) for r in rs] for _, rs in countries(res)]


def render_globe(img, g, res="50m", highlight=GULF, land=hex_bgr("#14305A"), border_a=0.45,
                 graticule=True, atmosphere=True, hi_fill=hex_bgr("#3A3424"), hi_line=AMBER, bbox=None,
                 extra=None):
    """bbox=(lon0, lat0, lon1, lat1) limita los anillos dibujados (zooms rápidos).
    extra={nombres: (relleno, línea)} resalta otros países con sus colores."""
    """Dibuja océano, retícula, países y atmósfera sobre img (float BGR)."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.hypot(xx - g.cx, yy - g.cy) / g.R
    disk = np.clip((1 - d) * g.R / 1.5, 0, 1)
    ocean = np.array(hex_bgr("#0A1C38"), np.float32) * (1.15 - 0.45 * np.clip(d, 0, 1) ** 2)[..., None]
    img[:] = img * (1 - disk[..., None]) + ocean * disk[..., None]
    if atmosphere:
        ring = np.exp(-((d - 1.0) / 0.035) ** 2) * (d > 0.9)
        halo = np.exp(-np.clip(d - 1, 0, None) / 0.06) * (d > 1)
        img += (ring * 0.35 + halo * 0.25)[..., None] * np.array(hex_bgr("#4FA3FF"), np.float32)
    if graticule:
        lines = []
        for lon in range(-180, 180, 15):
            lat = np.linspace(-85, 85, 120)
            x, y, z = g.project(np.full_like(lat, lon), lat)
            lines += _split_visible(x, y, z)
        for lat in range(-75, 90, 15):
            lon = np.linspace(-180, 180, 240)
            x, y, z = g.project(lon, np.full_like(lon, lat))
            lines += _split_visible(x, y, z)
        _poly(img, lines, MINT, 0.07, fill=False)
    world = countries(res)
    boxes = _bboxes(res)
    extra = extra or {}
    groups = {"normal": [], "hi": []}
    groups.update({k: [] for k in extra})
    for (n, rs), bb in zip(world, boxes):
        key = "hi" if n in highlight else next((k for k in extra if n in k), "normal")
        for r, b in zip(rs, bb):
            if bbox and (b[2] < bbox[0] or b[0] > bbox[2] or b[3] < bbox[1] or b[1] > bbox[3]):
                continue
            groups[key].append(g.ring_px(r))
    _poly(img, groups["normal"], land, 1.0)
    _poly(img, groups["hi"], hi_fill, 1.0)
    for k, (fc, lc) in extra.items():
        _poly(img, groups[k], fc, 1.0)
    _poly(img, groups["normal"], MINT, border_a, fill=False)
    _poly(img, groups["hi"], hi_line, 0.8, fill=False, th=2)
    for k, (fc, lc) in extra.items():
        _poly(img, groups[k], lc, 0.9, fill=False, th=2)


def _split_visible(x, y, z):
    out, cur = [], []
    for xi, yi, zi in zip(x, y, z):
        if zi > 0:
            cur.append((xi, yi))
        elif cur:
            out.append(np.array(cur))
            cur = []
    if cur:
        out.append(np.array(cur))
    return out


def arc_points(a, b, n=90, alt=0.18):
    """Arco de círculo máximo entre a y b (lon, lat) elevado sobre la superficie."""
    va, vb = sph(*a), sph(*b)
    om = np.arccos(np.clip(va @ vb, -1, 1))
    t = np.linspace(0, 1, n)
    s = np.sin(om)
    v = (np.sin((1 - t) * om)[:, None] * va + np.sin(t * om)[:, None] * vb) / s
    h = 1 + alt * np.sin(np.pi * t) * min(1.0, om / 1.2)
    return v * h[:, None]


def draw_arc(img, g, a, b, prog=1.0, color=AMBER, alt=0.18, th=3, glow=9, particles=0.0, seed=0):
    """Dibuja el arco hasta `prog` (0-1). particles: fase 0-1 para puntos que viajan por él."""
    v = arc_points(a, b, alt=alt)
    k = max(2, int(len(v) * prog))
    x, y, z = g.project3(v[:k])
    r = np.hypot(x - g.cx, y - g.cy) / g.R
    vis = (z > 0) | (r > 1.0)
    segs, cur = [], []
    for xi, yi, ok in zip(x, y, vis):
        if ok:
            cur.append((xi, yi))
        elif cur:
            segs.append(np.array(cur))
            cur = []
    if cur:
        segs.append(np.array(cur))
    glow_lines(img, segs, color, th, glow)
    tip = None
    if k >= 2 and vis[k - 1]:
        tip = (x[k - 1], y[k - 1])
    pts = []
    if particles:
        for j in range(4):
            u = (particles + j / 4 + seed * 0.13) % 1.0
            i = int(u * (k - 1))
            if vis[i]:
                pts.append((x[i], y[i]))
    return tip, pts
