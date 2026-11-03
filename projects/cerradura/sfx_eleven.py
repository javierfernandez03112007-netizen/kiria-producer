"""Efectos de sonido realistas con ElevenLabs (POST /v1/sound-generation) → assets/sfx/<nombre>.mp3.
Clave: la añade el entorno a api.elevenlabs.io; si no, ELEVENLABS_API_KEY o ELEVENLABS_KEY_FILE (fuera del repo)."""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {     # uno por suceso; en compose_cer.py se recortan a lo que dura cada cosa (con fundido) y no queda nada sonando de fondo
    "puerta_vuela": ("heavy wooden front door swinging shut very fast, strong air whoosh, no music", 1.2),
    "portazo": ("heavy apartment front door slammed shut, loud wooden bang with a metallic latch snap, short hallway echo", 1.4),
    "lamina": ("flexible plastic x-ray film sheet being bent and flicked, crisp plastic flex", 0.9),
    "rasca": ("plastic card pushed into a door gap, scraping against a brass door latch", 1.0),
    "clic_abre": ("door latch clicking back and the door creaking open slightly", 1.0),
    "zambullida": ("fast whoosh diving into a tiny dark metal tunnel, airy rush ending clean", 0.8),
    "metal": ("deep metallic resonance inside a brass lock mechanism, soft reverb tail, short, no music", 1.3),
    "blip": ("short soft digital interface blip", 0.5),
    "pitones": ("five tiny brass pins tapping one after another, precise little metallic clicks", 0.8),
    "muelles": ("tiny steel springs compressing and boinging softly", 0.6),
    "bloqueo": ("locked door knob rattled hard, lock cylinder jammed, short metallic rattle", 0.8),
    "denegado": ("short low error buzz, access denied", 0.5),
    "llave_entra": ("metal key sliding slowly into a pin tumbler lock, clicking over each pin", 2.0),
    "alineado": ("satisfying soft metallic click with a tiny bright ding, everything aligned", 0.7),
    "giro_llave": ("key turning twice in a door lock cylinder, deadbolt sliding out with two solid clunks", 2.0),
    "acero": ("steel bar ringing, bright metallic shing, short", 0.7),
    "whoosh": ("fast smooth cinematic camera whoosh, short airy swish, clean", 0.6),
    "whoosh_largo": ("smooth cinematic whoosh flying over a dark town at night, airy, clean ending", 1.2),
    "resbalon": ("spring loaded door latch clicking in and out, small brass clack", 0.6),
    "abre_puerta": ("door handle pressed and the door pulled open, latch retracting, soft creak", 0.9),
    "portazo2": ("door slammed shut, wooden bang with the latch snapping into the strike plate", 1.0),
    "aviso": ("low ominous single synth hit, warning tone, short, no music", 0.8),
    "flex": ("flexible plastic sheet bending and wobbling, wobbly plastic thunder sheet sound, short", 1.0),
    "rasca_larga": ("plastic film slowly pushing a spring door latch back, scraping on brass, tense", 3.0),
    "alarmas": ("many distant house burglar alarms starting at once at night, dogs barking far away", 2.2),
    "clunk": ("heavy steel deadbolt clunk, solid and short", 0.6),
    "choca": ("plastic sheet pushed hard against solid steel and bending, crinkling plastic", 1.0),
    "dos_vueltas": ("key turning twice in a front door lock, two heavy deadbolt clunks, slow and clear", 2.3),
    "abre_llave": ("key turned back twice quickly, deadbolt retracting", 0.9),
    "puerta_abre": ("front door yanked open fast, swinging with a whoosh", 1.0),
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
