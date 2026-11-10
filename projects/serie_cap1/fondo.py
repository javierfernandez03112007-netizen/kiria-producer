"""Serie «Reto: 10 clientes en 30 días», capítulo 1: el fondo nuevo (la pared de estudio).

Cómo funciona:
- Cada toma tiene su fondo limpio (`bg/<toma>_plate.png`, mediana de los fotogramas con Javi tapado) y la zona que Javi tapa siempre
  (`bg/<toma>_unseen.png`); lo hace `platefull.py` (en la carpeta de trabajo).
- La decoración se diseña UNA vez en las coordenadas de la toma a8695 (la «maestra», donde se ve el monitor entero) y se lleva a cada toma
  con su semejanza (escala, giro y desplazamiento, `bg/<toma>_A.npy`, calculada con SIFT sobre el monitor y el teclado): así el letrero,
  el cuadro y la luz LED quedan en el mismo sitio de la pared en todas las tomas aunque Javi moviera el móvil.
- La pared (lo claro y liso; detrás de Javi, por geometría: por encima de la mesa y fuera del monitor) se cambia por listones de nogal
  sobre fieltro negro, iluminados con la luz real de la toma (más luz abajo a la derecha, como en la grabación), con:
  letrero «kiria.ai» de letras retroiluminadas (halo con el degradado de Kiria), tira LED detrás del monitor, cuadro con un render del
  canal y una luz cálida detrás de la cabeza que lo separa del fondo.
- El monitor, la mesa, el teclado y la silla son los de verdad. Todo el fondo lleva un poco de desenfoque (profundidad de campo).
"""
import os, sys, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.environ.get('SERIE', '/tmp/claude-0/-home-user-kiria-producer/d228a445-00e3-5efa-9cb5-0a1c283ea2f0/scratchpad/serie/')
BG = WORK + 'bg/'
FONTS = os.path.join(HERE, '..', '..', 'engine', 'fonts') + '/'
CLIPS = ['a8695', 'a8699', 'c8707b', 'c8707a', 'c8707c', 'd8709', 'e8712']
MASTER = 'a8695'

# ---- geometría en coordenadas de la toma maestra (a8695) ----
MON = np.float32([[-39, 823], [610, 819], [610, 1196], [-39, 1214]])     # monitor (el borde izquierdo, medido en c8707b)
DESK_Y = 1212                                                              # donde la mesa toca la pared
OX, OY, CW, CH = 320, 320, 1760, 2560                                      # lienzo maestro: x de -320 a 1440, y de -320 a 2240

# ---- colores de la marca ----
def hexrgb(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255
RED, VIO, BLUE, YEL = hexrgb('ff4d61'), hexrgb('b45cff'), hexrgb('4f7dff'), hexrgb('ffc83d')
def s2l(c): c = np.asarray(c, np.float32); return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def l2s(c): c = np.clip(c, 0, None); return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)

def kgrad(t):
    """degradado de Kiria (rojo → violeta → azul), t de 0 a 1 (array) → RGB lineal."""
    t = np.clip(t, 0, 1)[..., None]
    a = s2l(RED); b = s2l(VIO); c = s2l(BLUE)
    return np.where(t < 0.5, a + (b - a) * (t / 0.5), b + (c - b) * ((t - 0.5) / 0.5))

def canvas_xy():
    xs = np.arange(CW, dtype=np.float32) - OX; ys = np.arange(CH, dtype=np.float32) - OY
    return np.meshgrid(xs, ys)

def A_of(clip):
    """semejanza maestra → toma (2x3)."""
    if clip == MASTER: return np.float32([[1, 0, 0], [0, 1, 0]])
    return np.load(BG + clip + '_A.npy').astype(np.float32)

def warp(img, clip, interp=cv2.INTER_LINEAR):
    """lleva una capa del lienzo maestro a la toma."""
    A = A_of(clip).astype(np.float64); T = np.array([[1, 0, -OX], [0, 1, -OY], [0, 0, 1]], np.float64)
    M = A @ T                                                       # lienzo → toma
    return cv2.warpAffine(img, M[:2].astype(np.float32), (W, H), flags=interp, borderMode=cv2.BORDER_REPLICATE)

def to_clip_pts(pts, clip):
    A = A_of(clip); return (np.c_[pts, np.ones(len(pts))] @ A.T).astype(np.float32)

# ---------------------------------------------------------------- la pared de listones (albedo lineal)
def slat_albedo(seed=7, pitch=43, slat=29):
    rng = np.random.default_rng(seed)
    X, Y = canvas_xy()
    xx = X + 4000.0
    k = np.floor(xx / pitch).astype(np.int32); u = xx - k * pitch                  # índice del listón y posición dentro
    n = int(k.max()) + 2
    tone = 0.80 + 0.40 * rng.random(n); tint = rng.normal(0, 0.035, n); ph = rng.random(n) * 50; off = rng.random(n) * 3000
    sig = cv2.GaussianBlur(rng.random((1, 8192)).astype(np.float32), (0, 0), 1.6)[0]; sig = (sig - sig.mean()) / (sig.std() + 1e-6)
    sig2 = cv2.GaussianBlur(rng.random((1, 8192)).astype(np.float32), (0, 0), 9.0)[0]; sig2 = (sig2 - sig2.mean()) / (sig2.std() + 1e-6)
    wob = 2.2 * np.sin(Y / (140 + 40 * rng.random(n)[k]) + ph[k]) + 0.8 * np.sin(Y / 37.0 + 2 * ph[k])
    idx = ((u * 3.1 + wob * 3 + off[k]).astype(np.int32)) % 8192
    idx2 = ((u * 1.2 + wob + off[k] * 0.7 + Y * 0.004).astype(np.int32)) % 8192
    grain = 1 + 0.16 * sig[idx] + 0.12 * sig2[idx2]
    # nudos y vetas largas (muy suaves)
    low = cv2.resize(rng.random((CH // 64 + 2, CW // 8 + 2)).astype(np.float32), (CW, CH), interpolation=cv2.INTER_CUBIC)
    grain *= 0.92 + 0.16 * low
    walnut = s2l(np.array([104, 70, 47]) / 255)                                     # nogal
    alb = walnut[None, None, :] * (tone[k] * grain)[..., None]
    alb[..., 0] *= 1 + tint[k]; alb[..., 2] *= 1 - tint[k]
    # perfil del listón: cara plana con cantos redondeados; ranura de fieltro negro
    e = np.minimum(u, slat - u)                                                      # distancia al canto
    prof = np.clip(e / 3.0, 0, 1) ** 0.5
    face = (u < slat).astype(np.float32)
    felt = s2l(np.array([17, 15, 14]) / 255)
    alb = alb * (0.55 + 0.45 * prof)[..., None] * face[..., None] + felt[None, None, :] * (1 - face)[..., None]
    # sombra del listón sobre el fieltro (la luz viene de la derecha): la ranura es más oscura junto al listón de su derecha
    gap_u = (u - slat) / (pitch - slat)
    shade = np.where(face > 0, 1.0, 0.6 + 0.4 * np.clip(gap_u * 1.2, 0, 1))
    alb *= shade[..., None]
    # brillo del canto derecho (luz desde abajo a la derecha)
    hl = np.exp(-((slat - u - 1.5) / 1.6) ** 2) * face
    return alb.astype(np.float32), hl.astype(np.float32), face.astype(np.float32)

# ---------------------------------------------------------------- letrero «kiria.ai» de letras retroiluminadas
def sign_layers(x0=46, y0=636, width=310):
    f = ImageFont.truetype(FONTS + 'Anton-Regular.woff', 200)
    parts = [('kiria', 'w'), ('.', 'r'), ('ai', 'w')]
    tw = sum(f.getlength(p) for p, _ in parts); s = width / tw
    f = ImageFont.truetype(FONTS + 'Anton-Regular.woff', int(round(200 * s)))
    face = Image.new('L', (CW, CH), 0); dot = Image.new('L', (CW, CH), 0)
    d1, d2 = ImageDraw.Draw(face), ImageDraw.Draw(dot)
    x = x0 + OX
    for p, kind in parts:
        (d2 if kind == 'r' else d1).text((x, y0 + OY), p, font=f, fill=255)
        x += f.getlength(p)
    face = np.asarray(face, np.float32) / 255; dot = np.asarray(dot, np.float32) / 255
    allm = np.maximum(face, dot)
    ys, xs = np.nonzero(allm > 0.5)
    box = (xs.min(), ys.min(), xs.max(), ys.max())
    return face, dot, allm, box

# ---------------------------------------------------------------- cuadro enmarcado
def frame_layer(art, x0=40, y0=330, w=214, h=286):
    """devuelve (rgb lineal, alfa, sombra) en el lienzo maestro."""
    a = Image.open(art).convert('RGB'); ar = a.width / a.height
    border, mat = 12, 22
    iw, ih = w - 2 * (border + mat), h - 2 * (border + mat)
    if iw / ih > ar: nh, nw = ih, int(ih * ar)
    else: nw, nh = iw, int(iw / ar)
    # recorte centrado para llenar el hueco
    tgt = iw / ih
    if ar > tgt: cw = int(a.height * tgt); a = a.crop(((a.width - cw) // 2, 0, (a.width - cw) // 2 + cw, a.height))
    else: chh = int(a.width / tgt); a = a.crop((0, (a.height - chh) // 2, a.width, (a.height - chh) // 2 + chh))
    a = a.resize((iw, ih), Image.LANCZOS)
    img = Image.new('RGB', (CW, CH), (0, 0, 0)); al = Image.new('L', (CW, CH), 0)
    d = ImageDraw.Draw(img); da = ImageDraw.Draw(al)
    X0, Y0 = x0 + OX, y0 + OY
    d.rectangle((X0, Y0, X0 + w, Y0 + h), fill=(24, 22, 21)); da.rectangle((X0, Y0, X0 + w, Y0 + h), fill=255)
    d.rectangle((X0 + border, Y0 + border, X0 + w - border, Y0 + h - border), fill=(226, 221, 211))
    img.paste(a, (X0 + border + mat, Y0 + border + mat))
    # bisel interior del paspartú
    d.rectangle((X0 + border + mat - 2, Y0 + border + mat - 2, X0 + border + mat + iw + 1, Y0 + border + mat + ih + 1), outline=(250, 247, 240), width=2)
    rgb = s2l(np.asarray(img, np.float32) / 255); alpha = np.asarray(al, np.float32) / 255
    sh = np.zeros((CH, CW), np.float32); sh[Y0 + 10:Y0 + h + 16, X0 - 10:X0 + w - 4] = 1        # sombra hacia arriba-izquierda (luz de abajo-dcha)
    sh = cv2.GaussianBlur(sh, (0, 0), 9)
    # brillo del cristal (una diagonal suave)
    X, Y = canvas_xy()
    gl = np.zeros_like(alpha)
    return rgb, alpha, sh, gl

# ---------------------------------------------------------------- máscaras y fondo limpio de cada toma
def fill_from(img, known, sigmas=(4, 8, 16, 32, 64, 128, 256)):
    """rellena lo desconocido con la media ponderada de lo conocido (de más cerca a más lejos)."""
    out = img.copy(); have = known.astype(np.float32).copy(); k = known.astype(np.float32)
    for s in sigmas:
        num = cv2.GaussianBlur(img * k[..., None], (0, 0), s); den = cv2.GaussianBlur(k, (0, 0), s)
        est = num / np.maximum(den, 1e-6)[..., None]
        use = (have < 0.5) & (den > 0.02)
        out[use] = est[use]; have[use] = 1
    return out

def clip_masks(clip):
    cache = BG + clip + '_M.npz'
    if os.path.exists(cache) and os.path.getmtime(cache) > os.path.getmtime(__file__) - 1e9 and not os.environ.get('REMASK'):
        z = np.load(cache); return {k: z[k] for k in z.files}
    M = _clip_masks(clip); np.savez(cache, **M); return M

def _clip_masks(clip):
    plate = cv2.cvtColor(cv2.imread(BG + clip + '_plate.png'), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    unseen = cv2.imread(BG + clip + '_unseen.png', 0) > 0
    # geometría: por encima de la mesa y fuera del monitor
    mon = to_clip_pts(MON, clip)
    geo = np.zeros((H, W), np.uint8)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    A = A_of(clip); Ai = cv2.invertAffineTransform(A)
    ym = Ai[1, 0] * xx + Ai[1, 1] * yy + Ai[1, 2]                     # y en la maestra
    geo[ym < DESK_Y] = 1
    cv2.fillPoly(geo, [np.round(mon).astype(np.int32)], 0)
    lum = plate.mean(2) * 255; sat = (plate.max(2) - plate.min(2)) * 255
    wallish = (lum > 92) & (sat < 42) & ~unseen
    top_force = ym < 795                                                       # por encima del monitor todo es pared (aunque esté en sombra)
    m = ((wallish | top_force) & (geo > 0)).astype(np.uint8)
    # conectado con la parte de arriba
    ff = m.copy(); seed = np.zeros((H + 2, W + 2), np.uint8); wall = np.zeros((H, W), np.uint8)
    for x in range(0, W, 24):
        for y in (3, 60, 200):
            if ff[y, x] == 1:
                cv2.floodFill(ff, seed, (x, y), 2)
    wall = (ff == 2).astype(np.uint8)
    wall = np.maximum(wall, (unseen & (geo > 0)).astype(np.uint8))
    wall = cv2.morphologyEx(wall, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    wall = cv2.morphologyEx(wall, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    # borde fino: en la franja del borde, por luminancia (pared clara / monitor oscuro)
    band = (cv2.dilate(wall, np.ones((7, 7), np.uint8)) - cv2.erode(wall, np.ones((7, 7), np.uint8))) > 0
    soft = wall.astype(np.float32)
    lb = cv2.GaussianBlur(lum, (0, 0), 0.8)
    t = np.clip((lb - 55) / (115 - 55), 0, 1); t = t * t * (3 - 2 * t)
    soft[band & ~unseen] = t[band & ~unseen] * (geo[band & ~unseen] > 0)
    soft = cv2.GaussianBlur(soft, (0, 0), 0.7)
    # fondo para descontaminar los bordes de Javi: lo que no se ve, relleno con su clase (pared con pared, lo demás con lo demás)
    seen = ~unseen
    wfill = fill_from(plate, seen & (wall > 0)); ofill = fill_from(plate, seen & (wall == 0))
    bold = plate.copy()
    bold[unseen] = np.where((wall[unseen] > 0)[..., None], wfill[unseen], ofill[unseen])
    # luz real de la pared (para iluminar la pared nueva igual): luminancia de la pared, rellena y muy suavizada
    lw = fill_from(np.repeat(lum[..., None], 3, 2) / 255, seen & (wall > 0) & (lum > 60), sigmas=(16, 48, 128, 256, 512))[..., 0]
    light = cv2.GaussianBlur(lw, (0, 0), 70)
    light = light / np.median(light[wall > 0])
    return dict(plate=plate, bold=bold, wall=soft, hard=wall, unseen=unseen, light=light.astype(np.float32), mon=mon)

# ---------------------------------------------------------------- la pared nueva de una toma
_master = {}
def master_layers():
    if _master: return _master
    alb, hl, face = slat_albedo()
    sface, sdot, sall, sbox = sign_layers()
    art = os.path.join(HERE, '..', 'robot_neuronas', 'out', 'cover', 'cover3d.png')
    frgb, fal, fsh, fgl = frame_layer(art)
    X, Y = canvas_xy()
    # luz LED detrás del monitor: sale por los bordes (tira a 6 cm del borde), color según x (rojo → violeta → azul)
    mon_c = (MON + [OX, OY]).astype(np.float32)
    led = np.zeros((CH, CW), np.float32)
    inner = mon_c.copy(); c = inner.mean(0); inner = c + (inner - c) * 0.86
    cv2.polylines(led, [np.round(inner).astype(np.int32)], True, 1.0, 26)
    ledg = cv2.GaussianBlur(led, (0, 0), 38) * 3.0 + cv2.GaussianBlur(led, (0, 0), 110) * 2.2
    tcol = np.clip((X - (-39)) / (900), 0, 1)
    ledc = kgrad(tcol) * ledg[..., None]
    # neón: un tubo que sigue el contorno de las letras (Anton), color del degradado de Kiria a lo ancho; el punto, rojo
    x0, y0, x1, y1 = sbox
    tt = np.clip((X + OX - x0) / max(1, x1 - x0), 0, 1)
    k5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    def ring(m):
        mb = (m > 0.5).astype(np.uint8)
        r = cv2.dilate(mb, k5) - cv2.erode(mb, k5)
        return cv2.GaussianBlur(r.astype(np.float32), (0, 0), 0.9)
    tube_l = ring(sface); tube_d = ring(sdot) + cv2.GaussianBlur((sdot > 0.5).astype(np.float32), (0, 0), 1.0) * 0.5
    col_l = kgrad(tt); col_d = s2l(RED)[None, None, :]
    tubec = col_l * tube_l[..., None] + col_d * np.clip(tube_d, 0, 1)[..., None]                 # color del tubo
    tube = np.clip(tube_l + tube_d, 0, 1)
    def glow(img, ss, ws): return sum(cv2.GaussianBlur(img, (0, 0), s_) * w_ for s_, w_ in zip(ss, ws))
    haloc = glow(tubec, (9, 30, 85), (2.2, 2.2, 1.5))                                             # la luz del neón en la pared
    bloom = glow(tubec, (3, 10, 28), (0.9, 0.55, 0.25))                                           # el resplandor en el aire
    edge = np.zeros_like(sall)
    _master.update(alb=alb, hl=hl, face=face, sface=sface, sdot=sdot, sall=sall, edge=edge, tube=tube, tubec=tubec.astype(np.float32), bloom=bloom.astype(np.float32), frgb=frgb, fal=fal, fsh=fsh, fgl=fgl,
                   ledc=ledc.astype(np.float32), haloc=haloc.astype(np.float32))
    return _master

def wall_for(clip, M, head=None, expo=1.0):
    """pared nueva (RGB lineal) de la toma, ya iluminada; head = (x, y) de la cabeza para la luz de separación."""
    L = master_layers()
    alb = warp(L['alb'], clip); hl = warp(L['hl'], clip)
    fal = warp(L['fal'], clip)[..., None]; frgb = warp(L['frgb'], clip); fsh = warp(L['fsh'], clip)[..., None]; fgl = warp(L['fgl'], clip)[..., None]
    ledc = warp(L['ledc'], clip); haloc = warp(L['haloc'], clip)
    light = M['light'][..., None]
    amb = 0.55 * np.power(np.clip(light, 0.3, 3), 1.6)                         # la luz de la habitación (más abajo-dcha)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    pool = np.zeros((H, W), np.float32)
    if head is not None:                                                       # luz cálida de fondo detrás de la cabeza
        hx, hy = head
        pool = np.exp(-(((xx - hx) / 330) ** 2 + ((yy - hy + 40) / 420) ** 2)) * 1.1
    warm = s2l(np.array([255, 214, 170]) / 255)
    lightrgb = amb + pool[..., None] * warm + ledc * 1.0 + haloc * 0.9
    wall = alb * lightrgb * (1 - 0.55 * fsh) + hl[..., None] * alb * lightrgb * 1.4
    # cuadro (iluminado por la misma luz) y su cristal
    wall = wall * (1 - fal) + frgb * (amb * 0.9 + pool[..., None] * warm * 0.6 + ledc * 0.25 + haloc * 0.3) * fal + fgl * 0.6
    # neón: núcleo casi blanco (muy brillante) teñido de su color, y su resplandor
    tube = warp(L['tube'], clip)[..., None]; tubec = warp(L['tubec'], clip); bloom = warp(L['bloom'], clip)
    core = tubec * 0.55 + tube * 0.45
    wall = wall * (1 - tube * 0.9) + core * 4.0 + bloom * 0.9
    return (wall * expo).astype(np.float32)

def tonemap(x):
    """lineal → sRGB con un hombro suave (para que el letrero y el LED no se quemen en plano)."""
    y = x / (1 + 0.18 * x)
    return np.clip(l2s(y * 1.12), 0, 1)

def background(clip, head=None, blur=2.6):
    """fondo completo de la toma (sRGB 0-1): pared nueva + monitor/mesa reales; con desenfoque. Devuelve también las máscaras."""
    M = clip_masks(clip)
    wl = wall_for(clip, M, head)
    wall = tonemap(wl)
    m = M['wall'][..., None]
    bg = wall * m + M['bold'] * (1 - m)
    if blur > 0:
        bg = cv2.GaussianBlur(bg, (0, 0), blur)
    return bg.astype(np.float32), M

# ---------------------------------------------------------------- composición de un fotograma
def composite(frame, alpha, bg, M, wrap=0.22):
    """frame: RGB 0-1 de la grabación; alpha: 0-1 (persona). Devuelve RGB 0-1."""
    a = alpha[..., None]
    ac = np.clip(a, 0.12, 1)
    F = np.clip((frame - (1 - a) * M['bold']) / ac, 0, 1)                       # persona sin el gris de la pared vieja
    F = np.where(a > 0.12, F, frame)
    out = F * a + bg * (1 - a)
    if wrap > 0:                                                               # «light wrap»: el fondo se asoma un poco en el borde
        er = cv2.erode(alpha, np.ones((7, 7), np.uint8))
        rim = np.clip(alpha - er, 0, 1)[..., None]
        out = out * (1 - rim * wrap) + cv2.GaussianBlur(bg, (0, 0), 6) * rim * wrap
    return out

def head_pos(clip):
    """posición media de la cabeza (lo más alto de la silueta) en la toma."""
    import subprocess
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', WORK + clip + '_alpha.mkv', '-vf', 'fps=2', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
                         capture_output=True).stdout
    al = np.frombuffer(raw, np.uint8).reshape(-1, H, W)
    pts = []
    for a in al[: max(1, len(al) - 3)]:
        rows = np.nonzero((a > 128).sum(1) > 30)[0]
        if len(rows) == 0: continue
        top = rows[0]; band = a[top:top + 260] > 128
        xs = np.nonzero(band.any(0))[0]
        pts.append(((xs.min() + xs.max()) / 2, top + 150))
    return tuple(np.median(np.array(pts), 0)) if pts else (W / 2, H / 3)

if __name__ == '__main__':
    import subprocess
    clips = sys.argv[1:] or CLIPS
    outs = []
    for clip in clips:
        hp = head_pos(clip)
        bg, M = background(clip, hp)
        t = {'c8707c': 3.0}.get(clip, 3.0)
        fr = subprocess.run(['ffmpeg', '-v', 'quiet', '-ss', str(t), '-i', WORK + clip + '.mov', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                            capture_output=True).stdout
        al = subprocess.run(['ffmpeg', '-v', 'quiet', '-ss', str(t), '-i', WORK + clip + '_alpha.mkv', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
                            capture_output=True).stdout
        f = np.frombuffer(fr, np.uint8).reshape(H, W, 3).astype(np.float32) / 255
        a = np.frombuffer(al, np.uint8).reshape(H, W).astype(np.float32) / 255
        out = composite(f, a, bg, M)
        cv2.imwrite(BG + clip + '_test.jpg', cv2.cvtColor((out * 255).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 92])
        cv2.imwrite(BG + clip + '_bgnew.jpg', cv2.cvtColor((bg * 255).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 92])
        print(clip, 'cabeza', [int(v) for v in hp], flush=True)
