# Genera las nubes de puntos de la portada (cabeza humana con cerebro, cabeza de IA con cerebro de vóxeles) → cabezas.bin
import sys, struct, json, numpy as np
sys.path.insert(0, '.')
from glb import load
from scipy.spatial import cKDTree
from skimage.measure import marching_cubes
rng = np.random.default_rng(11)

# ---------------------------------------------------------------- ruido de Perlin vectorizado
perm = np.random.RandomState(7).permutation(256); perm = np.concatenate([perm, perm]).astype(np.int64)
G3 = np.array([[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]], float)
def perlin(P):
    P = np.asarray(P, float); Pi = np.floor(P).astype(np.int64); f = P - Pi; Pi &= 255
    u = f * f * f * (f * (f * 6 - 15) + 10); X, Y, Z = Pi.T; x, y, z = f.T; ux, uy, uz = u.T
    def g(dx, dy, dz):
        G = G3[perm[perm[perm[X + dx] + Y + dy] + Z + dz] % 12]; return G[:, 0] * (x - dx) + G[:, 1] * (y - dy) + G[:, 2] * (z - dz)
    l = lambda a, b, t: a + t * (b - a)
    return l(l(l(g(0,0,0), g(1,0,0), ux), l(g(0,1,0), g(1,1,0), ux), uy), l(l(g(0,0,1), g(1,0,1), ux), l(g(0,1,1), g(1,1,1), ux), uy), uz)
def vnoise(P): return np.stack([perlin(P + [0.0, 0, 0]), perlin(P + [31.4, 7.1, 0]), perlin(P + [0, 13.7, 47.3])], 1)

# ---------------------------------------------------------------- cabeza (escaneo de Lee Perry-Smith, CC BY 3.0)
pos, nor, idx = load(sys.argv[1] if len(sys.argv) > 1 else 'LeePerrySmith.glb')
C = np.array([0, 1.61, 0.1]); S = 1 / 4.72          # 1 unidad = de la barbilla a la coronilla
P = (pos - C) * S
NECK = -0.66
def sample_tris(Pv, Nv, idx, n):
    tri = Pv[idx]; area = 0.5 * np.linalg.norm(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]), axis=1)
    t = rng.choice(len(idx), size=n, p=area / area.sum()); r1 = np.sqrt(rng.random(n)); r2 = rng.random(n)
    a, b, c = 1 - r1, r1 * (1 - r2), r1 * r2; V = Pv[idx[t]]; N = Nv[idx[t]]
    p = a[:, None] * V[:, 0] + b[:, None] * V[:, 1] + c[:, None] * V[:, 2]
    nn = a[:, None] * N[:, 0] + b[:, None] * N[:, 1] + c[:, None] * N[:, 2]
    return p, nn / np.linalg.norm(nn, axis=1, keepdims=True)
keep_tri = (P[idx][:, :, 1].max(1) > NECK)
hidx = idx[keep_tri]
from scipy import ndimage
VH = 0.006; VLO = P.min(0) - 0.03; VN = np.ceil((P.max(0) + 0.03 - VLO) / VH).astype(int)
_d, _ = sample_tris(P, nor, idx, 2500000); _iv = np.floor((_d - VLO) / VH).astype(int)
wall = np.zeros(VN, bool); wall[_iv[:, 0], _iv[:, 1], _iv[:, 2]] = True; wall = ndimage.binary_dilation(wall, iterations=1)
lab, _n = ndimage.label(~wall); outside = lab == lab[0, 0, 0]
def is_out(p, nn):
    q = np.floor((p + nn * VH * 2.2 - VLO) / VH).astype(int); q = np.clip(q, 0, VN - 1); return outside[q[:, 0], q[:, 1], q[:, 2]]
def head_points(n):
    p, nn = sample_tris(P, nor, hidx, int(n * 1.4)); m = (p[:, 1] > NECK) & is_out(p, nn); return p[m][:n], nn[m][:n]

# ojos: los huecos del escaneo se rellenan con un globo ocular
e = np.sort(np.concatenate([idx[:, [0, 1]], idx[:, [1, 2]], idx[:, [2, 0]]]), axis=1)
u, c = np.unique(e, axis=0, return_counts=True); bv = np.unique(u[c == 1])
eyes = []
for s in (-1, 1):
    m = bv[(pos[bv, 1] > 1.3) & (pos[bv, 1] < 2.1) & (pos[bv, 2] > 1.2) & (pos[bv, 0] * s > 0.25)]
    q = P[m]; cen = q.mean(0); rad = np.linalg.norm(q - cen, axis=1).mean()
    eyes.append((cen - [0, 0, rad * 0.55], rad * 1.08))
def eye_points(n):
    out_p, out_n = [], []
    for cen, r in eyes:
        d = rng.normal(size=(n * 3, 3)); d /= np.linalg.norm(d, axis=1, keepdims=True); d = d[d[:, 2] > 0.25][:n]
        out_p.append(cen + d * r); out_n.append(d)
    return np.concatenate(out_p), np.concatenate(out_n)

# ---------------------------------------------------------------- cerebro (campo de distancias, unidades: largo del cerebro = 1)
def ell(q, c, r):
    p = (q - np.array(c)) ; r = np.array(r); k0 = np.linalg.norm(p / r, axis=-1); k1 = np.linalg.norm(p / (r * r), axis=-1)
    return k0 * (k0 - 1) / np.maximum(k1, 1e-9)
def smin(a, b, k): h = np.maximum(k - np.abs(a - b), 0) / k; return np.minimum(a, b) - h * h * k * 0.25
def smax(a, b, k): return -smin(-a, -b, k)
WX = 0.93
def cerebrum(p):
    q = np.stack([np.abs(p[..., 0]) / WX, p[..., 1], p[..., 2]], -1)
    d = ell(q, (0.2, 0.07, -0.03), (0.205, 0.235, 0.46))           # cuerpo (parietal)
    d = smin(d, ell(q, (0.185, 0.02, 0.22), (0.19, 0.215, 0.28)), 0.07)   # frontal
    d = smin(d, ell(q, (0.165, 0.01, -0.3), (0.165, 0.2, 0.2)), 0.07)     # occipital
    d = smin(d, ell(q, (0.235, -0.15, 0.04), (0.155, 0.125, 0.27)), 0.035)  # temporal
    # cisura de Silvio: una hendidura en la cara lateral entre el frontal y el temporal
    d = smax(d, 0.011 - np.abs(p[..., 0]), 0.012)                 # cisura entre hemisferios
    return d
def cerebellum(p):
    q = np.stack([np.abs(p[..., 0]), p[..., 1], p[..., 2]], -1)
    d = ell(q, (0.12, -0.24, -0.3), (0.155, 0.105, 0.15))
    return smax(d, 0.006 - np.abs(p[..., 0]), 0.012)
def stem(p):
    a = np.array([0, -0.12, -0.05]); b = np.array([0, -0.52, -0.16]); ba = b - a
    t = np.clip(((p - a) @ ba) / (ba @ ba), 0, 1); return np.linalg.norm(p - (a + t[..., None] * ba), axis=-1) - (0.075 - 0.028 * t)
def mc(f, lo, hi, h=0.005):
    xs = [np.arange(lo[i], hi[i], h) for i in range(3)]; G = np.stack(np.meshgrid(*xs, indexing='ij'), -1)
    v, fcs, _, _ = marching_cubes(f(G), 0.0, spacing=(h, h, h)); v += np.array(lo)
    return v, fcs
def grad(f, p, e=1e-3):
    g = np.stack([f(p + [e, 0, 0]) - f(p - [e, 0, 0]), f(p + [0, e, 0]) - f(p - [0, e, 0]), f(p + [0, 0, e]) - f(p - [0, 0, e])], 1)
    return g / np.linalg.norm(g, axis=1, keepdims=True)
def surf_points(f, lo, hi, n):
    v, fcs = mc(f, lo, hi); dummy = np.zeros_like(v)
    p, _ = sample_tris(v, dummy + [0, 0, 1], fcs, n); return p, grad(f, p)

BR_S, BR_T = 0.75, np.array([0, 0.22, 0.0])                         # cerebro → cabeza
def sylvian(p):   # cisura de Silvio, en la cara lateral
    z, y = p[:, 2], p[:, 1]; yl = -0.07 - 0.3 * (z - 0.25) + 0.9 * np.maximum(0.02 - z, 0) ** 2 * 6; d = np.abs(y - yl + 0.006 * perlin(p * 12 + 1)) / 1.044
    return np.where((np.abs(p[:, 0]) > 0.1) & (z > -0.15) & (z < 0.3), d, 9)
def central(p):   # surco central (de la coronilla hacia abajo y adelante)
    z, y = p[:, 2], p[:, 1]; zl = -0.06 + (0.28 - y) * 0.42 + 0.012 * perlin(p * 9 + 5)
    return np.where((y > -0.03) & (np.abs(p[:, 0]) > 0.02), np.abs(z - zl) * 0.92, 9)
def brain_points(n):
    p, nn = surf_points(cerebrum, (-0.42, -0.32, -0.53), (0.42, 0.33, 0.53), n * 5)
    q = p + 0.12 * vnoise(p * 3.0 + 3)
    v = (perlin(q * 1.8 + 11) + 0.45 * perlin(q * 3.6 + 5)) * 8.0       # isolíneas = surcos que serpentean
    g = np.abs(v - np.round(v))
    s = np.minimum.reduce([g / 0.06, sylvian(p) / 0.016, central(p) / 0.011])
    fold = np.clip(1 - s, 0, 1)
    keep = rng.random(len(p)) < np.where(fold > 0, 1.0, 0.12)
    p, nn, fold = p[keep], nn[keep], fold[keep]
    p = p - nn * (0.014 * fold ** 0.7)[:, None]
    i = rng.permutation(len(p))[:n]; return p[i], nn[i], fold[i]
def cerebellum_points(n):
    p, nn = surf_points(cerebellum, (-0.3, -0.36, -0.47), (0.3, -0.12, -0.13), n * 3)
    v = (p[:, 1] + 0.9 * (p[:, 2] + 0.3) ** 2) * 34 + 0.6 * perlin(p * 7 + 2)
    fold = np.clip(1 - np.abs(np.sin(np.pi * v)) / 0.32, 0, 1)
    keep = rng.random(len(p)) < np.where(fold > 0, 1.0, 0.3); p, nn, fold = p[keep], nn[keep], fold[keep]
    p = p - nn * (0.008 * fold)[:, None]
    i = rng.permutation(len(p))[:n]; return p[i], nn[i], fold[i]
def stem_points(n):
    p, nn = surf_points(stem, (-0.1, -0.56, -0.26), (0.1, -0.05, 0.05), n); return p, nn, np.zeros(len(p))

# ---------------------------------------------------------------- nubes
hp, hn = head_points(24000); ep, en = eye_points(450)
H_p = np.concatenate([hp, ep]); H_n = np.concatenate([hn, en]); H_a = np.concatenate([np.zeros(len(hp)), np.ones(len(ep))])
b1 = brain_points(17000); b2 = cerebellum_points(3600); b3 = stem_points(800)
B_p = np.concatenate([b1[0], b2[0], b3[0]]) * BR_S + BR_T; B_n = np.concatenate([b1[1], b2[1], b3[1]]); B_f = np.concatenate([b1[2], b2[2], b3[2] * 0])
B_part = np.concatenate([np.zeros(len(b1[0])), np.ones(len(b2[0])) * 0.5, np.ones(len(b3[0]))])

# IA: anillos de escáner (cortes horizontales de la misma cabeza)
dp, dn = head_points(900000); DY = 0.0185
ph = (dp[:, 1] - NECK) / DY; m = np.abs(ph - np.round(ph)) * DY < 0.0014
R_p, R_n = dp[m], dn[m]; i = rng.permutation(len(R_p))[:21000]; R_p, R_n = R_p[i], R_n[i]
R_ring = np.round((R_p[:, 1] - NECK) / DY); R_aux = (R_ring % 64) / 63.0
# IA: nodos con reparto uniforme (Poisson) y conexiones con los vecinos
cp, cn = head_points(60000); RAD = 0.042; cell = {}; acc = []
for k in rng.permutation(len(cp)):
    key = tuple((cp[k] // RAD).astype(int)); ok = True
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                for j in cell.get((key[0] + dx, key[1] + dy, key[2] + dz), ()):
                    if np.sum((cp[j] - cp[k]) ** 2) < RAD * RAD: ok = False; break
                if not ok: break
            if not ok: break
        if not ok: break
    if ok: cell.setdefault(key, []).append(k); acc.append(k)
N_p, N_n = cp[acc], cn[acc]
tree = cKDTree(N_p); dd, nb = tree.query(N_p, k=4); edges = set()
for a in range(len(N_p)):
    for d, b in zip(dd[a, 1:], nb[a, 1:]):
        if d < RAD * 2.3: edges.add((min(a, b), max(a, b)))
E = np.array(sorted(edges), np.uint16)
# IA: cerebro de vóxeles (la misma forma, en rejilla)
def brain_all(p): return np.minimum(np.minimum(cerebrum(p), cerebellum(p)), stem(p))
h = 0.021; xs = [np.arange(lo, hi, h) for lo, hi in ((-0.42, 0.42), (-0.56, 0.34), (-0.53, 0.53))]
G = np.stack(np.meshgrid(*xs, indexing='ij'), -1).reshape(-1, 3); dG = brain_all(G)
V_p = G[np.abs(dG) < h * 0.55]; V_n = grad(brain_all, V_p); V_p = V_p * BR_S + BR_T

sets = [('H', H_p, H_n, H_a), ('B', B_p, B_n, np.stack([B_f, B_part], 1)), ('R', R_p, R_n, R_aux), ('N', N_p, N_n, np.zeros(len(N_p))), ('V', V_p, V_n, np.zeros(len(V_p)))]
print({s[0]: len(s[1]) for s in sets}, 'edges', len(E), 'eyes', [(np.round(c, 3).tolist(), round(r, 3)) for c, r in eyes])
print('bbox', np.min([s[1].min(0) for s in sets], 0), np.max([s[1].max(0) for s in sets], 0))

# ---------------------------------------------------------------- binario: cabecera, posiciones int16, aristas uint16, normales int8, aux uint8 (semilla, valor, valor2)
buf = bytearray(b'KH01'); buf += struct.pack('<6I', *[len(s[1]) for s in sets], len(E))
for _, p, _, _ in sets: buf += np.clip(np.round(p * 32767), -32767, 32767).astype('<i2').tobytes()
buf += E.astype('<u2').tobytes()
for _, _, n, _ in sets: buf += np.clip(np.round(n * 127), -127, 127).astype('i1').tobytes()
for _, p, _, a in sets:
    a = a.reshape(len(p), -1); aux = np.zeros((len(p), 4), np.uint8); aux[:, 0] = rng.integers(0, 256, len(p))
    aux[:, 1:1 + a.shape[1]] = np.clip(np.round(a * 255), 0, 255); buf += aux.tobytes()
import base64; open('cabezas.txt', 'w').write(base64.b64encode(bytes(buf)).decode()); print('bytes', len(buf))
np.savez('preview.npz', H=H_p, Hn=H_n, B=B_p, Bf=B_f, R=R_p, N=N_p, V=V_p, E=E)
