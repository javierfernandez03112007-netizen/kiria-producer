"""Convierte las capturas de día a noche y las recorta a 9:16 (1080x1920).

    python3 projects/oriente/nocturno.py            # assets/capturas/*.png → assets/noche/*.jpg + hoja de contactos

Pasos: recorte vertical evitando la interfaz de la app, borrado de etiquetas blancas (inpaint),
"day for night" (oscurecer, enfriar hacia azul marino) y luces artificiales donde hay ciudad.
"""
import glob
import os

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "assets", "capturas")
DST = os.path.join(ROOT, "assets", "noche")
W, H = 1080, 1920
NAVY = np.array([58, 31, 11], np.float32) / 255
WARM = np.array([71, 181, 255], np.float32) / 255     # ámbar de marca (BGR)
SODIUM = np.array([90, 170, 255], np.float32) / 255

# por captura: centro del encuadre (px de la captura), zona vertical útil, tipo de escena
CFG = {
    "1_tierra": dict(c=(1342, 1087), y=(165, 1670), kind="planeta"),
    "2_espana": dict(c=(1440, 1576), y=(545, 2050), kind="region"),
    "3_granada": dict(c=(1514, 1250), y=(165, 1670), kind="ciudad"),
    "4_centro": dict(c=(1420, 920), y=(165, 1670), kind="ciudad"),
    "5_tejados": dict(c=(1500, 920), y=(165, 1670), kind="tejados"),
    "6_ventana": dict(c=(1445, 900), y=(60, 1700), kind="ventana"),
}


def crop916(img, c, yr):
    h = yr[1] - yr[0]
    w = int(h * 9 / 16)
    x0 = int(np.clip(c[0] - w / 2, 0, img.shape[1] - w))
    return cv2.resize(img[yr[0]:yr[1], x0:x0 + w], (W, H), interpolation=cv2.INTER_CUBIC)


def remove_labels(img):
    """Borra textos e iconos blancos de la app (con su contorno oscuro) por inpainting."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    white = ((hsv[..., 2] > 225) & (hsv[..., 1] < 30)).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(white, 8)
    keep = np.zeros_like(white)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < 4000:  # trazos pequeños = letras; zonas grandes (nieve) se quedan
            keep[lab == i] = 1
    mask = cv2.dilate(keep, np.ones((7, 7), np.uint8))
    return cv2.inpaint(img, mask * 255, 5, cv2.INPAINT_TELEA)


def night_base(f, k=0.2):
    out = np.power(f, 1.25) * k
    out = out * np.array([1.25, 0.85, 0.62], np.float32)
    return out * 0.85 + NAVY * 0.12


def bloom(light, color, s1=3, s2=18, a=(1.0, 0.8)):
    l1 = cv2.GaussianBlur(light, (0, 0), s1)
    l2 = cv2.GaussianBlur(light, (0, 0), s2)
    return (l1 * a[0] + l2 * a[1])[..., None] * color


def urban_lights(f, img, density=1.0):
    """Luces donde hay ciudad: zonas grises (poca saturación), claras y con mucha textura."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32) / 255
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    tex = np.abs(g - cv2.GaussianBlur(g, (0, 0), 2.0))
    tex = cv2.GaussianBlur(tex, (0, 0), 6) * 12
    urban = np.clip((0.3 - hsv[..., 1]) * 5, 0, 1) * np.clip(tex - 0.35, 0, 1) * 1.6
    urban = cv2.GaussianBlur(urban, (0, 0), 10)
    streets = np.clip((hsv[..., 2] - 0.55) * 4, 0, 1) * np.clip((0.3 - hsv[..., 1]) * 5, 0, 1)
    rng = np.random.default_rng(3)
    sparkle = (rng.random(g.shape) < 0.012 * density).astype(np.float32)
    pts = sparkle * urban
    light = np.clip(streets * urban * 0.7 + pts * 2.0, 0, 1.2)
    return bloom(light, SODIUM, 1.5, 10, (0.6, 0.45)) + bloom(urban * 0.15, WARM, 25, 60, (0.3, 0.3))


def convert(name, img):
    cfg = CFG[name]
    kind = cfg["kind"]
    if kind in ("planeta", "region", "ciudad", "tejados"):
        img = remove_labels(img)
    img = crop916(img, cfg["c"], cfg["y"])
    f = img.astype(np.float32) / 255
    if kind == "planeta":
        out = night_base(f, 0.32)
        # terminador suave y halo atmosférico azul
        out = out * 0.9 + cv2.GaussianBlur(out, (0, 0), 8) * 0.1
    elif kind == "region":
        out = night_base(f, 0.3)
    elif kind in ("ciudad", "tejados"):
        out = night_base(f, 0.26 if kind == "ciudad" else 0.3)
        out += urban_lights(f, img, 1.0 if kind == "ciudad" else 0.4) * (1.6 if kind == "ciudad" else 0.8)
    else:  # ventana: fachada a oscuras, cristal con luz cálida de dentro
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
        glass = ((hsv[..., 0] > 95) & (hsv[..., 0] < 130) & (hsv[..., 1] > 60)).astype(np.float32)
        yy, xx = np.mgrid[0:H, 0:W]
        glass *= ((xx > 300) & (xx < 820) & (yy > 650) & (yy < 1500))
        glass = cv2.GaussianBlur(cv2.morphologyEx(glass, cv2.MORPH_CLOSE, np.ones((9, 9))), (0, 0), 2)
        out = night_base(f, 0.18)
        inner = (0.55 + 0.45 * f.mean(2, keepdims=True)) * WARM * 1.1
        out = out * (1 - glass[..., None]) + inner * glass[..., None]
        out += bloom(glass, WARM, 12, 50, (0.25, 0.35))
        # farola cálida lateral sobre la fachada
        lamp = np.exp(-(((xx - 980) / 500.0) ** 2 + ((yy - 300) / 700.0) ** 2)).astype(np.float32)
        out += f * lamp[..., None] * WARM * 0.35
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    vig = 1 - 0.45 * (np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)) / 1.414) ** 2
    out *= vig[..., None]
    return (np.clip(out, 0, 1) * 255).astype(np.uint8)


def main():
    os.makedirs(DST, exist_ok=True)
    thumbs = []
    for p in sorted(glob.glob(os.path.join(SRC, "*.png"))):
        name = os.path.splitext(os.path.basename(p))[0]
        out = convert(name, cv2.imread(p))
        cv2.imwrite(os.path.join(DST, name + ".jpg"), out, [cv2.IMWRITE_JPEG_QUALITY, 92])
        thumbs.append(cv2.resize(out, (360, 640), interpolation=cv2.INTER_AREA))
    cv2.imwrite(os.path.join(DST, "hoja.jpg"), np.hstack(thumbs), [cv2.IMWRITE_JPEG_QUALITY, 90])
    print("ok →", DST)


if __name__ == "__main__":
    main()
