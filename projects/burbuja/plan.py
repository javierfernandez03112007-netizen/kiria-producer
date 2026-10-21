"""Plan del vídeo «ordenamiento burbuja»: simula el doble for sobre el array, genera la línea de tiempo
(timeline.json, la usa la escena 3D) y los efectos de sonido sintetizados (out/sfx.wav).

    python3 projects/burbuja/plan.py
"""
import json
import os
import wave

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
ARR = [7, 3, 9, 1, 6, 10, 2, 8, 5, 4]
INTRO = 2.2            # caen las barras y se escribe el código
OUTRO = 3.2            # ola final + «ordenado»
SR = 48000


def timeline():
    v, n, t, steps = ARR[:], len(ARR), INTRO, []
    def add(kind, dur, **kw):
        nonlocal t
        steps.append(dict(kind=kind, t0=round(t, 4), t1=round(t + dur, 4), arr=v[:], **kw)); t += dur
    for i in range(n - 1):
        sp = 1 + 0.42 * i                                  # cada pasada va más rápida
        add("outer", 0.55 / sp, i=i, j=-1, sorted=i)
        for j in range(n - 1 - i):
            sw = v[j] > v[j + 1]
            add("compare", 0.62 / sp, i=i, j=j, swap=sw, sorted=i)
            if sw:
                add("swap", 0.62 / sp, i=i, j=j, sorted=i)
                v[j], v[j + 1] = v[j + 1], v[j]
        add("placed", 0.45 / sp, i=i, j=n - 1 - i, sorted=i + 1)
    add("done", OUTRO, i=n - 1, j=-1, sorted=n)
    return steps, t


# ---------------------------------------------------------------- síntesis de sonidos
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


def render(steps, total):
    N = int((total + 0.5) * SR); out = np.zeros(N); out += drone(N)
    def mix(x, at, g=1.0):
        s = int(at * SR); e = min(N, s + len(x)); out[s:e] += x[:e - s] * g
    for k in range(len(ARR)):                               # intro: caen y chocan contra el suelo
        mix(clack(k), 0.25 + k * 0.12 + 0.42, 0.9)
    for s in steps:
        d = s["t1"] - s["t0"]
        if s["kind"] == "compare":
            mix(tick(s["arr"][s["j"]]), s["t0"]); mix(tick(s["arr"][s["j"] + 1]), s["t0"] + min(0.09, d * 0.3))
        elif s["kind"] == "swap":
            mix(whoosh(d * 0.8), s["t0"]); mix(clack(s["j"]), s["t0"] + d * 0.78, 1.0)
        elif s["kind"] == "placed":
            mix(ding(880 * 2 ** ((len(ARR) - 1 - s["j"]) / 12)), s["t0"])
        elif s["kind"] == "done":
            for k, val in enumerate(sorted(ARR)):
                mix(tick(val) * 1.3, s["t0"] + 0.15 + k * 0.09)
            for f in (523.25, 659.25, 783.99, 1046.5):
                mix(ding(f, 2.2), s["t0"] + 1.15, 0.9)
    out = np.tanh(out * 1.2) * 0.8
    pcm = (np.repeat(out[:, None], 2, axis=1) * 32767).astype(np.int16)
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    with wave.open(os.path.join(ROOT, "out", "sfx.wav"), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    steps, total = timeline()
    json.dump(dict(arr=ARR, intro=INTRO, end=total, steps=steps), open(os.path.join(ROOT, "timeline.json"), "w"))
    render(steps, total)
    print(f"{len(steps)} pasos, {sum(s['kind'] == 'swap' for s in steps)} intercambios, duración {total:.1f} s")
