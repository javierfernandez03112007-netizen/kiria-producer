"""Efectos de ElevenLabs para «Así funciona: el microondas» (uno por suceso; compose_microondas.py los recorta y los coloca en su instante).
Uso: python3 sfx_eleven.py [--force] [nombres…]   → assets/sfx/<nombre>.mp3   (la clave la pone el proxy o ELEVENLABS_KEY_FILE, fuera del repo)"""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {
    "micro_on": ("microwave oven starting: door latch already closed, a soft beep then the low steady electric hum and the turntable motor whirring, close up", 2.2),
    "estallido": ("superheated water suddenly erupting from a mug: violent bubbling burst, liquid splash and a sharp hiss of steam, close up, loud", 1.6),
    "despiece": ("metal machine parts separating in the air one by one, light metallic clicks and a soft airy whoosh, clean", 1.2),
    "zumbido": ("high voltage electric hum powering up with a faint crackle, like a vacuum tube warming, short", 1.2),
    "ondas": ("deep pulsing electronic wobble, radio waves rippling outward, soft and clean, no music", 1.4),
    "zambullida": ("camera plunging into water: short splash then muffled underwater bubbles", 1.0),
    "agitan": ("countless tiny molecules jittering and rattling faster and faster, granular fizzing texture, no music", 1.6),
    "placa": ("electric stove hot plate heating up, faint metallic ticking and a soft electric hum", 1.2),
    "burbujitas": ("underwater close up of small bubbles forming and rising, gentle soft bubbling, muffled", 1.6),
    "termica": ("small electronic camera mode switch click followed by a short soft beep", 0.6),
    "silencio_agua": ("very quiet still water underwater ambience, muffled low hum, almost silent", 1.2),
    "termometro": ("digital thermometer reading beep, two short high beeps", 0.6),
    "puerta_micro": ("microwave oven door push button click and the door swinging open, plastic latch and soft hinge, close up", 0.9),
    "cafe": ("instant coffee granules poured from a spoon falling into a cup of water, fine sprinkle and tiny plops", 0.9),
    "salta": ("boiling hot water violently exploding out of a cup and splashing onto a countertop, steam hissing", 1.6),
    "quema": ("hot water splashing onto a hand with a sharp sizzle and a quick hand pulling away, no voice", 0.9),
    "aviso": ("official document card sliding into place with a firm paper snap", 0.6),
    "teclas": ("microwave keypad button presses, three short electronic beeps", 0.7),
    "palito": ("wooden stick dropped into a mug of water, gentle wooden knock and soft plop", 0.6),
    "burbujas_palito": ("soft gentle fizzing of tiny bubbles rising slowly in a cup of hot water, close up", 1.2),
    "fin_micro": ("microwave oven finished signal, three electronic beeps", 0.9),
    "cazo": ("water boiling in a saucepan on a stove, lively bubbling, close up", 1.0),
    "vuelta": ("smooth cinematic whoosh flying through a kitchen into a microwave oven, airy, clean ending", 1.2),
    "hervor": ("water in a mug starting to boil violently, rising rumble of bubbles building up, ends abruptly", 1.9),
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
