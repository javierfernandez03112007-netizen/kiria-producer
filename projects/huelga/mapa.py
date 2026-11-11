"""Contorno de España (y vecinos recortados) desde Natural Earth 1:10m (engine/geo/countries-10m.json), proyectado en km
alrededor de (−3,7, 40,0) y simplificado (Douglas–Peucker) → web/spain.json, con las ciudades (lat/lon públicas) para las luces."""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(HERE, '..', '..', 'engine', 'geo', 'countries-10m.json')))
sx, sy = d['transform']['scale']; tx, ty = d['transform']['translate']
arcs = []
for a in d['arcs']:
    x = y = 0; pts = []
    for dx, dy in a: x += dx; y += dy; pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)
def ring(idx):
    pts = []
    for i in idx:
        a = arcs[i] if i >= 0 else arcs[~i][::-1]
        pts.extend(a[1:] if pts else a)
    return pts
def polys(name):
    for g in d['objects']['countries']['geometries']:
        if g.get('properties', {}).get('name') == name:
            ps = g['arcs'] if g['type'] == 'MultiPolygon' else [g['arcs']]
            return [[ring(r) for r in p] for p in ps]
    return []
LON0, LAT0 = -3.7, 40.0; KX = 111.32 * math.cos(math.radians(LAT0)); KY = 110.57
def proj(lo, la): return [round((lo - LON0) * KX, 2), round((la - LAT0) * KY, 2)]
def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0]-a[0], b[1]-a[1]; L = math.hypot(dx, dy)
    imax, dmax = 0, -1
    for i in range(1, len(pts)-1):
        p = pts[i]
        dd = abs(dy*p[0] - dx*p[1] + b[0]*a[1] - b[1]*a[0]) / L if L > 1e-9 else math.hypot(p[0]-a[0], p[1]-a[1])
        if dd > dmax: imax, dmax = i, dd
    if dmax > eps: return dp(pts[:imax+1], eps)[:-1] + dp(pts[imax:], eps)
    return [a, b]
def simplify_ring(pp, eps):
    n = len(pp)
    if pp[0] == pp[-1]: pp = pp[:-1]; n -= 1
    h = n // 2
    s = dp(pp[:h+1], eps)[:-1] + dp(pp[h:] + [pp[0]], eps)[:-1]
    return s
def area(pp): return 0.5 * sum(pp[i][0]*pp[(i+1)%len(pp)][1] - pp[(i+1)%len(pp)][0]*pp[i][1] for i in range(len(pp)))
out = {}
for name, eps, bbox, amin in [('Spain', 1.0, None, 20), ('Portugal', 1.5, None, 100), ('France', 2.5, (-6, 41, 5.5, 46.5), 500), ('Andorra', 0.4, None, 50),
                              ('Morocco', 2.5, (-7, 33, 0, 36.2), 500), ('Algeria', 2.5, (-2.5, 34.0, 5.0, 37.3), 500)]:
    res = []
    for p in polys(name):
        outer = p[0]
        if bbox:
            if not any(bbox[0] < lo < bbox[2] and bbox[1] < la < bbox[3] for lo, la in outer): continue
            outer = [(max(bbox[0], min(bbox[2], lo)), max(bbox[1], min(bbox[3], la))) for lo, la in outer]
        pp = simplify_ring([proj(lo, la) for lo, la in outer], eps)
        if len(pp) < 3 or abs(area(pp)) < amin: continue
        if area(pp) < 0: pp = pp[::-1]          # sentido antihorario
        res.append(pp)
    out[name] = res
    print(name, len(res), sum(len(r) for r in res))
C = json.load(open(os.path.join(HERE, 'ciudades.json')))
out['cities'] = {k: proj(lo, la) + [w] for k, (la, lo, w) in C.items()}
json.dump(out, open(os.path.join(HERE, 'web', 'spain.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('bytes', os.path.getsize(os.path.join(HERE, 'web', 'spain.json')))
