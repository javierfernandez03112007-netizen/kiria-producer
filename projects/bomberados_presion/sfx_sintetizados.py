"""Efectos sintetizados para «¿Qué presión llega a la lanza?» (6 nov: la clave de ElevenLabs de la sesión no funciona).
Motor de la autobomba al ralentí, agua que llena la manguera y llave de la lanza al cerrarse. Solo numpy + ffmpeg.
Uso: python3 projects/bomberados_presion/sfx_sintetizados.py"""
import os
import subprocess

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "sfx")
rng = np.random.default_rng(11)


def band(x, lo, hi, soft=0.12):          # paso banda suave en frecuencia (sin scipy)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + np.exp(-(f - lo) / (lo * soft + 1))) / (1 + np.exp((f - hi) / (hi * soft + 1)))
    return np.fft.irfft(X * m, len(x))


def env(n, a, r, curve=1.0):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na) ** curve
    e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e


def noise(d):
    return rng.standard_normal(int(d * SR))


def smooth_noise(d, rate):               # ruido lento (modulaciones): valores aleatorios interpolados a `rate` Hz
    n = int(d * SR)
    k = max(2, int(d * rate) + 2)
    return np.interp(np.arange(n), np.linspace(0, n, k), rng.standard_normal(k))


def save(name, y, peak=0.9, width=0.0004):
    y = y / (np.max(np.abs(y)) + 1e-9) * peak
    st = np.stack([y, np.roll(y, int(width * SR))], 1).astype(np.float32)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(OUT, name + ".mp3")], input=st.tobytes(), check=True)
    print(name, f"{len(y) / SR:.2f} s")


def motor(d=8.0):
    """Diésel de la autobomba al ralentí (≈ 780 rpm, 6 cilindros → 39 Hz de explosiones): armónicos con un poco de
    inestabilidad, golpeteo de explosiones y ruido mecánico; sin principio ni final marcados (se recorta y se repite)."""
    n = int(d * SR)
    t = np.arange(n) / SR
    f0 = 39 * (1 + 0.012 * smooth_noise(d, 3))
    ph = 2 * np.pi * np.cumsum(f0) / SR
    y = np.zeros(n)
    for k in range(1, 14):
        y += (0.9 / k ** 0.85) * np.sin(k * ph + rng.uniform(0, 6.28)) * (1 + 0.25 * smooth_noise(d, 2 + k))
    pulses = np.maximum(0, np.sin(ph)) ** 6                       # cada explosión
    y *= 0.75 + 0.35 * pulses
    y += 0.55 * band(noise(d), 70, 420) * (0.5 + pulses)          # bloque y escape
    y += 0.10 * band(noise(d), 1400, 4200) * pulses ** 2          # golpeteo de válvulas
    y = np.tanh(1.6 * y)
    y = band(y, 28, 6000)
    y *= 1 + 0.06 * np.sin(2 * np.pi * 0.5 * t)
    return y


def agua(d=2.6):
    """Agua que entra a presión y llena la manguera: un empujón grave, un siseo turbulento que se va calmando y unos
    golpes sordos (la manguera se pone dura)."""
    n = int(d * SR)
    t = np.arange(n) / SR
    turb = 0.6 + 0.4 * np.abs(smooth_noise(d, 18))
    y = band(noise(d), 350, 2600) * turb * 0.7 + band(noise(d), 90, 380) * 0.45 * (0.7 + 0.3 * smooth_noise(d, 9))
    y *= env(n, 0.12, 0.9, 0.7) * np.exp(-t / 1.9)
    for t0, f in ((0.08, 70), (0.55, 58), (1.1, 52)):              # «tump»: la manguera se pone dura
        i = int(t0 * SR)
        m = int(0.25 * SR)
        tt = np.arange(m) / SR
        y[i:i + m] += 0.8 * np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.07)
    return y


def llave(d=0.6):
    """La llave de la lanza al cerrarse: «clac» metálico (parciales inarmónicos que se apagan rápido) y un golpe sordo."""
    n = int(d * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for t0, a in ((0.0, 1.0), (0.055, 0.7)):
        i = int(t0 * SR)
        m = n - i
        tt = np.arange(m) / SR
        hit = band(noise(m / SR), 1800, 7000) * np.exp(-tt / 0.006) * 1.2
        for f, dk, g in ((1240, 0.09, 0.5), (2710, 0.06, 0.35), (4130, 0.04, 0.25), (5980, 0.03, 0.15)):
            hit += g * np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) * np.exp(-tt / dk)
        hit += 0.9 * np.sin(2 * np.pi * 110 * tt) * np.exp(-tt / 0.05)
        y[i:] += a * hit
    return y * env(n, 0.001, 0.15)


def main():
    os.makedirs(OUT, exist_ok=True)
    save("motor", motor(), 0.8)
    save("agua", agua(), 0.85, 0.0007)
    save("llave", llave(), 0.9)


if __name__ == "__main__":
    main()
