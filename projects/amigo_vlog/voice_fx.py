"""Tratamiento profesional de la voz (sin librerías externas): reducción de ruido espectral, ecualización, suavizado de «s»,
compresión y limitador. Entrada/salida: señal estéreo float32 a 44,1 kHz."""
import numpy as np

SR = 44100
NF, HOP = 2048, 512
WIN = np.hanning(NF).astype(np.float32)


def stft(x):
    n = 1 + (len(x) - NF) // HOP
    idx = np.arange(NF)[None, :] + HOP * np.arange(n)[:, None]
    return np.fft.rfft(x[idx] * WIN, axis=1)


def istft(X, length):
    fr = np.fft.irfft(X, n=NF, axis=1) * WIN
    out = np.zeros(length + NF, np.float32)
    norm = np.zeros(length + NF, np.float32)
    for i in range(len(fr)):
        out[i * HOP:i * HOP + NF] += fr[i]
        norm[i * HOP:i * HOP + NF] += WIN ** 2
    return (out / np.maximum(norm, 1e-4))[:length]


def smooth2(g, kt=3, kf=5):
    """Suaviza la máscara en tiempo y frecuencia (evita el «ruido musical»)."""
    from numpy.lib.stride_tricks import sliding_window_view as sw
    p = np.pad(g, ((kt // 2, kt // 2), (kf // 2, kf // 2)), mode="edge")
    return sw(p, (kt, kf)).mean(axis=(-1, -2))


def denoise(x, active, strength=2.3, floor=0.07):
    """Reducción de ruido: perfil del ruido sacado de los tramos sin voz (`active` = máscara por muestra)."""
    out = np.zeros_like(x)
    for c in range(x.shape[1]):
        X = stft(x[:, c])
        mag = np.abs(X)
        fa = active[np.minimum(len(active) - 1, np.arange(len(X)) * HOP + NF // 2)]
        quiet = mag[~fa] if (~fa).sum() > 10 else mag[np.argsort(mag.sum(1))[:max(10, len(mag) // 10)]]
        noise = np.median(quiet, axis=0) * 1.15
        g = np.maximum(1 - strength * noise[None, :] / np.maximum(mag, 1e-9), floor)
        g = smooth2(g)
        out[:, c] = istft(X * g, len(x))
    return out


def eq(x, bands):
    """Ecualizador por FFT: bands = [(tipo, f, ganancia_dB, ancho)], tipos 'hp', 'peak', 'shelf_hi'."""
    X = np.fft.rfft(x, axis=0)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    gdb = np.zeros_like(f)
    lin = np.ones_like(f)
    for kind, fc, gain, w in bands:
        if kind == "hp":
            lin *= 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** 4)
        elif kind == "peak":
            gdb += gain * np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) / w) ** 2)
        elif kind == "shelf_hi":
            gdb += gain / (1 + (fc / np.maximum(f, 1)) ** 4)
    g = lin * 10 ** (gdb / 20)
    return np.fft.irfft(X * g[:, None], n=len(x), axis=0).astype(np.float32)


def deess(x, thresh=0.35, amount=0.55):
    """Baja la banda de 5–9 kHz solo cuando las «s» se disparan."""
    out = np.zeros_like(x)
    for c in range(x.shape[1]):
        X = stft(x[:, c])
        f = np.fft.rfftfreq(NF, 1 / SR)
        band = (f > 5000) & (f < 9500)
        e_b = (np.abs(X[:, band]) ** 2).sum(1)
        e_t = (np.abs(X) ** 2).sum(1) + 1e-9
        r = e_b / e_t
        red = np.clip((r - thresh) / (1 - thresh), 0, 1) * amount
        red = np.convolve(red, np.ones(3) / 3, mode="same")
        G = np.ones(X.shape, np.float32)
        G[:, band] = (1 - red)[:, None]
        out[:, c] = istft(X * G, len(x))
    return out


def compressor(x, thresh_db=-22, ratio=3.5, att=0.005, rel=0.12, makeup_db=3):
    m = np.abs(x).max(axis=1)
    env = np.zeros_like(m)
    a, r = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    e = 0.0
    # seguidor de envolvente (vectorizado por bloques para no ir muestra a muestra en Python)
    blk = 64
    mb = m[:len(m) // blk * blk].reshape(-1, blk).max(1)
    eb = np.zeros_like(mb)
    ab, rb = a ** blk, r ** blk
    for i, v in enumerate(mb):
        e = ab * e + (1 - ab) * v if v > e else rb * e + (1 - rb) * v
        eb[i] = e
    env[:len(eb) * blk] = np.repeat(eb, blk)
    env[len(eb) * blk:] = e
    lvl = 20 * np.log10(np.maximum(env, 1e-6))
    over = np.maximum(0, lvl - thresh_db)
    gain_db = -over * (1 - 1 / ratio) + makeup_db
    return x * (10 ** (gain_db / 20))[:, None]


def limiter(x, ceil=0.89):
    return np.tanh(x / ceil * 1.1) * ceil / np.tanh(1.1)


def gate(x, active, gap_gain=0.28, fade=0.06):
    """Puerta guiada por las palabras: entre frases el fondo baja (≈ −11 dB) con fundidos suaves."""
    g = np.where(active, 1.0, gap_gain).astype(np.float32)
    k = max(1, int(fade * SR))
    c = np.cumsum(np.concatenate([[0], g]))
    gs = (c[k:] - c[:-k]) / k
    gs = np.concatenate([np.full(k // 2, gs[0]), gs, np.full(len(g) - len(gs) - k // 2, gs[-1])])[:len(g)]
    return x * gs[:, None]


def process_voice(x, active):
    y = denoise(x, active)
    y = eq(y, [("hp", 85, 0, 0), ("peak", 280, -2.5, 0.6), ("peak", 3200, 3.0, 0.9), ("peak", 120, 1.5, 0.5), ("shelf_hi", 9500, 2.0, 0)])
    y = deess(y)
    y = compressor(y)
    y = gate(y, active)
    y = y / max(1e-6, np.abs(y).max()) * 0.95
    return limiter(y).astype(np.float32)
