"""Efectos de sonido realistas con ElevenLabs (POST /v1/sound-generation) → assets/sfx/<nombre>.mp3.
Clave: la añade el entorno a api.elevenlabs.io; si no, ELEVENLABS_API_KEY o ELEVENLABS_KEY_FILE (fuera del repo)."""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {     # uno por suceso; en compose_gafas.py se recortan a lo que dura cada cosa (con fundido) y no queda nada sonando de fondo
    "congelar": ("time freeze effect: a sharp whoosh that suddenly stops into a crystalline icy shimmer, cinematic, no music", 1.2),
    "rayo": ("warm bright sunbeam shimmer descending, soft magical swoosh, short, no music", 1.0),
    "rebote": ("light ray bouncing off snow, crisp sparkling ping that rises, short, no music", 0.8),
    "whoosh": ("fast smooth cinematic camera whoosh, short airy swish, clean", 0.6),
    "whoosh_largo": ("smooth cinematic whoosh flying through cold mountain air, airy, clean ending", 1.2),
    "cambio": ("glass lens changing color, short glassy shimmer swish, crisp", 0.6),
    "tecla": ("soft subtle interface click", 0.5),
    "prisma": ("crystal prism chime as light splits into colors, sparkling glassy shimmer, short, no music", 1.2),
    "ultravioleta": ("low eerie electric hum swelling, short, ultraviolet glow, sci-fi, no music", 1.0),
    "contador": ("fast digital counter ticking up then stopping, short", 0.7),
    "quemar": ("short searing electric sizzle, intense hiss, no music", 0.8),
    "desmontar": ("mechanical device popping apart piece by piece, crisp loud plastic snaps and clicks in quick sequence, close up", 1.0),
    "clic": ("soft glassy click, single, clean", 0.5),
    "frenar": ("energy absorbed into thick glass, short muffled thud with a fading buzz", 0.6),
    "onda": ("smooth oscillating electronic wave, gentle sweep, short", 1.0),
    "rejilla": ("metal grille sliding into place, short metallic clank", 0.6),
    "bloqueo": ("light beam slamming into a shield and stopping, short deep thud with electric crackle", 0.7),
    "aire": ("soft airy breath whoosh, gentle, clean", 0.8),
    "vaho": ("condensation evaporating off glass, soft fading sizzle, airy", 1.0),
    "cierre": ("plastic ski goggle parts snapping together quickly, satisfying click sequence", 0.8),
    "fotones": ("rain of tiny glassy pings hitting a window, soft and fast", 2.0),
    "ding": ("bright glass bell ding, single clear tone with a short ring", 0.8),
    "nubes": ("low soft wind gust over a snowy mountain, overcast, short", 1.4),
    "barrido": ("glass lens sliding into place with a bright shimmering sweep, short", 0.8),
    "brillo": ("soft warm magical chime shimmer, short and gentle, no music", 1.0),
    "duelo": ("two objects swooshing into place one after the other, quick double swish", 0.8),
    "panel": ("short digital display flip, soft electronic blip", 0.5),
    "impacto": ("low deep cinematic impact hit, short, no music", 0.8),
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
