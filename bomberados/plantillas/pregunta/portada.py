"""Miniatura de una Pregunta del día: un fotograma con la pregunta y las 4 opciones + titular en Impact.
Uso: python3 bomberados/plantillas/pregunta/portada.py projects/<p>   (necesita out/frames)
→ out/portada.jpg (1080x1920) y out/portada_grid.jpg (1080x1440, el recorte de la cuadrícula del perfil).
Textos en pregunta.json → "portada": {"titulo": "...", "etiqueta": "..."}; fotograma: 1,3 s después de que salgan las opciones."""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
sys.path.insert(0, REPO)
from engine.subs import norm  # noqa: E402

PROJ = os.path.join(REPO, sys.argv[1])
Q = json.load(open(os.path.join(PROJ, "pregunta.json")))
LINES = json.load(open(os.path.join(PROJ, "tiempos.json")))
IMPACT = os.path.join(REPO, "engine", "fonts", "impact.ttf")
P = Q.get("portada", {})


def at(spec):
    word, k, line = spec
    hits = [w for w in LINES[line - 1]["words"] if norm(w["w"]) == norm(word)]
    return hits[k - 1]["start"] - 0.03


fi = int(round((at(Q["cues"]["opciones"]) + 1.3) * 60))
im = Image.open(os.path.join(PROJ, "out", "frames", f"f{fi:05d}.jpg")).convert("RGB")
W = im.width


def centered(d, y, s, size, fill, stroke=9):
    f = ImageFont.truetype(IMPACT, size)
    while d.textlength(s, font=f) > W - 80:
        size -= 4
        f = ImageFont.truetype(IMPACT, size)
    d.text(((W - d.textlength(s, font=f)) / 2, y), s, font=f, fill=fill, stroke_width=stroke, stroke_fill="#000000")


glow = Image.new("RGBA", im.size, (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse((90, 230, 990, 520), fill=(255, 110, 30, 110))
im = Image.alpha_composite(im.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(70))).convert("RGB")
d = ImageDraw.Draw(im)
f = ImageFont.truetype(IMPACT, 46)
lab = P.get("etiqueta", "PREGUNTA DE EXAMEN OFICIAL")
lw = d.textlength(lab, font=f)
d.rounded_rectangle(((W - lw) / 2 - 28, 236, (W + lw) / 2 + 28, 300), radius=32, fill="#FF5A4E")
d.text(((W - lw) / 2, 242), lab, font=f, fill="#FFFFFF")
centered(d, 306, P.get("titulo", "¿LA SABES?"), 118, "#F2B233")
os.makedirs(os.path.join(PROJ, "out"), exist_ok=True)
im.save(os.path.join(PROJ, "out", "portada.jpg"), quality=94)
im.crop((0, 240, W, 1680)).save(os.path.join(PROJ, "out", "portada_grid.jpg"), quality=94)
print("ok → out/portada.jpg, out/portada_grid.jpg (fotograma", fi, ")")
