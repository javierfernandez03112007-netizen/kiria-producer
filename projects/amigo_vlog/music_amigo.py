"""Música original y efectos para el vídeo de la maratón (sintetizado aquí: sin derechos de autor de terceros).
A (narración, 76 ppm): colchón y piano en La menor (Am–F–C–G), bajo suave; subida de tensión desde «Y hoy» (ruido que sube,
redoble que acelera, latidos) hasta «destino»; silencio; B (drop, 128 ppm): bombo, palmas, charles, bajo y acordes que bombean;
en la medalla a cámara lenta, un respiro (sin bombo) con acorde grande y platillo; final con golpe y cola."""
import numpy as np

SR = 44100


def m2f(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(d):
    return np.arange(int(d * SR)) / SR


def fft_filter(x, lo=None, hi=None, order=2):
    """Filtro suave por FFT (paso alto en `lo`, paso bajo en `hi`), sobre señal mono o estéreo."""
    mono = x.ndim == 1
    X = np.fft.rfft(x if not mono else x[:, None], axis=0)
    f = np.fft.rfftfreq(len(x), 1 / SR)[:, None]
    g = np.ones_like(f)
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    y = np.fft.irfft(X * g, n=len(x), axis=0)
    return y[:, 0] if mono else y


def highpass(x, fc, sr=SR):
    return fft_filter(x, lo=fc).astype(np.float32)


def envelope(x, sr=SR, win=0.03):
    m = np.abs(x).mean(axis=1) if x.ndim == 2 else np.abs(x)
    k = max(1, int(win * sr))
    c = np.cumsum(np.concatenate([[0], m]))
    e = (c[k:] - c[:-k]) / k
    return np.concatenate([e, np.full(len(m) - len(e), e[-1] if len(e) else 0)])


def compress(x, sr=SR, thresh=0.12, ratio=3.0):
    e = envelope(x, sr, 0.02) + 1e-6
    g = np.where(e > thresh, (thresh + (e - thresh) / ratio) / e, 1.0)
    k = int(0.01 * sr)
    c = np.cumsum(np.concatenate([[0], g]))
    gs = np.concatenate([(c[k:] - c[:-k]) / k, np.full(k, g[-1])])[:len(g)]
    y = x * gs[:, None]
    return (y / max(1e-6, np.abs(y).max()) * 0.9).astype(np.float32)


def put(out, x, t0, g=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= len(out) or g == 0:
        return
    x = np.asarray(x, np.float32)
    if x.ndim == 1:
        x = np.stack([x * (1 - max(0, pan)), x * (1 + min(0, pan))], 1)
    j = min(len(out), i + len(x))
    if i < 0:
        x, i = x[-i:], 0
    out[i:j] += x[:j - i] * g


# ---------------------------------------------------------------- instrumentos
def saw(f, d, nh=12, det=0.0):
    t = tt(d)
    y = np.zeros_like(t)
    for k in range(1, nh + 1):
        if f * k > 9000:
            break
        y += np.sin(2 * np.pi * f * k * (1 + det) * t + k * 0.7) / k ** 1.25
    return y


def pad_chord(notes, d, att=0.7, rel=0.9):
    t = tt(d)
    y = np.zeros((len(t), 2))
    for j, m in enumerate(notes):
        for dt, pn in [(-0.0016, -0.6), (0.0, 0.0), (0.0019, 0.6)]:
            v = saw(m2f(m), d, 10, dt) * 0.18
            y[:, 0] += v * (1 - max(0, pn))
            y[:, 1] += v * (1 + min(0, pn))
    env = np.minimum(1, t / att) * np.minimum(1, np.maximum(0, (d - t) / rel))
    return y * env[:, None]


def piano(m, d=1.6, vel=1.0):
    t = tt(d)
    f = m2f(m)
    y = sum(np.sin(2 * np.pi * f * k * (1 + 0.0007 * k * k) * t) * np.exp(-t * (1.6 + 1.1 * k)) / k ** 1.4 for k in range(1, 7))
    y *= np.minimum(1, t / 0.004) * vel
    return y * 0.5


def kick(d=0.45):
    t = tt(d)
    f = 45 + 95 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t * 7.5) + np.random.default_rng(1).standard_normal(len(t)) * np.exp(-t * 300) * 0.25) * 0.95


def clap(d=0.25, seed=2):
    t = tt(d)
    w = np.random.default_rng(seed).standard_normal(len(t))
    w = fft_filter(w, lo=900, hi=6000)
    env = np.exp(-t * 22) * (1 + 0.6 * (np.sin(t * 2 * np.pi * 90) > 0) * (t < 0.03))
    return w * env * 0.6


def hat(d=0.06, seed=3, open_=False):
    t = tt(0.22 if open_ else d)
    w = np.random.default_rng(seed).standard_normal(len(t))
    w = fft_filter(w, lo=7000)
    return w * np.exp(-t * (14 if open_ else 70)) * (0.35 if open_ else 0.25)


def snare(seed=4):
    t = tt(0.18)
    w = fft_filter(np.random.default_rng(seed).standard_normal(len(t)), lo=1500, hi=8000)
    return (w * 0.7 + np.sin(2 * np.pi * 190 * t) * 0.4) * np.exp(-t * 26)


def boom(d=1.4, f0=55):
    t = tt(d)
    f = f0 + 70 * np.exp(-t * 9)
    ph = 2 * np.pi * np.cumsum(f) / SR
    w = fft_filter(np.random.default_rng(5).standard_normal(len(t)), hi=900)
    return (np.sin(ph) * np.exp(-t * 2.4) + w * np.exp(-t * 9) * 0.35) * 0.9


def crash(d=2.2, seed=6):
    t = tt(d)
    w = fft_filter(np.random.default_rng(seed).standard_normal(len(t)), lo=3500)
    return w * np.exp(-t * 2.2) * 0.32


def whoosh(d=0.5, seed=7, up=True):
    t = tt(d)
    w = np.random.default_rng(seed).standard_normal(len(t))
    out = np.zeros_like(w)
    n = 8
    edges = np.linspace(0, len(w), n + 1).astype(int)
    for k in range(n):                             # filtro que se abre por tramos (barrido)
        fc = 400 * (8 ** (k / (n - 1) if up else 1 - k / (n - 1)))
        seg = fft_filter(w[edges[k]:edges[k + 1]], lo=fc * 0.5, hi=fc * 2.5)
        out[edges[k]:edges[k + 1]] = seg
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return out * env * 0.6


def riser(d):
    t = tt(d)
    w = np.random.default_rng(8).standard_normal(len(t))
    out = np.zeros_like(w)
    n = 24
    edges = np.linspace(0, len(w), n + 1).astype(int)
    for k in range(n):
        fc = 300 * (20 ** (k / (n - 1)))
        out[edges[k]:edges[k + 1]] = fft_filter(w[edges[k]:edges[k + 1]], lo=fc * 0.6, hi=fc * 2.0)
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2.2 * t / d)) / SR) * 0.25
    return (out * 0.45 + tone) * (t / d) ** 2


def shimmer(d=1.0, seed=9):
    t = tt(d)
    y = sum(np.sin(2 * np.pi * f * t + p) for f, p in [(1760, 0), (2217, 1), (2637, 2), (3520, 3)]) / 4
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 11 * t)
    return y * am * np.sin(np.pi * np.clip(t / d, 0, 1)) * 0.18


def clink():
    t = tt(1.2)
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * dcy) * a for f, dcy, a in [(2350, 4, 1), (3420, 6, 0.6), (5110, 9, 0.4), (6900, 12, 0.25)]) * 0.25


def reverb(x, decay=1.4, mix=0.25):
    n = int(decay * 2.2 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(10)
    ir = rng.standard_normal((n, 2)) * np.exp(-t * 6.9 / decay)[:, None]
    ir[:int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    L = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, L, axis=0) * np.fft.rfft(ir, L, axis=0), L, axis=0)[:len(x)]
    return x * (1 - mix) + y * mix * 1.6


CHORDS = {"Am": [57, 60, 64], "F": [53, 57, 60], "C": [55, 60, 64], "G": [55, 59, 62]}
ROOT = {"Am": 45, "F": 41, "C": 48, "G": 43}
PROG = ["Am", "F", "C", "G"]


def music_track(n, mk):
    out = np.zeros((n, 2), np.float32)
    A0, DROP, DEST, HOY, END = mk["teaser"], mk["drop"], mk["destino"], mk["hoy"], mk["dur"]
    # ---- A: colchón + piano (76 ppm) desde el final del avance hasta «destino»
    beat = 60 / 76
    bar = beat * 4
    t = A0
    b = 0
    while t < DEST - 0.05:
        ch = PROG[b % 4]
        d = min(bar + 0.9, DEST - t + 0.4)
        put(out, pad_chord(CHORDS[ch], d), t, 0.55)
        put(out, np.sin(2 * np.pi * m2f(ROOT[ch]) * tt(d)) * np.minimum(1, tt(d) / 0.3) * np.minimum(1, (d - tt(d)) / 0.4) * 0.22, t, 1.0)
        pat = [0, 1, 2, 1, 0, 2, 1, 2]
        for j in range(8):
            tn = t + j * beat / 2
            if tn >= DEST - 0.1:
                break
            m = CHORDS[ch][pat[j]] + 12 + (12 if j == 5 else 0)
            put(out, piano(m, 1.4, 0.75 if j % 2 else 1.0), tn, 0.5, pan=0.25 * np.sin(j))
        t += bar
        b += 1
    # «ya has ganado»: pequeño respiro con platillo al revés
    g = mk["ganado"]
    if g:
        put(out, crash(1.2)[::-1] * 0.6, g - 1.2, 0.8)
    # ---- subida de tensión desde «Y hoy»: ruido que sube, redoble que acelera y latidos
    if HOY and HOY < DEST:
        put(out, riser(DEST - HOY + 0.05), HOY, 0.9)
        tr = HOY
        k = 0
        while tr < DEST - 0.02:
            gap = 0.32 * (1 - (tr - HOY) / (DEST - HOY)) + 0.06
            put(out, snare(20 + k) * (0.25 + 0.6 * (tr - HOY) / (DEST - HOY)), tr, 0.55)
            tr += gap
            k += 1
        th = HOY
        while th < DEST - 0.1:
            put(out, kick(0.3) * 0.7, th, 0.55)
            put(out, kick(0.3) * 0.45, th + 0.22, 0.55)
            th += 0.75 - 0.3 * (th - HOY) / (DEST - HOY)
    put(out, boom(1.0, 60), DEST, 0.7)          # «destino»: golpe… y silencio hasta el drop
    # ---- B: drop a 128 ppm hasta el final, con respiro en la medalla a cámara lenta
    bt = 60 / 128
    nb = int((END - DROP) / bt) + 2
    S0, S1 = mk["slow0"], mk["slow1"]
    side = np.ones(n, np.float32)
    for j in range(nb):
        tb = DROP + j * bt
        if tb > END - 0.1:
            break
        brk = S0 - 0.05 <= tb < S1
        if not brk:
            put(out, kick(), tb, 0.95)
            i = int(tb * SR)
            L = int(0.32 * SR)
            if i < n:
                pump = 0.35 + 0.65 * np.clip(np.arange(min(L, n - i)) / L, 0, 1) ** 0.6
                side[i:i + len(pump)] = np.minimum(side[i:i + len(pump)], pump)
            if j % 4 in (1, 3):
                put(out, clap(seed=30 + j), tb, 0.55)
            put(out, hat(open_=True, seed=40 + j), tb + bt / 2, 0.45, pan=0.2)
            for q in range(4):
                put(out, hat(seed=60 + j * 4 + q) * (0.6 if q % 2 else 0.35), tb + q * bt / 4, 0.5, pan=-0.25)
    # acordes que bombean + bajo en corcheas a contratiempo
    chords = np.zeros((n, 2), np.float32)
    bass = np.zeros((n, 2), np.float32)
    bar2 = bt * 4
    t = DROP
    b = 0
    while t < END - 0.05:
        ch = PROG[b % 4]
        d = min(bar2 + 0.4, END - t + 0.6)
        put(chords, pad_chord([m + 12 for m in CHORDS[ch]], d, att=0.02, rel=0.3), t, 0.7)
        for q in range(4):
            tb = t + q * bt + bt / 2
            if tb < END - 0.05 and not (S0 <= tb < S1):
                put(bass, saw(m2f(ROOT[ch]), bt * 0.45, 8) * np.exp(-tt(bt * 0.45) * 5) * 0.45, tb, 1.0)
        t += bar2
        b += 1
    out += (chords * 0.8 + bass) * side[:, None]
    # medalla: respiro con acorde grande y platillo; al acabar la cámara lenta vuelve todo
    put(out, pad_chord([57, 64, 69, 72, 76], S1 - S0 + 1.2, att=0.25, rel=0.8), S0, 0.7)
    put(out, riser(max(0.3, S1 - S0)), S0, 0.5)
    put(out, crash(), mk["medal"], 1.0)
    put(out, crash(), S1, 0.8)
    put(out, boom(1.6, 50), END - 0.12, 1.0)
    put(out, crash(2.5), END - 0.12, 0.8)
    # el drop, fuerte
    put(out, boom(1.8, 48), DROP, 1.2)
    put(out, crash(2.6), DROP, 1.0)
    out = reverb(out, 1.5, 0.22)
    # mezcla: bajo la voz (parte A) más baja, la carrera arriba
    lvl = np.where(np.arange(n) / SR < DROP, 0.5, 0.7)[:, None]
    return (out * lvl).astype(np.float32)


def sfx_track(n, mk):
    out = np.zeros((n, 2), np.float32)
    put(out, boom(1.2, 52), 0.0, 0.9)                         # primer fotograma: golpe
    put(out, crash(1.0), 0.0, 0.5)
    put(out, whoosh(0.55, 11, up=True)[::-1], mk["teaser"] - 0.5, 0.8)   # «rebobinado» hacia el principio
    put(out, whoosh(0.4, 12), mk["teaser"] - 0.05, 0.6)
    put(out, whoosh(0.5, 13), mk["sunset"] - 0.25, 0.35)
    put(out, shimmer(0.9), mk["color"] - 0.1, 0.9)            # vuelve el color
    if mk["ganado"]:
        put(out, boom(0.9, 70), mk["ganado"], 0.55)
    for w in mk["whips"]:
        put(out, whoosh(0.32, int(w * 10)), w - 0.18, 0.75)
    put(out, clink(), mk["medal"] - 0.08, 0.9)                # la medalla
    put(out, shimmer(1.2, 14), mk["medal"], 0.7)
    put(out, whoosh(0.3, 15, up=True), mk["q"] - 0.15, 0.4)  # la pregunta final
    return reverb(out, 0.9, 0.15).astype(np.float32)
