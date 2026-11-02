"""Efectos de sonido realistas con ElevenLabs (POST /v1/sound-generation) → assets/sfx/<nombre>.mp3.
Clave: la añade el entorno a api.elevenlabs.io; si no, ELEVENLABS_API_KEY o ELEVENLABS_KEY_FILE (fuera del repo)."""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {     # uno por suceso; en compose_eco.py se recortan a lo que dura cada cosa (con fundido) y no queda nada sonando de fondo
    "subida": ("rising shimmering golden whoosh, bright and short, upward motion, no music", 1.2),
    "resbalan": ("many small wooden toy figures sliding down a metal ramp and tumbling, clattering", 1.6),
    "monton": ("small wooden figures piling up and clattering on a marble surface", 0.8),
    "panel": ("split-flap departure board flipping letters quickly, mechanical clatter", 0.8),
    "monedas_caen": ("handful of gold coins dropping onto a wooden desk and piling, metallic clinks", 0.9),
    "embudo": ("gold coins sliding into a metal funnel, metallic rattling swirl", 1.0),
    "moneda_sola": ("single gold coin dropping and spinning briefly on a wooden desk", 0.8),
    "whoosh": ("fast smooth cinematic camera whoosh, short airy swish, clean", 0.6),
    "whoosh_largo": ("smooth cinematic whoosh flying across a large hall, airy, clean ending", 1.2),
    "precio_sube": ("mechanical counter ticking up quickly then a soft cash register bell", 0.8),
    "pantalla": ("computer monitor turning on, short electronic blip", 0.5),
    "barras": ("short rising electronic blips, data bars appearing", 0.6),
    "caida": ("descending electronic tone, crash warning, short", 0.7),
    "rotulador": ("marker pen writing quickly on a glass board, squeaky strokes", 1.0),
    "puntos": ("soft quick digital pops appearing one after another", 0.8),
    "linea": ("smooth electronic sweep as a line draws across a screen", 0.7),
    "torre": ("building blocks stacking up quickly, light rhythmic clicks rising", 0.9),
    "medalla": ("heavy gold medal clink on a stone pedestal, resonant", 0.6),
    "giro": ("short metallic swish of a medal turning around", 0.5),
    "burbuja": ("soap bubble slowly inflating, soft airy stretching sound", 1.0),
    "pop": ("soap bubble popping, crisp wet pop", 0.5),
    "cajero": ("coins clinking into a glass jar one by one", 1.0),
    "impacto": ("low deep cinematic impact hit, short, no music", 0.8),
    "brillo": ("soft warm magical chime shimmer, short and gentle, no music", 1.0),
    "humo": ("puff of smoke dissipating, soft airy whoosh", 1.0),
    "ding": ("soft bright positive notification ding, single, clean", 0.6),
    "tecla": ("soft subtle interface click", 0.5),
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
