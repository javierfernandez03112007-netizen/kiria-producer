"""Efectos SOLO de ElevenLabs para «El mayor robo cripto» (uno por suceso; compose_cripto.py los recorta a lo que dura cada cosa).
Uso: ELEVENLABS_KEY_FILE=/ruta/fuera/del/repo python3 sfx_eleven.py [--force]   → assets/sfx/<nombre>.mp3"""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {
    "monedas": ("huge cascade of gold coins clinking and rushing, being sucked away into a vortex with a whoosh", 1.8),
    "llenar": ("many gold coins quickly piling up with bright metallic clinks, short", 1.0),
    "internet": ("digital data connection whoosh with soft electronic blips", 0.9),
    "correo": ("new email notification chime on a laptop, soft and clean", 0.6),
    "llamada": ("video call connecting tone, two soft rising electronic notes", 0.8),
    "glitch": ("short digital glitch distortion burst, computer error", 0.6),
    "espia": ("creepy insect skittering on hard plastic, tiny legs tapping fast", 1.2),
    "espera": ("low ominous suspense drone, quiet and dark", 1.4),
    "salto": ("electric zaps hopping along cables, quick digital jumps", 1.2),
    "alarma": ("bank security alarm siren burst with a warning beep, short", 1.4),
    "reloj": ("fast clock ticking that accelerates, tension", 1.6),
    "estampida": ("massive stream of coins rushing away through metal pipes, clinking and whooshing", 2.4),
    "torre": ("coins stacking rapidly into a tall pile, metallic clinks building up", 1.4),
    "hielo": ("ice freezing and crackling, frost spreading quickly", 1.2),
    "aviso": ("computer warning error beep, alert", 0.6),
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
