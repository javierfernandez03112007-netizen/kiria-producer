"""Une la toma de Javi (sin precios, assets/voz_sin_precios.mp3) con las frases nuevas (assets/extra.mp3, misma voz y ajustes):
«…ni una sola cámara.» + «Más de 2.500 seguidores nuevos en 6 días. ¿Cómo?» + «Un guion… efecto a efecto.» + «Y además, puedes probar
tu objeto en 3D…» + «Si quieres vídeos así, comenta Kiria y te paso el enlace por privado.» → assets/voz_original.mp3.
Los cortes van en el punto más silencioso entre frases y las frases nuevas se igualan en volumen a la toma de Javi."""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
SR = 44100


def load(p):
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(ROOT, p), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                        capture_output=True, check=True).stdout, np.float32).copy()


def quiet(x, a, b):
    hop, win = int(0.01 * SR), int(0.02 * SR)
    best = min((float(np.sqrt(np.mean(x[s:s + win] ** 2))), s + win // 2) for s in range(int(a * SR), int(b * SR) - win, hop))
    return best[1] / SR


def speech_rms(x):
    win = int(0.05 * SR); e = np.array([np.sqrt(np.mean(x[i:i + win] ** 2)) for i in range(0, len(x) - win, win)])
    return float(np.sqrt(np.mean(e[e > e.max() * 0.15] ** 2)))


x, y = load("assets/voz_sin_precios.mp3"), load("assets/extra.mp3")
X = json.load(open(os.path.join(ROOT, "asr_sin_precios.json")))
Y = json.load(open(os.path.join(ROOT, "assets", "extra.json")))
end_of = lambda ws, w, k=1: [v for v in ws if v["w"].lower().strip("¿?.,…") == w][k - 1]
c1 = quiet(x, end_of(X, "cámara")["end"] - 0.05, end_of(X, "un")["start"] + 0.02)
c2 = quiet(x, end_of(X, "efecto", 2)["end"] - 0.05, end_of(X, "si")["start"] + 0.02)
a1 = quiet(y, end_of(Y, "cómo")["end"] - 0.1, end_of(Y, "y")["start"] + 0.02)
a2 = quiet(y, end_of(Y, "web")["end"] - 0.1, end_of(Y, "si")["start"] + 0.02)
k = speech_rms(x[:int(c2 * SR)]) / speech_rms(y)
y = y * k
print(f"cortes toma de Javi: {c1:.2f} {c2:.2f} · frases nuevas: {a1:.2f} {a2:.2f} · volumen ×{k:.2f}")
fade = int(0.012 * SR)


def seg(z, a, b):
    s = z[int(a * SR):int(b * SR)].copy(); s[:fade] *= np.linspace(0, 1, fade); s[-fade:] *= np.linspace(1, 0, fade); return s


gap = lambda s: np.zeros(int(s * SR), np.float32)      # silencio en cada unión (luego ajustar_voz.py lo deja en su pausa)
out = np.concatenate([seg(x, 0, c1), gap(0.32), seg(y, 0, a1), gap(0.1), seg(x, c1, c2), gap(0.42), seg(y, a1, a2), gap(0.32), seg(y, a2, len(y) / SR)])
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "libmp3lame", "-b:a", "192k",
                os.path.join(ROOT, "assets", "voz_original.mp3")], input=out.astype(np.float32).tobytes(), check=True)
print(f"voz nueva: {len(out) / SR:.2f} s")
