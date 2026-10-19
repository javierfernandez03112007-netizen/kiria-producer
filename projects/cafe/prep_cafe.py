"""Prepara el material del episodio del café a partir de las capturas de Dreamina:
recortes limpios (sin interfaz, insignias ni marca de agua), placas ampliadas para mover la cámara,
mapas de profundidad aproximados, fotogramas del clip del puerto y el grano de café recortado.

    python3 projects/cafe/prep_cafe.py
"""
import os
import subprocess

import cv2
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(AQUI, "assets")
P = os.path.join(A, "placas")
H = 1920
PH = int(H * 1.12)  # alto de placa: margen para mover la cámara

# archivo: (recorte x0, y0, x1, y1 en píxeles de la captura, [zonas a borrar en coordenadas absolutas])
FOTOS = {
    "moneda1": ("cap_moneda1.png", (470, 520, 2340, 1560), [(475, 525, 580, 625), (1055, 945, 1115, 1015)]),
    "moneda2": ("cap_moneda2.png", (0, 300, 2752, 1826), [(10, 300, 150, 410), (2020, 1665, 2752, 1800)]),
    "moneda3": ("cap_moneda3.png", (175, 500, 2580, 1840), [(175, 500, 300, 600)]),
    "agricultor": ("plano2a_captura.png", (100, 360, 2575, 1740), [(140, 395, 260, 500)]),
}


def depth_map(im, vertical=0.35):
    """Profundidad 0 (lejos) .. 1 (cerca): lo enfocado está cerca (macro con poca profundidad de campo)
    y lo de abajo del encuadre suele estar más cerca que lo de arriba."""
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    lap = np.abs(cv2.Laplacian(g, cv2.CV_32F, ksize=3))
    s = max(im.shape[:2]) / 60
    e = cv2.GaussianBlur(lap, (0, 0), s)
    lo, hi = np.percentile(e, (5, 97))
    e = np.clip((e - lo) / (hi - lo + 1e-6), 0, 1)
    yy = np.linspace(0, 1, im.shape[0], dtype=np.float32)[:, None] * np.ones((1, im.shape[1]), np.float32)
    d = (1 - vertical) * e + vertical * yy
    d = cv2.GaussianBlur(d, (0, 0), s * 1.5)
    lo, hi = d.min(), d.max()
    return ((d - lo) / (hi - lo + 1e-6)).astype(np.float32)


def placas():
    os.makedirs(P, exist_ok=True)
    for name, (f, (x0, y0, x1, y1), holes) in FOTOS.items():
        im = cv2.imread(os.path.join(A, f))
        if holes:
            m = np.zeros(im.shape[:2], np.uint8)
            for a, b, c, d in holes:
                m[b:d, a:c] = 255
            im = cv2.inpaint(im, m, 12, cv2.INPAINT_TELEA)
        im = im[y0:y1, x0:x1]
        dep = depth_map(im)
        s = PH / im.shape[0]
        big = cv2.resize(im, (int(im.shape[1] * s), PH), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
        blur = cv2.GaussianBlur(big, (0, 0), 1.6)
        big = np.clip(big * 1.6 - blur * 0.6, 0, 255).astype(np.uint8)  # recupera algo de detalle
        cv2.imwrite(os.path.join(P, name + ".png"), big)
        np.save(os.path.join(P, name + "_prof.npy"),
                cv2.resize(dep, (big.shape[1], big.shape[0]), interpolation=cv2.INTER_LINEAR))
        print(name, big.shape)


def puerto():
    """Clip del puerto: zona de vídeo de la grabación de pantalla, recorte 9:16 y 60 fps."""
    out = os.path.join(P, "puerto")
    os.makedirs(out, exist_ok=True)
    # el aviso de pantalla completa tapa la parte de arriba hasta ~2 s
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "2.0", "-i", os.path.join(A, "cap_puerto.mp4"),
                    "-vf", "crop=866:1538:943:262,scale=1080:1920:flags=lanczos,unsharp=5:5:0.6",
                    "-r", "60", "-q:v", "2", os.path.join(out, "f_%04d.jpg")], check=True)
    print("puerto", len(os.listdir(out)), "fotogramas")


def grano():
    """Grano de café de la foto moneda2 recortado con GrabCut → PNG con alfa."""
    im = cv2.imread(os.path.join(A, "cap_moneda2.png"))
    x, y, w, h = 540, 800, 660, 700
    roi = im[y:y + h, x:x + w].copy()
    mask = np.zeros(roi.shape[:2], np.uint8)
    rect = (30, 30, w - 60, 1478 - 800 - 30)  # sin el reflejo de abajo
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(roi, mask, rect, bgd, fgd, 8, cv2.GC_INIT_WITH_RECT)
    a = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(a)
    if n > 1:
        k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
        a = np.where(lab == k, 255, 0).astype(np.uint8)
    a = cv2.morphologyEx(a, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    a = cv2.GaussianBlur(a, (0, 0), 1.5)
    ys, xs = np.where(a > 20)
    b = np.dstack([roi, a])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    cv2.imwrite(os.path.join(P, "grano.png"), b)
    print("grano", b.shape)


if __name__ == "__main__":
    placas()
    grano()
    puerto()
