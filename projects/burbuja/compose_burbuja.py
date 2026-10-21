"""Une los fotogramas 3D (out/frames) con los efectos de sonido (out/sfx.wav) en out/burbuja.mp4.

    python3 plan.py
    node web/capture.mjs out/frames --range 0 <N> <w> 4     (4 procesos en paralelo)
    python3 compose_burbuja.py
"""
import json
import math
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
N = math.ceil(json.load(open(os.path.join(ROOT, "timeline.json")))["end"] * 30)
FR = os.path.join(ROOT, "out", "frames")
missing = [i for i in range(N) if not os.path.exists(os.path.join(FR, f"f{i:05d}.jpg"))]
if missing:
    sys.exit(f"faltan {len(missing)} fotogramas (p. ej. {missing[:5]})")
dst = os.path.join(ROOT, "out", "burbuja.mp4")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "30", "-i", os.path.join(FR, "f%05d.jpg"), "-i", os.path.join(ROOT, "out", "sfx.wav"),
                "-frames:v", str(N), "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
                "-af", "loudnorm=I=-15:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", dst], check=True)
print("vídeo →", dst)
