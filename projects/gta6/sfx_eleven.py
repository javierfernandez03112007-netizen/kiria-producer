"""Efectos nuevos de ElevenLabs para «GTA 6 ocupa 212 gigas» (el resto, de otros vídeos del canal: ver SFX_DIRS en
compose_gta.py, que los recorta y los coloca en su instante).
Uso: python3 sfx_eleven.py [--force] [nombres…]   → assets/sfx/<nombre>.mp3   (la clave la pone el proxy o ELEVENLABS_KEY_FILE, fuera del repo)"""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {
    "subida": ("glowing glass column rising fast out of a phone, digital whoosh with a crystalline hum swelling", 2.4),
    "edificios": ("many small toy buildings popping up quickly one after another, light wooden pops and clicks", 1.4),
    "raja": ("smartphone glass screen cracking sharply, crisp glass crack close up", 0.8),
    "error": ("short digital error buzz, two quick low beeps", 0.6),
    "whoosh_ciudad": ("smooth cinematic whoosh diving down over a miniature city, airy, clean ending", 1.2),
    "contador": ("digital counter rolling up quickly and stopping with a solid digital thunk", 1.3),
    "discos": ("hundreds of small plastic discs raining down and clattering into a pile on a wooden desk", 1.6),
    "columna": ("glass pillar rising from a desk with a smooth electric hum and a soft glass ring at the end", 0.9),
    "fibra": ("fast pulses of light zipping through an optical fiber cable, high pitched electronic zips", 1.6),
    "reloj": ("fast clock ticking time-lapse with a soft rising progress tone", 1.5),
    "codigo": ("digital data chatter, fast computer bleeps and soft keyboard clicks", 1.0),
    "encoge": ("quick shrinking sound, descending cartoon whoop, short", 0.7),
    "luces": ("neon signs and city lights switching on one after another with soft electric buzzes and clicks", 1.2),
    "ciudad": ("short lively miniature city sound burst: distant car horn, engines and people chatter", 1.3),
    "despegar": ("large sticker being peeled off a wall, sticky tearing peel", 0.8),
    "crece": ("deep whoosh with a big swelling inflate, something growing huge in the sky", 1.3),
    "pegar": ("several sheets slapping back onto surfaces, quick flat slaps", 0.7),
    "voz": ("short indistinct murmur of a person talking, a few muffled words", 0.8),
    "radio": ("car radio tuning through stations, static and brief tinny bursts", 1.0),
    "calle": ("busy street sounds: car horns, engines and footsteps, short burst", 1.0),
    "guardar": ("sounds being sucked into a glass container, reverse whoosh ending with a soft click", 1.0),
    "acelera": ("small toy sports car accelerating fast and zooming past", 2.2),
    "descarga": ("a whole miniature city sinking down into a phone, long descending whoosh with digital shimmer", 1.8),
    "ladrillo": ("a single clay brick sliding and stopping with a solid thunk", 0.8),
    "iconos": ("many small app icons popping out of a phone, quick cascade of bubbly pops and whooshes", 1.4),
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
