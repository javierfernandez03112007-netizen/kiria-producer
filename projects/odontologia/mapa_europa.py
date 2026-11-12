"""Mapa de Europa (UE en color, vecinos en gris) desde Natural Earth 1:10m (engine/geo/countries-10m.json), en proyección ortográfica
centrada en (10° E, 52° N), en km, simplificado (Douglas–Peucker) → web/europa.json."""
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
names = {g.get('properties', {}).get('name') for g in d['objects']['countries']['geometries']}
def polys(name):
    for g in d['objects']['countries']['geometries']:
        if g.get('properties', {}).get('name') == name:
            ps = g['arcs'] if g['type'] == 'MultiPolygon' else [g['arcs']]
            return [[ring(r) for r in p] for p in ps]
    print('NO ENCONTRADO', name); return []
LO0, LA0, R = math.radians(10), math.radians(52), 6371.0
def proj(lo, la):
    l, p = math.radians(lo), math.radians(la)
    x = R * math.cos(p) * math.sin(l - LO0); y = R * (math.cos(LA0) * math.sin(p) - math.sin(LA0) * math.cos(p) * math.cos(l - LO0))
    return [round(x, 1), round(y, 1)]
def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0]-a[0], b[1]-a[1]; L = math.hypot(dx, dy)
    imax, dmax = 0, -1
    for i in range(1, len(pts)-1):
        p = pts[i]; dd = abs(dy*p[0] - dx*p[1] + b[0]*a[1] - b[1]*a[0]) / L if L > 1e-9 else math.hypot(p[0]-a[0], p[1]-a[1])
        if dd > dmax: imax, dmax = i, dd
    if dmax > eps: return dp(pts[:imax+1], eps)[:-1] + dp(pts[imax:], eps)
    return [a, b]
def simplify_ring(pp, eps):
    if pp[0] == pp[-1]: pp = pp[:-1]
    h = len(pp) // 2
    return dp(pp[:h+1], eps)[:-1] + dp(pp[h:] + [pp[0]], eps)[:-1]
def area(pp): return 0.5 * sum(pp[i][0]*pp[(i+1)%len(pp)][1] - pp[(i+1)%len(pp)][0]*pp[i][1] for i in range(len(pp)))
EU = ['Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Ireland',
      'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden']
OTHER = ['United Kingdom', 'Norway', 'Switzerland', 'Serbia', 'Bosnia and Herz.', 'Montenegro', 'Macedonia', 'North Macedonia', 'Albania', 'Kosovo', 'Belarus',
         'Ukraine', 'Moldova', 'Turkey', 'Russia', 'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Iceland', 'Andorra', 'Liechtenstein', 'N. Cyprus']
BBOX = (-11.5, 34.0, 34.5, 71.3)
out = {'eu': {}, 'other': {}}
for grp, lst in (('eu', EU), ('other', OTHER)):
    for name in lst:
        if name not in names: print('falta', name); continue
        res = []
        for p in polys(name):
            outer = p[0]
            if not any(BBOX[0] < lo < BBOX[2] and BBOX[1] < la < BBOX[3] for lo, la in outer): continue
            outer = [(max(BBOX[0], min(BBOX[2], lo)), max(BBOX[1], min(BBOX[3], la))) for lo, la in outer]
            pp = simplify_ring([proj(lo, la) for lo, la in outer], 6.0)
            if len(pp) < 3 or abs(area(pp)) < (150 if name in ('Malta', 'Luxembourg', 'Cyprus') else 900): continue
            if area(pp) < 0: pp = pp[::-1]
            res.append(pp)
        out[grp][name] = res
        print(grp, name, len(res), sum(len(r) for r in res))
out['madrid'] = proj(-3.7, 40.4)
json.dump(out, open(os.path.join(HERE, 'web', 'europa.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('bytes', os.path.getsize(os.path.join(HERE, 'web', 'europa.json')))
