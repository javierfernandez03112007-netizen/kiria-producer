# anchos de la silueta por filas: hoja frente a dibujo (toon), en unidades de la escena
import sys, cv2, numpy as np, ref
view, toonf = sys.argv[1:3]; S = float(sys.argv[3]) if len(sys.argv) > 3 else 3
crop = {'perfil': 'perfil', 'frente': 'grande', 'nuca': 'nuca'}[view]
c = ref.crop(crop); t = cv2.imread(toonf); H, W = t.shape[:2]
big = cv2.resize(c[:int(H / S), :int(W / S)], (W, H), interpolation=cv2.INTER_CUBIC)
def fig(im):
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV).astype(int)
    m = ((hsv[..., 1] > 60) | (hsv[..., 2] < 200)).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    h, w = m.shape; ff = m.copy(); msk = np.zeros((h + 2, w + 2), np.uint8)
    for (x, y) in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if ff[y, x] == 0: cv2.floodFill(ff, msk, (x, y), 128)
    return ff != 128
fs, ft = fig(big), fig(t)
mp = {'perfil': (lambda px: (px - 46.3) * 5.1 / 132, lambda py: 3.65 - (py - 19) * 5.1 / 132),
      'frente': (lambda px: (px - 73) * 5.1 / 107, lambda py: 3.65 - (py - 18) * 5.1 / 107),
      'nuca': (lambda px: -(px - 60) * 5.1 / 187, lambda py: 3.65 - (py - 26) * 5.1 / 187)}[view]
for yy in np.arange(3.6, -2.2, -0.2):
    # fila de la imagen para esa altura
    py = None
    for j in range(H):
        if abs(mp[1](j / S) - yy) < 0.5 * 5.1 / 107 / S * 3: py = j; break
    if py is None: continue
    a = np.nonzero(fs[py])[0]; b = np.nonzero(ft[py])[0]
    f = lambda r: '%6.2f %6.2f' % (mp[0](r.min() / S), mp[0](r.max() / S)) if len(r) else '    -      -  '
    print('y=%5.2f  hoja %s   modelo %s' % (yy, f(a), f(b)))
