"""Efectos sintetizados para «¿Cuánta agua necesitas?» (problema de espuma; la clave de ElevenLabs de la sesión no
funciona): el generador de espuma (ventilador que ruge + aire) y el burbujeo de la espuma. Solo numpy + ffmpeg.
Uso: python3 projects/bomberados_espuma/sfx_sintetizados.py"""
import os
import subprocess

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "sfx")
rng = np.random.default_rng(37)


def band(x, lo, hi, soft=0.12):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + np.exp(-(f - lo) / (lo * soft + 1))) / (1 + np.exp((f - hi) / (hi * soft + 1)))
    return np.fft.irfft(X * m, len(x))


def smooth_noise(d, rate):
    n = int(d * SR)
    k = max(2, int(d * rate) + 2)
    return np.interp(np.arange(n), np.linspace(0, n, k), rng.standard_normal(k))


def save(name, y, peak=0.9, width=0.0006):
    y = y / (np.max(np.abs(y)) + 1e-9) * peak
    st = np.stack([y, np.roll(y, int(width * SR))], 1).astype(np.float32)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(OUT, name + ".mp3")], input=st.tobytes(), check=True)
    print(name, f"{len(y) / SR:.2f} s")


def generador(d=5.0):
    """Generador de espuma de media expansión: ventilador (zumbido de aspas + aire a chorro) y la espuma saliendo."""
    n = int(d * SR)
    t = np.arange(n) / SR
    blade = 118 * (1 + 0.01 * smooth_noise(d, 2))
    ph = 2 * np.pi * np.cumsum(blade) / SR
    hum = sum((0.7 / k) * np.sin(k * ph) for k in range(1, 7))
    air = band(rng.standard_normal(n), 300, 5200) * (0.8 + 0.25 * smooth_noise(d, 6))
    rumble = band(rng.standard_normal(n), 60, 260) * 0.7
    y = 0.45 * hum + air + rumble
    return np.tanh(1.2 * y) * np.minimum(1, t / 0.4)


def burbujeo(d=2.4):
    """Burbujeo: muchas burbujitas que revientan (pops cortos de tono que sube)."""
    n = int(d * SR)
    y = np.zeros(n)
    tt = 0.0
    while tt < d - 0.1:
        f0 = rng.uniform(600, 2200)
        m = int(0.03 * SR)
        tm = np.arange(m) / SR
        pop = np.sin(2 * np.pi * (f0 * tm + 9000 * tm * tm)) * np.exp(-tm / 0.006) * rng.uniform(0.3, 1.0)
        i = int(tt * SR)
        y[i:i + m] += pop[: n - i]
        tt += rng.uniform(0.005, 0.035)
    y += 0.25 * band(rng.standard_normal(n), 400, 3000) * (0.6 + 0.4 * np.abs(smooth_noise(d, 12)))
    return y * np.minimum(1, np.arange(n) / SR / 0.1)


def main():
    os.makedirs(OUT, exist_ok=True)
    save("generador", generador(), 0.85)
    save("burbujeo", burbujeo(), 0.8)


if __name__ == "__main__":
    main()
