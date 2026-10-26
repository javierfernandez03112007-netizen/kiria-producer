"""Subtítulos «UI explainer»: palabra a palabra arriba, palabra clave dentro de un recuadro de selección
(estilo Figma, con tiradores y medidas) y emojis en línea que saltan al decirse.

    subs = Subs(json.load(open("tiempos.json")), key={...}, emoji={...})
    subs.draw(img, t)            # img BGR float 0-1

tiempos.json: [{text, start, end, words: [{w, start, end}]}] (ver projects/cobertura/ajustar_voz.py).
key:   {nº de frase (1..): ["palabra", ...]}   palabras clave (sin signos, minúsculas); si son seguidas, un solo recuadro
       (o {nº de frase: {"palabra": "#RRGGBB"}} con style='accent': cada palabra clave en su color)
emoji: {(nº de frase, "palabra"): "🛰️"}         emoji que aparece justo después de esa palabra
"""
import os
import re
from functools import lru_cache

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from engine.fin_draw import blend, paste, prog, eo, eback, clamp, font, text, hex_bgr

EMOJI_FONT = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"


def norm(w):
    return re.sub(r"[^\wáéíóúñü]", "", w.lower())


@lru_cache(512)
def word_sprite(w, size, stroke=7, color=None, face="black"):
    """Palabra blanca con contorno negro y sombra (legible sobre fondo blanco o negro). face: peso de fin_draw.font."""
    f = font(face, size)
    asc, desc = f.getmetrics()
    pad = stroke + int(size * 0.3)
    tw = int(f.getlength(w)) + 2 * pad
    th = asc + desc + 2 * pad
    fill = Image.new("L", (tw, th), 0)
    edge = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(fill).text((pad, pad), w, font=f, fill=255)
    ImageDraw.Draw(edge).text((pad, pad), w, font=f, fill=255, stroke_width=stroke, stroke_fill=255)
    a_f = np.asarray(fill, np.float32) / 255
    a_e = np.asarray(edge, np.float32) / 255
    sh = np.roll(cv2.GaussianBlur(a_e, (0, 0), size * 0.08), int(size * 0.06), axis=0) * 0.55
    a = np.maximum(a_e, sh)
    rgb = np.repeat(a_f[..., None], 3, axis=2)        # blanco dentro, negro en el contorno y la sombra
    if color is not None:                              # color de acento (BGR 0-1) dentro de la letra
        rgb = a_f[..., None] * np.array(color, np.float32)[None, None, :]
    return rgb.astype(np.float32), a.astype(np.float32), pad


@lru_cache(64)
def emoji_sprite(e, size):
    """Emoji de Noto (color) pasado a escala de grises con algo de contraste y un contorno oscuro."""
    try:
        f = ImageFont.truetype(EMOJI_FONT, 109)
    except OSError:
        return None
    im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((10, 10), e, font=f, embedded_color=True)
    bb = im.getbbox()
    if not bb:
        return None
    im = im.crop(bb)
    s = size / max(im.size)
    im = im.resize((max(1, int(im.size[0] * s)), max(1, int(im.size[1] * s))), Image.LANCZOS)
    arr = np.asarray(im, np.float32) / 255
    g = arr[..., :3] @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    g = np.clip((g - 0.5) * 1.25 + 0.55, 0, 1)
    a = arr[..., 3]
    pad = 6
    a2 = np.pad(a, pad)
    g2 = np.pad(g, pad)
    edge = cv2.dilate(a2, np.ones((5, 5), np.uint8))
    out_a = np.maximum(a2, edge * 0.9)
    rgb = np.repeat((g2 * a2)[..., None], 3, axis=2)
    return rgb.astype(np.float32), out_a.astype(np.float32)


class Subs:
    def __init__(self, lines, key=None, emoji=None, y=330, size=88, maxw=940, max_words=4, max_chars=21, W=1080, style='box', accent=None, stroke=7,
                 face="black"):
        """style='box': palabra clave en recuadro de selección; style='accent': palabra clave en color (accent, BGR 0-1).
        face: letra de los subtítulos («black» = Inter Black; «impact» = Impact)."""
        self.size, self.y, self.maxw, self.W = size, y, maxw, W
        self.style, self.accent, self.stroke, self.face = style, accent, stroke, face
        key = key or {}
        emoji = emoji or {}
        self.chunks = []
        for li, ln in enumerate(lines, 1):
            ws = [dict(w) for w in ln["words"]]
            kk = key.get(li, [])
            for w in ws:
                w["key"] = norm(w["w"]) in kk
                # key[li] también puede ser {palabra: "#RRGGBB"}: cada palabra clave con su color
                w["kcol"] = hex_bgr(kk[norm(w["w"])]) if isinstance(kk, dict) and w["key"] else None
                w["emoji"] = emoji.get((li, norm(w["w"])))
            cur = []
            for i, w in enumerate(ws):
                cur.append(w)
                chars = sum(len(x["w"]) + 1 for x in cur)
                nxt = ws[i + 1] if i + 1 < len(ws) else None
                brk = re.search(r"[,:;.?!]$", w["w"]) is not None
                # no se corta dentro de un grupo de palabras clave
                keep = nxt is not None and w["key"] and nxt["key"]
                if nxt is None or (not keep and (brk or len(cur) >= max_words or chars + len(nxt["w"]) > max_chars)):
                    self.chunks.append(dict(words=cur, t0=cur[0]["start"] - 0.06))
                    cur = []
        for i, c in enumerate(self.chunks):
            nxt = self.chunks[i + 1]["t0"] if i + 1 < len(self.chunks) else 1e9
            c["t1"] = min(nxt, c["words"][-1]["end"] + 0.7)

    def layout(self, words):
        """Posiciones de cada palabra (centradas, hasta 2 renglones)."""
        sp = self.size * 0.26
        items = []
        for w in words:
            rgb, a, pad = word_sprite(w["w"], self.size, self.stroke, None, self.face)
            wid = a.shape[1] - 2 * pad
            ew = self.size * 0.95 if w["emoji"] else 0
            items.append((w, wid, ew))
        rows, cur, cw = [], [], 0
        for it in items:
            iw = it[1] + it[2] + (sp if cur else 0)
            if cur and cw + iw > self.maxw:
                rows.append((cur, cw)); cur, cw = [], 0
                iw = it[1] + it[2]
            cur.append(it); cw += iw
        rows.append((cur, cw))
        out = []
        lh = self.size * 1.18
        for r, (row, rw) in enumerate(rows):
            x = (self.W - rw) / 2
            y = self.y + r * lh
            for k, (w, wid, ew) in enumerate(row):
                if k:
                    x += sp
                out.append((w, x, y, wid, ew))
                x += wid + ew
        return out

    def draw(self, img, t, alpha=1.0):
        c = next((c for c in self.chunks if c["t0"] <= t < c["t1"]), None)
        if c is None or alpha <= 0.01:
            return
        fade = 1 - prog(t, c["t1"] - 0.12, 0.12)
        items = self.layout(c["words"])
        keys = [it for it in items if it[0]["key"] and t >= it[0]["start"] - 0.05]
        # recuadro de selección alrededor de las palabras clave ya dichas
        if keys and self.style == 'box':
            k0 = min(keys, key=lambda it: it[0]["start"])
            u = eback(prog(t, k0[0]["start"] - 0.05, 0.22))
            x0 = min(it[1] for it in keys) - 16
            x1 = max(it[1] + it[3] for it in keys) + 16
            y0 = min(it[2] for it in keys) - self.size * 0.55 - 6
            y1 = max(it[2] for it in keys) + self.size * 0.62 + 6
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            hw, hh = (x1 - x0) / 2 * (0.85 + 0.15 * u), (y1 - y0) / 2 * (0.85 + 0.15 * u)
            self.selection(img, cx - hw, cy - hh, cx + hw, cy + hh, alpha * fade * clamp(u * 1.4))
        for w, x, y, wid, ew in items:
            if t < w["start"] - 0.05:
                continue
            p = prog(t, w["start"] - 0.05, 0.16)
            col = (w.get("kcol") or self.accent) if (self.style == 'accent' and w["key"]) else None
            rgb, a, pad = word_sprite(w["w"], self.size, self.stroke, col, self.face)
            k = 0.72 + 0.28 * eback(p)
            paste(img, (rgb, a), x + wid / 2, y, alpha * fade * clamp(p * 2.5), scale=k)
            if ew:
                es = emoji_sprite(w["emoji"], int(self.size * 0.82))
                if es is not None:
                    pe = prog(t, w["start"] + 0.08, 0.3)
                    bob = -10 * np.sin(np.pi * clamp(pe * 1.4))
                    paste(img, es, x + wid + ew / 2 + 6, y + bob, alpha * fade * clamp(pe * 3),
                          scale=0.4 + 0.6 * eback(pe), rot=-12 * (1 - pe))

    def selection(self, img, x0, y0, x1, y1, a):
        if a <= 0.01:
            return
        H, W = img.shape[:2]
        th = 3
        for (xa, ya, xb, yb) in [(x0, y0, x1, y0 + th), (x0, y1 - th, x1, y1), (x0, y0, x0 + th, y1), (x1 - th, y0, x1, y1)]:
            xa, ya, xb, yb = int(xa), int(ya), int(xb), int(yb)
            xa, ya, xb, yb = max(xa, 0), max(ya, 0), min(xb, W), min(yb, H)
            if xa < xb and ya < yb:
                img[ya:yb, xa:xb] = img[ya:yb, xa:xb] * (1 - a) + a
        # sombra suave del recuadro: realce sutil del fondo dentro
        xi0, yi0, xi1, yi1 = int(max(x0 + th, 0)), int(max(y0 + th, 0)), int(min(x1 - th, W)), int(min(y1 - th, H))
        if xi0 < xi1 and yi0 < yi1:
            img[yi0:yi1, xi0:xi1] = img[yi0:yi1, xi0:xi1] * (1 - 0.18 * a) + 0.0 * a
        # tiradores
        s = 14
        for hx, hy in [(x0, y0), (x1, y0), (x0, y1), (x1, y1)]:
            hx, hy = int(hx), int(hy)
            for (ww, col) in [(s, 0.0), (s - 5, 1.0)]:
                xa, ya, xb, yb = hx - ww // 2, hy - ww // 2, hx + ww // 2 + 1, hy + ww // 2 + 1
                xa, ya, xb, yb = max(xa, 0), max(ya, 0), min(xb, W), min(yb, H)
                if xa < xb and ya < yb:
                    img[ya:yb, xa:xb] = img[ya:yb, xa:xb] * (1 - a) + col * a
        # etiqueta de medidas bajo el recuadro
        tag = f"{int(x1 - x0)} × {int(y1 - y0)}"
        tw = font("mono", 22).getlength(tag) + 22
        cx, ty = (x0 + x1) / 2, y1 + 26
        xa, ya, xb, yb = int(cx - tw / 2), int(ty - 17), int(cx + tw / 2), int(ty + 17)
        xa, ya, xb, yb = max(xa, 0), max(ya, 0), min(xb, W), min(yb, H)
        if xa < xb and ya < yb:
            img[ya:yb, xa:xb] = img[ya:yb, xa:xb] * (1 - a) + a
        paste(img, text(tag, 22, "mono", "#111111", shadow=0), cx, ty, a)
