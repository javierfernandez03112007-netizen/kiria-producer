# Ajuste del morro (masa de arriba inclinada + labio de abajo y barbilla) a la silueta de perfil y de frente de la hoja
import numpy as np
_s = open('fit_low.py').read(); exec(_s.split('TB = {')[0])
PL = [0.633, 0.034, 1.198, 1.691, 1.045, 0.314, 0.058, 0.988, 0.817, -0.138, 0.547, 0.281]
def muz(x, y, z, p):
    ucy, ucz, urx, ury, urz, ut, lcy, lcz, lrx, lry, lrz, k, jcy, jcz, jrx, jry, jrz = p
    d = smin(ellT(x, y, z, ucy, ucz, urx, ury, urz, ut), ell(x, y - lcy, z - lcz, lrx, lry, lrz), max(0.08, k))
    return smin(d, ell(x, y - jcy, z - jcz, jrx, jry, jrz), 0.25)
def full(x, y, z, p): return smin(head(x, y, z, PL), muz(x, y, z, p), 0.3)
TF = {0.4: 2.13, 0.2: 2.25, 0.0: 2.37, -0.2: 2.47, -0.4: 2.52, -0.6: 2.29, -0.7: 2.0, -0.8: 1.88, -1.0: 1.77, -1.2: 1.67, -1.4: 1.47, -1.5: 1.3}
TW = {0.0: 1.19, -0.2: 1.2, -0.4: 1.19, -0.6: 1.15, -0.8: 1.08, -1.0: 1.0}
zs = np.linspace(-1.0, 3.0, 201); xs = np.linspace(0, 1.6, 81)
def loss(p):
    L = 0
    for y, zf in TF.items():
        d = full(0 * zs, y + 0 * zs, zs, p); ins = np.nonzero(d < 0)[0]
        L += (zs[ins[-1]] - zf) ** 2 if len(ins) else 10
    for y, w in TW.items():
        X, Z = np.meshgrid(xs, zs); d = full(X, y + 0 * X, Z, p); col = np.nonzero((d < 0).any(0))[0]
        L += 2 * ((xs[col[-1]] if len(col) else 0) - w) ** 2
    # la barbilla: lo más bajo del morro por delante (z > 0,9) en y ≈ −1,52
    d = full(0 * zs, -1.62 + 0 * zs, zs, p); L += 2 * float((d[zs > 1.0] < 0).any())
    d = full(0 * zs, -1.45 + 0 * zs, zs, p); L += 2 * float(not (d[zs > 1.2] < 0).any())
    return L
p0 = [-0.001, 1.33, 1.228, 0.696, 1.2, -0.307, -1.013, 1.051, 0.994, 0.509, 0.715, 0.261, -0.55, 0.85, 1.15, 0.75, 0.8]
p, L = nelder(loss, p0, [0.05, 0.05, 0.03, 0.04, 0.05, 0.05, 0.05, 0.05, 0.04, 0.04, 0.04, 0.03, 0.1, 0.1, 0.06, 0.08, 0.08], it=500)
print('loss', round(L, 4)); print('p =', [round(float(v), 3) for v in p])
for y, zf in TF.items():
    d = full(0 * zs, y + 0 * zs, zs, p); ins = np.nonzero(d < 0)[0]; print('perfil', y, 'objetivo', zf, 'modelo', round(zs[ins[-1]], 2))
for y, w in TW.items():
    X, Z = np.meshgrid(xs, zs); d = full(X, y + 0 * X, Z, p); col = np.nonzero((d < 0).any(0))[0]; print('frente', y, 'objetivo', w, 'modelo', round(xs[col[-1]], 2))
