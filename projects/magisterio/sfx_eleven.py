"""Efectos de sonido realistas con ElevenLabs (POST /v1/sound-generation) → assets/sfx/<nombre>.mp3.
Clave: la añade el entorno a api.elevenlabs.io; si no, ELEVENLABS_API_KEY o ELEVENLABS_KEY_FILE (fuera del repo)."""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {
    "tiza": ("chalk writing and drawing quickly on a school blackboard, close, scratchy strokes, no voices", 2.5),
    "tiza_tachar": ("several quick short chalk strokes crossing out marks on a blackboard, tapping chalk, no voices", 1.6),
    "macarrones": ("handful of dry penne pasta pieces clattering onto a wooden table, light hard clicks, close", 1.2),
    "macarrones_cuenco": ("dry pasta pieces dropping into a ceramic bowl, small clinks and rattles", 1.0),
    "abaco": ("wooden abacus beads sliding along a metal rod and clacking together, two quick slides", 1.2),
    "peonza": ("small wooden spinning top whirring and humming on a wooden table", 2.5),
    "calendario": ("paper wall calendar pages flipped quickly one after another, paper flutter", 1.0),
    "lapiz": ("pencil writing cursive letters on paper, close, soft graphite scratch", 1.2),
    "timbre": ("short electric school bell ring in a hallway, one second", 1.3),
    "madera": ("small wooden toy pieces being placed quickly one after another on a wooden desk, light taps", 1.0),
    "aula": ("quiet empty classroom room tone, soft distant birds outside an open window, very calm", 12.0),
    "ninos": ("distant group of small children chatting softly in a classroom, indistinct, no words", 3.0),
}


def key():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"]
    f = os.environ.get("ELEVENLABS_KEY_FILE")
    return open(f).read().strip() if f and os.path.exists(f) else "x"


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
    with ThreadPoolExecutor(4) as ex:
        for n, s in ex.map(gen, SFX.items()):
            print(n, s)
