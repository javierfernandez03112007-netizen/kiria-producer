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
LINES, SIZE, SP, Y, DX = ["EMPIEZA", "TORCIDO."], 112, 16, 760, 70        # dos líneas en el cielo limpio, entre el sol y su cabeza (lejos del árbol en flor)


def render():
    env = dict(os.environ, COVER="1", COVER_T="9.95", FPS="60", EVAL="0;")
    subprocess.run(["node", "web/capture.mjs", "out/cover", "0"], cwd=ROOT, env=env, check=True)


def phrase(img, y):
    f = ImageFont.truetype(FONT, SIZE)
    glow = Image.new("L", img.size, 0); dg = ImageDraw.Draw(glow); dt = ImageDraw.Draw(img)
    pos = []
    for i, line in enumerate(LINES):
        ws = [f.getlength(c) for c in line]; tw = sum(ws) + SP * (len(line) - 1); x = (W - tw) / 2 + DX
        for c, w in zip(line, ws):
            pos.append((x, y + i * SIZE * 1.12, c)); x += w + SP
    for x, yy, c in pos:
        dg.text((x, yy), c, font=f, fill=200, anchor="lm")
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    img.paste(Image.new("RGB", img.size, (255, 238, 218)), (0, 0), glow.point(lambda v: int(v * 0.75)))
    for x, yy, c in pos:
        dt.text((x, yy), c, font=f, fill=(36, 26, 20), anchor="lm")


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
