"""Miniatura de la promo del simulacro: el fotograma con «DOMINGO · 1 NOV / SIMULACRO / EN DIRECTO / ADRIÁN LUNA /
ÉLITE BOMBEROS» + gancho arriba. Uso: python3 projects/bomberados_simulacro/portada.py   (necesita out/frames)
→ out/portada.jpg (1080x1920) y out/portada_grid.jpg (1080x1440, el recorte de la cuadrícula del perfil)."""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

PROJ = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(PROJ, "..", ".."))
sys.path.insert(0, REPO)
from engine.subs import norm  # noqa: E402

V = json.load(open(os.path.join(PROJ, "video.json")))
LINES = json.load(open(os.path.join(PROJ, "tiempos.json")))
BEBAS = os.path.join(REPO, "engine", "fonts", "BebasNeue-Regular.ttf")
P = V.get("portada", {})


def at(spec):
    word, k, line = spec
    return [w for w in LINES[line - 1]["words"] if norm(w["w"]) == norm(word)][k - 1]["start"] - 0.03


fi = int(round((at(V["cues"]["elite"]) + 0.75) * 60))
im = Image.open(os.path.join(PROJ, "out", "frames", f"f{fi:05d}.jpg")).convert("RGB")
W = im.width
glow = Image.new("RGBA", im.size, (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse((90, 220, 990, 480), fill=(255, 110, 30, 100))
im = Image.alpha_composite(im.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(70))).convert("RGB")
d = ImageDraw.Draw(im)


def centered(y, s, size, fill, stroke=9):
    f = ImageFont.truetype(BEBAS, size)
    while d.textlength(s, font=f) > W - 80:
        size -= 4
        f = ImageFont.truetype(BEBAS, size)
    d.text(((W - d.textlength(s, font=f)) / 2, y), s, font=f, fill=fill, stroke_width=stroke, stroke_fill="#000000")


f = ImageFont.truetype(BEBAS, 50)
lab = P.get("etiqueta", "DOMINGO 1 NOV · ONLINE · 10 €")
lw = d.textlength(lab, font=f)
d.rounded_rectangle(((W - lw) / 2 - 28, 250, (W + lw) / 2 + 28, 318), radius=34, fill="#FF3B3B")
d.text(((W - lw) / 2, 256), lab, font=f, fill="#FFFFFF")
centered(326, P.get("titulo", "¿HARTO DE SUSPENDER?"), 132, "#F2B233")
os.makedirs(os.path.join(PROJ, "out"), exist_ok=True)
im.save(os.path.join(PROJ, "out", "portada.jpg"), quality=94)
im.crop((0, 240, W, 1680)).save(os.path.join(PROJ, "out", "portada_grid.jpg"), quality=94)
print("ok → out/portada.jpg, out/portada_grid.jpg (fotograma", fi, ")")
