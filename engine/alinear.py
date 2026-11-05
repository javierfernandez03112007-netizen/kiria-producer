"""Tiempos de cada palabra de la voz que manda Javi (su MP3 de ElevenLabs), sin descargar ningún reconocedor de voz.
Uso: ELEVENLABS_KEY_FILE=<archivo fuera del repo> python3 engine/alinear.py projects/<p>
Lee <p>/assets/voz_original.mp3 y <p>/script_tts.txt (el texto que Javi pegó en ElevenLabs) y escribe <p>/asr_original.json
([{w, start, end}], el mismo formato que engine/tts.py y el reconocedor Parakeet) para ajustar_voz.py.
Primero prueba la alineación forzada de ElevenLabs (con el texto conocido); si la clave no tiene ese permiso (5-11-2026: no lo
tiene), usa su reconocedor de voz (Scribe) con tiempos por palabra: ajustar_voz.py casa luego sus palabras con las del guion.
Clave: la misma que engine/tts.py. Nunca escribir la clave en el repositorio."""
import json
import os
import sys

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tts import clave  # noqa: E402

API = "https://api.elevenlabs.io/v1"


def main():
    p = sys.argv[1]
    texto = " ".join(l.strip() for l in open(os.path.join(p, "script_tts.txt"), encoding="utf-8") if l.strip())
    mp3 = os.path.join(p, "assets", "voz_original.mp3")
    h = {"xi-api-key": clave()}
    with open(mp3, "rb") as f:
        r = requests.post(f"{API}/forced-alignment", headers=h, files={"file": ("voz.mp3", f, "audio/mpeg")},
                          data={"text": texto}, timeout=300)
    if r.status_code == 200:
        ws, como = r.json()["words"], "alineación forzada"
    else:
        print(f"alineación forzada no disponible ({r.status_code}): uso el reconocedor de voz")
        with open(mp3, "rb") as f:
            r = requests.post(f"{API}/speech-to-text", headers=h, files={"file": ("voz.mp3", f, "audio/mpeg")},
                              data={"model_id": "scribe_v1", "language_code": "spa", "timestamps_granularity": "word",
                                    "tag_audio_events": "false"}, timeout=300)
        if r.status_code != 200:
            sys.exit(f"ElevenLabs {r.status_code}: {r.text[:300]}")
        ws, como = [w for w in r.json()["words"] if w.get("type", "word") == "word"], "reconocedor de voz"
    out = [{"w": w["text"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)} for w in ws if w["text"].strip()]
    json.dump(out, open(os.path.join(p, "asr_original.json"), "w"), ensure_ascii=False)
    print(f"{como}: {len(out)} palabras (el texto tiene {len(texto.split())}); última: {out[-1]}")


if __name__ == "__main__":
    main()
