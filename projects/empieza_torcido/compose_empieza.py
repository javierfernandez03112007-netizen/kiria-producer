"""Compone «Empieza torcido» v2 (blanco, negro y grises; vídeo corto SIN VOZ, formato «Metáfora visual», engine/FORMATO_METAFORA.md):
fotogramas 3D a 60 fps (out/frames, la frase de arriba ya va en el fotograma) + efectos SOLO de la biblioteca de ElevenLabs del canal
(projects/*/assets/sfx), uno por suceso y en su instante exacto (los tiempos salen de web/src/32_story.js y 35_anim.js). Sin música: si Javi quiere
canción, la pone al subirlo desde la biblioteca de la red social (con derechos).

    (render → out/frames)
    python3 projects/empieza_torcido/compose_empieza.py [--sfx]
"""
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.abspath(os.path.join(ROOT, ".."))
sys.path.insert(0, os.path.join(ROOT, "..", ".."))

FPS, W, H, DUR = 60, 1080, 1920, 8.0
N = int(DUR * FPS)
FRAMES = os.path.join(ROOT, "out", "frames")
# los mismos tiempos que la escena (32_story.js: TT; 35_anim.js: launchT/landT)
TT = dict(crack=1.25, look=1.5, stand=2.0, place=2.5, step0=2.68, fly0=2.72, fly1=4.95, push=5.2, open=5.38, walk0=5.55, walk1=6.45)
FLY, NB = 0.38, 7


def land(k):
    return TT["fly0"] + (TT["fly1"] - FLY - TT["fly0"]) * (k / (NB - 1)) ** 0.82 + FLY


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

    put("cerradura/rasca_larga", 0.0, 1.4, 0.13, 0.45)                    # pule el cubo (empieza en el 0: al volver a empezar suena igual)
    put("cerradura/puerta_abre", TT["crack"] - 0.05, 0.55, 0.18, 0.3)     # la puerta se entreabre…
    put("magisterio/brillo", TT["crack"] + 0.05, 1.0, 0.22, 0.4)           # …y le cae el rayo de luz
    put("avion/solido", TT["place"] - 0.03, 0.5, 0.3, 0.15)               # deja el cubo perfecto: el primer escalón
    for k in range(NB):                                                    # cada bloque tachado que cae en su sitio
        put(["avion/solido", "lanzamiento/solido", "lanzamiento/taco"][k % 3], land(k) - 0.02, 0.4, 0.2 + 0.05 * k / NB, 0.12)
    put("cerradura/puerta_abre", TT["open"] - 0.1, 1.0, 0.3, 0.3)         # abre la puerta
    put("avion/brillo", TT["open"] + 0.05, 1.0, 0.24, 0.4)                # la luz lo inunda
    put("avion/whoosh_largo", TT["open"] + 0.15, 1.2, 0.14, 0.5)
    put("medicina/dorado", TT["walk1"] - 0.1, 0.85, 0.2, 0.4)             # en el umbral
    sfx.write(path, out, drive=1.0, level=0.9)


def main(dst=os.path.join(ROOT, "out", "empieza_torcido.mp4")):
    missing = [i for i in range(N) if not os.path.exists(os.path.join(FRAMES, f"f{i:05d}.jpg"))]
    if missing:
        sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
    sfxp = os.path.join(ROOT, "out", "sfx.wav")
    sfx_track(sfxp)
    cmd = ["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(FRAMES, "f%05d.jpg"), "-i", sfxp, "-filter_complex",
           "[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo,apad[a]",
           "-map", "0:v", "-map", "[a]", "-frames:v", str(N), "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "9M", "-bufsize", "18M", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart", dst]
    subprocess.run(cmd, check=True)
    print("vídeo →", dst)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--sfx":
        sfx_track(os.path.join(ROOT, "out", "sfx.wav"))
    else:
        main()
