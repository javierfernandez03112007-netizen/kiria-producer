"""Efectos sintetizados para «¿Cuánto aire te queda?» (6 nov: la clave de ElevenLabs no funciona desde la sesión).
Respiración del regulador del ERA (normal y rápida), silbato de reserva, bocina de «¡Tiempo!», reloj que se acelera y
chorro de aire comprimido. Solo numpy + ffmpeg. Uso: python3 projects/bomberados_botella/sfx_sintetizados.py"""
import os
import subprocess

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "sfx")
rng = np.random.default_rng(7)


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


def click(f0=3200, d=0.025, amp=1.0):
    n = int(d * SR)
    t = np.arange(n) / SR
    return amp * band(noise(d), f0 * 0.6, f0 * 1.6) * np.exp(-t / 0.004)


def breath(cycle=3.0, tin=1.05, tout=0.95, gap_in=0.18, fast=False):
    y = np.zeros(int(cycle * SR))
    # inspiración: chasquido de la válvula a demanda + siseo agudo + algo de «succión» grave
    c = click(2600, 0.03, 1.2)
    y[:len(c)] += c
    n = int(tin * SR)
    hiss = band(noise(tin), 1700, 7500) * 0.55 + band(noise(tin), 260, 900) * 0.22
    y[int(0.01 * SR):int(0.01 * SR) + n] += hiss * env(n, 0.12 if not fast else 0.06, 0.25, 0.6) * (1.15 if fast else 1.0)
    # espiración: válvula de exhalación que «tiembla» (aleteo) y se cierra con un clic suave
    s0 = int((tin + gap_in) * SR)
    m = int(tout * SR)
    t = np.arange(m) / SR
    flutter = 0.55 + 0.45 * np.sin(2 * np.pi * (26 + 6 * np.sin(2 * np.pi * 1.3 * t)) * t)
    ex = band(noise(tout), 380, 2600) * 0.6 * flutter * env(m, 0.05, 0.3, 0.7)
    y[s0:s0 + m] += ex[: len(y) - s0]
    c2 = click(1500, 0.02, 0.45)
    e0 = min(len(y) - len(c2), s0 + m)
    y[e0:e0 + len(c2)] += c2
    return y


def save(name, y, peak=0.9):
    y = y / (np.max(np.abs(y)) + 1e-9) * peak
    st = np.stack([y, np.roll(y, int(0.0004 * SR))], 1).astype(np.float32)      # un poco de anchura
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(OUT, name + ".mp3")], input=st.tobytes(), check=True)
    print(name, f"{len(y) / SR:.2f} s")


def main():
    os.makedirs(OUT, exist_ok=True)
    save("respiracion", np.concatenate([breath(3.0), breath(3.0)]))
    save("respiracion_rapida", np.concatenate([breath(1.55, 0.6, 0.55, 0.08, True) for _ in range(3)]))
    # silbato de reserva: dos tonos casi iguales (batido) con vibrato y aire
    d = 2.6
    t = np.arange(int(d * SR)) / SR
    vib = 22 * np.sin(2 * np.pi * 6.2 * t)
    w = np.sin(2 * np.pi * np.cumsum(3180 + vib) / SR) + 0.8 * np.sin(2 * np.pi * np.cumsum(3245 + vib) / SR)
    w += 0.15 * np.sin(2 * np.pi * np.cumsum(6400 + 2 * vib) / SR) + 0.12 * band(noise(d), 2400, 4800)
    save("silbato", w * env(len(t), 0.06, 0.3) * (0.9 + 0.1 * np.sin(2 * np.pi * 9 * t)))
    # bocina de «¡Tiempo!»
    d = 0.95
    t = np.arange(int(d * SR)) / SR
    saw = lambda f: 2 * ((t * f) % 1) - 1
    b = np.tanh(2.6 * (saw(146) + 0.7 * saw(219) + 0.4 * saw(293)))
    save("bocina", band(b, 90, 5000) * env(len(t), 0.006, 0.09), 0.85)
    # reloj que se acelera (para el 00:00 → 34:00)
    d = 2.6
    y = np.zeros(int(d * SR))
    tt, k = 0.0, 0
    while tt < d - 0.05:
        c = click(4200 if k % 2 else 2600, 0.03, 1.0 if k % 2 else 0.8)
        i = int(tt * SR)
        y[i:i + len(c)] += c[: len(y) - i]
        tt += 0.17 - 0.12 * min(1, tt / 2.0)
        k += 1
    save("reloj", y)
    # chorro de aire comprimido
    d = 2.8
    t = np.arange(int(d * SR)) / SR
    a = band(noise(d), 1100, 9000) * 0.8 + band(noise(d), 200, 800) * 0.35
    save("aire", a * env(len(t), 0.03, 0.4) * np.exp(-t / 1.6))


if __name__ == "__main__":
    main()
