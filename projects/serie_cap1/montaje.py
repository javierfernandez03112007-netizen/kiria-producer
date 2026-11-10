"""Serie «Reto: 10 clientes en 30 días» · capítulo 1 · montaje.

Capas de cada fotograma (de atrás a delante):
  1. fondo de la toma (pared nueva de `fondo.py`; en la primera toma, la pared que se rompe, de `web3d/`)
  2. capa «detrás» (subtítulos grandes detrás de la cabeza, títulos)           ← overlay/behind/fNNNNN.png
  3. Javi (recortado con RVM, bordes descontaminados, con su color)
  4. cristal (desenfoque debajo de cada tarjeta) + capa «delante» (tarjetas)   ← overlay/front/fNNNNN.png + overlay/glass.json
  5. grano, viñeta
Encuadre: cada toma con su zoom (empujes lentos y «punch-ins» en los cortes); el zoom se aplica al fondo y a Javi; los textos
van en coordenadas de pantalla.

Uso: python3 montaje.py [preview|final] [desde_s hasta_s]
"""
import os, sys, json, subprocess, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fondo

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = fondo.WORK
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1920
FPS = 60
SRC_FPS = 60000 / 1001
SPEED = 1.06                                                    # un 6 % más rápido (ritmo)

# toma, inicio, fin (segundos de la grabación), zoom al empezar → al acabar, centro del zoom (x, y) en la toma
SEGS = [
    dict(clip='a8695', a=0.68, b=8.93, z=(1.00, 1.07)),                       # gancho: 3,7M rompiendo la pared
    dict(clip='c8707b', a=0.52, b=7.37, z=(1.00, 1.05)),                      # Kiria como herramienta (una sola toma en 3 trozos)
    dict(clip='c8707a', a=0.00, b=8.96, z=(1.18, 1.22)),
    dict(clip='c8707c', a=0.00, b=8.12, z=(1.02, 1.07)),
    dict(clip='a8699', a=0.84, b=9.85, z=(1.16, 1.20)),                       # el reto (penúltimo, con el de los jueves)
    dict(clip='d8709', a=0.12, b=10.61, z=(1.12, 1.18), punch=[(5.80, 1.30)]),
    dict(clip='e8712', a=0.36, b=5.46, z=(1.00, 1.04)),                       # el descuento (último)
]
END_HOLD = 1.6                                                  # cierre (tarjeta final) después de la última palabra

def timeline():
    t = 0.0
    for s in SEGS:
        s['T0'] = t; s['dur'] = (s['b'] - s['a']) / SPEED; t += s['dur']
    return t + END_HOLD

def seg_at(t):
    for s in SEGS:
        if t < s['T0'] + s['dur']: return s
    return SEGS[-1]

# ---------------------------------------------------------------- lectura de la grabación y del recorte
class Reader:
    def __init__(self, path, gray=False):
        self.gray = gray; self.n = -1; self.cur = None
        self.p = subprocess.Popen(['ffmpeg', '-v', 'quiet', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'gray' if gray else 'rgb24', '-'],
                                  stdout=subprocess.PIPE, bufsize=W * H * 3 * 4)
        self.size = W * H * (1 if gray else 3)
    def get(self, n):
        while self.n < n:
            buf = self.p.stdout.read(self.size)
            if len(buf) < self.size: break
            self.cur = np.frombuffer(buf, np.uint8).reshape((H, W) if self.gray else (H, W, 3)); self.n += 1
        return self.cur
    def close(self):
        try: self.p.kill()
        except Exception: pass

# ---------------------------------------------------------------- color
def grade_person(x):
    """Javi: un poco más de contraste, piel cálida y algo más de color."""
    l = x.mean(2, keepdims=True)
    x = l + (x - l) * 1.07
    x = (x - 0.46) * 1.07 + 0.46
    x = x * np.array([1.025, 1.0, 0.965], np.float32)
    return np.clip(x, 0, 1)

def sharpen(x, amt=0.28, s=1.1):
    return np.clip(x + (x - cv2.GaussianBlur(x, (0, 0), s)) * amt, 0, 1)

_vig = None
def finish(x, f):
    """viñeta suave + grano fino (igual en todo el vídeo)."""
    global _vig
    if _vig is None:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r2 = ((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H * 0.46) / (H * 0.62)) ** 2
        _vig = (1 - 0.30 * np.clip(r2, 0, 1.6) ** 1.3)[..., None].astype(np.float32)
    rng = np.random.default_rng(f)
    g = rng.standard_normal((H // 2, W // 2)).astype(np.float32)
    g = cv2.resize(g, (W, H), interpolation=cv2.INTER_LINEAR)[..., None] * 0.011
    return np.clip(x * _vig + g, 0, 1)

def zoom_at(s, tl):
    """zoom de la toma s a los tl segundos (del vídeo) desde su comienzo: empuje lento + «punch-ins»."""
    z0, z1 = s['z']; u = min(1, max(0, tl / max(1e-6, s['dur'])))
    z = z0 + (z1 - z0) * (u * u * (3 - 2 * u))
    ts = s['a'] + tl * SPEED
    for tp, zp in s.get('punch', []):
        if ts >= tp: z = zp + (z1 - z0) * 0.3 * u
    if SEGS.index(s) > 0 and tl < 0.24:                         # «punch» al entrar en cada toma: empieza un 7 % más cerca y se asienta
        u2 = tl / 0.24; z *= 1 + 0.07 * (1 - u2 * u2 * (3 - 2 * u2))
    hp = head_of(s['clip'])
    return z, hp[0], hp[1] + 120

_heads = None
def head_of(clip):
    global _heads
    if _heads is None:
        p = os.path.join(fondo.BG, 'heads.json'); _heads = json.load(open(p)) if os.path.exists(p) else {}
    if clip not in _heads:
        _heads[clip] = [float(v) for v in fondo.head_pos(clip)]
        json.dump(_heads, open(os.path.join(fondo.BG, 'heads.json'), 'w'))
    return _heads[clip]

def zoom_mat(z, cx, cy):
    """escala z alrededor de (cx, cy) llevándolo al mismo sitio de la pantalla, sin salirse del cuadro."""
    tx = cx - z * cx; ty = cy - z * cy
    tx = min(0, max(W - z * W, tx)); ty = min(0, max(H - z * H, ty))
    return np.float32([[z, 0, tx], [0, z, ty]])

# ---------------------------------------------------------------- fondos por toma (en caché)
_bg = {}
def bg_of(clip):
    if clip in _bg: return _bg[clip]
    f = fondo.BG + clip + '_bgfinal.npy'
    hp = fondo.head_pos(clip)
    if os.path.exists(f) and os.path.getmtime(f) > os.path.getmtime(fondo.__file__):
        bg = np.load(f).astype(np.float32); M = fondo.clip_masks(clip)
    else:
        bg, M = fondo.background(clip, hp); np.save(f, bg.astype(np.float16))
    _bg[clip] = (bg, M, hp)
    return _bg[clip]

# ---------------------------------------------------------------- capas de texto y tarjetas
OV = os.path.join(WORK, 'overlay')
_glass = None
def overlay(kind, f):
    p = os.path.join(OV, kind, 'f%05d.png' % f)
    if not os.path.exists(p): return None
    im = cv2.imread(p, cv2.IMREAD_UNCHANGED)
    if im is None: return None
    if im.shape[0] != H: im = cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA)
    rgb = cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2RGB).astype(np.float32) / 255; a = im[..., 3:4].astype(np.float32) / 255
    return rgb, a

def glass_rects(f):
    global _glass
    if _glass is None:
        _glass = {}
        for p in sorted(os.listdir(OV)) if os.path.isdir(OV) else []:
            if p.startswith('glass') and p.endswith('.json'): _glass.update(json.load(open(os.path.join(OV, p))))
    return _glass.get(str(f), [])

def glass_mask(rects):
    m = np.zeros((H, W), np.float32)
    for r in rects:
        x, y, w, h, rad, op = r['x'], r['y'], r['w'], r['h'], r.get('r', 30), r.get('o', 1.0)
        S = 2
        mm = np.zeros((int(h * S) + 4, int(w * S) + 4), np.uint8)
        rr = int(min(rad, w / 2, h / 2) * S)
        cv2.rectangle(mm, (rr, 0), (int(w * S) - rr, int(h * S)), 255, -1); cv2.rectangle(mm, (0, rr), (int(w * S), int(h * S) - rr), 255, -1)
        for cx, cy in [(rr, rr), (int(w * S) - rr, rr), (rr, int(h * S) - rr), (int(w * S) - rr, int(h * S) - rr)]:
            cv2.circle(mm, (cx, cy), rr, 255, -1, lineType=cv2.LINE_AA)
        mm = cv2.resize(mm, (max(1, int(round(w))), max(1, int(round(h)))), interpolation=cv2.INTER_AREA).astype(np.float32) / 255 * op
        x0, y0 = int(round(x)), int(round(y)); x1, y1 = x0 + mm.shape[1], y0 + mm.shape[0]
        sx0, sy0 = max(0, -x0), max(0, -y0); x0c, y0c = max(0, x0), max(0, y0); x1c, y1c = min(W, x1), min(H, y1)
        if x1c <= x0c or y1c <= y0c: continue
        m[y0c:y1c, x0c:x1c] = np.maximum(m[y0c:y1c, x0c:x1c], mm[sy0:sy0 + (y1c - y0c), sx0:sx0 + (x1c - x0c)])
    return m

# ---------------------------------------------------------------- la pared que se rompe (primera toma), de web3d/
P3D = os.environ.get('P3D', os.path.join(WORK, 'pared3d'))
def _rgba(p):
    if not os.path.exists(p): return None
    im = cv2.imread(p, cv2.IMREAD_UNCHANGED)
    if im is None: return None
    return cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2RGB).astype(np.float32) / 255, im[..., 3].astype(np.float32) / 255

def pared3d(f, clip, bg, blur=2.6):
    if clip != 'a8695': return None
    b = _rgba(os.path.join(P3D, 'bg', 'f%05d.png' % f))
    if b is None: return None
    rgb, a = b
    P = cv2.GaussianBlur(rgb * a[..., None], (0, 0), blur); A = cv2.GaussianBlur(a, (0, 0), blur)[..., None]
    return P + bg * (1 - A)

def numero3d(f, clip):
    """el «3,6M» (capa aparte: va delante de Javi, que está a su lado)."""
    if clip != 'a8695': return None
    p = os.path.join(P3D, 'num', 'f%05d.png' % f)
    return _rgba(p) if os.path.exists(p) else None

def shake(f):
    """pequeña sacudida de la cámara en los golpes y en el reventón (solo en la primera toma)."""
    ts = SEGS[0]['a'] + f / FPS * SPEED
    dx = dy = 0.0
    for t0, amp in [(0.62, 6), (1.56, 8), (2.36, 16)]:
        d = ts - t0
        if 0 <= d < 0.5:
            k = amp * np.exp(-d * 9)
            dx += k * np.sin(d * 71 + t0 * 10); dy += k * np.cos(d * 59 + t0 * 7)
    return dx, dy

# ---------------------------------------------------------------- un fotograma
def frame_at(f, readers, fx=None):
    t = f / FPS
    s = seg_at(t)
    clip = s['clip']
    bg, M, hp = bg_of(clip)
    if t >= s['T0'] + s['dur']:                                  # cierre: el último fotograma de la última toma, quieto
        tl = s['dur'] - 1e-3
    else:
        tl = t - s['T0']
    ts = s['a'] + tl * SPEED
    n = int(round(ts * SRC_FPS))
    fr = readers[clip][0].get(n); al = readers[clip][1].get(n)
    frame = fr.astype(np.float32) / 255; alpha = al.astype(np.float32) / 255
    # fondo: la pared rota en la primera toma (si está renderizada)
    bgx = pared3d(f, clip, bg)
    if bgx is not None: bg = bgx
    # Javi: descontaminado y con su color
    a = alpha[..., None]
    ac = np.clip(a, 0.12, 1)
    F = np.clip((frame - (1 - a) * M['bold']) / ac, 0, 1)
    F = np.where(a > 0.12, F, frame)
    F = sharpen(grade_person(F))
    # zoom
    z, cx, cy = zoom_at(s, tl)
    Mz = zoom_mat(z, cx, cy)
    if clip == 'a8695':
        dx, dy = shake(f); Mz = Mz.copy(); Mz[0, 2] += dx; Mz[1, 2] += dy
        Mz[0, 2] = min(0, max(W - Mz[0, 0] * W, Mz[0, 2])); Mz[1, 2] = min(0, max(H - Mz[1, 1] * H, Mz[1, 2]))
    warp = lambda img, interp=cv2.INTER_CUBIC: cv2.warpAffine(img, Mz, (W, H), flags=interp, borderMode=cv2.BORDER_REFLECT)
    bgz = warp(bg, cv2.INTER_LINEAR); Fz = warp(F); az = warp(alpha, cv2.INTER_LINEAR)[..., None]
    # capa de detrás (entre el fondo y Javi)
    beh = overlay('behind', f)
    if beh is not None:
        bgz = bgz * (1 - beh[1]) + beh[0] * beh[1]
    out = Fz * az + bgz * (1 - az)
    # «light wrap»
    er = cv2.erode(az[..., 0], np.ones((7, 7), np.uint8)); rim = np.clip(az[..., 0] - er, 0, 1)[..., None]
    out = out * (1 - rim * 0.22) + cv2.GaussianBlur(bgz, (0, 0), 6) * rim * 0.22
    # el número 3D, delante de Javi (con el mismo encuadre)
    nm = numero3d(f, clip)
    if nm is not None:
        na = warp(nm[1], cv2.INTER_LINEAR)[..., None]; nc = warp(nm[0])
        out = out * (1 - na) + nc * na
    # cristal + tarjetas
    rects = glass_rects(f)
    if rects:
        gm2 = glass_mask(rects)
        if gm2.max() > 0:
            gm = gm2[..., None]
            blur = cv2.GaussianBlur(out, (0, 0), 22)
            sh = cv2.GaussianBlur(np.roll(gm2, 18, 0), (0, 0), 26)[..., None] * 0.45              # sombra de la tarjeta
            out = out * (1 - sh * (1 - gm))
            out = out * (1 - gm) + (blur * 0.78 + 0.035) * gm
    if t >= SEGS[-1]['T0'] + SEGS[-1]['dur']:                   # cierre: la imagen se desenfoca y oscurece detrás de la tarjeta final
        k = min(1, (t - SEGS[-1]['T0'] - SEGS[-1]['dur']) / 0.45); k = k * k * (3 - 2 * k)
        out = out * (1 - k) + cv2.GaussianBlur(out, (0, 0), 1 + 24 * k) * (1 - 0.45 * k) * k
    fro = overlay('front', f)
    if fro is not None:
        out = out * (1 - fro[1]) + fro[0] * fro[1]
    return finish(out, f)

# ---------------------------------------------------------------- audio
def build_audio(path):
    """voz: los trozos de cada toma (a velocidad SPEED), limpia y a −15 LUFS."""
    parts = []; fl = []
    for i, s in enumerate(SEGS):
        fl.append(f"[{i}:a]atrim={s['a']}:{s['b']},asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:d=0.012,afade=t=out:st={s['b']-s['a']-0.015:.3f}:d=0.015[s{i}]")
        parts += ['-i', os.path.join(WORK, s['clip'] + '.mov')]
    n = len(SEGS)
    fl.append(''.join(f'[s{i}]' for i in range(n)) + f'concat=n={n}:v=0:a=1[cat]')
    fl.append(f"[cat]rubberband=tempo={SPEED}:pitch=1.0:formant=preserved,highpass=f=75,lowpass=f=15000,"
              f"equalizer=f=180:t=q:w=1:g=-1.5,equalizer=f=3800:t=q:w=1.2:g=2,deesser=i=0.35,"
              f"acompressor=threshold=-21dB:ratio=3:attack=8:release=120:makeup=3dB,apad=pad_dur={END_HOLD}[v]")
    tmp = path + '.tmp.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *parts, '-filter_complex', ';'.join(fl), '-map', '[v]', '-ac', '1', '-ar', '48000', tmp], check=True)
    # normalizar a −15 LUFS (dos pasadas)
    r = subprocess.run(['ffmpeg', '-v', 'info', '-i', tmp, '-af', 'loudnorm=I=-15:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    js = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af',
                    f"loudnorm=I=-15:TP=-1.5:LRA=9:measured_I={js['input_i']}:measured_TP={js['input_tp']}:measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true",
                    '-ar', '48000', path], check=True)
    os.remove(tmp)

def mix_audio(path):
    """voz (−15 LUFS) + efectos → pista final (estéreo, con limitador)."""
    voice = os.path.join(OUT, 'voz.wav'); sfxp = os.path.join(OUT, 'sfx.wav')
    if not os.path.exists(voice) or os.environ.get('AUDIO'): build_audio(voice)
    subprocess.run([sys.executable, os.path.join(HERE, 'sonido.py')], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', voice, '-i', sfxp, '-filter_complex',
                    '[0:a]aformat=channel_layouts=stereo,apad[v];[1:a]volume=0.8,aformat=channel_layouts=stereo[s];'
                    '[v][s]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89:level=false[a]',
                    '-map', '[a]', '-t', '%.3f' % timeline(), '-ar', '48000', path], check=True)

def render(mode, f0, f1, name):
    step = 2 if mode == 'preview' else 1
    scale = 0.5 if mode == 'preview' else 1.0
    ow, oh = int(W * scale), int(H * scale)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{ow}x{oh}', '-r', str(FPS // step), '-i', '-',
                            '-c:v', 'libx264', '-preset', 'medium' if mode == 'preview' else 'slow', '-crf', '20' if mode == 'preview' else '14',
                            '-pix_fmt', 'yuv420p', '-g', '120', name], stdin=subprocess.PIPE)
    readers = {}
    import time; t0 = time.time()
    for f in range(f0, f1, step):
        s = seg_at(f / FPS); c = s['clip']
        if c not in readers:
            for k in list(readers): readers[k][0].close(); readers[k][1].close(); del readers[k]
            readers[c] = (Reader(os.path.join(WORK, c + '.mov')), Reader(os.path.join(WORK, c + '_alpha.mkv'), gray=True))
        out = frame_at(f, readers)
        if scale != 1: out = cv2.resize(out, (ow, oh), interpolation=cv2.INTER_AREA)
        enc.stdin.write((out * 255 + 0.5).astype(np.uint8).tobytes())
        if f % 120 == 0: print('  f %d  (%.1f s)' % (f, time.time() - t0), flush=True)
    enc.stdin.close(); enc.wait()
    for k in readers: readers[k][0].close(); readers[k][1].close()
    print('listo', name, '%.0f s' % (time.time() - t0), flush=True)

def main():
    """preview | final [f0 f1] (un trozo, sin sonido) | junta N (une los trozos y pone el sonido)"""
    mode = sys.argv[1] if len(sys.argv) > 1 else 'preview'
    total = timeline(); nfr = int(round(total * FPS))
    print('duración %.2f s, %d fotogramas' % (total, nfr), flush=True)
    if mode == 'junta':
        parts = sorted(p for p in os.listdir(OUT) if p.startswith('trozo_'))
        lst = os.path.join(OUT, 'trozos.txt'); open(lst, 'w').write(''.join(f"file '{os.path.join(OUT, p)}'\n" for p in parts))
        audio = os.path.join(OUT, 'audio_final.wav'); mix_audio(audio)
        dst = os.path.join(OUT, 'serie_cap1.mp4')
        # se unen descodificando (el «concat» sin recodificar perdía 2 fotogramas en cada unión) y se codifica una sola vez para entregar
        ins = []
        for p in parts: ins += ['-i', os.path.join(OUT, p)]
        n = len(parts)
        fc = ''.join(f'[{i}:v]' for i in range(n)) + f'concat=n={n}:v=1:a=0[v]'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-i', audio, '-filter_complex', fc, '-map', '[v]', '-map', f'{n}:a',
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-maxrate', '14M', '-bufsize', '28M', '-profile:v', 'high',
                        '-pix_fmt', 'yuv420p', '-r', str(FPS), '-g', '120', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
                        '-movflags', '+faststart', dst], check=True)
        print('listo', dst); return
    if len(sys.argv) > 3:
        f0, f1 = int(sys.argv[2]), min(nfr, int(sys.argv[3]))
        render(mode, f0, f1, os.path.join(OUT, 'trozo_%05d.mp4' % f0)); return
    name = os.path.join(OUT, f'serie_cap1_{mode}.mp4')
    tmp = name + '.v.mp4'
    render(mode, 0, nfr, tmp)
    audio = os.path.join(OUT, 'audio_final.wav'); mix_audio(audio)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                    '-shortest', '-movflags', '+faststart', name], check=True)
    os.remove(tmp); print('listo', name)

if __name__ == '__main__':
    main()
