"""Efectos nuevos de ElevenLabs para el anuncio de kiriaai.com (el resto, de projects/lanzamiento/assets/sfx; compose_promo.py los recorta).
Uso: ELEVENLABS_KEY_FILE=/ruta/fuera/del/repo python3 sfx_eleven.py [--force]   → assets/sfx/<nombre>.mp3"""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {
    "scroll": ("fast phone screen swipe whoosh, short airy flick", 0.5),
    "caida": ("object falling away into a deep void, descending whoosh fading out", 1.0),
    "frenazo": ("sudden hard stop, short mechanical brake thud with a tiny wobble", 0.6),
    "focos": ("big studio lights switching on, heavy clunk and soft electrical hum", 0.9),
    "rebobina": ("VHS tape rewinding fast, mechanical whir with high pitch squeal, rewind sound effect", 1.2),
    "cuenta": ("fast digital counter numbers ticking up, rising electronic blips", 1.4),
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
