"""Borrador en fotos (storyboard) del reel «Dos caminos» para @mybrushclub.

Dibujo esquemático con PIL, solo para enseñar encuadres, colores y ritmo; el aspecto final
(3D animado) sale de los prompts de PERSONAJES_Y_PROMPTS.md.

    python3 storyboard.py        # storyboard/01.png … 10.png y storyboard/hoja_contactos.jpg
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(AQUI, "..", "..", "engine", "fonts")
OUT = os.path.join(AQUI, "storyboard")
W, H = 1080, 1920
SS = 2  # supersampling para suavizar bordes

# Paletas
GRIS = dict(sky=(150, 150, 146), sky2=(185, 182, 172), ground=(118, 108, 92), path=(146, 138, 124),
            tree=(92, 80, 66), grass=(128, 118, 90), fog=(200, 198, 190))
VIVO = dict(sky=(120, 196, 236), sky2=(255, 226, 170), ground=(92, 178, 86), path=(232, 208, 160),
            tree=(70, 150, 70), tree2=(120, 196, 90), trunk=(120, 84, 56))
FLORES = [(255, 120, 150), (255, 206, 84), (186, 132, 255), (255, 160, 90), (255, 255, 255), (110, 190, 255)]

PIEL_LEO, PELO_LEO, OJO_LEO = (196, 146, 108), (30, 26, 28), (214, 150, 52)
PIEL_MARCOS, PELO_MARCOS = (236, 196, 168), (150, 112, 76)
ROPA = {
    "leo_camino": dict(top=(146, 176, 140), inner=(244, 236, 216), legs=(222, 204, 170), shoes=(250, 250, 250)),
    "leo_trabajo": dict(top=(150, 196, 236), inner=(150, 196, 236), legs=(214, 194, 158), shoes=(110, 76, 52)),
    "leo_pijama": dict(top=(150, 222, 196), inner=(150, 222, 196), legs=(150, 222, 196), shoes=(240, 240, 240)),
    "marcos": dict(top=(128, 128, 132), inner=(128, 128, 132), legs=(112, 100, 86), shoes=(90, 88, 84)),
}
MASA = [(110, 110, 114), (96, 88, 78), (140, 128, 100), (72, 82, 100), (124, 116, 108), (88, 92, 96)]


def font(peso, size):
    nombre = {"black": "Inter-Black.otf", "bold": "Inter-Bold.otf", "semi": "Inter-SemiBold.otf",
              "medium": "Inter-Medium.otf"}[peso]
    return ImageFont.truetype(os.path.join(FONTS, nombre), size * SS)


class Lienzo:
    """Coordenadas lógicas 1080x1920; dibuja a SS× y reduce al final."""

    def __init__(self, color=(0, 0, 0)):
        self.im = Image.new("RGB", (W * SS, H * SS), color)
        self.d = ImageDraw.Draw(self.im, "RGBA")

    @staticmethod
    def _p(pts):
        return [(x * SS, y * SS) for x, y in pts]

    def poly(self, pts, fill, outline=None, width=0):
        self.d.polygon(self._p(pts), fill=fill, outline=outline, width=width * SS)

    def ell(self, cx, cy, rx, ry, fill, outline=None, width=0):
        self.d.ellipse([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS], fill=fill,
                       outline=outline, width=int(width * SS))

    def rect(self, x0, y0, x1, y1, fill, r=0, outline=None, width=0):
        self.d.rounded_rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS], radius=r * SS, fill=fill,
                                 outline=outline, width=int(width * SS))

    def line(self, pts, fill, width):
        self.d.line(self._p(pts), fill=fill, width=int(width * SS), joint="curve")

    def arc(self, cx, cy, rx, ry, a0, a1, fill, width):
        self.d.arc([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS], a0, a1, fill=fill,
                   width=int(width * SS))

    def chord(self, cx, cy, rx, ry, a0, a1, fill):
        self.d.chord([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS], a0, a1, fill=fill)

    def text(self, xy, txt, size, peso="bold", fill=(255, 255, 255), anchor="mm", sombra=True):
        f = font(peso, size)
        x, y = xy[0] * SS, xy[1] * SS
        if sombra:
            self.d.text((x + 3 * SS, y + 3 * SS), txt, font=f, fill=(0, 0, 0, 120), anchor=anchor)
        self.d.text((x, y), txt, font=f, fill=fill, anchor=anchor)

    def gradiente(self, y0, y1, c0, c1):
        for y in range(int(y0 * SS), int(y1 * SS)):
            k = (y - y0 * SS) / max(1, (y1 - y0) * SS)
            c = tuple(int(a + (b - a) * k) for a, b in zip(c0, c1))
            self.d.line([(0, y), (W * SS, y)], fill=c)

    def pegar(self, im, x, y, mask=None):
        self.im.paste(im, (int(x * SS), int(y * SS)), mask)

    def desenfocar(self, box, r):
        box = tuple(int(v * SS) for v in box)
        self.im.paste(self.im.crop(box).filter(ImageFilter.GaussianBlur(r * SS)), box[:2])

    def final(self):
        return self.im.resize((W, H), Image.LANCZOS)


# ---------------------------------------------------------------- elementos

def arbol_seco(c, x, y, s, col):
    c.line([(x, y), (x, y - 120 * s)], col, 12 * s)
    for ang, ln in ((-40, 70), (35, 60), (-20, 45), (55, 40)):
        a = math.radians(ang - 90)
        yy = y - (70 + abs(ang)) * s
        c.line([(x, yy), (x + math.cos(a) * ln * s, yy + math.sin(a) * ln * s)], col, 6 * s)


def arbol_vivo(c, x, y, s, rnd):
    c.rect(x - 9 * s, y - 110 * s, x + 9 * s, y, VIVO["trunk"], r=4 * s)
    for dx, dy, r in ((0, -150, 70), (-45, -120, 50), (45, -120, 50), (0, -200, 50)):
        col = VIVO["tree"] if rnd.random() < .5 else VIVO["tree2"]
        c.ell(x + dx * s, y + dy * s, r * s, r * s * .9, col)
    for _ in range(5):
        c.ell(x + rnd.uniform(-70, 70) * s, y + rnd.uniform(-220, -100) * s, 6 * s, 6 * s, rnd.choice(FLORES))


def flores(c, x0, y0, x1, y1, n, rnd, s0=5, s1=12):
    for _ in range(n):
        y = rnd.uniform(y0, y1)
        k = (y - y0) / max(1, y1 - y0)
        r = s0 + (s1 - s0) * k
        x = rnd.uniform(x0, x1)
        c.line([(x, y), (x, y + r * 1.8)], (60, 140, 60), max(1, r * .3))
        c.ell(x, y, r, r, rnd.choice(FLORES))
        c.ell(x, y, r * .35, r * .35, (255, 230, 120))


def ojo(c, cx, cy, r, iris, mira=(0, 0), parpado=0.0, cansado=False):
    c.ell(cx, cy, r * .82, r, (255, 255, 255), outline=(40, 30, 30), width=max(1, r * .06))
    ix, iy = cx + mira[0] * r * .3, cy + mira[1] * r * .3
    c.ell(ix, iy, r * .55, r * .6, iris)
    c.ell(ix, iy, r * .28, r * .3, (20, 16, 18))
    c.ell(ix - r * .18, iy - r * .22, r * .14, r * .14, (255, 255, 255))
    if parpado > 0:
        c.chord(cx, cy, r * .9, r * 1.08, 180, 360, None)
        c.rect(cx - r * .95, cy - r * 1.1, cx + r * .95, cy - r * 1.1 + r * 2.1 * parpado, PIEL_LEO)
        c.line([(cx - r * .85, cy - r * 1.1 + r * 2.1 * parpado), (cx + r * .85, cy - r * 1.1 + r * 2.1 * parpado)],
               (40, 30, 30), r * .08)
    if cansado:
        c.arc(cx, cy + r * 1.05, r * .7, r * .3, 20, 160, (150, 110, 120, 150), r * .1)


def cabeza(c, cx, cy, r, piel, pelo, iris, rizos=False, gesto="sonrisa", mira=(0, 0), cansado=False,
           parpado=0.0):
    c.ell(cx - r * .95, cy + r * .05, r * .18, r * .24, piel)  # orejas
    c.ell(cx + r * .95, cy + r * .05, r * .18, r * .24, piel)
    c.ell(cx, cy, r, r * 1.08, piel)
    # pelo
    if rizos:
        c.chord(cx, cy - r * .1, r * 1.02, r * 1.0, 180, 360, pelo)
        for i in range(9):
            a = math.radians(180 + i * 22.5)
            c.ell(cx + math.cos(a) * r * .92, cy - r * .2 + math.sin(a) * r * .9, r * .26, r * .26, pelo)
    else:
        c.chord(cx, cy - r * .12, r * 1.04, r * 1.0, 175, 365, pelo)
        for i in range(5):
            c.poly([(cx - r * .8 + i * r * .4, cy - r * .55), (cx - r * .6 + i * r * .4, cy - r * .2),
                    (cx - r * .4 + i * r * .4, cy - r * .55)], pelo)
    # cejas
    for sx in (-1, 1):
        c.line([(cx + sx * r * .55, cy - r * .42 + (r * .06 if cansado else 0)), (cx + sx * r * .18, cy - r * .48)],
               pelo, r * .11)
    for sx in (-1, 1):
        ojo(c, cx + sx * r * .38, cy - r * .08, r * .27, iris, mira, parpado, cansado)
    c.arc(cx, cy + r * .2, r * .1, r * .08, 20, 160, tuple(int(v * .8) for v in piel), r * .05)  # nariz
    if gesto == "sonrisa":
        c.chord(cx, cy + r * .45, r * .36, r * .24, 0, 180, (120, 40, 50))
        c.chord(cx, cy + r * .42, r * .3, r * .1, 0, 180, (255, 255, 255))
    elif gesto == "bostezo":
        c.ell(cx, cy + r * .56, r * .18, r * .26, (90, 30, 40))
    elif gesto == "serio":
        c.arc(cx, cy + r * .62, r * .2, r * .08, 200, 340, (120, 60, 60), r * .05)
    elif gesto == "cepillo":
        c.ell(cx, cy + r * .52, r * .22, r * .14, (120, 40, 50))
        c.ell(cx, cy + r * .52, r * .16, r * .08, (255, 255, 255))
        for i in range(6):
            c.ell(cx - r * .3 + i * r * .1, cy + r * .66 + (i % 2) * r * .03, r * .05, r * .05, (255, 255, 255, 220))


def persona(c, x, yp, h, ropa, piel=PIEL_LEO, pelo=PELO_LEO, iris=OJO_LEO, espalda=False, cabizbajo=False,
            movil=False, paso=0.0, rizos=True, gesto="sonrisa"):
    """Figura cartoon de cuerpo entero; yp = pies, h = altura total."""
    rh = h * .2
    hy = yp - h + rh
    torso_y0, torso_y1 = hy + rh * .9, yp - h * .36
    if cabizbajo:
        hy += rh * .25
    # piernas
    for sx in (-1, 1):
        dx = sx * h * .06 + paso * sx * h * .05
        c.rect(x + dx - h * .05, torso_y1 - 5, x + dx + h * .05, yp - h * .03, ropa["legs"], r=h * .03)
        c.ell(x + dx + (0 if espalda else h * .01), yp - h * .02, h * .07, h * .035, ropa["shoes"])
    # torso
    c.rect(x - h * .15, torso_y0, x + h * .15, torso_y1 + h * .02, ropa["top"], r=h * .07)
    if not espalda and ropa["inner"] != ropa["top"]:
        c.poly([(x - h * .05, torso_y0 + 2), (x + h * .05, torso_y0 + 2), (x + h * .04, torso_y1),
                (x - h * .04, torso_y1)], ropa["inner"])
    # brazos
    for sx in (-1, 1):
        if movil:
            c.line([(x + sx * h * .14, torso_y0 + h * .05), (x + sx * h * .1, torso_y0 + h * .2),
                    (x + sx * h * .02, torso_y0 + h * .17)], ropa["top"], h * .07)
        else:
            c.line([(x + sx * h * .16, torso_y0 + h * .05),
                    (x + sx * h * .19 - paso * sx * h * .04, torso_y1 - h * .02)], ropa["top"], h * .07)
            c.ell(x + sx * h * .19 - paso * sx * h * .04, torso_y1, h * .035, h * .035, piel)
    if movil:
        c.rect(x - h * .04, torso_y0 + h * .12, x + h * .04, torso_y0 + h * .2, (30, 30, 34), r=h * .01)
        c.ell(x, torso_y0 + h * .1, h * .1, h * .06, (190, 220, 255, 60))
    # cabeza
    if espalda:
        c.ell(x, hy, rh, rh * 1.08, pelo)
        c.ell(x - rh * .95, hy + rh * .1, rh * .16, rh * .22, piel)
        c.ell(x + rh * .95, hy + rh * .1, rh * .16, rh * .22, piel)
    else:
        cabeza(c, x, hy, rh, piel, pelo, iris, rizos=rizos, gesto=gesto, mira=(0, .4) if cabizbajo else (0, 0))


def camino_bifurcado(c, horizonte, rnd):
    """Plano alto: camino que llega desde abajo y se abre en dos."""
    # mitad izquierda apagada / derecha viva
    c.gradiente(0, horizonte, GRIS["sky"], GRIS["sky2"])
    sky = Lienzo()
    sky.gradiente(0, horizonte, VIVO["sky"], VIVO["sky2"])
    mask = Image.new("L", (W * SS, H * SS), 0)
    md = ImageDraw.Draw(mask)
    md.polygon([(W * SS * .5, 0), (W * SS, 0), (W * SS, H * SS), (W * SS * .5, H * SS)], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(60 * SS))
    c.im.paste(sky.im, (0, 0), mask)
    c.poly([(0, horizonte), (W / 2, horizonte), (W / 2, H), (0, H)], GRIS["ground"])
    c.poly([(W / 2, horizonte), (W, horizonte), (W, H), (W / 2, H)], VIVO["ground"])
    # caminos
    c.poly([(W * .40, H), (W * .60, H), (W * .52, H * .78), (W * .48, H * .78)], (190, 175, 150))
    c.poly([(W * .48, H * .78), (W * .50, H * .78), (W * .27, horizonte), (W * .19, horizonte)], GRIS["path"])
    c.poly([(W * .50, H * .78), (W * .52, H * .78), (W * .80, horizonte), (W * .74, horizonte)], VIVO["path"])
    c.poly([(W * .40, H * .985), (W * .52, H * .78), (W * .25, horizonte + 4), (W * .2, horizonte + 4),
            (W * .02, H * .83), (0, H * .86)], GRIS["path"])
    c.poly([(W * .6, H * .985), (W * .5, H * .78), (W * .76, horizonte + 4), (W * .8, horizonte + 4),
            (W * .98, H * .83), (W, H * .86)], VIVO["path"])
    # árboles y flores
    for _ in range(14):
        y = rnd.uniform(horizonte + 20, H * .95)
        s = .35 + 1.0 * (y - horizonte) / (H - horizonte)
        arbol_seco(c, rnd.uniform(0, W * .12) if rnd.random() < .6 else rnd.uniform(W * .02, W * .14), y, s,
                   GRIS["tree"])
    for _ in range(12):
        y = rnd.uniform(horizonte + 20, H * .95)
        s = .3 + .9 * (y - horizonte) / (H - horizonte)
        arbol_vivo(c, rnd.uniform(W * .86, W * 1.02), y, s, rnd)
    flores(c, W * .55, horizonte + 10, W, H, 260, rnd, 3, 13)
    for _ in range(80):  # hierba seca
        y = rnd.uniform(horizonte, H)
        x = rnd.uniform(0, W * .45)
        c.line([(x, y), (x + rnd.uniform(-6, 6), y - 14)], GRIS["grass"], 2)


def boca(c, cx, cy, w, edad_mala=0, sana=True, tono=None):
    """Boca sonriendo en primer plano. edad_mala 0..3 = deterioro progresivo."""
    piel = tono or (PIEL_LEO if sana else PIEL_MARCOS)
    c.rect(cx - w * .75, cy - w * .45, cx + w * .75, cy + w * .45, piel, r=w * .3)
    c.chord(cx, cy - w * .02, w * .58, w * .32, 0, 180, (150, 50, 60))   # labio inferior
    c.chord(cx, cy + w * .02, w * .58, w * .18, 180, 360, (170, 70, 80))  # labio superior
    c.chord(cx, cy, w * .5, w * .25, 0, 180, (70, 20, 30))  # interior
    encia = (232, 120, 130) if sana or edad_mala == 0 else [(232, 120, 130), (214, 92, 100), (196, 70, 80),
                                                              (180, 60, 70)][edad_mala]
    retraccion = 0 if sana else [0, .02, .05, .08][edad_mala]
    c.rect(cx - w * .48, cy - w * .02, cx + w * .48, cy + w * .06 + retraccion * w, encia, r=w * .04)
    base = (250, 250, 246) if sana else [(244, 236, 206), (232, 214, 160), (214, 190, 130), (180, 150, 96)][edad_mala]
    n = 8
    tw = w * .9 / n
    for i in range(n):
        x0 = cx - w * .45 + i * tw
        centro = abs(i - (n - 1) / 2)
        th = w * (.2 - centro * .012)
        if not sana and edad_mala >= 3 and i == 5:
            continue  # diente que falta
        col = base
        if not sana and edad_mala >= 2 and i in (1, 6):
            col = tuple(int(v * .82) for v in base)
        c.rect(x0 + 2, cy + w * .04 + retraccion * w, x0 + tw - 2, cy + w * .04 + th, col, r=w * .03)
        if not sana and edad_mala >= 1:
            c.rect(x0 + 2, cy + w * .04 + retraccion * w, x0 + tw - 2, cy + w * .04 + retraccion * w + w * .02 * edad_mala,
                   (196, 170, 100, 200), r=w * .01)  # sarro
        if not sana and edad_mala >= 2 and i == 2:
            c.ell(x0 + tw * .5, cy + w * .04 + th * .6, tw * .16, tw * .16, (70, 50, 40))  # caries
        if sana:
            c.rect(x0 + tw * .25, cy + w * .07, x0 + tw * .4, cy + w * .04 + th * .7, (255, 255, 255, 160), r=3)


def marco_iris(c, cx, cy, r, color=OJO_LEO):
    """Anillo de iris alrededor de un clip (los recuerdos se ven a través del ojo)."""
    ring = Image.new("L", (W * SS, H * SS), 255)
    d = ImageDraw.Draw(ring)
    d.ellipse([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS], fill=0)
    capa = Image.new("RGB", (W * SS, H * SS), color)
    cd = ImageDraw.Draw(capa)
    for i in range(160):
        a = i / 160 * math.tau
        col = tuple(int(v * random.uniform(.55, 1.15)) if v * 1.15 < 255 else v for v in color)
        cd.line([(cx + math.cos(a) * r) * SS, (cy + math.sin(a) * r) * SS,
                 (cx + math.cos(a) * r * 1.6) * SS, (cy + math.sin(a) * r * 1.6) * SS], fill=col, width=5 * SS)
    cd.ellipse([(cx - r * 1.62) * SS, (cy - r * 1.62) * SS, (cx + r * 1.62) * SS, (cy + r * 1.62) * SS],
               outline=(60, 40, 20), width=14 * SS)
    out = Image.new("RGB", (W * SS, H * SS), (250, 246, 240))
    od = ImageDraw.Draw(out)
    od.rectangle([0, 0, W * SS, H * SS], fill=(240, 236, 232))
    m2 = Image.new("L", (W * SS, H * SS), 0)
    ImageDraw.Draw(m2).ellipse([(cx - r * 1.62) * SS, (cy - r * 1.62) * SS, (cx + r * 1.62) * SS,
                                (cy + r * 1.62) * SS], fill=255)
    out.paste(capa, (0, 0), m2)
    ring = ring.filter(ImageFilter.GaussianBlur(10 * SS))
    c.im.paste(out, (0, 0), ring)
    c.ell(cx, cy, r + 4, r + 4, None, outline=(30, 20, 14, 200), width=10)


def etiqueta_tiempo(c, txt, x=W - 60, y=150):
    c.rect(x - 240, y - 46, x, y + 46, (0, 0, 0, 130), r=46)
    c.text((x - 120, y), txt, 46, "bold")


def pie(c, txt):
    c.rect(70, 1800, W - 70, 1880, (0, 0, 0, 170), r=40)
    c.text((W / 2, 1840), txt, 38, "bold")


def velocidad(c, txt="×1,8"):
    c.rect(60, 104, 260, 196, (255, 255, 255, 200), r=46)
    c.text((160, 150), "▶▶ " + txt, 40, "black", fill=(30, 30, 30), sombra=False)


# ---------------------------------------------------------------- planos

def plano01():
    rnd = random.Random(1)
    c = Lienzo()
    hz = 560
    camino_bifurcado(c, hz, rnd)
    # masa por el camino apagado (de espaldas, cada vez más pequeña)
    for i in range(140):
        k = rnd.random() ** .8
        y = H * .78 - k * (H * .78 - hz)
        # centro del camino izquierdo a esa altura
        xc = W * .46 + (W * .23 - W * .46) * k
        ancho = 170 * (1 - k) + 30
        x = xc + rnd.uniform(-ancho, ancho) * .9
        h = 170 * (1 - k) + 26
        persona(c, x, y, h, dict(top=rnd.choice(MASA), inner=rnd.choice(MASA), legs=rnd.choice(MASA),
                                 shoes=(70, 70, 70)), piel=rnd.choice([PIEL_MARCOS, PIEL_LEO, (160, 116, 84)]),
                pelo=rnd.choice([(60, 50, 40), (30, 28, 28), (120, 100, 80), (150, 150, 150)]), espalda=True,
                cabizbajo=True)
    for i in range(60):  # parte cercana de la masa en el tramo común
        y = rnd.uniform(H * .8, H * 1.02)
        x = W * .42 + rnd.uniform(-260, 60)
        persona(c, x, y, rnd.uniform(200, 250), dict(top=rnd.choice(MASA), inner=rnd.choice(MASA),
                                                     legs=rnd.choice(MASA), shoes=(70, 70, 70)),
                piel=rnd.choice([PIEL_MARCOS, PIEL_LEO]), pelo=rnd.choice([(60, 50, 40), (30, 28, 28)]),
                espalda=True)
    # Leo solo por el camino vivo
    persona(c, W * .66, 1180, 200, ROPA["leo_camino"], espalda=True)
    c.ell(W * .66, 1100, 140, 170, (255, 240, 180, 40))
    # niebla en el lado gris
    niebla = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    nd = ImageDraw.Draw(niebla)
    for _ in range(18):
        x, y = rnd.uniform(-100, W * .5), rnd.uniform(hz - 60, H * .7)
        nd.ellipse([(x - 260) * SS, (y - 50) * SS, (x + 260) * SS, (y + 50) * SS], fill=(*GRIS["fog"], 60))
    c.im.paste(niebla.filter(ImageFilter.GaussianBlur(30 * SS)), (0, 0), niebla.filter(ImageFilter.GaussianBlur(30 * SS)))
    return c


def plano02():
    rnd = random.Random(2)
    c = Lienzo()
    c.gradiente(0, 900, VIVO["sky"], VIVO["sky2"])
    c.rect(0, 860, W, H, VIVO["ground"])
    for x in (80, 300, 820, 1020):
        arbol_vivo(c, x, 980, 1.6, rnd)
    c.poly([(W * .3, H), (W * .85, H), (W * .62, 900), (W * .5, 900)], VIVO["path"])
    flores(c, 0, 900, W, H, 420, rnd, 6, 22)
    # el camino gris se ve desenfocado a la izquierda, saliendo de cuadro
    c.poly([(0, 900), (W * .2, 900), (W * .05, H), (0, H)], GRIS["ground"])
    for i in range(10):
        persona(c, rnd.uniform(-40, 170), rnd.uniform(1100, 1850), 320,
                dict(top=rnd.choice(MASA), inner=rnd.choice(MASA), legs=rnd.choice(MASA), shoes=(70, 70, 70)),
                piel=PIEL_MARCOS, pelo=(70, 60, 50), espalda=True, cabizbajo=True)
    c.desenfocar((0, 860, 260, H), 9)
    persona(c, W * .58, 1640, 980, ROPA["leo_camino"], paso=.6)
    for _ in range(6):  # mariposas
        x, y = rnd.uniform(350, 1000), rnd.uniform(500, 1200)
        col = rnd.choice(FLORES)
        c.ell(x - 12, y, 12, 9, col)
        c.ell(x + 12, y, 12, 9, col)
    # guías de zoom
    for (x, y, sx, sy) in ((290, 520, 1, 1), (900, 520, -1, 1), (290, 1500, 1, -1), (900, 1500, -1, -1)):
        c.line([(x, y + sy * 70), (x, y), (x + sx * 70, y)], (255, 255, 255, 220), 8)
    return c


def plano03():
    c = Lienzo((196, 146, 108))
    c.gradiente(0, H, (206, 156, 118), (176, 126, 92))
    cx, cy = W / 2, H * .48
    # párpados y pestañas
    c.ell(cx, cy, 520, 330, (150, 100, 76))
    c.ell(cx, cy, 480, 300, (255, 252, 248))
    for i in range(400):
        a = random.uniform(0, math.tau)
        r0 = random.uniform(40, 250)
        c.line([(cx + math.cos(a) * 110, cy + math.sin(a) * 110),
                (cx + math.cos(a) * (110 + r0 * .55), cy + math.sin(a) * (110 + r0 * .55))],
               tuple(int(v * random.uniform(.6, 1.2)) % 256 for v in OJO_LEO), 4)
    c.ell(cx, cy, 250, 250, None, outline=(80, 50, 20), width=12)
    c.ell(cx, cy, 110, 110, (14, 10, 10))
    c.ell(cx - 110, cy - 110, 50, 40, (255, 255, 255, 230))
    # reflejo del camino vivo en la córnea
    c.ell(cx + 80, cy + 90, 34, 22, (120, 200, 110, 150))
    c.ell(cx + 110, cy + 70, 10, 10, (255, 140, 170, 200))
    c.arc(cx, cy - 20, 560, 380, 200, 340, (30, 20, 20), 22)
    for i in range(16):
        a = math.radians(205 + i * 8.5)
        x0, y0 = cx + math.cos(a) * 560, cy - 20 + math.sin(a) * 380
        c.line([(x0, y0), (x0 + math.cos(a) * 60, y0 + math.sin(a) * 70)], (30, 20, 20), 8)
    c.ell(cx, cy, 110, 110, None, outline=(255, 255, 255, 120), width=6)
    c.text((W / 2, H * .82), "la pupila se abre como un túnel", 44, "semi")
    return c


def baño(c, noche=False):
    if noche:
        c.gradiente(0, H, (40, 52, 80), (24, 30, 52))
        c.rect(120, 380, 960, 1000, (70, 90, 120), r=40)  # espejo
        c.rect(140, 400, 940, 980, (90, 110, 150), r=30)
        c.ell(820, 320, 40, 40, (255, 240, 200))
        c.rect(0, 1500, W, H, (60, 66, 90))
    else:
        c.gradiente(0, H, (236, 244, 250), (210, 226, 236))
        for x in range(0, W, 120):
            c.line([(x, 0), (x, 1500)], (220, 232, 240), 3)
        c.rect(120, 380, 960, 1000, (200, 220, 230), r=40)
        c.rect(140, 400, 940, 980, (226, 240, 248), r=30)
        c.rect(0, 1500, W, H, (250, 250, 252))
    c.rect(180, 1400, 900, 1520, (255, 255, 255) if not noche else (150, 160, 180), r=30)  # lavabo


def plano04():
    c = Lienzo()
    baño(c)
    persona(c, W / 2, 2120, 1500, ROPA["leo_trabajo"], gesto="cepillo")
    # cepillo en la mano
    c.line([(W / 2 + 30, 1080), (W / 2 + 230, 1230)], (255, 255, 255), 26)
    c.line([(W / 2 + 30, 1080), (W / 2 + 230, 1230)], (110, 200, 230), 14)
    c.ell(W / 2 + 245, 1240, 44, 44, PIEL_LEO)
    # reloj de pulsera
    c.rect(W / 2 + 215, 1280, W / 2 + 285, 1312, (110, 76, 52), r=8)
    marco_iris(c, W / 2, H / 2, 520)
    velocidad(c)
    etiqueta_tiempo(c, "07:42")
    pie(c, "Antes del trabajo, con prisa… pero lo hace")
    return c


def plano05():
    c = Lienzo()
    baño(c, noche=True)
    persona(c, W / 2, 2120, 1500, ROPA["leo_pijama"], gesto="bostezo")
    cx, cy = W / 2, 2120 - 1500 + 300
    for sx in (-1, 1):  # ojos entornados
        c.rect(cx + sx * 114 - 90, cy - 95, cx + sx * 114 + 90, cy - 20, PIEL_LEO)
        c.arc(cx + sx * 114, cy - 24, 70, 30, 10, 170, (40, 30, 30), 8)
    # hilo dental
    c.line([(cx - 150, cy + 180), (cx + 150, cy + 180)], (255, 255, 255), 5)
    c.ell(cx - 165, cy + 185, 38, 38, PIEL_LEO)
    c.ell(cx + 165, cy + 185, 38, 38, PIEL_LEO)
    c.text((cx + 230, cy - 200), "z", 70, "black", fill=(220, 230, 255))
    c.text((cx + 290, cy - 280), "z", 50, "black", fill=(220, 230, 255))
    marco_iris(c, W / 2, H / 2, 520)
    velocidad(c)
    etiqueta_tiempo(c, "23:48")
    pie(c, "Cansado, bostezando… y aun así, hilo dental")
    return c


def mini(c, x, y, w, h, fondo, dibujo, titulo):
    sub = Lienzo(fondo)
    dibujo(sub)
    im = sub.im.resize((int(w * SS), int(h * SS)), Image.LANCZOS)
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0], im.size[1]], radius=40 * SS, fill=255)
    c.pegar(im, x, y, m)
    c.rect(x, y, x + w, y + h, None, r=40, outline=(255, 255, 255), width=6)
    c.rect(x + 20, y + h - 90, x + w - 20, y + h - 20, (0, 0, 0, 140), r=30)
    c.text((x + w / 2, y + h - 55), titulo, 34, "bold")


def d_agua(s):
    s.gradiente(0, H, (250, 230, 200), (230, 200, 160))
    s.rect(0, 1200, W, H, (170, 120, 80))
    persona(s, W * .42, 2300, 1700, ROPA["leo_camino"])
    s.rect(700, 1000, 820, 1200, (200, 230, 255, 200), r=10)  # vaso de agua
    s.rect(880, 980, 960, 1200, (180, 30, 40), r=16)  # lata apartada
    s.line([(870, 1220), (1000, 1160)], (255, 255, 255, 180), 10)


def d_enjuague(s):
    baño(s)
    persona(s, W / 2, 2300, 1700, ROPA["leo_trabajo"])
    s.rect(760, 1100, 860, 1380, (90, 200, 170), r=20)


def d_cepillo(s):
    baño(s)
    persona(s, W / 2, 2300, 1700, ROPA["leo_trabajo"])
    s.line([(260, 1350), (420, 1150)], (150, 150, 150), 30)  # viejo
    s.line([(660, 1150), (820, 1350)], (110, 200, 230), 30)  # nuevo
    s.text((340, 1050), "viejo", 60, "bold")
    s.text((760, 1050), "nuevo", 60, "bold")


def d_dentista(s):
    s.gradiente(0, H, (230, 248, 246), (200, 232, 230))
    s.rect(100, 1200, 1000, 1400, (110, 200, 200), r=60)  # sillón
    persona(s, W * .45, 2250, 1700, ROPA["leo_camino"])
    persona(s, W * .86, 2000, 1500, dict(top=(255, 255, 255), inner=(255, 255, 255), legs=(120, 180, 200),
                                        shoes=(255, 255, 255)), piel=(230, 190, 160), pelo=(90, 60, 40),
            iris=(90, 120, 80), rizos=False)


def plano06():
    c = Lienzo()
    c.gradiente(0, H, (60, 40, 20), (30, 20, 10))
    marco_iris(c, W / 2, H / 2, 520)
    mx, my, mw, mh = 60, 300, 470, 640
    mini(c, mx, my, mw, mh, (0, 0, 0), d_agua, "Agua > refresco")
    mini(c, W - mx - mw, my, mw, mh, (0, 0, 0), d_enjuague, "Enjuague")
    mini(c, mx, my + mh + 40, mw, mh, (0, 0, 0), d_cepillo, "Cepillo nuevo")
    mini(c, W - mx - mw, my + mh + 40, mw, mh, (0, 0, 0), d_dentista, "Revisión")
    velocidad(c, "×3")
    c.rect(W / 2 - 230, 1690, W / 2 + 230, 1800, (255, 255, 255), r=30)
    c.text((W / 2, 1745), "día 1 → día 1.460", 44, "black", fill=(40, 40, 40), sombra=False)
    return c


def plano07():
    c = Lienzo()
    c.gradiente(0, H, (130, 196, 230), (250, 226, 170))
    rx, cx, cy = 360, W / 2, 940
    cabeza(c, cx, cy, rx, PIEL_LEO, PELO_LEO, OJO_LEO, rizos=True, gesto="sonrisa")
    # el clip del recuerdo se encoge dentro del ojo
    ox, oy = cx + rx * .38, cy - rx * .08
    c.ell(ox, oy, 46, 46, (236, 244, 250), outline=(255, 255, 255), width=6)
    c.line([(ox + 60, oy - 60), (ox + 200, oy - 200)], (255, 255, 255, 230), 8)
    c.text((ox + 190, oy - 250), "el recuerdo se encoge", 34, "bold")
    # la cámara baja a la boca
    c.rect(cx - 220, cy + 60, cx + 220, cy + 330, None, r=30, outline=(255, 255, 255), width=8)
    c.line([(ox - 30, oy + 60), (cx + 40, cy + 50)], (255, 255, 255, 230), 8)
    c.poly([(cx + 40, cy + 50), (cx + 10, cy + 20), (cx + 70, cy + 20)], (255, 255, 255, 230))
    persona_bust = ROPA["leo_camino"]
    c.rect(cx - 420, cy + rx * 1.2, cx + 420, H + 40, persona_bust["top"], r=200)
    c.poly([(cx - 90, cy + rx * 1.2), (cx + 90, cy + rx * 1.2), (cx + 60, H), (cx - 60, H)], persona_bust["inner"])
    c.text((W / 2, 1720), "zoom out del ojo → zoom a la boca", 44, "bold")
    return c


def pantalla_partida(c, edad_mala, edad, contador=True):
    c.rect(0, 0, W, H / 2, (150, 146, 140))
    c.gradiente(0, H / 2, (156, 152, 146), (120, 116, 108))
    gris_piel = (214, 190, 170)
    boca(c, W / 2, H * .25 - 40, 620, edad_mala=edad_mala, sana=False, tono=gris_piel)
    c.gradiente(H / 2, H, (140, 210, 240), (250, 226, 160))
    boca(c, W / 2, H * .75 - 40, 620, sana=True)
    c.line([(0, H / 2), (W, H / 2)], (255, 255, 255), 8)
    c.rect(40, 60, 420, 140, (0, 0, 0, 140), r=40)
    c.text((230, 100), "camino apagado", 36, "bold")
    c.rect(40, H / 2 + 40, 360, H / 2 + 120, (0, 0, 0, 120), r=40)
    c.text((200, H / 2 + 80), "camino vivo", 36, "bold")
    if contador:
        c.ell(W / 2, H / 2, 150, 150, (255, 255, 255), outline=(30, 30, 30), width=8)
        c.text((W / 2, H / 2 - 18), str(edad), 110, "black", fill=(30, 30, 30), sombra=False)
        c.text((W / 2, H / 2 + 72), "años", 34, "bold", fill=(30, 30, 30), sombra=False)


def plano08():
    c = Lienzo()
    pantalla_partida(c, 0, 26)
    return c


def plano09():
    c = Lienzo()
    pantalla_partida(c, 3, 60)
    # línea de tiempo con las edades intermedias
    for i, (e, m) in enumerate(((26, 0), (36, 1), (46, 2), (60, 3))):
        x = 150 + i * 260
        c.ell(x, 1820, 26, 26, (255, 255, 255) if e == 60 else (255, 255, 255, 120))
        c.text((x, 1770), str(e), 34, "bold")
    c.line([(150, 1820), (930, 1820)], (255, 255, 255, 160), 6)
    return c


def plano10():
    rnd = random.Random(1)
    c = plano01()
    c.rect(80, 120, W - 80, 440, (255, 255, 255, 225), r=60)
    c.text((W / 2, 220), "¿Por qué camino", 76, "black", fill=(30, 40, 40), sombra=False)
    c.text((W / 2, 320), "vas tú?", 76, "black", fill=(40, 150, 90), sombra=False)
    c.rect(W / 2 - 250, 1720, W / 2 + 250, 1820, (255, 255, 255), r=50)
    c.text((W / 2, 1770), "@mybrushclub", 50, "black", fill=(30, 40, 40), sombra=False)
    return c


PLANOS = [
    (plano01, "01 · Los dos caminos"),
    (plano02, "02 · Zoom lento a Leo"),
    (plano03, "03 · Entrada al ojo"),
    (plano04, "04 · Mañana: cepillado"),
    (plano05, "05 · Noche: hilo dental"),
    (plano06, "06 · Más hábitos, más rápido"),
    (plano07, "07 · Del ojo a la boca"),
    (plano08, "08 · Pantalla partida · 26 años"),
    (plano09, "09 · Pasan los años · 60 años"),
    (plano10, "10 · Cierre y bucle"),
]


def main():
    random.seed(7)
    os.makedirs(OUT, exist_ok=True)
    imgs = []
    for fn, titulo in PLANOS:
        im = fn().final()
        num = titulo[:2]
        im.save(os.path.join(OUT, f"{num}.png"))
        imgs.append((im, titulo))
        print("ok", titulo)
    # hoja de contactos 5x2
    tw, th = 360, 640
    pad, cab = 30, 70
    hoja = Image.new("RGB", (5 * tw + 6 * pad, 2 * (th + cab) + 3 * pad + 90), (18, 18, 20))
    d = ImageDraw.Draw(hoja)
    d.text((pad, 30), "«Dos caminos» · @mybrushclub · borrador del storyboard", font=ImageFont.truetype(
        os.path.join(FONTS, "Inter-Bold.otf"), 40), fill=(255, 255, 255))
    f = ImageFont.truetype(os.path.join(FONTS, "Inter-SemiBold.otf"), 24)
    for i, (im, titulo) in enumerate(imgs):
        x = pad + (i % 5) * (tw + pad)
        y = 90 + pad + (i // 5) * (th + cab + pad)
        hoja.paste(im.resize((tw, th), Image.LANCZOS), (x, y))
        d.text((x, y + th + 14), titulo, font=f, fill=(230, 230, 230))
    hoja.save(os.path.join(OUT, "hoja_contactos.jpg"), quality=90)


if __name__ == "__main__":
    main()
