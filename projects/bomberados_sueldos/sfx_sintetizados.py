"""Efectos sintetizados para «¿Cuánto gana un bombero en Madrid y en Granada?» (la clave de ElevenLabs de la sesión no
funciona): una moneda y una cascada de monedas (las columnas de oro que crecen). Solo numpy + ffmpeg.
Uso: python3 projects/bomberados_sueldos/sfx_sintetizados.py"""
import os
import subprocess

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "sfx")
rng = np.random.default_rng(23)


def clink(d=0.35, f0=None, amp=1.0):                     # moneda: parciales inarmónicos que se apagan deprisa
    n = int(d * SR)
    t = np.arange(n) / SR
    f0 = f0 or rng.uniform(2300, 3400)
    y = np.zeros(n)
    for ratio, dk, g in ((1.0, 0.09, 1.0), (1.51, 0.06, 0.6), (2.27, 0.045, 0.45), (2.93, 0.035, 0.3), (4.1, 0.02, 0.2)):
        y += g * np.sin(2 * np.pi * f0 * ratio * t + rng.uniform(0, 6)) * np.exp(-t / dk)
    y += 0.5 * rng.standard_normal(n) * np.exp(-t / 0.003)
    return amp * y


def save(name, y, peak=0.9, width=0.0004):
    y = y / (np.max(np.abs(y)) + 1e-9) * peak
    st = np.stack([y, np.roll(y, int(width * SR))], 1).astype(np.float32)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(OUT, name + ".mp3")], input=st.tobytes(), check=True)
    print(name, f"{len(y) / SR:.2f} s")


def main():
    os.makedirs(OUT, exist_ok=True)
    save("moneda", clink(0.6, 2850, 1.0) + np.concatenate([np.zeros(int(0.07 * SR)), clink(0.53, 3300, 0.45)]))
    d = 1.6                                                # cascada: cada vez más monedas, y al final se asientan
    y = np.zeros(int(d * SR))
    tt = 0.0
    while tt < d - 0.35:
        k = tt / d
        c = clink(0.3, None, 0.35 + 0.65 * rng.random())
        i = int(tt * SR)
        y[i:i + len(c)] += c[: len(y) - i]
        tt += 0.11 - 0.085 * min(1, k * 1.6) + rng.uniform(0, 0.012)
    t = np.arange(len(y)) / SR
    y *= np.minimum(1, t / 0.05)
    save("monedas", y, 0.85, 0.0008)


if __name__ == "__main__":
    main()
