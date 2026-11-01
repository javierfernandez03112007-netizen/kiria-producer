# Puntos de tierra para el globo (Natural Earth 1:110m, dominio público) → globo.bin
import json, struct, numpy as np, shapely
from shapely.geometry import shape
from shapely.ops import unary_union
import sys
D = (sys.argv[1] if len(sys.argv) > 1 else '.') + '/'
land = unary_union([shape(f['geometry']) for f in json.load(open(D + 'ne_110m_land.geojson'))['features']])
cs = json.load(open(D + 'ne_110m_admin_0_countries.geojson'))['features']
spain = [shape(f['geometry']) for f in cs if f['properties'].get('ADM0_A3') == 'ESP'][0]
STEP = 1.2
lats, lons = [], []
for la in np.arange(-84 + STEP / 2, 84, STEP):
    n = max(1, int(round(360 * np.cos(np.radians(la)) / STEP)))
    off = (hash(round(la, 2)) % 1000) / 1000 * 360 / n * 0   # filas alineadas
    lo = -180 + (np.arange(n) + 0.5) * 360 / n
    lats.append(np.full(n, la)); lons.append(lo)
la = np.concatenate(lats); lo = np.concatenate(lons)
m = shapely.contains_xy(land, lo, la); la, lo = la[m], lo[m]
fl = shapely.contains_xy(spain.buffer(0.35), lo, la).astype(np.uint8)
print('dots', len(la), 'spain', fl.sum())
buf = bytearray(b'KG01') + struct.pack('<I', len(la))
buf += np.stack([np.round(la * 100), np.round(lo * 100)], 1).astype('<i2').tobytes() + fl.tobytes()
import base64; open('globo.txt', 'w').write(base64.b64encode(bytes(buf)).decode()); print('bytes', len(buf))
