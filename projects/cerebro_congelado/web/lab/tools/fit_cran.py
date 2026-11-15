# Ajuste del cráneo (dos elipsoides unidos con mínimo suave) a la silueta de perfil y de frente de la hoja (y ≥ 2,0)
import numpy as np
def ell(px, py, pz, rx, ry, rz):
    ax, ay, az = px / rx, py / ry, pz / rz; k0 = np.sqrt(ax * ax + ay * ay + az * az); k1 = np.sqrt((ax / rx) ** 2 + (ay / ry) ** 2 + (az / rz) ** 2)
    return k0 * (k0 - 1) / np.maximum(k1, 1e-9)
def smin(a, b, k): h = np.maximum(k - np.abs(a - b), 0) / k; return np.minimum(a, b) - h * h * k * 0.25
def cran(x, y, z, p):
    c1y, c1z, a1, b1, d1, c2y, c2z, a2, b2, d2, k = p
    return smin(ell(x, y - c1y, z - c1z, a1, b1, d1), ell(x, y - c2y, z - c2z, a2, b2, d2), max(k, 0.05))
# objetivos (sin el grosor de la tinta): y → (z atrás, z delante, media anchura de frente)
T = {3.6: (-1.01, 0.46, 0.53), 3.4: (-1.18, 0.80, 0.65), 3.2: (-1.22, 1.04, 0.87), 3.0: (-1.28, 1.21, 1.04), 2.8: (-1.40, 1.34, 1.13),
     2.6: (-1.48, 1.43, 1.19), 2.4: (-1.51, 1.50, 1.20), 2.2: (-1.53, 1.56, 1.20), 2.0: (-1.49, None, 1.23)}
TOP = 3.68
zs = np.linspace(-2.0, 2.0, 161); xs = np.linspace(0, 1.6, 81)
def extents(p):
    out = {}
    for y in list(T.keys()) + [TOP + 0.03, TOP + 0.15, TOP - 0.04]:
        dz = cran(0 * zs, y + 0 * zs, zs, p); inside = np.nonzero(dz < 0)[0]
        X, Z = np.meshgrid(xs, zs); dxz = cran(X, y + 0 * X, Z, p); colin = np.nonzero((dxz < 0).any(0))[0]
        out[y] = (zs[inside[0]] if len(inside) else 0, zs[inside[-1]] if len(inside) else 0, xs[colin[-1]] if len(colin) else 0, len(inside) > 0)
    return out
def loss(p):
    e = extents(p); L = 0
    for y, (zb, zf, w) in T.items():
        a, b, c, ok = e[y]
        if not ok: L += 10; continue
        L += (a - zb) ** 2 + (c - w) ** 2 + ((b - zf) ** 2 if zf is not None else 0)
    L += 30 * (1 if e[TOP + 0.03][3] else 0) + 30 * (1 if e[TOP + 0.15][3] else 0) + 30 * (0 if e[TOP - 0.04][3] else 1)     # la coronilla en 3,68
    return L
def nelder(f, x0, step, it=350):
    n = len(x0); S = [np.array(x0, float)] + [np.array(x0, float) + np.eye(n)[i] * step[i] for i in range(n)]; F = [f(s) for s in S]
    for _ in range(it):
        o = np.argsort(F); S = [S[i] for i in o]; F = [F[i] for i in o]; c = np.mean(S[:-1], 0)
        r = c + (c - S[-1]); fr = f(r)
        if fr < F[0]: e = c + 2 * (c - S[-1]); fe = f(e); S[-1], F[-1] = (e, fe) if fe < fr else (r, fr)
        elif fr < F[-2]: S[-1], F[-1] = r, fr
        else:
            cc = c + 0.5 * (S[-1] - c); fc = f(cc)
            if fc < F[-1]: S[-1], F[-1] = cc, fc
            else: S = [S[0]] + [S[0] + 0.5 * (s - S[0]) for s in S[1:]]; F = [F[0]] + [f(s) for s in S[1:]]
    o = np.argmin(F); return S[o], F[o]
p0 = [2.195, -0.008, 1.25, 1.408, 1.533, 2.95, -0.311, 0.75, 0.72, 0.95, 0.3]
p, L = nelder(loss, p0, [0.1, 0.05, 0.05, 0.1, 0.05, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1])
print('loss', round(L, 4)); print('p =', [round(v, 3) for v in p])
e = extents(p)
for y in T: print(y, 'objetivo', T[y], 'modelo', tuple(round(float(v), 2) for v in e[y][:3]))
