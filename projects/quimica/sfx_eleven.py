"""Efectos SOLO de ElevenLabs para «Química vs Ingeniería Química» (uno por suceso; compose_quimica.py los recorta a lo que dura cada cosa).
Uso: ELEVENLABS_KEY_FILE=/ruta/fuera/del/repo python3 sfx_eleven.py [--force]   → assets/sfx/<nombre>.mp3"""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {
    "vidrio": ("large glass test tube shattering, bright glass shards scattering on a lab bench", 1.0),
    "crece": ("huge industrial machinery rising and growing, deep rumble building into a big whoosh", 1.8),
    "gota": ("single drop of liquid falling into a small metal dish, clean plink", 0.5),
    "pregunta": ("short suspenseful tension sting, quick rising synth, ends abruptly", 1.0),
    "check": ("soft clean user interface tick, positive confirm, very short", 0.5),
    "sello": ("rubber stamp slammed on paper on a wooden desk, sharp thud", 0.5),
    "burbujas": ("liquid bubbling and fizzing in a glass flask in a laboratory", 1.2),
    "molecula": ("magical sparkle shimmer with soft glass clinks, small pieces snapping together", 0.9),
    "tubo": ("liquid pouring into a glass test tube, gentle glug", 0.9),
    "papel": ("sheet of paper whooshing through the air", 0.7),
    "fabrica": ("large chemical plant ambience, steam hiss and industrial machinery hum", 3.0),
    "reactor": ("heavy electric motor starting up and an industrial mixer churning inside a steel tank", 1.0),
    "vapor": ("pressurized steam release hiss from a valve, short", 0.9),
    "tuberias": ("liquid rushing through metal pipes, flowing, industrial", 1.8),
    "camion": ("heavy tanker truck diesel engine accelerating away on a road", 2.4),
    "ok": ("two-note positive chime, short and clean", 0.5),
    "contador": ("fast digital counter ticking up quickly, numbers rolling, short and clean", 1.0),
    "caja": ("cash register ka-ching, short", 0.7),
    "apagado": ("industrial machines powering down, descending hum then silence", 1.0),
    "encendido": ("industrial machines powering up with a rising hum and lights switching on", 1.2),
    "duelo": ("deep cinematic boom hit with a short dark reverb tail", 1.4),
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
