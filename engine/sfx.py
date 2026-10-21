"""Efectos de sonido sintetizados (sin samples) para vídeos de animación: tick de comparación, whoosh de movimiento,
clack de plástico al colocarse, campanita, dron espacial de fondo y escritura del resultado a WAV.

    from engine import sfx
    out = np.zeros(N); sfx.mix(out, sfx.clack(), at=1.2); sfx.write("out/sfx.wav", out)
"""
import wave

import numpy as np

SR = 48000


def env(n, a=0.002, d=0.1):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def tick(val):            # comparación: pluck corto, más agudo cuanto mayor es el número
    n = int(0.16 * SR); t = np.arange(n) / SR; f = 330 * 2 ** (val / 8)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)) * env(n, 0.002, 0.05) * 0.35


def whoosh(dur):          # al moverse: ruido filtrado que sube y baja
    n = int(dur * SR); rng = np.random.default_rng(n); x = rng.standard_normal(n)
    k = np.linspace(0, 1, n); a = np.sin(np.pi * k) ** 2
    y = np.convolve(x, np.ones(18) / 18, "same") - np.convolve(x, np.ones(90) / 90, "same")
    return y * a * 0.5


def clack(seed=0):        # al colocarse / chocar: golpe de plástico
    n = int(0.12 * SR); t = np.arange(n) / SR; rng = np.random.default_rng(seed)
    y = 0.6 * np.sin(2 * np.pi * 1850 * t) * env(n, 0.0005, 0.012) + 0.5 * np.sin(2 * np.pi * 620 * t) * env(n, 0.0008, 0.03)
    y += rng.standard_normal(n) * env(n, 0.0003, 0.006) * 0.5
    return y * 0.7


def ding(f=1318.5, d=0.9):  # barra en su sitio: campanita
    n = int(d * SR); t = np.arange(n) / SR
    y = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (d * 0.35 / m ** 0.5)) for m, a in [(1, 1), (2.76, 0.4), (5.4, 0.18)])
    return y * np.minimum(1, t / 0.002) * 0.22


def drone(n):             # fondo espacial muy suave
    t = np.arange(n) / SR
    y = 0.5 * np.sin(2 * np.pi * 55 * t) + 0.3 * np.sin(2 * np.pi * 82.4 * t + 1) + 0.2 * np.sin(2 * np.pi * 110 * t * (1 + 0.002 * np.sin(t)))
    return y * 0.035 * np.minimum(1, t / 1.5)



def mix(out, x, at, g=1.0):
    s = int(at * SR); e = min(len(out), s + len(x))
    if e > s:
        out[s:e] += x[:e - s] * g


def write(path, out, drive=1.2, level=0.8):
    out = np.tanh(out * drive) * level
    pcm = (np.repeat(out[:, None], 2, axis=1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
