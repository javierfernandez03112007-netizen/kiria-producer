"""Portada (1080x1920) y miniatura 4:5 (1080x1350) de «Empieza torcido».
Base: el último plano (él de pie en la hierba, de cara al sol, el árbol en flor y, debajo, la escalera de bloques tachados), sin la frase del vídeo;
encima, la frase en la misma letra monoespaciada, más grande y dentro del centro 4:5 (lo que enseña la cuadrícula de Instagram).
    python3 portada.py --render      (saca out/cover/cover3d.png y compone)
    python3 portada.py               (solo compone)"""
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(ROOT, "..", "..", "engine", "fonts", "SpaceMono-Bold.ttf")
W, H, MINI_Y = 1080, 1920, 285
PHRASE, SIZE, SP, Y = "EMPIEZA TORCIDO.", 74, 14, 430


def render():
    env = dict(os.environ, COVER="1", COVER_T="9.95", FPS="60", EVAL="0;")
    subprocess.run(["node", "web/capture.mjs", "out/cover", "0"], cwd=ROOT, env=env, check=True)


def phrase(img, y):
    f = ImageFont.truetype(FONT, SIZE)
    ws = [f.getlength(c) for c in PHRASE]
    tw = sum(ws) + SP * (len(PHRASE) - 1)
    glow = Image.new("L", img.size, 0); dg = ImageDraw.Draw(glow); dt = ImageDraw.Draw(img)
    x = (W - tw) / 2
    for c, w in zip(PHRASE, ws):
        dg.text((x, y), c, font=f, fill=200, anchor="lm"); x += w + SP
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    img.paste(Image.new("RGB", img.size, (255, 236, 214)), (0, 0), glow.point(lambda v: int(v * 0.7)))
    x = (W - tw) / 2
    for c, w in zip(PHRASE, ws):
        dt.text((x, y), c, font=f, fill=(36, 26, 20), anchor="lm"); x += w + SP


def main():
    base = Image.open(os.path.join(ROOT, "out", "cover", "cover3d.png")).convert("RGB").resize((W, H))
    img = base.copy(); phrase(img, Y)
    img.save(os.path.join(ROOT, "out", "portada.jpg"), quality=95)
    m = base.crop((0, MINI_Y, W, MINI_Y + 1350)); phrase(m, Y - MINI_Y)
    m.save(os.path.join(ROOT, "out", "miniatura.jpg"), quality=95)
    print("portada → out/portada.jpg · miniatura → out/miniatura.jpg")


if __name__ == "__main__":
    if "--render" in sys.argv:
        render()
    main()
