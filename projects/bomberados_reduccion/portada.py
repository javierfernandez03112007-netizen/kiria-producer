"""Miniatura de la Pregunta del día #1: fotograma con la reducción y las 4 opciones + titular en Impact.
Uso: python3 portada.py  (necesita out/frames/f00450.jpg) → out/portada.jpg (1080x1920) y out/portada_grid.jpg (1080x1440, recorte del perfil)."""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
IMPACT = os.path.join(ROOT, "..", "..", "engine", "fonts", "impact.ttf")
im = Image.open(os.path.join(ROOT, "out", "frames", "f00450.jpg")).convert("RGB")
W = im.width


def centered(d, y, s, size, fill, stroke=10):
    f = ImageFont.truetype(IMPACT, size)
    w = d.textlength(s, font=f)
    d.text(((W - w) / 2, y), s, font=f, fill=fill, stroke_width=stroke, stroke_fill="#000000")


# halo de brasa detrás del titular
glow = Image.new("RGBA", im.size, (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse((90, 230, 990, 520), fill=(255, 110, 30, 110))
im = Image.alpha_composite(im.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(70))).convert("RGB")
d = ImageDraw.Draw(im)
# etiqueta
f = ImageFont.truetype(IMPACT, 46)
lab = "PREGUNTA DE EXAMEN OFICIAL"
lw = d.textlength(lab, font=f)
d.rounded_rectangle(((W - lw) / 2 - 28, 236, (W + lw) / 2 + 28, 300), radius=32, fill="#FF5A4E")
d.text(((W - lw) / 2, 242), lab, font=f, fill="#FFFFFF")
centered(d, 306, "¿Y LA PRESIÓN?", 118, "#F2B233", 9)
im.save(os.path.join(ROOT, "out", "portada.jpg"), quality=94)
im.crop((0, 240, W, 1680)).save(os.path.join(ROOT, "out", "portada_grid.jpg"), quality=94)
print("ok")
