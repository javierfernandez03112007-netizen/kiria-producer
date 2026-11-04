"""Efectos de sonido realistas con ElevenLabs (POST /v1/sound-generation) → assets/sfx/<nombre>.mp3.
Clave: la añade el entorno a api.elevenlabs.io; si no, ELEVENLABS_API_KEY o ELEVENLABS_KEY_FILE (fuera del repo)."""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {     # uno por suceso; en compose_lan.py se recortan a lo que dura cada cosa (con fundido) y no queda nada sonando de fondo
    "estallido": ("smartphone screen glass bursting outward in slow motion, crystalline shards scattering, airy whoosh, no music", 1.3),
    "cifra": ("single solid punchy thud of a heavy plastic letter snapping into place, short and tight, no reverb", 0.5),
    "notificaciones": ("fast rising stream of tiny digital pops and sparkles, many notifications pouring in, bright, no music", 1.2),
    "dias": ("seven quick little wooden tiles flipping one after another, tick tick tick, crisp", 0.8),
    "cae": ("heavy object falling fast through the air, short descending whistle and whoosh", 0.9),
    "camara_suelo": ("heavy vintage film camera dropped on a stone floor, solid metallic clunk with a short rattle", 0.8),
    "glitch": ("digital glitch dissolve, short electric crackle fading into a soft hum", 0.7),
    "laser": ("swirl of thin laser lines zipping together, futuristic swoosh converging", 0.7),
    "tarjeta": ("paper price tag flicked into place, light card snap", 0.5),
    "voltea": ("card flipping over quickly, soft paper whip", 0.5),
    "pantalla": ("object diving into a liquid digital screen, soft bloop with a watery ripple", 0.7),
    "papel": ("sheet of paper sliding quickly out of a printer, paper rustle", 0.8),
    "teclea": ("fast typewriter typing a short line, crisp keys, no bell", 1.0),
    "marcador": ("highlighter marker swiped across paper, squeaky felt tip stroke", 0.5),
    "cronometro": ("stopwatch button click and one single tick", 0.5),
    "onda": ("soft electronic shimmer rising, audio visualizer switching on, airy and clean", 0.8),
    "construye": ("futuristic laser scanner building a 3d object line by line, quick digital scanning", 1.4),
    "solido": ("soft deep whoomp of a hologram turning solid, satisfying pop", 0.6),
    "taco": ("wooden block placed on a desk, soft knock", 0.5),
    "tension": ("slow tension rising whoosh with a small wooden creak, suspense, short", 1.4),
    "mazo": ("loud courtroom gavel strike on a wooden sound block, sharp crack with a deep thump, short room echo", 1.0),
    "palabra": ("rubber block dropped onto a stack of wooden blocks, short soft thud", 0.5),
    "ping": ("single clean bright ping, like a small tuning bell, short", 0.6),
    "whoosh": ("fast smooth cinematic camera whoosh, short airy swish, clean", 0.6),
    "asoma": ("small playful wobble, a card wiggling, subtle springy boing", 0.6),
    "sale": ("quick pop and slide out, soft whoosh", 0.5),
    "tictac": ("fast clock ticking, stopwatch running quickly", 1.0),
    "caja": ("cash register cha-ching with coins pouring into a jar", 1.3),
    "desliza": ("card sliding out from behind another card, quick swish", 0.5),
    "precio": ("bright positive pop with a small coin clink", 0.5),
    "absorbe": ("two objects quickly sucked into a phone screen, reverse swoosh", 0.6),
    "tap": ("smartphone screen tap, soft modern user interface click", 0.5),
    "toldo": ("fabric shop awning unrolling quickly, canvas flap", 0.7),
    "burbuja": ("speech bubble popping up, soft clean pop", 0.5),
    "teclas": ("five quick soft phone keyboard taps", 0.6),
    "enviado": ("message sent, soft modern swoosh notification", 0.6),
    "contador": ("fast digital counter ticking up quickly, numbers rolling on a screen, short and clean", 1.0),
    "vuelve": ("reverse whoosh building up quickly, rushing air sucked back, clean ending", 0.8),
    # versión larga: «prueba tu objeto en 3D» y el enlace por privado
    "corazon": ("cute soft pop of a like heart appearing on a phone screen with a tiny sparkle, short", 0.5),
    "estira": ("phone screen stretching wide like elastic, smooth rubbery stretch ending in a soft snap, short", 0.6),
    "mensaje": ("incoming direct message notification on a phone, two soft bright chimes, modern, short", 0.6),
    "avion": ("paper airplane gliding fast through the air, light papery flutter and swoosh", 1.2),
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
    os.makedirs(os.path.join(ROOT, "assets", "sfx"), exist_ok=True)
    with ThreadPoolExecutor(4) as ex:
        for n, s in ex.map(gen, SFX.items()):
            print(n, s)
