"""Efectos SOLO de ElevenLabs para «El túnel del Banco Central» (uno por suceso; compose_robo.py los recorta a lo que dura cada cosa).
Uso: ELEVENLABS_KEY_FILE=/ruta/fuera/del/repo python3 sfx_eleven.py [--force]   → assets/sfx/<nombre>.mp3"""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {
    "pico": ("pickaxe striking hard soil and small stones underground, muffled, two quick hits", 0.9),
    "linea": ("fast rising electric whoosh, a line of light racing through a long tunnel", 1.0),
    "regla": ("metal tape measure extending quickly, short metallic zip", 0.6),
    "luces_camara": ("heavy industrial ceiling lights switching on with a loud clunk and a soft electric hum", 1.0),
    "titulo": ("deep cinematic boom hit with a short dark reverb tail, documentary title", 1.4),
    "cartel": ("old shop sign light flickering on, electric buzz, short", 0.8),
    "sello": ("rubber stamp slammed hard on paper on a wooden desk, sharp thud", 0.5),
    "calendario": ("calendar pages flipping fast, paper flutter", 0.8),
    "camion": ("small old pickup truck engine starting and driving away on asphalt at night", 2.4),
    "pala": ("shovel digging into dirt underground, rhythmic scraping, muffled", 1.6),
    "madera": ("wooden beams knocked into place in a tunnel, two hollow wooden knocks", 0.7),
    "bombillas": ("light bulbs switching on one after another, soft clicks with a faint hum", 1.0),
    "ventilador": ("small ventilation fan starting up inside a narrow tunnel, whirring", 1.2),
    "hormigon": ("deep heavy impact on a thick concrete slab, solid low thud, short", 0.8),
    "martillo": ("jackhammer drilling into reinforced concrete underground, gritty, muffled", 3.0),
    "disco": ("diamond saw blade cutting concrete, high pitched grinding whine", 2.0),
    "reloj": ("single old clock ticking slowly in a silent room", 1.2),
    "persiana": ("heavy steel security shutter rolling down and closing with a metallic clang", 1.2),
    "rotura": ("thin concrete layer cracking and breaking, chunks falling onto a wooden floor", 1.2),
    "pasos": ("cautious footsteps on concrete in an empty echoing vault", 1.0),
    "apagado": ("electronic security devices powering down, descending beep then silence", 0.8),
    "fajos": ("stacks of banknotes riffled and handled, paper money flutter", 0.8),
    "chorro": ("many bundles of banknotes sliding and tumbling down a chute, papery rush", 2.4),
    "contador": ("fast digital counter ticking up quickly, numbers rolling, short and clean", 1.0),
    "puerta": ("massive bank vault door unlocking and swinging open, heavy metal mechanism, deep creak", 2.0),
    "sirena": ("distant police siren at night echoing between buildings", 2.4),
    "vuelve": ("reverse whoosh building up quickly, rushing air sucked back, clean ending", 0.8),
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
