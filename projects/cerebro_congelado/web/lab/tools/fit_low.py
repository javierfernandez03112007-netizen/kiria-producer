# Ajuste de la parte baja de la cabeza (mandíbula/mejillas: elipsoide inclinado) y el cuello, con el cráneo ya ajustado
import numpy as np
_src = open('fit_cran.py').read(); exec(_src.split('# objetivos')[0]); exec('def nelder' + _src.split('def nelder')[1].split('p0 =')[0])
PC = [2.194, -0.005, 1.25, 1.407, 1.539, 2.95, -0.309, 0.75, 0.72, 1.025, 0.302]
def ellT(x, y, z, cy, cz, rx, ry, rz, t):
    py, pz = y - cy, z - cz; ct, st = np.cos(t), np.sin(t); return ell(x, py * ct - pz * st, py * st + pz * ct, rx, ry, rz)
def neck(x, y, z, q):
    ncz, nrx, nrz, nk = q; yy = np.maximum(y, -1.9); zc = ncz + nk * (yy + 1.0)
    return np.maximum((np.sqrt((x / nrx) ** 2 + ((z - zc) / nrz) ** 2) - 1) * min(nrx, nrz), y - 0.0)
def head(x, y, z, p):
    jcy, jcz, jrx, jry, jrz, jt, ncz, nrx, nrz, nk, k1, k2 = p
    d = smin(cran(x, y, z, PC), ellT(x, y, z, jcy, jcz, jrx, jry, jrz, jt), max(0.1, k1))
    return smin(d, neck(x, y, z, (ncz, nrx, nrz, nk)), max(0.1, k2))
TB = {1.8: -1.45, 1.6: -1.39, 1.4: -1.32, 1.2: -1.24, 1.0: -1.18, 0.8: -1.10, 0.6: -1.04, 0.4: -0.97, 0.2: -0.92, 0.0: -0.87, -0.2: -0.82, -0.4: -0.79,
      -0.6: -0.77, -0.8: -0.77, -1.0: -0.77, -1.2: -0.77, -1.4: -0.77, -1.6: -0.70, -1.8: -0.55}
TW = {1.0: 1.2, 0.6: 1.17, 0.0: 1.15, -0.4: 1.12, -0.8: 1.02, -1.0: 0.98, -1.2: 0.97, -1.4: 0.96, -1.6: 0.96, -2.0: 0.95}
TF = {-1.8: 1.0, -2.0: 1.02}
zs = np.linspace(-2.0, 2.0, 161); xs = np.linspace(0, 1.6, 81)
def loss(p):
    L = 0
    for y, zb in TB.items():
        dz = head(0 * zs, y + 0 * zs, zs, p); ins = np.nonzero(dz < 0)[0]
        if not len(ins): L += 10; continue
        L += (zs[ins[0]] - zb) ** 2
        if y in TF: L += (zs[ins[-1]] - TF[y]) ** 2
    for y, w in TW.items():
        X, Z = np.meshgrid(xs, zs); d = head(X, y + 0 * X, Z, p); col = np.nonzero((d < 0).any(0))[0]
        L += ((xs[col[-1]] if len(col) else 0) - w) ** 2
    return L
p0 = [0.5, 0.1, 1.2, 1.6, 1.15, 0.25, 0.1, 0.96, 0.8, -0.2, 0.45, 0.45]
p, L = nelder(loss, p0, [0.15, 0.1, 0.05, 0.15, 0.1, 0.1, 0.05, 0.05, 0.05, 0.05, 0.1, 0.1], it=500)
print('loss', round(L, 4)); print('p =', [round(float(v), 3) for v in p])
for y, zb in TB.items():
    dz = head(0 * zs, y + 0 * zs, zs, p); ins = np.nonzero(dz < 0)[0]; print('perfil', y, 'objetivo atrás', zb, 'modelo', round(zs[ins[0]], 2), 'delante', round(zs[ins[-1]], 2))
for y, w in TW.items():
    X, Z = np.meshgrid(xs, zs); d = head(X, y + 0 * X, Z, p); col = np.nonzero((d < 0).any(0))[0]; print('frente', y, 'objetivo', w, 'modelo', round(xs[col[-1]], 2))
