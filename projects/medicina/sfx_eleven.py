"""Efectos de sonido realistas con ElevenLabs (POST /v1/sound-generation) → assets/sfx/<nombre>.mp3.
Clave: la añade el entorno a api.elevenlabs.io; si no, ELEVENLABS_API_KEY o ELEVENLABS_KEY_FILE (fuera del repo)."""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {     # uno por suceso; en compose_med.py se recortan a lo que dura cada cosa (con fundido) y no queda nada sonando de fondo
    "golpe": ("giant rubber reflex hammer slamming onto a stone floor, big deep thud with a short knock, cinematic, no music", 0.9),
    "caen": ("many small ceramic figurines toppling over like dominoes on a stone floor, rapid clattering", 1.2),
    "brillo": ("soft warm magical chime shimmer, short and gentle, no music", 1.0),
    "vitrina": ("glass display case sliding up from the floor and locking with a metallic click", 0.9),
    "candado": ("short electronic denial beep, locked, red light", 0.5),
    "diploma": ("paper scroll unrolling, crisp paper rustle", 0.7),
    "paginas": ("book pages flipping quickly by themselves, paper fluttering", 1.0),
    "huesos": ("plastic skeleton bones clattering, hollow bony clicks", 0.6),
    "vuelan": ("several heavy books flying away fast, quick whooshes and paper flutter", 0.8),
    "negatoscopio": ("x-ray light box flickering on, fluorescent tube ping and soft hum", 0.8),
    "hallazgo": ("sharp bright discovery ping, diagnosis found, short", 0.6),
    "zambullida": ("fast whoosh diving into a sheet of paper, airy rush ending clean", 0.8),
    "pop": ("soft wooden pop, small object placed on a wooden pedestal", 0.5),
    "latido": ("single human heartbeat, deep lub-dub, close, no music", 0.9),
    "microscopio": ("microscope focus knob turning, fine mechanical clicks", 0.6),
    "petri": ("soft organic bubbling, colonies growing, squishy, short", 0.8),
    "pastillas": ("pills rattling in a plastic bottle, quick shake", 0.7),
    "monitor": ("hospital heart monitor beeping twice, clean beeps", 0.8),
    "peluche": ("soft plush toy squeak", 0.5),
    "busca": ("hospital pager beeping, two short tones", 0.6),
    "lapiz": ("pencil scribbling quickly on paper, filling answer bubbles", 1.5),
    "reloj": ("clock ticking very fast, mechanical ticks", 0.9),
    "fallo": ("wrong answer buzzer, short and clear", 0.5),
    "campo": ("thousands of small figurines being set on a table in a fast wave, dense clicking", 1.3),
    "dorado": ("warm rising golden shimmer, short, no music", 0.8),
    "numero": ("single ticket counter ding, your number is called", 0.6),
    "sello": ("heavy rubber stamp slamming on paper", 0.5),
    "escalones": ("footsteps climbing five wooden steps quickly", 1.2),
    "monedas": ("coins dropping onto a wooden desk, small pile", 0.8),
    "guardia": ("pager beeping urgently at night, short repeated beeps", 0.7),
    "libros": ("books stacking one by one on a wooden table, quick thuds in sequence", 1.4),
    "instrumental": ("surgical instruments clinking on a metal tray", 0.6),
    "lampara": ("big surgical lamp switching on, electric clunk", 0.6),
    "teclado": ("computer keyboard typing briefly and a mouse click", 0.6),
    "marcador": ("soft bookmark ribbon swish and a paper click", 0.5),
    "whoosh": ("fast smooth cinematic camera whoosh, short airy swish, clean", 0.6),
    "whoosh_largo": ("smooth cinematic whoosh flying across a large dark hall, airy, clean ending", 1.2),
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
