"""Envolvente de la voz (100 valores por segundo, 0-1) para que la escena reaccione a la voz: voz_env.json.
Uso: python3 env_voz.py   (después de ajustar_voz.py)"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
SR, HOP = 16000, 160
raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(ROOT, "assets", "voz.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32)
n = len(x) // HOP
rms = np.array([np.sqrt(np.mean(x[max(0, i * HOP - 200):i * HOP + 200] ** 2)) for i in range(n)])
ref = np.percentile(rms[rms > rms.max() * 0.05], 90)
e = np.clip(rms / ref, 0, 1)
out, v = [], 0.0
for k in e:                      # sube rápido, baja más despacio
    v = k if k > v else v + (k - v) * 0.35
    out.append(round(float(v), 3))
json.dump(out, open(os.path.join(ROOT, "voz_env.json"), "w"))
print(len(out), "valores")
