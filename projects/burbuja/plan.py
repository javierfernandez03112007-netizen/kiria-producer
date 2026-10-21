"""Plan del vídeo «ordenamiento burbuja»: simula el doble for sobre el array, genera la línea de tiempo
(timeline.json, la usa la escena 3D) y los efectos de sonido sintetizados (out/sfx.wav).

    python3 projects/burbuja/plan.py
"""
import json
import os
import sys

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))
from engine.sfx import SR, tick, whoosh, clack, ding, drone, mix as _mix, write  # noqa: E402
ARR = [7, 3, 9, 1, 6, 10, 2, 8, 5, 4]
INTRO = 2.2            # caen las barras y se escribe el código
OUTRO = 3.2            # ola final + «ordenado»


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


def render(steps, total):
    N = int((total + 0.5) * SR); out = np.zeros(N); out += drone(N)
    def mix(x, at, g=1.0):
        _mix(out, x, at, g)
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
    os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
    write(os.path.join(ROOT, "out", "sfx.wav"), out)


if __name__ == "__main__":
    steps, total = timeline()
    json.dump(dict(arr=ARR, intro=INTRO, end=total, steps=steps), open(os.path.join(ROOT, "timeline.json"), "w"))
    render(steps, total)
    print(f"{len(steps)} pasos, {sum(s['kind'] == 'swap' for s in steps)} intercambios, duración {total:.1f} s")
