"""Música ORIGINAL del spot (sintetizada aquí, sin samples ni temas de nadie: no hay derechos que pedir). Javi pidió «cualquiera que encaje».
Pop alegre a 120 pulsos en do mayor (do – sol – la menor – fa), siguiendo el guion técnico:
  1,5 s  primeras notas suaves (punteo) tras el silencio de la biblioteca · 5,5 s entra el bajo y las palmas · 9,5 s rasgueo y bombo
  20 s   la cuenta atrás: solo pulso · se CORTA 1 s antes del clic de «Reservar» · vuelve MÁS FUERTE con la reserva confirmada
  25–35  el viaje: todo arriba (batería, rasgueo, melodía de campanas) · 35,5 s baja bajo la locución · golpe final.
Escribe out/musica.wav (48 kHz, estéreo). Uso: python3 musica.py"""
import json
import os
import wave

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
SR, END, BEAT = 48000, 40.0, 0.5
N = int(END * SR)
L = json.load(open(os.path.join(ROOT, "tiempos.json")))
W = {(i + 1, w["w"].lower().strip("¿?¡!,.…")): w["start"] for i, l in enumerate(L) for w in l["words"]}
c1 = W[(5, "uno")] - 0.03
POINT = min(c1 - 0.02, 22.45); PRESS = POINT + 0.45 + 0.55; OK = PRESS + 0.14          # igual que TL en web/src/30_center.js
T0, CUT, T1, OUT, HIT = 1.5, PRESS - 1.0, OK, OK + 12.0, 39.0                          # 1ª parte desde T0; corte; 2ª parte desde T1 (compases de 2 s); cierre; golpe final
rng = np.random.default_rng(7)
out = np.zeros((N, 2))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
CH = [dict(notes=[60, 64, 67, 72], bass=36), dict(notes=[59, 62, 67, 71], bass=43), dict(notes=[57, 60, 64, 69], bass=45), dict(notes=[57, 60, 65, 69], bass=41)]   # C · G · Am · F


def put(x, t, g=1.0, pan=0.0):
    s = int(t * SR)
    if s >= N or s < 0:
        return
    e = min(N, s + len(x)); out[s:e, 0] += x[:e - s] * g * (1 - max(0, pan)); out[s:e, 1] += x[:e - s] * g * (1 + min(0, pan))


def pluck(m, dur=0.9, bright=1.0):              # cuerda punteada (ukelele / guitarra apagada): armónicos que se apagan antes cuanto más agudos
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m); y = np.zeros(n)
    for k in range(1, 9):
        if f * k > 9000:
            break
        y += np.sin(2 * np.pi * f * k * t + k) * np.exp(-t * (3.2 + 1.9 * k / bright)) / k ** 1.15
    return y * np.minimum(1, t / 0.003) * 0.3


def strum(notes, up=False, dur=0.7, g=1.0):
    x = np.zeros(int((dur + 0.08) * SR))
    for i, m in enumerate(notes[::-1] if up else notes):
        p = pluck(m, dur, 1.3); s = int(i * 0.011 * SR); x[s:s + len(p)] += p * (0.8 if up else 1.0)
    return x * g


def bass(m, dur=0.42):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return np.tanh(y * 1.3) * np.minimum(1, t / 0.006) * np.exp(-t / (dur * 0.55)) * np.minimum(1, (dur - t) / 0.02) * 0.42


def kick():
    n = int(0.3 * SR); t = np.arange(n) / SR; ph = 2 * np.pi * (45 * t + (150 - 45) * 0.035 * (1 - np.exp(-t / 0.035)))
    return (np.sin(ph) * np.exp(-t / 0.11) + 0.25 * rng.standard_normal(n) * np.exp(-t / 0.004)) * 0.75


def noise(dur, lo, hi, dec):                    # ruido entre lo y hi Hz que se apaga
    n = int(dur * SR); X = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR); X[(f < lo) | (f > hi)] = 0
    y = np.fft.irfft(X, n); return y / (np.abs(y).max() + 1e-9) * np.exp(-np.arange(n) / SR / dec)


def clap():
    x = np.zeros(int(0.22 * SR))
    for i, d in enumerate([0, 0.011, 0.023]):
        b = noise(0.18, 900, 4200, 0.012 if i < 2 else 0.06); s = int(d * SR); x[s:s + len(b)] += b[:len(x) - s] * (0.7 if i < 2 else 1)
    return x * 0.32


hat = lambda g=1.0: noise(0.06, 7000, 14000, 0.014) * 0.11 * g
shaker = lambda g=1.0: noise(0.09, 4500, 11000, 0.03) * np.minimum(1, np.arange(int(0.09 * SR)) / SR / 0.012) * 0.07 * g


def bell(m, dur=1.1):                           # campanita (glockenspiel) de la melodía
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    y = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (dur * d)) for r, a, d in [(1, 1, 0.3), (2.76, 0.3, 0.12), (5.4, 0.1, 0.06)])
    return y * np.minimum(1, t / 0.002) * 0.2


def pad(notes, dur):
    n = int(dur * SR); t = np.arange(n) / SR; y = sum(np.sin(2 * np.pi * hz(m) * t * (1 + 0.0015 * np.sin(5 * t + m))) + 0.3 * np.sin(4 * np.pi * hz(m) * t) for m in notes)
    return y * np.minimum(1, t / 0.5) * np.minimum(1, (dur - t) / 0.5) * 0.035


ARP = [0, 2, 1, 3, 2, 1, 0, 2]                    # punteo por corcheas (índices del acorde)
STR = [(0, 0, 1.0), (2, 0, 0.8), (3, 1, 0.6), (5, 1, 0.6), (6, 0, 0.85), (7, 1, 0.55)]            # rasgueo: (corchea, hacia arriba, fuerza)
MEL = [[(0, 76), (1, 79), (2, 81), (3, 79)], [(0, 79), (1.5, 74), (2, 71), (3, 74)], [(0, 76), (1, 79), (2, 81), (3, 84)], [(0, 81), (1, 79), (2, 77), (3, 72), (3.5, 74)]]   # melodía por compás (tiempo, nota)


def bar(t, i, lvl):
    """Un compás (2 s) en t con el acorde i. lvl: 1 punteo · 2 + bajo, palmas y shaker · 3 + rasgueo y bombo · 4 todo (batería completa y melodía) · 0 solo pulso."""
    c = CH[i % 4]
    for e in range(8):                           # corcheas
        te = t + e * BEAT / 2
        if te >= limit:
            return
        if lvl in (1, 2, 3):
            put(pluck(c["notes"][ARP[e]] + (12 if lvl == 1 and e % 4 == 3 else 0), 0.8), te, 0.55 if lvl == 1 else 0.42, -0.25)
        if lvl >= 2:
            put(shaker(1.0 if e % 2 else 0.6), te, 1.0 if lvl < 4 else 1.3, 0.3)
        if lvl == 4:
            put(hat(1.0 if e % 2 == 0 else 0.7), te, 1.0, 0.2)
    if lvl == 0:                                 # la cuenta atrás: pulso de bombo y bajo en la tónica
        for b in range(4):
            if t + b * BEAT < limit:
                put(kick(), t + b * BEAT, 0.6); put(bass(36, 0.3), t + b * BEAT, 0.7)
        return
    for b in range(4):                           # negras
        tb = t + b * BEAT
        if tb >= limit:
            return
        if lvl >= 3:
            put(kick(), tb, 0.62 if lvl == 3 else 0.9)
        if lvl >= 2 and b in (1, 3):
            put(clap(), tb, 0.55 if lvl < 4 else 1.0, 0.1)
    if lvl >= 2:
        for e, m in [(0, 0), (3, 0), (4, 0), (6, 7 if i % 4 != 3 else 0), (7, 0)] if lvl >= 3 else [(0, 0), (4, 0)]:
            if t + e * BEAT / 2 < limit:
                put(bass(c["bass"] + m, 0.4 if lvl >= 3 else 0.7), t + e * BEAT / 2, 0.8 if lvl < 4 else 1.0)
    if lvl >= 3:
        for e, up, g in STR:
            if t + e * BEAT / 2 < limit:
                put(strum(c["notes"], up, 0.6, g), t + e * BEAT / 2, 0.36 if lvl == 3 else 0.5, -0.35 if up else -0.15)
    if lvl == 4:
        for b, m in MEL[i % 4]:
            if t + b * BEAT < limit:
                put(bell(m, 0.9), t + b * BEAT, 0.9, 0.35)


# ---- 1ª parte (hasta el corte): compases desde T0
limit = CUT
for k in range(20):
    t = T0 + 2 * k
    if t >= CUT:
        break
    lvl = 1 if t < 5.4 else 2 if t < 9.4 else 0 if t >= 19.9 else 3
    bar(t, k, lvl)
# ---- 2ª parte: vuelve más fuerte con la reserva (platillo + acorde) y todo arriba durante el viaje
limit = OUT
put(noise(1.6, 3500, 13000, 0.45) * 0.2, T1, 1.0); put(strum(CH[0]["notes"] + [76, 79], False, 1.4, 1.0), T1, 0.8); put(kick(), T1, 1.0)
for k in range(6):
    bar(T1 + 2 * k, k, 4)
for j, d in enumerate([0, 0.25, 0.5, 0.625, 0.75, 0.875]):       # redoble de entrada al cierre
    put(clap(), OUT - 1.0 + d, 0.5 + 0.1 * j, 0.1)
# ---- cierre bajo la locución: acorde largo, colchón y punteo suave; golpe final
limit = HIT
put(noise(1.4, 3500, 13000, 0.4) * 0.16, OUT, 1.0); put(kick(), OUT, 0.9)
for k, i in enumerate([0, 3]):
    t = OUT + 2 * k
    if t < HIT:
        put(pad(CH[i]["notes"], min(2.0, HIT - t) + 0.3), t, 1.0); put(strum(CH[i]["notes"], False, 1.6, 1.0), t, 0.5, -0.2); put(bass(CH[i]["bass"], 1.2), t, 0.8)
        for e in range(8):
            if t + e * BEAT / 2 < HIT - 0.1:
                put(pluck(CH[i]["notes"][ARP[e]] + 12, 0.7), t + e * BEAT / 2, 0.3, 0.25)
put(strum([48, 55, 60, 64, 67, 72, 76], False, 1.0, 1.0), HIT, 0.85); put(kick(), HIT, 1.0); put(bass(36, 0.9), HIT, 1.0); put(bell(84, 1.0), HIT, 0.8, 0.2); put(noise(0.9, 4000, 13000, 0.25) * 0.14, HIT, 1.0)

# ---- volumen por tramos (suave al principio, sube en el viaje) y la voz por delante (la música se agacha cuando hablan)
t = np.arange(N) / SR
sec = np.interp(t, [0, T0, 5.4, 9.4, 11.8, 19.9, CUT, CUT + 0.02, T1 - 0.02, T1, OUT, OUT + 0.3, HIT - 0.05, HIT, END - 0.5, END], [0, 0.6, 0.7, 0.8, 0.62, 0.7, 0.7, 0, 0, 1.0, 1.0, 0.8, 0.75, 0.9, 0.9, 0])
env = np.array(json.load(open(os.path.join(ROOT, "voz_env.json"))), float); env = env / (env.max() + 1e-9); talk = (env > 0.06).astype(float)
k = np.ones(35) / 35; talk = np.convolve(np.convolve(talk, k, "same"), k, "same")                    # ≈ 0,35 s de entrada y salida
duck = 1 - 0.42 * np.interp(t, np.arange(len(talk)) / 100, np.clip(talk * 1.6, 0, 1))
out *= (sec * duck)[:, None]
out = np.tanh(out * 1.15) * 0.82
os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
with wave.open(os.path.join(ROOT, "out", "musica.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
print(f"música → out/musica.wav · corte {CUT:.2f}–{T1:.2f} s · viaje desde {T1:.2f} · cierre {OUT:.2f} · golpe {HIT:.2f}")
