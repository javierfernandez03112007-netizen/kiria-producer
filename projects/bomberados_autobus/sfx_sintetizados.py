"""Efectos sintetizados para «Cada minuto cuenta» (el opositor en la parada del autobús; la clave de ElevenLabs de la
sesión no funciona): coche que pasa rápido (con efecto Doppler), giro de tarjeta, ruleta que frena, fanfarria de reto
completado y puertas neumáticas del autobús. Solo numpy + ffmpeg. (La ciudad y el reloj rápido vienen de la guardia.)
Uso: python3 projects/bomberados_autobus/sfx_sintetizados.py"""
import os
import subprocess

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "sfx")
rng = np.random.default_rng(7)


def band(x, lo, hi, soft=0.12):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + np.exp(-(f - lo) / (lo * soft + 1))) / (1 + np.exp((f - hi) / (hi * soft + 1)))
    return np.fft.irfft(X * m, len(x))


def env_ad(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)


def modes(n, parts, decay):
    t = np.arange(n) / SR
    return sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / (decay * dk)) for f, a, dk in parts)


def save(name, y, peak=0.9, width=0.0006):
    os.makedirs(OUT, exist_ok=True)
    y = y / (np.max(np.abs(y)) + 1e-9) * peak
    st = np.stack([y, np.roll(y, int(width * SR))], 1).astype(np.float32)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(OUT, name + ".mp3")], input=st.tobytes(), check=True)
    print(name, f"{len(y) / SR:.2f} s")


def coche_pasa(d=1.3, v=40.0, dist=4.0):
    """Coche que pasa muy rápido por delante: ruido de rodadura + motor, con Doppler y volumen 1/distancia."""
    n = int(d * SR)
    t = np.arange(n) / SR - d / 2
    x = v * t
    r = np.sqrt(x ** 2 + dist ** 2)
    vr = v * x / r                                      # velocidad radial
    dop = 343 / (343 + vr)
    f = 95 * dop
    eng = sum((0.6 / k) * np.sin(2 * np.pi * np.cumsum(f * k) / SR) for k in range(1, 6))
    road = band(rng.standard_normal(n), 250, 3500) * 1.4
    air = band(rng.standard_normal(n), 900, 7000) * 0.6
    g = (dist / r) ** 1.4
    return (0.5 * eng + road + air) * g


def flip(d=0.35):
    """Tarjeta que gira: un roce corto y un toque seco al final."""
    n = int(d * SR)
    t = np.arange(n) / SR
    sw = band(rng.standard_normal(n), 1500, 9000) * np.exp(-((t - 0.09) / 0.05) ** 2)
    clk = np.zeros(n); i = int(0.2 * SR); h = modes(int(0.06 * SR), [(2400, 1, 1), (4100, 0.5, 0.6)], 0.012); clk[i:i + len(h)] += h
    return 0.8 * sw + clk


def ruleta(d=3.2):
    """Ruleta que gira y frena: clics de la aguja cada vez más separados."""
    n = int(d * SR)
    y = np.zeros(n)
    tt, rate = 0.0, 22.0
    while tt < d - 0.1:
        h = modes(int(0.03 * SR), [(3100, 1, 1), (5200, 0.4, 0.6)], 0.006)
        i = int(tt * SR); m = min(len(h), n - i); y[i:i + m] += h[:m]
        tt += 1 / rate
        rate = max(3.0, rate * 0.955)
    return y


def logro(d=1.4):
    """Reto completado: arpegio brillante ascendente (do-mi-sol-do) con brillo."""
    n = int(d * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
        t0 = k * 0.085; i = int(t0 * SR); m = n - i
        tl = np.arange(m) / SR
        y[i:] += (np.sin(2 * np.pi * f * tl) + 0.35 * np.sin(4 * np.pi * f * tl) + 0.15 * np.sin(6 * np.pi * f * tl)) * np.exp(-tl / (0.5 if k == 3 else 0.18))
    y += band(rng.standard_normal(n), 5000, 12000) * 0.15 * np.exp(-((t - 0.35) / 0.25) ** 2)
    return y


def puertas(d=1.6):
    """Puertas neumáticas del autobús: «pssst» de aire y el golpe al abrirse del todo."""
    n = int(d * SR)
    t = np.arange(n) / SR
    air = band(rng.standard_normal(n), 1200, 9000) * np.exp(-((t - 0.25) / 0.22) ** 2)
    mot = band(rng.standard_normal(n), 120, 600) * np.exp(-((t - 0.55) / 0.3) ** 2) * 0.5
    thud = np.zeros(n); i = int(0.95 * SR); h = band(rng.standard_normal(int(0.2 * SR)), 60, 500) * env_ad(int(0.2 * SR), 0.002, 0.05); thud[i:i + len(h)] += h * 1.6
    return air + mot + thud


if __name__ == "__main__":
    save("coche_pasa", coche_pasa())
    save("flip", flip())
    save("ruleta", ruleta())
    save("logro", logro())
    save("puertas", puertas())
