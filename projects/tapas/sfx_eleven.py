"""Efectos nuevos de ElevenLabs para «La tapa gratis no existe» (el resto, de otros vídeos del canal: ver SFX_DIRS en
compose_tapas.py, que los recorta y los coloca en su instante).
Uso: python3 sfx_eleven.py [--force] [nombres…]   → assets/sfx/<nombre>.mp3   (la clave la pone el proxy o ELEVENLABS_KEY_FILE, fuera del repo)"""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {
    "etiqueta": ("crisp loud snap of a stiff cardboard card tearing in half, close up, clean, then two small pieces tapping onto wood", 0.8),
    "caja": ("vintage brass cash register: bell ding, drawer sliding open and a few coins jingling", 1.2),
    "vaso_gigante": ("huge glass appearing with a bright resonant crystal ring and a soft swoosh", 1.0),
    "vierte": ("short clear splash of liquid poured into a large glass, close up, loud and clean", 0.8),
    "tubo": ("continuous liquid flowing fast through a pipe, steady gurgling stream for the whole duration, fizzing", 1.6),
    "llena": ("beer pouring from a tap into a large glass, foamy fizz rising", 1.2),
    "ronda": ("a glass of beer and a small ceramic plate slid across a wooden bar counter, stopping with a soft clink", 0.8),
    "sal": ("salt sprinkled from a shaker onto a plate of food, fine crystalline grains falling", 1.2),
    "medidor": ("gauge rising quickly with a soft rising electronic tone, short, no music", 1.0),
    "trago": ("three quick gulping swallows of a drink, then a glass set down on a wooden counter", 1.0),
    "plato": ("ceramic plate slid along a wooden bar counter and stopping, gentle ceramic scrape and tap", 0.9),
    "vuela": ("small plate spinning up through the air with a rising whoosh", 1.2),
    "letrero": ("a large wooden sign landing in place with a solid wooden clunk, then a warm electric glow humming on", 1.2),
    "pop": ("soft ceramic plop, small object popping up, short, clean", 0.5),
    "whoosh_largo": ("smooth cinematic whoosh flying over a street at night, airy, clean ending", 1.2),
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
        names = [a for a in sys.argv[1:] if not a.startswith("--")]
        for n, s in ex.map(gen, [it for it in SFX.items() if not names or it[0] in names]):
            print(n, s)
