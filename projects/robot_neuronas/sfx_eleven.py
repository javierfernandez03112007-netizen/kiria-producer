"""Efectos nuevos de ElevenLabs para «El perro robot con neuronas humanas» (el resto, de otros vídeos del canal: ver SFX_DIRS en
compose_robot.py, que los recorta y los coloca en su instante).
Uso: python3 sfx_eleven.py [--force]   → assets/sfx/<nombre>.mp3   (la clave la pone el proxy o ELEVENLABS_KEY_FILE, fuera del repo)"""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {
    "pasos": ("small quadruped robot dog walking on a hard floor, soft rhythmic light metallic footsteps with tiny servo whirs, steady trot", 3.0),
    "servo": ("single short robotic servo motor whir, precise small actuator movement", 0.6),
    "zumbido": ("soft bioelectric hum with faint organic crackles of living neurons, eerie, quiet and close", 2.0),
    "crecen": ("organic tendrils growing quickly, soft stretching with a sparkling magical shimmer", 1.5),
    "estimulo": ("rapid rhythmic electrical stimulation pulses, crisp tiny zaps from a laboratory electrode", 2.0),
    "respuesta": ("burst of crackling neural spikes like a geiger counter suddenly accelerating, small electric pops", 1.2),
    "dibujo": ("glowing laser line drawing a map outline on the floor, smooth rising digital trace with shimmer", 1.2),
    "picado": ("fast camera dive straight down, deep quick whoosh", 0.8),
    "sube": ("swift upward whoosh rising high into the air, airy and smooth", 1.0),
    "programa": ("computer code being typed fast, light keyboard clicks with soft digital blips", 1.2),
    "flecha": ("short sci-fi interface swoosh ending in a soft digital click", 0.5),
    "objetivo": ("target lock-on, sci-fi beeps that speed up and end in a confirmation tone", 1.0),
    "llegada": ("soft positive electronic success chime, arrival", 0.8),
    "ojo": ("dramatic deep cinematic hit with a short low boom", 0.8),
    "cerebro": ("ethereal holographic shimmer swelling up, deep warm hum with sparkling glitter", 1.8),
    "despiece": ("mechanical robot parts separating and floating apart, servo slides and small metallic clicks", 1.0),
    "monta": ("mechanical robot parts snapping back together, firm metallic clunks", 0.6),
    "pong": ("retro 8-bit arcade video game blips, two-tone paddle hits bouncing back and forth", 1.2),
    "disparo": ("retro 8-bit video game shotgun blast echoing in a stone corridor", 0.7),
    "mira": ("robot head turning with a smooth servo whir ending in a soft curious beep", 0.9),
    "estatica": ("short digital static glitch burst on an old screen", 0.6),
}


def key():
    f = os.environ.get("ELEVENLABS_KEY_FILE")
    return open(f).read().strip() if f and os.path.exists(f) else os.environ.get("ELEVENLABS_API_KEY", "x")


def gen(item):
    name, (text, d) = item
    out = os.path.join(ROOT, "assets", "sfx", name + ".mp3")
    if os.path.exists(out) and "--force" not in sys.argv:
        return name, "ya estaba"
    r = requests.post("https://api.elevenlabs.io/v1/sound-generation", headers={"xi-api-key": key()},
                      json={"text": text, "duration_seconds": d, "prompt_influence": 0.5}, timeout=180)
    if r.status_code != 200:
        return name, f"error {r.status_code}: {r.text[:200]}"
    open(out, "wb").write(r.content)
    return name, f"{len(r.content) // 1024} KB"


if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "assets", "sfx"), exist_ok=True)
    with ThreadPoolExecutor(3) as ex:
        for n, s in ex.map(gen, SFX.items()):
            print(n, s)
