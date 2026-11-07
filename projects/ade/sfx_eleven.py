"""Efectos nuevos de ElevenLabs para «ADE no tiene salidas» (el resto, de otros vídeos del canal: ver SFX_DIRS en
compose_ade.py, que los recorta y los coloca en su instante).
Uso: python3 sfx_eleven.py [--force]   → assets/sfx/<nombre>.mp3   (la clave la pone el proxy o ELEVENLABS_KEY_FILE, fuera del repo)"""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {
    "papeles": ("hundreds of paper sheets fluttering down from above and landing on a stone floor, soft continuous rustling paper rain", 3.2),
    "papeles_vuelan": ("a flurry of paper sheets whooshing through the air and slapping down one after another onto a neat growing stack", 1.6),
    "letrero_off": ("old fluorescent exit sign buzzing, flickering twice and switching off with a click", 0.9),
    "letrero_on": ("fluorescent tube signs flickering on one after another with soft electric buzz and clicks", 1.0),
    "holograma": ("transparent hologram column rising up with a smooth shimmering digital whoosh", 0.9),
    "fichas": ("many small ceramic game pieces popping up onto a table at once, light quick clatter", 1.0),
    "marcha": ("crowd of tiny ceramic figurines hopping quickly across a stone floor, rapid light tapping, small crowd moving forward", 2.6),
    "ascensor": ("glass elevator gliding upward with a soft smooth hum and gentle chime dings passing floors", 3.4),
    "birretes": ("several small graduation caps falling and clattering lightly on a hard floor", 1.0),
    "multitud": ("large crowd of tiny figurines shuffling and hopping in quickly, dense rapid tapping getting closer", 3.0),
    "escalera": ("aluminium ladder placed against a wall with a metallic clank", 0.6),
    "escalera_cae": ("aluminium ladder tipping over and crashing onto a stone floor, metallic clatter", 1.1),
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
