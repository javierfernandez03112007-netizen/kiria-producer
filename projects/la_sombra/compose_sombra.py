"""Compone «La sombra» (vídeo SIN VOZ de 21 s en blanco, negro y grises, formato «Metáfora visual», engine/FORMATO_METAFORA.md):
fotogramas 3D a 60 fps (out/frames; la frase de arriba ya va en el fotograma) + efectos SOLO de la biblioteca de ElevenLabs del canal
(projects/*/assets/sfx), uno por suceso y en su instante: la llama, el sobresalto, los pasos atrás, la sombra que crece, el corazón (rápido con el miedo,
lento al calmarse), los pasos hacia la pared (uno por pisada, calculadas con la misma curva que la escena) y el latido al tocar la pared. Sin música.

    (render → out/frames)
    python3 projects/la_sombra/compose_sombra.py [--sfx]
"""
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.abspath(os.path.join(ROOT, ".."))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))

FPS, W, H, DUR = 60, 1080, 1920, 21.0
N = int(DUR * FPS)
FRAMES = os.path.join(ROOT, "out", "frames")
# los mismos tiempos que la escena (web/src/32_story.js: TT; 35_anim.js: walkS, backS; 23_walk.js: STRIDE)
TT = dict(startle=2.4, back0=2.65, back1=4.45, cower0=4.3, cower1=7.5, rise0=7.5, rise1=9.6, walk0=10.5, walk1=17.3, hand0=17.65, touch=18.8)
STRIDE, WALK_AMP, BACK_AMP = 1.05, 0.85, 0.45
WALK_D = float(np.hypot(0.16 - (-1.17), -2.62 - 1.6))


def mono(t, T, Y):                                # la misma interpolación monótona (Fritsch–Carlson) que 01_common.js
    n = len(T)
    if t <= T[0]:
        return Y[0]
    if t >= T[-1]:
        return Y[-1]
    i = 0
    while t > T[i + 1]:
        i += 1
    d = lambda k: (Y[k + 1] - Y[k]) / (T[k + 1] - T[k])
    hh = lambda k: T[k + 1] - T[k]

    def m(k):
        if k <= 0 or k >= n - 1:
            return 0
        a, b = d(k - 1), d(k)
        if a * b <= 0:
            return 0
        h0, h1 = hh(k - 1), hh(k)
        return 3 * (h0 + h1) / ((2 * h1 + h0) / a + (h1 + 2 * h0) / b)
    h = hh(i); u = (t - T[i]) / h; u2 = u * u; u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * Y[i] + (u3 - 2 * u2 + u) * h * m(i) + (-2 * u3 + 3 * u2) * Y[i + 1] + (u3 - u2) * h * m(i + 1)


def walk_s(t):
    T = TT
    return mono(t, [T["walk0"], T["walk0"] + 0.95, T["walk0"] + 1.5, T["walk1"] - 0.7, T["walk1"]], [0, 0.4, 0.45, WALK_D - 0.3, WALK_D])


def back_s(t):
    return mono(t, [TT["back0"], TT["back0"] + 0.8, TT["back0"] + 1.05, TT["back1"]], [0, 0.22, 0.24, 0.47])


def footfalls(sfun, t0, t1, scale):               # instantes en que la fase cruza un medio ciclo (cada pisada)
    out, last = [], 0
    for t in np.arange(t0, t1, 1 / 600):
        k = int(np.floor(abs(sfun(t)) / scale * 2))
        if k > last:
            out.append(float(t)); last = k
    return out


_CACHE = {}


def sample(name, sr):                             # mono, sin el silencio del principio, pico a 0,5
    if name not in _CACHE:
        proj, n = name.split("/")
        raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(PROJ, proj, "assets", "sfx", n + ".mp3"), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.float32).astype(np.float64)
        x = x / (np.abs(x).max() + 1e-9) * 0.5
        on = np.flatnonzero(np.abs(x) > 0.02)
        _CACHE[name] = x[max(0, on[0] - int(0.004 * sr)):] if len(on) else x
    return _CACHE[name]


def sfx_track(path):
    from engine import sfx
    sr = sfx.SR
    out = np.zeros(int((DUR + 0.5) * sr))

    def put(name, t0, dur, g=1.0, fade=0.08, start=0.0):
        x = sample(name, sr)
        x = x[int(start * sr):][:max(1, int(dur * sr))].copy()
        fi = min(len(x), int(0.004 * sr)); x[:fi] *= np.linspace(0, 1, fi)
        fo = min(len(x), int(fade * sr)); x[len(x) - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
        sfx.mix(out, x, max(0.0, t0), g)

    T = TT
    put("gafas/quemar", 0.0, 0.84, 0.08, 0.5)                                  # la llama del farol
    put("lanzamiento/tension", T["startle"] - 0.05, 1.4, 0.2, 0.5)            # el susto
    put("medicina/latido", T["startle"] + 0.05, 0.6, 0.26, 0.2)
    for tf in footfalls(back_s, T["back0"], T["back1"] + 0.2, STRIDE * BACK_AMP) + [T["back1"] - 0.08]:   # dos pasos atrás (el segundo, al apoyar del todo)
        put("robo_banco/pasos", tf - 0.02, 0.3, 0.14, 0.12)
    put("quimica/crece", T["cower0"] - 0.1, 1.8, 0.18, 0.6)                   # la sombra crece y se le echa encima
    for tb in (4.85, 5.45, 6.0, 6.55, 7.1):                                  # el corazón, deprisa
        put("medicina/latido", tb, 0.5, 0.22, 0.15)
    for tb in (7.9, 8.85, 9.85):                                             # se calma
        put("medicina/latido", tb, 0.55, 0.17 - 0.03 * (tb > 9), 0.2)
    put("avion/aire", T["rise1"] + 0.2, 0.84, 0.1, 0.4)                      # respira
    for i, tf in enumerate(footfalls(walk_s, T["walk0"], T["walk1"] + 0.3, STRIDE * WALK_AMP)):   # los pasos hacia la pared
        put("robo_banco/pasos", tf - 0.02, 0.3, 0.12 + 0.02 * (i % 2), 0.12)
    put("avion/vuelve", T["walk0"] + 2.6, 0.84, 0.08, 0.4)                   # la sombra encoge
    put("magisterio/latido", T["touch"] - 0.02, 0.63, 0.22, 0.25)            # toca la pared: la mano de su sombra
    put("avion/ding", T["touch"] + 0.05, 0.84, 0.14, 0.5)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "la_sombra.mp4")):
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    sfxp = os.path.join(ROOT, "out", "sfx.wav")
    sfx_track(sfxp)
    cmd = ["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(FRAMES, "f%05d.jpg"), "-i", sfxp, "-filter_complex",
           "[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo,apad[a]",
           "-map", "0:v", "-map", "[a]", "-frames:v", str(N), "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-maxrate", "10M", "-bufsize", "20M", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart", dst]
    subprocess.run(cmd, check=True)
    print("vídeo →", dst)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--sfx":
        sfx_track(os.path.join(ROOT, "out", "sfx.wav"))
        print("pasos atrás:", [round(x, 2) for x in footfalls(back_s, TT["back0"], TT["back1"] + 0.2, STRIDE * BACK_AMP)])
        print("pasos a la pared:", [round(x, 2) for x in footfalls(walk_s, TT["walk0"], TT["walk1"] + 0.3, STRIDE * WALK_AMP)])
    else:
        main()
