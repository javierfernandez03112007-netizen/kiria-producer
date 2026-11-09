"""Efectos sintetizados para «FOMO Bomberados» (la clave de ElevenLabs de la sesión no funciona): el «chispazo» digital del
primer segundo y el encendido de la arena (subida eléctrica + zumbido + golpe). Solo numpy + ffmpeg. El resto (ruleta,
fanfarria, golpes, tic…) viene del vídeo del autobús y de la biblioteca de Bomberados.
Uso: python3 projects/bomberados_fomo/sfx_sintetizados.py"""
import os
import subprocess

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "sfx")
rng = np.random.default_rng(10)


def band(x, lo, hi, soft=0.12):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + np.exp(-(f - lo) / (lo * soft + 1))) / (1 + np.exp((f - hi) / (hi * soft + 1)))
    return np.fft.irfft(X * m, len(x))


def save(name, y, peak=0.9, width=0.0006):
    os.makedirs(OUT, exist_ok=True)
    y = y / (np.max(np.abs(y)) + 1e-9) * peak
    st = np.stack([y, np.roll(y, int(width * SR))], 1).astype(np.float32)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(OUT, name + ".mp3")], input=st.tobytes(), check=True)
    print(name, f"{len(y) / SR:.2f} s")


def glitch(d=0.12):
    """Chispazo digital: zumbido de onda cuadrada que salta de tono y ruido cortado a trozos."""
    n = int(d * SR)
    t = np.arange(n) / SR
    f = np.where((t * 60).astype(int) % 2 == 0, 180, 920)
    sq = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    nz = band(rng.standard_normal(n), 800, 9000) * ((t * 220).astype(int) % 3 != 0)
    return (0.6 * sq + 0.8 * nz) * np.minimum(1, (d - t) / 0.01)


def encendido(d=1.6):
    """La arena se enciende: subida eléctrica (barrido 60 → 900 Hz), zumbido de neón y un golpe grave al final."""
    n = int(d * SR)
    t = np.arange(n) / SR
    f = 60 * (900 / 60) ** np.minimum(1, t / 0.55)
    sweep = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.05) * np.exp(-np.maximum(0, t - 0.55) / 0.12)
    hum = (np.sin(2 * np.pi * 100 * t) + 0.5 * np.sin(2 * np.pi * 200 * t) + 0.25 * np.sin(2 * np.pi * 300 * t)) * np.clip((t - 0.5) / 0.1, 0, 1) * np.exp(-np.maximum(0, t - 0.6) / 0.9) * 0.35
    i = int(0.55 * SR); boom = np.zeros(n); m = n - i; tb = np.arange(m) / SR
    boom[i:] = (np.sin(2 * np.pi * 52 * tb) * np.exp(-tb / 0.35) + band(rng.standard_normal(m), 40, 400) * np.exp(-tb / 0.08) * 0.8)
    return 0.7 * sweep + hum + 1.2 * boom


if __name__ == "__main__":
    save("glitch", glitch())
    save("encendido", encendido())
