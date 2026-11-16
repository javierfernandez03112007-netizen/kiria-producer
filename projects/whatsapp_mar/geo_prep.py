#!/usr/bin/env python3
"""Prepara el mapa del mundo de noche (suelo de la maqueta) para 20_map.js.

Datos: Natural Earth (dominio público) en engine/geo/ne/*.geojson (no se suben a git):
  ne_10m_land, ne_10m_bathymetry_{K_200,J_1000,I_2000,H_3000,G_4000,F_5000,E_6000}, ne_10m_urban_areas,
  ne_10m_populated_places_simple, ne_50m_admin_0_boundary_lines_land
  (https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/<nombre>.geojson)

Salida (projects/whatsapp_mar/web/assets/map/):
  base_color.jpg  8192x4096  mapa entero, lon -200..160 (centrado en -20, como mapP de 05_world.js), lat 90..-90
  base_lights.png 8192x4096  R = luces cálidas (sin Mauritania ni Tonga), G = luces de Mauritania/Tonga, B = máscara del país
  atl_*  4096x4096  detalle del Atlántico (lon -50..10, lat 50..-10);  ton_* 2048x2048 detalle de Tonga (lon -182..-170, lat -13..-25)
  cables.json     ~600 cables ilustrativos (NO son datos de TeleGeography): rutas A* por el mar entre puntos de amarre reales.

Uso: python3 geo_prep.py [tex] [cables]   (sin argumentos: las dos cosas)
"""
import json, math, os, sys, heapq, random, time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
NE = os.path.join(HERE, '..', '..', 'engine', 'geo', 'ne')
OUT = os.path.join(HERE, 'web', 'assets', 'map')
LONA, LONB = -200.0, 160.0           # el mapa (mapP: x = (lon + 20) * 10, de -1800 a 1800)

def load(n):
    with open(os.path.join(NE, n + '.geojson')) as f: return json.load(f)['features']

def rings(geom):
    """→ lista de polígonos, cada uno [exterior, agujero, ...] (anillos como arrays Nx2 lon/lat)."""
    t, c = geom['type'], geom['coordinates']
    if t == 'Polygon': c = [c]
    elif t != 'MultiPolygon': return []
    return [[np.asarray(r, dtype=np.float64)[:, :2] for r in p] for p in c]

def lines(geom):
    t, c = geom['type'], geom['coordinates']
    if t == 'LineString': c = [c]
    elif t != 'MultiLineString': return []
    return [np.asarray(r, dtype=np.float64)[:, :2] for r in c]

# zonas de los países que se apagan aparte (polígonos aproximados de la frontera; se cruzan con la tierra)
MAU_POLY = [(-17.3, 20.6), (-16.9, 21.33), (-13.0, 21.33), (-13.1, 22.75), (-12.0, 23.45), (-12.0, 26.0), (-8.68, 26.0), (-8.68, 27.3),
            (-4.83, 25.0), (-5.3, 16.4), (-5.5, 15.5), (-9.3, 15.5), (-10.7, 15.1), (-11.4, 15.6), (-12.2, 14.75), (-12.9, 15.6),
            (-14.3, 16.6), (-15.6, 16.5), (-16.6, 16.0), (-17.3, 16.0)]
TON_POLY = [(-176.6, -22.8), (-172.8, -22.8), (-172.8, -15.2), (-176.6, -15.2)]

class Frame:
    """Una región equirrectangular del mapa: lon0..lon1, lat1 (arriba)..lat0, W x H píxeles."""
    def __init__(s, lon0, lon1, lat0, lat1, W, H):
        s.lon0, s.lon1, s.lat0, s.lat1, s.W, s.H = lon0, lon1, lat0, lat1, W, H
        s.ppd = W / (lon1 - lon0)
    def xy(s, r, off=0.0):
        x = (r[:, 0] + off - s.lon0) * s.W / (s.lon1 - s.lon0)
        y = (s.lat1 - r[:, 1]) * s.H / (s.lat1 - s.lat0)
        return np.stack([x, y], 1)
    def offs(s, bb):        # desplazamientos de 360° con los que el polígono (bbox lon) cae dentro del cuadro
        return [o for o in (0.0, -360.0, 360.0) if bb[1] + o >= s.lon0 - 1 and bb[0] + o <= s.lon1 + 1]
    def lonlat(s):
        lon = s.lon0 + (np.arange(s.W) + 0.5) / s.W * (s.lon1 - s.lon0)
        lat = s.lat1 - (np.arange(s.H) + 0.5) / s.H * (s.lat1 - s.lat0)
        return np.meshgrid(lon, lat)

def poly_bb(p):
    e = p[0]; return (e[:, 0].min(), e[:, 0].max(), e[:, 1].min(), e[:, 1].max())

def fill_polys(fr, polys, img=None, val=255, hole=0):
    img = img or Image.new('L', (fr.W, fr.H), 0); d = ImageDraw.Draw(img)
    for p in polys:
        bb = poly_bb(p)
        if bb[3] < fr.lat0 - 1 or bb[2] > fr.lat1 + 1: continue
        for o in fr.offs(bb):
            for k, r in enumerate(p):
                pts = fr.xy(r, o)
                if len(pts) < 3: continue
                d.polygon([tuple(q) for q in pts], fill=val if k == 0 else hole)
    return img

def stroke_polys(fr, polys, width, img=None, val=255):
    img = img or Image.new('L', (fr.W, fr.H), 0); d = ImageDraw.Draw(img)
    for p in polys:
        bb = poly_bb(p)
        if bb[3] < fr.lat0 - 1 or bb[2] > fr.lat1 + 1: continue
        for o in fr.offs(bb):
            for r in p:
                pts = fr.xy(r, o)
                # sin el borde artificial de la Antártida (lat -90) ni los cortes del antimeridiano
                seg = []
                for i in range(len(pts)):
                    bad = r[i, 1] < -84.5 or abs(abs(r[i, 0]) - 180) < 1e-6
                    if bad:
                        if len(seg) > 1: d.line(seg, fill=val, width=width)
                        seg = []
                    else: seg.append(tuple(pts[i]))
                if len(seg) > 1: d.line(seg, fill=val, width=width)
    return img

def A(img): return np.asarray(img, dtype=np.float32) / 255.0
def blur(a, r):
    if r < 0.3: return a
    return np.asarray(Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255.0
def blurF(a, r):      # desenfoque con más precisión (16 bits) para degradados suaves
    m = max(a.max(), 1e-6)
    hi = Image.fromarray(((a / m) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))
    return np.asarray(hi, dtype=np.float32) / 255.0 * m

# ---------- ruido de relieve con coordenadas globales (igual en el mapa entero y en los detalles: sin costuras)
RNG = np.random.default_rng(7)
OCT = [(36, 18), (144, 72), (576, 288), (2304, 1152)]
NOISE = [RNG.random((h + 1, w + 1)).astype(np.float32) for (w, h) in OCT]
def noise_at(lon, lat):
    tot = np.zeros(lon.shape, np.float32); amp, s = 1.0, 0.0
    u0 = ((lon - LONA) % 360.0) / 360.0; v0 = (90.0 - lat) / 180.0
    for (w, h), N in zip(OCT, NOISE):
        u = u0 * w; v = np.clip(v0 * h, 0, h - 1e-4)
        i = np.floor(u).astype(np.int32) % w; j = np.floor(v).astype(np.int32); fu = (u - np.floor(u)).astype(np.float32); fv = (v - j).astype(np.float32)
        fu = fu * fu * (3 - 2 * fu); fv = fv * fv * (3 - 2 * fv)
        a = N[j, i] * (1 - fu) + N[j, i + 1] * fu; b = N[j + 1, i] * (1 - fu) + N[j + 1, i + 1] * fu
        tot += amp * (a * (1 - fv) + b * fv); s += amp; amp *= 0.5
    return tot / s

def hexc(h): return np.array([int(h[i:i + 2], 16) / 255.0 for i in (1, 3, 5)], np.float32)
# el océano por escalones: plataforma (< 200 m) turquesa → fosas (> 6000 m) azul marino muy oscuro
OCEAN = [hexc(c) for c in ('#286f80', '#1f5d76', '#184c69', '#14405e', '#113553', '#0e2c48', '#0b243d', '#081a2f')]
LAND0, LAND1 = hexc('#3b332d'), hexc('#5a4d41')
COAST = hexc('#d9e6ea')

_cache = {}
def data():
    if _cache: return _cache
    t = time.time()
    _cache['land'] = [p for f in load('ne_10m_land') for p in rings(f['geometry'])]
    _cache['bath'] = [[p for f in load('ne_10m_bathymetry_' + n) for p in rings(f['geometry'])] for n in ('K_200', 'J_1000', 'I_2000', 'H_3000', 'G_4000', 'F_5000', 'E_6000')]
    _cache['urban'] = [p for f in load('ne_10m_urban_areas') for p in rings(f['geometry'])]
    _cache['bound'] = [l for f in load('ne_50m_admin_0_boundary_lines_land') for l in lines(f['geometry'])]
    pl = []
    for f in load('ne_10m_populated_places_simple'):
        p = f['properties']; pl.append((p['longitude'], p['latitude'], max(p['pop_max'] or 0, p['pop_min'] or 0, 1000)))
    _cache['places'] = np.array(pl, np.float64)
    # puntitos de luz dispersos (pueblos): densidad = alrededor de las ciudades, sobre la tierra. Posiciones globales fijas.
    gw, gh = 3600, 1800
    g = Frame(LONA, LONB, -90, 90, gw, gh)
    land = A(fill_polys(g, _cache['land']))
    dens = np.zeros((gh, gw), np.float32)
    P = _cache['places']; x = ((P[:, 0] - LONA) % 360 / 360 * gw).astype(int) % gw; y = np.clip(((90 - P[:, 1]) / 180 * gh).astype(int), 0, gh - 1)
    np.add.at(dens, (y, x), np.log10(P[:, 2]) - 2.8)
    dens = blurF(dens, 6) * land
    dens = dens / dens.max()
    rng = np.random.default_rng(3); n = 110000
    flat = (dens.ravel() ** 0.8); flat /= flat.sum()
    idx = rng.choice(flat.size, n, p=flat)
    sy, sx = np.divmod(idx, gw)
    lon = LONA + (sx + rng.random(n)) / gw * 360; lat = 90 - (sy + rng.random(n)) / gh * 180
    _cache['speck'] = np.stack([lon, lat, 0.25 + 0.75 * rng.random(n)], 1)
    print('datos cargados en %.0f s' % (time.time() - t))
    return _cache

def render(fr, name, jpgq=90):
    D = data(); t = time.time(); W, H = fr.W, fr.H; ppd = fr.ppd
    lon, lat = fr.lonlat()
    land = A(fill_polys(fr, D['land']))
    # batimetría: nº de capas que cubren el píxel (0 = plataforma), suavizado → escalones suaves
    lev = np.zeros((H, W), np.float32)
    for polys in D['bath']: lev += A(fill_polys(fr, polys))
    lev = blur(lev / 7.0, max(0.6, 0.06 * ppd)) * 7.0
    i0 = np.clip(np.floor(lev).astype(int), 0, 6); fl = (lev - i0)[..., None]
    pal = np.stack(OCEAN); ocean = pal[i0] * (1 - fl) + pal[i0 + 1] * fl
    nz = noise_at(lon, lat)
    ocean *= (0.93 + 0.12 * nz[..., None])
    # brillo de la costa en el agua (la plataforma que se ve más clara justo en la orilla)
    shore = blur(land, max(1.0, 0.12 * ppd)) * (1 - land)
    ocean += shore[..., None] * hexc('#3a8c97') * 0.35
    # tierra: marrón-gris oscuro con relieve (sombreado del ruido) y un poco más clara hacia el interior
    h = nz * 1.0
    gy, gx = np.gradient(h); k = 2.2 * ppd / 22.7 * 60
    shade = np.clip(0.95 + (-gx * 0.7 + gy * 0.7) * k * 0.18, 0.85, 1.06)
    inl = blur(land, max(1.5, 0.5 * ppd))
    lc = LAND0 * 0.7 + LAND1 * 0.3 + (LAND1 - LAND0) * (nz[..., None] - 0.5) * 0.35
    lc = lc * shade[..., None] * (0.85 + 0.25 * inl[..., None])
    # hielo (Antártida, Groenlandia) un poco más frío
    ice = np.clip((np.abs(lat) - 62) / 8, 0, 1) * (lat < 0) + np.clip((lat - 66) / 6, 0, 1) * ((lon > -75) & (lon < -10))
    lc = lc * (1 - 0.5 * ice[..., None]) + hexc('#6d7680')[None, None] * 0.5 * ice[..., None]
    col = ocean * (1 - land[..., None]) + lc * land[..., None]
    # retícula muy sutil cada 10°
    gl = np.zeros((H, W), np.float32); wpx = max(1, int(round(0.03 * ppd)))
    for L in range(-180, 181, 10):
        for o in (0, -360, 360):
            x = int(round((L + o - fr.lon0) * ppd))
            if 0 <= x < W: gl[:, max(0, x - wpx // 2):x + wpx - wpx // 2] = 1
    for L in range(-80, 81, 10):
        y = int(round((fr.lat1 - L) * H / (fr.lat1 - fr.lat0)))
        if 0 <= y < H: gl[max(0, y - wpx // 2):y + wpx - wpx // 2, :] = 1
    col += gl[..., None] * hexc('#5d86a6') * 0.10 * (1 - land[..., None] * 0.5)
    # fronteras muy sutiles
    bd = Image.new('L', (W, H), 0); d = ImageDraw.Draw(bd); bw = max(1, int(round(0.025 * ppd)))
    for l in D['bound']:
        for o in (0.0, -360.0):
            pts = fr.xy(l, o)
            if pts[:, 0].max() < 0 or pts[:, 0].min() > W or pts[:, 1].max() < 0 or pts[:, 1].min() > H: continue
            d.line([tuple(q) for q in pts], fill=255, width=bw)
    col += A(bd)[..., None] * hexc('#c9b9a0') * 0.13
    # costas finas y claras (con un halo suave)
    cw = max(1, int(round(0.035 * ppd)))
    coast = A(stroke_polys(fr, D['land'], cw))
    col = col * (1 - coast[..., None] * 0.55) + COAST * coast[..., None] * 0.55
    col += blur(coast, max(0.8, 0.08 * ppd))[..., None] * hexc('#9fd6e0') * 0.12
    Image.fromarray(np.clip(col * 255, 0, 255).astype(np.uint8)).save(os.path.join(OUT, name + '_color.jpg'), quality=jpgq, optimize=True)
    # ---------- luces: zonas urbanas + lugares poblados (por población) + puntitos de pueblos
    urb = A(fill_polys(fr, D['urban']))
    lights = blur(urb, max(0.6, 0.03 * ppd)) * 0.75
    pts = Image.new('L', (W, H), 0); d = ImageDraw.Draw(pts)
    P = D['places']
    for o in (0.0, -360.0):
        xy = fr.xy(P, o); m = (xy[:, 0] > -40) & (xy[:, 0] < W + 40) & (xy[:, 1] > -40) & (xy[:, 1] < H + 40)
        for (x, y), pop in zip(xy[m], P[m, 2]):
            lp = math.log10(pop); r = max(0.6, (0.012 + 0.016 * max(0, lp - 3.5)) * ppd); v = int(min(255, 60 + 45 * max(0, lp - 3.5)))
            d.ellipse((x - r, y - r, x + r, y + r), fill=v)
    S = D['speck']
    for o in (0.0, -360.0):
        xy = fr.xy(S, o); m = (xy[:, 0] > -2) & (xy[:, 0] < W + 2) & (xy[:, 1] > -2) & (xy[:, 1] < H + 2)
        r = max(0.5, 0.008 * ppd)
        for (x, y), v in zip(xy[m], S[m, 2]):
            d.ellipse((x - r, y - r, x + r, y + r), fill=int(25 + 60 * v))
    pl = A(pts)
    lights = np.maximum(lights, blur(pl, max(0.5, 0.012 * ppd)) * 1.2)
    lights = lights + blur(lights, max(1.5, 0.12 * ppd)) * 0.5          # halo de las zonas iluminadas
    lights = np.clip(lights * land * 1.0 + lights * (1 - land) * 0.5, 0, 1)
    # máscaras de Mauritania y Tonga (país ∩ tierra): sus luces van aparte (G) y la máscara en B
    mask = Image.new('L', (W, H), 0); d = ImageDraw.Draw(mask)
    for poly in (MAU_POLY, TON_POLY):
        q = fr.xy(np.array(poly)); d.polygon([tuple(v) for v in q], fill=255)
    cm = A(mask) * np.maximum(land, blur(land, max(1.0, 0.04 * ppd)))
    cm = np.clip(cm, 0, 1)
    soft = blur(A(mask), max(0.8, 0.03 * ppd))         # todo lo que cae dentro del país (las luces de islas pequeñas también)
    R = lights * (1 - soft); G = lights * soft
    Bm = np.maximum(cm, blur(cm, max(1.5, 0.15 * ppd)) * 0.6)
    out = np.stack([R, G, Bm], -1)
    Image.fromarray(np.clip(out * 255, 0, 255).astype(np.uint8)).save(os.path.join(OUT, name + '_lights.png'), optimize=True)
    print('%s %dx%d en %.0f s' % (name, W, H, time.time() - t))
    return land

# ======================================================================================== CABLES
# puntos de amarre (lon, lat): ciudades costeras reales (aprox.)
LP = {
 # Norteamérica (Atlántico)
 'Wall NJ': (-74.02, 40.15), 'Shirley NY': (-72.87, 40.74), 'Lynn MA': (-70.93, 42.45), 'Virginia Beach': (-75.97, 36.84), 'Myrtle Beach': (-78.88, 33.69),
 'Jacksonville': (-81.39, 30.33), 'Boca Raton': (-80.08, 26.36), 'Miami': (-80.13, 25.77), 'Halifax': (-63.57, 44.64), "St John's": (-52.71, 47.56),
 'Nuuk': (-51.72, 64.18),
 # Caribe y Centroamérica
 'La Habana': (-82.36, 23.14), 'Kingston': (-76.79, 17.97), 'Santo Domingo': (-69.9, 18.47), 'San Juan': (-66.1, 18.47), 'Cancún': (-86.84, 21.16),
 'Colón': (-79.9, 9.36), 'Ciudad de Panamá': (-79.52, 8.95), 'Barranquilla': (-74.8, 11.0), 'Cartagena': (-75.55, 10.4), 'La Guaira': (-66.93, 10.6),
 'Puerto España': (-61.52, 10.65), 'Bridgetown': (-59.62, 13.1), 'Fort-de-France': (-61.07, 14.6), 'Georgetown': (-58.16, 6.8), 'Paramaribo': (-55.17, 5.86),
 'Cayena': (-52.33, 4.94), 'Puerto San José': (-90.82, 13.92), 'Manzanillo': (-104.32, 19.05), 'Tijuana': (-117.05, 32.4), 'Veracruz': (-96.13, 19.19),
 # Sudamérica
 'Fortaleza': (-38.52, -3.72), 'Natal': (-35.2, -5.79), 'Recife': (-34.88, -8.06), 'Salvador': (-38.5, -12.97), 'Río de Janeiro': (-43.17, -22.95),
 'Praia Grande': (-46.4, -24.01), 'Florianópolis': (-48.55, -27.6), 'Maldonado': (-54.95, -34.9), 'Las Toninas': (-56.7, -36.5),
 'Valparaíso': (-71.62, -33.04), 'Arica': (-70.31, -18.48), 'Lima': (-77.15, -12.05), 'Máncora': (-81.05, -4.1), 'Salinas': (-80.96, -2.2),
 'Buenaventura': (-77.07, 3.88), 'Puerto Montt': (-73.1, -41.5),
 # Norteamérica (Pacífico) y Hawái
 'Hermosa Beach': (-118.4, 33.86), 'Grover Beach': (-120.62, 35.12), 'Pacifica': (-122.5, 37.62), 'Pacific City': (-123.96, 45.2), 'Bandon': (-124.41, 43.12),
 'Anchorage': (-149.9, 61.2), 'Oahu': (-158.2, 21.55),
 # Pacífico
 'Guam': (144.75, 13.45), 'Saipán': (145.75, 15.2), 'Suva': (178.44, -18.14), "Nuku'alofa": (-175.2, -21.14), 'Apia': (-171.75, -13.83),
 'Pago Pago': (-170.7, -14.28), 'Numea': (166.45, -22.27), 'Port Vila': (168.32, -17.73), 'Papeete': (-149.57, -17.53), 'Honiara': (159.95, -9.43),
 'Port Moresby': (147.15, -9.47), 'Majuro': (171.38, 7.1), 'Palaos': (134.48, 7.34), 'Pohnpei': (158.2, 6.96), 'Rarotonga': (-159.78, -21.2), 'Tarawa': (173.0, 1.35),
 # Australia y Nueva Zelanda
 'Sídney': (151.25, -33.9), 'Perth': (115.75, -31.95), 'Darwin': (130.85, -12.45), 'Sunshine Coast': (153.1, -26.65), 'Melbourne': (144.6, -38.3),
 'Adelaida': (138.5, -34.9), 'Auckland': (174.78, -36.79), 'Raglan': (174.87, -37.8), 'Hobart': (147.33, -42.88), 'Port Hedland': (118.6, -20.3),
 # Asia oriental
 'Chikura': (139.95, 34.95), 'Shima': (136.85, 34.3), 'Kitaibaraki': (140.75, 36.8), 'Okinawa': (127.68, 26.2), 'Busan': (129.05, 35.1),
 'Shanghái': (121.8, 31.25), 'Qingdao': (120.38, 36.07), 'Fuzhou': (119.6, 26.0), 'Shantou': (116.7, 23.35), 'Hong Kong': (114.2, 22.25),
 'Toucheng': (121.85, 24.85), 'Fangshan': (120.6, 22.25), 'Batangas': (121.0, 13.75), 'Davao': (125.6, 7.07), 'Vladivostok': (131.9, 43.1),
 # Sudeste asiático
 'Vung Tau': (107.08, 10.35), 'Da Nang': (108.22, 16.07), 'Qui Nhon': (109.2, 13.77), 'Sihanoukville': (103.5, 10.6), 'Songkhla': (100.6, 7.2),
 'Satun': (100.05, 6.6), 'Singapur': (103.98, 1.33), 'Kuantan': (103.35, 3.8), 'Kota Kinabalu': (116.07, 5.98), 'Brunéi': (114.9, 4.95),
 'Yakarta': (106.8, -6.1), 'Batam': (104.0, 1.1), 'Surabaya': (112.75, -7.2), 'Makassar': (119.4, -5.13), 'Manado': (124.85, 1.5),
 'Jayapura': (140.7, -2.53), 'Dili': (125.57, -8.55), 'Penang': (100.33, 5.4), 'Ngwe Saung': (94.38, 16.85),
 # Índico
 'Chennai': (80.28, 13.08), 'Bombay': (72.82, 18.95), 'Kochi': (76.25, 9.95), 'Colombo': (79.85, 6.93), "Cox's Bazar": (91.97, 21.43), 'Malé': (73.5, 4.17),
 'Karachi': (66.98, 24.85), 'Mascate': (58.6, 23.6), 'Barka': (57.88, 23.7), 'Fuyaira': (56.35, 25.13), 'Doha': (51.53, 25.3), 'Manama': (50.6, 26.2),
 'Kuwait': (48.0, 29.35), 'Salalah': (54.0, 17.0), 'Yeda': (39.15, 21.5), 'Yanbu': (38.05, 24.08), 'Yibuti': (43.15, 11.6), 'Adén': (45.0, 12.8),
 'Port Sudan': (37.22, 19.6), 'Suez': (32.55, 29.95), 'Zafarana': (32.65, 29.1), 'Alejandría': (29.9, 31.2), 'Port Said': (32.3, 31.27),
 'Mombasa': (39.7, -4.05), 'Dar es Salaam': (39.3, -6.8), 'Mogadiscio': (45.33, 2.03), 'Maputo': (32.6, -25.97), 'Mtunzini': (31.75, -28.95),
 'Durban': (31.03, -29.85), 'Port Elizabeth': (25.6, -33.97), 'Mauricio': (57.5, -20.16), 'Reunión': (55.45, -20.88), 'Toliara': (43.67, -23.35),
 'Mahajanga': (46.3, -15.7), 'Seychelles': (55.45, -4.62), 'Moroni': (43.25, -11.7), 'Nacala': (40.7, -14.55), 'Beira': (34.85, -19.85),
 # África atlántica
 'Melkbosstrand': (18.44, -33.73), 'Yzerfontein': (18.15, -33.35), 'Swakopmund': (14.52, -22.68), 'Luanda': (13.23, -8.81), 'Muanda': (12.35, -5.93),
 'Pointe-Noire': (11.85, -4.79), 'Libreville': (9.45, 0.39), 'Kribi': (9.9, 2.94), 'Douala': (9.7, 4.05), 'Bata': (9.77, 1.86), 'Lagos': (3.4, 6.42),
 'Cotonú': (2.43, 6.35), 'Lomé': (1.22, 6.13), 'Acra': (-0.2, 5.55), 'Abiyán': (-4.02, 5.3), 'Monrovia': (-10.8, 6.3), 'Freetown': (-13.23, 8.48),
 'Conakri': (-13.7, 9.52), 'Bisáu': (-15.6, 11.85), 'Banjul': (-16.58, 13.45), 'Dakar': (-17.45, 14.7), 'Nuakchot': (-15.97, 18.08),
 'Nuadibú': (-17.04, 20.92), 'Praia': (-23.5, 14.92), 'Las Palmas': (-15.42, 28.1), 'Tenerife': (-16.25, 28.47), 'Funchal': (-16.9, 32.64),
 'Casablanca': (-7.62, 33.6), 'Tánger': (-5.8, 35.78), 'Ponta Delgada': (-25.67, 37.74),
 # Europa
 'Sines': (-8.87, 37.95), 'Sesimbra': (-9.1, 38.44), 'Carcavelos': (-9.33, 38.68), 'Sopelana': (-3.0, 43.39), 'Barcelona': (2.17, 41.38), 'Valencia': (-0.33, 39.47),
 'Marsella': (5.37, 43.3), 'Génova': (8.93, 44.4), 'Palermo': (13.36, 38.13), 'Mazara': (12.58, 37.65), 'Bari': (16.87, 41.13), 'Catania': (15.09, 37.5),
 'Chania': (24.0, 35.52), 'Tartus': (35.88, 34.9), 'Limasol': (33.04, 34.67), 'Haifa': (34.98, 32.82), 'Tel Aviv': (34.77, 32.08), 'Beirut': (35.5, 33.9),
 'Bizerta': (9.87, 37.27), 'Argel': (3.05, 36.78), 'Annaba': (7.77, 36.9), 'Trípoli': (13.18, 32.9), 'Bengasi': (20.07, 32.12), 'Malta': (14.5, 35.9),
 'Penmarch': (-4.37, 47.8), 'Saint-Hilaire': (-1.95, 46.72), 'Le Porge': (-1.2, 44.87), 'Bude': (-4.55, 50.83), 'Porthcurno': (-5.65, 50.04),
 'Blackpool': (-3.05, 53.82), 'Dublín': (-6.1, 53.35), 'Killala': (-9.22, 54.22), 'Lowestoft': (1.75, 52.48), 'Katwijk': (4.4, 52.2),
 'Blaabjerg': (8.2, 55.75), 'Kristiansand': (8.0, 58.15), 'Landeyjar': (-20.15, 63.5), 'Seydisfjordur': (-14.0, 65.26), 'Tórshavn': (-6.77, 62.0),
 'Helsinki': (24.95, 60.17), 'Estocolmo': (18.9, 59.3), 'Rostock': (12.1, 54.18), 'Gdansk': (18.65, 54.4), 'Tallin': (24.75, 59.44), 'Bergen': (5.1, 60.4),
}

G_NAE = ['Wall NJ', 'Shirley NY', 'Lynn MA', 'Virginia Beach', 'Halifax', "St John's", 'Myrtle Beach', 'Jacksonville', 'Boca Raton']
G_EUW = ['Bude', 'Porthcurno', 'Dublín', 'Killala', 'Penmarch', 'Saint-Hilaire', 'Le Porge', 'Sopelana', 'Blaabjerg', 'Kristiansand', 'Sines', 'Carcavelos', 'Blackpool', 'Katwijk', 'Lowestoft']
G_CAR = ['Miami', 'Boca Raton', 'La Habana', 'Kingston', 'Santo Domingo', 'San Juan', 'Cancún', 'Colón', 'Barranquilla', 'Cartagena', 'La Guaira', 'Puerto España', 'Bridgetown', 'Fort-de-France', 'Georgetown', 'Paramaribo', 'Cayena', 'Veracruz']
G_BRA = ['Fortaleza', 'Natal', 'Recife', 'Salvador', 'Río de Janeiro', 'Praia Grande', 'Florianópolis', 'Maldonado', 'Las Toninas']
G_SAP = ['Valparaíso', 'Arica', 'Lima', 'Máncora', 'Salinas', 'Buenaventura', 'Ciudad de Panamá', 'Puerto San José', 'Manzanillo', 'Puerto Montt']
G_USW = ['Hermosa Beach', 'Grover Beach', 'Pacifica', 'Pacific City', 'Bandon', 'Tijuana']
G_JPN = ['Chikura', 'Shima', 'Kitaibaraki', 'Okinawa', 'Busan', 'Shanghái', 'Qingdao', 'Toucheng', 'Fangshan', 'Hong Kong']
G_SEA = ['Singapur', 'Batangas', 'Hong Kong', 'Vung Tau', 'Da Nang', 'Qui Nhon', 'Kuantan', 'Kota Kinabalu', 'Brunéi', 'Yakarta', 'Batam', 'Songkhla', 'Satun', 'Penang', 'Shantou', 'Fuzhou', 'Davao', 'Manado', 'Surabaya', 'Sihanoukville', 'Makassar', 'Dili']
G_AUS = ['Sídney', 'Perth', 'Darwin', 'Sunshine Coast', 'Melbourne', 'Auckland', 'Raglan', 'Port Hedland', 'Adelaida']
G_PAC = ['Guam', 'Saipán', 'Oahu', 'Suva', 'Apia', 'Pago Pago', 'Numea', 'Port Vila', 'Papeete', 'Honiara', 'Port Moresby', 'Majuro', 'Palaos', 'Pohnpei', 'Tarawa', 'Rarotonga']
G_MED = ['Marsella', 'Génova', 'Palermo', 'Mazara', 'Bari', 'Catania', 'Chania', 'Tartus', 'Limasol', 'Haifa', 'Tel Aviv', 'Beirut', 'Bizerta', 'Argel', 'Annaba', 'Trípoli', 'Bengasi', 'Malta', 'Barcelona', 'Valencia', 'Alejandría', 'Port Said']
G_RED = ['Suez', 'Zafarana', 'Yeda', 'Yanbu', 'Port Sudan', 'Yibuti', 'Adén']
G_IND = ['Bombay', 'Karachi', 'Mascate', 'Barka', 'Fuyaira', 'Salalah', 'Kochi', 'Colombo', 'Chennai', 'Malé', "Cox's Bazar", 'Ngwe Saung', 'Doha', 'Manama', 'Kuwait']
G_EAF = ['Mombasa', 'Dar es Salaam', 'Mogadiscio', 'Maputo', 'Mtunzini', 'Durban', 'Port Elizabeth', 'Mauricio', 'Reunión', 'Toliara', 'Mahajanga', 'Seychelles', 'Moroni', 'Nacala', 'Beira', 'Yibuti']
G_WAF = ['Melkbosstrand', 'Yzerfontein', 'Swakopmund', 'Luanda', 'Muanda', 'Pointe-Noire', 'Libreville', 'Kribi', 'Douala', 'Bata', 'Lagos', 'Cotonú', 'Lomé', 'Acra', 'Abiyán', 'Monrovia', 'Freetown', 'Conakri', 'Bisáu', 'Banjul', 'Dakar', 'Nuakchot']
G_IBM = ['Sines', 'Carcavelos', 'Sesimbra', 'Marsella', 'Sopelana', 'Casablanca', 'Tánger', 'Las Palmas', 'Tenerife', 'Funchal', 'Porthcurno', 'Bude', 'Penmarch', 'Saint-Hilaire', 'Le Porge']
G_NOR = ['Bergen', 'Kristiansand', 'Blaabjerg', 'Katwijk', 'Lowestoft', 'Rostock', 'Gdansk', 'Estocolmo', 'Helsinki', 'Tallin', 'Landeyjar', 'Seydisfjordur', 'Tórshavn', 'Killala', 'Dublín', 'Blackpool']

# (grupo A, grupo B, nº de cables). Las rutas largas se agrupan solas por el coste de los corredores.
LINKS = [
 (G_NAE, G_EUW, 46), (G_NAE, G_CAR, 18), (G_CAR, G_CAR, 34), (G_CAR, G_BRA, 16), (G_NAE, G_BRA, 10), (G_BRA, G_BRA, 18), (G_BRA, G_WAF, 7),
 (G_BRA, G_IBM, 4), (G_SAP, G_SAP, 20), (G_SAP, G_CAR, 12), (G_SAP, G_USW, 6), (G_USW, G_JPN, 26), (G_USW, ['Oahu', 'Guam'], 8), (G_USW, G_AUS, 6),
 (G_USW, G_SEA, 8), (G_JPN, G_JPN, 30), (G_JPN, G_SEA, 30), (G_SEA, G_SEA, 50), (G_SEA, G_AUS, 14), (G_AUS, G_AUS, 10), (G_AUS, G_PAC, 10),
 (G_PAC, G_PAC, 16), (G_JPN, G_PAC, 8), (G_SEA, G_PAC, 6), (G_MED, G_MED, 40), (G_MED, G_RED, 16), (G_MED, G_IND, 18), (G_RED, G_IND, 16),
 (G_IND, G_IND, 24), (G_IND, G_SEA, 26), (G_IND, G_EAF, 10), (G_EAF, G_EAF, 18), (G_RED, G_EAF, 8), (G_IBM, G_WAF, 18), (G_WAF, G_WAF, 26),
 (G_EAF, ['Melkbosstrand', 'Yzerfontein', 'Port Elizabeth'], 4), (G_IBM, G_IBM, 14), (G_IBM, G_MED, 10), (G_NOR, G_NOR, 22), (G_NOR, G_NAE, 6),
 (['Nuuk'], ["St John's", 'Landeyjar', 'Halifax'], 3), (['Anchorage'], ['Pacific City', 'Bandon', 'Chikura'], 3), (G_EUW, G_EUW, 12),
 (['Vladivostok'], G_JPN, 3), (G_MED, G_EUW, 4),
]
SPECIAL = [
 ('EllaLink', ['Sines', 'Funchal', 'Praia', 'Fortaleza']),
 ('Tonga Cable', ["Nuku'alofa", 'Suva']),
 ('ACE', ['Carcavelos', 'Tenerife', 'Nuakchot', 'Dakar', 'Banjul', 'Conakri', 'Freetown', 'Abiyán']),
]

GR = 0.25                                   # rejilla de 0,25°
GW, GH = int(360 / GR), int(180 / GR)
def gcell(lon, lat): return int(((lon - LONA) % 360) / GR) % GW, min(GH - 1, max(0, int((90 - lat) / GR)))
def gcenter(i, j): return LONA + (i + 0.5) * GR, 90 - (j + 0.5) * GR

def seamask():
    D = data()
    fr = Frame(LONA, LONB, -90, 90, GW * 4, GH * 4)
    land = A(fill_polys(fr, D['land'])).reshape(GH, 4, GW, 4).mean((1, 3))
    sea = land < 0.6
    # canales que en la rejilla no se ven (Suez) y Panamá (el cable cruza por tierra)
    for a, b in (((32.55, 29.95), (32.3, 31.27)), ((-79.9, 9.36), (-79.52, 8.95)), ((-5.6, 35.95), (-5.3, 35.95))):
        for t in np.linspace(0, 1, 60):
            i, j = gcell(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); sea[j, i] = True
    lat = 90 - (np.arange(GH) + 0.5) * GR
    sea[(lat > 70) | (lat < -62), :] = False
    return sea, land

def astar(sea, cost, s, g):
    """A* en la rejilla (envuelve en longitud). s, g = (i, j). Devuelve lista de celdas."""
    coslat = np.cos(np.radians(90 - (np.arange(GH) + 0.5) * GR)).clip(0.15)
    si, sj = s; gi, gj = g
    def h(i, j):
        dx = abs(i - gi); dx = min(dx, GW - dx) * coslat[j]; dy = abs(j - gj)
        return 0.62 * math.hypot(dx, dy)
    start = sj * GW + si; goal = gj * GW + gi
    gs = {start: 0.0}; came = {start: -1}; op = [(h(si, sj), start)]; closed = set()
    nb = [(-1, -1, 1.414), (0, -1, 1), (1, -1, 1.414), (-1, 0, 1), (1, 0, 1), (-1, 1, 1.414), (0, 1, 1), (1, 1, 1.414)]
    while op:
        _, cur = heapq.heappop(op)
        if cur == goal: break
        if cur in closed: continue
        closed.add(cur)
        j, i = divmod(cur, GW); gc = gs[cur]; cl = coslat[j]
        for di, dj, dd in nb:
            nj = j + dj
            if nj < 0 or nj >= GH: continue
            ni = (i + di) % GW
            if not sea[nj, ni]: continue
            n = nj * GW + ni
            if n in closed: continue
            step = math.hypot(di * cl, dj) * cost[nj, ni]
            ng = gc + step
            if ng < gs.get(n, 1e18):
                gs[n] = ng; came[n] = cur; heapq.heappush(op, (ng + h(ni, nj), n))
    if goal not in came: return None
    path = []; c = goal
    while c != -1: path.append(c); c = came[c]
    path.reverse()
    return [(c % GW, c // GW) for c in path]

def nearest_sea(sea, lon, lat):
    i0, j0 = gcell(lon, lat)
    for r in range(0, 30):
        best = None
        for dj in range(-r, r + 1):
            for di in range(-r, r + 1):
                if max(abs(di), abs(dj)) != r: continue
                i, j = (i0 + di) % GW, j0 + dj
                if 0 <= j < GH and sea[j, i]:
                    d = di * di + dj * dj
                    if best is None or d < best[0]: best = (d, i, j)
        if best: return best[1], best[2]
    raise RuntimeError('sin mar cerca de %s %s' % (lon, lat))

def unwrap(pts):
    out = [list(pts[0])]
    for p in pts[1:]:
        lon = p[0]
        while lon - out[-1][0] > 180: lon -= 360
        while lon - out[-1][0] < -180: lon += 360
        out.append([lon, p[1]])
    return out

def rdp(pts, eps):
    pts = np.asarray(pts)
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; d = b - a; L = math.hypot(*d) or 1e-9
    dist = np.abs(d[0] * (pts[:, 1] - a[1]) - d[1] * (pts[:, 0] - a[0])) / L
    k = int(np.argmax(dist))
    if dist[k] > eps:
        l = rdp(pts[:k + 1], eps); r = rdp(pts[k:], eps); return np.vstack([l[:-1], r])
    return np.vstack([a, b])

def chaikin(pts, it=3):
    p = np.asarray(pts)
    for _ in range(it):
        q = np.empty((len(p) * 2 - 2, 2)); q[0::2] = 0.75 * p[:-1] + 0.25 * p[1:]; q[1::2] = 0.25 * p[:-1] + 0.75 * p[1:]
        p = np.vstack([p[:1], q, p[-1:]])
    return p

def cables():
    t0 = time.time()
    sea, landf = seamask()
    near = np.zeros_like(sea)            # celdas pegadas a la costa: algo más caras (los cables se separan un poco de la orilla)
    for di in (-1, 0, 1):
        for dj in (-1, 0, 1): near |= np.roll(np.roll(~sea, di, 1), dj, 0)
    base = np.where(near, 1.5, 1.0).astype(np.float32)
    used = np.zeros(sea.shape, np.float32)
    rng = random.Random(11)
    names = list(LP)
    snap = {n: nearest_sea(sea, *LP[n]) for n in names}
    def dist(a, b):
        (x1, y1), (x2, y2) = LP[a], LP[b]
        return math.hypot(((x1 - x2 + 180) % 360 - 180) * math.cos(math.radians((y1 + y2) / 2)), y1 - y2)
    jobs = []
    for nm, stops in SPECIAL: jobs.append((nm, stops))
    # cables de costa: cada punto con sus vecinos más cercanos (de 2 a 3)
    seen = set()
    for a in names:
        nn = sorted((dist(a, b), b) for b in names if b != a)
        for d, b in nn[:rng.choice([2, 2, 3])]:
            if d > 22: continue
            k = tuple(sorted((a, b)))
            if k in seen: continue
            seen.add(k); jobs.append(('', [a, b]))
    for A_, B_, n in LINKS:
        for _ in range(max(1, int(n * 0.45 + 0.5))):
            for _try in range(20):
                a, b = rng.choice(A_), rng.choice(B_)
                if a != b and dist(a, b) > 2.0: break
            # a veces con una parada en medio (cables de varios amarres)
            stops = [a, b]
            if rng.random() < 0.25:
                mids = [c for c in names if c not in (a, b) and dist(a, c) + dist(c, b) < dist(a, b) * 1.12]
                if mids: stops = [a, rng.choice(mids), b]
            jobs.append(('', stops))
    print('cables a trazar:', len(jobs))
    out = []; legc = {}
    for ci, (nm, stops) in enumerate(jobs):
        pts = []
        for a, b in zip(stops[:-1], stops[1:]):
            key = (a, b)
            if key in legc and rng.random() < 0.6: cells = legc[key]
            else:
                cost = base * (1.0 - 0.32 * np.minimum(used, 1.0))
                cells = astar(sea, cost, snap[a], snap[b])
                if cells is None: print('  sin ruta', a, b); break
                legc[key] = cells; legc[(b, a)] = cells[::-1]
            for (i, j) in cells:
                used[j, i] = min(used[j, i] + 0.5, 1.0)
                for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)): used[j + dj if 0 <= j + dj < GH else j, (i + di) % GW] = min(used[j + dj if 0 <= j + dj < GH else j, (i + di) % GW] + 0.15, 1.0)
            leg = [LP[a]] + [gcenter(i, j) for (i, j) in cells] + [LP[b]]
            leg = unwrap(leg)
            if pts:
                off = round((pts[-1][0] - leg[0][0]) / 360) * 360
                leg = [[x + off, y] for x, y in leg]
                pts += leg[1:]
            else: pts = leg
        else:
            p = rdp(np.array(pts), 0.22); p = chaikin(p, 3)
            # haces: cada cable desplazado un poco a un lado (0 en los extremos y paradas)
            if not nm and len(p) > 4:
                off = rng.uniform(-1, 1) * min(0.9, 0.15 + 0.004 * len(p))
                d = np.gradient(p, axis=0); n = np.stack([-d[:, 1], d[:, 0]], 1); n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-9
                s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))]); L = s[-1]
                taper = np.clip(np.minimum(s, L - s) / 4.0, 0, 1) ** 1.5
                p = p + n * (off * taper)[:, None]
            # longitud dentro de LONA..LONB (el mapa empieza en -200)
            m = p[:, 0].mean()
            p[:, 0] += (round((m - (LONA + 180)) / 360) * -360)
            rec = {'p': [int(round(v * 100)) for v in p.ravel()]}
            if nm: rec['n'] = nm; rec['s'] = stops
            out.append(rec)
        if ci % 50 == 0: print('  %d/%d  %.0f s' % (ci, len(jobs), time.time() - t0))
    # cortes ilustrativos (para «se rompen 150–200 al año»): puntos al azar en cables al azar
    js = {'lon0': LONA, 'scale': 100, 'cables': out, 'stops': {n: LP[n] for nm, st in SPECIAL for n in st}}
    with open(os.path.join(OUT, 'cables.json'), 'w') as f: json.dump(js, f, separators=(',', ':'), ensure_ascii=False)
    print('cables: %d en %.0f s, %d kB' % (len(out), time.time() - t0, os.path.getsize(os.path.join(OUT, 'cables.json')) // 1024))

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    what = sys.argv[1:] or ['tex', 'cables']
    if 'tex' in what or 'base' in what: render(Frame(LONA, LONB, -90, 90, 8192, 4096), 'base', 88)
    if 'tex' in what or 'atl' in what: render(Frame(-50, 10, -10, 50, 4096, 4096), 'atl', 88)
    if 'tex' in what or 'ton' in what: render(Frame(-182, -170, -25, -13, 2048, 2048), 'ton', 90)
    if 'cables' in what: cables()
