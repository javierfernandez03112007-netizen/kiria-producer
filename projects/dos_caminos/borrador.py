"""Borrador animado (animatic) de «Dos caminos» con las imágenes generadas en assets/.

Fotos con movimiento de cámara, zoom al ojo, recuerdos dentro del iris, pantalla partida con contador
de años y cierre. Las escenas que aún no tienen imagen salen como tarjeta «falta imagen».

    python3 borrador.py            # out/borrador.mp4
    python3 borrador.py --preview  # out/preview/hoja_contactos.jpg
"""
import os
import subprocess
import sys
from functools import lru_cache

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(AQUI, "assets")
OUT = os.path.join(AQUI, "out")
FONTS = os.path.join(AQUI, "..", "..", "engine", "fonts")
W, H, FPS = 1080, 1920, 30


# ---------------------------------------------------------------- utilidades

@lru_cache(None)
def img(nombre):
    return cv2.imread(os.path.join(ASSETS, nombre)).astype(np.float32) / 255


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def eio(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def lerp(a, b, k):
    return a + (b - a) * k


def camara(src, z, foco, w=W, h=H, borde=cv2.BORDER_REFLECT):
    """Encuadre tipo «cover» con zoom z hacia el punto foco (normalizado) de la imagen."""
    ih, iw = src.shape[:2]
    s = max(w / iw, h / ih) * z
    if s * iw < w or s * ih < h:  # zoom por debajo de «cover»: centrar sin limitar
        cx, cy = foco[0] * iw, foco[1] * ih
        M = np.float32([[s, 0, w / 2 - s * cx], [0, s, h / 2 - s * cy]])
        return cv2.warpAffine(src, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=borde)
    cx = clamp(foco[0] * iw, w / (2 * s), iw - w / (2 * s))
    cy = clamp(foco[1] * ih, h / (2 * s), ih - h / (2 * s))
    M = np.float32([[s, 0, w / 2 - s * cx], [0, s, h / 2 - s * cy]])
    return cv2.warpAffine(src, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=borde)


def encajar(src, z, foco, w, h):
    """Zoom por debajo de «cover»: la imagen sobre una versión desenfocada de sí misma (sin franjas)."""
    fondo = cv2.GaussianBlur(camara(src, 1.0, foco, w, h), (0, 0), 25)
    fg = camara(src, z, foco, w, h, cv2.BORDER_CONSTANT)
    m = camara(np.ones(src.shape[:2] + (1,), np.float32), z, foco, w, h, cv2.BORDER_CONSTANT)
    m = cv2.GaussianBlur(cv2.erode(m, np.ones((9, 9), np.uint8)), (0, 0), 6)[..., None]
    return fondo * (1 - m) + fg * m


def zoom_blur(frame, fuerza, n=8):
    if fuerza <= 0.01:
        return frame
    acc = np.zeros_like(frame)
    for i in range(n):
        s = 1 + fuerza * 0.25 * i / (n - 1)
        M = np.float32([[s, 0, W / 2 * (1 - s)], [0, s, H / 2 * (1 - s)]])
        acc += cv2.warpAffine(frame, M, (W, H), borderMode=cv2.BORDER_REFLECT)
    return acc / n


def font(peso, size):
    return ImageFont.truetype(os.path.join(FONTS, {"black": "Inter-Black.otf", "bold": "Inter-Bold.otf",
                                                    "semi": "Inter-SemiBold.otf"}[peso]), size)


@lru_cache(None)
def rotulo(txt, size, peso="bold", color=(255, 255, 255), fondo=None, pad=(34, 18)):
    """Texto (con píldora opcional) como sprite BGRA float."""
    f = font(peso, size)
    x0, y0, x1, y1 = f.getbbox(txt)
    tw, th = x1 - x0, y1 - y0
    w, h = tw + 2 * pad[0], th + 2 * pad[1]
    im = Image.new("RGBA", (w + 8, h + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if fondo:
        d.rounded_rectangle([0, 0, w, h], radius=h // 2, fill=fondo)
    else:
        d.text((pad[0] - x0 + 3, pad[1] - y0 + 3), txt, font=f, fill=(0, 0, 0, 140))
    d.text((pad[0] - x0, pad[1] - y0), txt, font=f, fill=color)
    a = np.asarray(im).astype(np.float32) / 255
    return np.dstack([a[..., 2], a[..., 1], a[..., 0], a[..., 3]])


def pegar(frame, sp, cx, cy, alpha=1.0):
    h, w = sp.shape[:2]
    x0, y0 = int(cx - w / 2), int(cy - h / 2)
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if xa >= xb or ya >= yb:
        return
    s = sp[ya - y0:yb - y0, xa - x0:xb - x0]
    a = s[..., 3:] * alpha
    frame[ya:yb, xa:xb] = frame[ya:yb, xa:xb] * (1 - a) + s[..., :3] * a


@lru_cache(None)
def mascara_circulo(r, borde=6):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.hypot(xx - W / 2, yy - H / 2)
    return np.clip((r - d) / borde, 0, 1)[..., None]


def tarjeta_falta(txt):
    f = np.zeros((H, W, 3), np.float32)
    f[:] = (0.32, 0.26, 0.22)
    pegar(f, rotulo("FALTA IMAGEN", 46, "black", (255, 210, 120)), W / 2, H / 2 - 70)
    pegar(f, rotulo(txt, 42, "semi"), W / 2, H / 2 + 10)
    return f


# ---------------------------------------------------------------- bocas que envejecen

@lru_cache(1)
def mapas_dientes():
    """Máscara de dientes y mapas de dónde se acumulan manchas: junto a la encía y entre dientes."""
    src = img("08_boca_sana.jpg")
    hsv = cv2.cvtColor((src * 255).astype(np.uint8), cv2.COLOR_BGR2HSV)
    hh, ss, vv = hsv[..., 0], hsv[..., 1].astype(np.float32), hsv[..., 2].astype(np.float32)
    ih, iw = vv.shape
    zona = np.zeros((ih, iw), np.uint8)
    cv2.ellipse(zona, (iw // 2, int(ih * .45)), (int(iw * .23), int(ih * .15)), 0, 0, 360, 1, -1)
    m = ((vv > 165) & (ss < 80)).astype(np.uint8) * zona
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    m = np.isin(lab, [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 400]).astype(np.uint8)
    encia = (((hh < 12) | (hh > 165)) & (ss > 45) & (vv > 110)).astype(np.uint8)
    hueco = ((vv < 150) * zona).astype(np.uint8)
    d_encia = cv2.distanceTransform(1 - encia, cv2.DIST_L2, 5)
    d_hueco = cv2.distanceTransform(1 - hueco, cv2.DIST_L2, 5)
    rng = np.random.default_rng(3)
    ruido = cv2.resize(rng.random((ih // 24, iw // 24)).astype(np.float32), (iw, ih), interpolation=cv2.INTER_CUBIC)
    ruido_f = cv2.resize(rng.random((ih // 6, iw // 6)).astype(np.float32), (iw, ih), interpolation=cv2.INTER_CUBIC)
    org = np.clip(.55 * ruido + .45 * ruido_f, 0, 1)
    mf = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.2)
    cuello = np.exp(-d_encia / 16) * mf * (.6 + .8 * org)          # tercio cervical, junto a la encía
    sarro = np.clip(np.exp(-d_encia / 6) * mf * (org * 1.6 - .2), 0, 1)
    entre = np.exp(-d_hueco / 7) * mf * (.5 + .9 * org)             # espacios interdentales
    brillo = np.clip((vv / 255 - .9) / .08, 0, 1) * mf               # reflejos especulares
    return mf[..., None], cuello[..., None], sarro[..., None], entre[..., None], brillo[..., None]


def boca_envejecida(k):
    """k 0..1: de sana a deteriorada. Amarillea el esmalte y acumula manchas en cuellos y espacios."""
    src = img("08_boca_sana.jpg")
    if k <= 0:
        return src.copy()
    m, cuello, sarro, entre, brillo = mapas_dientes()
    lab = cv2.cvtColor(src, cv2.COLOR_BGR2Lab)
    lab[..., 0] *= 1 - .16 * k
    lab[..., 2] += 30 * k   # hacia el amarillo
    lab[..., 1] += 3 * k
    out = cv2.cvtColor(lab, cv2.COLOR_Lab2BGR)
    out = src * (1 - m) + out * m
    k2 = clamp((k - .25) / .75)
    marron = np.float32([0.30, 0.46, 0.62])
    a = np.clip(cuello * .9 + entre * .8, 0, 1) * k2
    out = out * (1 - a) + out * marron * a                           # mancha que tiñe (conserva el volumen)
    crema = np.float32([0.55, 0.74, 0.82])
    a = sarro * clamp((k - .45) / .55) * .85
    out = out * (1 - a) + (crema * (.75 + .25 * out.mean(axis=2, keepdims=True))) * a
    out = out * (1 - brillo * .55) + src * brillo * .55               # el esmalte sigue brillando
    if k > .82:  # se pierde el incisivo lateral
        ih, iw = src.shape[:2]
        f = clamp((k - .82) / .1)
        zona_d = np.zeros((ih, iw), np.float32)
        cv2.rectangle(zona_d, (824, 270), (891, 395), 1, -1)
        diente = cv2.GaussianBlur(zona_d * m[..., 0], (0, 0), 1.5)[..., None] * f
        yy = np.linspace(0, 1, ih, dtype=np.float32)[:, None, None]
        oscuro = np.float32([0.07, 0.06, 0.13]) + np.clip(yy - .4, 0, 1) * np.float32([0.04, 0.04, 0.10])
        out = out * (1 - diente) + oscuro * diente
        sombra = cv2.GaussianBlur(diente[..., 0], (0, 0), 8)[..., None]
        out = out * (1 - .4 * np.clip(sombra - diente, 0, 1))
    out = out.astype(np.float32)
    gris = cv2.cvtColor(out, cv2.COLOR_BGR2GRAY)[..., None]
    return out * .78 + gris * .22  # tono algo apagado


# ---------------------------------------------------------------- escenas

def s_caminos(t, d):
    z = lerp(1.0, 1.45, eio(t / d))
    return camara(img("01_dos_caminos.jpg"), z, (lerp(.5, .63, eio(t / d)), lerp(.5, .6, eio(t / d))))


def s_camino_vivo(t, d):
    k = eio(t / d)
    f = camara(img("02_camino_vivo.jpg"), lerp(1.0, 3.6, k ** 1.6), (lerp(.6, .73, k), lerp(.5, .34, k)))
    return zoom_blur(f, clamp((t - d + .45) / .45))


def s_ojo(t, d):
    k = eio(t / d)
    f = camara(img("03_ojo.jpg"), lerp(1.0, 4.5, k ** 2), (.495, .487))
    f = zoom_blur(f, clamp((t - d + .5) / .5))
    return f * (1 - clamp((t - d + .2) / .2)) + clamp((t - d + .2) / .2)  # destello a blanco


RECUERDOS = [  # (imagen o None, texto si falta, foco inicial, foco final, etiqueta de hora/día)
    (None, "Por la mañana: se cepilla antes del trabajo", None, None, "07:42"),
    (None, "Por la noche: hilo dental aunque esté bostezando", None, None, "23:48"),
    ("06_agua.jpg", "", (.55, .45), (.66, .4), "día 214"),
    ("06_cepillo_nuevo.jpg", "", (.4, .45), (.72, .45), "día 730"),
    ("06_dentista.jpg", "", (.38, .4), (.62, .4), "día 1.460"),
]
T_REC = 1.7


def s_recuerdos(t, d):
    # el ojo hace de marco: el iris queda alrededor del recuerdo
    marco = camara(img("03_ojo.jpg"), 2.75, (.495, .487))
    i = min(int(t / T_REC), len(RECUERDOS) - 1)
    tt = t - i * T_REC
    nombre, falta, f0, f1, etiqueta = RECUERDOS[i]
    if nombre:
        rec = camara(img(nombre), 1.12, tuple(lerp(a, b, tt / T_REC) for a, b in zip(f0, f1)))
    else:
        rec = tarjeta_falta(falta)
    # barrido rápido entre recuerdos
    if tt < .18 and i > 0:
        dx = int((1 - tt / .18) * W * .35)
        rec = np.roll(rec, dx, axis=1)
        rec = cv2.blur(rec, (int(9 + 60 * (1 - tt / .18)), 1))
    m = mascara_circulo(400, 10)
    f = marco * (1 - m) + rec * m
    f = f * (1 - clamp((.25 - t) / .25)) + clamp((.25 - t) / .25)  # sale del destello
    pegar(f, rotulo("▶▶ ×2", 40, "black", (30, 30, 30), (255, 255, 255, 220)), 170, 150)
    pegar(f, rotulo(etiqueta, 44, "bold", (255, 255, 255), (0, 0, 0, 150)), W - 170, 150)
    return f


def s_vuelta(t, d):
    k = eio(t / d)
    f = camara(img("03_ojo.jpg"), lerp(2.75, 1.0, k), (.495, .487))
    return zoom_blur(f, clamp(1 - t / .4) * .6)


EDAD0, EDAD1 = 25, 60


def s_bocas(t, d):
    k = float(clamp((t - .8) / (d - 1.8)))
    edad = int(round(lerp(EDAD0, EDAD1, k)))
    f = np.zeros((H, W, 3), np.float32)
    arriba = encajar(boca_envejecida(eio(k)), .86, (.5, .47), W, H // 2)
    abajo = encajar(img("08_boca_sana.jpg"), .86, (.5, .47), W, H // 2)
    abajo = np.clip(abajo * np.float32([0.96, 1.0, 1.06]), 0, 1)  # tono cálido del camino vivo
    f[:H // 2], f[H // 2:] = arriba, abajo
    f[H // 2 - 4:H // 2 + 4] = 1
    pegar(f, rotulo("Sin buena higiene oral", 42, "bold", (255, 255, 255), (0, 0, 0, 150)), W / 2, 110)
    pegar(f, rotulo("Buena higiene oral", 42, "bold", (255, 255, 255), (0, 0, 0, 150)), W / 2, H - 110)
    # contador de años en el centro
    cv2.circle(f, (W // 2, H // 2), 150, (1, 1, 1), -1, cv2.LINE_AA)
    cv2.circle(f, (W // 2, H // 2), 150, (.15, .15, .15), 8, cv2.LINE_AA)
    pegar(f, rotulo(str(edad), 120, "black", (30, 30, 30), pad=(0, 0)), W / 2, H / 2 - 22)
    pegar(f, rotulo("años", 38, "bold", (30, 30, 30), pad=(0, 0)), W / 2, H / 2 + 78)
    return f


def s_cierre(t, d):
    f = camara(img("01_dos_caminos.jpg"), lerp(1.45, 1.0, eio(t / 1.6)), (.63, .6))
    a = eio((t - 1.0) / .5)
    pegar(f, rotulo("¿Por qué camino vas tú?", 70, "black", (30, 40, 40), (255, 255, 255, 235), (50, 30)),
          W / 2, 300, a)
    pegar(f, rotulo("@mybrushclub", 50, "black", (30, 40, 40), (255, 255, 255, 235)), W / 2, H - 200,
          eio((t - 1.5) / .5))
    return f


ESCENAS = [
    (s_caminos, 3.0),
    (s_camino_vivo, 3.0),
    (s_ojo, 2.2),
    (s_recuerdos, T_REC * len(RECUERDOS)),
    (s_vuelta, 1.3),
    (s_bocas, 6.5),
    (s_cierre, 3.5),
]


def frame_en(tg):
    t0 = 0.0
    for fn, d in ESCENAS:
        if tg < t0 + d or fn is ESCENAS[-1][0]:
            return fn(float(min(tg - t0, d - 1e-3)), d).astype(np.float32)
        t0 += d


def a_uint8(f):
    return (np.clip(f, 0, 1) * 255 + .5).astype(np.uint8)


def main():
    total = sum(d for _, d in ESCENAS)
    if "--preview" in sys.argv:
        os.makedirs(os.path.join(OUT, "preview"), exist_ok=True)
        ts = np.linspace(.5, total - .3, 12)
        th = [cv2.resize(a_uint8(frame_en(t)), (270, 480), interpolation=cv2.INTER_AREA) for t in ts]
        filas = [np.hstack(th[i:i + 6]) for i in range(0, 12, 6)]
        cv2.imwrite(os.path.join(OUT, "preview", "hoja_contactos.jpg"), np.vstack(filas))
        return
    os.makedirs(OUT, exist_ok=True)
    salida = os.path.join(OUT, "borrador.mp4")
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24",
                           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "20",
                           "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", salida],
                          stdin=subprocess.PIPE)
    n = int(total * FPS)
    for i in range(n):
        ff.stdin.write(a_uint8(frame_en(i / FPS)).tobytes())
    ff.stdin.close()
    ff.wait()
    print(salida, f"{total:.1f} s")


if __name__ == "__main__":
    main()
