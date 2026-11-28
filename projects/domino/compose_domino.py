"""Compone «El efecto dominó» (vídeo SIN VOZ de 21,5 s en blanco, negro y grises, formato «Metáfora visual», engine/FORMATO_METAFORA.md):
fotogramas 3D a 60 fps (out/frames; la frase de arriba ya va en el fotograma) + efectos SOLO de la biblioteca de ElevenLabs del canal
(projects/*/assets/sfx), uno por suceso: el toque del dedo, el golpe de cada ficha contra la siguiente (de un clic diminuto a un golpe seco, cada vez más
grave), la gigante al caer (mazo, portazo y el retumbar), el aire al volver volando. Sin música. Los instantes salen de la misma cuenta que la escena
(web/src/30_domino.js: los arranques de cada ficha en el vídeo; 32_story.js: TT).

    (render → out/frames)
    python3 projects/domino/compose_domino.py [--sfx]   (FRAMES_DIR=… FPS_IN=30 para la vista previa)
"""
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.abspath(os.path.join(ROOT, ".."))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))

FPS, W, H, DUR = int(os.environ.get("FPS_IN", 60)), 1080, 1920, 21.5
N = int(DUR * FPS)
FRAMES = os.environ.get("FRAMES_DIR", os.path.join(ROOT, "out", "frames"))
NDOM, PUSH, D0, DG, LASTFALL = 19, 1.25, 0.32, 1.095, 2.6
V = [PUSH + D0 * (DG ** i - 1) / (DG - 1) for i in range(NDOM)]     # cuándo empieza a caer cada ficha (en el vídeo)
LAND = V[-1] + LASTFALL                                             # cuándo toca el suelo la gigante

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

    put("gafas/tecla", PUSH - 0.04, 0.3, 0.16, 0.12)                                  # la yema toca la primera ficha
    for i in range(1, NDOM):                                                          # cada ficha golpea a la siguiente
        k = i / (NDOM - 1)
        if i < 5:
            name, g, d = ["avion/tap", "lanzamiento/tap"][i % 2], 0.14 + 0.03 * i, 0.3
        elif i < 10:
            name, g, d = "lanzamiento/taco", 0.2 + 0.015 * (i - 5), 0.4
        elif i < 14:
            name, g, d = ["avion/solido", "robo_banco/hormigon"][i % 2], 0.24 + 0.01 * (i - 10), 0.55
        else:
            name, g, d = ["magisterio/impacto", "economia/impacto", "gafas/impacto"][i % 3], 0.26 + 0.015 * (i - 14), 0.8
        put(name, V[i] - 0.03, d, g, 0.15)
    put("lanzamiento/mazo", LAND - 0.03, 1.04, 0.34, 0.3)                            # la gigante contra el suelo
    put("cerradura/portazo", LAND - 0.02, 1.4, 0.26, 0.5)
    put("gta6/edificios", LAND + 0.05, 1.41, 0.2, 0.6)
    put("avion/whoosh_largo", LAND + 0.9, 1.23, 0.16, 0.5)                          # vuelve volando por encima de la cadena
    put("medicina/whoosh_largo", LAND + 1.9, 1.23, 0.12, 0.5)
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "domino.mp4")):
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    sfxp = os.path.join(ROOT, "out", "sfx.wav")
    sfx_track(sfxp)
    cmd = ["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(FRAMES, "f%05d.jpg"), "-i", sfxp, "-filter_complex",
           "[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,volume=1.5dB,alimiter=limit=0.89:level=false,aresample=48000,aformat=channel_layouts=stereo,apad[a]",
           "-map", "0:v", "-map", "[a]", "-frames:v", str(N), "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "10M", "-bufsize", "20M", "-pix_fmt", "yuv420p",
           "-vf", f"scale={W}:{H}:flags=lanczos", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart", dst]
    subprocess.run(cmd, check=True)
    print("vídeo →", dst)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--sfx":
        sfx_track(os.path.join(ROOT, "out", "sfx.wav")); print("arranques", [round(v, 2) for v in V], "cae", round(LAND, 2))
    elif len(sys.argv) > 1:
        main(os.path.join(ROOT, sys.argv[1]))
    else:
        main()
