"""Efectos sintetizados para «Un día de bombero: 24 horas de guardia» (la clave de ElevenLabs de la sesión no funciona):
sirena, timbre de salida, radio, pitido de marcha atrás, tazas y cubiertos, pesas, grillos de madrugada, pasos, ciudad,
cristales y el reloj acelerado del «time-lapse». Solo numpy + ffmpeg.
Uso: python3 projects/bomberados_guardia/sfx_sintetizados.py"""
import os
import subprocess

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "sfx")
rng = np.random.default_rng(24)


def band(x, lo, hi, soft=0.12):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + np.exp(-(f - lo) / (lo * soft + 1))) / (1 + np.exp((f - hi) / (hi * soft + 1)))
    return np.fft.irfft(X * m, len(x))


def smooth_noise(d, rate):
    n = int(d * SR)
    k = max(2, int(d * rate) + 2)
    return np.interp(np.arange(n), np.linspace(0, n, k), rng.standard_normal(k))


def env_ad(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)


def modes(n, parts, decay):        # golpe con modos (frecuencia, amplitud, caída)
    t = np.arange(n) / SR
    return sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / (decay * dk)) for f, a, dk in parts)


def echo(y, delays=((0.07, 0.25), (0.13, 0.15), (0.21, 0.08))):
    out = y.copy()
    for dl, g in delays:
        k = int(dl * SR)
        out[k:] += g * y[:-k]
    return out


def save(name, y, peak=0.9, width=0.0006):
    os.makedirs(OUT, exist_ok=True)
    y = y / (np.max(np.abs(y)) + 1e-9) * peak
    st = np.stack([y, np.roll(y, int(width * SR))], 1).astype(np.float32)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(OUT, name + ".mp3")], input=st.tobytes(), check=True)
    print(name, f"{len(y) / SR:.2f} s")


def sirena(d=4.0):
    """Sirena electrónica de autobomba: un «wail» que sube y luego «yelp» rápido (onda cuadrada suave por una bocina)."""
    n = int(d * SR)
    t = np.arange(n) / SR
    wail = 650 + 850 * np.sin(np.pi * np.minimum(t, 1.4) / 2.8) ** 2
    yelp = 900 + 600 * (0.5 - 0.5 * np.cos(2 * np.pi * t / 0.32))
    f = np.where(t < 1.4, wail, yelp)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.tanh(3.0 * np.sin(ph)) + 0.25 * np.sin(2 * ph)
    y = band(y, 350, 4200, 0.2)
    return echo(y) * np.minimum(1, t / 0.08)


def alarma(d=1.5):
    """Timbre de salida del parque: martillo eléctrico (unos 19 golpes por segundo) sobre una campana."""
    n = int(d * SR)
    y = np.zeros(n)
    hit = modes(int(0.09 * SR), [(1180, 1, 1), (2460, 0.7, 0.7), (4120, 0.4, 0.5), (6300, 0.15, 0.4)], 0.05)
    for k in range(int(d * 19)):
        i = int(k / 19 * SR)
        m = min(len(hit), n - i)
        y[i:i + m] += hit[:m] * (0.85 + 0.15 * rng.random())
    t = np.arange(n) / SR
    return echo(np.tanh(1.5 * y)) * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.12)


def radio(d=0.95):
    """Emisora: «chirrido» de apertura, dos pitidos y el ruido del silenciador al soltar."""
    n = int(d * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    sq = band(rng.standard_normal(n), 700, 3200) * ((t < 0.12) * 0.6 + ((t > 0.62) & (t < 0.8)) * 0.8)
    beep = np.sin(2 * np.pi * 1650 * t) * (((t > 0.16) & (t < 0.27)) | ((t > 0.33) & (t < 0.44)))
    y = sq + 0.7 * beep
    return np.tanh(2 * band(y, 300, 3500))


def marcha_atras(d=3.0):
    """Pitido de marcha atrás de un camión: 1 kHz, medio segundo sí, medio no."""
    n = int(d * SR)
    t = np.arange(n) / SR
    on = (np.mod(t, 0.9) < 0.42).astype(float)
    on = np.convolve(on, np.ones(200) / 200, "same")
    y = (np.sin(2 * np.pi * 1020 * t) + 0.3 * np.sin(2 * np.pi * 3060 * t)) * on
    return echo(y, ((0.05, 0.3), (0.11, 0.18)))


def tazas(d=1.6):
    """Tazas y cucharillas: choques de cerámica y metal pequeños."""
    n = int(d * SR)
    y = np.zeros(n)
    for k, t0 in enumerate([0.05, 0.38, 0.62, 1.05, 1.3]):
        cer = k % 2 == 0
        parts = [(2700, 1, 1), (4350, 0.6, 0.7), (6150, 0.35, 0.5)] if cer else [(3900, 1, 1), (7200, 0.7, 0.8), (9800, 0.4, 0.6)]
        parts = [(f * (0.94 + 0.12 * rng.random()), a, dk) for f, a, dk in parts]
        h = modes(int(0.4 * SR), parts, 0.09 if cer else 0.16)
        h[:200] += rng.standard_normal(200) * 0.4
        i = int(t0 * SR); m = min(len(h), n - i)
        y[i:i + m] += h[:m] * (0.6 + 0.4 * rng.random())
    return y


def pesas(d=1.5):
    """Discos de la barra que chocan (arriba) y la barra que vuelve a los hombros."""
    n = int(d * SR)
    y = np.zeros(n)
    for t0, g in [(0.02, 1.0), (0.75, 0.8)]:
        h = modes(int(0.7 * SR), [(196, 1, 1), (523, 0.7, 0.8), (1046, 0.45, 0.6), (1830, 0.3, 0.45), (2950, 0.15, 0.3)], 0.2)
        h += band(rng.standard_normal(len(h)), 80, 900) * env_ad(len(h), 0.002, 0.03) * 1.5
        i = int(t0 * SR); m = min(len(h), n - i)
        y[i:i + m] += g * h[:m]
    return np.tanh(1.2 * y)


def grillos(d=8.0):
    """Grillos de madrugada: dos o tres grillos con su chirrido (tres pulsos) a ritmos distintos."""
    n = int(d * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for f0, per, ph, g in [(4550, 0.52, 0.0, 1.0), (4300, 0.61, 0.21, 0.7), (4800, 0.47, 0.37, 0.45)]:
        tt = np.mod(t + ph, per)
        pulses = sum(np.exp(-((tt - 0.012 - k * 0.034) / 0.009) ** 2) for k in range(3))
        y += g * np.sin(2 * np.pi * f0 * t) * pulses
    return y + 0.02 * band(rng.standard_normal(n), 200, 2000)


def pasos(d=4.6, rate=1.9):
    """Pasos sobre hormigón: talón (golpe sordo) y puntera (roce)."""
    n = int(d * SR)
    y = np.zeros(n)
    for k in range(int(d * rate)):
        i = int((k / rate + 0.02 * rng.standard_normal()) * SR)
        if i < 0 or i >= n:
            continue
        heel = band(rng.standard_normal(int(0.06 * SR)), 70, 700) * env_ad(int(0.06 * SR), 0.002, 0.018)
        toe = band(rng.standard_normal(int(0.08 * SR)), 900, 4200) * env_ad(int(0.08 * SR), 0.01, 0.025) * 0.35
        for x, off in [(heel, 0), (toe, int(0.07 * SR))]:
            j = i + off; m = min(len(x), n - j)
            if m > 0:
                y[j:j + m] += x[:m] * (0.8 + 0.2 * rng.random())
    return y


def ciudad(d=10.0):
    """Ciudad de día: rumor de tráfico y algún coche que pasa."""
    n = int(d * SR)
    t = np.arange(n) / SR
    y = band(rng.standard_normal(n), 40, 420) * (0.6 + 0.2 * smooth_noise(d, 0.6))
    for t0 in [1.2, 4.1, 6.8, 8.9]:
        car = band(rng.standard_normal(n), 180, 2200) * np.exp(-((t - t0) / 0.8) ** 2) * 0.9
        y += car
    return y


def cristales(d=1.2):
    """Cristales rotos que se asientan: muchos tintineos agudos."""
    n = int(d * SR)
    y = np.zeros(n)
    for k in range(38):
        t0 = 0.6 * rng.random() ** 2
        parts = [(rng.uniform(3200, 9500), 1, 1), (rng.uniform(5000, 12000), 0.5, 0.7)]
        h = modes(int(0.25 * SR), parts, 0.03 + 0.05 * rng.random())
        i = int(t0 * SR); m = min(len(h), n - i)
        y[i:i + m] += h[:m] * rng.uniform(0.2, 1.0)
    y[:int(0.05 * SR)] += band(rng.standard_normal(int(0.05 * SR)), 1500, 9000) * env_ad(int(0.05 * SR), 0.001, 0.015)
    return y


def reloj_rapido(d=5.2, rate=13.0):
    """El reloj del «time-lapse»: tic-tac muy rápido (tic agudo, tac más grave)."""
    n = int(d * SR)
    y = np.zeros(n)
    for k in range(int(d * rate)):
        f = 3400 if k % 2 == 0 else 2550
        h = modes(int(0.03 * SR), [(f, 1, 1), (f * 1.9, 0.4, 0.6)], 0.006)
        i = int(k / rate * SR); m = min(len(h), n - i)
        y[i:i + m] += h[:m]
    return y


if __name__ == "__main__":
    save("sirena", sirena())
    save("alarma", alarma())
    save("radio", radio())
    save("marcha_atras", marcha_atras())
    save("tazas", tazas())
    save("pesas", pesas())
    save("grillos", grillos())
    save("pasos", pasos())
    save("ciudad", ciudad())
    save("cristales", cristales())
    save("reloj_rapido", reloj_rapido())
