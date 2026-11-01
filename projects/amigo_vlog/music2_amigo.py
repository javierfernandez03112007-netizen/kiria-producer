"""Música original progresiva para el vídeo de la maratón (pop emotivo tipo «edit» deportivo, 100 ppm, Fa–Sol–Mim–Lam).
Sigue los momentos del vídeo:
  avance → golpe y platillo al revés · pasado (B/N) → piano de fieltro apagado, como un recuerdo · vuelve el color → se abre
  el filtro, entra el arpegio y el bajo · «la sensación…» → palmas, shaker y melodía · «Y hoy…» → subida (redoble, ruido que
  sube, arpegio rápido) · «DESTINO» → golpe y silencio · drop → estribillo (batería, acordes que bombean, bajo y melodía) ·
  medalla a cámara lenta → respiro emotivo · final → estribillo arriba y golpe final."""
from functools import lru_cache

import numpy as np

SR = 44100


def m2f(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(d):
    return np.arange(max(1, int(d * SR))) / SR


def put(bus, x, t0, g=1.0, pan=0.0):
    if g == 0:
        return
    x = np.asarray(x, np.float32)
    if x.ndim == 1:
        x = np.stack([x * min(1, 1 - pan), x * min(1, 1 + pan)], 1)
    i = int(round(t0 * SR))
    if i < 0:
        x, i = x[-i:], 0
    j = min(len(bus), i + len(x))
    if j > i:
        bus[i:j] += x[:j - i] * g


# ---------------------------------------------------------------- osciladores y filtros
@lru_cache(64)
def saw_table(nh, L=4096):
    ph = np.arange(L) / L
    y = np.zeros(L)
    for k in range(1, nh + 1):
        y += np.sin(2 * np.pi * k * ph) / k
    return (y / np.abs(y).max()).astype(np.float32)


@lru_cache(64)
def sq_table(nh, L=4096):
    ph = np.arange(L) / L
    y = np.zeros(L)
    for k in range(1, nh + 1, 2):
        y += np.sin(2 * np.pi * k * ph) / k
    return (y / np.abs(y).max()).astype(np.float32)


def osc(f, d, kind="saw", phase0=0.0):
    t = tt(d)
    fa = np.broadcast_to(np.asarray(f, np.float64), t.shape) if np.ndim(f) else np.full(len(t), f)
    nh = int(max(1, min(60, 11000 / max(30.0, float(np.max(fa))))))
    tab = saw_table(nh) if kind == "saw" else sq_table(nh)
    ph = (phase0 + np.cumsum(fa) / SR) % 1.0
    x = ph * len(tab)
    i = x.astype(np.int64)
    fr = (x - i).astype(np.float32)
    return tab[i % len(tab)] * (1 - fr) + tab[(i + 1) % len(tab)] * fr


def lp_static(x, fc, order=2):
    X = np.fft.rfft(x, axis=0)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = 1 / np.sqrt(1 + (f / fc) ** (2 * order))
    return np.fft.irfft(X * (g[:, None] if x.ndim == 2 else g), n=len(x), axis=0).astype(np.float32)


def hp_static(x, fc, order=2):
    X = np.fft.rfft(x, axis=0)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * (g[:, None] if x.ndim == 2 else g), n=len(x), axis=0).astype(np.float32)


def lp_sweep(x, fc_of_t, res=0.0, N=2048):
    """Paso bajo variable en el tiempo (bloques con solape) con algo de resonancia."""
    hop = N // 2
    win = np.hanning(N + 1)[:-1].astype(np.float32)
    st = x.ndim == 2
    xx = x if st else x[:, None]
    pad = np.zeros((N, xx.shape[1]), np.float32)
    xp = np.concatenate([pad, xx, pad])
    out = np.zeros_like(xp)
    f = np.fft.rfftfreq(N, 1 / SR)
    for s in range(0, len(xp) - N, hop):
        tc = (s + N / 2 - N) / SR
        fc = max(60.0, float(fc_of_t(tc)))
        g = 1 / np.sqrt(1 + (f / fc) ** 4) + res * np.exp(-0.5 * ((f - fc) / (0.18 * fc)) ** 2)
        seg = xp[s:s + N] * win[:, None]
        out[s:s + N] += np.fft.irfft(np.fft.rfft(seg, axis=0) * g[:, None], n=N, axis=0)
    y = out[N:N + len(x)]
    return y if st else y[:, 0]


def adsr(d, a=0.01, dcy=0.1, s=0.7, r=0.2):
    t = tt(d)
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(dcy, 1e-4)))
    rel = np.clip((d - t) / max(r, 1e-4), 0, 1)
    return (e * rel).astype(np.float32)


def reverb(x, decay=1.8, mix=0.25, pre=0.02):
    n = int(decay * 2.0 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(11)
    ir = rng.standard_normal((n, 2)) * np.exp(-t * 6.9 / decay)[:, None]
    ir = lp_static(ir, 6000)
    ir[:int(pre * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    L = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, L, axis=0) * np.fft.rfft(ir, L, axis=0), L, axis=0)[:len(x)]
    return (x * (1 - mix) + y * mix * 1.8).astype(np.float32)


# ---------------------------------------------------------------- instrumentos
def felt_piano(m, vel=0.8, d=3.0):
    t = tt(d)
    f = m2f(m)
    y = np.zeros_like(t)
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + 0.0004 * k * k)
        if fk > 9000:
            break
        amp = vel / k ** 1.3 * (1.0 if k < 4 else 0.6)
        y += amp * np.sin(2 * np.pi * fk * t + k) * np.exp(-t * (0.9 + 0.55 * k) * (1.2 - 0.5 * vel))
    ham = np.random.default_rng(int(m * 7)).standard_normal(len(t)) * np.exp(-t * 90) * 0.04
    y = (y + ham) * np.minimum(1, t / 0.005)
    return lp_static(y.astype(np.float32), 2600 + 1500 * vel)


def supersaw(m, d, voices=7, spread=0.012, att=0.02, rel=0.25):
    out = np.zeros((len(tt(d)), 2), np.float32)
    rng = np.random.default_rng(int(m * 13))
    for v in range(voices):
        det = (v - (voices - 1) / 2) / ((voices - 1) / 2) * spread
        x = osc(m2f(m) * (1 + det), d, "saw", rng.random())
        p = (v - (voices - 1) / 2) / ((voices - 1) / 2) * 0.8
        out[:, 0] += x * (1 - max(0, p))
        out[:, 1] += x * (1 + min(0, p))
    return out / voices * adsr(d, att, 0.3, 0.85, rel)[:, None]


def pluck(m, d=0.6, bright=1.0):
    t = tt(d)
    f = m2f(m)
    y = np.zeros_like(t)
    for k in range(1, 18):
        if f * k > 10000:
            break
        y += np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (5 + 3.2 * k / bright))
    return (y * np.minimum(1, t / 0.002) * 0.6).astype(np.float32)


def sub(m, d, att=0.01, rel=0.08):
    t = tt(d)
    x = np.sin(2 * np.pi * m2f(m) * t)
    x = np.tanh(1.6 * x) * 0.8
    return (x * adsr(d, att, 0.2, 0.9, rel)).astype(np.float32)


def lead(m, d, prev=None):
    t = tt(d)
    f0 = m2f(m)
    if prev is not None:                           # pequeño portamento desde la nota anterior
        f0 = f0 + (m2f(prev) - f0) * np.exp(-t / 0.03)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.15) / 0.2, 0, 1)
    x = osc(f0 * vib, d, "saw") * 0.6 + osc(f0 * vib * 2.001, d, "sq") * 0.25
    return (x * adsr(d, 0.008, 0.15, 0.7, 0.08)).astype(np.float32)


def kick(d=0.42, soft=False):
    t = tt(d)
    f = 44 + (95 if soft else 130) * np.exp(-t * (22 if soft else 30))
    ph = 2 * np.pi * np.cumsum(f) / SR
    click = np.random.default_rng(1).standard_normal(len(t)) * np.exp(-t * 400) * (0.05 if soft else 0.3)
    return ((np.sin(ph) * np.exp(-t * (9 if soft else 7))) + click).astype(np.float32) * (0.7 if soft else 1.0)


def clap(seed=2):
    t = tt(0.3)
    w = hp_static(lp_static(np.random.default_rng(seed).standard_normal(len(t)).astype(np.float32), 7000), 1100)
    env = np.zeros_like(t)
    for k, o in enumerate([0, 0.011, 0.022]):
        env += np.where(t >= o, np.exp(-(t - o) * (160 if k < 2 else 20)), 0)
    return (w * env * 0.5).astype(np.float32)


def snare(seed=4, tone=185):
    t = tt(0.2)
    w = hp_static(np.random.default_rng(seed).standard_normal(len(t)).astype(np.float32), 1600)
    return ((w * 0.7 + np.sin(2 * np.pi * tone * t) * 0.5) * np.exp(-t * 24)).astype(np.float32)


def hat(open_=False, seed=3):
    t = tt(0.25 if open_ else 0.05)
    w = hp_static(np.random.default_rng(seed).standard_normal(len(t)).astype(np.float32), 8000)
    return (w * np.exp(-t * (13 if open_ else 80)) * (0.32 if open_ else 0.22)).astype(np.float32)


def shaker(seed=5):
    t = tt(0.09)
    w = hp_static(lp_static(np.random.default_rng(seed).standard_normal(len(t)).astype(np.float32), 9000), 4500)
    return (w * np.sin(np.pi * np.clip(t / 0.09, 0, 1)) ** 2 * 0.2).astype(np.float32)


def crash(d=2.4, seed=6):
    t = tt(d)
    w = hp_static(np.random.default_rng(seed).standard_normal(len(t)).astype(np.float32), 3200)
    return (w * np.exp(-t * 1.9) * 0.3).astype(np.float32)


def riser(d, f0=180, f1=1400):
    t = tt(d)
    w = np.random.default_rng(8).standard_normal(len(t)).astype(np.float32)
    w = lp_sweep(w, lambda tc: 400 + 9000 * (max(0, tc) / d) ** 2)
    tone = np.sin(2 * np.pi * np.cumsum(f0 * (f1 / f0) ** (t / d)) / SR) * 0.18
    return ((w * 0.35 + tone) * (t / d) ** 2.2).astype(np.float32)


def boom(d=1.6, f0=48):
    t = tt(d)
    f = f0 + 80 * np.exp(-t * 8)
    ph = 2 * np.pi * np.cumsum(f) / SR
    w = lp_static(np.random.default_rng(9).standard_normal(len(t)).astype(np.float32), 700)
    return ((np.sin(ph) * np.exp(-t * 2.2) + w * np.exp(-t * 8) * 0.4) * 0.9).astype(np.float32)


def subdrop(d=1.4):
    t = tt(d)
    f = 30 + 70 * np.exp(-t * 2.5)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6) * 0.8).astype(np.float32)


# ---------------------------------------------------------------- arreglo
CH = {"F": [53, 57, 60, 65], "G": [55, 59, 62, 67], "Em": [52, 55, 59, 64], "Am": [57, 60, 64, 69], "Gsus": [55, 60, 62, 67], "C": [48, 55, 60, 64]}
ROOT = {"F": 41, "G": 43, "Em": 40, "Am": 45, "Gsus": 43, "C": 36}


def music_track(n, mk):
    T0, DROP, DEST, END = mk["teaser"], mk["drop"], mk["destino"], mk["dur"]
    BAR = (DROP - T0) / 9                          # 9 compases exactos hasta el drop (≈ 100 ppm)
    BT = BAR / 4
    COLOR, GANADO, HOY = mk["color"], mk["ganado"], mk["hoy"]
    S0, S1 = mk["slow0"], mk["slow1"]
    keys = np.zeros((n, 2), np.float32)            # piano, colchón, arpegio (pasan por el filtro del «recuerdo»)
    bass = np.zeros((n, 2), np.float32)
    drums = np.zeros((n, 2), np.float32)
    leadb = np.zeros((n, 2), np.float32)
    saws = np.zeros((n, 2), np.float32)
    fx = np.zeros((n, 2), np.float32)
    prog = ["F", "G", "Em", "Am", "F", "G", "Em", "Am", "Gsus"]
    # ---- narración: 9 compases
    for b, ch in enumerate(prog):
        tb = T0 + b * BAR
        notes = CH[ch]
        if b < 8:
            # piano de fieltro: acorde quebrado en negras (más denso a partir del color)
            pat = [0, 1, 2, 3] if b < 3 else [0, 2, 1, 3, 0, 2, 1, 3]
            step = BT if b < 3 else BT / 2
            for j, idx in enumerate(pat):
                put(keys, felt_piano(notes[idx] + 12, 0.55 if j % 2 else 0.7, 2.6), tb + j * step, 0.42, pan=-0.25 + 0.5 * (idx / 3))
            put(keys, felt_piano(ROOT[ch] + 12, 0.6, 3.2), tb, 0.35)
            put(keys, supersaw(notes[0] + 12, BAR + 0.6, 5, 0.008, 0.9, 0.8) + supersaw(notes[2] + 12, BAR + 0.6, 5, 0.008, 0.9, 0.8), tb, 0.10)
        if b >= 3 and b < 8:                       # color: arpegio en corcheas y bajo largo
            arp = [0, 1, 2, 3, 2, 1, 2, 3]
            for j in range(8):
                put(keys, pluck(notes[arp[j]] + 24, 0.5, 0.8 + 0.1 * b), tb + j * BT / 2, 0.16, pan=0.35 * np.sin(j * 1.3))
            put(bass, sub(ROOT[ch], BAR * 0.98, 0.08, 0.3), tb, 0.55)
        if b >= 5 and b < 8:                       # «la sensación…»: palmas, shaker, bombo suave y melodía de piano
            for q in range(4):
                put(drums, kick(soft=True), tb + q * BT, 0.42 if q % 2 == 0 else (0.22 if b == 7 else 0))
                if q in (1, 3):
                    put(drums, clap(20 + b * 4 + q), tb + q * BT, 0.28)
            for e in range(8):
                put(drums, shaker(40 + b * 8 + e), tb + e * BT / 2 + (0.02 if e % 2 else 0), 0.32)
            mel = {5: [(1, 76), (2, 79), (3, 81)], 6: [(1, 79), (2, 83), (3, 86)], 7: [(0.5, 79), (1.5, 76), (2.5, 74), (3.25, 76)]}[b]
            for bb_, m in mel:
                put(keys, felt_piano(m, 0.85, 2.4), tb + bb_ * BT, 0.38, pan=0.15)
        if b == 2:                                 # el «latido» en «cuando nadie mira»
            for q in (0, 2):
                put(drums, kick(soft=True), tb + q * BT, 0.45)
                put(drums, kick(soft=True), tb + q * BT + 0.22, 0.25)
    # «ya has ganado»: platillo al revés que llega a la palabra
    put(fx, crash(1.4)[::-1].copy(), GANADO - 1.4, 0.55)
    put(fx, boom(1.0, 60), GANADO, 0.35)
    # ---- subida (compás 9: «todo ese trabajo tiene un…»), corte en el último tiempo, golpe en «destino», silencio
    tb = T0 + 8 * BAR
    cut = tb + 3 * BT                              # último tiempo: todo para
    put(keys, supersaw(55 + 12, cut - tb + 0.05, 7, 0.012, 0.3, 0.05) + supersaw(62 + 12, cut - tb + 0.05, 7, 0.012, 0.3, 0.05), tb, 0.12)
    for j in range(int((cut - tb) / (BT / 4))):    # arpegio en semicorcheas que sube
        put(keys, pluck(CH["Gsus"][j % 4] + 24 + 12 * (j // 8 % 2), 0.3, 1.4), tb + j * BT / 4, 0.16 + 0.16 * j / 12)
    tr, k = HOY - 0.1, 0
    while tr < cut - 0.03:                         # redoble que acelera
        frac = (tr - HOY) / max(0.1, cut - HOY)
        put(drums, snare(60 + k), tr, 0.18 + 0.55 * max(0, frac) ** 1.5)
        tr += BT / (1 if frac < 0.3 else 2 if frac < 0.6 else 4 if frac < 0.85 else 8)
        k += 1
    for q in range(3):
        put(drums, kick(), tb + q * BT, 0.7)
    put(fx, riser(cut - (HOY - 0.4)), HOY - 0.4, 1.25)
    put(fx, boom(1.0, 62), DEST, 0.75)
    put(fx, snare(99, 160), DEST, 0.5)
    put(fx, crash(1.0)[::-1].copy(), DROP - 0.5, 0.7)
    # ---- estribillo (drop) · respiro en la medalla · estribillo final
    cprog = [("F", 0), ("G", 1), ("Am", 2), ("F", 3), ("G", 4)]
    hook = {0: [(0, .5, 81), (.5, .5, 84), (1, 1, 81), (2, .5, 79), (2.5, .5, 81), (3, 1, 77)],
            1: [(0, .5, 79), (.5, .5, 83), (1, 1, 86), (2, .5, 83), (2.5, .5, 81), (3, 1, 79)],
            3: [(0, .5, 81), (.5, .5, 84), (1, .5, 88), (1.5, .5, 86), (2, 1, 84), (3, 1, 81)],
            4: [(0, .5, 79), (.5, .5, 83), (1, 1, 86), (2, 1, 88), (3, 1, 91)]}
    side = np.ones(n, np.float32)
    for ch, ci in cprog:
        tb = DROP + ci * BAR
        if tb > END:
            break
        notes = CH[ch]
        brk = ci == 2
        dur = min(BAR, END - tb + 0.3)
        if brk:                                    # respiro: colchón grande, piano agudo, sin batería
            for m in notes:
                put(keys, supersaw(m + 12, BAR + 1.0, 7, 0.01, 0.35, 0.9), tb, 0.13)
            for j, m in enumerate([88, 84, 81, 76, 81, 84]):
                put(keys, felt_piano(m, 0.8, 2.5), tb + j * BT * 0.66, 0.42, pan=0.2 * np.sin(j))
            put(bass, sub(ROOT[ch], BAR, 0.3, 0.6), tb, 0.45)
            put(fx, riser(BAR * 0.9), tb + BAR * 0.1, 0.55)
            continue
        for m in notes:                            # acordes que bombean
            put(saws, supersaw(m + 12, dur, 7, 0.014, 0.01, 0.2), tb, 0.16)
        for e in range(8):                         # bajo en corcheas
            put(bass, sub(ROOT[ch] + (12 if e % 2 else 0), BT / 2 * 0.9, 0.005, 0.04), tb + e * BT / 2, 0.5)
            put(keys, pluck(notes[[0, 2, 3, 2][e % 4]] + 24, 0.25, 1.6), tb + e * BT / 2, 0.10)
        prev = None
        for bo, du, m in hook.get(ci, []):         # melodía
            put(leadb, lead(m, du * BT * 0.95, prev), tb + bo * BT, 0.22)
            prev = m
        for q in range(4):                         # batería pop: bombo 1, «y» del 2 y 3; palmas 2 y 4; charles
            tq = tb + q * BT
            if tq > END - 0.02:
                break
            if q in (0, 2):
                put(drums, kick(), tq, 0.95)
            if q == 1:
                put(drums, kick(), tq + BT / 2, 0.75)
            if q in (1, 3):
                put(drums, clap(70 + ci * 4 + q), tq, 0.6)
                put(drums, snare(80 + ci * 4 + q, 200), tq, 0.25)
            put(drums, hat(seed=90 + ci * 8 + q), tq, 0.5, pan=-0.2)
            put(drums, hat(True, 120 + ci * 8 + q), tq + BT / 2, 0.45, pan=0.2)
        for q in range(4):
            i0 = int((tb + q * BT) * SR)
            L = int(BT * 0.85 * SR)
            if i0 < n:
                seg = 0.3 + 0.7 * np.clip(np.arange(min(L, n - i0)) / L, 0, 1) ** 0.7
                side[i0:i0 + len(seg)] = np.minimum(side[i0:i0 + len(seg)], seg)
    put(fx, boom(1.8, 46), DROP, 1.0)
    put(fx, subdrop(1.6), DROP, 0.9)
    put(fx, crash(2.6), DROP, 0.9)
    put(fx, crash(2.0, 7), mk["medal"], 0.5)
    put(fx, crash(2.4, 8), S1, 0.6)
    tf = DROP + 4 * BAR - BT                       # redoble de toms antes del último tramo
    for j in range(4):
        put(drums, snare(140 + j, 120 + 25 * j), tf + j * BT / 4, 0.4)
    # golpe final en Do (resuelve) y cola
    tend = END - 0.12
    for m in CH["C"]:
        put(saws, supersaw(m + 12, 1.6, 7, 0.014, 0.005, 1.2), tend, 0.2)
    put(fx, boom(1.8, 44), tend, 1.0)
    put(fx, crash(2.4, 9), tend, 0.8)
    # ---- mezcla
    leadb = leadb + np.roll(leadb, int(BT * 0.75 * SR), axis=0) * 0.3 + np.roll(leadb, int(BT * 1.5 * SR), axis=0) * 0.12
    leadb = lp_static(leadb, 5200)
    saws = lp_static(saws, 7500) * side[:, None]
    bass = bass * (0.55 + 0.45 * side[:, None])
    music = keys + saws + leadb + bass * 0.9
    # el «recuerdo»: todo apagado (paso bajo) mientras el vídeo está en blanco y negro; se abre al volver el color
    music = lp_sweep(music, lambda tc: 1100 if tc < COLOR - 0.1 else (1100 + 15000 * min(1, (tc - COLOR + 0.1) / 0.7) ** 2))
    music = reverb(music, 2.0, 0.24)
    drums = reverb(drums, 0.9, 0.12)
    fx = reverb(fx, 1.6, 0.2)
    out = music + drums * 0.9 + fx
    out = np.tanh(out * 1.3) / np.tanh(1.3)        # pegamento y techo suave
    lvl = np.where(np.arange(n) / SR < DROP, 0.45, 0.9)[:, None]
    return (out * lvl).astype(np.float32)
