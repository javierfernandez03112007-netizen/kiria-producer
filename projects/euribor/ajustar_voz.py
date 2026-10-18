"""Alarga algunas pausas entre frases (los datos respiran) sin tocar la voz.
Uso: python3 ajustar_voz.py   (lee assets/voz_original.mp3 y tiempos_original.json → assets/voz.mp3)"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
SR = 44100
# segundos extra de silencio tras cada frase (índice 1..14)
EXTRA = {1: 0.5, 2: 0.45, 3: 0.3, 4: 0.3, 6: 0.3, 7: 0.45, 8: 0.4, 9: 0.45, 10: 0.3, 12: 0.3}


def main():
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", os.path.join(ROOT, "assets", "voz_original.mp3"), "-ac", "1",
                          "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    lines = json.load(open(os.path.join(ROOT, "tiempos_original.json")))
    parts, pos = [], 0
    for i, ln in enumerate(lines[:-1], 1):
        cut = int((ln["end"] + lines[i]["start"]) / 2 * SR)   # mitad de la pausa
        parts.append(x[pos:cut])
        if i in EXTRA:
            parts.append(np.zeros(int(EXTRA[i] * SR), np.float32))
        pos = cut
    parts.append(x[pos:])
    y = np.concatenate(parts)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(ROOT, "assets", "voz.mp3")], input=y.tobytes(), check=True)


if __name__ == "__main__":
    main()
