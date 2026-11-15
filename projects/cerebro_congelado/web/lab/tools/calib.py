# Calibración de colores: mide el color medio renderizado de una zona y propone el nuevo color base (lineal) para que salga como la hoja.
# python3 calib.py <frame.jpg> <x0> <y0> <x1> <y1> <objetivo #RRGGBB> <r,g,b base actual>
import sys, cv2, numpy as np
f, x0, y0, x1, y1, tgt, base = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6], sys.argv[7]
full = cv2.imread(f)[y0:y1, x0:x1]
mode = sys.argv[8] if len(sys.argv) > 8 else 'zona'
if mode == 'zona':
    im = full.reshape(-1, 3).astype(float); lum = im.mean(1); keep = (lum > np.percentile(lum, 8)) & (lum < np.percentile(lum, 92)); m = im[keep].mean(0)[::-1] / 255
else:      # mediana de toda la piel o de todo el morro (por color) dentro de la caja
    hsv = cv2.cvtColor(full, cv2.COLOR_BGR2HSV).astype(int)
    msk = ((hsv[..., 0] >= 12) & (hsv[..., 0] <= 30) & (hsv[..., 1] > 120) & (hsv[..., 2] > 90)) if mode == 'piel' else ((hsv[..., 0] >= 4) & (hsv[..., 0] <= 20) & (hsv[..., 1] > 40) & (hsv[..., 1] <= 135) & (hsv[..., 2] > 90))
    m = np.median(full[msk].astype(float), 0)[::-1] / 255
t = np.array([int(tgt[i:i + 2], 16) for i in (1, 3, 5)]) / 255
aces = lambda a: np.clip((a * (2.51 * a + 0.03)) / (a * (2.43 * a + 0.59) + 0.14), 0, 1)
def inv(v):     # entrada lineal que da v en sRGB tras ACES y gamma 2,2
    lo, hi = 0.0, 20.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if aces(mid) ** (1 / 2.2) < v: lo = mid
        else: hi = mid
    return (lo + hi) / 2
b = np.array([float(v) for v in base.split(',')])
k = np.array([inv(t[i]) / max(1e-4, inv(m[i])) for i in range(3)])
print('medido #%02X%02X%02X  objetivo %s  factor %s' % (*(m * 255).astype(int), tgt, np.round(k, 3)))
print('nuevo base: %s' % ', '.join('%.4f' % v for v in b * k))
