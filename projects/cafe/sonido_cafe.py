"""Banda sonora sintetizada (sin librerías externas) y mezcla con la voz.

Dron grave, latido a 84 ppm, impactos en las cifras, monedas, barridos en los cortes, impresora del ticket,
subida antes de la torre de monedas y piano final. La música se agacha cuando habla la voz.

    python3 projects/cafe/sonido_cafe.py   # out/mezcla.wav
"""
import os
import subprocess
import sys

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import render_cafe as rc  # noqa: E402

SR = 48000
N = int(rc.DUR * SR)
rng = np.random.default_rng(1)


def tt(n):
    return np.arange(n) / SR


def env_exp(n, dec):
    return np.exp(-tt(n) / dec)


def banda(x, lo, hi):
    """Filtro paso banda por FFT con flancos suaves."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def add(buf, t0, sig, g=1.0):
    i = int(t0 * SR)
    if i < 0:
        sig, i = sig[-i:], 0
    j = min(len(buf), i + len(sig))
    if j > i:
        buf[i:j] += sig[:j - i] * g


def bombo(f0=110, f1=42, dec=0.32):
    n = int(0.6 * SR)
    t = tt(n)
    fr = f1 + (f0 - f1) * np.exp(-t / 0.05)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env_exp(n, dec)


def impacto(dur=2.2):
    n = int(dur * SR)
    t = tt(n)
    fr = 34 + 70 * np.exp(-t / 0.12)
    sub = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.9)
    braam = np.tanh(2.5 * sum(np.sin(2 * np.pi * 55 * k * t + k) / k for k in range(1, 8))) * np.exp(-t / 0.7)
    braam = banda(braam, 40, 900)
    ruido = banda(rng.normal(0, 1, n), 80, 3000) * np.exp(-t / 0.08)
    return 0.9 * sub + 0.35 * braam + 0.25 * ruido


def tintineo(f=2637, dec=0.7):
    n = int(1.4 * SR)
    t = tt(n)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (dec * d))
            for r, a, d in ((1, 1, 1), (2.76, 0.5, 0.6), (5.4, 0.25, 0.35), (1.5, 0.3, 0.8)))
    return s * (1 - np.exp(-t / 0.002))


def clic_moneda():
    n = int(0.12 * SR)
    t = tt(n)
    return banda(rng.normal(0, 1, n), 2500, 9000) * np.exp(-t / 0.012) + 0.3 * tintineo(rng.uniform(2800, 4200), 0.08)[:n]


def barrido(dur=0.5, lo=300, hi=4000):
    n = int(dur * SR)
    t = tt(n)
    x = rng.normal(0, 1, n)
    out = np.zeros(n)
    k = 6
    for i in range(k):  # barrido por tramos
        a, b = i * n // k, (i + 1) * n // k
        c = lo + (hi - lo) * np.sin(np.pi * (i + 0.5) / k)
        out[a:b] = banda(x, c * 0.5, c * 1.5)[a:b]
    e = np.sin(np.pi * t / dur) ** 2
    return out * e


def impresora(dur=0.22):
    n = int(dur * SR)
    t = tt(n)
    sq = np.sign(np.sin(2 * np.pi * 190 * t)) * 0.4 + banda(rng.normal(0, 1, n), 1500, 6000) * 0.6
    return sq * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 34 * t))) * np.minimum(1, (dur - t) / 0.03)


def piano(freqs, dur=4.0):
    n = int(dur * SR)
    t = tt(n)
    s = np.zeros(n)
    for f in freqs:
        for h, a in ((1, 1), (2, 0.45), (3, 0.2), (4, 0.1)):
            s += a * np.sin(2 * np.pi * f * h * 1.0006 ** h * t) * np.exp(-t * (0.9 + 0.5 * h))
    return s * (1 - np.exp(-t / 0.004)) / len(freqs)


def subida(dur):
    n = int(dur * SR)
    t = tt(n)
    fr = 180 * (4.5 ** (t / dur))
    tono = np.sin(2 * np.pi * np.cumsum(fr) / SR) * 0.3
    r = banda(rng.normal(0, 1, n), 600, 9000) * 0.7
    return (tono + r) * (t / dur) ** 2.2


def musica():
    t = tt(N)
    m = np.zeros(N)
    # dron (La grave con quinta) y aire
    dr = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 82.41 * t + 1) + 0.35 * np.sin(2 * np.pi * 110 * t))
    dr *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.11 * t)
    aire = banda(rng.normal(0, 1, N), 150, 900) * 0.25
    vol = np.interp(t, [0, 2, 5.3, 20.9, 21.5, 31.2, 31.8, 44.5, 46.3, 46.45, 49.0, 51.4, 55.8, 59.3, 60],
                    [0.5, 0.35, 0.45, 0.5, 0.7, 0.7, 0.55, 0.6, 0.85, 0.0, 0.15, 0.3, 0.45, 0.4, 0.0])
    m += (dr * 0.35 + aire) * vol
    # latido a 84 ppm
    beat = 60 / 84
    b = bombo()
    tb = 5.32
    while tb < 46.3:
        fuerte = 20.95 <= tb < 31.22
        add(m, tb, b, 0.75 if fuerte else 0.55)
        add(m, tb + 0.18, b, 0.3 if fuerte else 0.22)
        if fuerte:  # charles en corcheas: tensión en la bolsa
            for k in range(2):
                hh = banda(rng.normal(0, 1, int(0.05 * SR)), 6000, 14000) * env_exp(int(0.05 * SR), 0.01)
                add(m, tb + k * beat / 2, hh, 0.25)
        tb += beat
    # piano del final
    add(m, rc.CORTES[18][0], piano([220.0, 329.6]), 0.5)
    add(m, rc.CORTES[19][0], piano([174.6, 261.6, 349.2], 5), 0.45)
    add(m, rc.CORTES[20][0], piano([220.0, 261.6, 329.6], 5), 0.5)
    return m


def efectos():
    s = np.zeros(N)
    T = rc.T
    add(s, 0.06, impacto(), 1.0)
    add(s, 0.40, tintineo(), 0.35)
    for t0, _, _ in rc.CORTES[1:]:
        add(s, t0 - 0.28, barrido(0.5), 0.22)
    for t in (T[6], T[10], T[17]):
        add(s, t - 0.02, bombo(140, 38, 0.5), 0.55)
        add(s, t + 0.05, tintineo(3135, 0.5), 0.22)
    add(s, rc.CORTES[7][0], barrido(1.4, 200, 2500), 0.25)          # el globo
    for _, t, _ in rc.TICKET:
        add(s, t, impresora(), 0.12)
    add(s, T[21] + 0.15, bombo(90, 40, 0.25), 0.6)                     # sello de Hacienda
    add(s, 44.55, subida(46.40 - 44.55), 0.35)
    add(s, 46.40, impacto(1.6), 0.8)
    for k in range(50):
        add(s, T[22] - 0.1 + k * 0.017 + 0.17, clic_moneda(), 0.12)
    add(s, T[23], tintineo(2349, 1.2), 0.4)
    add(s, T[24], bombo(70, 32, 0.8), 0.5)
    add(s, rc.CORTES[20][0] + 0.05, tintineo(1760, 1.5), 0.15)
    return s


def voz():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(rc.OFF), "-t", str(rc.DUR), "-i", rc.VOZ,
                          "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    v = np.frombuffer(raw, np.float32).astype(np.float64)
    out = np.zeros(N)
    out[:len(v)] = v[:N]
    return out


def main():
    v = voz()
    m = musica()
    fxs = efectos()
    k = int(0.06 * SR)
    e = np.convolve(np.abs(v), np.ones(k) / k, mode="same")
    k2 = int(0.25 * SR)
    e = np.convolve(e, np.ones(k2) / k2, mode="same")
    duck = 1 - 0.6 * np.clip(e / 0.04, 0, 1)
    m = m / (np.abs(m).max() + 1e-9)
    fxs = fxs / (np.abs(fxs).max() + 1e-9)
    v = v / (np.abs(v).max() + 1e-9)
    mix = v * 0.9 + m * duck * 0.32 + fxs * 0.5
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    fade = np.clip((rc.DUR - tt(N)) / 0.5, 0, 1)
    mix *= fade
    st = np.stack([mix, mix], 1)
    os.makedirs(rc.OUT, exist_ok=True)
    path = os.path.join(rc.OUT, "mezcla.wav")
    pcm = (np.clip(st, -1, 1) * 32767).astype(np.int16)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", path],
                   input=pcm.tobytes(), check=True)
    print(path)


if __name__ == "__main__":
    main()
