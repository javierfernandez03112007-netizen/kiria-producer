"""Efectos de sonido realistas con ElevenLabs (POST /v1/sound-generation) → assets/sfx/<nombre>.mp3.
Clave: la añade el entorno a api.elevenlabs.io; si no, ELEVENLABS_API_KEY o ELEVENLABS_KEY_FILE (fuera del repo)."""
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
SFX = {     # uno por suceso; en compose_mag.py se recortan a lo que dura cada cosa (con fundido) y no queda nada sonando de fondo
    "chispa": ("subtle electric spark crackle zipping quickly along a thin wire, close, clean", 1.0),
    "sello": ("rubber stamp pressed firmly on paper on a wooden desk, single solid thud, close", 0.5),
    "macarrones_q": ("dry penne pasta pieces sliding and clicking into place one after another on a wooden table", 1.0),
    "whoosh": ("fast smooth cinematic camera whoosh, short airy swish, clean", 0.6),
    "whoosh_largo": ("smooth cinematic whoosh flying across a room, airy, clean ending", 1.2),
    "tiza_dibujo": ("chalk drawing long curved lines quickly on a school blackboard, continuous scratchy strokes, close", 2.0),
    "tiza_escribir": ("chalk writing a short word quickly on a blackboard, close", 1.0),
    "tiza_palitos": ("rapid chalk tapping and short strokes on a blackboard drawing many small marks", 1.0),
    "tiza_tachar": ("fast chalk strikes crossing out marks on a blackboard, rhythmic scratches", 1.0),
    "madera_toc": ("single soft knock of a small wooden toy figure placed on a wooden floor", 0.5),
    "abaco": ("wooden abacus beads sliding along a metal rod and clacking together, two short slides", 0.8),
    "cuenta": ("single small wooden bead click, crisp", 0.5),
    "libro": ("hardcover children's picture book opening, soft cover and paper sound", 0.6),
    "letra": ("small hard pasta letter piece dropping onto a soft rug, soft tap", 0.5),
    "giro": ("quick soft flip swish of small plastic letters turning over", 0.5),
    "peonza": ("small wooden spinning top whirring and humming steadily on a wooden table", 3.0),
    "brillo": ("soft warm magical chime shimmer, short and gentle, no music", 1.0),
    "calendario": ("paper wall calendar pages flipped quickly one after another, paper flutter", 1.0),
    "tarjeta": ("plastic ID badge on a lanyard swinging, small clip click", 0.5),
    "timbre": ("short electric school bell ring in a hallway", 1.0),
    "impacto": ("low deep cinematic impact hit, short, no music", 0.8),
    "carpeta": ("heavy ring binder placed on a wooden desk, solid thud", 0.5),
    "munecos": ("small wooden toy pieces placed quickly one after another on a wooden desk, light taps", 0.8),
    "latido": ("single deep heartbeat thump, close", 0.6),
    "cuenco": ("dry pasta pieces dropping into a ceramic bowl, small clinks and rattles", 0.8),
    "ensartar": ("dry pasta tube sliding onto a shoelace string, soft scrape then click", 0.6),
    "clic": ("soft small mechanical click", 0.5),
    "lapiz": ("pencil writing cursive letters on paper, close, soft graphite scratch", 1.2),
    "ensarte_clic": ("single dry pasta piece clicking against another on a string", 0.5),
    "ding": ("soft bright positive notification ding, single, clean", 0.6),
    "papel": ("single sheet of paper rustle, quick", 0.5),
    "red": ("subtle electric crackle of energy building up and spreading, sparkling, rising, no music", 2.6),
    "avion": ("paper airplane swooshing past quickly", 0.7),
    "pop": ("soft subtle interface pop, clean", 0.5),
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
