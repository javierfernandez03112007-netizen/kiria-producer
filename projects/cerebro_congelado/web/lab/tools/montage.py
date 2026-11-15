# Montaje lado a lado para comparar con la hoja de modelo: [render | recorte de la hoja a la misma escala | render con la tinta de la hoja encima (rojo)]
# python3 montage.py <carpeta de la prueba> <salida.jpg> vista:fotograma [vista:fotograma ...]
# vistas: frente_cab, perfil, nuca (cámaras de test_hero.js t=3, 4, 5), cuerpo (t=1), espalda (t=10), vestido (t=2, tres cuartos: solo alineado en alto),
#         y las expresiones contra su cabeza de la hoja: cab_O (t=6), cab_sonrisa (t=7), cab_dientes (t=8)
import sys, os, cv2, numpy as np, ref
d, out = sys.argv[1], sys.argv[2]
im = ref.sheet()
PR = float(os.environ.get('PR', '1'))
def cam_ppu(dist, fov): return 1920 * PR / (2 * dist * np.tan(np.radians(fov / 2)))
HEAD = (120, 3.6, 1.0); BODY = (150, 7.6, -4.75); HEADP = (120, 3.6, 1.0, 0.45)
# para cada vista: recorte, cámara y cómo pasa un píxel del recorte al mundo (x de la imagen, y)


V = {
  'frente_cab': ('grande', HEAD, lambda px, py: ((px - 73) * 5.1 / 107, 3.65 - (py - 18) * 5.1 / 107)),
  'perfil': ('perfil', HEADP, lambda px, py: ((px - 46.3) * 5.1 / 132, 3.65 - (py - 19) * 5.1 / 132)),
  'nuca': ('nuca', HEAD, lambda px, py: ((px - 60) * 5.1 / 187, 3.65 - (py - 26) * 5.1 / 187)),
  'cab_O': ('cab_O', HEAD, lambda px, py: ((px - 43.7) * 5.1 / 123, 3.65 - (py - 23) * 5.1 / 123)),
  'cab_sonrisa': ('cab_sonrisa', HEAD, lambda px, py: ((px - 43.4) * 5.1 / 124, 3.65 - (py - 23) * 5.1 / 124)),
  'cab_dientes': ('cab_dientes', HEAD, lambda px, py: ((px - 36.4) * 5.1 / 103, 3.65 - (py - 19) * 5.1 / 103)),
  'cuerpo': ('frente', BODY, lambda px, py: ((px - 51.1) * 17.25 / 216, 3.65 - (py - 23) * 17.25 / 216)),
  'espalda': ('espalda', BODY, lambda px, py: ((px - 50.3) * 17.25 / 214, 3.65 - (py - 21) * 17.25 / 214)),
  'vestido': ('vestido', BODY, lambda px, py: ((px - 40.0) * 17.25 / 227, 3.65 - (py - 17) * 17.25 / 227)),
}
panels = []
for arg in sys.argv[3:]:
    view, fr = arg.split(':'); crop, camv, mp = V[view]; dist, fov, ly = camv[:3]; lx = camv[3] if len(camv) > 3 else 0
    r = cv2.imread(os.path.join(d, 'f%05d.jpg' % int(fr))); Hh, Ww = r.shape[:2]; ppu = cam_ppu(dist, fov)
    c = ref.crop(crop, im)
    # afín: píxel del recorte → píxel del render
    (x0, y0), (x1, y1) = mp(0, 0), mp(1, 1)
    sx, sy = (x1 - x0) * ppu, -(y1 - y0) * ppu
    A = np.float32([[sx, 0, Ww / 2 + (x0 - lx) * ppu], [0, sy, Hh / 2 - (y0 - ly) * ppu]])
    w = cv2.warpAffine(c, A, (Ww, Hh), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))
    hsv = cv2.cvtColor(w, cv2.COLOR_BGR2HSV).astype(int); ink = (hsv[..., 2] < 150) | ((hsv[..., 1] < 60) & (hsv[..., 2] < 200))
    fig = ref.figure(cv2.resize(c, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)).astype(np.uint8) * 255
    fig = cv2.warpAffine(fig, np.float32([[A[0, 0] / 4, 0, A[0, 2]], [0, A[1, 1] / 4, A[1, 2]]]), (Ww, Hh), flags=cv2.INTER_LINEAR)
    cnt, _ = cv2.findContours((fig > 127).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    ov = r.copy(); ov[ink] = (0.35 * ov[ink] + 0.65 * np.array([40, 40, 255])).astype(np.uint8); cv2.drawContours(ov, cnt, -1, (0, 0, 255), 3)
    lab = lambda img, t: cv2.putText(img, t, (16, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (40, 40, 200), 3)
    a, b, o = r.copy(), w.copy(), ov
    lab(a, 'render ' + view); lab(b, 'hoja'); lab(o, 'render + linea de la hoja')
    panels.append(np.hstack([a, np.full((Hh, 10, 3), 255, np.uint8), b, np.full((Hh, 10, 3), 255, np.uint8), o]))
sheet = np.vstack([np.vstack([p, np.full((14, p.shape[1], 3), 255, np.uint8)]) for p in panels])
sc = float(os.environ.get('SC', '0.42')); sheet = cv2.resize(sheet, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
cv2.imwrite(out, sheet, [cv2.IMWRITE_JPEG_QUALITY, 90]); print(out, sheet.shape)
